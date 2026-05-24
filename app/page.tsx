"use client"

import { useState } from "react"
import { WelcomeScreen } from "@/components/fitness/screens/welcome-screen"
import { AuthScreen } from "@/components/fitness/screens/auth-screen"
import { DashboardScreen } from "@/components/fitness/screens/dashboard-screen"
import { WorkoutPlayerScreen } from "@/components/fitness/screens/workout-player-screen"
import { ProgressScreen } from "@/components/fitness/screens/progress-screen"
import { QuickLogScreen } from "@/components/fitness/screens/quick-log-screen"
import { CoachScreen } from "@/components/fitness/screens/coach-screen"
import { LibraryScreen } from "@/components/fitness/screens/library-screen"
import { BottomNav, type NavTab } from "@/components/fitness/bottom-nav"
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

  // Single source of truth for which tab maps to which screen.
  // Quick Log is no longer a tab — it's reached via a card on the Dashboard.
  const handleNavigation = (tab: NavTab) => {
    setActiveTab(tab)
    switch (tab) {
      case "home":
        setCurrentScreen("dashboard")
        break
      case "library":
        setCurrentScreen("library")
        break
      case "coach":
        setCurrentScreen("coach")
        break
      case "progress":
        setCurrentScreen("progress")
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
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
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
  // Quick Log is reachable from Dashboard but doesn't have its own tab; it
  // still shows the nav so the user can leave.
  const showBottomNav = [
    "dashboard",
    "progress",
    "profile",
    "quick-log",
    "coach",
    "library",
  ].includes(currentScreen)

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background">
      {currentScreen === "dashboard" && (
        <DashboardScreen
          onStartScheduledWorkout={handleStartScheduledWorkout}
          onOpenQuickLog={() => setCurrentScreen("quick-log")}
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
      {currentScreen === "coach" && <CoachScreen />}
      {currentScreen === "library" && <LibraryScreen />}
      {currentScreen === "profile" && profileScreen}

      {showBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={handleNavigation} />
      )}
    </main>
  )
}
