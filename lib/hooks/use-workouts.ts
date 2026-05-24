"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { useInvalidationVersion } from "@/lib/data-invalidation"

// Shape used by the workout library UI.
// "exercises" is a count, not the array.
export interface WorkoutSummary {
  id: string                  // real UUID from workouts table
  title: string
  category: string
  duration: string            // formatted: "45 min" or "—"
  calories: string            // formatted: "380 cal" or "—"
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  exercises: number
  imageUrl: string
  isGlobal: boolean           // true = system template (read-only), false = the user's own
}

interface UseWorkoutsResult {
  data: WorkoutSummary[]
  loading: boolean
  error: string | null
  refetch: () => void
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&q=80"

// Map DB difficulty enum (lowercase) → display string (capitalized)
function formatDifficulty(d: string): "Beginner" | "Intermediate" | "Advanced" {
  if (d === "beginner") return "Beginner"
  if (d === "advanced") return "Advanced"
  return "Intermediate"
}

/**
 * Loads all workout templates visible to the current user.
 * RLS handles visibility: global templates (user_id IS NULL) + the user's own.
 */
export function useWorkouts(): UseWorkoutsResult {
  const { user } = useAuth()
  const [data, setData] = useState<WorkoutSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchToken, setRefetchToken] = useState(0)
  // Refetch when the coach creates/deletes workouts via tool use.
  const invalidationVersion = useInvalidationVersion("user_workouts")

  useEffect(() => {
    let cancelled = false

    if (!user) {
      setData([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Postgrest count syntax: workout_exercises(count) gives us a count
    // of the related rows without pulling the rows themselves.
    supabase
      .from("workouts")
      .select(`
        id,
        title,
        category,
        difficulty,
        estimated_duration_minutes,
        estimated_calories,
        image_url,
        is_global,
        workout_exercises(count)
      `)
      .eq("is_adhoc", false)   // only show real templates, not client quick-logs
      .is("deleted_at", null)  // hide soft-deleted workouts from the library
      .order("created_at", { ascending: false })
      .then(({ data: rows, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
          setLoading(false)
          return
        }

        const mapped: WorkoutSummary[] = (rows ?? []).map((row) => {
          // workout_exercises comes back as [{ count: N }] when using count() syntax
          const exerciseCount = Array.isArray(row.workout_exercises)
            ? (row.workout_exercises[0] as { count: number } | undefined)?.count ?? 0
            : 0

          return {
            id: row.id,
            title: row.title,
            category: row.category,
            duration: row.estimated_duration_minutes
              ? `${row.estimated_duration_minutes} min`
              : "—",
            calories: row.estimated_calories
              ? `${row.estimated_calories} cal`
              : "—",
            difficulty: formatDifficulty(row.difficulty),
            exercises: exerciseCount,
            imageUrl: row.image_url ?? FALLBACK_IMAGE,
            isGlobal: row.is_global ?? false,
          }
        })

        setData(mapped)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, refetchToken, invalidationVersion])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { data, loading, error, refetch }
}
