"use client"

import { cn } from "@/lib/utils"

// Deterministic colour from a string (user id or name).
// Picks from a curated set that looks decent on dark backgrounds.
const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-fuchsia-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-indigo-600",
]

function colorFromString(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (name[0] ?? "?").toUpperCase()
}

interface AvatarProps {
  /** If set, renders the image. Falls back to letter avatar on error or if null. */
  src?: string | null
  name: string
  /** Used for deterministic colour. Defaults to name. */
  id?: string
  /** Tailwind size classes, e.g. "h-12 w-12". Defaults to "h-10 w-10". */
  size?: string
  className?: string
}

export function Avatar({ src, name, id, size = "h-10 w-10", className }: AvatarProps) {
  const initials = getInitials(name)
  const bg = colorFromString(id ?? name)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(size, "rounded-full object-cover", className)}
      />
    )
  }

  return (
    <div
      className={cn(
        size,
        bg,
        "flex items-center justify-center rounded-full font-semibold text-white",
        className
      )}
    >
      <span className="text-[45%] leading-none">{initials}</span>
    </div>
  )
}
