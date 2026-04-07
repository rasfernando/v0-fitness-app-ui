"use client"

import { useState, useMemo } from "react"
import { WelcomeScreen } from "@/components/fitness/screens/welcome-screen"
import { AuthScreen } from "@/components/fitness/screens/auth-screen"
import { DashboardScreen } from "@/components/fitness/screens/dashboard-screen"
import { WorkoutPlayerScreen } from "@/components/fitness/screens/workout-player-screen"
import { ProgressScreen } from "@/components/fitness/screens/progress-screen"
import { PTCoachScreen } from "@/components/fitness/screens/pt-coach-screen"
import { PTBuilderScreen } from "@/components/fitness/screens/pt-builder-screen"
import { BottomNav, type NavTab } from "@/components/fitness/bottom-nav"
import { useScheduledWorkouts } from "@/lib/hooks/use-scheduled-workouts"
import { cn } from "@/lib/utils"

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
type AppMode = "client" | "pt"

function ModeToggle({ mode, onChange }: { mode: AppMode; onChange: (m: AppMode) => void }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center bg-background px-4 pb-3 pt-4">
      <div className="flex w-full max-w-xs rounded-xl bg-secondary p-1">
        <button
          onClick={() => onChange("client")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-semibold uppercase tracking-wide transition-all",
            mode === "client"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Client View
        </button>
        <button
          onClick={() => onChange("pt")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-semibold uppercase tracking-wide transition-all",
            mode === "pt"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          PT View
        </button>
      </div>
    </div>
  )
}

export default function FitnessApp() {
  const [appMode, setAppMode] = useState<AppMode>("client")
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome")
  // ID of the scheduled_workouts row the player is logging against. Set when
  // the user taps a scheduled workout from the dashboard, or when they hit
  // the Start button in the nav. Cleared on completion or exit.
  const [activeScheduledWorkoutId, setActiveScheduledWorkoutId] = useState<string | null>(null)
  const [activeScheduledWorkoutTitle, setActiveScheduledWorkoutTitle] = useState<string>("")
  const [activeTab, setActiveTab] = useState<NavTab>("home")
  const [ptActiveTab, setPtActiveTab] = useState<NavTab>("pt-clients")

  // Used by the Start button to figure out what the next workout is without
  // having to drill the data down through the dashboard. For PT users this
  // returns an empty array. For client users it scopes to their schedule.
  const { data: scheduleData } = useScheduledWorkouts()

  // The "next workout" the Start button should launch: today's if still
  // scheduled, otherwise the earliest upcoming scheduled workout.
  const nextScheduledWorkout = useMemo(() => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    return (
      scheduleData
        .filter((w) => w.status === "scheduled" && w.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
    )
  }, [scheduleData])

  const isAuthed = !["welcome", "signin", "signup"].includes(currentScreen)

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode)
    if (mode === "pt") {
      setCurrentScreen("pt-clients")
      setPtActiveTab("pt-clients")
    } else {
      setCurrentScreen("dashboard")
      setActiveTab("home")
    }
  }

  const handleAuthSubmit = (_data: { email: string; password: string; name?: string }) => {
    setCurrentScreen("dashboard")
    setActiveTab("home")
  }

  // Called when the client taps a scheduled workout from the dashboard,
  // or when the Start button is tapped.
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
        // Start the next workout if there is one. If nothing is scheduled,
        // stay where we are — the button is essentially a no-op in that case.
        // (A friendlier future version might show a toast or navigate to
        // the dashboard; for now silent is fine because the dashboard's
        // Next Workout CTA already gives visible feedback about scheduling.)
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

  const showBottomNav = ["dashboard", "progress", "profile"].includes(currentScreen)

  // ── PT Mode ──────────────────────────────────────────────────────────────────
  if (appMode === "pt" && isAuthed) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-background">
        <ModeToggle mode={appMode} onChange={handleModeChange} />
        <div className="pb-24">
          {currentScreen === "pt-clients" && <PTCoachScreen />}
          {currentScreen === "pt-builder" && <PTBuilderScreen />}
        </div>
        <BottomNav activeTab={ptActiveTab} onTabChange={handlePTNavigation} ptMode />
      </main>
    )
  }

  // ── Client Mode ───────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto min-h-screen max-w-md bg-background">
      {isAuthed && <ModeToggle mode={appMode} onChange={handleModeChange} />}

      {currentScreen === "welcome" && (
        <WelcomeScreen
          onGetStarted={() => setCurrentScreen("signup")}
          onSignIn={() => setCurrentScreen("signin")}
        />
      )}

      {currentScreen === "signin" && (
        <AuthScreen
          mode="signin"
          onBack={() => setCurrentScreen("welcome")}
          onSubmit={handleAuthSubmit}
          onToggleMode={() => setCurrentScreen("signup")}
        />
      )}

      {currentScreen === "signup" && (
        <AuthScreen
          mode="signup"
          onBack={() => setCurrentScreen("welcome")}
          onSubmit={handleAuthSubmit}
          onToggleMode={() => setCurrentScreen("signin")}
        />
      )}

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

      {currentScreen === "profile" && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="mb-4 h-20 w-20 overflow-hidden rounded-full ring-2 ring-primary">
            <img
              src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80"
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            Alex Johnson
          </h1>
          <p className="mt-1 text-muted-foreground">Member since March 2026</p>
        </div>
      )}

      {showBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={handleNavigation} />
      )}
    </main>
  )
}
