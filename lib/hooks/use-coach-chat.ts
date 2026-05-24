"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { invalidate } from "@/lib/data-invalidation"

// The mutation marker means "something changed in the DB" — could be
// scheduling, workouts, OR the user's goals. We refresh all of them.

// Trailing marker the server emits when a tool actually mutated the DB.
// Stripped from display; triggers an invalidation so other hooks refetch.
const MUTATED_MARKER = " MUTATED "

// Coach can optionally append a <replies>...</replies> block listing 2–4
// quick-reply chips. We parse and strip them so the rendered text stays clean.
const REPLIES_TAG_RE = /<replies>\s*([\s\S]*?)\s*<\/replies>\s*$/i

export interface CoachMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  /** True only for the assistant message currently being streamed. */
  streaming?: boolean
  /** Optional tap-replies suggested by the coach. Present only on assistant
   *  messages that ended with a <replies> block. */
  suggestedReplies?: string[]
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
  const { user, refreshUser } = useAuth()
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
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => {
              const { content, replies } = parseReplies(m.content)
              return {
                id: m.id,
                role: m.role as "user" | "assistant",
                content,
                createdAt: m.created_at,
                ...(replies ? { suggestedReplies: replies } : {}),
              }
            })
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
        // Clear any prior suggestedReplies so old chips don't linger.
        ...prev.map((m) =>
          m.suggestedReplies ? { ...m, suggestedReplies: undefined } : m
        ),
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
          // Render the message minus the mutation marker and any partial replies block.
          // We don't show chips until the stream completes — incremental rendering of
          // <replies> mid-stream would be ugly. Just strip the partial tag for display.
          const displayed = stripPartialReplies(stripMutatedMarker(assembled))
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? { ...m, content: displayed } : m
            )
          )
        }

        // Stream finished. Parse final content for replies + mutation marker.
        const mutated = assembled.endsWith(MUTATED_MARKER)
        const withoutMarker = stripMutatedMarker(assembled)
        const { content: finalContent, replies } = parseReplies(withoutMarker)

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  content: finalContent,
                  streaming: false,
                  ...(replies ? { suggestedReplies: replies } : {}),
                }
              : m
          )
        )

        if (mutated) {
          // Fire both topics; the cost of a spurious refetch is tiny.
          invalidate("scheduled_workouts")
          invalidate("user_workouts")
          // Goals might also have been updated via update_goals tool —
          // refresh the AppUser so the welcome bubble and profile screen
          // pick up the change without a manual reload.
          refreshUser().catch((err) => console.warn("refreshUser failed:", err))
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong."
        setError(message)
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Remove the server-side mutation marker from a message for display. */
function stripMutatedMarker(content: string): string {
  if (content.endsWith(MUTATED_MARKER)) {
    return content.slice(0, -MUTATED_MARKER.length).trimEnd()
  }
  return content
}

/**
 * Parse trailing <replies>...</replies> block. Returns the cleaned content
 * (without the tag) and a list of reply lines if the tag was present.
 */
function parseReplies(raw: string): { content: string; replies?: string[] } {
  const match = raw.match(REPLIES_TAG_RE)
  if (!match) return { content: raw }

  const inner = match[1]
  const replies = inner
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("-")) // tolerate `- foo`
    .map((line) => line.replace(/^-\s*/, ""))
    .slice(0, 4) // hard-cap to 4

  if (replies.length === 0) return { content: raw.replace(REPLIES_TAG_RE, "").trimEnd() }

  return {
    content: raw.replace(REPLIES_TAG_RE, "").trimEnd(),
    replies,
  }
}

/**
 * During streaming, strip a partial <replies> block that may have started but
 * not yet closed. Otherwise the user sees raw "<replies>" text appear before
 * the chips render. Once </replies> arrives, full parseReplies takes over.
 */
function stripPartialReplies(content: string): string {
  // If we see <replies> with no closing tag, hide everything from that point.
  const openIdx = content.lastIndexOf("<replies>")
  if (openIdx === -1) return content
  const afterOpen = content.slice(openIdx)
  if (afterOpen.includes("</replies>")) return content // full block; parseReplies handles
  return content.slice(0, openIdx).trimEnd()
}
