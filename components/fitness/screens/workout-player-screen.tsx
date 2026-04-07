"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { X, Check, ChevronLeft, ChevronRight, Trophy, Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"
import { CTAButton } from "../cta-button"
import { useDevUser } from "@/lib/dev-user"
import {
  useScheduledWorkoutDetail,
  type PrescribedExercise,
} from "@/lib/hooks/use-scheduled-workout-detail"
import {
  startWorkoutSession,
  logExerciseSet,
  completeWorkoutSession,
} from "@/lib/mutations/sessions"

interface WorkoutPlayerScreenProps {
  scheduledWorkoutId: string | null
  workoutTitle: string
  onExit: () => void
  onComplete: () => void
}

// In-memory representation of one logged set. Used for the input fields
// and the "is this set done?" checks. Persisted to the DB on tap.
interface LoggedSet {
  setNumber: number
  repsCompleted: string  // string for input control; parsed on save
  weightKg: string
  isDone: boolean
}

// Build the initial set state for an exercise, prefilling from prescription.
function buildInitialSets(exercise: PrescribedExercise): LoggedSet[] {
  // Try to extract a number from the prescription string for prefilling reps.
  // "8-12" → 8, "10" → 10, "30s" → 30, "AMRAP" → "" (no prefill).
  const repsMatch = exercise.prescription.match(/^(\d+)/)
  const defaultReps = repsMatch ? repsMatch[1] : ""
  const defaultWeight =
    exercise.weightKg !== null ? String(exercise.weightKg) : ""

  return Array.from({ length: exercise.sets }, (_, i) => ({
    setNumber: i + 1,
    repsCompleted: defaultReps,
    weightKg: defaultWeight,
    isDone: false,
  }))
}

export function WorkoutPlayerScreen({
  scheduledWorkoutId,
  workoutTitle,
  onExit,
  onComplete,
}: WorkoutPlayerScreenProps) {
  const { user } = useDevUser()
  const { data: detail, loading, error: loadError } =
    useScheduledWorkoutDetail(scheduledWorkoutId)

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null)
  const [sessionStartError, setSessionStartError] = useState<string | null>(null)
  const sessionStartingRef = useRef(false)

  // Per-exercise logged-set state, keyed by workoutExerciseId
  const [loggedByExerciseId, setLoggedByExerciseId] = useState<
    Record<string, LoggedSet[]>
  >({})

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [logError, setLogError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // ── Session lifecycle ──────────────────────────────────────────────────
  // Start a session as soon as the prescription has loaded.
  useEffect(() => {
    if (!detail || sessionId || sessionStartingRef.current || completed) return
    sessionStartingRef.current = true
    setSessionStartError(null)
    startWorkoutSession({
      scheduledWorkoutId: detail.scheduledId,
      clientId: user.id,
    })
      .then((id) => {
        setSessionId(id)
        setSessionStartedAt(new Date())
        // Initialize logged-set state for every exercise
        const initial: Record<string, LoggedSet[]> = {}
        for (const ex of detail.exercises) {
          initial[ex.workoutExerciseId] = buildInitialSets(ex)
        }
        setLoggedByExerciseId(initial)
      })
      .catch((err) => {
        setSessionStartError(err instanceof Error ? err.message : "Failed to start session")
      })
      .finally(() => {
        sessionStartingRef.current = false
      })
  }, [detail, sessionId, completed, user.id])

  // Elapsed timer
  useEffect(() => {
    if (!sessionStartedAt || completed) return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStartedAt, completed])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // ── Set logging ─────────────────────────────────────────────────────────
  const currentExercise: PrescribedExercise | undefined = detail?.exercises[currentExerciseIndex]
  const currentSets: LoggedSet[] = currentExercise
    ? loggedByExerciseId[currentExercise.workoutExerciseId] ?? []
    : []

  const updateSet = (workoutExerciseId: string, setIndex: number, patch: Partial<LoggedSet>) => {
    setLoggedByExerciseId((prev) => {
      const sets = prev[workoutExerciseId] ?? []
      const next = sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s))
      return { ...prev, [workoutExerciseId]: next }
    })
  }

  const handleLogSet = async (setIndex: number) => {
    if (!sessionId || !currentExercise) return
    const set = currentSets[setIndex]
    if (!set) return

    setLogError(null)

    // Parse inputs. Empty string → null. Non-numeric → null.
    const repsParsed = set.repsCompleted ? parseInt(set.repsCompleted, 10) : NaN
    const weightParsed = set.weightKg ? parseFloat(set.weightKg) : NaN
    const reps = Number.isFinite(repsParsed) ? repsParsed : null
    const weight = Number.isFinite(weightParsed) ? weightParsed : null

    // Optimistically mark as done so the UI feels snappy
    updateSet(currentExercise.workoutExerciseId, setIndex, { isDone: true })

    try {
      await logExerciseSet({
        sessionId,
        workoutExerciseId: currentExercise.workoutExerciseId,
        setNumber: set.setNumber,
        repsCompleted: reps,
        weightKgUsed: weight,
      })
    } catch (err) {
      // Roll back the optimistic flag
      updateSet(currentExercise.workoutExerciseId, setIndex, { isDone: false })
      setLogError(err instanceof Error ? err.message : "Failed to log set")
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  const allExercisesComplete = useMemo(() => {
    if (!detail) return false
    return detail.exercises.every((ex) => {
      const sets = loggedByExerciseId[ex.workoutExerciseId] ?? []
      return sets.length > 0 && sets.every((s) => s.isDone)
    })
  }, [detail, loggedByExerciseId])

  const handlePrev = () => {
    if (currentExerciseIndex > 0) setCurrentExerciseIndex((i) => i - 1)
  }

  const handleNext = () => {
    if (!detail) return
    if (currentExerciseIndex < detail.exercises.length - 1) {
      setCurrentExerciseIndex((i) => i + 1)
    }
  }

  const handleFinish = async () => {
    if (!sessionId || !detail || !sessionStartedAt) return
    setCompleting(true)
    setLogError(null)
    try {
      await completeWorkoutSession({
        sessionId,
        scheduledWorkoutId: detail.scheduledId,
        durationSeconds: Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000),
      })
      setCompleted(true)
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Failed to complete session")
    } finally {
      setCompleting(false)
    }
  }

  // ── Render: edge cases first ────────────────────────────────────────────

  if (!scheduledWorkoutId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <Dumbbell className="h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold uppercase text-foreground">
          No workout selected
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a scheduled workout from your dashboard to start logging.
        </p>
        <CTAButton onClick={onExit} className="mt-6">
          Back
        </CTAButton>
      </div>
    )
  }

  if (loading || !detail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          {loadError ? `Failed to load: ${loadError}` : "Loading workout…"}
        </p>
      </div>
    )
  }

  if (sessionStartError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-destructive">Failed to start session: {sessionStartError}</p>
        <CTAButton onClick={onExit} className="mt-6">
          Back
        </CTAButton>
      </div>
    )
  }

  if (completed) {
    const totalSetsLogged = Object.values(loggedByExerciseId).reduce(
      (sum, sets) => sum + sets.filter((s) => s.isDone).length,
      0
    )
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/20">
          <Trophy className="h-12 w-12 text-primary" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase text-foreground">
          Workout Complete!
        </h1>
        <p className="mt-2 text-muted-foreground">Great work crushing {workoutTitle}</p>

        <div className="mt-8 grid w-full max-w-xs grid-cols-3 gap-4">
          <div className="rounded-xl bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Duration</p>
          </div>
          <div className="rounded-xl bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
              {detail.exercises.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Exercises</p>
          </div>
          <div className="rounded-xl bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-primary">
              {totalSetsLogged}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Sets</p>
          </div>
        </div>

        <CTAButton onClick={onComplete} className="mt-10 w-full max-w-xs">
          Finish
        </CTAButton>
      </div>
    )
  }

  // ── Render: main player ─────────────────────────────────────────────────

  if (!currentExercise) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">No exercises in this workout.</p>
      </div>
    )
  }

  const exerciseProgress = `Exercise ${currentExerciseIndex + 1} / ${detail.exercises.length}`
  const allSetsDone = currentSets.length > 0 && currentSets.every((s) => s.isDone)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <button
          onClick={onExit}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
          aria-label="Exit workout"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase text-foreground">
            {workoutTitle}
          </h1>
          <p className="text-[10px] text-muted-foreground">{formatTime(elapsedSeconds)} · {exerciseProgress}</p>
        </div>
        <div className="h-9 w-9" />
      </header>

      {/* Exercise card */}
      <div className="flex-1 px-4 py-4">
        <div className="rounded-2xl bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {currentExercise.category ?? "Exercise"}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
                {currentExercise.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentExercise.sets} × {currentExercise.prescription}
                {currentExercise.weightKg !== null && ` · ${currentExercise.weightKg}kg`}
                {` · Rest ${currentExercise.restSeconds}s`}
              </p>
              {currentExercise.notes && (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  Note: {currentExercise.notes}
                </p>
              )}
            </div>
          </div>

          {/* Sets */}
          <div className="mt-5 space-y-2">
            <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-semibold uppercase text-muted-foreground">
              <div className="col-span-2">Set</div>
              {currentExercise.usesReps && <div className="col-span-4">Reps</div>}
              {currentExercise.usesWeight && <div className="col-span-4">Weight (kg)</div>}
              <div className={cn("col-span-2 text-right", !currentExercise.usesReps && !currentExercise.usesWeight && "col-span-10")}>Done</div>
            </div>
            {currentSets.map((set, i) => (
              <div
                key={set.setNumber}
                className={cn(
                  "grid grid-cols-12 items-center gap-2 rounded-xl px-2 py-2 transition-colors",
                  set.isDone ? "bg-emerald-500/10" : "bg-secondary"
                )}
              >
                <div className="col-span-2 text-sm font-bold text-foreground">{set.setNumber}</div>
                {currentExercise.usesReps && (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.repsCompleted}
                    onChange={(e) =>
                      updateSet(currentExercise.workoutExerciseId, i, { repsCompleted: e.target.value, isDone: false })
                    }
                    disabled={set.isDone}
                    className="col-span-4 h-9 rounded-lg bg-background px-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
                {currentExercise.usesWeight && (
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={set.weightKg}
                    onChange={(e) =>
                      updateSet(currentExercise.workoutExerciseId, i, { weightKg: e.target.value, isDone: false })
                    }
                    disabled={set.isDone}
                    className="col-span-4 h-9 rounded-lg bg-background px-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
                <div className={cn("flex justify-end", !currentExercise.usesReps && !currentExercise.usesWeight ? "col-span-10" : "col-span-2")}>
                  <button
                    onClick={() => handleLogSet(i)}
                    disabled={set.isDone || !sessionId}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                      set.isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-primary text-primary-foreground hover:brightness-110"
                    )}
                    aria-label={set.isDone ? "Set logged" : "Mark set done"}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {logError && (
            <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {logError}
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <footer className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentExerciseIndex === 0}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground disabled:opacity-40"
            aria-label="Previous exercise"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {currentExerciseIndex < detail.exercises.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!allSetsDone}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-xl font-semibold uppercase tracking-wide transition-all",
                allSetsDone
                  ? "bg-primary text-primary-foreground hover:brightness-110"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              Next exercise
              <ChevronRight className="ml-2 h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!allExercisesComplete || completing}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-xl font-semibold uppercase tracking-wide transition-all",
                allExercisesComplete && !completing
                  ? "bg-primary text-primary-foreground hover:brightness-110"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {completing ? "Saving…" : "Finish workout"}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
