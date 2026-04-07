"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Play, Pause, SkipForward, SkipBack, RotateCcw, ChevronUp, ChevronDown, CheckCircle2, Trophy } from "lucide-react"
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

interface WorkoutPlayerScreenProps {
  workoutTitle: string
  exercises: Exercise[]
  onExit: () => void
  onComplete: () => void
}

type Phase = "exercise" | "rest" | "complete"

export function WorkoutPlayerScreen({
  workoutTitle,
  exercises,
  onExit,
  onComplete,
}: WorkoutPlayerScreenProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [phase, setPhase] = useState<Phase>("exercise")
  const [isPlaying, setIsPlaying] = useState(true)
  const [restTimer, setRestTimer] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showExerciseList, setShowExerciseList] = useState(false)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())

  const currentExercise = exercises[currentExerciseIndex]
  const totalExercises = exercises.length
  const progress = ((currentExerciseIndex + (currentSet - 1) / currentExercise.sets) / totalExercises) * 100

  // Elapsed time counter
  useEffect(() => {
    if (!isPlaying || phase === "complete") return
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, phase])

  // Rest timer countdown
  useEffect(() => {
    if (phase !== "rest" || !isPlaying) return
    if (restTimer <= 0) {
      setPhase("exercise")
      return
    }
    const interval = setInterval(() => {
      setRestTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, restTimer, isPlaying])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleCompleteSet = useCallback(() => {
    if (currentSet < currentExercise.sets) {
      // More sets remaining - start rest timer
      setCurrentSet((prev) => prev + 1)
      setRestTimer(currentExercise.restSeconds)
      setPhase("rest")
    } else {
      // All sets complete - move to next exercise
      setCompletedExercises((prev) => new Set([...prev, currentExercise.id]))
      
      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex((prev) => prev + 1)
        setCurrentSet(1)
        setRestTimer(90) // Transition rest
        setPhase("rest")
      } else {
        // Workout complete
        setPhase("complete")
      }
    }
  }, [currentSet, currentExercise, currentExerciseIndex, totalExercises])

  const handleSkipRest = () => {
    setRestTimer(0)
    setPhase("exercise")
  }

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1)
      setCurrentSet(1)
      setPhase("exercise")
    }
  }

  const handleNextExercise = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCompletedExercises((prev) => new Set([...prev, currentExercise.id]))
      setCurrentExerciseIndex((prev) => prev + 1)
      setCurrentSet(1)
      setPhase("exercise")
    }
  }

  if (phase === "complete") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/20">
          <Trophy className="h-12 w-12 text-primary" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase text-foreground">
          Workout Complete!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Great work crushing {workoutTitle}
        </p>
        
        <div className="mt-8 grid w-full max-w-xs grid-cols-3 gap-4">
          <div className="rounded-xl bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
              {formatTime(elapsedTime)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Duration</p>
          </div>
          <div className="rounded-xl bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
              {totalExercises}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Exercises</p>
          </div>
          <div className="rounded-xl bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-primary">
              100%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Complete</p>
          </div>
        </div>

        <CTAButton onClick={onComplete} className="mt-10 w-full max-w-xs">
          Finish
        </CTAButton>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onExit}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {workoutTitle}
          </p>
          <p className="font-semibold text-foreground">{formatTime(elapsedTime)}</p>
        </div>
        <button
          onClick={() => setShowExerciseList(!showExerciseList)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          {showExerciseList ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Exercise {currentExerciseIndex + 1} of {totalExercises}
        </p>
      </div>

      {/* Exercise List Dropdown */}
      {showExerciseList && (
        <div className="mx-4 mt-4 max-h-48 overflow-y-auto rounded-xl bg-card p-3">
          {exercises.map((exercise, index) => (
            <button
              key={exercise.id}
              onClick={() => {
                setCurrentExerciseIndex(index)
                setCurrentSet(1)
                setPhase("exercise")
                setShowExerciseList(false)
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
                index === currentExerciseIndex ? "bg-primary/20" : "hover:bg-secondary"
              )}
            >
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                completedExercises.has(exercise.id) 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground"
              )}>
                {completedExercises.has(exercise.id) ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </span>
              <span className={cn(
                "text-sm",
                index === currentExerciseIndex ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                {exercise.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {phase === "rest" ? (
          // Rest Phase
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Rest Time
            </p>
            <div className="relative mt-6">
              <svg className="h-48 w-48 -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-secondary"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - restTimer / currentExercise.restSeconds)}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-[family-name:var(--font-display)] text-5xl font-bold text-foreground">
                  {restTimer}
                </span>
              </div>
            </div>
            <p className="mt-6 text-lg text-muted-foreground">
              Next: <span className="font-semibold text-foreground">{currentExercise.name}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Set {currentSet} of {currentExercise.sets}
            </p>
            <button
              onClick={handleSkipRest}
              className="mt-6 text-sm font-medium text-primary"
            >
              Skip Rest
            </button>
          </div>
        ) : (
          // Exercise Phase
          <div className="w-full text-center">
            <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl">
              <img
                src={currentExercise.imageUrl}
                alt={currentExercise.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase text-primary">
                  {currentExercise.muscleGroup}
                </span>
              </div>
            </div>
            
            <h2 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
              {currentExercise.name}
            </h2>
            
            <div className="mt-4 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground">
                  {currentSet}/{currentExercise.sets}
                </p>
                <p className="text-xs text-muted-foreground">Sets</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-primary">
                  {currentExercise.reps}
                </p>
                <p className="text-xs text-muted-foreground">Reps</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 safe-area-pb">
        {phase === "exercise" && (
          <CTAButton onClick={handleCompleteSet} className="mb-4 w-full">
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Complete Set
          </CTAButton>
        )}
        
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePreviousExercise}
            disabled={currentExerciseIndex === 0}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground disabled:opacity-30"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
          </button>
          
          <button
            onClick={handleNextExercise}
            disabled={currentExerciseIndex === totalExercises - 1}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground disabled:opacity-30"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
