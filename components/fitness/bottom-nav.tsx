"use client"

/**
 * Bottom Navigation Component
 * Provides tab-based navigation for the fitness app
 * Supports both Client and PT modes with different nav items
 */

import { Home, Dumbbell, Users, TrendingUp, User, PenTool } from "lucide-react"
import { cn } from "@/lib/utils"

type NavTab = "home" | "workouts" | "build" | "progress" | "profile" | "pt-clients" | "pt-builder"

interface NavItem {
  id: NavTab
  label: string
  icon: React.ElementType
  isCenter: boolean
}

interface BottomNavProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
  ptMode?: boolean
}

const CLIENT_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home, isCenter: false },
  { id: "workouts", label: "Workouts", icon: Dumbbell, isCenter: false },
  { id: "build", label: "Clients", icon: Users, isCenter: true },
  { id: "progress", label: "Progress", icon: TrendingUp, isCenter: false },
  { id: "profile", label: "Profile", icon: User, isCenter: false },
]

const PT_NAV_ITEMS: NavItem[] = [
  { id: "pt-builder", label: "Builder", icon: PenTool, isCenter: false },
  { id: "pt-clients", label: "Clients", icon: Users, isCenter: true },
]

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  if (item.isCenter) {
    return (
      <button
        onClick={onClick}
        className="flex -translate-y-4 flex-col items-center"
        aria-label={item.label}
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
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-2"
      aria-label={item.label}
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
}

export function BottomNav({ activeTab, onTabChange, ptMode = false }: BottomNavProps) {
  const items = ptMode ? PT_NAV_ITEMS : CLIENT_NAV_ITEMS

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
        {items.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>
    </nav>
  )
}
