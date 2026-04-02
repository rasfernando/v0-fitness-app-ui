"use client"

import { useState, useMemo } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkoutCalendar, ScheduledWorkout } from "@/components/fitness/workout-calendar"

// ─── Data ────────────────────────────────────────────────────────────────────

interface AppUser {
  id: string
  name: string
  username: string
  avatarUrl: string
  isClient: boolean
  joinedDate?: string
  lastActive?: string
  workoutsCompleted?: number
  currentStreak?: number
  scheduledWorkouts?: ScheduledWorkout[]
}

interface LibraryWorkout {
  id: string
  title: string
  category: string
  duration: string
  calories: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  exercises: number
  imageUrl: string
}

const initialUsers: AppUser[] = [
  {
    id: "u1",
    name: "Sophie Clarke",
    username: "@sophiefits",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    isClient: true,
    joinedDate: "Jan 2026",
    lastActive: "Today",
    workoutsCompleted: 24,
    currentStreak: 7,
    scheduledWorkouts: [
      { id: "sw1", workoutId: "w1", title: "Full Body Burn", category: "Strength", duration: "45 min", date: "2026-04-03", status: "scheduled" },
      { id: "sw2", workoutId: "w2", title: "HIIT Cardio Blast", category: "Cardio", duration: "30 min", date: "2026-04-05", status: "scheduled" },
      { id: "sw3", workoutId: "w3", title: "Core Crusher", category: "Core", duration: "20 min", date: "2026-04-01", status: "completed" },
    ],
  },
  {
    id: "u2",
    name: "James Hartwell",
    username: "@james_lifts",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    isClient: true,
    joinedDate: "Feb 2026",
    lastActive: "2h ago",
    workoutsCompleted: 12,
    currentStreak: 3,
    scheduledWorkouts: [
      { id: "sw4", workoutId: "w4", title: "Upper Body Power", category: "Strength", duration: "40 min", date: "2026-04-04", status: "scheduled" },
    ],
  },
  {
    id: "u3",
    name: "Mia Tran",
    username: "@miatran",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
    isClient: true,
    joinedDate: "Mar 2026",
    lastActive: "Yesterday",
    workoutsCompleted: 8,
    currentStreak: 0,
    scheduledWorkouts: [],
  },
  {
    id: "u4",
    name: "Daniel Brooks",
    username: "@dbrooks_fit",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    isClient: false,
  },
  {
    id: "u5",
    name: "Priya Shah",
    username: "@priyaactive",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
    isClient: false,
  },
  {
    id: "u6",
    name: "Tom Ellison",
    username: "@tomellison",
    avatarUrl: "https://images.unsplash.com/photo-1548449112-96a38a643324?w=200&q=80",
    isClient: false,
  },
  {
    id: "u7",
    name: "Rachel Kim",
    username: "@rachelkimfit",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    isClient: false,
  },
  {
    id: "u8",
    name: "Marcus Webb",
    username: "@marcuswebb",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    isClient: false,
  },
]

const libraryWorkouts: LibraryWorkout[] = [
  {
    id: "w1", title: "Full Body Burn", category: "Strength", duration: "45 min",
    calories: "450 cal", difficulty: "Intermediate", exercises: 12,
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&q=80",
  },
  {
    id: "w2", title: "HIIT Cardio Blast", category: "Cardio", duration: "30 min",
    calories: "380 cal", difficulty: "Advanced", exercises: 8,
    imageUrl: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=300&q=80",
  },
  {
    id: "w3", title: "Core Crusher", category: "Core", duration: "20 min",
    calories: "180 cal", difficulty: "Beginner", exercises: 10,
    imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&q=80",
  },
  {
    id: "w4", title: "Upper Body Power", category: "Strength", duration: "40 min",
    calories: "320 cal", difficulty: "Intermediate", exercises: 10,
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=300&q=80",
  },
  {
    id: "w5", title: "Leg Day Destroyer", category: "Strength", duration: "50 min",
    calories: "520 cal", difficulty: "Advanced", exercises: 14,
    imageUrl: "https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=300&q=80",
  },
  {
    id: "w6", title: "Morning Mobility", category: "Recovery", duration: "15 min",
    calories: "80 cal", difficulty: "Beginner", exercises: 8,
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&q=80",
  },
]

// ─── Add Client Sheet ─────────────────────────────────────────────────────────

function AddClientSheet({
  users,
  onClose,
  onAdd,
}: {
  users: AppUser[]
  onClose: () => void
  onAdd: (userId: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())

  const nonClients = users.filter((u) => !u.isClient)

  const filtered = nonClients.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAdd = (userId: string) => {
    setJustAdded((prev) => new Set([...prev, userId]))
    onAdd(userId)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="rounded-t-2xl bg-card shadow-xl">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
              Add Client
            </h3>
            <p className="text-xs text-muted-foreground">Search app users to add</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mx-5 mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="max-h-80 overflow-y-auto px-5 scrollbar-hide">
          <div className="space-y-2 pb-6">
            {filtered.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            ) : (
              filtered.map((user) => {
                const added = justAdded.has(user.id)
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-xl bg-secondary p-3"
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.username}</p>
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
  onBack,
  onScheduleWorkout,
  onScheduleExercise,
  onRemoveWorkout,
}: {
  client: AppUser
  onBack: () => void
  onScheduleWorkout: (date: string, workout: LibraryWorkout) => void
  onScheduleExercise: (date: string, exercise: Omit<ScheduledWorkout, "id" | "date" | "status">) => void
  onRemoveWorkout: (workoutId: string) => void
}) {
  const scheduledCount = client.scheduledWorkouts?.filter(w => w.status === "scheduled").length || 0
  const completedCount = client.scheduledWorkouts?.filter(w => w.status === "completed").length || 0

  return (
    <div className="flex min-h-full flex-col bg-background pb-8">
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
          <img
            src={client.avatarUrl}
            alt={client.name}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-primary"
          />
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{client.username}</p>
          <p className="text-xs text-muted-foreground">
            Client since {client.joinedDate} · Active {client.lastActive}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-4 grid grid-cols-3 gap-2 px-4">
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
        <div className="flex flex-col items-center rounded-xl bg-card p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
            {client.currentStreak}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Streak</p>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="px-4">
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-sm font-bold uppercase text-foreground">
          Training Schedule
        </h3>
        <div className="rounded-xl bg-card">
          <WorkoutCalendar
            scheduledWorkouts={client.scheduledWorkouts || []}
            availableWorkouts={libraryWorkouts}
            onScheduleWorkout={onScheduleWorkout}
            onScheduleExercise={onScheduleExercise}
            onRemoveWorkout={onRemoveWorkout}
            clientName={client.name}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main PT Coach Screen ─────────────────────────────────────────────────────

export function PTCoachScreen() {
  const [users, setUsers] = useState<AppUser[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddClient, setShowAddClient] = useState(false)
  const [selectedClient, setSelectedClient] = useState<AppUser | null>(null)

  const clients = useMemo(() => users.filter((u) => u.isClient), [users])

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalScheduled = clients.reduce(
    (sum, c) => sum + (c.scheduledWorkouts?.filter(w => w.status === "scheduled").length || 0),
    0
  )
  const totalCompleted = clients.reduce(
    (sum, c) => sum + (c.scheduledWorkouts?.filter(w => w.status === "completed").length || 0),
    0
  )

  const handleAddClient = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, isClient: true, joinedDate: "Apr 2026", lastActive: "Just now", workoutsCompleted: 0, currentStreak: 0, scheduledWorkouts: [] }
          : u
      )
    )
  }

  const handleScheduleExercise = (clientId: string, date: string, exercise: Omit<ScheduledWorkout, "id" | "date" | "status">) => {
    const newEntry: ScheduledWorkout = {
      id: `sw-${Date.now()}`,
      date,
      status: "scheduled",
      ...exercise,
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id !== clientId ? u : { ...u, scheduledWorkouts: [...(u.scheduledWorkouts || []), newEntry] }
      )
    )
    setSelectedClient((prev) =>
      !prev || prev.id !== clientId ? prev : {
        ...prev,
        scheduledWorkouts: [...(prev.scheduledWorkouts || []), newEntry],
      }
    )
  }

  const handleScheduleWorkout = (clientId: string, date: string, workout: LibraryWorkout) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== clientId) return u
        const newWorkout: ScheduledWorkout = {
          id: `sw-${Date.now()}`,
          workoutId: workout.id,
          title: workout.title,
          category: workout.category,
          duration: workout.duration,
          date,
          status: "scheduled",
        }
        return {
          ...u,
          scheduledWorkouts: [...(u.scheduledWorkouts || []), newWorkout],
        }
      })
    )
    // Update selected client reference
    setSelectedClient((prev) => {
      if (!prev || prev.id !== clientId) return prev
      const newWorkout: ScheduledWorkout = {
        id: `sw-${Date.now()}`,
        workoutId: workout.id,
        title: workout.title,
        category: workout.category,
        duration: workout.duration,
        date,
        status: "scheduled",
      }
      return {
        ...prev,
        scheduledWorkouts: [...(prev.scheduledWorkouts || []), newWorkout],
      }
    })
  }

  const handleRemoveWorkout = (clientId: string, workoutId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== clientId) return u
        return {
          ...u,
          scheduledWorkouts: u.scheduledWorkouts?.filter((w) => w.id !== workoutId) || [],
        }
      })
    )
    setSelectedClient((prev) => {
      if (!prev || prev.id !== clientId) return prev
      return {
        ...prev,
        scheduledWorkouts: prev.scheduledWorkouts?.filter((w) => w.id !== workoutId) || [],
      }
    })
  }

  // Client Profile View
  if (selectedClient) {
    return (
      <ClientProfileView
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
        onScheduleWorkout={(date, workout) => handleScheduleWorkout(selectedClient.id, date, workout)}
        onScheduleExercise={(date, exercise) => handleScheduleExercise(selectedClient.id, date, exercise)}
        onRemoveWorkout={(workoutId) => handleRemoveWorkout(selectedClient.id, workoutId)}
      />
    )
  }

  // Main Client Roster View
  return (
    <div className="flex min-h-full flex-col bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 px-4 pb-4 pt-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            My Clients
          </h1>
          <button
            onClick={() => setShowAddClient(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-all hover:brightness-110"
          >
            <UserPlus className="h-4 w-4" />
            Add
          </button>
        </div>

        {/* Stats Overview */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card p-3 text-center">
            <div className="flex justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
              {clients.length}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Clients</p>
          </div>
          <div className="rounded-xl bg-card p-3 text-center">
            <div className="flex justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
              {totalScheduled}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Scheduled</p>
          </div>
          <div className="rounded-xl bg-card p-3 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
              {totalCompleted}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 px-4">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {searchQuery ? "No clients match your search" : "No clients yet"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddClient(true)}
                className="mt-2 text-sm font-medium text-primary"
              >
                Add your first client
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const scheduledCount = client.scheduledWorkouts?.filter(w => w.status === "scheduled").length || 0
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="flex w-full items-center gap-3 rounded-xl bg-card p-4 text-left transition-colors hover:bg-secondary"
                >
                  <div className="relative">
                    <img
                      src={client.avatarUrl}
                      alt={client.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    {scheduledCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {scheduledCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.username}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {client.workoutsCompleted} done
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-orange-400" />
                        {client.currentStreak} streak
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Client Sheet */}
      {showAddClient && (
        <AddClientSheet
          users={users}
          onClose={() => setShowAddClient(false)}
          onAdd={handleAddClient}
        />
      )}
    </div>
  )
}
