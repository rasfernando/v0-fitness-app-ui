"use client"

import { useState } from "react"
import { DEV_USERS, useDevUser } from "@/lib/dev-user"
import { cn } from "@/lib/utils"

// Floating widget — bottom-right corner. Only renders in development.
// When real auth lands, delete this component and the import in app/layout.tsx.
export function DevUserSwitcher() {
  const { user, setUserId } = useDevUser()
  const [open, setOpen] = useState(false)

  if (process.env.NODE_ENV === "production") return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-mono text-xs">
      {open && (
        <div className="mb-2 w-56 rounded-lg border border-border bg-card p-2 shadow-2xl">
          <div className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Dev: switch user
          </div>
          {DEV_USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setUserId(u.id)
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-secondary",
                u.id === user.id && "bg-secondary"
              )}
            >
              <span className="text-foreground">{u.displayName}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] uppercase",
                  u.role === "pt"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {u.role}
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-border bg-card px-3 py-1.5 shadow-lg hover:bg-secondary"
      >
        🧪 {user.displayName} <span className="text-muted-foreground">({user.role})</span>
      </button>
    </div>
  )
}
