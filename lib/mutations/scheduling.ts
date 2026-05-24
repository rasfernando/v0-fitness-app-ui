"use client"

import { supabase } from "@/lib/supabase/client"

// Scheduling mutations — single-user model.
//
// All functions throw on failure so the caller can use try/catch. They never
// silently no-op.

export interface ScheduleWorkoutInput {
  userId: string
  workoutId: string      // real UUID from workouts table
  scheduledDate: string  // YYYY-MM-DD
  notes?: string         // optional self-note
}

/**
 * Schedule an existing workout template for the user on a date.
 * Returns the inserted row's id.
 */
export async function scheduleWorkout(input: ScheduleWorkoutInput): Promise<string> {
  const { data, error } = await supabase
    .from("scheduled_workouts")
    .insert({
      user_id: input.userId,
      workout_id: input.workoutId,
      scheduled_date: input.scheduledDate,
      status: "scheduled",
      notes_for_client: input.notes ?? null,
    })
    .select("id")
    .single()

  if (error) throw new Error(`Failed to schedule workout: ${error.message}`)
  if (!data) throw new Error("Failed to schedule workout: no row returned")

  return data.id
}

export interface ScheduleSingleExerciseInput {
  userId: string
  exerciseName: string
  category: string
  sets: number
  prescription: string   // "8-12", "30s", etc.
  weightKg?: number
  restSeconds?: number
  scheduledDate: string  // YYYY-MM-DD
  notes?: string
}

/**
 * Schedule a single ad-hoc exercise on a date by:
 *   1. Finding an exercise in the library matching the name
 *   2. Creating a hidden one-exercise workout owned by the user
 *   3. Scheduling that workout
 *
 * This collapses the "scheduled exercise" concept into the "scheduled workout"
 * concept the schema is designed around. The one-off workout is real and lives
 * in the workouts table forever — that's fine, it's only ~1KB and lets the
 * UI render it identically to any other workout.
 *
 * Returns the scheduled_workouts row id.
 */
export async function scheduleSingleExercise(
  input: ScheduleSingleExerciseInput
): Promise<string> {
  // Step 1: find a global or user-owned exercise matching the name.
  const { data: existingExercise, error: lookupError } = await supabase
    .from("exercises")
    .select("id")
    .ilike("name", input.exerciseName)
    .or(`created_by.is.null,created_by.eq.${input.userId}`)
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`Failed to look up exercise: ${lookupError.message}`)
  }
  if (!existingExercise) {
    throw new Error(
      `Exercise "${input.exerciseName}" not found in library. Pick from the list or create it first.`
    )
  }

  // Step 2: create the hidden one-off workout.
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: input.userId,
      title: input.exerciseName,
      category: input.category,
      difficulty: "intermediate",
    })
    .select("id")
    .single()

  if (workoutError) throw new Error(`Failed to create workout: ${workoutError.message}`)
  if (!workout) throw new Error("Failed to create workout: no row returned")

  // Step 3: attach the exercise as the only entry
  const { error: attachError } = await supabase
    .from("workout_exercises")
    .insert({
      workout_id: workout.id,
      exercise_id: existingExercise.id,
      position: 0,
      sets: input.sets,
      prescription: input.prescription,
      weight_kg: input.weightKg ?? null,
      rest_seconds: input.restSeconds ?? 60,
    })

  if (attachError) {
    throw new Error(`Failed to attach exercise: ${attachError.message}`)
  }

  // Step 4: schedule it
  return scheduleWorkout({
    userId: input.userId,
    workoutId: workout.id,
    scheduledDate: input.scheduledDate,
    notes: input.notes,
  })
}

/**
 * Remove a scheduled workout. The underlying workout template is NOT
 * deleted — only the scheduling row.
 */
export async function unscheduleWorkout(scheduledWorkoutId: string): Promise<void> {
  const { error } = await supabase
    .from("scheduled_workouts")
    .delete()
    .eq("id", scheduledWorkoutId)

  if (error) throw new Error(`Failed to unschedule: ${error.message}`)
}
