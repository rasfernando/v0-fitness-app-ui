"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

// Shape the calendar's AddSheet expects. Intentionally matches the
// previously-hardcoded ExerciseLibraryItem so the downstream UI doesn't
// need to change — only the source of the data does.
//
// muscleGroup is coerced to "" when the DB value is null, because the
// calendar UI uses it in a string filter and expects a non-null value.
export interface ExerciseOption {
  id: string
  name: string
  category: string
  muscleGroup: string
  usesWeight: boolean
  usesReps: boolean
}

interface UseExercisesResult {
  data: ExerciseOption[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Loads the exercise library available to the current user.
 *
 * Returns global exercises (created_by is null) plus any custom exercises
 * created by the current user. For MVP this means: PTs see global + their
 * own, clients see only global (which is fine because clients don't pick
 * exercises — the PT does).
 *
 * In a future with RLS enabled, the visibility is enforced at the DB level;
 * for now we rely on the query itself.
 *
 * Sorted by category then name for a predictable display order.
 */
export function useExercises(): UseExercisesResult {
  const [data, setData] = useState<ExerciseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from("exercises")
      .select("id, name, category, muscle_group, uses_weight, uses_reps")
      .is("created_by", null) // global library only for now
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data: rows, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
          setLoading(false)
          return
        }

        const mapped: ExerciseOption[] = (rows ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          muscleGroup: r.muscle_group ?? "",
          usesWeight: r.uses_weight,
          usesReps: r.uses_reps,
        }))

        setData(mapped)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refetchToken])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { data, loading, error, refetch }
}
