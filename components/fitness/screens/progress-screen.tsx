"use client"

import { useState } from "react"
import { Trophy, TrendingUp, Flame, Dumbbell, ChevronDown, ChevronUp } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { cn } from "@/lib/utils"
import { useProgressData } from "@/lib/hooks/use-progress-data"
import { LoggedSetsList } from "@/components/fitness/logged-sets-list"

export function ProgressScreen() {
  const { data, loading, error } = useProgressData()
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 pb-24">
        <p className="text-sm text-muted-foreground">Loading your progress…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="text-sm text-destructive">Failed to load progress: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="text-sm text-muted-foreground">No data available.</p>
      </div>
    )
  }

  const hasData = data.totalSessionsCompleted > 0

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="px-6 py-4">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            Progress
          </h1>
          <p className="text-sm text-muted-foreground">Your training over time</p>
        </div>
      </header>

      {!hasData ? (
        <EmptyProgressState />
      ) : (
        <>
          {/* Headline stats */}
          <section className="px-6 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                icon={<Dumbbell className="h-4 w-4" />}
                label="Total Workouts"
                value={String(data.totalSessionsCompleted)}
                accent="primary"
              />
              <StatTile
                icon={<Flame className="h-4 w-4" />}
                label="Week Streak"
                value={String(data.currentStreakWeeks)}
                accent="orange"
              />
              <StatTile
                icon={<TrendingUp className="h-4 w-4" />}
                label="This Week"
                value={String(data.sessionsThisWeek)}
                accent="primary"
              />
              <StatTile
                icon={<Trophy className="h-4 w-4" />}
                label="Sets Logged"
                value={String(data.totalSetsLogged)}
                accent="emerald"
              />
            </div>
          </section>

          {/* Strength trend */}
          <section className="px-6 pt-6">
            <div className="rounded-2xl bg-card p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase text-foreground">
                    Strength Trend
                  </h2>
                  {data.mainLiftName ? (
                    <p className="text-xs text-muted-foreground">
                      {data.mainLiftName} · estimated 1RM (kg)
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Not enough data yet
                    </p>
                  )}
                </div>
                {data.mainLiftHistory.length >= 2 && (
                  <TrendBadge history={data.mainLiftHistory} />
                )}
              </div>

              {data.mainLiftHistory.length >= 2 ? (
                <div className="mt-4 h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.mainLiftHistory}
                      margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(d: string) => {
                          const dt = new Date(d + "T00:00:00")
                          return `${dt.getMonth() + 1}/${dt.getDate()}`
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        domain={["dataMin - 5", "dataMax + 5"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                          fontSize: "0.75rem",
                        }}
                        labelFormatter={(d: string) => {
                          const dt = new Date(d + "T00:00:00")
                          return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        }}
                        formatter={(value: number, _name: string, item: { payload?: { topSetWeight?: number; topSetReps?: number } }) => {
                          const top = item.payload
                          return [
                            `${value}kg (top set: ${top?.topSetWeight}kg × ${top?.topSetReps})`,
                            "Est. 1RM",
                          ]
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="estimatedOneRepMax"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-4 flex h-32 items-center justify-center rounded-xl bg-secondary/50">
                  <p className="text-center text-xs text-muted-foreground">
                    Log the same exercise across at least 2 workouts<br />
                    to see your strength trend.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Recent activity */}
          <section className="px-6 pt-6">
            <h2 className="mb-2 font-[family-name:var(--font-display)] text-sm font-bold uppercase text-foreground">
              Recent Workouts
            </h2>
            <div className="space-y-2">
              {data.recentSessions.map((session) => {
                const isExpanded = expandedSessionId === session.scheduledWorkoutId
                return (
                  <div key={session.sessionId} className="rounded-xl bg-card">
                    <button
                      onClick={() =>
                        setExpandedSessionId(isExpanded ? null : session.scheduledWorkoutId)
                      }
                      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/50 rounded-xl"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                        <Dumbbell className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-sm text-foreground">
                          {session.workoutTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDate(session.completedAt)} · {session.category}
                          {session.durationSeconds &&
                            ` · ${Math.floor(session.durationSeconds / 60)} min`}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border/50 px-3 pb-3">
                        <LoggedSetsList scheduledWorkoutId={session.scheduledWorkoutId} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: "primary" | "orange" | "emerald"
}) {
  const accentClass = {
    primary: "bg-primary/10 text-primary",
    orange: "bg-orange-500/10 text-orange-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
  }[accent]

  return (
    <div className="rounded-xl bg-card p-3">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accentClass)}>
        {icon}
      </div>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

function TrendBadge({ history }: { history: { estimatedOneRepMax: number }[] }) {
  // Compare last point to first
  const first = history[0].estimatedOneRepMax
  const last = history[history.length - 1].estimatedOneRepMax
  const diff = last - first
  const pct = first > 0 ? (diff / first) * 100 : 0
  const sign = diff >= 0 ? "+" : ""
  const isUp = diff >= 0

  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
        isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
      )}
    >
      {sign}
      {pct.toFixed(0)}%
    </span>
  )
}

function EmptyProgressState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <TrendingUp className="h-8 w-8 text-primary" />
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-foreground">
        No progress yet
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Complete a workout from your dashboard and your progress will start showing up here.
      </p>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
