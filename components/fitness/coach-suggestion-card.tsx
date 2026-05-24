"use client"

import { useState } from "react"
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCoachSuggestion } from "@/lib/hooks/use-coach-suggestion"

interface CoachSuggestionCardProps {
  /** The scheduled workout to suggest for. null = render nothing. */
  scheduledWorkoutId: string | null
  /** Human-readable title of the workout, shown in the header. */
  workoutTitle?: string
}

export function CoachSuggestionCard({
  scheduledWorkoutId,
  workoutTitle,
}: CoachSuggestionCardProps) {
  const { suggestion, loading, error, regenerate, fromCache } =
    useCoachSuggestion(scheduledWorkoutId)
  const [expanded, setExpanded] = useState(true)

  if (!scheduledWorkoutId) return null

  // Loading skeleton — shown only on a cold fetch with no cached payload to render.
  if (loading && !suggestion) {
    return (
      <div className="mx-6 mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Coach is thinking…
          </p>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-primary/10" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-primary/10" />
        </div>
      </div>
    )
  }

  if (error && !suggestion) {
    return (
      <div className="mx-6 mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-destructive mb-1">
              Coach unavailable
            </p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={regenerate}
            className="flex h-7 items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!suggestion) return null

  return (
    <div className="mx-6 mb-4 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Coach's plan
              {workoutTitle && (
                <span className="ml-1 normal-case font-normal text-muted-foreground">
                  · {workoutTitle}
                </span>
              )}
            </p>
            {expanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
            )}
          </div>
          <p className="mt-1 text-sm leading-snug text-foreground">
            {suggestion.summary}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-primary/15 px-4 pt-3 pb-4">
          <ul className="space-y-3">
            {suggestion.exercises.map((ex) => (
              <li key={ex.workoutExerciseId} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {ex.exerciseName}
                  </p>
                  <p className="shrink-0 text-sm font-medium text-primary tabular-nums">
                    {ex.suggestedSets} × {ex.suggestedReps}
                    {ex.suggestedWeightKg !== null && (
                      <span className="ml-1">@ {ex.suggestedWeightKg}kg</span>
                    )}
                  </p>
                </div>
                <p className="text-xs leading-snug text-muted-foreground">
                  {ex.reasoning}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-primary/15 pt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {fromCache ? "From cache" : "Generated just now"}
            </p>
            <button
              onClick={regenerate}
              disabled={loading}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
                loading
                  ? "bg-secondary text-muted-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              {loading ? "Thinking…" : "Regenerate"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
