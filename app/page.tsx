"use client"

import { useState, useMemo } from "react"
import { WelcomeScreen } from "@/components/fitness/screens/welcome-screen"
import { AuthScreen } from "@/components/fitness/screens/auth-screen"
import { DashboardScreen } from "@/components/fitness/screens/dashboard-screen"
import { WorkoutPlayerScreen } from "@/components/fitness/screens/workout-player-screen"
import { ProgressScreen } from "@/components/fitness/screens/progress-screen"
import { QuickLogScreen } from "@/components/fitness/screens/quick-log-screen"
import { CoachScreen } from "@/components/fitness/screens/coach-screen"
import { LibraryScreen } from "@/components/fitness/screens/library-screen"
import { BottomNav, type NavTab } from "@/components/fitness/bottom-nav"
import { useScheduledWorkouts } from "@/lib/hooks/use-scheduled-workouts"
import { useAuth } from "@/lib/auth"
import { Avatar } from "@/components/fitness/avatar"

type Screen =
  | "welcome"
  | "signin"
  | "signup"
  | "dashboard"
  | "workout-player"
  | "progress"
  | "profile"
  | "quick-log"
  | "coach"
  | "library"

export default function FitnessApp() {
  const { user, loading, signOut } = useAuth()

  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome")
  const [activeScheduledWorkoutId, setActiveScheduledWorkoutId] = useState<string | null>(null)
  const [activeScheduledWorkoutTitle, setActiveScheduledWorkoutTitle] = useState<string>("")
  const [activeTab, setActiveTab] = useState<NavTab>("home")
  // Library can be reached from Coach or Dashboard; remember which so Back returns there.
  const [libraryReturnTo, setLibraryReturnTo] = useState<"coach" | "dashboard">("dashboard")

  const { data: scheduleData } = useScheduledWorkouts()

  const nextScheduledWorkout = useMemo(() => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    return (
      scheduleData
        .filter((w) => w.status === "scheduled" && w.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
    )
  }, [scheduleData])

  const isAuthed = !!user

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAuthSuccess = () => {
    // The block below routes to "dashboard" once the auth state updates.
  }

  const handleStartScheduledWorkout = (scheduledId: string, title: string) => {
    setActiveScheduledWorkoutId(scheduledId)
    setActiveScheduledWorkoutTitle(title)
    setCurrentScreen("workout-player")
  }

  const handleNavigation = (tab: NavTab) => {
    setActiveTab(tab)
    switch (tab) {
      case "home":
        setCurrentScreen("dashboard")
        break
      case "log":
        setCurrentScreen("quick-log")
        break
      case "start":
        if (nextScheduledWorkout) {
          handleStartScheduledWorkout(nextScheduledWorkout.id, nextScheduledWorkout.title)
        } else {
          setCurrentScreen("dashboard")
          setActiveTab("home")
        }
        break
      case "progress":
        setCurrentScreen("progress")
        break
      case "coach":
        setCurrentScreen("coach")
        break
      case "profile":
        setCurrentScreen("profile")
        break
    }
  }

  const handleExitWorkout = () => {
    setCurrentScreen("dashboard")
    setActiveTab("home")
    setActiveScheduledWorkoutId(null)
    setActiveScheduledWorkoutTitle("")
  }

  const handleCompleteWorkout = () => {
    setCurrentScreen("dashboard")
    setActiveTab("home")
    setActiveScheduledWorkoutId(null)
    setActiveScheduledWorkoutTitle("")
  }

  const handleSignOut = async () => {
    await signOut()
    setCurrentScreen("welcome")
  }

  const handleOpenLibrary = (from: "coach" | "dashboard") => {
    setLibraryReturnTo(from)
    setCurrentScreen("library")
  }

  const handleLeaveLibrary = () => {
    setCurrentScreen(libraryReturnTo)
    setActiveTab(libraryReturnTo === "coach" ? "coach" : "home")
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </main>
    )
  }

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!isAuthed) {
    if (currentScreen !== "signin" && currentScreen !== "signup") {
      return (
        <main className="mx-auto min-h-screen max-w-md bg-background">
          <WelcomeScreen
            onGetStarted={() => setCurrentScreen("signup")}
            onSignIn={() => setCurrentScreen("signin")}
          />
        </main>
      )
    }

    return (
      <main className="mx-auto min-h-screen max-w-md bg-background">
        {currentScreen === "signin" && (
          <AuthScreen
            mode="signin"
            onBack={() => setCurrentScreen("welcome")}
            onSuccess={handleAuthSuccess}
            onToggleMode={() => setCurrentScreen("signup")}
          />
        )}
        {currentScreen === "signup" && (
          <AuthScreen
            mode="signup"
            onBack={() => setCurrentScreen("welcome")}
            onSuccess={handleAuthSuccess}
            onToggleMode={() => setCurrentScreen("signin")}
          />
        )}
      </main>
    )
  }

  // ── Just authenticated — route to the dashboard ───────────────────────────
  if (["welcome", "signin", "signup"].includes(currentScreen)) {
    setCurrentScreen("dashboard")
    setActiveTab("home")
    return null
  }

  // ── Profile screen ────────────────────────────────────────────────────────
  const profileScreen = (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pb-24 text-center">
      <Avatar
        name={user.displayName}
        id={user.id}
        size="h-20 w-20"
        className="mb-4 ring-2 ring-primary text-2xl"
      />
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
        {user.displayName}
      </h1>
      <p className="mt-1 text-muted-foreground">@{user.username}</p>
      <button
        onClick={handleSignOut}
        className="mt-6 rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80"
      >
        Sign Out
      </button>
    </div>
  )

  // ── App view ──────────────────────────────────────────────────────────────
  const showBottomNav = ["dashboard", "progress", "profile", "quick-log", "coach"].includes(currentScreen)

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background">
      {currentScreen === "dashboard" && (
        <DashboardScreen
          onStartScheduledWorkout={handleStartScheduledWorkout}
          onOpenLibrary={() => handleOpenLibrary("dashboard")}
        />
      )}

      {currentScreen === "workout-player" && (
        <WorkoutPlayerScreen
          scheduledWorkoutId={activeScheduledWorkoutId}
          workoutTitle={activeScheduledWorkoutTitle}
          onExit={handleExitWorkout}
          onComplete={handleCompleteWorkout}
        />
      )}

      {currentScreen === "quick-log" && (
        <QuickLogScreen
          onSaved={() => {
            setCurrentScreen("dashboard")
            setActiveTab("home")
          }}
        />
      )}

      {currentScreen === "progress" && <ProgressScreen />}
      {currentScreen === "coach" && (
        <CoachScreen onOpenLibrary={() => handleOpenLibrary("coach")} />
      )}
      {currentScreen === "library" && (
        <LibraryScreen onBack={handleLeaveLibrary} />
      )}
      {currentScreen === "profile" && profileScreen}

      {showBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={handleNavigation} />
      )}
    </main>
  )
}
