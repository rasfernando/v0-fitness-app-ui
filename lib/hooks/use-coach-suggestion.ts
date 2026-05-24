"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useInvalidationVersion } from "@/lib/data-invalidation"
import type { CoachSuggestion } from "@/lib/coach/suggestion-types"

interface UseCoachSuggestionResult {
  suggestion: CoachSuggestion | null
  loading: boolean
  error: string | null
  /** Force a refresh from the API (skips cache). */
  regenerate: () => Promise<void>
  /** True if the rendered suggestion came from localStorage rather than a fresh call. */
  fromCache: boolean
}

const CACHE_PREFIX = "coach-suggestion:"
// 24 hours. After this, we silently refetch on next mount.
// If the scheduled workout completes mid-cache, the dashboard's calling
// component should pass null/skip this hook — the cache will eventually expire.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CacheEntry {
  storedAt: number
  payload: CoachSuggestion
}

function cacheKey(scheduledWorkoutId: string) {
  return `${CACHE_PREFIX}${scheduledWorkoutId}`
}

function readCache(scheduledWorkoutId: string): CoachSuggestion | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(cacheKey(scheduledWorkoutId))
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (!entry?.payload || !entry.storedAt) return null
    if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(cacheKey(scheduledWorkoutId))
      return null
    }
    return entry.payload
  } catch {
    return null
  }
}

function writeCache(scheduledWorkoutId: string, payload: CoachSuggestion) {
  if (typeof window === "undefined") return
  try {
    const entry: CacheEntry = { storedAt: Date.now(), payload }
    window.localStorage.setItem(cacheKey(scheduledWorkoutId), JSON.stringify(entry))
  } catch {
    // Storage might be full or disabled in private mode; not fatal.
  }
}

function clearCache(scheduledWorkoutId: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(cacheKey(scheduledWorkoutId))
  } catch {
    /* swallow */
  }
}

/**
 * Fetches an AI coach suggestion for a specific scheduled workout.
 * Caches in localStorage (24h TTL) to avoid hammering the API on every render.
 * Pass null/undefined to defer fetching.
 */
export function useCoachSuggestion(
  scheduledWorkoutId: string | null | undefined
): UseCoachSuggestionResult {
  const [suggestion, setSuggestion] = useState<CoachSuggestion | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState<boolean>(false)
  // If the coach mutates the schedule via a tool call (Phase 4), the suggestion
  // we cached may now point at a stale prescription. Bump on invalidation so
  // we refetch.
  const invalidationVersion = useInvalidationVersion("scheduled_workouts")

  const doFetch = useCallback(
    async (id: string, opts: { force: boolean }) => {
      setError(null)

      // Cache check
      if (!opts.force) {
        const cached = readCache(id)
        if (cached) {
          setSuggestion(cached)
          setFromCache(true)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setFromCache(false)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) throw new Error("Your session has expired. Sign in again.")

        const res = await fetch("/api/coach/suggest-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ scheduledWorkoutId: id }),
        })

        if (!res.ok) {
          let serverMsg = `Coach unavailable (${res.status})`
          try {
            const j = await res.json()
            if (j?.error) serverMsg = j.error
          } catch {
            /* swallow */
          }
          throw new Error(serverMsg)
        }

        const payload = (await res.json()) as CoachSuggestion
        setSuggestion(payload)
        writeCache(id, payload)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong"
        setError(message)
        setSuggestion(null)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // On mount / when id changes, try cache first, then fetch.
  // If invalidation fires for "scheduled_workouts", drop the cache and force-refetch
  // (the suggestion is stale: prescription or context likely changed).
  useEffect(() => {
    if (!scheduledWorkoutId) {
      setSuggestion(null)
      setLoading(false)
      setError(null)
      setFromCache(false)
      return
    }
    const force = invalidationVersion > 0
    if (force) clearCache(scheduledWorkoutId)
    doFetch(scheduledWorkoutId, { force })
  }, [scheduledWorkoutId, doFetch, invalidationVersion])

  const regenerate = useCallback(async () => {
    if (!scheduledWorkoutId) return
    clearCache(scheduledWorkoutId)
    await doFetch(scheduledWorkoutId, { force: true })
  }, [scheduledWorkoutId, doFetch])

  return { suggestion, loading, error, regenerate, fromCache }
}
