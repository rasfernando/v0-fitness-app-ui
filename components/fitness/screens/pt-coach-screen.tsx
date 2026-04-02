"use client"

import { useState, useMemo } from "react"
import {
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  UserPlus,
  Check,
  SendHorizonal,
  Users,
  Flame,
  Clock,
  Dumbbell,
  Calendar,
  TrendingUp,
  MoreVertical,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
  assignedWorkouts?: AssignedWorkout[]
}

interface AssignedWorkout {
  id: string
  title: string
  category: string
  duration: string
  sentDate: string
  status: "pending" | "completed" | "in-progress"
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

const allAppUsers: AppUser[] = [
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
    assignedWorkouts: [
      { id: "aw1", title: "Full Body Burn", category: "Strength", duration: "45 min", sentDate: "2 days ago", status: "completed" },
      { id: "aw2", title: "HIIT Cardio Blast", category: "Cardio", duration: "30 min", sentDate: "Yesterday", status: "in-progress" },
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
    assignedWorkouts: [
      { id: "aw3", title: "Upper Body Power", category: "Strength", duration: "40 min", sentDate: "3 days ago", status: "pending" },
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
    assignedWorkouts: [],
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

// ─── Sub-components ──────────────────────────────────────────────────────────

const difficultyColor: Record<string, string> = {
  Beginner: "bg-emerald-500/20 text-emerald-400",
  Intermediate: "bg-primary/20 text-primary",
  Advanced: "bg-red-500/20 text-red-400",
}

const statusStyle: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  "in-progress": "bg-primary/20 text-primary",
  completed: "bg-emerald-500/20 text-emerald-400",
}

const statusLabel: Record<string, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
}

// ─── Send Workout Sheet ───────────────────────────────────────────────────────

function SendWorkoutSheet({
  clientName,
  onClose,
  onSend,
}: {
  clientName: string
  onClose: () => void
  onSend: (workout: LibraryWorkout) => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorkout, setSelectedWorkout] = useState<LibraryWorkout | null>(null)
  const [sent, setSent] = useState(false)

  const filtered = libraryWorkouts.filter((w) =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSend = () => {
    if (!selectedWorkout) return
    setSent(true)
    setTimeout(() => {
      onSend(selectedWorkout)
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="rounded-t-2xl bg-card shadow-xl">
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
              Send Workout
            </h3>
            <p className="text-xs text-muted-foreground">To {clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
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

        {/* Workout List */}
        <div className="max-h-72 overflow-y-auto px-5 scrollbar-hide">
          <div className="space-y-2 pb-4">
            {filtered.map((workout) => {
              const isSelected = selectedWorkout?.id === workout.id
              return (
                <button
                  key={workout.id}
                  onClick={() => setSelectedWorkout(isSelected ? null : workout)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all",
                    isSelected
                      ? "bg-primary/15 ring-1 ring-primary"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    <img src={workout.imageUrl} alt={workout.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-foreground text-sm">{workout.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{workout.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />{workout.exercises} exercises
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    difficultyColor[workout.difficulty]
                  )}>
                    {workout.difficulty}
                  </span>
                  {isSelected && (
                    <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="border-t border-border p-5 safe-area-pb">
          <button
            onClick={handleSend}
            disabled={!selectedWorkout || sent}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-sm uppercase tracking-wide transition-all",
              selectedWorkout && !sent
                ? "bg-primary text-primary-foreground hover:brightness-110"
                : sent
                ? "bg-emerald-600 text-white"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {sent ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Sent!
              </>
            ) : (
              <>
                <SendHorizonal className="h-5 w-5" />
                {selectedWorkout ? `Send "${selectedWorkout.title}"` : "Select a Workout"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

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

        {/* Search */}
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

        {/* Results */}
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

// ─── Client Profile View ──────────────────────────────────────────────────────

function ClientProfileView({
  client,
  onBack,
  onSendWorkout,
}: {
  client: AppUser
  onBack: () => void
  onSendWorkout: () => void
}) {
  return (
    <div className="flex min-h-full flex-col bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/95 px-4 pb-4 pt-6 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-foreground">
          Client Profile
        </h1>
      </div>

      {/* Profile Hero */}
      <div className="flex flex-col items-center px-4 pb-6 pt-2">
        <div className="relative">
          <img
            src={client.avatarUrl}
            alt={client.name}
            className="h-24 w-24 rounded-full object-cover ring-2 ring-primary"
          />
          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
          {client.name}
        </h2>
        <p className="text-sm text-muted-foreground">{client.username}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Client since {client.joinedDate}
          </span>
          <span>·</span>
          <span>Active {client.lastActive}</span>
        </div>

        {/* Send Workout CTA */}
        <button
          onClick={onSendWorkout}
          className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-all hover:brightness-110"
        >
          <SendHorizonal className="h-4 w-4" />
          Send a Workout
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 px-4">
        <div className="flex flex-col items-center justify-center rounded-xl bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
            {client.workoutsCompleted}
          </p>
          <p className="text-xs text-muted-foreground">Workouts Done</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Flame className="h-5 w-5 text-orange-400" />
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
            {client.currentStreak}
          </p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </div>
      </div>

      {/* Assigned Workouts */}
      <div className="px-4">
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-base font-bold uppercase text-foreground">
          Assigned Workouts
        </h3>

        {client.assignedWorkouts && client.assignedWorkouts.length > 0 ? (
          <div className="space-y-3">
            {client.assignedWorkouts.map((aw) => (
              <div key={aw.id} className="flex items-center gap-3 rounded-xl bg-card p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-sm text-foreground">{aw.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {aw.category} · {aw.duration} · Sent {aw.sentDate}
                  </p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase",
                  statusStyle[aw.status]
                )}>
                  {statusLabel[aw.status]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl bg-card py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <SendHorizonal className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No workouts assigned yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Send your first workout to {client.name.split(" ")[0]}</p>
            <button
              onClick={onSendWorkout}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase text-primary-foreground"
            >
              Send Now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function PTCoachScreen() {
  const [users, setUsers] = useState<AppUser[]>(allAppUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClient, setSelectedClient] = useState<AppUser | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showSendSheet, setShowSendSheet] = useState(false)

  const clients = useMemo(() => users.filter((u) => u.isClient), [users])

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.username?.toLowerCase() ?? "").includes(searchQuery.toLowerCase())
      ),
    [clients, searchQuery]
  )

  const handleAddClient = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isClient: true, joinedDate: "Apr 2026", lastActive: "Just now", workoutsCompleted: 0, currentStreak: 0, assignedWorkouts: [] } : u))
    )
  }

  const handleSendWorkout = (workout: LibraryWorkout) => {
    if (!selectedClient) return
    const newAssigned: AssignedWorkout = {
      id: `aw-${Date.now()}`,
      title: workout.title,
      category: workout.category,
      duration: workout.duration,
      sentDate: "Just now",
      status: "pending",
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedClient.id
          ? { ...u, assignedWorkouts: [newAssigned, ...(u.assignedWorkouts ?? [])] }
          : u
      )
    )
    setSelectedClient((prev) =>
      prev ? { ...prev, assignedWorkouts: [newAssigned, ...(prev.assignedWorkouts ?? [])] } : prev
    )
  }

  // ── Client Detail View ─────────────────────────────────────────────────────
  if (selectedClient) {
    const liveClient = users.find((u) => u.id === selectedClient.id) ?? selectedClient
    return (
      <div className="flex min-h-screen flex-col bg-background pb-24">
        <ClientProfileView
          client={liveClient}
          onBack={() => setSelectedClient(null)}
          onSendWorkout={() => setShowSendSheet(true)}
        />
        {showSendSheet && (
          <SendWorkoutSheet
            clientName={liveClient.name.split(" ")[0]}
            onClose={() => setShowSendSheet(false)}
            onSend={handleSendWorkout}
          />
        )}
      </div>
    )
  }

  // ── Roster View ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 px-4 pb-4 pt-3 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight text-foreground">
              My Clients
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {clients.length} active client{clients.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowAddSheet(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-all hover:brightness-110"
          >
            <UserPlus className="h-4 w-4" />
            Add Client
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl bg-secondary pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 pb-5">
        <div className="flex flex-col items-center justify-center rounded-xl bg-card py-3">
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
            {clients.length}
          </p>
          <p className="text-[11px] text-muted-foreground">Clients</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl bg-card py-3">
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
            {clients.reduce((sum, c) => sum + (c.assignedWorkouts?.length ?? 0), 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">Assigned</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl bg-card py-3">
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
            {clients.reduce((sum, c) => sum + (c.workoutsCompleted ?? 0), 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 px-4">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
              {searchQuery ? "No Clients Found" : "No Clients Yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery ? "Try a different search" : "Add your first client to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddSheet(true)}
                className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold uppercase text-primary-foreground"
              >
                <UserPlus className="h-4 w-4" />
                Add Client
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const pendingCount = client.assignedWorkouts?.filter((w) => w.status === "pending").length ?? 0
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="group flex w-full items-center gap-4 rounded-xl bg-card p-4 text-left transition-all hover:ring-2 hover:ring-primary/50"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={client.avatarUrl}
                      alt={client.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{client.name}</p>
                      {pendingCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {pendingCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{client.username}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3 text-primary" />
                        {client.workoutsCompleted} done
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-orange-400" />
                        {client.currentStreak}d streak
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Active {client.lastActive}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Client Sheet */}
      {showAddSheet && (
        <AddClientSheet
          users={users}
          onClose={() => setShowAddSheet(false)}
          onAdd={handleAddClient}
        />
      )}
    </div>
  )
}
