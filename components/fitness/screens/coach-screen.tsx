"use client"

import { useEffect, useRef, useState } from "react"
import { Send, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCoachChat } from "@/lib/hooks/use-coach-chat"

export function CoachScreen() {
  const { messages, sending, error, loadingHistory, send } = useCoachChat()
  const [draft, setDraft] = useState("")
  const scrollerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to the latest message whenever the list updates.
  // Using scrollHeight is the simplest approach; a sentinel ref + scrollIntoView
  // would be a little more elegant but the cost is the same.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setDraft("")
    // Refocus so the user can keep typing without tapping the field again.
    requestAnimationFrame(() => inputRef.current?.focus())
    await send(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isEmpty = !loadingHistory && messages.length === 0

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-5 py-4 backdrop-blur-lg">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
            Coach
          </h1>
          <p className="text-xs text-muted-foreground">
            Your training partner — ask anything
          </p>
        </div>
      </header>

      {/* Scrollable message area. The input bar sits fixed at bottom-20 with
          its own height (~110px), and the bottom nav is below that (~80px).
          pb-48 reserves enough room so reply chips on the latest assistant
          message stay above the input bar instead of being hidden under it. */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-4 pb-48"
      >
        {loadingHistory && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center pt-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
              Say hi
            </h2>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              I can see your scheduled workouts and what you've logged. Ask me
              what to do today, how to progress, or to swap something out.
            </p>
            <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
              <SuggestionChip
                text="What should I do today?"
                onPick={(t) => setDraft(t)}
              />
              <SuggestionChip
                text="Should I push my bench weight up?"
                onPick={(t) => setDraft(t)}
              />
              <SuggestionChip
                text="I've got 30 minutes — what should I train?"
                onPick={(t) => setDraft(t)}
              />
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-3">
            {messages.map((m, idx) => {
              const isLatestAssistant =
                m.role === "assistant" && idx === messages.length - 1
              const showChips =
                isLatestAssistant &&
                !m.streaming &&
                !!m.suggestedReplies?.length

              return (
                <div key={m.id} className="space-y-2">
                  <MessageBubble
                    role={m.role}
                    content={m.content}
                    streaming={m.streaming}
                  />
                  {showChips && (
                    <ReplyChips
                      replies={m.suggestedReplies!}
                      disabled={sending}
                      onPick={(text) => send(text)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Sticky input area, sits above the bottom nav (pb-24 on bottom nav area). */}
      <form
        onSubmit={handleSubmit}
        className="fixed bottom-20 left-0 right-0 mx-auto max-w-md border-t border-border bg-background/95 px-4 py-3 backdrop-blur-lg"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder={sending ? "Coach is thinking…" : "Ask your coach…"}
            className="min-h-[44px] max-h-32 flex-1 resize-none rounded-2xl bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all",
              !draft.trim() || sending
                ? "bg-secondary text-muted-foreground"
                : "bg-primary text-primary-foreground hover:brightness-110"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant"
  content: string
  streaming?: boolean
}) {
  const isUser = role === "user"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-md"
            : "bg-secondary text-foreground rounded-tl-md"
        )}
      >
        {content ? (
          // Preserve newlines from the model.
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          // Empty streaming placeholder — three pulsing dots.
          <div className="flex items-center gap-1 py-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </div>
        )}
        {streaming && content && (
          <span className="ml-1 inline-block h-3 w-1.5 animate-pulse rounded-sm bg-muted-foreground/50 align-middle" />
        )}
      </div>
    </div>
  )
}

function SuggestionChip({
  text,
  onPick,
}: {
  text: string
  onPick: (text: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(text)}
      className="rounded-xl border border-border bg-secondary/50 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-secondary"
    >
      {text}
    </button>
  )
}

/**
 * Tappable quick-reply chips shown below the latest assistant message.
 * Tapping a chip sends the text as the user's next message immediately —
 * no edit step. Keeps the conversation moving fast.
 */
function ReplyChips({
  replies,
  disabled,
  onPick,
}: {
  replies: string[]
  disabled?: boolean
  onPick: (text: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 pl-1">
      {replies.map((reply, i) => (
        <button
          key={`${i}-${reply}`}
          type="button"
          onClick={() => onPick(reply)}
          disabled={disabled}
          className={cn(
            "rounded-full border border-primary/30 bg-primary/8 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors",
            disabled
              ? "opacity-60"
              : "hover:border-primary/50 hover:bg-primary/15"
          )}
        >
          {reply}
        </button>
      ))}
    </div>
  )
}
