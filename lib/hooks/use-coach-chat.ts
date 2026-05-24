"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { invalidate } from "@/lib/data-invalidation"

// Trailing marker the server emits when a tool actually mutated the DB.
// Stripped from display; triggers an invalidation so other hooks refetch.
const MUTATED_MARKER = " MUTATED "

export interface CoachMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  /** True only for the assistant message currently being streamed. */
  streaming?: boolean
}

interface UseCoachChatResult {
  messages: CoachMessage[]
  /** True from the moment the user hits send until the stream finishes. */
  sending: boolean
  /** Any error from the last send attempt. Cleared on the next send. */
  error: string | null
  /** True only while we're loading the initial history from the DB. */
  loadingHistory: boolean
  send: (text: string) => Promise<void>
}

/**
 * Loads coach message history from Supabase, exposes `send` which posts to
 * /api/coach/chat and streams the assistant's response back into local state.
 *
 * Persistence: both sides are saved by the API route, not by this hook.
 * The hook's only job is to render what's there.
 */
export function useCoachChat(): UseCoachChatResult {
  const { user } = useAuth()
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Used to discard in-flight stream chunks if the user signs out mid-stream.
  const cancelRef = useRef(false)

  // ── Load history on mount / when user changes ───────────────────────────
  useEffect(() => {
    cancelRef.current = false

    if (!user) {
      setMessages([])
      setLoadingHistory(false)
      return
    }

    setLoadingHistory(true)
    supabase
      .from("coach_messages")
      .select("id, role, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (cancelRef.current) return
        if (queryError) {
          console.error("Failed to load coach history:", queryError.message)
          setLoadingHistory(false)
          return
        }
        setMessages(
          (data ?? [])
            // Filter to user/assistant roles for the UI; we don't render system rows.
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              createdAt: m.created_at,
            }))
        )
        setLoadingHistory(false)
      })

    return () => {
      cancelRef.current = true
    }
  }, [user?.id])

  // ── Send ────────────────────────────────────────────────────────────────
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (!user) {
        setError("You need to be signed in to chat with the coach.")
        return
      }

      setError(null)
      setSending(true)

      // Optimistically push the user message + a placeholder assistant message
      // we'll fill in as the stream arrives.
      const tempUserId = `local-user-${Date.now()}`
      const tempAssistantId = `local-asst-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id: tempUserId,
          role: "user",
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
        {
          id: tempAssistantId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          streaming: true,
        },
      ])

      try {
        // Get the current session token to authenticate the API route.
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          throw new Error("Your session has expired. Please sign in again.")
        }

        const res = await fetch("/api/coach/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: trimmed }),
        })

        if (!res.ok) {
          // Try to parse a JSON error; fall back to text.
          let serverMsg = `Coach unavailable (${res.status})`
          try {
            const j = await res.json()
            if (j?.error) serverMsg = j.error
          } catch {
            try {
              serverMsg = await res.text()
            } catch {
              /* swallow */
            }
          }
          throw new Error(serverMsg)
        }
        if (!res.body) {
          throw new Error("No response stream from the coach.")
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let assembled = ""

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (cancelRef.current) break
          const chunk = decoder.decode(value, { stream: true })
          assembled += chunk
          // Render the message minus the trailing mutation marker if present.
          const displayed = stripMutatedMarker(assembled)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? { ...m, content: displayed } : m
            )
          )
        }

        // If the stream ended with the mutation marker, fire invalidation so
        // the dashboard's useScheduledWorkouts (and any future subscribers)
        // refetch.
        const mutated = assembled.endsWith(MUTATED_MARKER)
        const finalContent = stripMutatedMarker(assembled)

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? { ...m, content: finalContent, streaming: false }
              : m
          )
        )

        if (mutated) {
          // The marker doesn't tell us WHICH topic changed — the AI may have
          // scheduled, created, or deleted. Fire both topics; the cost of a
          // spurious refetch is tiny.
          invalidate("scheduled_workouts")
          invalidate("user_workouts")
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong."
        setError(message)
        // Replace the empty streaming placeholder with the error so the user sees it.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  content: m.content || `Sorry — ${message}`,
                  streaming: false,
                }
              : m
          )
        )
      } finally {
        setSending(false)
      }
    },
    [user?.id]
  )

  return { messages, sending, error, loadingHistory, send }
}

/** Remove the server-side mutation marker from a message for display. */
function stripMutatedMarker(content: string): string {
  if (content.endsWith(MUTATED_MARKER)) {
    return content.slice(0, -MUTATED_MARKER.length).trimEnd()
  }
  return content
}
