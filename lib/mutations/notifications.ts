"use client"

import { supabase } from "@/lib/supabase/client"

type NotificationType =
  | "workout_assigned"
  | "workout_logged"
  | "workout_message"
  | "coach_message"
  | "coach_suggestion"

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, string>
}

/**
 * Create a single notification for a user.
 * Notification failures don't throw — the caller's primary action should
 * never be blocked by a failed notification.
 */
export async function createNotification(input: CreateNotificationInput) {
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    data: input.data ?? {},
    is_read: false,
  })

  if (error) {
    console.error("Failed to create notification:", error.message)
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)

  if (error) console.error("Failed to mark notification read:", error.message)
}

/**
 * Mark all of the current user's notifications as read.
 */
export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false)

  if (error) console.error("Failed to mark all read:", error.message)
}
