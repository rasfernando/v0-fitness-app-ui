"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  X,
  Check,
  Plus,
  Search,
  Loader2,
  Dumbbell,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CTAButton } from "../cta-button"
import { useAuth } from "@/lib/auth"
import { useExercises } from "@/lib/hooks/use-exercises"
import {
  startLiveSession,
  addLiveExercise,
  finalizeLiveWorkout,
  type LiveSessionHandle,
} from "@/lib/mutations/live-session"
import { logExerciseSet, completeWorkoutSession } from "@/lib/mutations/sessions"

interface LiveSessionScreenProps {
  clientId: string
  clientName: string
  onExit: () => void
  onComplete: () => void
}

// One logged set within a live exercise
interface LiveSet {
  setNumber: number
  repsCompleted: string
  weightKg: string
  isDone: boolean
}

// One exercise added during the session
interface LiveExercise {
  workoutExerciseId: string
  exerciseId: string
  name: string
  category: string
  muscleGroup: string | null
  usesWeight: boolean
  usesReps: boolean
  sets: LiveSet[]
  collapsed: boolean
}

export function LiveSessionScreen({
  clientId,
  clientName,
  onExit,
  onComplete,
}: LiveSessionScreenProps) {
  const { user } = useAuth()
  const { data: exerciseLibrary, loading: exercisesLoading } = useExercises()

  // Session handle from the DB
  const [handle, setHandle] = useState<LiveSessionHandle | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const startingRef = useRef(false)

  // Exercises added during this session
  const [exercises, setExercises] = useState<LiveExercise[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState("")

  // Timer
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // End state
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  // ── Start session on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (handle || startingRef.current || !user) return
    startingRef.current = true
    setStartError(null)
    startLiveSession({ ptId: user.id, clientId })
      .then((h) => {
        setHandle(h)
        setStartedAt(new Date())
      })
      .catch((err) => {
        setStartError(err instanceof Error ? err.message : "Failed to start session")
      })
      .finally(() => {
        startingRef.current = false
      })
  }, [handle, user?.id, clientId])

  // Elapsed timer
  useEffect(() => {
    if (!startedAt || completed) return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt, completed])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // ── Add exercise ────────────────────────────────────────────────────────
  const handleAddExercise = async (ex: {
    id: string
    name: string
    category: string
    muscleGroup: string
    usesWeight?: boolean
    usesReps?: boolean
  }) => {
    if (!handle) return
    setShowPicker(false)
    setPickerSearch("")
    setLogError(null)

    try {
      const result = await addLiveExercise({
        workoutId: handle.workoutId,
        exerciseId: ex.id,
        position: exercises.length,
      })

      // Collapse any previously open exercise
      setExercises((prev) =>
        [
          ...prev.map((e) => ({ ...e, collapsed: true })),
          {
            workoutExerciseId: result.workoutExerciseId,
            exerciseId: ex.id,
            name: ex.name,
            category: ex.category,
            muscleGroup: ex.muscleGroup ?? null,
            usesWeight: ex.usesWeight ?? true,
            usesReps: ex.usesReps ?? true,
            sets: [
              {
                setNumber: 1,
                repsCompleted: "",
                weightKg: "",
                isDone: false,
              },
            ],
            collapsed: false,
          },
        ]
      )
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Failed to add exercise")
    }
  }

  // ── Set management ──────────────────────────────────────────────────────
  const updateSet = (
    weId: string,
    setIndex: number,
    patch: Partial<LiveSet>
  ) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.workoutExerciseId === weId
          ? {
              ...ex,
              sets: ex.sets.map((s, i) =>
                i === setIndex ? { ...s, ...patch } : s
              ),
            }
          : ex
      )
    )
  }

  const handleLogSet = async (weId: string, setIndex: number) => {
    if (!handle) return
    const exercise = exercises.find((e) => e.workoutExerciseId === weId)
    if (!exercise) return
    const set = exercise.sets[setIndex]
    if (!set || set.isDone) return

    setLogError(null)

    const repsParsed = set.repsCompleted ? parseInt(set.repsCompleted, 10) : NaN
    const weightParsed = set.weightKg ? parseFloat(set.weightKg) : NaN
    const reps = Number.isFinite(repsParsed) ? repsParsed : null
    const weight = Number.isFinite(weightParsed) ? weightParsed : null

    // Optimistically mark done
    updateSet(weId, setIndex, { isDone: true })

    try {
      await logExerciseSet({
        sessionId: handle.sessionId,
        workoutExerciseId: weId,
        setNumber: set.setNumber,
        repsCompleted: reps,
        weightKgUsed: weight,
      })

      // Auto-add the next empty set row
      setExercises((prev) =>
        prev.map((ex) =>
          ex.workoutExerciseId === weId
            ? {
                ...ex,
                sets: [
                  ...ex.sets,
                  {
                    setNumber: ex.sets.length + 1,
                    repsCompleted: set.repsCompleted, // prefill from last set
                    weightKg: set.weightKg,
                    isDone: false,
                  },
                ],
              }
            : ex
        )
      )
    } catch (err) {
      updateSet(weId, setIndex, { isDone: false })
      setLogError(err instanceof Error ? err.message : "Failed to log set")
    }
  }

  const toggleCollapse = (weId: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.workoutExerciseId === weId
          ? { ...ex, collapsed: !ex.collapsed }
          : ex
      )
    )
  }

  // ── End session ─────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!handle || !startedAt) return
    setCompleting(true)
    setLogError(null)

    try {
      // Tidy up: set actual set counts on each workout_exercise
      const setCounts: Record<string, number> = {}
      for (const ex of exercises) {
        setCounts[ex.workoutExerciseId] = ex.sets.filter((s) => s.isDone).length
      }
      await finalizeLiveWorkout(handle.workoutId, setCounts)

      await completeWorkoutSession({
        sessionId: handle.sessionId,
        scheduledWorkoutId: handle.scheduledWorkoutId,
        durationSeconds: Math.floor(
          (Date.now() - startedAt.getTime()) / 1000
        ),
      })
      setCompleted(true)
    } catch (err) {
      setLogError(
        err instanceof Error ? err.message : "Failed to complete session"
      )
    } finally {
      setCompleting(false)
    }
  }

  const totalSetsLogged = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.isDone).length,
    0
  )

  // ── Render: loading / error ─────────────────────────────────────────────
  if (startError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-destructive">
          Failed to start session: {startError}
        </p>
        <CTAButton onClick={onExit} className="mt-6">
          Back
        </CTAButton>
      </div>
    )
  }

  if (!handle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── Render: completed ───────────────────────────────────────────────────
  if (completed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/20">
          <Trophy className="h-12 w-12 text-primary" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase text-foreground">
          Session Complete!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Great session with {clientName}
        </p>

        <div className="mt-8 grid w-full max-w-xs grid-cols-3 gap-4">
          <div className="rounded-xl bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Duration</p>
          </div>
          <div className="rounded-xl bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
              {exercises.length}
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
          Done
        </CTAButton>
      </div>
    )
  }

  // ── Render: active session ──────────────────────────────────────────────

  // Filter exercise picker
  const filteredExercises = exerciseLibrary.filter(
    (ex) =>
      ex.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      ex.category.toLowerCase().includes(pickerSearch.toLowerCase())
  )
  const byCategory = filteredExercises.reduce<
    Record<string, typeof filteredExercises>
  >((acc, ex) => {
    const cat = ex.category || "Other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ex)
    return acc
  }, {})

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <button
          onClick={onExit}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
          aria-label="Exit session"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase text-foreground">
            Live Session
          </h1>
          <p className="text-[10px] text-muted-foreground">
            {clientName} · {formatTime(elapsedSeconds)} ·{" "}
            {exercises.length} exercises · {totalSetsLogged} sets
          </p>
        </div>
        <div className="h-9 w-9" />
      </header>

      {/* Exercise list */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {exercises.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <Dumbbell className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-muted-foreground">No exercises yet</p>
            <p className="text-sm text-muted-foreground/70">
              Tap the button below to add the first exercise
            </p>
          </div>
        )}

        {exercises.map((exercise) => {
          const doneSets = exercise.sets.filter((s) => s.isDone)
          // The last set that's not done (the "active" one)
          const activeSetIndex = exercise.sets.findIndex((s) => !s.isDone)

          return (
            <div
              key={exercise.workoutExerciseId}
              className="rounded-2xl bg-card overflow-hidden"
            >
              {/* Exercise header — always visible, tap to expand/collapse */}
              <button
                onClick={() => toggleCollapse(exercise.workoutExerciseId)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {exercise.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {exercise.category}
                    {doneSets.length > 0 &&
                      ` · ${doneSets.length} set${doneSets.length !== 1 ? "s" : ""} logged`}
                  </p>
                </div>
                {exercise.collapsed ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Set logging — visible when expanded */}
              {!exercise.collapsed && (
                <div className="px-4 pb-4 space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-semibold uppercase text-muted-foreground">
                    <div className="col-span-2">Set</div>
                    {exercise.usesReps && (
                      <div className="col-span-4">Reps</div>
                    )}
                    {exercise.usesWeight && (
                      <div className="col-span-4">Weight (kg)</div>
                    )}
                    <div
                      className={cn(
                        "col-span-2 text-right",
                        !exercise.usesReps &&
                          !exercise.usesWeight &&
                          "col-span-10"
                      )}
                    >
                      Done
                    </div>
                  </div>

                  {exercise.sets.map((set, i) => (
                    <div
                      key={set.setNumber}
                      className={cn(
                        "grid grid-cols-12 items-center gap-2 rounded-xl px-2 py-2 transition-colors",
                        set.isDone ? "bg-emerald-500/10" : "bg-secondary"
                      )}
                    >
                      <div className="col-span-2 text-sm font-bold text-foreground">
                        {set.setNumber}
                      </div>
                      {exercise.usesReps && (
                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.repsCompleted}
                          onChange={(e) =>
                            updateSet(
                              exercise.workoutExerciseId,
                              i,
                              {
                                repsCompleted: e.target.value,
                                isDone: false,
                              }
                            )
                          }
                          disabled={set.isDone}
                          placeholder="reps"
                          className="col-span-4 h-9 rounded-lg bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground/40 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      )}
                      {exercise.usesWeight && (
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          value={set.weightKg}
                          onChange={(e) =>
                            updateSet(
                              exercise.workoutExerciseId,
                              i,
                              {
                                weightKg: e.target.value,
                                isDone: false,
                              }
                            )
                          }
                          disabled={set.isDone}
                          placeholder="kg"
                          className="col-span-4 h-9 rounded-lg bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground/40 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      )}
                      <div
                        className={cn(
                          "flex justify-end",
                          !exercise.usesReps && !exercise.usesWeight
                            ? "col-span-10"
                            : "col-span-2"
                        )}
                      >
                        <button
                          onClick={() =>
                            handleLogSet(exercise.workoutExerciseId, i)
                          }
                          disabled={set.isDone || !handle}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                            set.isDone
                              ? "bg-emerald-500 text-white"
                              : "bg-primary text-primary-foreground hover:brightness-110"
                          )}
                          aria-label={
                            set.isDone ? "Set logged" : "Mark set done"
                          }
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {logError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {logError}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPicker(true)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-semibold uppercase tracking-wide text-primary-foreground hover:brightness-110"
          >
            <Plus className="h-5 w-5" />
            Add Exercise
          </button>
          {exercises.length > 0 && (
            <button
              onClick={handleFinish}
              disabled={completing || totalSetsLogged === 0}
              className={cn(
                "flex h-12 items-center justify-center rounded-xl px-5 font-semibold uppercase tracking-wide transition-all",
                totalSetsLogged > 0 && !completing
                  ? "bg-emerald-600 text-white hover:brightness-110"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {completing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "End"
              )}
            </button>
          )}
        </div>
      </footer>

      {/* Exercise picker sheet */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex flex-col pb-20">
          <div
            className="flex-1 bg-background/60 backdrop-blur-sm"
            onClick={() => {
              setShowPicker(false)
              setPickerSearch("")
            }}
          />
          <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card shadow-2xl scrollbar-hide safe-area-pb">
            <div className="sticky top-0 z-10 bg-card px-4 pt-3 pb-3">
              <div className="flex justify-center pb-2">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                  autoFocus
                />
                {pickerSearch && (
                  <button onClick={() => setPickerSearch("")}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {exercisesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4 p-4">
                {Object.entries(byCategory)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([cat, exs]) => (
                    <div key={cat}>
                      <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        {cat}
                      </h3>
                      <div className="space-y-1">
                        {exs.map((exercise) => (
                          <button
                            key={exercise.id}
                            onClick={() => handleAddExercise(exercise)}
                            className="flex w-full items-center gap-3 rounded-lg bg-secondary/30 p-3 text-left transition-colors hover:bg-secondary"
                          >
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Dumbbell className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">
                                {exercise.name}
                              </p>
                              {exercise.muscleGroup && (
                                <p className="text-xs text-muted-foreground">
                                  {exercise.muscleGroup}
                                </p>
                              )}
                            </div>
                            <Plus className="h-5 w-5 text-primary" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                {filteredExercises.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No exercises found
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
