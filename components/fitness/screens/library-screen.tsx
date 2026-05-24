"use client"

import { useMemo, useState } from "react"
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Clock,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { useWorkouts } from "@/lib/hooks/use-workouts"
import { useWorkoutDetail } from "@/lib/hooks/use-workout-detail"
import { scheduleWorkout } from "@/lib/mutations/scheduling"
import { softDeleteWorkout } from "@/lib/mutations/workouts"
import { invalidate } from "@/lib/data-invalidation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LibraryScreenProps {
  onBack: () => void
}

export function LibraryScreen({ onBack }: LibraryScreenProps) {
  const { data: allWorkouts, loading, error, refetch } = useWorkouts()

  // Only the user's own — global system templates aren't shown here.
  // Filter on isGlobal=false (set by the seed; user-created rows default to false).
  const myWorkouts = useMemo(
    () => allWorkouts.filter((w) => !w.isGlobal),
    [allWorkouts]
  )

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-lg">
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground leading-tight">
            Your Library
          </h1>
          <p className="text-xs text-muted-foreground">
            Workouts you (or your coach) built
          </p>
        </div>
      </header>

      <div className="px-4 py-4">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load library: {error}
          </div>
        )}

        {!loading && !error && myWorkouts.length === 0 && (
          <EmptyState />
        )}

        {!loading && myWorkouts.length > 0 && (
          <ul className="space-y-3">
            {myWorkouts.map((w) => (
              <LibraryWorkoutCard
                key={w.id}
                workoutId={w.id}
                title={w.title}
                category={w.category}
                difficulty={w.difficulty}
                exerciseCount={w.exercises}
                duration={w.duration}
                onMutated={() => refetch()}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold uppercase text-foreground">
        Library's empty
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Ask your coach to build a workout for you — say something like
        &ldquo;Build me a 30-minute upper body session.&rdquo;
      </p>
    </div>
  )
}

// ─── Per-workout card (expandable, with actions) ────────────────────────────

interface LibraryWorkoutCardProps {
  workoutId: string
  title: string
  category: string
  difficulty: string
  exerciseCount: number
  duration: string
  onMutated: () => void
}

function LibraryWorkoutCard({
  workoutId,
  title,
  category,
  difficulty,
  exerciseCount,
  duration,
  onMutated,
}: LibraryWorkoutCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [busy, setBusy] = useState<"schedule" | "delete" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Lazy-load the detail only when the card is expanded.
  const { data: detail, loading: detailLoading } = useWorkoutDetail(
    expanded ? workoutId : null
  )

  const { user } = useAuth()

  const handleSchedule = async (dateStr: string) => {
    if (!user) return
    setBusy("schedule")
    setActionError(null)
    try {
      await scheduleWorkout({
        userId: user.id,
        workoutId,
        scheduledDate: dateStr,
      })
      invalidate("scheduled_workouts")
      setShowSchedule(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't schedule")
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    setBusy("delete")
    setActionError(null)
    try {
      await softDeleteWorkout(workoutId)
      invalidate("user_workouts")
      invalidate("scheduled_workouts") // in case it was on the calendar
      setShowDeleteConfirm(false)
      onMutated()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't delete")
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/30"
        aria-expanded={expanded}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Dumbbell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-foreground">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{category}</span>
            <span>·</span>
            <span className="capitalize">{difficulty}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border/60 px-4 pt-3 pb-4">
          {detailLoading && (
            <div className="flex justify-center py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!detailLoading && detail && detail.exercises.length > 0 && (
            <ul className="space-y-2">
              {detail.exercises.map((ex) => (
                <li
                  key={ex.workoutExerciseId}
                  className="flex items-baseline justify-between gap-2 rounded-lg bg-secondary/40 px-3 py-2"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {ex.name}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {ex.sets} × {ex.prescription}
                    {ex.weightKg !== null && (
                      <span className="ml-1 text-primary">@ {ex.weightKg}kg</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {/* Action error */}
          {actionError && (
            <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {actionError}
            </div>
          )}

          {/* Inline date picker */}
          {showSchedule ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pick a date
              </p>
              <DateChooser
                disabled={busy !== null}
                onPick={handleSchedule}
                onCancel={() => setShowSchedule(false)}
              />
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowSchedule(true)}
                disabled={busy !== null}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all",
                  busy !== null
                    ? "opacity-60"
                    : "hover:brightness-110"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                Schedule
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={busy !== null}
                aria-label="Delete workout"
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors",
                  busy !== null
                    ? "opacity-60"
                    : "hover:bg-destructive/20 hover:text-destructive"
                )}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              The workout will be removed from your library. Any past sessions
              and logged sets stay intact — only the template is hidden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "delete"}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy === "delete"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy === "delete" ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

// ─── Lightweight date chooser ───────────────────────────────────────────────
// Avoid pulling in react-day-picker for a 14-day horizontal list — keeps the
// bundle small and the UX explicit.

function DateChooser({
  disabled,
  onPick,
  onCancel,
}: {
  disabled?: boolean
  onPick: (yyyyMmDd: string) => void
  onCancel: () => void
}) {
  // Build next 14 days starting today, local time.
  const days = useMemo(() => {
    const result: Array<{ key: string; label: string; sub: string }> = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const yyyyMmDd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const label =
        i === 0
          ? "Today"
          : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-GB", { weekday: "short" })
      const sub = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      result.push({ key: yyyyMmDd, label, sub })
    }
    return result
  }, [])

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [-webkit-overflow-scrolling:touch]">
        {days.map((d) => (
          <button
            key={d.key}
            onClick={() => onPick(d.key)}
            disabled={disabled}
            className={cn(
              "flex min-w-[64px] shrink-0 flex-col items-center rounded-xl border border-border bg-secondary px-3 py-2 text-center transition-colors",
              disabled
                ? "opacity-60"
                : "hover:border-primary hover:bg-primary/10"
            )}
          >
            <span className="text-xs font-semibold uppercase text-foreground">
              {d.label}
            </span>
            <span className="text-[10px] text-muted-foreground">{d.sub}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        disabled={disabled}
        className="mt-2 w-full rounded-lg py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancel
      </button>
    </>
  )
}
