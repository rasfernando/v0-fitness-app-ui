"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Dumbbell,
  Clock,
  Flame,
  GripVertical,
  Trash2,
  X,
  Check,
  Search,
  Loader2,
  ChevronLeft,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { useExercises } from "@/lib/hooks/use-exercises"
import { useWorkouts } from "@/lib/hooks/use-workouts"
import { useWorkoutDetail, type WorkoutDetailExercise } from "@/lib/hooks/use-workout-detail"
import {
  createWorkout,
  softDeleteWorkout,
  updateWorkoutExercises,
} from "@/lib/mutations/workouts"

// ── Shared form exercise type ────────────────────────────────────────────────
// Used by both Create and Edit flows. `workoutExerciseId` is set when editing
// an existing row (so the mutation knows to UPDATE not INSERT).
interface FormExercise {
  localId: string
  workoutExerciseId?: string   // present when editing existing exercise
  exerciseId: string
  name: string
  category: string
  supersetGroup: string        // "A", "B", "C", etc. or "" for standalone
  sets: number
  reps: string
  weight: string
  rest: string
}

const SUPERSET_LABELS = ["", "A", "B", "C", "D", "E", "F"] as const
const SUPERSET_COLORS: Record<string, string> = {
  A: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  B: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  C: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  D: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  E: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  F: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
}

const difficultyColors = {
  Beginner: "bg-green-500/20 text-green-400",
  Intermediate: "bg-amber-500/20 text-amber-400",
  Advanced: "bg-red-500/20 text-red-400",
}

function formatDifficultyDisplay(d: string): "Beginner" | "Intermediate" | "Advanced" {
  if (d === "beginner") return "Beginner"
  if (d === "advanced") return "Advanced"
  return "Intermediate"
}

// Convert a WorkoutDetailExercise from the hook into a FormExercise for editing
function detailToForm(ex: WorkoutDetailExercise): FormExercise {
  return {
    localId: `existing-${ex.workoutExerciseId}`,
    workoutExerciseId: ex.workoutExerciseId,
    exerciseId: ex.exerciseId,
    name: ex.name,
    category: ex.category ?? "",
    supersetGroup: ex.supersetGroup ?? "",
    sets: ex.sets,
    reps: ex.prescription,
    weight: ex.weightKg !== null ? String(ex.weightKg) : "",
    rest: String(ex.restSeconds),
  }
}

// ── Exercise picker (shared between create & edit) ───────────────────────────
function ExercisePickerSheet({
  exercises,
  loading,
  onSelect,
  onClose,
}: {
  exercises: { id: string; name: string; category: string; muscleGroup: string }[]
  loading: boolean
  onSelect: (ex: { id: string; name: string; category: string }) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState("")

  const filtered = exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.category.toLowerCase().includes(search.toLowerCase())
  )

  const byCategory = filtered.reduce<Record<string, typeof filtered>>((acc, ex) => {
    const cat = ex.category || "Other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ex)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex flex-col pb-20">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card shadow-2xl scrollbar-hide safe-area-pb">
        <div className="sticky top-0 z-10 bg-card px-4 pt-3 pb-3">
          <div className="flex justify-center pb-2">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {Object.entries(byCategory)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, exs]) => (
                <div key={cat}>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    {cat}
                  </h3>
                  <div className="space-y-1">
                    {exs.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => onSelect(exercise)}
                        className="flex w-full items-center gap-3 rounded-lg bg-secondary/30 p-3 text-left transition-colors hover:bg-secondary"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Dumbbell className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{exercise.name}</p>
                          {exercise.muscleGroup && (
                            <p className="text-xs text-muted-foreground">
                              {exercise.muscleGroup}
                            </p>
                          )}
                        </div>
                        <Plus className="h-5 w-5 text-primary" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No exercises found</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline exercise row editor ───────────────────────────────────────────────
function ExerciseFormRow({
  exercise,
  index,
  onUpdate,
  onRemove,
}: {
  exercise: FormExercise
  index: number
  onUpdate: (localId: string, field: keyof FormExercise, value: string | number) => void
  onRemove: (localId: string) => void
}) {
  return (
    <div className={cn(
      "rounded-xl p-3",
      exercise.supersetGroup && SUPERSET_COLORS[exercise.supersetGroup]
        ? `border ${SUPERSET_COLORS[exercise.supersetGroup].split(" ").pop()} bg-secondary/30`
        : "bg-secondary/30"
    )}>
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
          onClick={() => onRemove(exercise.localId)}
          className="rounded p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="ml-[52px] grid grid-cols-5 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Block</label>
          <select
            value={exercise.supersetGroup}
            onChange={(e) => onUpdate(exercise.localId, "supersetGroup", e.target.value)}
            className={cn(
              "w-full rounded-lg border border-border bg-input px-1.5 py-1.5 text-sm font-semibold",
              exercise.supersetGroup
                ? SUPERSET_COLORS[exercise.supersetGroup]?.split(" ").slice(0, 2).join(" ") ?? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            <option value="">—</option>
            {SUPERSET_LABELS.filter(l => l !== "").map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            {exercise.supersetGroup ? "Rounds" : "Sets"}
          </label>
          <input
            type="number"
            value={exercise.sets}
            onChange={(e) => onUpdate(exercise.localId, "sets", parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Reps</label>
          <input
            type="text"
            value={exercise.reps}
            onChange={(e) => onUpdate(exercise.localId, "reps", e.target.value)}
            placeholder="10"
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Weight</label>
          <input
            type="text"
            value={exercise.weight}
            onChange={(e) => onUpdate(exercise.localId, "weight", e.target.value)}
            placeholder="kg"
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Rest</label>
          <input
            type="text"
            value={exercise.rest}
            onChange={(e) => onUpdate(exercise.localId, "rest", e.target.value)}
            placeholder="60"
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function PTBuilderScreen() {
  const { user } = useAuth()
  const { data: exerciseLibrary, loading: exercisesLoading } = useExercises()
  const { data: workouts, loading: workoutsLoading, refetch: refetchWorkouts } = useWorkouts()

  // ── Detail / edit state ──────────────────────────────────────────────────
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editExercises, setEditExercises] = useState<FormExercise[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [showEditPicker, setShowEditPicker] = useState(false)

  const {
    data: workoutDetail,
    loading: detailLoading,
    refetch: refetchDetail,
  } = useWorkoutDetail(selectedWorkoutId)

  // When detail loads (or changes), seed the edit form
  useEffect(() => {
    if (workoutDetail) {
      setEditExercises(workoutDetail.exercises.map(detailToForm))
    }
  }, [workoutDetail])

  const startEditing = () => {
    if (workoutDetail) {
      setEditExercises(workoutDetail.exercises.map(detailToForm))
      setEditError(null)
      setEditing(true)
    }
  }

  const cancelEditing = () => {
    if (workoutDetail) {
      setEditExercises(workoutDetail.exercises.map(detailToForm))
    }
    setEditing(false)
    setEditError(null)
  }

  const closeDetail = () => {
    setSelectedWorkoutId(null)
    setEditing(false)
    setEditError(null)
  }

  const handleEditAddExercise = (exercise: { id: string; name: string; category: string }) => {
    setEditExercises((prev) => [
      ...prev,
      {
        localId: `new-${Date.now()}-${Math.random()}`,
        exerciseId: exercise.id,
        name: exercise.name,
        category: exercise.category,
        supersetGroup: "",
        sets: 3,
        reps: "10",
        weight: "",
        rest: "60",
      },
    ])
    setShowEditPicker(false)
  }

  const handleEditRemoveExercise = (localId: string) => {
    setEditExercises((prev) => prev.filter((e) => e.localId !== localId))
  }

  const handleEditUpdateExercise = (localId: string, field: keyof FormExercise, value: string | number) => {
    setEditExercises((prev) =>
      prev.map((e) => (e.localId === localId ? { ...e, [field]: value } : e))
    )
  }

  const handleSaveEdits = async () => {
    if (!selectedWorkoutId || editExercises.length === 0) return
    setEditSaving(true)
    setEditError(null)

    try {
      await updateWorkoutExercises({
        workoutId: selectedWorkoutId,
        exercises: editExercises.map((ex, index) => ({
          workoutExerciseId: ex.workoutExerciseId,
          exerciseId: ex.exerciseId,
          position: index,
          sets: ex.sets,
          prescription: ex.reps,
          weightKg: ex.weight ? parseFloat(ex.weight) : null,
          restSeconds: parseInt(ex.rest) || 60,
          supersetGroup: ex.supersetGroup || null,
        })),
      })
      setEditing(false)
      refetchDetail()
      refetchWorkouts()
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setEditSaving(false)
    }
  }

  // ── Create state ─────────────────────────────────────────────────────────
  const [showCreateWorkout, setShowCreateWorkout] = useState(false)
  const [showCreatePicker, setShowCreatePicker] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("Full Body")
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate")
  const [createExercises, setCreateExercises] = useState<FormExercise[]>([])

  const resetCreateForm = () => {
    setTitle("")
    setCategory("Full Body")
    setDifficulty("Intermediate")
    setCreateExercises([])
    setCreateError(null)
  }

  const handleCreateAddExercise = (exercise: { id: string; name: string; category: string }) => {
    setCreateExercises((prev) => [
      ...prev,
      {
        localId: `local-${Date.now()}-${Math.random()}`,
        exerciseId: exercise.id,
        name: exercise.name,
        category: exercise.category,
        supersetGroup: "",
        sets: 3,
        reps: "10",
        weight: "",
        rest: "60",
      },
    ])
    setShowCreatePicker(false)
  }

  const handleCreateRemoveExercise = (localId: string) => {
    setCreateExercises((prev) => prev.filter((e) => e.localId !== localId))
  }

  const handleCreateUpdateExercise = (localId: string, field: keyof FormExercise, value: string | number) => {
    setCreateExercises((prev) =>
      prev.map((e) => (e.localId === localId ? { ...e, [field]: value } : e))
    )
  }

  const handleSaveWorkout = async () => {
    if (!title || createExercises.length === 0) return
    setCreateSaving(true)
    setCreateError(null)

    const estimatedDuration = Math.ceil((createExercises.length * 8 + 5) / 5) * 5
    const estimatedCalories = Math.ceil(createExercises.length * 50 + 50)

    try {
      await createWorkout({
        ptId: user!.id,
        title,
        category,
        difficulty: difficulty.toLowerCase() as "beginner" | "intermediate" | "advanced",
        estimatedDurationMinutes: estimatedDuration,
        estimatedCalories: estimatedCalories,
        exercises: createExercises.map((ex, index) => ({
          exerciseId: ex.exerciseId,
          position: index,
          sets: ex.sets,
          prescription: ex.reps,
          weightKg: ex.weight ? parseFloat(ex.weight) : null,
          restSeconds: parseInt(ex.rest) || 60,
          supersetGroup: ex.supersetGroup || null,
        })),
      })
      resetCreateForm()
      setShowCreateWorkout(false)
      refetchWorkouts()
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to save workout")
    } finally {
      setCreateSaving(false)
    }
  }

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      await softDeleteWorkout(workoutId)
      refetchWorkouts()
    } catch (err: unknown) {
      console.error("Failed to delete workout:", err)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
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
        {workoutsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : workouts.length > 0 ? (
          workouts.map((workout) => (
            <button
              key={workout.id}
              onClick={() => setSelectedWorkoutId(workout.id)}
              className="w-full rounded-xl bg-card p-4 text-left transition-colors hover:bg-secondary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{workout.title}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        difficultyColors[workout.difficulty]
                      )}
                    >
                      {workout.difficulty}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{workout.category}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {workout.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {workout.calories}
                    </span>
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {workout.exercises} exercises
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
            <p className="text-sm text-muted-foreground/70">
              Tap the button above to create your first workout
            </p>
          </div>
        )}
      </div>

      {/* ── Workout Detail / Edit Sheet ─────────────────────────────────── */}
      {selectedWorkoutId && (
        <div className="fixed inset-0 z-40 flex flex-col pb-20">
          <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={closeDetail} />
          <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card shadow-2xl scrollbar-hide safe-area-pb">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card px-4 pt-3 pb-4">
              <div className="flex justify-center pb-2">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : workoutDetail ? (
                <>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={editing ? cancelEditing : closeDetail}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {editing ? "Cancel" : "Back"}
                    </button>
                    <div className="flex items-center gap-2">
                      {!editing && (
                        <button
                          onClick={startEditing}
                          className="flex items-center gap-1 rounded-lg bg-primary/20 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/30"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await handleDeleteWorkout(workoutDetail.id)
                          closeDetail()
                        }}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                        {workoutDetail.title}
                      </h2>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          difficultyColors[formatDifficultyDisplay(workoutDetail.difficulty)]
                        )}
                      >
                        {workoutDetail.difficulty}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {workoutDetail.category}
                    </p>
                    {workoutDetail.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {workoutDetail.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      {workoutDetail.estimatedDurationMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {workoutDetail.estimatedDurationMinutes} min
                        </span>
                      )}
                      {workoutDetail.estimatedCalories && (
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {workoutDetail.estimatedCalories} cal
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {editing ? editExercises.length : workoutDetail.exercises.length} exercises
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Workout not found
                </p>
              )}
            </div>

            {/* Exercise list — read-only or editable */}
            {workoutDetail && (
              <div className="space-y-2 px-4 pb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Exercises
                  </h3>
                  {editing && (
                    <button
                      onClick={() => setShowEditPicker(true)}
                      className="flex items-center gap-1 rounded-lg bg-primary/20 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/30"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  )}
                </div>

                {editing ? (
                  /* ── Editable exercise rows ──────────────────────────── */
                  <>
                    <div className="space-y-3">
                      {editExercises.map((ex, index) => (
                        <ExerciseFormRow
                          key={ex.localId}
                          exercise={ex}
                          index={index}
                          onUpdate={handleEditUpdateExercise}
                          onRemove={handleEditRemoveExercise}
                        />
                      ))}
                    </div>

                    {editExercises.length === 0 && (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No exercises — add some above
                      </p>
                    )}

                    {editError && (
                      <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {editError}
                      </p>
                    )}

                    <button
                      onClick={handleSaveEdits}
                      disabled={editExercises.length === 0 || editSaving}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {editSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {editSaving ? "Saving…" : "Save Changes"}
                    </button>
                  </>
                ) : (
                  /* ── Read-only exercise rows ─────────────────────────── */
                  (() => {
                    // Group exercises visually by superset block
                    let lastGroup: string | null = null
                    return workoutDetail.exercises.map((ex, index) => {
                      const showGroupHeader = ex.supersetGroup && ex.supersetGroup !== lastGroup
                      lastGroup = ex.supersetGroup
                      return (
                        <div key={ex.workoutExerciseId}>
                          {showGroupHeader && (
                            <div className="mb-1 mt-3 flex items-center gap-2">
                              <span className={cn(
                                "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase",
                                SUPERSET_COLORS[ex.supersetGroup!] ?? "bg-secondary text-foreground"
                              )}>
                                Superset {ex.supersetGroup}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {ex.sets} rounds
                              </span>
                            </div>
                          )}
                          <div
                            className={cn(
                              "flex items-start gap-3 rounded-xl p-3",
                              ex.supersetGroup
                                ? `border ${SUPERSET_COLORS[ex.supersetGroup]?.split(" ").pop() ?? ""} bg-secondary/20`
                                : "bg-secondary/30"
                            )}
                          >
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{ex.name}</p>
                                {ex.category && (
                                  <span className="text-xs text-muted-foreground">{ex.category}</span>
                                )}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded bg-card px-1.5 py-0.5">
                                  {ex.supersetGroup ? `${ex.sets} rounds` : `${ex.sets} sets`}
                                </span>
                                <span className="rounded bg-card px-1.5 py-0.5">
                                  {ex.prescription} reps
                                </span>
                                {ex.weightKg !== null && (
                                  <span className="rounded bg-card px-1.5 py-0.5">
                                    {ex.weightKg} kg
                                  </span>
                                )}
                                <span className="rounded bg-card px-1.5 py-0.5">
                                  {ex.restSeconds}s rest
                                </span>
                              </div>
                              {ex.notes && (
                                <p className="mt-1.5 text-xs italic text-muted-foreground/70">
                                  {ex.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit exercise picker */}
      {showEditPicker && (
        <ExercisePickerSheet
          exercises={exerciseLibrary}
          loading={exercisesLoading}
          onSelect={handleEditAddExercise}
          onClose={() => setShowEditPicker(false)}
        />
      )}

      {/* ── Create Workout Modal ────────────────────────────────────────── */}
      {showCreateWorkout && (
        <div className="fixed inset-0 z-40 flex flex-col pb-20">
          <div
            className="flex-1 bg-background/60 backdrop-blur-sm"
            onClick={() => {
              setShowCreateWorkout(false)
              resetCreateForm()
            }}
          />
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
                  onClick={() => {
                    setShowCreateWorkout(false)
                    resetCreateForm()
                  }}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {/* Title */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
                  Workout Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Upper Body Power"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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
                <label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
                  Difficulty
                </label>
                <div className="flex gap-2">
                  {(["Beginner", "Intermediate", "Advanced"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={cn(
                        "flex-1 rounded-lg border py-2 text-xs font-semibold uppercase transition-colors",
                        difficulty === level
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
                    Exercises ({createExercises.length})
                  </label>
                  <button
                    onClick={() => setShowCreatePicker(true)}
                    className="flex items-center gap-1 rounded-lg bg-primary/20 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/30"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>

                <div className="space-y-3">
                  {createExercises.map((exercise, index) => (
                    <ExerciseFormRow
                      key={exercise.localId}
                      exercise={exercise}
                      index={index}
                      onUpdate={handleCreateUpdateExercise}
                      onRemove={handleCreateRemoveExercise}
                    />
                  ))}
                </div>
              </div>

              {createError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createError}
                </p>
              )}

              <button
                onClick={handleSaveWorkout}
                disabled={!title || createExercises.length === 0 || createSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {createSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {createSaving ? "Saving…" : "Save Workout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create exercise picker */}
      {showCreatePicker && (
        <ExercisePickerSheet
          exercises={exerciseLibrary}
          loading={exercisesLoading}
          onSelect={handleCreateAddExercise}
          onClose={() => setShowCreatePicker(false)}
        />
      )}
    </div>
  )
}
