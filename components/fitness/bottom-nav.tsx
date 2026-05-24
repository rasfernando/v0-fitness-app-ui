"use client"

/**
 * Bottom Navigation Component
 *
 * Five tabs with Coach as the elevated center button. The product positions
 * the AI coach as the main interface — everything else (Home, Library,
 * Progress, Profile) feeds off conversations with it.
 *
 * Quick Log is no longer a nav destination; it's surfaced as a card on the
 * Dashboard instead, since it's a contextual action rather than a primary
 * surface.
 */

import { Home, TrendingUp, User, Sparkles, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export type NavTab = "home" | "library" | "coach" | "progress" | "profile"

interface NavItem {
  id: NavTab
  label: string
  icon: React.ElementType
  isCenter: boolean
}

interface BottomNavProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
}

const NAV_ITEMS: NavItem[] = [
  { id: "home",     label: "Home",     icon: Home,       isCenter: false },
  { id: "library",  label: "Library",  icon: BookOpen,   isCenter: false },
  { id: "coach",    label: "Coach",    icon: Sparkles,   isCenter: true  },
  { id: "progress", label: "Progress", icon: TrendingUp, isCenter: false },
  { id: "profile",  label: "Profile",  icon: User,       isCenter: false },
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
            "flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/25 transition-transform hover:scale-105",
            isActive && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
          )}
        >
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className={cn(
          "mt-1 text-xs font-medium",
          isActive ? "text-primary" : "text-muted-foreground"
        )}>
          {item.label}
        </span>
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

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
        {NAV_ITEMS.map((item) => (
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
