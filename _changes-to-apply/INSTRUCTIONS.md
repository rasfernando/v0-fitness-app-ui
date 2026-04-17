# Changes to Apply

Copy these files into your project, matching the folder structure exactly.

## Prerequisites

Make sure you have the @dnd-kit packages installed (you ran this earlier, but just in case):

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## NEW file (create this)

| File | Destination |
|------|-------------|
| `lib/hooks/use-body-scroll-lock.ts` | `lib/hooks/use-body-scroll-lock.ts` |

## MODIFIED files (replace these)

| File | What changed |
|------|-------------|
| `components/fitness/screens/pt-builder-screen.tsx` | Drag-to-reorder exercises, delete confirmation dialog, body scroll lock |
| `components/fitness/screens/workout-player-screen.tsx` | Exit confirmation dialog, double-tap prevention on log set |
| `components/fitness/screens/quick-log-screen.tsx` | Validation: reps must be > 0, weight clamped to >= 0 |
| `components/fitness/notifications-panel.tsx` | Replaced manual overflow:hidden with useBodyScrollLock hook |
| `components/fitness/screens/dashboard-screen.tsx` | Added useBodyScrollLock for calendar/notifications modals |
| `components/fitness/screens/pt-coach-screen.tsx` | Added useBodyScrollLock for add-client/notifications modals |
| `components/fitness/screens/live-session-screen.tsx` | Added useBodyScrollLock for exercise picker |
| `components/fitness/workout-calendar.tsx` | Added useBodyScrollLock for date/add-sheet modals |

## Quick copy commands

From inside the `_changes-to-apply` folder:

```bash
# Create new file
mkdir -p ../lib/hooks
cp lib/hooks/use-body-scroll-lock.ts ../lib/hooks/

# Replace modified files
cp components/fitness/screens/pt-builder-screen.tsx ../components/fitness/screens/
cp components/fitness/screens/workout-player-screen.tsx ../components/fitness/screens/
cp components/fitness/screens/quick-log-screen.tsx ../components/fitness/screens/
cp components/fitness/notifications-panel.tsx ../components/fitness/
cp components/fitness/screens/dashboard-screen.tsx ../components/fitness/screens/
cp components/fitness/screens/pt-coach-screen.tsx ../components/fitness/screens/
cp components/fitness/screens/live-session-screen.tsx ../components/fitness/screens/
cp components/fitness/workout-calendar.tsx ../components/fitness/
```

## After copying

```bash
pnpm build
```

If the build passes, commit and push:

```bash
git add -A
git commit -m "Add drag-to-reorder, exit confirmation, scroll lock, validation fixes"
git push
```
