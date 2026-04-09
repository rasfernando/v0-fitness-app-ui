"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

// Full detail for a single workout template — metadata plus its ordered
// list of prescribed exercises. Powers the PT's workout detail view and
// the edit form.
//
// Similar to useScheduledWorkoutDetail but takes a workouts.id rather
// than a scheduled_workouts.id. The shapes are different enough that
// merging them would be awkward.

export interface WorkoutDetailExercise {
  workoutExerciseId: string    // row id in workout_exercises (needed for edits)
  exerciseId: string
  name: string
  category: string | null
  muscleGroup: string | null
  supersetGroup: string | null // e.g. "A", "B", "C" — exercises in the same group form a superset
  position: number
  sets: number
  prescription: string
  weightKg: number | null
  restSeconds: number
  notes: string | null
  usesWeight: boolean
  usesReps: boolean
}

export interface WorkoutDetail {
  id: string
  ptId: string
  title: string
  description: string | null
  category: string
  difficulty: "beginner" | "intermediate" | "advanced"
  estimatedDurationMinutes: number | null
  estimatedCalories: number | null
  imageUrl: string | null
  deletedAt: string | null
  exercises: WorkoutDetailExercise[]
}

interface UseWorkoutDetailResult {
  data: WorkoutDetail | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Loads a single workouts row by id, joined with its workout_exercises
 * rows (in position order), joined with the underlying exercises for
 * display names and metadata.
 *
 * Passing null returns a clean empty state, useful when the parent screen
 * mounts before a workout has been selected.
 *
 * Soft-deleted workouts (deleted_at IS NOT NULL) are still returned when
 * asked by id — the caller can check and decide. This allows a future
 * "undelete" UI, and avoids mysterious 404s if someone bookmarks a deleted
 * workout URL.
 */
export function useWorkoutDetail(
  workoutId: string | null | undefined
): UseWorkoutDetailResult {
  const [data, setData] = useState<WorkoutDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(workoutId))
  const [error, setError] = useState<string | null>(null)
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!workoutId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    supabase
      .from("workouts")
      .select(`
        id,
        pt_id,
        title,
        description,
        category,
        difficulty,
        estimated_duration_minutes,
        estimated_calories,
        image_url,
        deleted_at,
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
            uses_weight,
            uses_reps
          )
        )
      `)
      .eq("id", workoutId)
      .single()
      .then(({ data: row, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
          setLoading(false)
          return
        }
        if (!row) {
          setError("Workout not found")
          setLoading(false)
          return
        }

        const weRows = (row.workout_exercises ?? []) as Array<{
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
                uses_weight: boolean
                uses_reps: boolean
              }
            | Array<{
                id: string
                name: string
                category: string | null
                muscle_group: string | null
                uses_weight: boolean
                uses_reps: boolean
              }>
            | null
        }>

        const exercises: WorkoutDetailExercise[] = weRows
          .map((we) => {
            const ex = Array.isArray(we.exercises) ? we.exercises[0] : we.exercises
            if (!ex) return null
            return {
              workoutExerciseId: we.id,
              exerciseId: ex.id,
              name: ex.name,
              category: ex.category,
              muscleGroup: ex.muscle_group,
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
          .filter((e): e is WorkoutDetailExercise => e !== null)
          .sort((a, b) => a.position - b.position)

        setData({
          id: row.id,
          ptId: row.pt_id,
          title: row.title,
          description: row.description,
          category: row.category,
          difficulty: row.difficulty,
          estimatedDurationMinutes: row.estimated_duration_minutes,
          estimatedCalories: row.estimated_calories,
          imageUrl: row.image_url,
          deletedAt: row.deleted_at,
          exercises,
        })
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [workoutId, refetchToken])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { data, loading, error, refetch }
}
