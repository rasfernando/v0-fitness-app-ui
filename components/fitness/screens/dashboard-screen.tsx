"use client"

// Dashboard screen - fitness app (v2)
import { useState } from "react"
import { Bell, Flame, Timer, Trophy, TrendingUp, Calendar, ChevronRight, Dumbbell, Clock, Play } from "lucide-react"
import { WorkoutCard } from "@/components/fitness/workout-card"
import { StatCard } from "@/components/fitness/stat-card"
import { FilterChips } from "@/components/fitness/filter-chips"
import { WorkoutCalendar } from "@/components/fitness/workout-calendar"
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

// Scheduled workouts from PT
const scheduledWorkouts = [
  { id: "sw1", workoutId: "w1", title: "Full Body Burn", category: "Strength", duration: "45 min", date: "2026-04-03", status: "scheduled" as const },
  { id: "sw2", workoutId: "w2", title: "HIIT Cardio Blast", category: "Cardio", duration: "30 min", date: "2026-04-05", status: "scheduled" as const },
  { id: "sw3", workoutId: "w3", title: "Core Crusher", category: "Core", duration: "20 min", date: "2026-04-01", status: "completed" as const },
  { id: "sw4", workoutId: "w4", title: "Upper Body Power", category: "Strength", duration: "40 min", date: "2026-04-07", status: "scheduled" as const },
  { id: "sw5", workoutId: "w5", title: "Leg Day Destroyer", category: "Strength", duration: "50 min", date: "2026-04-02", status: "completed" as const },
  { id: "sw6", workoutId: "w6", title: "Morning Mobility", category: "Recovery", duration: "15 min", date: "2026-04-09", status: "scheduled" as const },
]

const recentActivity = [
  { name: "Leg Day Destroyer", date: "Today", duration: "52 min" },
  { name: "Morning Cardio", date: "Yesterday", duration: "30 min" },
  { name: "Full Body Strength", date: "Mar 24", duration: "48 min" },
]

interface DashboardScreenProps {
  onNavigateToWorkouts?: () => void
}

export function DashboardScreen({ onNavigateToWorkouts }: DashboardScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showCalendar, setShowCalendar] = useState(false)
  const [activityTab, setActivityTab] = useState<"upcoming" | "recent">("upcoming")

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

  const todayWorkout = scheduledWorkouts.find(w => w.date === todayStr && w.status === "scheduled")

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

      {/* Today's Scheduled Workout - Priority CTA */}
      {todayWorkout && (
        <section className="px-6 py-4">
          <div className="overflow-hidden rounded-xl bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 ring-1 ring-primary/30">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Today&apos;s Workout
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold uppercase text-foreground">
                    {todayWorkout.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {todayWorkout.duration}
                    </span>
                    <span>{todayWorkout.category}</span>
                  </div>
                </div>
                <button className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105">
                  <Play className="h-6 w-6 ml-1" />
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Scheduled by Coach Marcus
              </p>
            </div>
          </div>
        </section>
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

      {/* Continue Program Banner */}
      <section className="px-6 py-4">
        <button className="w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent">
          <div className="flex items-center gap-4 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary">
              <Dumbbell className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                Stay Active
              </p>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                Consistency is Key
              </h3>
              <p className="text-sm text-muted-foreground">Keep your momentum going strong</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="h-1 bg-secondary">
            <div className="h-full w-[33%] rounded-full bg-primary" />
          </div>
        </button>
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
