"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus, Dumbbell, Clock, X, Check, Search, Layers, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"
import { useExercises, type ExerciseOption } from "@/lib/hooks/use-exercises"

export interface ScheduledWorkout {
  id: string
  workoutId: string
  title: string
  category: string
  duration: string
  date: string
  status: "scheduled" | "completed" | "missed"
  type?: "workout" | "single_exercise"
  // Single-exercise extras
  sets?: number
  reps?: string
  weight?: string
  rest?: string
}

interface CalendarWorkout {
  id: string
  title: string
  category: string
  duration: string
  calories: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  exercises: number
  imageUrl: string
}

interface WorkoutCalendarProps {
  scheduledWorkouts: ScheduledWorkout[]
  availableWorkouts?: CalendarWorkout[]
  onScheduleWorkout?: (date: string, workout: CalendarWorkout) => void
  onScheduleExercise?: (date: string, exercise: Omit<ScheduledWorkout, "id" | "date" | "status">) => void
  onRemoveWorkout?: (workoutId: string) => void
  readOnly?: boolean
  clientName?: string
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const difficultyColor: Record<string, string> = {
  Beginner: "bg-emerald-500/20 text-emerald-400",
  Intermediate: "bg-primary/20 text-primary",
  Advanced: "bg-red-500/20 text-red-400",
}

const statusColors: Record<string, string> = {
  scheduled: "bg-primary",
  completed: "bg-emerald-500",
  missed: "bg-red-500/60",
}

// ─── Exercise library for single-exercise assignments ─────────────────────────

// EXERCISE_LIBRARY was formerly a hardcoded constant here; it's now loaded
// from the database via useExercises() inside the AddSheet component. The
// old constant, along with its derived EXERCISE_CATEGORIES, has been deleted.

// ─── Single Exercise Config Panel ─────────────────────────────────────────────

function ExerciseConfigPanel({
  exercise,
  onConfirm,
  onBack,
  date,
}: {
  exercise: ExerciseOption
  onConfirm: (config: { sets: number; reps: string; weight: string; rest: string }) => void
  onBack: () => void
  date: string
}) {
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState("10")
  const [weight, setWeight] = useState("")
  const [rest, setRest] = useState("60s")

  const dateObj = new Date(date + "T00:00:00")

  return (
    <div className="flex flex-col px-5 pb-6">
      {/* Exercise header */}
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-secondary p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
          <Dumbbell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{exercise.name}</p>
          <p className="text-xs text-muted-foreground">
            {exercise.category} · {exercise.muscleGroup}
          </p>
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Assigning to{" "}
        <span className="font-medium text-foreground">
          {dateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </span>
      </p>

      {/* Sets */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sets
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSets(Math.max(1, sets - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/70"
          >
            <span className="text-lg leading-none">−</span>
          </button>
          <span className="w-8 text-center font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
            {sets}
          </span>
          <button
            onClick={() => setSets(sets + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/70"
          >
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
      </div>

      {/* Reps / Duration */}
      {exercise.usesReps && (
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reps / Range
          </label>
          <input
            type="text"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="e.g. 10 or 8-12"
            className="h-11 w-full rounded-xl border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {!exercise.usesReps && (
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hold Duration
          </label>
          <input
            type="text"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="e.g. 30s or 1 min"
            className="h-11 w-full rounded-xl border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Weight */}
      {exercise.usesWeight && (
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Weight
          </label>
          <input
            type="text"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 60kg or 135lbs or Bodyweight"
            className="h-11 w-full rounded-xl border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Rest */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Rest Between Sets
        </label>
        <div className="flex flex-wrap gap-2">
          {["30s", "45s", "60s", "90s", "2 min", "3 min"].map((r) => (
            <button
              key={r}
              onClick={() => setRest(r)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                rest === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
          <input
            type="text"
            value={rest}
            onChange={(e) => setRest(e.target.value)}
            placeholder="Custom"
            className="h-8 w-20 rounded-full border border-border bg-input px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
        <button
          onClick={() => onConfirm({ sets, reps, weight, rest })}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground hover:brightness-110"
        >
          Assign Exercise
        </button>
      </div>
    </div>
  )
}

// ─── Add Sheet ────────────────────────────────────────────────────────────────

type AddMode = "pick_type" | "workout_list" | "exercise_list" | "exercise_config"

function AddSheet({
  selectedDate,
  availableWorkouts,
  onSelectWorkout,
  onScheduleExercise,
  onClose,
}: {
  selectedDate: string
  availableWorkouts: CalendarWorkout[]
  onSelectWorkout: (workout: CalendarWorkout) => void
  onScheduleExercise: (exercise: Omit<ScheduledWorkout, "id" | "date" | "status">) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<AddMode>("pick_type")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [selectedExercise, setSelectedExercise] = useState<ExerciseOption | null>(null)

  // Exercise library from the DB. Replaces the previous hardcoded EXERCISE_LIBRARY.
  // Loading/error states handled in the exercise_list render branch below.
  const { data: exerciseLibrary, loading: exercisesLoading, error: exercisesError } = useExercises()

  // Derive category filter options from the loaded library. Always includes "All".
  const exerciseCategories = useMemo(() => {
    const cats = Array.from(new Set(exerciseLibrary.map((e) => e.category))).sort()
    return ["All", ...cats]
  }, [exerciseLibrary])

  // Lock body scroll while the sheet is open so finger swipes inside the
  // sheet don't propagate to the page underneath on mobile.
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  const dateObj = new Date(selectedDate + "T00:00:00")

  const filteredWorkouts = availableWorkouts.filter(
    (w) =>
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredExercises = exerciseLibrary.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "All" || e.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleExerciseConfig = (config: { sets: number; reps: string; weight: string; rest: string }) => {
    if (!selectedExercise) return
    onScheduleExercise({
      workoutId: selectedExercise.id,
      title: selectedExercise.name,
      category: selectedExercise.category,
      duration: `${config.sets} sets`,
      type: "single_exercise",
      sets: config.sets,
      reps: config.reps,
      weight: config.weight || undefined,
      rest: config.rest,
    })
  }

  const title =
    mode === "pick_type"
      ? "Add to Calendar"
      : mode === "workout_list"
      ? "Select Workout"
      : mode === "exercise_list"
      ? "Select Exercise"
      : selectedExercise?.name ?? "Configure Exercise"

  return (
    <div className="fixed inset-0 z-40 flex flex-col pb-20">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-card shadow-2xl scrollbar-hide safe-area-pb">
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {dateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── pick_type ── */}
        {mode === "pick_type" && (
          <div className="space-y-3 px-5 pb-8">
            <button
              onClick={() => { setMode("workout_list"); setSearchQuery("") }}
              className="flex w-full items-center gap-4 rounded-2xl bg-secondary p-4 text-left transition-all hover:bg-secondary/80"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Full Workout</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Assign a complete multi-exercise session</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => { setMode("exercise_list"); setSearchQuery("") }}
              className="flex w-full items-center gap-4 rounded-2xl bg-secondary p-4 text-left transition-all hover:bg-secondary/80"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                <ListChecks className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Single Exercise</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Set specific sets, reps and weight for one move</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* ── workout_list ── */}
        {mode === "workout_list" && (
          <div className="pb-6">
            <div className="relative mx-5 mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search workouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2 px-5">
              {filteredWorkouts.map((workout) => (
                <button
                  key={workout.id}
                  onClick={() => onSelectWorkout(workout)}
                  className="flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-left transition-all hover:bg-secondary/70"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    <img src={workout.imageUrl} alt={workout.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-sm text-foreground">{workout.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{workout.duration}</span>
                      <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{workout.exercises} ex.</span>
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", difficultyColor[workout.difficulty])}>
                    {workout.difficulty}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── exercise_list ── */}
        {mode === "exercise_list" && (
          <div className="pb-6">
            <div className="relative mx-5 mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search exercises or muscle group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Category filter */}
            <div className="mb-3 flex gap-2 overflow-x-auto px-5 scrollbar-hide">
              {exerciseCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                    categoryFilter === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-2 px-5">
              {exercisesLoading && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading exercises…
                </div>
              )}
              {exercisesError && !exercisesLoading && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Failed to load exercises: {exercisesError}
                </div>
              )}
              {!exercisesLoading && !exercisesError && filteredExercises.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery || categoryFilter !== "All"
                    ? "No exercises match your search"
                    : "No exercises in the library yet"}
                </div>
              )}
              {!exercisesLoading && !exercisesError && filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => { setSelectedExercise(exercise); setMode("exercise_config") }}
                  className="flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-left transition-all hover:bg-secondary/70"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-sm text-foreground">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">{exercise.muscleGroup || exercise.category}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {exercise.category}
                    </span>
                    {exercise.usesWeight && (
                      <span className="text-[10px] text-primary">Weighted</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── exercise_config ── */}
        {mode === "exercise_config" && selectedExercise && (
          <ExerciseConfigPanel
            exercise={selectedExercise}
            date={selectedDate}
            onConfirm={handleExerciseConfig}
            onBack={() => setMode("exercise_list")}
          />
        )}
      </div>
    </div>
  )
}

// ─── Main Calendar Component ──────────────────────────────────────────────────

export function WorkoutCalendar({
  scheduledWorkouts,
  availableWorkouts = [],
  onScheduleWorkout,
  onScheduleExercise,
  onRemoveWorkout,
  readOnly = false,
  clientName,
}: WorkoutCalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const days: { date: Date; isCurrentMonth: boolean }[] = []

    const startDayOfWeek = firstDay.getDay()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth, -i)
      days.push({ date, isCurrentMonth: false })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(currentYear, currentMonth, i)
      days.push({ date, isCurrentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(currentYear, currentMonth + 1, i)
      days.push({ date, isCurrentMonth: false })
    }
    return days
  }, [currentMonth, currentYear])

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, ScheduledWorkout[]>()
    scheduledWorkouts.forEach((workout) => {
      const existing = map.get(workout.date) || []
      map.set(workout.date, [...existing, workout])
    })
    return map
  }, [scheduledWorkouts])

  const formatDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  const isPast = (date: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return d < t
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return
    setSelectedDate(formatDateKey(date))
  }

  const handleSelectWorkout = (workout: CalendarWorkout) => {
    if (!selectedDate || !onScheduleWorkout) return
    onScheduleWorkout(selectedDate, workout)
    setShowAddSheet(false)
  }

  const handleScheduleExercise = (exercise: Omit<ScheduledWorkout, "id" | "date" | "status">) => {
    if (!selectedDate || !onScheduleExercise) return
    onScheduleExercise(selectedDate, exercise)
    setShowAddSheet(false)
  }

  const selectedDateWorkouts = selectedDate ? workoutsByDate.get(selectedDate) || [] : []
  const selectedDateObj = selectedDate ? new Date(selectedDate + "T00:00:00") : null

  return (
    <div className="flex flex-col">
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={handlePrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-secondary/80"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-[family-name:var(--font-display)] text-base font-bold uppercase text-foreground">
          {MONTHS[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={handleNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-secondary/80"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 px-2">
        {DAYS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium uppercase text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 px-2">
        {daysInMonth.map(({ date, isCurrentMonth }, index) => {
          const dateKey = formatDateKey(date)
          const dayWorkouts = workoutsByDate.get(dateKey) || []
          const isSelected = selectedDate === dateKey
          const isTodayDate = isToday(date)
          const isPastDate = isPast(date)

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date, isCurrentMonth)}
              disabled={!isCurrentMonth}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-start rounded-lg p-1 transition-all",
                isCurrentMonth ? "hover:bg-secondary" : "opacity-30",
                isSelected && "bg-primary/20 ring-1 ring-primary",
                isTodayDate && !isSelected && "ring-1 ring-primary/50"
              )}
            >
              <span className={cn(
                "text-sm font-medium",
                isTodayDate ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                isPastDate && !isTodayDate && "text-muted-foreground"
              )}>
                {date.getDate()}
              </span>
              {dayWorkouts.length > 0 && (
                <div className="mt-0.5 flex gap-0.5 flex-wrap justify-center">
                  {dayWorkouts.slice(0, 3).map((w, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full",
                        w.type === "single_exercise" ? "w-1.5 bg-primary/60" : "w-1.5",
                        statusColors[w.status]
                      )}
                    />
                  ))}
                  {dayWorkouts.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{dayWorkouts.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected Date Details */}
      {selectedDate && selectedDateObj && (
        <div className="mt-4 border-t border-border px-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase text-foreground">
                {selectedDateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </h4>
              {clientName && <p className="text-xs text-muted-foreground">{clientName}&apos;s schedule</p>}
            </div>
            {!readOnly && !isPast(selectedDateObj) && (
              <button
                onClick={() => setShowAddSheet(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold uppercase text-primary-foreground transition-all hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )}
          </div>

          {selectedDateWorkouts.length > 0 ? (
            <div className="mt-3 space-y-2">
              {selectedDateWorkouts.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-xl bg-card p-3">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    item.status === "completed" ? "bg-emerald-500/20"
                      : item.status === "missed" ? "bg-red-500/20"
                      : item.type === "single_exercise" ? "bg-primary/10"
                      : "bg-primary/20"
                  )}>
                    {item.type === "single_exercise"
                      ? <ListChecks className={cn("h-5 w-5", item.status === "completed" ? "text-emerald-400" : "text-primary")} />
                      : <Dumbbell className={cn("h-5 w-5", item.status === "completed" ? "text-emerald-400" : item.status === "missed" ? "text-red-400" : "text-primary")} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-sm text-foreground">{item.title}</p>
                      {item.type === "single_exercise" && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
                          Exercise
                        </span>
                      )}
                    </div>
                    {item.type === "single_exercise" ? (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{item.sets} sets</span>
                        {item.reps && <span>{item.reps} reps</span>}
                        {item.weight && <span className="text-primary">{item.weight}</span>}
                        {item.rest && <span>Rest: {item.rest}</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.duration}</span>
                      </div>
                    )}
                  </div>
                  {!readOnly && item.status === "scheduled" && onRemoveWorkout && (
                    <button
                      onClick={() => onRemoveWorkout(item.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {item.status === "completed" && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Dumbbell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled</p>
              {!readOnly && !isPast(selectedDateObj) && (
                <button onClick={() => setShowAddSheet(true)} className="mt-2 text-sm font-medium text-primary">
                  Add workout or exercise
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Sheet */}
      {showAddSheet && selectedDate && (
        <AddSheet
          selectedDate={selectedDate}
          availableWorkouts={availableWorkouts}
          onSelectWorkout={handleSelectWorkout}
          onScheduleExercise={handleScheduleExercise}
          onClose={() => setShowAddSheet(false)}
        />
      )}
    </div>
  )
}
