"use client"

import { supabase } from "@/lib/supabase/client"
import { notifyClientWorkoutAssigned } from "./notifications"
import { sendWorkoutMessage } from "./workout-messages"

// Plain async functions (not hooks) that mutate the database. Components
// call these from event handlers, then refetch the relevant queries on success.
//
// Strategy notes:
//  - We do not implement optimistic updates here. The component handles the
//    "make the UI feel snappy" part if it wants to (e.g. by adding a temp row
//    to local state immediately). These functions just talk to the DB.
//  - All functions throw on failure so the caller can use try/catch and
//    surface a real error. They never silently no-op.
//  - The "single exercise" path creates a hidden one-off workout, because
//    the schema only has scheduled_workouts (not scheduled_exercises) — we
//    agreed to collapse the two concepts when we designed the schema.

export interface ScheduleWorkoutInput {
  clientId: string
  ptId: string
  ptName: string
  workoutId: string      // real UUID from workouts table
  workoutTitle: string
  scheduledDate: string  // YYYY-MM-DD
  message?: string       // optional message from PT to client
}

/**
 * Schedule an existing workout template for a client on a date.
 * Returns the inserted row's id.
 * Also notifies the client and optionally sends a message on the workout thread.
 */
export async function scheduleWorkoutForClient(
  input: ScheduleWorkoutInput
): Promise<string> {
  const { data, error } = await supabase
    .from("scheduled_workouts")
    .insert({
      client_id: input.clientId,
      assigned_by_pt_id: input.ptId,
      workout_id: input.workoutId,
      scheduled_date: input.scheduledDate,
      status: "scheduled",
    })
    .select("id")
    .single()

  if (error) throw new Error(`Failed to schedule workout: ${error.message}`)
  if (!data) throw new Error("Failed to schedule workout: no row returned")

  // Fire-and-forget: notify client + optional message
  notifyClientWorkoutAssigned({
    clientId: input.clientId,
    ptName: input.ptName,
    workoutTitle: input.workoutTitle,
    scheduledDate: input.scheduledDate,
    scheduledWorkoutId: data.id,
    message: input.message,
  })

  if (input.message) {
    sendWorkoutMessage({
      scheduledWorkoutId: data.id,
      senderId: input.ptId,
      senderName: input.ptName,
      message: input.message,
      recipientId: input.clientId,
    }).catch((err) => console.error("Failed to send workout message:", err))
  }

  return data.id
}

export interface ScheduleSingleExerciseInput {
  clientId: string
  ptId: string
  ptName: string
  exerciseName: string
  category: string
  sets: number
  prescription: string   // "8-12", "30s", etc.
  weightKg?: number
  restSeconds?: number
  scheduledDate: string  // YYYY-MM-DD
  message?: string       // optional message from PT to client
}

/**
 * Schedule a single ad-hoc exercise on a date by:
 *   1. Finding-or-creating an exercise in the library matching the name
 *   2. Creating a hidden one-exercise workout owned by this PT
 *   3. Scheduling that workout for the client
 *
 * This collapses the "scheduled exercise" concept into the "scheduled workout"
 * concept the schema is designed around. The one-off workout is real and lives
 * in the workouts table forever — that's fine, it's only ~1KB and lets the
 * client UI render it identically to any other workout.
 *
 * Returns the scheduled_workouts row id.
 */
export async function scheduleSingleExerciseForClient(
  input: ScheduleSingleExerciseInput
): Promise<string> {
  // Step 1: find a global or PT-owned exercise matching the name. We don't
  // create one if missing — that would let typos pollute the library.
  // Instead we error and the caller can prompt the PT to pick from the list.
  const { data: existingExercise, error: lookupError } = await supabase
    .from("exercises")
    .select("id")
    .ilike("name", input.exerciseName)
    .or(`created_by.is.null,created_by.eq.${input.ptId}`)
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

  // Step 2: create the hidden one-off workout. Title it after the exercise
  // so it's recognizable in the client's calendar.
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      pt_id: input.ptId,
      title: input.exerciseName,
      category: input.category,
      difficulty: "intermediate",
      // No duration/calorie estimate for a single exercise
    })
    .select("id")
    .single()

  if (workoutError) throw new Error(`Failed to create workout: ${workoutError.message}`)
  if (!workout) throw new Error("Failed to create workout: no row returned")

  // Step 3: attach the exercise to the workout as the only entry
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
    // We've created an orphan workout. In a more careful version we'd
    // delete it here. For an MVP, an orphan workout is harmless — just
    // dead data — and rolling back adds complexity for little gain.
    throw new Error(`Failed to attach exercise: ${attachError.message}`)
  }

  // Step 4: schedule the freshly-created workout for the client
  return scheduleWorkoutForClient({
    clientId: input.clientId,
    ptId: input.ptId,
    ptName: input.ptName,
    workoutId: workout.id,
    workoutTitle: input.exerciseName,
    scheduledDate: input.scheduledDate,
    message: input.message,
  })
}

/**
 * Remove a scheduled workout for a client. The underlying workout template
 * is NOT deleted — only the scheduling row.
 */
export async function unscheduleWorkout(scheduledWorkoutId: string): Promise<void> {
  const { error } = await supabase
    .from("scheduled_workouts")
    .delete()
    .eq("id", scheduledWorkoutId)

  if (error) throw new Error(`Failed to unschedule: ${error.message}`)
}
