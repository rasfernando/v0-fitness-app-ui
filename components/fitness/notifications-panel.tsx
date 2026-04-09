"use client"

import { useEffect } from "react"
import { X, Dumbbell, MessageCircle, ClipboardList, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications, type Notification } from "@/lib/hooks/use-notifications"
import { markNotificationRead, markAllNotificationsRead } from "@/lib/mutations/notifications"

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
  onTapNotification?: (notification: Notification) => void
}

export function NotificationsPanel({ open, onClose, onTapNotification }: NotificationsPanelProps) {
  const { notifications, unreadCount, loading, refetch } = useNotifications()

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open) return null

  const handleTap = async (n: Notification) => {
    if (!n.isRead) {
      await markNotificationRead(n.id)
      refetch()
    }
    onTapNotification?.(n)
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    refetch()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="max-h-[80vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-card shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card">
          <div className="flex justify-center pt-3">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-foreground">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="px-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                <Dumbbell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} onTap={() => handleTap(n)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationRow({
  notification: n,
  onTap,
}: {
  notification: Notification
  onTap: () => void
}) {
  const Icon =
    n.type === "workout_assigned"
      ? Dumbbell
      : n.type === "workout_logged"
        ? ClipboardList
        : MessageCircle

  const iconColor =
    n.type === "workout_assigned"
      ? "text-primary bg-primary/10"
      : n.type === "workout_logged"
        ? "text-emerald-400 bg-emerald-500/10"
        : "text-blue-400 bg-blue-500/10"

  const timeAgo = formatTimeAgo(n.createdAt)

  return (
    <button
      onClick={onTap}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors",
        n.isRead ? "opacity-60" : "bg-secondary/50"
      )}
    >
      <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm text-foreground", !n.isRead && "font-semibold")}>
            {n.title}
          </p>
          {!n.isRead && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        {n.body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo}</p>
      </div>
    </button>
  )
}

function formatTimeAgo(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}
