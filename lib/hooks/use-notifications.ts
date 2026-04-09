"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"

export interface Notification {
  id: string
  type: "workout_assigned" | "workout_logged" | "workout_message"
  title: string
  body: string | null
  data: Record<string, string>
  isRead: boolean
  createdAt: string
}

interface UseNotificationsResult {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refetch: () => void
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error("Failed to load notifications:", error.message)
          setLoading(false)
          return
        }

        setNotifications(
          (data ?? []).map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            data: (n.data ?? {}) as Record<string, string>,
            isRead: n.is_read,
            createdAt: n.created_at,
          }))
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, refetchToken])

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { notifications, unreadCount, loading, refetch }
}
