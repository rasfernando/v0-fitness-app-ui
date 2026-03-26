"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, X, Clock, Flame, Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"
import { FilterChips } from "../filter-chips"

interface Workout {
  id: string
  title: string
  category: string
  duration: string
  calories: string
  imageUrl: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  exercises: number
  equipment: string[]
}

const workouts: Workout[] = [
  {
    id: "1",
    title: "Full Body Burn",
    category: "Strength",
    duration: "45 min",
    calories: "450 cal",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",
    difficulty: "Intermediate",
    exercises: 12,
    equipment: ["Dumbbells", "Bench"],
  },
  {
    id: "2",
    title: "HIIT Cardio Blast",
    category: "Cardio",
    duration: "30 min",
    calories: "380 cal",
    imageUrl: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=600&q=80",
    difficulty: "Advanced",
    exercises: 8,
    equipment: ["None"],
  },
  {
    id: "3",
    title: "Core Crusher",
    category: "Core",
    duration: "20 min",
    calories: "180 cal",
    imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80",
    difficulty: "Beginner",
    exercises: 10,
    equipment: ["Mat"],
  },
  {
    id: "4",
    title: "Upper Body Power",
    category: "Strength",
    duration: "40 min",
    calories: "320 cal",
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=600&q=80",
    difficulty: "Intermediate",
    exercises: 10,
    equipment: ["Dumbbells", "Pull-up Bar"],
  },
  {
    id: "5",
    title: "Leg Day Destroyer",
    category: "Strength",
    duration: "50 min",
    calories: "520 cal",
    imageUrl: "https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=600&q=80",
    difficulty: "Advanced",
    exercises: 14,
    equipment: ["Barbell", "Squat Rack"],
  },
  {
    id: "6",
    title: "Morning Mobility",
    category: "Recovery",
    duration: "15 min",
    calories: "80 cal",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80",
    difficulty: "Beginner",
    exercises: 8,
    equipment: ["Mat"],
  },
  {
    id: "7",
    title: "Kettlebell Flow",
    category: "Strength",
    duration: "35 min",
    calories: "400 cal",
    imageUrl: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=600&q=80",
    difficulty: "Intermediate",
    exercises: 9,
    equipment: ["Kettlebell"],
  },
  {
    id: "8",
    title: "Boxing Basics",
    category: "Cardio",
    duration: "25 min",
    calories: "300 cal",
    imageUrl: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&q=80",
    difficulty: "Beginner",
    exercises: 6,
    equipment: ["Boxing Gloves"],
  },
]

const categories = ["All", "Strength", "Cardio", "Core", "Recovery"]
const difficulties = ["All Levels", "Beginner", "Intermediate", "Advanced"]

interface WorkoutLibraryScreenProps {
  onSelectWorkout: (workout: Workout) => void
}

export function WorkoutLibraryScreen({ onSelectWorkout }: WorkoutLibraryScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedDifficulty, setSelectedDifficulty] = useState("All Levels")
  const [showFilters, setShowFilters] = useState(false)

  const filteredWorkouts = workouts.filter((workout) => {
    const matchesSearch = workout.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || workout.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === "All Levels" || workout.difficulty === selectedDifficulty
    return matchesSearch && matchesCategory && matchesDifficulty
  })

  const difficultyColor = {
    Beginner: "bg-emerald-500/20 text-emerald-400",
    Intermediate: "bg-primary/20 text-primary",
    Advanced: "bg-red-500/20 text-red-400",
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 px-4 pb-4 pt-6 backdrop-blur-sm">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight text-foreground">
          Workout Library
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filteredWorkouts.length} workouts available
        </p>

        {/* Search Bar */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl bg-secondary pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
              showFilters ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="mt-4">
          <FilterChips
            options={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 rounded-xl bg-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Difficulty Level
            </p>
            <FilterChips
              options={difficulties}
              selected={selectedDifficulty}
              onSelect={setSelectedDifficulty}
            />
          </div>
        )}
      </div>

      {/* Workout Grid */}
      <div className="flex-1 px-4">
        <div className="grid grid-cols-1 gap-4">
          {filteredWorkouts.map((workout) => (
            <button
              key={workout.id}
              onClick={() => onSelectWorkout(workout)}
              className="group flex gap-4 rounded-xl bg-card p-3 text-left transition-all hover:ring-2 hover:ring-primary/50"
            >
              {/* Thumbnail */}
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                <img
                  src={workout.imageUrl}
                  alt={workout.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <span className={cn(
                  "absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                  difficultyColor[workout.difficulty]
                )}>
                  {workout.difficulty}
                </span>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col justify-between py-1">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">
                    {workout.category}
                  </p>
                  <h3 className="mt-0.5 font-[family-name:var(--font-display)] text-base font-semibold uppercase leading-tight text-foreground">
                    {workout.title}
                  </h3>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {workout.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    {workout.calories}
                  </span>
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {workout.exercises}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredWorkouts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase text-foreground">
              No Workouts Found
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export type { Workout }
