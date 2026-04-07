"use client"

// Dashboard screen - fitness app (v2)
import { useState, useMemo, useEffect, useRef } from "react"
import { Bell, Flame, Timer, Trophy, TrendingUp, Calendar, ChevronRight, Dumbbell, Clock, Play } from "lucide-react"
import { StatCard } from "@/components/fitness/stat-card"
import { WorkoutCalendar } from "@/components/fitness/workout-calendar"
import { useScheduledWorkouts } from "@/lib/hooks/use-scheduled-workouts"
import { useProgressData } from "@/lib/hooks/use-progress-data"
import { useDevUser } from "@/lib/dev-user"
import { cn } from "@/lib/utils"


interface DashboardScreenProps {
  onNavigateToWorkouts?: () => void
  onStartScheduledWorkout?: (scheduledId: string, title: string) => void
}

export function DashboardScreen({ onNavigateToWorkouts, onStartScheduledWorkout }: DashboardScreenProps) {
  // v3 — no ProgrammeCard, uses nextWorkout
  const [showCalendar, setShowCalendar] = useState(false)
  const [activityTab, setActivityTab] = useState<"upcoming" | "recent">("upcoming")

  // Real data from Supabase, scoped to the current dev user.
  const { data: scheduledWorkoutsRaw, error: scheduleError } = useScheduledWorkouts()
// Headline-stats data and current user, both for the dashboard tiles.
  const { user } = useDevUser()
  const { data: progressData } = useProgressData()
  // Normalize the DB's 4 statuses down to the 3 the calendar component understands.
  // TODO: align WorkoutCalendar's status type with the DB enum.
  const scheduledWorkouts = useMemo(
    () =>
      scheduledWorkoutsRaw.map((w) => ({
        ...w,
        status: (w.status === "skipped" ? "missed" : w.status) as
          | "scheduled"
          | "completed"
          | "missed",
      })),
    [scheduledWorkoutsRaw]
  )

  // Get upcoming scheduled workouts (next 7 days)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  
  const upcomingWorkouts = scheduledWorkouts
    .filter(w => w.status === "scheduled" && w.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  const nextWorkout = scheduledWorkouts
    .filter(w => w.status === "scheduled" && w.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
// Most recently completed workouts. We use the scheduled_date here
  // (not the actual session completed_at) — the gap is normally 0-1 day
  // for an active client and avoids an extra query. Sort newest first.
  const recentCompletedWorkouts = scheduledWorkouts
    .filter(w => w.status === "completed")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
  // Derived display values for the four stat tiles. All read from
  // useProgressData, which is null on first load and for non-client roles.
  const statsThisWeek = progressData?.sessionsThisWeek ?? 0
  const statsStreak = progressData?.currentStreakWeeks ?? 0
  const statsTimeTrained = formatTrainingTime(progressData?.secondsTrainedThisWeek ?? 0)
  const statsVolume = formatVolumeKg(progressData?.volumeLoadThisWeekKg ?? 0)

  // Greet the user by their first name, falling back to display name.
  const firstName = user.displayName.split(" ")[0]
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00")
    const daysDiff = Math.ceil((date.getTime() - new Date(todayStr + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff === 0) return "Today"
    if (daysDiff === 1) return "Tomorrow"
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Good morning</p>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-foreground">
              {firstName}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="h-10 w-10 overflow-hidden rounded-full bg-secondary">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {scheduleError && (
        <div className="mx-6 mt-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Failed to load schedule: {scheduleError}
        </div>
      )}

      {/* Quick Stats */}
      <StatCard
            label="This Week"
            value={String(statsThisWeek)}
            subtext="workouts"
            icon={Flame}
          />
          <StatCard
            label="Streak"
            value={String(statsStreak)}
            subtext={statsStreak === 1 ? "week" : "weeks"}
            icon={Trophy}
          />
          <StatCard
            label="Time Trained"
            value={statsTimeTrained}
            subtext="this week"
            icon={Timer}
          />
          <StatCard
            label="Volume"
            value={statsVolume}
            subtext="this week"
            icon={TrendingUp}
          />

      {/* Next Workout CTA */}
      <section className="px-6 pb-2 pt-4">
        {nextWorkout ? (
          <button
            onClick={() => onStartScheduledWorkout?.(nextWorkout.id, nextWorkout.title)}
            className="group w-full overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-all hover:ring-primary/50"
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary">
                <Play className="ml-1 h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {nextWorkout.date === todayStr ? "Start Now" : `Up Next — ${formatDate(nextWorkout.date)}`}
                </p>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                  {nextWorkout.title}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {nextWorkout.duration}
                  </span>
                  <span>{nextWorkout.category}</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="h-0.5 bg-secondary">
              <div className="h-full w-1/3 bg-primary transition-all group-hover:w-1/2" />
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Dumbbell className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">No workouts scheduled</p>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">Rest Day</h3>
              <p className="text-sm text-muted-foreground">Your coach will schedule your next session</p>
            </div>
          </div>
        )}
      </section>

      {/* Activity Panel - Upcoming/Recent Toggle */}
      <section className="py-4">
        <div className="flex items-center justify-between px-6">
          {/* Toggle */}
          <div className="flex rounded-lg bg-secondary p-1">
            <button
              onClick={() => setActivityTab("upcoming")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activityTab === "upcoming"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActivityTab("recent")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activityTab === "recent"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Recent
            </button>
          </div>
          <button 
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
        </div>
        
        <div className="mt-4 space-y-3 px-6">
          {activityTab === "upcoming" ? (
            upcomingWorkouts.length > 0 ? (
              upcomingWorkouts.map((workout) => (
                <button
                  key={workout.id}
                  onClick={() => onStartScheduledWorkout?.(workout.id, workout.title)}
                  className="flex w-full items-center gap-4 rounded-xl bg-card p-4 text-left transition-colors hover:bg-secondary"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Dumbbell className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        workout.date === todayStr 
                          ? "bg-primary/20 text-primary" 
                          : "bg-secondary text-muted-foreground"
                      )}>
                        {formatDate(workout.date)}
                      </span>
                    </div>
                    <h4 className="mt-1 font-semibold text-foreground">{workout.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {workout.category} · {workout.duration}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No upcoming workouts scheduled</p>
                <p className="text-xs text-muted-foreground">Your coach will assign workouts to your calendar</p>
              </div>
            )
          ) : recentCompletedWorkouts.length > 0 ? (
            recentCompletedWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="flex w-full items-center gap-4 rounded-xl bg-card p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Flame className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-foreground">{workout.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(workout.date)} · {workout.duration}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <Flame className="h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No completed workouts yet</p>
              <p className="text-xs text-muted-foreground">Finish a session to see it here</p>
            </div>
          )}
        </div>
      </section>

      {/* Calendar Modal */}
      {showCalendar && (
        <CalendarModal
          scheduledWorkouts={scheduledWorkouts}
          onClose={() => setShowCalendar(false)}
        />
      )}

    </div>
  )
}
// ─── Stat formatting helpers ────────────────────────────────────────────

function formatTrainingTime(seconds: number): string {
  if (seconds <= 0) return "0m"
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function formatVolumeKg(kg: number): string {
  if (kg <= 0) return "0kg"
  // Round to nearest kg, format with thousands separator
  return `${Math.round(kg).toLocaleString()}kg`
}
// Bottom-sheet modal hosting the calendar in client view.
// Extracted into its own component so it can own its scroll-target ref
// and body-scroll-lock effect cleanly.
function CalendarModal({
  scheduledWorkouts,
  onClose,
}: {
  scheduledWorkouts: Array<{
    id: string
    workoutId: string
    title: string
    category: string
    duration: string
    date: string
    status: "scheduled" | "completed" | "missed"
  }>
  onClose: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while the modal is open. Without this, finger swipes
  // inside the modal propagate to the page behind on mobile, which feels
  // broken — the page scrolls instead of the modal.
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  // When the user taps a date, the WorkoutCalendar renders a "selected date
  // details" section below the calendar grid. On mobile that section is
  // often below the fold of the bottom sheet, with no visual cue that
  // anything happened. We watch for taps on day cells and scroll the sheet
  // to the bottom so the detail panel is brought into view.
  const handleDayTap = () => {
    // Defer until after the calendar has re-rendered with the selected date
    requestAnimationFrame(() => {
      sheetRef.current?.scrollTo({
        top: sheetRef.current.scrollHeight,
        behavior: "smooth",
      })
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div
        className="flex-1 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-card shadow-xl"
      >
        <div className="sticky top-0 z-10 bg-card">
          <div className="flex justify-center pt-3">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                My Schedule
              </h3>
              <p className="text-xs text-muted-foreground">Tap a date to see details</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4 rotate-90" />
            </button>
          </div>
        </div>
        {/* onClick on the wrapper catches all taps inside the calendar grid;
            it's intentionally permissive — scrolling on a non-day tap is
            harmless and beats trying to wire a callback through the
            WorkoutCalendar component just for this.
            TODO: when the WorkoutCalendar gets refactored, expose an
            onDateSelect callback so we can scroll on day taps only and
            not when navigating months. */}
        <div className="pb-8" onClick={handleDayTap}>
          <WorkoutCalendar
            scheduledWorkouts={scheduledWorkouts}
            readOnly
          />
        </div>
      </div>
    </div>
  )
}
