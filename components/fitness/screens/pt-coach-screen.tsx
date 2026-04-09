"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  UserPlus,
  Check,
  Users,
  Flame,
  Dumbbell,
  Calendar,
  CheckCircle2,
  Loader2,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkoutCalendar, ScheduledWorkout } from "@/components/fitness/workout-calendar"
import { useClients, type PTClientSummary } from "@/lib/hooks/use-clients"
import { useScheduledWorkouts } from "@/lib/hooks/use-scheduled-workouts"
import { useWorkouts, type WorkoutSummary } from "@/lib/hooks/use-workouts"
import { useNotifications } from "@/lib/hooks/use-notifications"
import {
  scheduleWorkoutForClient,
  scheduleSingleExerciseForClient,
  unscheduleWorkout,
} from "@/lib/mutations/scheduling"
import {
  addClientRelationship,
  searchAvailableClients,
} from "@/lib/mutations/clients"
import { useAuth } from "@/lib/auth"
import { Avatar } from "@/components/fitness/avatar"
import { NotificationsPanel } from "@/components/fitness/notifications-panel"

// LibraryWorkout was a hardcoded local interface; it's now an alias for the
// WorkoutSummary returned by useWorkouts(), which is the same shape but
// backed by real database rows.
type LibraryWorkout = WorkoutSummary

// ─── Add Client Sheet ─────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  displayName: string
  username: string
  avatarUrl: string | null
}

function AddClientSheet({
  ptId,
  onClose,
  onAdded,
}: {
  ptId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(true) // true on mount so user sees spinner immediately
  const [searchError, setSearchError] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [addError, setAddError] = useState<string | null>(null)

  // Debounced search — fires 300ms after the user stops typing
  useEffect(() => {
    setSearching(true)
    setSearchError(null)
    const timer = setTimeout(async () => {
      try {
        const data = await searchAvailableClients(ptId, searchQuery)
        setResults(data)
      } catch (err) {
        console.error("searchAvailableClients failed:", err)
        setSearchError(err instanceof Error ? err.message : "Search failed")
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, ptId])

  const handleAdd = async (clientId: string) => {
    setAddError(null)
    try {
      await addClientRelationship(ptId, clientId)
      setJustAdded((prev) => new Set([...prev, clientId]))
      onAdded()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add client")
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="rounded-t-2xl bg-card shadow-xl pb-8">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
              Add Client
            </h3>
            <p className="text-xs text-muted-foreground">Search for clients to add</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {addError && (
          <div className="mx-5 mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {addError}
          </div>
        )}

        <div className="relative mx-5 mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 pb-safe scrollbar-hide">
          <div className="space-y-2 pb-6">
            {searchError ? (
              <div className="py-4 text-center">
                <p className="text-xs text-destructive">{searchError}</p>
              </div>
            ) : searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No clients found
                </p>
              </div>
            ) : (
              results.map((user) => {
                const added = justAdded.has(user.id)
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-xl bg-secondary p-3"
                  >
                    <Avatar
                      src={user.avatarUrl}
                      name={user.displayName}
                      id={user.id}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                    <button
                      onClick={() => !added && handleAdd(user.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
                        added
                          ? "bg-emerald-600/20 text-emerald-400"
                          : "bg-primary text-primary-foreground hover:brightness-110"
                      )}
                    >
                      {added ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Added
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Client Profile View with Calendar ────────────────────────────────────────

function ClientProfileView({
  client,
  availableWorkouts,
  onBack,
  onStartLiveSession,
}: {
  client: PTClientSummary
  availableWorkouts: LibraryWorkout[]
  onBack: () => void
  onStartLiveSession?: (clientId: string, clientName: string) => void
}) {
  const { user: currentUser } = useAuth()

  // Per-client schedule loaded from Supabase
  const {
    data: realSchedule,
    error: scheduleError,
    refetch: refetchSchedule,
  } = useScheduledWorkouts(client.id)

  const [mutationError, setMutationError] = useState<string | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  const calendarSchedule: ScheduledWorkout[] = useMemo(
    () =>
      realSchedule.map((r) => ({
        id: r.id,
        workoutId: r.workoutId,
        title: r.title,
        category: r.category,
        duration: r.duration,
        date: r.date,
        status: r.status === "skipped" ? "missed" : r.status,
      })),
    [realSchedule]
  )

  const scheduledCount = calendarSchedule.filter((w) => w.status === "scheduled").length
  const completedCount = calendarSchedule.filter((w) => w.status === "completed").length

  const handleScheduleWorkout = async (date: string, workout: LibraryWorkout) => {
    setMutationError(null)
    setIsMutating(true)
    try {
      await scheduleWorkoutForClient({
        clientId: client.id,
        ptId: currentUser!.id,
        ptName: currentUser!.displayName,
        workoutId: workout.id,
        workoutTitle: workout.title,
        scheduledDate: date,
      })
      refetchSchedule()
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to schedule workout")
    } finally {
      setIsMutating(false)
    }
  }

  const handleScheduleExercise = async (
    date: string,
    exercise: Omit<ScheduledWorkout, "id" | "date" | "status">
  ) => {
    setMutationError(null)
    setIsMutating(true)
    try {
      await scheduleSingleExerciseForClient({
        clientId: client.id,
        ptId: currentUser!.id,
        ptName: currentUser!.displayName,
        exerciseName: exercise.title,
        category: exercise.category,
        sets: exercise.sets ?? 3,
        prescription: exercise.reps ?? "10",
        weightKg: exercise.weight ? parseFloat(exercise.weight) : undefined,
        restSeconds: exercise.rest ? parseInt(exercise.rest, 10) : undefined,
        scheduledDate: date,
      })
      refetchSchedule()
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to schedule exercise")
    } finally {
      setIsMutating(false)
    }
  }

  const handleRemoveWorkout = async (scheduledWorkoutId: string) => {
    setMutationError(null)
    setIsMutating(true)
    try {
      await unscheduleWorkout(scheduledWorkoutId)
      refetchSchedule()
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to remove workout")
    } finally {
      setIsMutating(false)
    }
  }

  const joinedDate = new Date(client.joinedAt).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  })

  return (
    <div className="flex min-h-full flex-col bg-background pb-8">
      {scheduleError && (
        <div className="mx-4 mt-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Failed to load schedule: {scheduleError}
        </div>
      )}
      {mutationError && (
        <div className="mx-4 mt-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {mutationError}
        </div>
      )}
      {isMutating && (
        <div className="mx-4 mt-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          Saving…
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/95 px-4 pb-4 pt-3 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-foreground">
          {client.name}
        </h1>
      </div>

      {/* Profile Summary */}
      <div className="flex items-center gap-4 px-4 pb-4">
        <div className="relative">
          <Avatar
            src={client.avatarUrl}
            name={client.name}
            id={client.id}
            size="h-16 w-16"
            className="ring-2 ring-primary"
          />
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">@{client.username}</p>
          <p className="text-xs text-muted-foreground">
            Client since {joinedDate}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-4 grid grid-cols-2 gap-2 px-4">
        <div className="flex flex-col items-center rounded-xl bg-card p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
            {scheduledCount}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Scheduled</p>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-card p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
            {completedCount}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
        </div>
      </div>

      {/* Live Session Button */}
      {onStartLiveSession && (
        <div className="mb-4 px-4">
          <button
            onClick={() => onStartLiveSession(client.id, client.name)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] hover:brightness-110"
          >
            <Dumbbell className="h-5 w-5" />
            Start Live Session
          </button>
        </div>
      )}

      {/* Calendar Section */}
      <div className="px-4">
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-sm font-bold uppercase text-foreground">
          Training Schedule
        </h3>
        <div className="rounded-xl bg-card">
          <WorkoutCalendar
            scheduledWorkouts={calendarSchedule}
            availableWorkouts={availableWorkouts}
            onScheduleWorkout={handleScheduleWorkout}
            onScheduleExercise={handleScheduleExercise}
            onRemoveWorkout={handleRemoveWorkout}
            clientName={client.name}
            messageRecipientId={client.id}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main PT Coach Screen ─────────────────────────────────────────────────────

interface PTCoachScreenProps {
  onStartLiveSession?: (clientId: string, clientName: string) => void
}

export function PTCoachScreen({ onStartLiveSession }: PTCoachScreenProps) {
  const { user } = useAuth()
  const { data: clientSummaries, error: clientsError, refetch: refetchClients } = useClients()
  const { data: availableWorkouts, error: workoutsError } = useWorkouts()
  const { unreadCount } = useNotifications()

  const [searchQuery, setSearchQuery] = useState("")
  const [showAddClient, setShowAddClient] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedClient, setSelectedClient] = useState<PTClientSummary | null>(null)

  const filteredClients = useMemo(
    () =>
      clientSummaries.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.username.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [clientSummaries, searchQuery]
  )

  const totalScheduled = clientSummaries.reduce((sum, c) => sum + c.scheduledCount, 0)
  const totalCompleted = clientSummaries.reduce((sum, c) => sum + c.completedCount, 0)

  const handleClientAdded = useCallback(() => {
    refetchClients()
  }, [refetchClients])

  // Client Profile View
  if (selectedClient) {
    return (
      <ClientProfileView
        client={selectedClient}
        availableWorkouts={availableWorkouts}
        onBack={() => setSelectedClient(null)}
        onStartLiveSession={onStartLiveSession}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            My Clients
          </h1>
          <p className="text-sm text-muted-foreground">
            {clientSummaries.length} client{clientSummaries.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowNotifications(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center rounded-xl bg-card p-3">
          <Users className="h-4 w-4 text-primary" />
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
            {clientSummaries.length}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Clients</p>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-card p-3">
          <Calendar className="h-4 w-4 text-primary" />
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
            {totalScheduled}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Scheduled</p>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-card p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
            {totalCompleted}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2 px-4 pb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setShowAddClient(true)}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          <UserPlus className="h-4 w-4" />
          Add
        </button>
      </div>

      {clientsError && (
        <div className="mx-4 mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {clientsError}
        </div>
      )}

      {/* Client List */}
      <div className="flex-1 px-4">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No clients match your search" : "No clients yet"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddClient(true)}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Add your first client
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="flex w-full items-center gap-3 rounded-xl bg-card p-4 text-left transition-colors hover:bg-card/80"
              >
                <Avatar
                  src={client.avatarUrl}
                  name={client.name}
                  id={client.id}
                  size="h-12 w-12"
                  className="ring-2 ring-border"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{client.name}</p>
                  <p className="text-xs text-muted-foreground">@{client.username}</p>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      {client.scheduledCount} upcoming
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      {client.completedCount} done
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Sheet */}
      {showAddClient && user && (
        <AddClientSheet
          ptId={user.id}
          onClose={() => setShowAddClient(false)}
          onAdded={handleClientAdded}
        />
      )}

      {/* Notifications Panel */}
      <NotificationsPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  )
}
