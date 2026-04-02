"use client"

// Bottom navigation component - updated 2026-04-02
import { Home, Dumbbell, Users, TrendingUp, User, PenTool } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
  ptMode?: boolean
}

const clientNavItems = [
  { id: "home", label: "Home", icon: Home, isCenter: false },
  { id: "workouts", label: "Workouts", icon: Dumbbell, isCenter: false },
  { id: "build", label: "Build", icon: PenTool, isCenter: true },
  { id: "progress", label: "Progress", icon: TrendingUp, isCenter: false },
  { id: "profile", label: "Profile", icon: User, isCenter: false },
]

const ptNavItems = [
  { id: "pt-builder", label: "Builder", icon: PenTool, isCenter: false },
  { id: "pt-clients", label: "Clients", icon: Users, isCenter: true },
]

export function BottomNav({ activeTab, onTabChange, ptMode = false }: BottomNavProps) {
  const navItems = ptMode ? ptNavItems : clientNavItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex -translate-y-4 flex-col items-center"
              >
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 transition-transform hover:scale-110",
                    isActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                  )}
                >
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="mt-1 text-xs font-medium text-primary">{item.label}</span>
              </button>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center gap-1 py-2"
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
