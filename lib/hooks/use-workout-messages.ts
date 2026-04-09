"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

export interface WorkoutMessage {
  id: string
  senderId: string
  senderName: string
  message: string
  createdAt: string
}

interface UseWorkoutMessagesResult {
  messages: WorkoutMessage[]
  loading: boolean
  refetch: () => void
}

export function useWorkoutMessages(scheduledWorkoutId: string | null): UseWorkoutMessagesResult {
  const [messages, setMessages] = useState<WorkoutMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    if (!scheduledWorkoutId) {
      setMessages([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from("workout_messages")
      .select(`
        id,
        sender_id,
        message,
        created_at,
        profiles:sender_id ( display_name )
      `)
      .eq("scheduled_workout_id", scheduledWorkoutId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error("Failed to load messages:", error.message)
          setLoading(false)
          return
        }

        setMessages(
          (data ?? []).map((m) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
            return {
              id: m.id,
              senderId: m.sender_id,
              senderName: profile?.display_name ?? "Unknown",
              message: m.message,
              createdAt: m.created_at,
            }
          })
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [scheduledWorkoutId, refetchToken])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { messages, loading, refetch }
}
