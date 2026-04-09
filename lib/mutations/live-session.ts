"use client"

import { supabase } from "@/lib/supabase/client"

// Mutations for the PT's in-person "live session" flow.
//
// The PT doesn't pre-build a workout — they pick exercises one at a time
// and log sets as the client does them. Behind the scenes we create a
// workout template, schedule it, and start a session so the data model
// stays consistent with pre-planned workouts.
//
// Chain: workout → scheduled_workout → workout_session → (workout_exercises + exercise_sets)

export interface StartLiveSessionInput {
  ptId: string
  clientId: string
}

export interface LiveSessionHandle {
  workoutId: string
  scheduledWorkoutId: string
  sessionId: string
}

/**
 * Creates the full chain (workout → scheduled_workout → workout_session) in
 * one call. Returns the IDs the live session screen needs.
 *
 * The workout title is auto-generated with today's date so it's recognisable
 * in the history later ("In-Person Session — 9 Apr 2026").
 */
export async function startLiveSession(
  input: StartLiveSessionInput
): Promise<LiveSessionHandle> {
  const today = new Date()
  const dateLabel = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const dateISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  // 1. Create workout template
  const { data: workout, error: workoutErr } = await supabase
    .from("workouts")
    .insert({
      pt_id: input.ptId,
      title: `In-Person Session — ${dateLabel}`,
      category: "Full Body",
      difficulty: "intermediate",
      description: "Live session recorded in person with PT.",
    })
    .select("id")
    .single()

  if (workoutErr) throw new Error(`Failed to create workout: ${workoutErr.message}`)
  if (!workout) throw new Error("Failed to create workout: no row returned")

  // 2. Schedule it for today
  const { data: scheduled, error: schedErr } = await supabase
    .from("scheduled_workouts")
    .insert({
      workout_id: workout.id,
      client_id: input.clientId,
      assigned_by_pt_id: input.ptId,
      scheduled_date: dateISO,
      status: "scheduled",
    })
    .select("id")
    .single()

  if (schedErr) throw new Error(`Failed to schedule workout: ${schedErr.message}`)
  if (!scheduled) throw new Error("Failed to schedule workout: no row returned")

  // 3. Start the session
  const { data: session, error: sessErr } = await supabase
    .from("workout_sessions")
    .insert({
      scheduled_workout_id: scheduled.id,
      client_id: input.clientId,
    })
    .select("id")
    .single()

  if (sessErr) throw new Error(`Failed to start session: ${sessErr.message}`)
  if (!session) throw new Error("Failed to start session: no row returned")

  return {
    workoutId: workout.id,
    scheduledWorkoutId: scheduled.id,
    sessionId: session.id,
  }
}

export interface AddLiveExerciseInput {
  workoutId: string
  exerciseId: string
  position: number
}

export interface AddLiveExerciseResult {
  workoutExerciseId: string
}

/**
 * Adds a single exercise to the live workout. Returns the workout_exercise ID
 * so the caller can log sets against it.
 *
 * We use sensible defaults (3 sets, "AMRAP" prescription, 60s rest) because
 * the PT will override these through the actual logged sets. The template
 * values are just placeholders — the real record of what happened is in
 * exercise_sets.
 */
export async function addLiveExercise(
  input: AddLiveExerciseInput
): Promise<AddLiveExerciseResult> {
  const { data, error } = await supabase
    .from("workout_exercises")
    .insert({
      workout_id: input.workoutId,
      exercise_id: input.exerciseId,
      position: input.position,
      sets: 10,       // high ceiling — PT may do any number of sets
      prescription: "—",
      rest_seconds: 60,
    })
    .select("id")
    .single()

  if (error) throw new Error(`Failed to add exercise: ${error.message}`)
  if (!data) throw new Error("Failed to add exercise: no row returned")

  return { workoutExerciseId: data.id }
}

/**
 * Tidies up the workout template after the session ends. Updates each
 * workout_exercise's `sets` to match the actual number of sets logged,
 * so the workout history looks clean.
 */
export async function finalizeLiveWorkout(
  workoutId: string,
  exerciseSetCounts: Record<string, number> // workoutExerciseId → actual set count
): Promise<void> {
  for (const [weId, count] of Object.entries(exerciseSetCounts)) {
    if (count > 0) {
      await supabase
        .from("workout_exercises")
        .update({ sets: count })
        .eq("id", weId)
    }
  }
}
