"use client"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkoutMessages } from "@/lib/hooks/use-workout-messages"
import { sendWorkoutMessage } from "@/lib/mutations/workout-messages"
import { useAuth } from "@/lib/auth"
import { Avatar } from "@/components/fitness/avatar"

interface WorkoutMessageThreadProps {
  scheduledWorkoutId: string
  /** The other participant's user ID (for notification targeting) */
  recipientId: string
}

export function WorkoutMessageThread({
  scheduledWorkoutId,
  recipientId,
}: WorkoutMessageThreadProps) {
  const { user } = useAuth()
  const { messages, loading, refetch } = useWorkoutMessages(scheduledWorkoutId)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!draft.trim() || !user || sending) return
    const text = draft.trim()
    setDraft("")
    setSending(true)

    try {
      await sendWorkoutMessage({
        scheduledWorkoutId,
        senderId: user.id,
        senderName: user.displayName,
        message: text,
        recipientId,
      })
      refetch()
    } catch (err) {
      console.error("Failed to send message:", err)
      setDraft(text) // Restore draft on failure
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="max-h-48 space-y-2 overflow-y-auto px-1 py-2"
      >
        {loading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No messages yet — start the conversation
          </p>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === user?.id
            return (
              <div
                key={m.id}
                className={cn("flex items-end gap-2", isMe && "flex-row-reverse")}
              >
                {!isMe && (
                  <Avatar name={m.senderName} size="h-6 w-6" className="text-[10px]" />
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    isMe
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-secondary text-foreground"
                  )}
                >
                  {!isMe && (
                    <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.senderName}</p>
                  )}
                  <p>{m.message}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] opacity-50",
                      isMe ? "text-right" : "text-left"
                    )}
                  >
                    {new Date(m.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Compose */}
      <div className="flex items-center gap-2 border-t border-border pt-2">
        <input
          type="text"
          placeholder="Write a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            draft.trim() && !sending
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
