"use client"

import { useState } from "react"
import { 
  Plus, 
  Dumbbell, 
  Clock, 
  Flame, 
  GripVertical,
  Trash2,
  X,
  Check,
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
  { id: "ex11", name: "Leg Press", category: "Legs", image: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=100&q=80" },
  { id: "ex12", name: "Cable Flyes", category: "Chest", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=100&q=80" },
  { id: "ex13", name: "Lat Pulldown", category: "Back", image: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=100&q=80" },
  { id: "ex14", name: "Leg Curl", category: "Legs", image: "https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=100&q=80" },
  { id: "ex15", name: "Overhead Press", category: "Shoulders", image: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=100&q=80" },
  { id: "ex16", name: "Hammer Curls", category: "Arms", image: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=100&q=80" },
  { id: "ex17", name: "Cable Rows", category: "Back", image: "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=100&q=80" },
  { id: "ex18", name: "Ab Wheel Rollout", category: "Core", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&q=80" },
]

export function PTBuilderScreen() {
  const [showCreateWorkout, setShowCreateWorkout] = useState(false)
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
  
  // New workout form state
  const [newWorkout, setNewWorkout] = useState<Partial<CreatedWorkout>>({
    title: "",
    category: "Full Body",
    difficulty: "Intermediate",
    exercises: [],
  })

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
      exercises: prev.exercises?.filter(e => e.id !== exerciseId)
    }))
  }

  const handleUpdateExercise = (exerciseId: string, field: keyof Exercise, value: any) => {
    setNewWorkout(prev => ({
      ...prev,
      exercises: prev.exercises?.map(e =>
        e.id === exerciseId ? { ...e, [field]: value } : e
      )
    }))
  }

  const handleSaveWorkout = () => {
    if (!newWorkout.title || !newWorkout.exercises?.length) return

    const duration = Math.ceil((newWorkout.exercises.length * 8 + 5) / 5) * 5
    const calories = Math.ceil(newWorkout.exercises.length * 15 + Math.random() * 50)

    const workout: CreatedWorkout = {
      id: `cw-${Date.now()}`,
      title: newWorkout.title || "",
      category: newWorkout.category || "Full Body",
      difficulty: newWorkout.difficulty || "Intermediate",
      duration,
      calories,
      exercises: newWorkout.exercises || [],
      createdAt: new Date()
    }

    setCreatedWorkouts(prev => [workout, ...prev])
    setShowCreateWorkout(false)
    setNewWorkout({ title: "", category: "Full Body", difficulty: "Intermediate", exercises: [] })
  }

  const handleDeleteWorkout = (workoutId: string) => {
    setCreatedWorkouts(prev => prev.filter(w => w.id !== workoutId))
  }

  const difficultyColors = {
    "Beginner": "bg-green-500/20 text-green-400",
    "Intermediate": "bg-amber-500/20 text-amber-400",
    "Advanced": "bg-red-500/20 text-red-400",
  }

  const filteredExercises = exerciseLibrary.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.category.toLowerCase().includes(exerciseSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 px-4 pb-4 pt-3 backdrop-blur-sm">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-foreground">
          Build Workouts
        </h1>
        <p className="text-xs text-muted-foreground">
          Create and customize workouts for your clients
        </p>
      </div>

      {/* Create Button */}
      <div className="px-4 py-4">
        <button
          onClick={() => setShowCreateWorkout(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-transform hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          New Workout
        </button>
      </div>

      {/* Workouts List */}
      <div className="space-y-3 px-4">
        {createdWorkouts.length > 0 ? (
          createdWorkouts.map((workout) => (
            <button
              key={workout.id}
              className="w-full rounded-xl bg-card p-4 text-left transition-colors hover:bg-secondary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{workout.title}</h3>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", difficultyColors[workout.difficulty])}>
                      {workout.difficulty}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{workout.category}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {workout.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {workout.calories} cal
                    </span>
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {workout.exercises.length} exercises
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteWorkout(workout.id)
                  }}
                  className="rounded p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <Dumbbell className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-muted-foreground">No workouts created yet</p>
            <p className="text-sm text-muted-foreground/70">Tap the button above to create your first workout</p>
          </div>
        )}
      </div>

      {/* Create Workout Modal */}
      {showCreateWorkout && (
        <div className="fixed inset-0 z-40 flex flex-col pb-20">
          <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={() => setShowCreateWorkout(false)} />
          <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card shadow-2xl scrollbar-hide safe-area-pb">
            <div className="sticky top-0 z-10 bg-card px-4 pt-3 pb-4">
              <div className="flex justify-center pb-2">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                  New Workout
                </h2>
                <button
                  onClick={() => setShowCreateWorkout(false)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Workout Name
                </label>
                <input
                  type="text"
                  value={newWorkout.title || ""}
                  onChange={(e) => setNewWorkout(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Upper Body Power"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Category
                </label>
                <select
                  value={newWorkout.category || ""}
                  onChange={(e) => setNewWorkout(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                >
                  <option>Full Body</option>
                  <option>Upper Body</option>
                  <option>Lower Body</option>
                  <option>Cardio</option>
                  <option>HIIT</option>
                  <option>Core</option>
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Difficulty
                </label>
                <div className="flex gap-2">
                  {["Beginner", "Intermediate", "Advanced"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setNewWorkout(prev => ({ ...prev, difficulty: level as any }))}
                      className={cn(
                        "flex-1 rounded-lg border py-2 text-xs font-semibold uppercase transition-colors",
                        newWorkout.difficulty === level
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercises */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase text-muted-foreground">
                    Exercises ({newWorkout.exercises?.length || 0})
                  </label>
                  <button
                    onClick={() => setShowExercisePicker(true)}
                    className="flex items-center gap-1 rounded-lg bg-primary/20 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/30"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>

                <div className="space-y-3">
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
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveWorkout}
                disabled={!newWorkout.title || !newWorkout.exercises?.length}
                className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Check className="mb-0.5 inline-block h-4 w-4 mr-2" />
                Save Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-40 flex flex-col pb-20">
          <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={() => setShowExercisePicker(false)} />
          <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card shadow-2xl scrollbar-hide safe-area-pb">
            <div className="sticky top-0 z-10 bg-card px-4 pt-3 pb-3">
              <div className="flex justify-center pb-2">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 p-4">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleAddExercise(exercise)}
                  className="flex w-full items-center gap-3 rounded-lg bg-secondary/30 p-3 text-left transition-colors hover:bg-secondary"
                >
                  <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-primary/10">
                    <img src={exercise.image} alt={exercise.name} className="h-full w-full rounded-lg object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">{exercise.category}</p>
                  </div>
                  <Plus className="h-5 w-5 text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
