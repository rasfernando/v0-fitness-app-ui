import { useEffect } from "react"

/**
 * Locks body scroll while a modal/sheet is open.
 *
 * On iOS Safari, `overflow: hidden` on <body> alone doesn't prevent scroll
 * bleed — we also need to set position: fixed and preserve the scroll offset
 * so the page doesn't jump to the top when the modal opens.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return

    const scrollY = window.scrollY
    const body = document.body

    // Save current values so we can restore them
    const originalOverflow = body.style.overflow
    const originalPosition = body.style.position
    const originalTop = body.style.top
    const originalWidth = body.style.width

    body.style.overflow = "hidden"
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.width = "100%"

    return () => {
      body.style.overflow = originalOverflow
      body.style.position = originalPosition
      body.style.top = originalTop
      body.style.width = originalWidth
      window.scrollTo(0, scrollY)
    }
  }, [isLocked])
}
