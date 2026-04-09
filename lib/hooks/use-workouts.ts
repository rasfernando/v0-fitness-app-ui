"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"

// Shape compatible with the existing LibraryWorkout interface in pt-coach-screen.tsx
// so we can drop this into the existing UI without restructuring it.
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
  isGlobal: boolean           // true = shared template (read-only), false = PT's own
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
 * Loads all workout templates visible to the current PT (their own + global).
 * RLS handles visibility. Returns [] for non-PT users.
 */
export function useWorkouts(): UseWorkoutsResult {
  const { user } = useAuth()
  const [data, setData] = useState<WorkoutSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!user || user.role !== "pt") {
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
  }, [user?.id, user?.role, refetchToken])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { data, loading, error, refetch }
}
