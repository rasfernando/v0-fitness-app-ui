"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

// Per-set comparison: what was prescribed vs what the client actually did.
export interface SetComparison {
  setNumber: number
  // Prescribed
  prescription: string         // "8-12", "30s", etc.
  prescribedWeightKg: number | null
  // Actual (null if the client never logged this set)
  actualReps: number | null
  actualWeightKg: number | null
  rpe: number | null
  loggedAt: string | null
  // Convenience: did they log at all?
  isLogged: boolean
}

export interface ExerciseLogSummary {
  workoutExerciseId: string
  exerciseName: string
  position: number
  prescribedSets: number
  sets: SetComparison[]
}

export interface SessionLogDetail {
  sessionId: string
  scheduledWorkoutId: string
  startedAt: string
  completedAt: string | null
  durationSeconds: number | null
  notes: string | null
  exercises: ExerciseLogSummary[]
}

interface UseWorkoutSessionResult {
  data: SessionLogDetail | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Loads the most recent session for a given scheduled_workouts row, joined
 * with all its logged exercise_sets, joined with the underlying
 * workout_exercises rows so we can show prescribed-vs-actual.
 *
 * Returns null while no scheduledWorkoutId is provided. Designed for lazy
 * loading — pass null until the user expands a completed workout, then
 * pass the real id.
 *
 * Edge cases handled:
 *  - No session exists for this scheduled workout: returns null with no error
 *    (the workout is "completed" status but somehow has no session — shouldn't
 *    happen but we don't crash if it does)
 *  - Session exists but no sets logged: exercises array is populated from
 *    workout_exercises, all sets have isLogged=false
 *  - Session has fewer logged sets than prescribed: missing sets are null/false
 */
export function useWorkoutSession(
  scheduledWorkoutId: string | null | undefined
): UseWorkoutSessionResult {
  const [data, setData] = useState<SessionLogDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(scheduledWorkoutId))
  const [error, setError] = useState<string | null>(null)
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!scheduledWorkoutId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    ;(async () => {
      // Step 1: find the session for this scheduled workout. There may be
      // multiple if a client started+abandoned earlier — take the most
      // recently completed one (or most recently started if none completed).
      const { data: sessionRows, error: sessionError } = await supabase
        .from("workout_sessions")
        .select("id, started_at, completed_at, duration_seconds, notes, scheduled_workout_id")
        .eq("scheduled_workout_id", scheduledWorkoutId)
        .order("started_at", { ascending: false })
        .limit(1)

      if (cancelled) return
      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        return
      }

      const session = sessionRows?.[0]
      if (!session) {
        // No session at all — return null cleanly
        setData(null)
        setLoading(false)
        return
      }

      // Step 2: load the prescribed exercises for this scheduled workout's
      // template, in order. We need this so we can show "prescribed" even
      // for sets that were never logged.
      const { data: scheduledRow, error: schedError } = await supabase
        .from("scheduled_workouts")
        .select(`
          workouts:workout_id (
            workout_exercises (
              id,
              position,
              sets,
              prescription,
              weight_kg,
              exercises:exercise_id (
                name
              )
            )
          )
        `)
        .eq("id", scheduledWorkoutId)
        .single()

      if (cancelled) return
      if (schedError) {
        setError(schedError.message)
        setLoading(false)
        return
      }

      const w = Array.isArray(scheduledRow?.workouts)
        ? scheduledRow.workouts[0]
        : scheduledRow?.workouts
      const workoutExercises = (w?.workout_exercises ?? []) as Array<{
        id: string
        position: number
        sets: number
        prescription: string
        weight_kg: number | null
        exercises:
          | { name: string }
          | Array<{ name: string }>
          | null
      }>

      // Step 3: load all logged sets for this session
      const { data: loggedSets, error: setsError } = await supabase
        .from("exercise_sets")
        .select("id, workout_exercise_id, set_number, reps_completed, weight_kg_used, rpe, completed_at, prescribed_reps, prescribed_weight_kg")
        .eq("session_id", session.id)
        .order("set_number", { ascending: true })

      if (cancelled) return
      if (setsError) {
        setError(setsError.message)
        setLoading(false)
        return
      }

      // Step 4: stitch them together. For each prescribed exercise, build
      // an array of N sets (N = prescribed.sets) and fill in actuals where
      // they exist.
      const setsByExercise = new Map<string, typeof loggedSets>()
      for (const s of loggedSets ?? []) {
        const arr = setsByExercise.get(s.workout_exercise_id) ?? []
        arr.push(s)
        setsByExercise.set(s.workout_exercise_id, arr)
      }

      const exercises: ExerciseLogSummary[] = workoutExercises
        .map((we) => {
          const ex = Array.isArray(we.exercises) ? we.exercises[0] : we.exercises
          const logged = setsByExercise.get(we.id) ?? []

          const sets: SetComparison[] = Array.from({ length: we.sets }, (_, i) => {
            const setNumber = i + 1
            const log = logged.find((l) => l.set_number === setNumber)
            // Prefer the snapshot of what was prescribed *at the time the set
            // was logged* over the current template values. Falls back to the
            // template when the snapshot is null (pre-migration 0005 data).
            // This is what makes historical accuracy survive template edits.
            const prescription = log?.prescribed_reps ?? we.prescription
            const prescribedWeightKg =
              log?.prescribed_weight_kg !== null && log?.prescribed_weight_kg !== undefined
                ? log.prescribed_weight_kg
                : we.weight_kg
            return {
              setNumber,
              prescription,
              prescribedWeightKg,
              actualReps: log?.reps_completed ?? null,
              actualWeightKg: log?.weight_kg_used ?? null,
              rpe: log?.rpe ?? null,
              loggedAt: log?.completed_at ?? null,
              isLogged: Boolean(log),
            }
          })

          return {
            workoutExerciseId: we.id,
            exerciseName: ex?.name ?? "Unknown exercise",
            position: we.position,
            prescribedSets: we.sets,
            sets,
          }
        })
        .sort((a, b) => a.position - b.position)

      setData({
        sessionId: session.id,
        scheduledWorkoutId: session.scheduled_workout_id,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        durationSeconds: session.duration_seconds,
        notes: session.notes,
        exercises,
      })
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [scheduledWorkoutId, refetchToken])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { data, loading, error, refetch }
}
