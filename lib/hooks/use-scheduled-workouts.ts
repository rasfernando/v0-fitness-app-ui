"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import type { ScheduledStatus } from "@/lib/supabase/database.types"

// Shape returned by the joined query — flattened for easy consumption
// by the existing UI which expects { id, title, category, duration, date, status }.
export interface ScheduledWorkoutWithDetails {
  id: string
  workoutId: string
  title: string
  category: string
  duration: string // e.g. "45 min" — formatted for display
  date: string // YYYY-MM-DD
  status: ScheduledStatus
}

interface UseScheduledWorkoutsResult {
  data: ScheduledWorkoutWithDetails[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Fetches scheduled workouts.
 *
 * - Called with no args from a client-role user → returns their own schedule.
 * - Called with a clientId from a PT-role user → returns that client's schedule.
 *   (Today: any PT can pass any clientId. Later: RLS will enforce that the
 *   PT actually owns a relationship with that client at the DB level.)
 *
 * Returns [] when there's no logical user/clientId combination
 * (e.g. PT viewing their own schedule — they don't have one).
 */
export function useScheduledWorkouts(clientId?: string): UseScheduledWorkoutsResult {
  const { user } = useAuth()
  const [data, setData] = useState<ScheduledWorkoutWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchToken, setRefetchToken] = useState(0)

  // Resolve which client's schedule to load:
  //  - explicit clientId arg wins
  //  - otherwise: the current user, but only if they're a client
  const targetClientId =
    clientId ?? (user?.role === "client" ? user.id : null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    if (!targetClientId) {
      setData([])
      setLoading(false)
      return
    }

    supabase
      .from("scheduled_workouts")
      .select(`
        id,
        workout_id,
        scheduled_date,
        status,
        workouts:workout_id (
          title,
          category,
          estimated_duration_minutes
        )
      `)
      .eq("client_id", targetClientId)
      .order("scheduled_date", { ascending: true })
      .then(({ data: rows, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
          setLoading(false)
          return
        }

        const mapped: ScheduledWorkoutWithDetails[] = (rows ?? []).map((row) => {
          // Supabase returns the joined relation as an object (or array if it can't infer cardinality).
          // We typed our migration with a single FK so it's a single object, but we defensively handle both.
          const w = Array.isArray(row.workouts) ? row.workouts[0] : row.workouts
          return {
            id: row.id,
            workoutId: row.workout_id,
            title: w?.title ?? "Untitled workout",
            category: w?.category ?? "Other",
            duration: w?.estimated_duration_minutes
              ? `${w.estimated_duration_minutes} min`
              : "—",
            date: row.scheduled_date,
            status: row.status,
          }
        })

        setData(mapped)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [targetClientId, refetchToken])

  return {
    data,
    loading,
    error,
    refetch: () => setRefetchToken((t) => t + 1),
  }
}
