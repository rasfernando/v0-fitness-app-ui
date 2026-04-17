"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Minus, Trash2, Check, ChevronDown, ChevronUp, Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"
import { useExercises, type ExerciseOption } from "@/lib/hooks/use-exercises"
import { useAuth } from "@/lib/auth"
import { saveQuickLog, type QuickLogExerciseEntry } from "@/lib/mutations/quick-log"

interface SetEntry {
  reps: string
  weight: string
}

interface ExerciseEntry {
  exercise: ExerciseOption
  sets: SetEntry[]
  collapsed: boolean
}

export function QuickLogScreen({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth()
  const { data: exerciseLib, loading: exercisesLoading } = useExercises()

  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  })
  const [entries, setEntries] = useState<ExerciseEntry[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("All")

  // Unique categories for filter pills
  const categories = useMemo(() => {
    const cats = Array.from(new Set(exerciseLib.map((e) => e.category))).sort()
    return ["All", ...cats]
  }, [exerciseLib])

  // Filtered exercise list
  const filteredExercises = useMemo(() => {
    const alreadyAdded = new Set(entries.map((e) => e.exercise.id))
    return exerciseLib.filter((ex) => {
      if (alreadyAdded.has(ex.id)) return false
      if (categoryFilter !== "All" && ex.category !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          ex.name.toLowerCase().includes(q) ||
          ex.muscleGroup.toLowerCase().includes(q) ||
          ex.category.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [exerciseLib, searchQuery, categoryFilter, entries])

  // ── Exercise picker handlers ──────────────────────────────────────────────

  const addExercise = (ex: ExerciseOption) => {
    setEntries((prev) => [
      ...prev,
      {
        exercise: ex,
        sets: [{ reps: "", weight: "" }],
        collapsed: false,
      },
    ])
    setShowPicker(false)
    setSearchQuery("")
    setCategoryFilter("All")
  }

  const removeExercise = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  const toggleCollapse = (idx: number) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, collapsed: !e.collapsed } : e))
    )
  }

  // ── Set handlers ──────────────────────────────────────────────────────────

  const addSet = (exIdx: number) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: [...e.sets, { reps: "", weight: "" }] } : e
      )
    )
  }

  const removeSet = (exIdx: number, setIdx: number) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, si) => si !== setIdx) } : e
      )
    )
  }

  const updateSet = (exIdx: number, setIdx: number, field: "reps" | "weight", value: string) => {
    // Only allow numbers and decimal for weight
    if (field === "weight" && value && !/^\d*\.?\d*$/.test(value)) return
    if (field === "reps" && value && !/^\d*$/.test(value)) return

    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIdx
          ? {
              ...e,
              sets: e.sets.map((s, si) =>
                si === setIdx ? { ...s, [field]: value } : s
              ),
            }
          : e
      )
    )
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) return
    setError(null)

    // Validate: at least one exercise with at least one set with valid reps (> 0)
    const validEntries = entries.filter((e) =>
      e.sets.some((s) => {
        const reps = parseInt(s.reps, 10)
        return Number.isFinite(reps) && reps > 0
      })
    )
    if (validEntries.length === 0) {
      setError("Log at least one set with reps greater than zero")
      return
    }

    setSaving(true)
    try {
      const exerciseData: QuickLogExerciseEntry[] = validEntries.map((e) => ({
        exerciseId: e.exercise.id,
        exerciseName: e.exercise.name,
        sets: e.sets
          .filter((s) => {
            const reps = parseInt(s.reps, 10)
            return Number.isFinite(reps) && reps > 0
          })
          .map((s) => ({
            reps: parseInt(s.reps, 10),
            weightKg: s.weight ? Math.max(0, parseFloat(s.weight)) : null,
          })),
      }))

      await saveQuickLog({
        clientId: user.id,
        clientName: user.displayName,
        date,
        exercises: exerciseData,
      })

      setSuccess(true)
      // Reset after a short pause so the user sees the confirmation
      setTimeout(() => {
        setEntries([])
        setSuccess(false)
        onSaved?.()
      }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      setError(msg)
      console.error("Quick log save error:", err)
    } finally {
      setSaving(false)
    }
  }

  // ── Total sets count ──────────────────────────────────────────────────────
  const totalSets = entries.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.reps.trim() !== "").length,
    0
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col px-4 pb-28 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight text-foreground">
          Quick Log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log what you did — pick exercises, enter your sets.
        </p>
      </div>

      {/* Date picker */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Exercises list */}
      {entries.length > 0 && (
        <div className="mb-4 space-y-3">
          {entries.map((entry, exIdx) => (
            <ExerciseCard
              key={entry.exercise.id}
              entry={entry}
              exIdx={exIdx}
              onToggleCollapse={() => toggleCollapse(exIdx)}
              onRemove={() => removeExercise(exIdx)}
              onAddSet={() => addSet(exIdx)}
              onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
              onUpdateSet={(setIdx, field, value) =>
                updateSet(exIdx, setIdx, field, value)
              }
            />
          ))}
        </div>
      )}

      {/* Add exercise button / picker */}
      {showPicker ? (
        <ExercisePicker
          loading={exercisesLoading}
          exercises={filteredExercises}
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={addExercise}
          onClose={() => {
            setShowPicker(false)
            setSearchQuery("")
            setCategoryFilter("All")
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Add Exercise
        </button>
      )}

      {/* Error / Success */}
      {error && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          Workout logged!
        </div>
      )}

      {/* Save button */}
      {entries.length > 0 && !success && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || totalSets === 0}
          className={cn(
            "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold uppercase tracking-wider transition-all",
            saving || totalSets === 0
              ? "bg-secondary text-muted-foreground"
              : "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-[1.02]"
          )}
        >
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Saving…
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              Save Log ({totalSets} {totalSets === 1 ? "set" : "sets"})
            </>
          )}
        </button>
      )}

      {/* Empty state */}
      {entries.length === 0 && !showPicker && (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Dumbbell className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Tap "Add Exercise" to start logging
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ExerciseCard({
  entry,
  exIdx,
  onToggleCollapse,
  onRemove,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
}: {
  entry: ExerciseEntry
  exIdx: number
  onToggleCollapse: () => void
  onRemove: () => void
  onAddSet: () => void
  onRemoveSet: (setIdx: number) => void
  onUpdateSet: (setIdx: number, field: "reps" | "weight", value: string) => void
}) {
  const filledSets = entry.sets.filter((s) => s.reps.trim() !== "").length

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Exercise header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={onToggleCollapse} className="flex flex-1 items-center gap-2">
          {entry.collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{entry.exercise.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {entry.exercise.muscleGroup || entry.exercise.category} · {filledSets}/{entry.sets.length} sets
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Sets (collapsible) */}
      {!entry.collapsed && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          {/* Column headers */}
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="w-8 text-center">Set</span>
            <span className="flex-1 text-center">Reps</span>
            {entry.exercise.usesWeight && (
              <span className="flex-1 text-center">kg</span>
            )}
            <span className="w-8" />
          </div>

          {entry.sets.map((set, setIdx) => (
            <div key={setIdx} className="mb-1.5 flex items-center gap-2">
              <span className="w-8 text-center text-xs font-medium text-muted-foreground">
                {setIdx + 1}
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={set.reps}
                onChange={(e) => onUpdateSet(setIdx, "reps", e.target.value)}
                className="flex-1 rounded-lg border border-border bg-secondary/50 px-2 py-2 text-center text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
              {entry.exercise.usesWeight && (
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={set.weight}
                  onChange={(e) => onUpdateSet(setIdx, "weight", e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-secondary/50 px-2 py-2 text-center text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}
              <button
                type="button"
                onClick={() => onRemoveSet(setIdx)}
                disabled={entry.sets.length <= 1}
                className={cn(
                  "w-8 rounded-lg p-1.5 text-center",
                  entry.sets.length <= 1
                    ? "text-muted-foreground/30"
                    : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                )}
              >
                <Minus className="mx-auto h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={onAddSet}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" />
            Add Set
          </button>
        </div>
      )}
    </div>
  )
}

function ExercisePicker({
  loading,
  exercises,
  categories,
  categoryFilter,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  onSelect,
  onClose,
}: {
  loading: boolean
  exercises: ExerciseOption[]
  categories: string[]
  categoryFilter: string
  onCategoryChange: (cat: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onSelect: (ex: ExerciseOption) => void
  onClose: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-sm font-semibold text-foreground">Pick Exercise</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-2.5 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search exercises…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
              categoryFilter === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="max-h-[40vh] overflow-y-auto px-1 pb-2">
        {loading ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            Loading exercises…
          </div>
        ) : exercises.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            No exercises found
          </div>
        ) : (
          exercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => onSelect(ex)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary/80"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{ex.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {ex.muscleGroup || ex.category}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
