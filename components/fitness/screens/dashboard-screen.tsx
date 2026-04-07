"use client"

// Dashboard screen - fitness app (v2)
import { useState, useMemo } from "react"
import { Bell, Flame, Timer, Trophy, TrendingUp, Calendar, ChevronRight, Dumbbell, Clock, Play } from "lucide-react"
import { WorkoutCard } from "@/components/fitness/workout-card"
import { StatCard } from "@/components/fitness/stat-card"
import { FilterChips } from "@/components/fitness/filter-chips"
import { WorkoutCalendar } from "@/components/fitness/workout-calendar"
import { useScheduledWorkouts } from "@/lib/hooks/use-scheduled-workouts"
import { cn } from "@/lib/utils"

const workoutCategories = ["All", "Strength", "HIIT", "Cardio", "Mobility"]

const featuredWorkouts = [
  {
    title: "Upper Body Power",
    category: "Strength",
    duration: "45 min",
    calories: "380 cal",
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=500&auto=format&fit=crop&q=80",
    difficulty: "Intermediate" as const,
  },
  {
    title: "HIIT Burn",
    category: "HIIT",
    duration: "30 min",
    calories: "450 cal",
    imageUrl: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=500&auto=format&fit=crop&q=80",
    difficulty: "Advanced" as const,
  },
  {
    title: "Core Crusher",
    category: "Strength",
    duration: "20 min",
    calories: "200 cal",
    imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&auto=format&fit=crop&q=80",
    difficulty: "Beginner" as const,
  },
]

// scheduledWorkouts is now loaded from Supabase via useScheduledWorkouts() — see below.

const recentActivity = [
  { name: "Leg Day Destroyer", date: "Today", duration: "52 min" },
  { name: "Morning Cardio", date: "Yesterday", duration: "30 min" },
  { name: "Full Body Strength", date: "Mar 24", duration: "48 min" },
]

interface DashboardScreenProps {
  onNavigateToWorkouts?: () => void
}

export function DashboardScreen({ onNavigateToWorkouts }: DashboardScreenProps) {
  // v3 — no ProgrammeCard, uses nextWorkout
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showCalendar, setShowCalendar] = useState(false)
  const [activityTab, setActivityTab] = useState<"upcoming" | "recent">("upcoming")

  // Real data from Supabase, scoped to the current dev user.
  const { data: scheduledWorkoutsRaw, error: scheduleError } = useScheduledWorkouts()

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

  const filteredWorkouts = selectedCategory === "All" 
    ? featuredWorkouts 
    : featuredWorkouts.filter(w => w.category === selectedCategory)

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
              Sarah
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
      <section className="px-6 py-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="This Week"
            value="4"
            subtext="workouts"
            icon={Flame}
            trend={{ value: "12%", positive: true }}
          />
          <StatCard
            label="Streak"
            value="12"
            subtext="days"
            icon={Trophy}
          />
          <StatCard
            label="Time Trained"
            value="3.5h"
            subtext="this week"
            icon={Timer}
          />
          <StatCard
            label="Calories"
            value="2,840"
            subtext="burned"
            icon={TrendingUp}
            trend={{ value: "8%", positive: true }}
          />
        </div>
      </section>

      {/* Next Workout CTA */}
      <section className="px-6 pb-2 pt-4">
        {nextWorkout ? (
          <button className="group w-full overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-all hover:ring-primary/50">
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
          ) : (
            recentActivity.map((activity, index) => (
              <button
                key={index}
                className="flex w-full items-center gap-4 rounded-xl bg-card p-4 transition-colors hover:bg-secondary"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-foreground">{activity.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {activity.date} · {activity.duration}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </section>

      {/* Featured Workouts */}
      <section className="py-4">
        <div className="flex items-center justify-between px-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
            Featured Workouts
          </h2>
          <button onClick={onNavigateToWorkouts} className="text-sm font-medium text-primary">View All</button>
        </div>
        
        <div className="mt-3 px-6">
          <FilterChips
            options={workoutCategories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
        
        <div className="mt-4 flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
          {filteredWorkouts.map((workout, index) => (
            <WorkoutCard
              key={index}
              {...workout}
              className="w-[280px] shrink-0"
            />
          ))}
        </div>
      </section>

      {/* Featured Plans */}
      <section className="px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
            Browse Workouts
          </h2>
          <button className="text-sm font-medium text-primary">View All</button>
        </div>
        
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-4 rounded-xl bg-card p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Beginner-Friendly Workouts</h4>
              <p className="text-sm text-muted-foreground">Start your fitness journey</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </section>



      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div
            className="flex-1 bg-background/60 backdrop-blur-sm"
            onClick={() => setShowCalendar(false)}
          />
          <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card shadow-xl">
            <div className="sticky top-0 z-10 bg-card">
              <div className="flex justify-center pt-3">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-5 pb-2 pt-4">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                    My Schedule
                  </h3>
                  <p className="text-xs text-muted-foreground">Workouts from Coach Marcus</p>
                </div>
                <button
                  onClick={() => setShowCalendar(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </button>
              </div>
            </div>
            <div className="pb-8">
              <WorkoutCalendar
                scheduledWorkouts={scheduledWorkouts}
                readOnly
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
