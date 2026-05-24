"use client"

import { Sparkles } from "lucide-react"
import { Avatar } from "@/components/fitness/avatar"
import { useAuth } from "@/lib/auth"
import {
  EXPERIENCE_LABELS,
  PRIMARY_AIM_LABELS,
  EQUIPMENT_LABELS,
} from "@/lib/coach/goals-types"

interface ProfileScreenProps {
  onSignOut: () => void
  /** Navigate to the Coach with a prefilled prompt asking to update goals. */
  onUpdateGoalsWithCoach: () => void
}

export function ProfileScreen({
  onSignOut,
  onUpdateGoalsWithCoach,
}: ProfileScreenProps) {
  const { user } = useAuth()
  if (!user) return null

  const goals = user.goals
  const hasAnyGoal =
    !!goals.experience ||
    !!goals.primary_aim ||
    !!goals.frequency_per_week ||
    !!goals.equipment ||
    !!goals.session_minutes ||
    !!goals.notes

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="flex flex-col items-center px-6 pt-10 pb-6 text-center">
        <Avatar
          name={user.displayName}
          id={user.id}
          size="h-20 w-20"
          className="mb-4 ring-2 ring-primary text-2xl"
        />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {user.displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">@{user.username}</p>
      </header>

      {/* Your goals — read-only card with a "chat to update" affordance */}
      <section className="px-6">
        <div className="rounded-2xl bg-card ring-1 ring-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Your goals
              </h2>
            </div>
            <button
              onClick={onUpdateGoalsWithCoach}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Update with coach
            </button>
          </div>

          {hasAnyGoal ? (
            <dl className="divide-y divide-border/60">
              {goals.primary_aim && (
                <GoalRow
                  label="Aim"
                  value={PRIMARY_AIM_LABELS[goals.primary_aim]}
                />
              )}
              {goals.experience && (
                <GoalRow
                  label="Experience"
                  value={EXPERIENCE_LABELS[goals.experience]}
                />
              )}
              {goals.frequency_per_week && (
                <GoalRow
                  label="Frequency"
                  value={`${goals.frequency_per_week} ${
                    goals.frequency_per_week === 1
                      ? "session"
                      : "sessions"
                  } per week`}
                />
              )}
              {goals.equipment && (
                <GoalRow
                  label="Equipment"
                  value={EQUIPMENT_LABELS[goals.equipment]}
                />
              )}
              {goals.session_minutes && (
                <GoalRow
                  label="Session length"
                  value={`~${goals.session_minutes} minutes`}
                />
              )}
              {goals.notes && <GoalRow label="Notes" value={goals.notes} />}
            </dl>
          ) : (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-foreground">
                You haven't set any goals yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap &ldquo;Update with coach&rdquo; above to set them.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Sign out — quiet, separate from the profile content */}
      <div className="mt-10 flex flex-col items-center px-6">
        <button
          onClick={onSignOut}
          className="rounded-xl bg-secondary px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

function GoalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  )
}
