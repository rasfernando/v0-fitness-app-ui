"use client"

import { ArrowLeft, Clock, Flame, Dumbbell, Play, Heart, Share2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CTAButton } from "../cta-button"

interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  restSeconds: number
  imageUrl: string
  muscleGroup: string
}

interface WorkoutDetailProps {
  workout: {
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
  onBack: () => void
  onStartWorkout: () => void
}

const exerciseData: Exercise[] = [
  {
    id: "1",
    name: "Barbell Squats",
    sets: 4,
    reps: "8-10",
    restSeconds: 90,
    imageUrl: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=300&q=80",
    muscleGroup: "Legs",
  },
  {
    id: "2",
    name: "Dumbbell Lunges",
    sets: 3,
    reps: "12 each",
    restSeconds: 60,
    imageUrl: "https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=300&q=80",
    muscleGroup: "Legs",
  },
  {
    id: "3",
    name: "Bench Press",
    sets: 4,
    reps: "8-10",
    restSeconds: 90,
    imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&q=80",
    muscleGroup: "Chest",
  },
  {
    id: "4",
    name: "Bent Over Rows",
    sets: 4,
    reps: "10-12",
    restSeconds: 75,
    imageUrl: "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=300&q=80",
    muscleGroup: "Back",
  },
  {
    id: "5",
    name: "Shoulder Press",
    sets: 3,
    reps: "10-12",
    restSeconds: 60,
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=300&q=80",
    muscleGroup: "Shoulders",
  },
  {
    id: "6",
    name: "Plank Hold",
    sets: 3,
    reps: "45 sec",
    restSeconds: 30,
    imageUrl: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=300&q=80",
    muscleGroup: "Core",
  },
]

const difficultyColor = {
  Beginner: "bg-emerald-500/20 text-emerald-400",
  Intermediate: "bg-primary/20 text-primary",
  Advanced: "bg-red-500/20 text-red-400",
}

export function WorkoutDetailScreen({ workout, onBack, onStartWorkout }: WorkoutDetailProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Image */}
      <div className="relative h-72">
        <img
          src={workout.imageUrl}
          alt={workout.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {/* Navigation */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background">
              <Heart className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className={cn(
            "inline-block rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
            difficultyColor[workout.difficulty]
          )}>
            {workout.difficulty}
          </span>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold uppercase leading-tight text-foreground">
            {workout.title}
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-wider text-primary">
            {workout.category}
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-around border-b border-border bg-card py-4">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold">{workout.duration}</span>
          </div>
          <span className="mt-0.5 text-xs text-muted-foreground">Duration</span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <Flame className="h-5 w-5 text-orange-400" />
            <span className="font-semibold">{workout.calories}</span>
          </div>
          <span className="mt-0.5 text-xs text-muted-foreground">Calories</span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="font-semibold">{workout.exercises}</span>
          </div>
          <span className="mt-0.5 text-xs text-muted-foreground">Exercises</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        {/* Description */}
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase text-foreground">
            About This Workout
          </h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            This high-intensity workout targets multiple muscle groups for maximum calorie burn and strength gains. 
            Perfect for athletes looking to build functional strength and endurance.
          </p>
        </div>

        {/* Equipment */}
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase text-foreground">
            Equipment Needed
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {workout.equipment.map((item) => (
              <span
                key={item}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Exercise List */}
        <div className="mb-24">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase text-foreground">
            Exercises ({exerciseData.length})
          </h2>
          <div className="mt-4 space-y-3">
            {exerciseData.map((exercise, index) => (
              <div
                key={exercise.id}
                className="flex items-center gap-4 rounded-xl bg-card p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-foreground">
                  {index + 1}
                </div>
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{exercise.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {exercise.sets} sets x {exercise.reps}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-muted-foreground/30" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-border bg-background/95 p-4 backdrop-blur-sm safe-area-pb">
        <CTAButton onClick={onStartWorkout} className="w-full">
          <Play className="mr-2 h-5 w-5" />
          Start Workout
        </CTAButton>
      </div>
    </div>
  )
}

export { exerciseData }
export type { Exercise }
