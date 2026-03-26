"use client"

import { useState } from "react"
import { WelcomeScreen } from "@/components/fitness/screens/welcome-screen"
import { AuthScreen } from "@/components/fitness/screens/auth-screen"
import { DashboardScreen } from "@/components/fitness/screens/dashboard-screen"
import { WorkoutLibraryScreen, type Workout } from "@/components/fitness/screens/workout-library-screen"
import { WorkoutDetailScreen, exerciseData } from "@/components/fitness/screens/workout-detail-screen"
import { WorkoutPlayerScreen } from "@/components/fitness/screens/workout-player-screen"
import { BottomNav } from "@/components/fitness/bottom-nav"

type Screen = "welcome" | "signin" | "signup" | "dashboard" | "workouts" | "workout-detail" | "workout-player" | "build" | "progress" | "profile"
type NavTab = "home" | "workouts" | "build" | "progress" | "profile"

export default function FitnessApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome")
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [activeTab, setActiveTab] = useState<NavTab>("home")

  const handleAuthSubmit = (data: { email: string; password: string; name?: string }) => {
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
      case "build":
        setCurrentScreen("build")
        break
      case "progress":
        setCurrentScreen("progress")
        break
      case "profile":
        setCurrentScreen("profile")
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
  }

  const showBottomNav = ["dashboard", "workouts", "build", "progress", "profile"].includes(currentScreen)

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background">
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
        <DashboardScreen onNavigateToWorkouts={() => handleNavigation("workouts")} />
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

      {currentScreen === "workout-player" && selectedWorkout && (
        <WorkoutPlayerScreen
          workoutTitle={selectedWorkout.title}
          exercises={exerciseData}
          onExit={handleExitWorkout}
          onComplete={handleCompleteWorkout}
        />
      )}

      {currentScreen === "build" && (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <span className="text-3xl text-primary">+</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            Build Your Own
          </h1>
          <p className="mt-2 text-muted-foreground">
            Custom workout builder coming soon
          </p>
        </div>
      )}

      {currentScreen === "progress" && (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <span className="text-2xl">📊</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            Your Progress
          </h1>
          <p className="mt-2 text-muted-foreground">
            Detailed analytics coming soon
          </p>
        </div>
      )}

      {currentScreen === "profile" && (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/20">
            <img
              src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80"
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-foreground">
            Alex Johnson
          </h1>
          <p className="mt-1 text-muted-foreground">
            Member since March 2026
          </p>
        </div>
      )}

      {showBottomNav && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleNavigation}
        />
      )}
    </main>
  )
}
