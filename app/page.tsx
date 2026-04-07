"use client"

import { useState } from "react"
import { WelcomeScreen } from "@/components/fitness/screens/welcome-screen"
import { AuthScreen } from "@/components/fitness/screens/auth-screen"
import { DashboardScreen } from "@/components/fitness/screens/dashboard-screen"
import { WorkoutLibraryScreen, type Workout } from "@/components/fitness/screens/workout-library-screen"
import { WorkoutDetailScreen } from "@/components/fitness/screens/workout-detail-screen"
import { WorkoutPlayerScreen } from "@/components/fitness/screens/workout-player-screen"
import { PTCoachScreen } from "@/components/fitness/screens/pt-coach-screen"
import { PTBuilderScreen } from "@/components/fitness/screens/pt-builder-screen"
import { ProgressScreen } from "@/components/fitness/screens/progress-screen"
import { BottomNav } from "@/components/fitness/bottom-nav"
import { cn } from "@/lib/utils"

type Screen = "welcome" | "signin" | "signup" | "dashboard" | "workouts" | "workout-detail" | "workout-player" | "build" | "progress" | "profile" | "pt-clients" | "pt-builder"
type NavTab = "home" | "workouts" | "start" | "progress" | "profile" | "pt-clients" | "pt-builder"
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
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  // ID of the scheduled_workouts row the player is logging against. Set when
  // the user taps a scheduled workout from the dashboard. Cleared on completion
  // or exit. Separate from selectedWorkout (which is a library template, not
  // a scheduled instance).
  const [activeScheduledWorkoutId, setActiveScheduledWorkoutId] = useState<string | null>(null)
  const [activeScheduledWorkoutTitle, setActiveScheduledWorkoutTitle] = useState<string>("")
  const [activeTab, setActiveTab] = useState<NavTab>("home")
  const [ptActiveTab, setPtActiveTab] = useState<NavTab>("pt-clients")

  const isAuthed = !["welcome", "signin", "signup"].includes(currentScreen)

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode)
    // Reset to the appropriate home screen when switching modes
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

  const handleNavigation = (tab: NavTab) => {
    setActiveTab(tab)
    switch (tab) {
      case "home":
        setCurrentScreen("dashboard")
        break
      case "workouts":
        setCurrentScreen("workouts")
        break
      case "start":
        setCurrentScreen("workout-player")
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

  const handleSelectWorkout = (workout: Workout) => {
    setSelectedWorkout(workout)
    setCurrentScreen("workout-detail")
  }

  const handleStartWorkout = () => {
    setCurrentScreen("workout-player")
  }

  const handleExitWorkout = () => {
    setCurrentScreen("workout-detail")
  }

  const handleCompleteWorkout = () => {
    setCurrentScreen("dashboard")
    setActiveTab("home")
    setSelectedWorkout(null)
    setActiveScheduledWorkoutId(null)
    setActiveScheduledWorkoutTitle("")
  }

  // Called when the client taps a scheduled workout from the dashboard.
  // Stores the scheduled_workouts.id so the player knows what to log against.
  const handleStartScheduledWorkout = (scheduledId: string, title: string) => {
    setActiveScheduledWorkoutId(scheduledId)
    setActiveScheduledWorkoutTitle(title)
    setCurrentScreen("workout-player")
  }

  const showBottomNav = ["dashboard", "workouts", "build", "progress", "profile"].includes(currentScreen)

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
      {/* Toggle only shown when authed */}
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
        <DashboardScreen
          onNavigateToWorkouts={() => handleNavigation("workouts")}
          onStartScheduledWorkout={handleStartScheduledWorkout}
        />
      )}

      {currentScreen === "workouts" && (
        <WorkoutLibraryScreen onSelectWorkout={handleSelectWorkout} />
      )}

      {currentScreen === "workout-detail" && selectedWorkout && (
        <WorkoutDetailScreen
          workout={selectedWorkout}
          onBack={() => setCurrentScreen("workouts")}
          onStartWorkout={handleStartWorkout}
        />
      )}

      {currentScreen === "workout-player" && (
        <WorkoutPlayerScreen
          scheduledWorkoutId={activeScheduledWorkoutId}
          workoutTitle={activeScheduledWorkoutTitle || selectedWorkout?.title || ""}
          onExit={handleExitWorkout}
          onComplete={handleCompleteWorkout}
        />
      )}

      {currentScreen === "build" && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-primary">+</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            Build Your Own
          </h1>
          <p className="mt-2 text-muted-foreground">Custom workout builder coming soon</p>
        </div>
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
