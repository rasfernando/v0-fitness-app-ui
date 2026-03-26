"use client"

import { useState } from "react"
import { Bell, Flame, Timer, Trophy, TrendingUp, Calendar, ChevronRight } from "lucide-react"
import { WorkoutCard } from "@/components/fitness/workout-card"
import { ProgrammeCard } from "@/components/fitness/programme-card"
import { StatCard } from "@/components/fitness/stat-card"
import { FilterChips } from "@/components/fitness/filter-chips"
import { BottomNav } from "@/components/fitness/bottom-nav"

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

const recentActivity = [
  { name: "Leg Day Destroyer", date: "Today", duration: "52 min" },
  { name: "Morning Cardio", date: "Yesterday", duration: "30 min" },
  { name: "Full Body Strength", date: "Mar 24", duration: "48 min" },
]

export function DashboardScreen() {
  const [activeTab, setActiveTab] = useState("home")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const filteredWorkouts = selectedCategory === "All" 
    ? featuredWorkouts 
    : featuredWorkouts.filter(w => w.category === selectedCategory)

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

      {/* Continue Program Banner */}
      <section className="px-6 py-4">
        <button className="w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent">
          <div className="flex items-center gap-4 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary">
              <Calendar className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                Week 4 of 12
              </p>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                12-Week Shred
              </h3>
              <p className="text-sm text-muted-foreground">Day 3: Upper Body Push</p>
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
          <button className="text-sm font-medium text-primary">View All</button>
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
            Featured Plans
          </h2>
          <button className="text-sm font-medium text-primary">View All</button>
        </div>
        
        <div className="mt-4 space-y-4">
          <ProgrammeCard
            title="Lean Muscle Builder"
            description="Progressive hypertrophy program designed for maximum muscle growth with optimal recovery."
            weeks={10}
            workoutsPerWeek={5}
            imageUrl="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80"
            tag="New"
          />
        </div>
      </section>

      {/* Recent Activity */}
      <section className="px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
            Recent Activity
          </h2>
          <button className="text-sm font-medium text-primary">View All</button>
        </div>
        
        <div className="mt-4 space-y-3">
          {recentActivity.map((activity, index) => (
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
                  {activity.date} • {activity.duration}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
