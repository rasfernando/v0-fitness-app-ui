"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

// Full prescription for one exercise within a workout, ready for the
// workout player to render and the client to log against.
export interface PrescribedExercise {
  workoutExerciseId: string  // FK target for exercise_sets — IMPORTANT
  exerciseId: string         // the underlying exercise (rarely needed by UI)
  name: string
  category: string | null
  muscleGroup: string | null
  description: string | null // coaching cue / form guidance
  imageUrl: string | null
  videoUrl: string | null    // optional demo video (YouTube embed, Supabase Storage, etc.)
  supersetGroup: string | null // e.g. "A", "B", "C" — exercises with same group form a circuit
  position: number           // order within the workout
  sets: number               // prescribed number of sets (= rounds when in a superset)
  prescription: string       // "8-12", "30s", "AMRAP" — display string
  weightKg: number | null    // prescribed weight, may be null
  restSeconds: number
  notes: string | null
  // Hint for the logging UI: should reps and weight inputs be shown?
  // Driven by the underlying exercise's uses_weight / uses_reps flags.
  usesWeight: boolean
  usesReps: boolean
}

export interface ScheduledWorkoutDetail {
  scheduledId: string        // scheduled_workouts.id
  workoutId: string          // workouts.id
  title: string
  category: string
  description: string | null
  scheduledDate: string      // YYYY-MM-DD
  status: "scheduled" | "completed" | "missed" | "skipped"
  estimatedDurationMinutes: number | null
  exercises: PrescribedExercise[]
}

interface UseScheduledWorkoutDetailResult {
  data: ScheduledWorkoutDetail | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Loads a single scheduled_workouts row joined with its workout, joined with
 * all of its workout_exercises rows, joined with the underlying exercise data.
 * Everything the workout player needs to render and log against.
 *
 * Pass null/undefined to get a no-op result (useful when the player mounts
 * before a workout has been chosen).
 */
export function useScheduledWorkoutDetail(
  scheduledWorkoutId: string | null | undefined
): UseScheduledWorkoutDetailResult {
  const [data, setData] = useState<ScheduledWorkoutDetail | null>(null)
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

    // Three levels of join. Postgrest handles this fine but the response
    // shape is nested — we flatten in the mapping below.
    supabase
      .from("scheduled_workouts")
      .select(`
        id,
        scheduled_date,
        status,
        workouts:workout_id (
          id,
          title,
          category,
          description,
          estimated_duration_minutes,
          workout_exercises (
            id,
            position,
            sets,
            prescription,
            weight_kg,
            rest_seconds,
            notes,
            superset_group,
            exercises:exercise_id (
              id,
              name,
              category,
              muscle_group,
              description,
              image_url,
              video_url,
              uses_weight,
              uses_reps
            )
          )
        )
      `)
      .eq("id", scheduledWorkoutId)
      .single()
      .then(({ data: row, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
          setLoading(false)
          return
        }
        if (!row) {
          setError("Scheduled workout not found")
          setLoading(false)
          return
        }

        // Workouts can come back as object or array depending on inferred cardinality
        const w = Array.isArray(row.workouts) ? row.workouts[0] : row.workouts
        if (!w) {
          setError("Workout details missing")
          setLoading(false)
          return
        }

        const exerciseRows = (w.workout_exercises ?? []) as Array<{
          id: string
          position: number
          sets: number
          prescription: string
          weight_kg: number | null
          rest_seconds: number
          notes: string | null
          superset_group: string | null
          exercises:
            | {
                id: string
                name: string
                category: string | null
                muscle_group: string | null
                description: string | null
                image_url: string | null
                video_url: string | null
                uses_weight: boolean
                uses_reps: boolean
              }
            | Array<{
                id: string
                name: string
                category: string | null
                muscle_group: string | null
                description: string | null
                image_url: string | null
                video_url: string | null
                uses_weight: boolean
                uses_reps: boolean
              }>
            | null
        }>

        const prescribed: PrescribedExercise[] = exerciseRows
          .map((we) => {
            const ex = Array.isArray(we.exercises) ? we.exercises[0] : we.exercises
            if (!ex) return null
            return {
              workoutExerciseId: we.id,
              exerciseId: ex.id,
              name: ex.name,
              category: ex.category,
              muscleGroup: ex.muscle_group,
              description: ex.description,
              imageUrl: ex.image_url,
              videoUrl: ex.video_url,
              supersetGroup: we.superset_group,
              position: we.position,
              sets: we.sets,
              prescription: we.prescription,
              weightKg: we.weight_kg,
              restSeconds: we.rest_seconds,
              notes: we.notes,
              usesWeight: ex.uses_weight,
              usesReps: ex.uses_reps,
            }
          })
          .filter((e): e is PrescribedExercise => e !== null)
          .sort((a, b) => a.position - b.position)

        setData({
          scheduledId: row.id,
          workoutId: w.id,
          title: w.title,
          category: w.category,
          description: w.description,
          scheduledDate: row.scheduled_date,
          status: row.status,
          estimatedDurationMinutes: w.estimated_duration_minutes,
          exercises: prescribed,
        })
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [scheduledWorkoutId, refetchToken])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { data, loading, error, refetch }
}
