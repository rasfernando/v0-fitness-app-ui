"use client"

import { supabase } from "@/lib/supabase/client"

// Mutations for workout templates owned by a PT.
//
// All functions throw on failure with a descriptive message. Caller handles
// via try/catch. None of these are truly transactional because Supabase's JS
// client doesn't expose multi-statement transactions — for atomicity we'd
// need Postgres RPC functions. For MVP, the failure windows are small and
// the fallout of partial state is recoverable. Noted as tech debt.

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface WorkoutExerciseInput {
  exerciseId: string
  position: number
  sets: number
  prescription: string        // "8-12", "30s", "AMRAP" — display string
  weightKg: number | null     // prescribed weight, null for bodyweight/time
  restSeconds: number
  notes?: string | null
}

export interface CreateWorkoutInput {
  ptId: string
  title: string
  description?: string | null
  category: string            // "Strength" | "HIIT" | "Cardio" | "Mobility"
  difficulty: "beginner" | "intermediate" | "advanced"
  estimatedDurationMinutes?: number | null
  estimatedCalories?: number | null
  exercises: WorkoutExerciseInput[]
}

export interface UpdateWorkoutMetadataInput {
  workoutId: string
  title?: string
  description?: string | null
  category?: string
  difficulty?: "beginner" | "intermediate" | "advanced"
  estimatedDurationMinutes?: number | null
  estimatedCalories?: number | null
}

// For updating the exercise list, the caller provides the full desired
// state. We diff against the current state and issue inserts/updates/deletes
// as needed. Rows keep their workout_exercises.id when updated (important
// because exercise_sets reference them via that id), and new rows don't
// need an id — we create one.
export interface UpdateWorkoutExercisesInput {
  workoutId: string
  exercises: Array<WorkoutExerciseInput & {
    // If present, update the existing workout_exercises row with this id.
    // If absent, insert a new row.
    workoutExerciseId?: string
  }>
}

// ─────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────

/**
 * Creates a new workout with its exercise rows.
 *
 * Not truly transactional: we insert the workouts row first, then the
 * workout_exercises rows. If the second step fails, the workouts row is
 * orphaned (visible in the library with zero exercises). The caller can
 * retry or the PT can delete and recreate. Atomic version requires an
 * RPC function — deferred.
 *
 * Returns the new workout id on success.
 */
export async function createWorkout(input: CreateWorkoutInput): Promise<string> {
  // Step 1: insert the workout row
  const { data: workoutRow, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      pt_id: input.ptId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      difficulty: input.difficulty,
      estimated_duration_minutes: input.estimatedDurationMinutes ?? null,
      estimated_calories: input.estimatedCalories ?? null,
    })
    .select("id")
    .single()

  if (workoutError) {
    throw new Error(`Failed to create workout: ${workoutError.message}`)
  }
  if (!workoutRow) {
    throw new Error("Failed to create workout: no row returned")
  }

  const workoutId = workoutRow.id

  // Step 2: insert all workout_exercises rows in a single batch
  if (input.exercises.length > 0) {
    const rows = input.exercises.map((ex) => ({
      workout_id: workoutId,
      exercise_id: ex.exerciseId,
      position: ex.position,
      sets: ex.sets,
      prescription: ex.prescription,
      weight_kg: ex.weightKg,
      rest_seconds: ex.restSeconds,
      notes: ex.notes ?? null,
    }))

    const { error: exError } = await supabase
      .from("workout_exercises")
      .insert(rows)

    if (exError) {
      // Tech debt: leaves the workouts row orphaned. Not fixing in MVP.
      // Could clean up by deleting the workout here, but a failed cleanup
      // compounds the problem. Better to surface the error and let the
      // PT retry or delete manually.
      throw new Error(
        `Workout created but failed to add exercises: ${exError.message}. ` +
          `You may need to delete and recreate the workout.`
      )
    }
  }

  return workoutId
}

// ─────────────────────────────────────────────────────────────────────────
// Update metadata
// ─────────────────────────────────────────────────────────────────────────

/**
 * Updates workout-level metadata (title, description, etc.). Does NOT touch
 * the exercise list — use updateWorkoutExercises for that.
 *
 * Only the fields provided in the input are updated; others are left alone.
 */
export async function updateWorkoutMetadata(
  input: UpdateWorkoutMetadataInput
): Promise<void> {
  const updates: Record<string, unknown> = {}
  if (input.title !== undefined) updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.category !== undefined) updates.category = input.category
  if (input.difficulty !== undefined) updates.difficulty = input.difficulty
  if (input.estimatedDurationMinutes !== undefined) {
    updates.estimated_duration_minutes = input.estimatedDurationMinutes
  }
  if (input.estimatedCalories !== undefined) {
    updates.estimated_calories = input.estimatedCalories
  }

  if (Object.keys(updates).length === 0) return // nothing to do

  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from("workouts")
    .update(updates)
    .eq("id", input.workoutId)

  if (error) throw new Error(`Failed to update workout: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────────────────
// Update exercise list
// ─────────────────────────────────────────────────────────────────────────

/**
 * Replaces the exercise list of a workout with the given state.
 *
 * Diff strategy:
 *   1. Load existing workout_exercises for this workout
 *   2. For each desired exercise with a workoutExerciseId → UPDATE
 *   3. For each desired exercise without a workoutExerciseId → INSERT
 *   4. For each existing row not in the desired list → DELETE
 *
 * The DELETE step may fail if the row has logged exercise_sets against it,
 * due to the on delete restrict foreign key. When that happens, we surface
 * a clear error message telling the PT the exercise has history and can't
 * be removed — suggesting they duplicate the workout to make changes.
 *
 * Not transactional. Failure modes:
 *   - Updates succeed but inserts fail: new rows missing, old rows changed.
 *     Caller should re-fetch and retry, or the PT can manually fix.
 *   - Updates + inserts succeed but delete fails: the removed-but-not-really
 *     rows are still there. Common case is "can't delete because of history"
 *     and we want the PT to see that error and back out, not get stuck in
 *     a partial-commit state. In practice this means the whole operation
 *     should be considered "check the delete first, then commit if safe."
 *
 * For the MVP we do it in the order inserts → updates → deletes. If delete
 * fails, the inserts and updates have already happened — the workout is now
 * in a new state that's NOT what the PT intended (they wanted to remove
 * an exercise too). This is a known rough edge. The proper fix is an RPC
 * function that wraps it all in a transaction. For now, we surface the
 * error clearly so the PT understands what happened.
 */
export async function updateWorkoutExercises(
  input: UpdateWorkoutExercisesInput
): Promise<void> {
  // Step 1: load current state
  const { data: existingRows, error: loadError } = await supabase
    .from("workout_exercises")
    .select("id")
    .eq("workout_id", input.workoutId)

  if (loadError) {
    throw new Error(`Failed to load current exercises: ${loadError.message}`)
  }

  const existingIds = new Set((existingRows ?? []).map((r) => r.id))
  const desiredIdsToKeep = new Set(
    input.exercises
      .filter((e) => e.workoutExerciseId)
      .map((e) => e.workoutExerciseId as string)
  )

  // IDs to delete: existing rows not in the desired list
  const idsToDelete = [...existingIds].filter((id) => !desiredIdsToKeep.has(id))

  // Step 2: inserts (new rows, no workoutExerciseId)
  const toInsert = input.exercises.filter((e) => !e.workoutExerciseId)
  if (toInsert.length > 0) {
    const rows = toInsert.map((ex) => ({
      workout_id: input.workoutId,
      exercise_id: ex.exerciseId,
      position: ex.position,
      sets: ex.sets,
      prescription: ex.prescription,
      weight_kg: ex.weightKg,
      rest_seconds: ex.restSeconds,
      notes: ex.notes ?? null,
    }))
    const { error: insertError } = await supabase
      .from("workout_exercises")
      .insert(rows)
    if (insertError) {
      throw new Error(`Failed to add new exercises: ${insertError.message}`)
    }
  }

  // Step 3: updates (existing rows with a workoutExerciseId)
  const toUpdate = input.exercises.filter((e) => e.workoutExerciseId)
  for (const ex of toUpdate) {
    const { error: updateError } = await supabase
      .from("workout_exercises")
      .update({
        exercise_id: ex.exerciseId,
        position: ex.position,
        sets: ex.sets,
        prescription: ex.prescription,
        weight_kg: ex.weightKg,
        rest_seconds: ex.restSeconds,
        notes: ex.notes ?? null,
      })
      .eq("id", ex.workoutExerciseId as string)
    if (updateError) {
      throw new Error(`Failed to update exercise: ${updateError.message}`)
    }
  }

  // Step 4: deletes (existing rows not in the desired state)
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("workout_exercises")
      .delete()
      .in("id", idsToDelete)
    if (deleteError) {
      // The on delete restrict foreign key from exercise_sets → workout_exercises
      // will produce a 23503 error when trying to delete a row with history.
      // We surface a friendly message so the PT understands why.
      const friendly = deleteError.message.toLowerCase().includes("foreign key")
        ? "Can't remove an exercise that has logged sets against it. To change " +
          "an exercise with history, duplicate the workout and edit the copy — " +
          "that way your client's log stays intact."
        : `Failed to remove exercises: ${deleteError.message}`
      throw new Error(friendly)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Soft delete
// ─────────────────────────────────────────────────────────────────────────

/**
 * Marks a workout as deleted without removing the row from the database.
 *
 * Why soft delete: exercise_sets → workout_exercises → workouts has on-delete-
 * restrict foreign keys protecting historical data. A hard delete would fail
 * for any workout that's ever been scheduled. Soft delete keeps the data
 * intact, hides the workout from the library (useWorkouts filters
 * deleted_at IS NULL), and preserves all client history.
 *
 * There is no "undelete" UI right now. If a PT needs to restore a deleted
 * workout, they'd have to update the row manually in Supabase. Adding an
 * undelete UI is trivial when needed.
 */
export async function softDeleteWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase
    .from("workouts")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", workoutId)

  if (error) throw new Error(`Failed to delete workout: ${error.message}`)
}
