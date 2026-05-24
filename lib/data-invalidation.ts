"use client"

// Lightweight cross-component invalidation signal.
//
// When the coach mutates the database via a tool call, the dashboard's
// useScheduledWorkouts hook needs to refetch — but the chat hook and the
// dashboard hook live in sibling components, so there's no parent-child
// prop chain to plumb through.
//
// This is a tiny singleton emitter keyed by topic. Components subscribe via
// useInvalidationVersion(topic); they get a version number that bumps every
// time emit(topic) is called. Use the version as a dependency in your
// fetch effect to force a refetch.
//
// Why not a full state library? Because this is one event with one
// subscriber pattern; pulling in zustand/jotai/redux would be overkill.

import { useEffect, useState } from "react"

type Topic = "scheduled_workouts" | "coach_messages" | "user_workouts"

const versions: Record<Topic, number> = {
  scheduled_workouts: 0,
  coach_messages: 0,
  user_workouts: 0,
}
const listeners: Record<Topic, Set<() => void>> = {
  scheduled_workouts: new Set(),
  coach_messages: new Set(),
  user_workouts: new Set(),
}

export function invalidate(topic: Topic) {
  versions[topic] += 1
  for (const listener of listeners[topic]) {
    listener()
  }
}

/**
 * Subscribe to a topic. Returns the current version; re-renders the calling
 * component whenever invalidate(topic) is called. Use the returned number
 * as part of an effect dependency array to trigger a refetch.
 */
export function useInvalidationVersion(topic: Topic): number {
  const [version, setVersion] = useState(versions[topic])

  useEffect(() => {
    const listener = () => setVersion(versions[topic])
    listeners[topic].add(listener)
    // Sync up in case the version changed between the initial useState
    // capture and the effect run.
    setVersion(versions[topic])
    return () => {
      listeners[topic].delete(listener)
    }
  }, [topic])

  return version
}
