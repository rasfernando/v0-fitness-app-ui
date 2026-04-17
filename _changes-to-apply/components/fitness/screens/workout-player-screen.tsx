"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { X, Check, ChevronLeft, ChevronRight, ChevronDown, Trophy, Dumbbell, Info, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { CTAButton } from "../cta-button"
import { useAuth } from "@/lib/auth"
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

// In-memory representation of one logged set.
interface LoggedSet {
  setNumber: number
  repsCompleted: string
  weightKg: string
  isDone: boolean
}

// A "block" groups exercises that share a superset_group.
// Standalone exercises (null group) each get their own block.
interface Block {
  label: string | null         // "A", "B", "C" or null for standalone
  exercises: PrescribedExercise[]
  rounds: number               // number of rounds (taken from the exercises' sets field)
}

// Build blocks from a flat exercise list, ordered by position.
function buildBlocks(exercises: PrescribedExercise[]): Block[] {
  const blocks: Block[] = []
  let currentGroup: string | null | undefined = undefined
  let currentBlock: PrescribedExercise[] = []

  for (const ex of exercises) {
    if (ex.supersetGroup) {
      if (ex.supersetGroup === currentGroup) {
        currentBlock.push(ex)
      } else {
        // Flush previous block
        if (currentBlock.length > 0) {
          blocks.push({
            label: currentGroup ?? null,
            exercises: currentBlock,
            rounds: currentGroup ? currentBlock[0].sets : currentBlock[0].sets,
          })
        }
        currentGroup = ex.supersetGroup
        currentBlock = [ex]
      }
    } else {
      // Standalone exercise — flush any open superset block first
      if (currentBlock.length > 0) {
        blocks.push({
          label: currentGroup ?? null,
          exercises: currentBlock,
          rounds: currentGroup ? currentBlock[0].sets : currentBlock[0].sets,
        })
        currentBlock = []
        currentGroup = undefined
      }
      // Each standalone exercise is its own block
      blocks.push({
        label: null,
        exercises: [ex],
        rounds: ex.sets,
      })
    }
  }
  // Flush final block
  if (currentBlock.length > 0) {
    blocks.push({
      label: currentGroup ?? null,
      exercises: currentBlock,
      rounds: currentGroup ? currentBlock[0].sets : currentBlock[0].sets,
    })
  }

  return blocks
}

// Build the initial set state for an exercise.
function buildInitialSets(exercise: PrescribedExercise): LoggedSet[] {
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
  const { user } = useAuth()
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

  // Navigation state: block → round → exercise-within-block
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [currentRound, setCurrentRound] = useState(0) // 0-based
  const [currentExInBlock, setCurrentExInBlock] = useState(0)

  const [logError, setLogError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showExerciseInfo, setShowExerciseInfo] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const loggingRef = useRef(false) // prevents double-tap on log set

  // Build the block structure from exercises
  const blocks = useMemo(() => {
    if (!detail) return []
    return buildBlocks(detail.exercises)
  }, [detail])

  // ── Session lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    if (!detail || !user || sessionId || sessionStartingRef.current || completed) return
    sessionStartingRef.current = true
    setSessionStartError(null)
    startWorkoutSession({
      scheduledWorkoutId: detail.scheduledId,
      clientId: user.id,
    })
      .then((id) => {
        setSessionId(id)
        setSessionStartedAt(new Date())
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
  }, [detail, sessionId, completed, user?.id])

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

  // ── Current exercise derivation ─────────────────────────────────────────
  const currentBlock: Block | undefined = blocks[currentBlockIndex]
  const currentExercise: PrescribedExercise | undefined = currentBlock?.exercises[currentExInBlock]
  const isSuperset = currentBlock ? currentBlock.exercises.length > 1 : false

  // For a superset, current set = current round. For standalone, show all sets.
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
    if (loggingRef.current) return // prevent double-tap
    const set = currentSets[setIndex]
    if (!set || set.isDone) return // already done

    loggingRef.current = true
    setLogError(null)

    const repsParsed = set.repsCompleted ? parseInt(set.repsCompleted, 10) : NaN
    const weightParsed = set.weightKg ? parseFloat(set.weightKg) : NaN
    const reps = Number.isFinite(repsParsed) ? repsParsed : null
    const weight = Number.isFinite(weightParsed) ? weightParsed : null

    // Optimistically mark done
    updateSet(currentExercise.workoutExerciseId, setIndex, { isDone: true })

    try {
      await logExerciseSet({
        sessionId,
        workoutExerciseId: currentExercise.workoutExerciseId,
        setNumber: set.setNumber,
        repsCompleted: reps,
        weightKgUsed: weight,
        prescribedReps: currentExercise.prescription,
        prescribedWeightKg: currentExercise.weightKg,
      })
    } catch (err) {
      updateSet(currentExercise.workoutExerciseId, setIndex, { isDone: false })
      setLogError(err instanceof Error ? err.message : "Failed to log set")
    } finally {
      loggingRef.current = false
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  // Is the current step complete?
  // For supersets: current round's set is done for current exercise.
  // If the exercise has fewer sets than the block's round count, treat it
  // as already done for rounds beyond its range (no work to do).
  // For standalone: all sets done
  const hasNoSetThisRound = isSuperset && currentRound >= currentSets.length

  const isCurrentStepDone = useMemo(() => {
    if (!currentExercise) return false
    if (isSuperset) {
      if (currentRound >= currentSets.length) return true // no set this round — auto-skip
      return currentSets[currentRound]?.isDone === true
    } else {
      return currentSets.length > 0 && currentSets.every((s) => s.isDone)
    }
  }, [currentExercise, currentSets, currentRound, isSuperset])

  // Is this the very last step?
  const isLastStep = useMemo(() => {
    if (!currentBlock || blocks.length === 0) return false
    const isLastBlock = currentBlockIndex === blocks.length - 1
    const isLastRound = currentRound === currentBlock.rounds - 1
    const isLastExInBlock = currentExInBlock === currentBlock.exercises.length - 1
    if (isSuperset) {
      return isLastBlock && isLastRound && isLastExInBlock
    } else {
      return isLastBlock
    }
  }, [blocks, currentBlockIndex, currentRound, currentExInBlock, currentBlock, isSuperset])

  // All exercises complete across the entire workout
  const allExercisesComplete = useMemo(() => {
    if (!detail) return false
    return detail.exercises.every((ex) => {
      const sets = loggedByExerciseId[ex.workoutExerciseId] ?? []
      return sets.length > 0 && sets.every((s) => s.isDone)
    })
  }, [detail, loggedByExerciseId])

  const handleNext = () => {
    if (!currentBlock) return
    setShowExerciseInfo(false)

    if (isSuperset) {
      // Within a superset: advance exercise → round → block
      if (currentExInBlock < currentBlock.exercises.length - 1) {
        // Next exercise in the circuit
        setCurrentExInBlock((i) => i + 1)
      } else if (currentRound < currentBlock.rounds - 1) {
        // Done with this round, start next round of the circuit
        setCurrentExInBlock(0)
        setCurrentRound((r) => r + 1)
      } else {
        // Done with this block entirely, move to next block
        setCurrentBlockIndex((b) => b + 1)
        setCurrentRound(0)
        setCurrentExInBlock(0)
      }
    } else {
      // Standalone exercise: just move to next block
      setCurrentBlockIndex((b) => b + 1)
      setCurrentRound(0)
      setCurrentExInBlock(0)
    }
  }

  const handlePrev = () => {
    setShowExerciseInfo(false)

    if (isSuperset) {
      if (currentExInBlock > 0) {
        setCurrentExInBlock((i) => i - 1)
      } else if (currentRound > 0) {
        const prevBlock = blocks[currentBlockIndex]
        setCurrentRound((r) => r - 1)
        setCurrentExInBlock(prevBlock.exercises.length - 1)
      } else if (currentBlockIndex > 0) {
        const prevBlock = blocks[currentBlockIndex - 1]
        setCurrentBlockIndex((b) => b - 1)
        if (prevBlock.exercises.length > 1) {
          // Previous block is a superset
          setCurrentRound(prevBlock.rounds - 1)
          setCurrentExInBlock(prevBlock.exercises.length - 1)
        } else {
          setCurrentRound(0)
          setCurrentExInBlock(0)
        }
      }
    } else {
      if (currentBlockIndex > 0) {
        const prevBlock = blocks[currentBlockIndex - 1]
        setCurrentBlockIndex((b) => b - 1)
        if (prevBlock.exercises.length > 1) {
          setCurrentRound(prevBlock.rounds - 1)
          setCurrentExInBlock(prevBlock.exercises.length - 1)
        } else {
          setCurrentRound(0)
          setCurrentExInBlock(0)
        }
      }
    }
  }

  const canGoPrev = currentBlockIndex > 0 || currentRound > 0 || currentExInBlock > 0

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

  if (!currentExercise || !currentBlock) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">No exercises in this workout.</p>
      </div>
    )
  }

  // Compute overall progress: how many total "steps" done vs total
  const totalSteps = blocks.reduce(
    (sum, b) => sum + (b.exercises.length > 1 ? b.rounds * b.exercises.length : b.rounds),
    0
  )
  // Count completed steps
  let completedSteps = 0
  for (const block of blocks) {
    for (const ex of block.exercises) {
      const sets = loggedByExerciseId[ex.workoutExerciseId] ?? []
      completedSteps += sets.filter((s) => s.isDone).length
    }
  }

  const progressLabel = isSuperset
    ? `Block ${currentBlock.label} · Round ${currentRound + 1}/${currentBlock.rounds} · Exercise ${currentExInBlock + 1}/${currentBlock.exercises.length}`
    : `Exercise ${currentBlockIndex + 1}/${blocks.length}`

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
          aria-label="Exit workout"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase text-foreground">
            {workoutTitle}
          </h1>
          <p className="text-[10px] text-muted-foreground">{formatTime(elapsedSeconds)} · {completedSteps}/{totalSteps} sets</p>
        </div>
        <div className="h-9 w-9" />
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
        />
      </div>

      {/* Exercise card */}
      <div className="flex-1 px-4 py-4">
        {/* Superset block indicator */}
        {isSuperset && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1">
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary uppercase">
                Superset {currentBlock.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Round {currentRound + 1} of {currentBlock.rounds}
            </span>
            {/* Dots showing exercises in the circuit */}
            <div className="ml-auto flex gap-1">
              {currentBlock.exercises.map((ex, i) => (
                <div
                  key={ex.workoutExerciseId}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    i === currentExInBlock
                      ? "bg-primary"
                      : (loggedByExerciseId[ex.workoutExerciseId] ?? [])[currentRound]?.isDone
                        ? "bg-emerald-500"
                        : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>
        )}

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
                {isSuperset
                  ? `${currentExercise.prescription}${currentExercise.weightKg !== null ? ` · ${currentExercise.weightKg}kg` : ""} · Rest ${currentExercise.restSeconds}s`
                  : `${currentExercise.sets} × ${currentExercise.prescription}${currentExercise.weightKg !== null ? ` · ${currentExercise.weightKg}kg` : ""} · Rest ${currentExercise.restSeconds}s`
                }
              </p>
              {currentExercise.notes && (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  Note: {currentExercise.notes}
                </p>
              )}
            </div>
          </div>

          {/* Exercise info — collapsible "How to" panel */}
          {(currentExercise.description || currentExercise.videoUrl) && (
            <div className="mt-4">
              <button
                onClick={() => setShowExerciseInfo((v) => !v)}
                className="flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1">How to perform this exercise</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    showExerciseInfo && "rotate-180"
                  )}
                />
              </button>
              {showExerciseInfo && (
                <div className="mt-2 space-y-3 rounded-xl bg-secondary/50 px-3 py-3">
                  {currentExercise.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                      {currentExercise.description}
                    </p>
                  )}
                  {currentExercise.videoUrl && (
                    <div className="overflow-hidden rounded-lg">
                      {currentExercise.videoUrl.includes("youtube.com") ||
                       currentExercise.videoUrl.includes("youtu.be") ? (
                        <iframe
                          src={currentExercise.videoUrl
                            .replace("watch?v=", "embed/")
                            .replace("youtu.be/", "youtube.com/embed/")}
                          title={`${currentExercise.name} demo`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="aspect-video w-full"
                        />
                      ) : (
                        <video
                          src={currentExercise.videoUrl}
                          controls
                          playsInline
                          className="aspect-video w-full"
                        >
                          Your browser does not support video playback.
                        </video>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sets grid */}
          <div className="mt-5 space-y-2">
            {isSuperset && hasNoSetThisRound ? (
              /* ── This exercise has fewer sets than the block's round count ── */
              <div className="flex flex-col items-center justify-center rounded-xl bg-secondary/50 py-8 text-center">
                <Check className="mb-2 h-6 w-6 text-emerald-500" />
                <p className="text-sm font-medium text-foreground">
                  All {currentSets.length} sets complete
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tap next to continue
                </p>
              </div>
            ) : isSuperset ? (
              /* ── Superset mode: show only the current round's set ──── */
              <>
                <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-semibold uppercase text-muted-foreground">
                  <div className="col-span-2">Set</div>
                  {currentExercise.usesReps && <div className="col-span-4">Reps</div>}
                  {currentExercise.usesWeight && <div className="col-span-4">Weight (kg)</div>}
                  <div className={cn("col-span-2 text-right", !currentExercise.usesReps && !currentExercise.usesWeight && "col-span-10")}>Done</div>
                </div>
                {(() => {
                  const set = currentSets[currentRound]
                  if (!set) return null
                  const i = currentRound
                  return (
                    <div
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
                  )
                })()}

                {/* Previous rounds summary for this exercise */}
                {currentRound > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="px-2 text-[10px] font-semibold uppercase text-muted-foreground/60">Previous rounds</p>
                    {currentSets.slice(0, currentRound).map((set, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 items-center gap-2 rounded-lg px-2 py-1 opacity-50"
                      >
                        <div className="col-span-2 text-xs text-muted-foreground">{set.setNumber}</div>
                        {currentExercise.usesReps && (
                          <div className="col-span-4 text-xs text-muted-foreground">{set.repsCompleted || "—"}</div>
                        )}
                        {currentExercise.usesWeight && (
                          <div className="col-span-4 text-xs text-muted-foreground">{set.weightKg || "—"} kg</div>
                        )}
                        <div className={cn("flex justify-end", !currentExercise.usesReps && !currentExercise.usesWeight ? "col-span-10" : "col-span-2")}>
                          {set.isDone && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ── Standalone mode: show all sets (original behavior) ── */
              <>
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
              </>
            )}
          </div>

          {logError && (
            <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {logError}
            </div>
          )}
        </div>

        {/* Block progress label */}
        <p className="mt-3 text-center text-xs text-muted-foreground">{progressLabel}</p>
      </div>

      {/* Footer nav */}
      <footer className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground disabled:opacity-40"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {!isLastStep ? (
            <button
              onClick={handleNext}
              disabled={!isCurrentStepDone}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-xl font-semibold uppercase tracking-wide transition-all",
                isCurrentStepDone
                  ? "bg-primary text-primary-foreground hover:brightness-110"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {isSuperset && currentExInBlock < currentBlock.exercises.length - 1
                ? "Next exercise"
                : isSuperset && currentRound < currentBlock.rounds - 1
                  ? "Next round"
                  : "Next block"}
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

      {/* Exit confirmation dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
              Exit workout?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your logged sets will be saved, but the session won&apos;t be marked as complete.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground"
              >
                Keep going
              </button>
              <button
                onClick={onExit}
                className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
