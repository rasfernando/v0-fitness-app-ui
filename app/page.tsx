"use client"

import { useState } from "react"
import { WelcomeScreen } from "@/components/fitness/screens/welcome-screen"
import { AuthScreen } from "@/components/fitness/screens/auth-screen"
import { DashboardScreen } from "@/components/fitness/screens/dashboard-screen"

type Screen = "welcome" | "signin" | "signup" | "dashboard"

export default function FitnessApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome")

  const handleAuthSubmit = (data: { email: string; password: string; name?: string }) => {
    console.log("[v0] Auth data:", data)
    setCurrentScreen("dashboard")
  }

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
        <DashboardScreen />
      )}
    </main>
  )
}
