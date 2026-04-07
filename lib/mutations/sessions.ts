"use client"

import { supabase } from "@/lib/supabase/client"

// Workout session lifecycle mutations.
//
// Lifecycle:
//   1. startWorkoutSession  → creates a workout_sessions row with started_at = now,
//                             completed_at = null. Returns the session id.
//   2. logExerciseSet       → inserts one exercise_sets row. Called per set as
//                             the client taps "done" with their actual numbers.
//                             Idempotent on (session_id, workout_exercise_id, set_number)
//                             because of the unique index — re-logging the same
//                             set updates rather than duplicates (we use upsert).
//   3. completeWorkoutSession → sets completed_at on the session AND flips
//                               scheduled_workouts.status to 'completed'.
//
// Design notes:
//  - We insert per-set rather than buffering, so a closed tab mid-workout
//    doesn't lose data. This is fitness data — durability matters.
//  - All functions throw on failure. Caller handles via try/catch.
//  - We do not implement "abandon workout" here. If a session is started but
//    never completed, it just sits with completed_at = null. The PT can see
//    these as in-progress in the future. Cleanup is a separate concern.

export interface StartSessionInput {
  scheduledWorkoutId: string
  clientId: string
}

export async function startWorkoutSession(
  input: StartSessionInput
): Promise<string> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      scheduled_workout_id: input.scheduledWorkoutId,
      client_id: input.clientId,
      // started_at defaults to now() in the schema
    })
    .select("id")
    .single()

  if (error) throw new Error(`Failed to start session: ${error.message}`)
  if (!data) throw new Error("Failed to start session: no row returned")
  return data.id
}

export interface LogSetInput {
  sessionId: string
  workoutExerciseId: string
  setNumber: number          // 1-indexed
  repsCompleted: number | null
  weightKgUsed: number | null
  rpe?: number | null
}

export async function logExerciseSet(input: LogSetInput): Promise<void> {
  // upsert on the unique constraint (session_id, workout_exercise_id, set_number)
  // means re-logging the same set updates rather than duplicates. Useful if
  // the user mis-taps and wants to correct a number.
  const { error } = await supabase
    .from("exercise_sets")
    .upsert(
      {
        session_id: input.sessionId,
        workout_exercise_id: input.workoutExerciseId,
        set_number: input.setNumber,
        reps_completed: input.repsCompleted,
        weight_kg_used: input.weightKgUsed,
        rpe: input.rpe ?? null,
        // completed_at defaults to now() in the schema
      },
      {
        onConflict: "session_id,workout_exercise_id,set_number",
      }
    )

  if (error) throw new Error(`Failed to log set: ${error.message}`)
}

export interface CompleteSessionInput {
  sessionId: string
  scheduledWorkoutId: string
  durationSeconds: number
  notes?: string
}

export async function completeWorkoutSession(
  input: CompleteSessionInput
): Promise<void> {
  // Two-step: mark the session complete, then mark the schedule entry complete.
  // Not transactional — if step 2 fails, the session is complete but the
  // schedule still says "scheduled." Acceptable for an MVP; the next refresh
  // would just show the workout as available again. Real fix is a Postgres
  // function that does both atomically. Deferred.

  const now = new Date().toISOString()

  const { error: sessionError } = await supabase
    .from("workout_sessions")
    .update({
      completed_at: now,
      duration_seconds: input.durationSeconds,
      notes: input.notes ?? null,
    })
    .eq("id", input.sessionId)

  if (sessionError) {
    throw new Error(`Failed to complete session: ${sessionError.message}`)
  }

  const { error: scheduleError } = await supabase
    .from("scheduled_workouts")
    .update({ status: "completed" })
    .eq("id", input.scheduledWorkoutId)

  if (scheduleError) {
    throw new Error(
      `Session saved but failed to mark schedule as completed: ${scheduleError.message}`
    )
  }
}
