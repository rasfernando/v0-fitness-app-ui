"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Plus, Dumbbell, Clock, X, Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScheduledWorkout {
  id: string
  workoutId: string
  title: string
  category: string
  duration: string
  date: string // YYYY-MM-DD
  status: "scheduled" | "completed" | "missed"
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
  onRemoveWorkout?: (workoutId: string) => void
  readOnly?: boolean
  clientName?: string
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
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

export function WorkoutCalendar({
  scheduledWorkouts,
  availableWorkouts = [],
  onScheduleWorkout,
  onRemoveWorkout,
  readOnly = false,
  clientName,
}: WorkoutCalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Add days from previous month to fill the first week
    const startDayOfWeek = firstDay.getDay()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth, -i)
      days.push({ date, isCurrentMonth: false })
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(currentYear, currentMonth, i)
      days.push({ date, isCurrentMonth: true })
    }

    // Add days from next month to complete the grid
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

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isPast = (date: Date) => {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return dateOnly < todayOnly
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return
    const dateKey = formatDateKey(date)
    setSelectedDate(dateKey)
  }

  const handleAddWorkout = () => {
    if (!selectedDate || readOnly) return
    setShowWorkoutPicker(true)
  }

  const handleSelectWorkout = (workout: CalendarWorkout) => {
    if (!selectedDate || !onScheduleWorkout) return
    onScheduleWorkout(selectedDate, workout)
    setShowWorkoutPicker(false)
    setSearchQuery("")
  }

  const selectedDateWorkouts = selectedDate ? workoutsByDate.get(selectedDate) || [] : []
  const selectedDateObj = selectedDate ? new Date(selectedDate + "T00:00:00") : null

  const filteredAvailableWorkouts = availableWorkouts.filter(
    (w) =>
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          <div
            key={day}
            className="py-2 text-center text-xs font-medium uppercase text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 px-2">
        {daysInMonth.map(({ date, isCurrentMonth }, index) => {
          const dateKey = formatDateKey(date)
          const dayWorkouts = workoutsByDate.get(dateKey) || []
          const hasWorkouts = dayWorkouts.length > 0
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
              <span
                className={cn(
                  "text-sm font-medium",
                  isTodayDate && "text-primary",
                  !isTodayDate && isCurrentMonth && "text-foreground",
                  isPastDate && !isTodayDate && "text-muted-foreground"
                )}
              >
                {date.getDate()}
              </span>
              {hasWorkouts && (
                <div className="mt-0.5 flex gap-0.5">
                  {dayWorkouts.slice(0, 3).map((w, i) => (
                    <span
                      key={i}
                      className={cn("h-1.5 w-1.5 rounded-full", statusColors[w.status])}
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
                {selectedDateObj.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h4>
              {clientName && (
                <p className="text-xs text-muted-foreground">{clientName}&apos;s schedule</p>
              )}
            </div>
            {!readOnly && !isPast(selectedDateObj) && (
              <button
                onClick={handleAddWorkout}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold uppercase text-primary-foreground transition-all hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )}
          </div>

          {selectedDateWorkouts.length > 0 ? (
            <div className="mt-3 space-y-2">
              {selectedDateWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center gap-3 rounded-xl bg-card p-3"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      workout.status === "completed"
                        ? "bg-emerald-500/20"
                        : workout.status === "missed"
                        ? "bg-red-500/20"
                        : "bg-primary/20"
                    )}
                  >
                    <Dumbbell
                      className={cn(
                        "h-5 w-5",
                        workout.status === "completed"
                          ? "text-emerald-400"
                          : workout.status === "missed"
                          ? "text-red-400"
                          : "text-primary"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-sm text-foreground">{workout.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{workout.category}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {workout.duration}
                      </span>
                    </div>
                  </div>
                  {!readOnly && workout.status === "scheduled" && onRemoveWorkout && (
                    <button
                      onClick={() => onRemoveWorkout(workout.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {workout.status === "completed" && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
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
              <p className="mt-2 text-sm text-muted-foreground">No workouts scheduled</p>
              {!readOnly && !isPast(selectedDateObj) && (
                <button
                  onClick={handleAddWorkout}
                  className="mt-2 text-sm font-medium text-primary"
                >
                  Add a workout
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Workout Picker Modal */}
      {showWorkoutPicker && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div
            className="flex-1 bg-background/60 backdrop-blur-sm"
            onClick={() => {
              setShowWorkoutPicker(false)
              setSearchQuery("")
            }}
          />
          <div className="rounded-t-2xl bg-card shadow-xl">
            <div className="flex justify-center pt-3">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                  Schedule Workout
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedDateObj?.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWorkoutPicker(false)
                  setSearchQuery("")
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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

            <div className="max-h-72 overflow-y-auto px-5 pb-6 scrollbar-hide">
              <div className="space-y-2">
                {filteredAvailableWorkouts.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => handleSelectWorkout(workout)}
                    className="flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-left transition-all hover:bg-secondary/80"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={workout.imageUrl}
                        alt={workout.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-foreground text-sm">
                        {workout.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {workout.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3 w-3" />
                          {workout.exercises} exercises
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        difficultyColor[workout.difficulty]
                      )}
                    >
                      {workout.difficulty}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
