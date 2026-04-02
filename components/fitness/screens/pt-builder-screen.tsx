"use client"

import { useState } from "react"
import { 
  Plus, 
  Dumbbell, 
  Calendar, 
  Clock, 
  Flame, 
  GripVertical,
  Trash2,
  ChevronRight,
  X,
  Check,
  Image as ImageIcon,
  Search
} from "lucide-react"
import { cn } from "@/lib/utils"

// Types
interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  weight?: string
  rest: string
  image?: string
  category?: string
}

interface CreatedWorkout {
  id: string
  title: string
  category: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  duration: number
  calories: number
  exercises: Exercise[]
  createdAt: Date
}

interface CreatedProgramme {
  id: string
  title: string
  description: string
  weeks: number
  frequency: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  workouts: string[]
  createdAt: Date
}

// Exercise library for selection
const exerciseLibrary = [
  { id: "ex1", name: "Barbell Squat", category: "Legs", image: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=100&q=80" },
  { id: "ex2", name: "Bench Press", category: "Chest", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=100&q=80" },
  { id: "ex3", name: "Deadlift", category: "Back", image: "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=100&q=80" },
  { id: "ex4", name: "Pull-ups", category: "Back", image: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=100&q=80" },
  { id: "ex5", name: "Shoulder Press", category: "Shoulders", image: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=100&q=80" },
  { id: "ex6", name: "Lunges", category: "Legs", image: "https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=100&q=80" },
  { id: "ex7", name: "Bicep Curls", category: "Arms", image: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=100&q=80" },
  { id: "ex8", name: "Tricep Dips", category: "Arms", image: "https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=100&q=80" },
  { id: "ex9", name: "Plank", category: "Core", image: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=100&q=80" },
  { id: "ex10", name: "Russian Twists", category: "Core", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&q=80" },
]

export function PTBuilderScreen() {
  const [activeTab, setActiveTab] = useState<"workouts" | "programmes">("workouts")
  const [showCreateWorkout, setShowCreateWorkout] = useState(false)
  const [showCreateProgramme, setShowCreateProgramme] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState("")
  
  // Created content
  const [createdWorkouts, setCreatedWorkouts] = useState<CreatedWorkout[]>([
    {
      id: "cw1",
      title: "Full Body Blast",
      category: "Full Body",
      difficulty: "Intermediate",
      duration: 45,
      calories: 400,
      exercises: [
        { id: "1", name: "Barbell Squat", sets: 4, reps: "8-10", weight: "60kg", rest: "90s", category: "Legs" },
        { id: "2", name: "Bench Press", sets: 4, reps: "8-10", weight: "40kg", rest: "90s", category: "Chest" },
        { id: "3", name: "Deadlift", sets: 3, reps: "6-8", weight: "80kg", rest: "120s", category: "Back" },
      ],
      createdAt: new Date()
    }
  ])
  
  const [createdProgrammes, setCreatedProgrammes] = useState<CreatedProgramme[]>([
    {
      id: "cp1",
      title: "12-Week Strength Builder",
      description: "Progressive overload program for building raw strength",
      weeks: 12,
      frequency: "4x per week",
      difficulty: "Advanced",
      workouts: ["cw1"],
      createdAt: new Date()
    }
  ])
  
  // New workout form state
  const [newWorkout, setNewWorkout] = useState<Partial<CreatedWorkout>>({
    title: "",
    category: "Full Body",
    difficulty: "Intermediate",
    duration: 30,
    calories: 250,
    exercises: []
  })
  
  // New programme form state
  const [newProgramme, setNewProgramme] = useState<Partial<CreatedProgramme>>({
    title: "",
    description: "",
    weeks: 8,
    frequency: "3x per week",
    difficulty: "Intermediate",
    workouts: []
  })

  const filteredExercises = exerciseLibrary.filter(ex => 
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.category.toLowerCase().includes(exerciseSearch.toLowerCase())
  )

  const handleAddExercise = (exercise: typeof exerciseLibrary[0]) => {
    const newExercise: Exercise = {
      id: `ex-${Date.now()}`,
      name: exercise.name,
      sets: 3,
      reps: "10",
      weight: "",
      rest: "60s",
      image: exercise.image,
      category: exercise.category
    }
    setNewWorkout(prev => ({
      ...prev,
      exercises: [...(prev.exercises || []), newExercise]
    }))
    setShowExercisePicker(false)
    setExerciseSearch("")
  }

  const handleRemoveExercise = (exerciseId: string) => {
    setNewWorkout(prev => ({
      ...prev,
      exercises: prev.exercises?.filter(e => e.id !== exerciseId) || []
    }))
  }

  const handleUpdateExercise = (exerciseId: string, field: keyof Exercise, value: string | number) => {
    setNewWorkout(prev => ({
      ...prev,
      exercises: prev.exercises?.map(e => 
        e.id === exerciseId ? { ...e, [field]: value } : e
      ) || []
    }))
  }

  const handleSaveWorkout = () => {
    if (!newWorkout.title || !newWorkout.exercises?.length) return
    
    const workout: CreatedWorkout = {
      id: `cw-${Date.now()}`,
      title: newWorkout.title,
      category: newWorkout.category || "Full Body",
      difficulty: newWorkout.difficulty || "Intermediate",
      duration: newWorkout.duration || 30,
      calories: newWorkout.calories || 250,
      exercises: newWorkout.exercises,
      createdAt: new Date()
    }
    
    setCreatedWorkouts(prev => [workout, ...prev])
    setNewWorkout({
      title: "",
      category: "Full Body",
      difficulty: "Intermediate",
      duration: 30,
      calories: 250,
      exercises: []
    })
    setShowCreateWorkout(false)
  }

  const handleSaveProgramme = () => {
    if (!newProgramme.title) return
    
    const programme: CreatedProgramme = {
      id: `cp-${Date.now()}`,
      title: newProgramme.title,
      description: newProgramme.description || "",
      weeks: newProgramme.weeks || 8,
      frequency: newProgramme.frequency || "3x per week",
      difficulty: newProgramme.difficulty || "Intermediate",
      workouts: newProgramme.workouts || [],
      createdAt: new Date()
    }
    
    setCreatedProgrammes(prev => [programme, ...prev])
    setNewProgramme({
      title: "",
      description: "",
      weeks: 8,
      frequency: "3x per week",
      difficulty: "Intermediate",
      workouts: []
    })
    setShowCreateProgramme(false)
  }

  const handleDeleteWorkout = (workoutId: string) => {
    setCreatedWorkouts(prev => prev.filter(w => w.id !== workoutId))
  }

  const handleDeleteProgramme = (programmeId: string) => {
    setCreatedProgrammes(prev => prev.filter(p => p.id !== programmeId))
  }

  const toggleWorkoutInProgramme = (workoutId: string) => {
    setNewProgramme(prev => {
      const current = prev.workouts || []
      if (current.includes(workoutId)) {
        return { ...prev, workouts: current.filter(id => id !== workoutId) }
      }
      return { ...prev, workouts: [...current, workoutId] }
    })
  }

  const difficultyColors = {
    Beginner: "bg-emerald-500/20 text-emerald-400",
    Intermediate: "bg-amber-500/20 text-amber-400",
    Advanced: "bg-rose-500/20 text-rose-400"
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pb-4 pt-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight text-foreground">
          Content Builder
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create workouts and programmes for your clients
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 pb-4">
        <div className="flex rounded-xl bg-secondary p-1">
          <button
            onClick={() => setActiveTab("workouts")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all",
              activeTab === "workouts"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Dumbbell className="mr-2 inline-block h-4 w-4" />
            Workouts
          </button>
          <button
            onClick={() => setActiveTab("programmes")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all",
              activeTab === "programmes"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="mr-2 inline-block h-4 w-4" />
            Programmes
          </button>
        </div>
      </div>

      {/* Workouts Tab */}
      {activeTab === "workouts" && (
        <div className="px-4">
          {/* Create Button */}
          <button
            onClick={() => setShowCreateWorkout(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/50 py-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-5 w-5" />
            Create New Workout
          </button>

          {/* Workout List */}
          <div className="space-y-3">
            {createdWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="rounded-xl bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{workout.title}</h3>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", difficultyColors[workout.difficulty])}>
                        {workout.difficulty}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{workout.category}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {workout.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5" />
                        {workout.calories} cal
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3.5 w-3.5" />
                        {workout.exercises.length} exercises
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteWorkout(workout.id)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {createdWorkouts.length === 0 && (
              <div className="py-12 text-center">
                <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">No workouts created yet</p>
                <p className="text-sm text-muted-foreground/70">Tap the button above to create your first workout</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Programmes Tab */}
      {activeTab === "programmes" && (
        <div className="px-4">
          {/* Create Button */}
          <button
            onClick={() => setShowCreateProgramme(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/50 py-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-5 w-5" />
            Create New Programme
          </button>

          {/* Programme List */}
          <div className="space-y-3">
            {createdProgrammes.map((programme) => (
              <div
                key={programme.id}
                className="rounded-xl bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{programme.title}</h3>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", difficultyColors[programme.difficulty])}>
                        {programme.difficulty}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{programme.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {programme.weeks} weeks
                      </span>
                      <span>{programme.frequency}</span>
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3.5 w-3.5" />
                        {programme.workouts.length} workouts
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteProgramme(programme.id)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {createdProgrammes.length === 0 && (
              <div className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">No programmes created yet</p>
                <p className="text-sm text-muted-foreground/70">Tap the button above to create your first programme</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Workout Sheet */}
      {showCreateWorkout && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Sheet Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <button onClick={() => setShowCreateWorkout(false)} className="p-1">
              <X className="h-6 w-6 text-muted-foreground" />
            </button>
            <h2 className="font-semibold text-foreground">New Workout</h2>
            <button
              onClick={handleSaveWorkout}
              disabled={!newWorkout.title || !newWorkout.exercises?.length}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                newWorkout.title && newWorkout.exercises?.length
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Save
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Title */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Workout Title</label>
              <input
                type="text"
                value={newWorkout.title || ""}
                onChange={(e) => setNewWorkout(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Push Day"
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Category & Difficulty */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
                <select
                  value={newWorkout.category || "Full Body"}
                  onChange={(e) => setNewWorkout(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-border bg-input px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option>Full Body</option>
                  <option>Upper Body</option>
                  <option>Lower Body</option>
                  <option>Push</option>
                  <option>Pull</option>
                  <option>Core</option>
                  <option>HIIT</option>
                  <option>Cardio</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Difficulty</label>
                <select
                  value={newWorkout.difficulty || "Intermediate"}
                  onChange={(e) => setNewWorkout(prev => ({ ...prev, difficulty: e.target.value as CreatedWorkout["difficulty"] }))}
                  className="w-full appearance-none rounded-xl border border-border bg-input px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            </div>

            {/* Duration & Calories */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Duration (min)</label>
                <input
                  type="number"
                  value={newWorkout.duration || 30}
                  onChange={(e) => setNewWorkout(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Est. Calories</label>
                <input
                  type="number"
                  value={newWorkout.calories || 250}
                  onChange={(e) => setNewWorkout(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Exercises Section */}
            <div className="mb-4">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Exercises</label>
                <span className="text-xs text-muted-foreground">{newWorkout.exercises?.length || 0} added</span>
              </div>

              {/* Exercise List */}
              <div className="mb-3 space-y-2">
                {newWorkout.exercises?.map((exercise, index) => (
                  <div key={exercise.id} className="rounded-xl bg-card p-3">
                    <div className="mb-2 flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <span className="font-medium text-foreground">{exercise.name}</span>
                        {exercise.category && (
                          <span className="ml-2 text-xs text-muted-foreground">{exercise.category}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveExercise(exercise.id)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="ml-[52px] grid grid-cols-4 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Sets</label>
                        <input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) => handleUpdateExercise(exercise.id, "sets", parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Reps</label>
                        <input
                          type="text"
                          value={exercise.reps}
                          onChange={(e) => handleUpdateExercise(exercise.id, "reps", e.target.value)}
                          placeholder="10"
                          className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Weight</label>
                        <input
                          type="text"
                          value={exercise.weight || ""}
                          onChange={(e) => handleUpdateExercise(exercise.id, "weight", e.target.value)}
                          placeholder="kg/lbs"
                          className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Rest</label>
                        <input
                          type="text"
                          value={exercise.rest}
                          onChange={(e) => handleUpdateExercise(exercise.id, "rest", e.target.value)}
                          placeholder="60s"
                          className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Exercise Button */}
              <button
                onClick={() => setShowExercisePicker(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Add Exercise
              </button>
            </div>
          </div>

          {/* Exercise Picker */}
          {showExercisePicker && (
            <div className="fixed inset-0 z-[60] flex flex-col bg-background">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <button onClick={() => { setShowExercisePicker(false); setExerciseSearch("") }} className="p-1">
                  <X className="h-6 w-6 text-muted-foreground" />
                </button>
                <h2 className="font-semibold text-foreground">Select Exercise</h2>
                <div className="w-8" />
              </div>

              <div className="border-b border-border p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Search exercises..."
                    className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => handleAddExercise(exercise)}
                      className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left transition-colors hover:bg-card/80"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-secondary">
                        {exercise.image && (
                          <img src={exercise.image} alt={exercise.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{exercise.name}</p>
                        <p className="text-sm text-muted-foreground">{exercise.category}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Programme Sheet */}
      {showCreateProgramme && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Sheet Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <button onClick={() => setShowCreateProgramme(false)} className="p-1">
              <X className="h-6 w-6 text-muted-foreground" />
            </button>
            <h2 className="font-semibold text-foreground">New Programme</h2>
            <button
              onClick={handleSaveProgramme}
              disabled={!newProgramme.title}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                newProgramme.title
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Save
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Title */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Programme Title</label>
              <input
                type="text"
                value={newProgramme.title || ""}
                onChange={(e) => setNewProgramme(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., 8-Week Strength Program"
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
              <textarea
                value={newProgramme.description || ""}
                onChange={(e) => setNewProgramme(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this programme achieves..."
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Duration & Frequency */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Duration (weeks)</label>
                <input
                  type="number"
                  value={newProgramme.weeks || 8}
                  onChange={(e) => setNewProgramme(prev => ({ ...prev, weeks: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Frequency</label>
                <select
                  value={newProgramme.frequency || "3x per week"}
                  onChange={(e) => setNewProgramme(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-border bg-input px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option>2x per week</option>
                  <option>3x per week</option>
                  <option>4x per week</option>
                  <option>5x per week</option>
                  <option>6x per week</option>
                </select>
              </div>
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Difficulty</label>
              <select
                value={newProgramme.difficulty || "Intermediate"}
                onChange={(e) => setNewProgramme(prev => ({ ...prev, difficulty: e.target.value as CreatedProgramme["difficulty"] }))}
                className="w-full appearance-none rounded-xl border border-border bg-input px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>

            {/* Include Workouts */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Include Workouts</label>
                <span className="text-xs text-muted-foreground">{newProgramme.workouts?.length || 0} selected</span>
              </div>

              {createdWorkouts.length > 0 ? (
                <div className="space-y-2">
                  {createdWorkouts.map((workout) => {
                    const isSelected = newProgramme.workouts?.includes(workout.id)
                    return (
                      <button
                        key={workout.id}
                        onClick={() => toggleWorkoutInProgramme(workout.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/50"
                        )}
                      >
                        <div className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                        )}>
                          {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{workout.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {workout.duration} min • {workout.exercises.length} exercises
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl bg-card p-6 text-center">
                  <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No workouts available</p>
                  <p className="text-xs text-muted-foreground/70">Create workouts first to add them to programmes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
