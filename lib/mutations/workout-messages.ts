"use client"

import { supabase } from "@/lib/supabase/client"
import { createNotification } from "./notifications"

/**
 * Send a message on a workout thread.
 * Also creates a notification for the other party.
 */
export async function sendWorkoutMessage({
  scheduledWorkoutId,
  senderId,
  senderName,
  message,
  recipientId,
}: {
  scheduledWorkoutId: string
  senderId: string
  senderName: string
  message: string
  recipientId: string
}) {
  const { error } = await supabase.from("workout_messages").insert({
    scheduled_workout_id: scheduledWorkoutId,
    sender_id: senderId,
    message,
  })

  if (error) throw new Error(`Failed to send message: ${error.message}`)

  // Notify the recipient
  await createNotification({
    userId: recipientId,
    type: "workout_message",
    title: `${senderName} sent a message`,
    body: message.length > 100 ? message.slice(0, 100) + "…" : message,
    data: { scheduled_workout_id: scheduledWorkoutId },
  })
}
