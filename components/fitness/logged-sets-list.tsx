"use client"

import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkoutSession } from "@/lib/hooks/use-workout-session"

interface LoggedSetsListProps {
  scheduledWorkoutId: string
}

// Renders the per-exercise breakdown of what was prescribed vs what the
// client actually logged. Lazy-loads its own data via useWorkoutSession,
// so the parent only needs to render this component when the user expands
// a completed workout.
export function LoggedSetsList({ scheduledWorkoutId }: LoggedSetsListProps) {
  const { data, loading, error } = useWorkoutSession(scheduledWorkoutId)

  if (loading) {
    return (
      <div className="mt-3 px-2 py-3 text-xs text-muted-foreground">
        Loading session…
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        Failed to load session: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mt-3 px-2 py-3 text-xs text-muted-foreground italic">
        No session data — this workout is marked complete but has no logged sets.
      </div>
    )
  }

  const totalLogged = data.exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.isLogged).length,
    0
  )
  const totalPrescribed = data.exercises.reduce(
    (sum, e) => sum + e.prescribedSets,
    0
  )

  const durationLabel = data.durationSeconds
    ? `${Math.floor(data.durationSeconds / 60)}:${String(data.durationSeconds % 60).padStart(2, "0")}`
    : null

  return (
    <div className="mt-3 space-y-3">
      {/* Session summary header */}
      <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-[11px] text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{totalLogged}</span>
          <span className="opacity-60"> / {totalPrescribed} sets logged</span>
        </span>
        {durationLabel && (
          <span>
            Duration: <span className="font-semibold text-foreground">{durationLabel}</span>
          </span>
        )}
      </div>

      {/* Per-exercise breakdown */}
      {data.exercises.map((ex) => (
        <div key={ex.workoutExerciseId} className="rounded-lg bg-secondary/30 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
            {ex.exerciseName}
          </p>
          <div className="mt-1.5 space-y-1">
            {ex.sets.map((s) => (
              <SetRow key={s.setNumber} set={s} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SetRow({
  set,
}: {
  set: {
    setNumber: number
    prescription: string
    prescribedWeightKg: number | null
    actualReps: number | null
    actualWeightKg: number | null
    isLogged: boolean
  }
}) {
  // Build prescribed and actual labels for inline diff display
  const prescribedLabel = `${set.prescription}${
    set.prescribedWeightKg !== null ? ` @ ${set.prescribedWeightKg}kg` : ""
  }`

  const actualLabel = set.isLogged
    ? `${set.actualReps ?? "—"}${
        set.actualWeightKg !== null ? ` @ ${set.actualWeightKg}kg` : ""
      }`
    : null

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-5 shrink-0 text-muted-foreground">#{set.setNumber}</span>
      <span className="text-muted-foreground">{prescribedLabel}</span>
      <span className="text-muted-foreground opacity-50">→</span>
      {actualLabel ? (
        <>
          <span className="font-medium text-foreground">{actualLabel}</span>
          <Check className="ml-auto h-3 w-3 shrink-0 text-emerald-400" />
        </>
      ) : (
        <>
          <span className="italic text-muted-foreground/60">not logged</span>
          <Minus className={cn("ml-auto h-3 w-3 shrink-0 text-muted-foreground/40")} />
        </>
      )}
    </div>
  )
}
