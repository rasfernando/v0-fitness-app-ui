"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface CompletedSession {
  sessionId: string
  scheduledWorkoutId: string
  workoutTitle: string
  category: string
  completedAt: string  // ISO
  durationSeconds: number | null
}

export interface StrengthDataPoint {
  date: string         // YYYY-MM-DD for x-axis
  estimatedOneRepMax: number
  topSetWeight: number
  topSetReps: number
}

export interface ProgressData {
  // Headline counters
  totalSessionsCompleted: number
  sessionsThisWeek: number
  currentStreakWeeks: number
  totalSetsLogged: number
  // This-week aggregates (added for dashboard tiles)
  secondsTrainedThisWeek: number
  volumeLoadThisWeekKg: number  // sum of reps × weight, weighted sets only
  // Strength trend for the main lift
  mainLiftName: string | null         // null = not enough data
  mainLiftHistory: StrengthDataPoint[]
  // Recent completed sessions (for the activity feed)
  recentSessions: CompletedSession[]  // newest first, capped at 10
}

interface UseProgressDataResult {
  data: ProgressData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

// Epley formula — the standard "estimated one-rep max" calculation.
// Returns weight × (1 + reps/30). For 1 rep it returns the weight unchanged.
function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  return weight * (1 + reps / 30)
}

// Get YYYY-MM-DD in local time (not UTC) — needed for grouping by day.
function localDateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Get the Monday-of-this-week date as YYYY-MM-DD, for grouping by week.
function weekKey(iso: string): string {
  const d = new Date(iso)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return localDateKey(d.toISOString())
}

// ─────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────

/**
 * Fetches everything the Progress screen needs in two queries:
 *   1. All completed workout_sessions for the current client, joined with
 *      the workout title for display.
 *   2. All exercise_sets for those sessions, joined with workout_exercises
 *      and exercises for the names.
 *
 * Computes headline stats, strength trend, and recent activity in-memory.
 *
 * Returns null+loading=false for non-client users (PTs).
 * Returns ProgressData with empty arrays for clients with no data yet.
 */
export function useProgressData(): UseProgressDataResult {
  const { user } = useAuth()
  const [rawSessions, setRawSessions] = useState<RawSession[] | null>(null)
  const [rawSets, setRawSets] = useState<RawSet[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!user || user.role !== "client") {
      setRawSessions([])
      setRawSets([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    ;(async () => {
      // Query 1: completed sessions for this client
      const { data: sessionRows, error: sessionError } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          scheduled_workout_id,
          completed_at,
          duration_seconds,
          scheduled_workouts:scheduled_workout_id (
            workouts:workout_id (
              title,
              category
            )
          )
        `)
        .eq("client_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })

      if (cancelled) return
      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        return
      }

      const sessions: RawSession[] = (sessionRows ?? []).map((r) => {
        const sched = Array.isArray(r.scheduled_workouts)
          ? r.scheduled_workouts[0]
          : r.scheduled_workouts
        const w = sched
          ? Array.isArray(sched.workouts)
            ? sched.workouts[0]
            : sched.workouts
          : null
        return {
          id: r.id,
          scheduledWorkoutId: r.scheduled_workout_id,
          completedAt: r.completed_at as string,
          durationSeconds: r.duration_seconds,
          workoutTitle: w?.title ?? "Workout",
          workoutCategory: w?.category ?? "Other",
        }
      })

      if (cancelled) return
      setRawSessions(sessions)

      // Early-out if no sessions — no need to query sets
      if (sessions.length === 0) {
        setRawSets([])
        setLoading(false)
        return
      }

      // Query 2: all logged sets for those sessions, joined with exercise name
      const sessionIds = sessions.map((s) => s.id)
      const { data: setRows, error: setsError } = await supabase
        .from("exercise_sets")
        .select(`
          session_id,
          workout_exercise_id,
          set_number,
          reps_completed,
          weight_kg_used,
          completed_at,
          workout_exercises:workout_exercise_id (
            exercises:exercise_id (
              name
            )
          )
        `)
        .in("session_id", sessionIds)

      if (cancelled) return
      if (setsError) {
        setError(setsError.message)
        setLoading(false)
        return
      }

      const sets: RawSet[] = (setRows ?? []).map((r) => {
        const we = Array.isArray(r.workout_exercises)
          ? r.workout_exercises[0]
          : r.workout_exercises
        const ex = we
          ? Array.isArray(we.exercises)
            ? we.exercises[0]
            : we.exercises
          : null
        return {
          sessionId: r.session_id,
          workoutExerciseId: r.workout_exercise_id,
          setNumber: r.set_number,
          repsCompleted: r.reps_completed,
          weightKgUsed: r.weight_kg_used,
          completedAt: r.completed_at as string,
          exerciseName: ex?.name ?? "Unknown",
        }
      })

      setRawSets(sets)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role, refetchToken])

  // Derive ProgressData from the raw query results
  const data = useMemo<ProgressData | null>(() => {
    if (!rawSessions || !rawSets) return null

    const totalSessionsCompleted = rawSessions.length
    const totalSetsLogged = rawSets.length

    // Sessions this week (Monday-anchored)
    const nowKey = weekKey(new Date().toISOString())
    const sessionsThisWeekRows = rawSessions.filter(
      (s) => weekKey(s.completedAt) === nowKey
    )
    const sessionsThisWeek = sessionsThisWeekRows.length

    // Total seconds trained this week — sum durations, treat null as 0.
    const secondsTrainedThisWeek = sessionsThisWeekRows.reduce(
      (sum, s) => sum + (s.durationSeconds ?? 0),
      0
    )

    // Volume load this week: sum of reps × weight across all sets logged
    // in this-week sessions. Bodyweight / time-based sets contribute 0
    // because their weight or reps is null (intentional — see hook docs).
    const thisWeekSessionIds = new Set(sessionsThisWeekRows.map((s) => s.id))
    const volumeLoadThisWeekKg = rawSets.reduce((sum, set) => {
      if (!thisWeekSessionIds.has(set.sessionId)) return sum
      if (set.repsCompleted === null || set.weightKgUsed === null) return sum
      if (set.repsCompleted <= 0 || set.weightKgUsed <= 0) return sum
      return sum + set.repsCompleted * set.weightKgUsed
    }, 0)

    // Current streak: consecutive weeks with ≥1 session, ending this week or last
    const currentStreakWeeks = computeWeekStreak(rawSessions)

    // Pick the "main lift" — exercise appearing in the most distinct sessions
    const sessionsByExercise = new Map<string, Set<string>>()
    for (const s of rawSets) {
      // Skip sets where weight/reps wasn't recorded (time-based exercises etc.)
      if (s.repsCompleted === null || s.weightKgUsed === null) continue
      if (s.repsCompleted <= 0 || s.weightKgUsed <= 0) continue
      const set = sessionsByExercise.get(s.exerciseName) ?? new Set()
      set.add(s.sessionId)
      sessionsByExercise.set(s.exerciseName, set)
    }

    let mainLiftName: string | null = null
    let mainLiftSessionCount = 0
    for (const [name, sessionSet] of sessionsByExercise) {
      if (sessionSet.size > mainLiftSessionCount) {
        mainLiftSessionCount = sessionSet.size
        mainLiftName = name
      }
    }

    // Need at least 2 sessions to call it a trend
    if (mainLiftSessionCount < 2) {
      mainLiftName = null
    }

    // Build the strength history for the main lift: per session, take the
    // top set (heaviest estimated 1RM), then group by date
    let mainLiftHistory: StrengthDataPoint[] = []
    if (mainLiftName) {
      const setsForLift = rawSets.filter(
        (s) =>
          s.exerciseName === mainLiftName &&
          s.repsCompleted !== null &&
          s.weightKgUsed !== null &&
          s.repsCompleted > 0 &&
          s.weightKgUsed > 0
      )
      // Group by session, find the top 1RM in each
      const bySession = new Map<
        string,
        { topOrm: number; topWeight: number; topReps: number; date: string }
      >()
      for (const s of setsForLift) {
        const orm = epley(s.weightKgUsed!, s.repsCompleted!)
        const existing = bySession.get(s.sessionId)
        if (!existing || orm > existing.topOrm) {
          bySession.set(s.sessionId, {
            topOrm: orm,
            topWeight: s.weightKgUsed!,
            topReps: s.repsCompleted!,
            date: localDateKey(s.completedAt),
          })
        }
      }
      mainLiftHistory = Array.from(bySession.values())
        .map((v) => ({
          date: v.date,
          estimatedOneRepMax: Math.round(v.topOrm * 10) / 10,
          topSetWeight: v.topWeight,
          topSetReps: v.topReps,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Recent activity: most recent 10 completed sessions
    const recentSessions: CompletedSession[] = rawSessions
      .slice(0, 10)
      .map((s) => ({
        sessionId: s.id,
        scheduledWorkoutId: s.scheduledWorkoutId,
        workoutTitle: s.workoutTitle,
        category: s.workoutCategory,
        completedAt: s.completedAt,
        durationSeconds: s.durationSeconds,
      }))

    return {
      totalSessionsCompleted,
      sessionsThisWeek,
      currentStreakWeeks,
      totalSetsLogged,
      secondsTrainedThisWeek,
      volumeLoadThisWeekKg,
      mainLiftName,
      mainLiftHistory,
      recentSessions,
    }
  }, [rawSessions, rawSets])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])

  return { data, loading, error, refetch }
}

// ─────────────────────────────────────────────────────────────────────────
// Internal types and utilities
// ─────────────────────────────────────────────────────────────────────────

interface RawSession {
  id: string
  scheduledWorkoutId: string
  completedAt: string
  durationSeconds: number | null
  workoutTitle: string
  workoutCategory: string
}

interface RawSet {
  sessionId: string
  workoutExerciseId: string
  setNumber: number
  repsCompleted: number | null
  weightKgUsed: number | null
  completedAt: string
  exerciseName: string
}

// Streak: count consecutive weeks (Monday-anchored) ending this week or last
// week that contain at least one completed session. Allowing "this week or
// last" means a streak doesn't break the moment a new week starts — only
// when you skip a full week.
function computeWeekStreak(sessions: RawSession[]): number {
  if (sessions.length === 0) return 0

  const weeksWithSessions = new Set(sessions.map((s) => weekKey(s.completedAt)))

  const now = new Date()
  const thisWeek = weekKey(now.toISOString())

  // Walk backward from this week or last week
  let cursor: Date
  if (weeksWithSessions.has(thisWeek)) {
    cursor = startOfWeek(now)
  } else {
    const lastWeek = new Date(now)
    lastWeek.setDate(lastWeek.getDate() - 7)
    if (!weeksWithSessions.has(weekKey(lastWeek.toISOString()))) {
      return 0
    }
    cursor = startOfWeek(lastWeek)
  }

  let streak = 0
  while (weeksWithSessions.has(weekKey(cursor.toISOString()))) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  const day = out.getDay()
  const diff = day === 0 ? -6 : 1 - day
  out.setDate(out.getDate() + diff)
  out.setHours(0, 0, 0, 0)
  return out
}
