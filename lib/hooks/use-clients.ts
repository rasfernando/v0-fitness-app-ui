"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"

// One row per client coached by the current PT, joined with profile info
// and lightweight schedule stats (counts only — not full workout list).
// For the full per-client schedule, use useClientSchedule(clientId).
export interface PTClientSummary {
  id: string                 // profile id of the client
  relationshipId: string     // pt_clients.id (useful for ending/pausing)
  name: string
  username: string
  avatarUrl: string | null
  joinedAt: string           // when this PT started coaching them
  scheduledCount: number     // currently 'scheduled' status
  completedCount: number     // currently 'completed' status
}

interface UseClientsResult {
  data: PTClientSummary[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useClients(): UseClientsResult {
  const { user } = useAuth()
  const [data, setData] = useState<PTClientSummary[]>([])
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

    // We do this in two queries instead of one mega-join because Supabase's
    // PostgREST aggregation syntax is fiddly and harder to read/maintain.
    // Two queries on small tables is fine; we'll only optimize when we measure.
    ;(async () => {
      // 1. Fetch active relationships + client profile
      const { data: relationships, error: relError } = await supabase
        .from("pt_clients")
        .select(`
          id,
          started_at,
          status,
          client:client_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq("pt_id", user.id)
        .eq("status", "active")
        .order("started_at", { ascending: false })

      if (cancelled) return
      if (relError) {
        setError(relError.message)
        setLoading(false)
        return
      }

      const clientIds = (relationships ?? [])
        .map((r) => {
          const c = Array.isArray(r.client) ? r.client[0] : r.client
          return c?.id
        })
        .filter((id): id is string => Boolean(id))

      if (clientIds.length === 0) {
        setData([])
        setLoading(false)
        return
      }

      // 2. Fetch schedule counts for those clients in one shot
      const { data: scheduleRows, error: scheduleError } = await supabase
        .from("scheduled_workouts")
        .select("client_id, status")
        .in("client_id", clientIds)

      if (cancelled) return
      if (scheduleError) {
        setError(scheduleError.message)
        setLoading(false)
        return
      }

      // Aggregate counts client-side. For an MVP this is fine; if you ever
      // have hundreds of clients with thousands of workouts each, push this
      // aggregation into a Postgres view or RPC.
      const counts = new Map<string, { scheduled: number; completed: number }>()
      for (const row of scheduleRows ?? []) {
        const c = counts.get(row.client_id) ?? { scheduled: 0, completed: 0 }
        if (row.status === "scheduled") c.scheduled++
        else if (row.status === "completed") c.completed++
        counts.set(row.client_id, c)
      }

      const summaries: PTClientSummary[] = (relationships ?? [])
        .map((r) => {
          const c = Array.isArray(r.client) ? r.client[0] : r.client
          if (!c) return null
          const stats = counts.get(c.id) ?? { scheduled: 0, completed: 0 }
          return {
            id: c.id,
            relationshipId: r.id,
            name: c.display_name,
            username: c.username,
            avatarUrl: c.avatar_url,
            joinedAt: r.started_at,
            scheduledCount: stats.scheduled,
            completedCount: stats.completed,
          }
        })
        .filter((c): c is PTClientSummary => c !== null)

      setData(summaries)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role, refetchToken])

  return {
    data,
    loading,
    error,
    refetch: () => setRefetchToken((t) => t + 1),
  }
}
