"use client"

import { useState, useMemo } from "react"
import { WelcomeScreen } from "@/components/fitness/screens/welcome-screen"
import { AuthScreen } from "@/components/fitness/screens/auth-screen"
import { DashboardScreen } from "@/components/fitness/screens/dashboard-screen"
import { WorkoutPlayerScreen } from "@/components/fitness/screens/workout-player-screen"
import { ProgressScreen } from "@/components/fitness/screens/progress-screen"
import { PTCoachScreen } from "@/components/fitness/screens/pt-coach-screen"
import { PTBuilderScreen } from "@/components/fitness/screens/pt-builder-screen"
import { LiveSessionScreen } from "@/components/fitness/screens/live-session-screen"
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
  | "pt-clients"
  | "pt-builder"
  | "live-session"

export default function FitnessApp() {
  const { user, loading, signOut } = useAuth()

  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome")
  const [activeScheduledWorkoutId, setActiveScheduledWorkoutId] = useState<string | null>(null)
  const [activeScheduledWorkoutTitle, setActiveScheduledWorkoutTitle] = useState<string>("")
  const [activeTab, setActiveTab] = useState<NavTab>("home")
  const [ptActiveTab, setPtActiveTab] = useState<NavTab>("pt-clients")
  const [liveSessionClientId, setLiveSessionClientId] = useState<string | null>(null)
  const [liveSessionClientName, setLiveSessionClientName] = useState<string>("")

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
  const isPT = user?.role === "pt"

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAuthSuccess = () => {
    // user will be set by AuthProvider via onAuthStateChange.
    // We set a generic screen — the role-based routing below handles the rest.
    setCurrentScreen("dashboard")
    setActiveTab("home")
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
      case "profile":
        setCurrentScreen("profile")
        break
    }
  }

  const handlePTNavigation = (tab: NavTab) => {
    setPtActiveTab(tab)
    switch (tab) {
      case "pt-clients":
        setCurrentScreen("pt-clients")
        break
      case "pt-builder":
        setCurrentScreen("pt-builder")
        break
      case "profile":
        setCurrentScreen("profile")
        break
    }
  }

  const handleStartLiveSession = (clientId: string, clientName: string) => {
    setLiveSessionClientId(clientId)
    setLiveSessionClientName(clientName)
    setCurrentScreen("live-session")
  }

  const handleExitLiveSession = () => {
    setCurrentScreen("pt-clients")
    setPtActiveTab("pt-clients")
    setLiveSessionClientId(null)
    setLiveSessionClientName("")
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

  // ── Just authenticated — set the right starting screen based on role ──────
  if (["welcome", "signin", "signup"].includes(currentScreen)) {
    if (isPT) {
      setCurrentScreen("pt-clients")
      setPtActiveTab("pt-clients")
    } else {
      setCurrentScreen("dashboard")
      setActiveTab("home")
    }
    return null
  }

  // ── Profile screen (shared by both roles) ─────────────────────────────────
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
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
        {isPT ? "Personal Trainer" : "Client"}
      </p>
      <button
        onClick={handleSignOut}
        className="mt-6 rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80"
      >
        Sign Out
      </button>
    </div>
  )

  // ── PT View ───────────────────────────────────────────────────────────────
  if (isPT) {
    // Live session takes over the full screen (no bottom nav)
    if (currentScreen === "live-session" && liveSessionClientId) {
      return (
        <main className="mx-auto min-h-screen max-w-md bg-background">
          <LiveSessionScreen
            clientId={liveSessionClientId}
            clientName={liveSessionClientName}
            onExit={handleExitLiveSession}
            onComplete={handleExitLiveSession}
          />
        </main>
      )
    }

    return (
      <main className="mx-auto min-h-screen max-w-md bg-background">
        <div className="pb-24">
          {currentScreen === "pt-clients" && (
            <PTCoachScreen onStartLiveSession={handleStartLiveSession} />
          )}
          {currentScreen === "pt-builder" && <PTBuilderScreen />}
          {currentScreen === "profile" && profileScreen}
        </div>
        <BottomNav activeTab={ptActiveTab} onTabChange={handlePTNavigation} ptMode />
      </main>
    )
  }

  // ── Client View ───────────────────────────────────────────────────────────
  const showBottomNav = ["dashboard", "progress", "profile"].includes(currentScreen)

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background">
      {currentScreen === "dashboard" && (
        <DashboardScreen onStartScheduledWorkout={handleStartScheduledWorkout} />
      )}

      {currentScreen === "workout-player" && (
        <WorkoutPlayerScreen
          scheduledWorkoutId={activeScheduledWorkoutId}
          workoutTitle={activeScheduledWorkoutTitle}
          onExit={handleExitWorkout}
          onComplete={handleCompleteWorkout}
        />
      )}

      {currentScreen === "progress" && <ProgressScreen />}
      {currentScreen === "profile" && profileScreen}

      {showBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={handleNavigation} />
      )}
    </main>
  )
}
