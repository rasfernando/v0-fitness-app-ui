"use client"

import { supabase } from "@/lib/supabase/client"
import { notifyPTsWorkoutLogged } from "./notifications"

export interface QuickLogExerciseEntry {
  exerciseId: string
  exerciseName: string
  sets: { reps: number | null; weightKg: number | null }[]
}

/**
 * Saves a client's ad-hoc workout log.
 *
 * Creates the full chain of records so the data appears in the calendar
 * and progress graphs exactly like a PT-assigned workout:
 *
 *   workouts (is_adhoc, pt_id=null)
 *     → scheduled_workouts (status=completed, assigned_by_pt_id=null)
 *       → workout_exercises  (one per exercise logged)
 *         → workout_sessions
 *           → exercise_sets
 *
 * UUIDs are generated client-side because RLS SELECT policies require
 * a scheduled_workouts row to exist before the workouts row is visible,
 * so we can't rely on .select() returning the inserted row.
 */
export async function saveQuickLog({
  clientId,
  clientName,
  date,
  exercises,
  notes,
}: {
  clientId: string
  clientName: string
  date: string // YYYY-MM-DD
  exercises: QuickLogExerciseEntry[]
  notes?: string
}) {
  if (exercises.length === 0) throw new Error("Add at least one exercise")

  // Generate all IDs upfront so we don't need .select() after inserts
  const workoutId = crypto.randomUUID()
  const scheduledWorkoutId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()

  // 1. Create ad-hoc workout shell
  const { error: wErr } = await supabase
    .from("workouts")
    .insert({
      id: workoutId,
      pt_id: null,
      title: `Quick Log – ${date}`,
      description: notes ?? null,
      category: "Ad-hoc",
      difficulty: "intermediate",
      is_adhoc: true,
    })

  if (wErr) throw new Error(`Failed to create workout: ${wErr.message}`)

  // 2. Create scheduled_workout (immediately completed)
  const { error: swErr } = await supabase
    .from("scheduled_workouts")
    .insert({
      id: scheduledWorkoutId,
      client_id: clientId,
      assigned_by_pt_id: null,
      workout_id: workoutId,
      scheduled_date: date,
      status: "completed",
    })

  if (swErr) throw new Error(`Failed to create schedule entry: ${swErr.message}`)

  // 3. Create workout_exercises (one per exercise)
  // Generate IDs so we can link exercise_sets without a .select() round-trip
  const weEntries = exercises.map((ex, i) => ({
    id: crypto.randomUUID(),
    workout_id: workoutId,
    exercise_id: ex.exerciseId,
    position: i + 1,
    sets: ex.sets.length,
    prescription: ex.sets.map((s) => `${s.reps ?? 0} reps`).join(", "),
    weight_kg: null,
    rest_seconds: 60,
    notes: null,
    superset_group: null,
  }))

  const { error: weErr } = await supabase
    .from("workout_exercises")
    .insert(weEntries)

  if (weErr) throw new Error(`Failed to create exercises: ${weErr.message}`)

  // Map exercise_id → workout_exercise_id for linking sets
  const weIdMap = new Map(weEntries.map((r) => [r.exercise_id, r.id]))

  // 4. Create workout session
  const now = new Date().toISOString()
  const { error: sessErr } = await supabase
    .from("workout_sessions")
    .insert({
      id: sessionId,
      scheduled_workout_id: scheduledWorkoutId,
      client_id: clientId,
      started_at: now,
      completed_at: now,
      duration_seconds: null,
      notes: notes ?? null,
    })

  if (sessErr) throw new Error(`Failed to create session: ${sessErr.message}`)

  // 5. Create exercise_sets
  const setInserts: {
    session_id: string
    workout_exercise_id: string
    set_number: number
    reps_completed: number | null
    weight_kg_used: number | null
    prescribed_reps: string | null
    prescribed_weight_kg: number | null
  }[] = []

  for (const ex of exercises) {
    const weId = weIdMap.get(ex.exerciseId)
    if (!weId) continue
    ex.sets.forEach((s, i) => {
      setInserts.push({
        session_id: sessionId,
        workout_exercise_id: weId,
        set_number: i + 1,
        reps_completed: s.reps,
        weight_kg_used: s.weightKg,
        prescribed_reps: s.reps !== null ? `${s.reps}` : null,
        prescribed_weight_kg: s.weightKg,
      })
    })
  }

  if (setInserts.length > 0) {
    const { error: setErr } = await supabase
      .from("exercise_sets")
      .insert(setInserts)

    if (setErr) throw new Error(`Failed to save sets: ${setErr.message}`)
  }

  // Fire-and-forget: notify all PTs coaching this client
  const exerciseNames = exercises.map((e) => e.exerciseName).join(", ")
  notifyPTsWorkoutLogged({
    clientId,
    clientName,
    workoutTitle: exercises.length === 1 ? exerciseNames : `${exercises.length} exercises`,
    scheduledWorkoutId,
  })

  return { scheduledWorkoutId, workoutId }
}
