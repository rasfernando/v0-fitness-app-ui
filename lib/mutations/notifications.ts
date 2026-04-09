"use client"

import { supabase } from "@/lib/supabase/client"

type NotificationType = "workout_assigned" | "workout_logged" | "workout_message"

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, string>
}

/**
 * Create a single notification for a user.
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
    // Notification failures should never block the primary action,
    // so we log but don't throw.
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

// ── Convenience helpers for specific notification types ──────────────────

/**
 * Notify a client that their PT assigned a workout.
 */
export async function notifyClientWorkoutAssigned({
  clientId,
  ptName,
  workoutTitle,
  scheduledDate,
  scheduledWorkoutId,
  message,
}: {
  clientId: string
  ptName: string
  workoutTitle: string
  scheduledDate: string
  scheduledWorkoutId: string
  message?: string
}) {
  await createNotification({
    userId: clientId,
    type: "workout_assigned",
    title: `${ptName} assigned you a workout`,
    body: message
      ? `${workoutTitle} on ${scheduledDate} — "${message}"`
      : `${workoutTitle} on ${scheduledDate}`,
    data: { scheduled_workout_id: scheduledWorkoutId },
  })
}

/**
 * Notify all PTs coaching a client that the client logged a workout.
 */
export async function notifyPTsWorkoutLogged({
  clientId,
  clientName,
  workoutTitle,
  scheduledWorkoutId,
}: {
  clientId: string
  clientName: string
  workoutTitle: string
  scheduledWorkoutId: string
}) {
  // Find all active PTs for this client
  const { data: ptLinks, error } = await supabase
    .from("pt_clients")
    .select("pt_id")
    .eq("client_id", clientId)
    .eq("status", "active")

  if (error || !ptLinks?.length) return

  // Create a notification for each PT
  const inserts = ptLinks.map((link) => ({
    user_id: link.pt_id,
    type: "workout_logged" as NotificationType,
    title: `${clientName} logged a workout`,
    body: workoutTitle,
    data: { scheduled_workout_id: scheduledWorkoutId },
    is_read: false,
  }))

  const { error: insertErr } = await supabase
    .from("notifications")
    .insert(inserts)

  if (insertErr) console.error("Failed to notify PTs:", insertErr.message)
}
