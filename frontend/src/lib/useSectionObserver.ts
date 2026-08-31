import { useEffect, useState } from 'react'

/**
 * Reports which section owns the reading band. Uses IntersectionObserver rather
 * than scroll fractions on purpose: adding or reordering a section then requires
 * no numeric resync anywhere in the codebase.
 */
export function useSectionObserver(ids: string[]): string {
  const [active, setActive] = useState('')

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio)
          else visible.delete(entry.target.id)
        }
        let best = ''
        let bestRatio = 0
        for (const [id, ratio] of visible) {
          if (ratio >= bestRatio) {
            best = id
            bestRatio = ratio
          }
        }
        if (best) setActive(best)
      },
      // A band across the middle of the viewport: the section a reader is
      // actually looking at, not the one that has merely entered the screen.
      { rootMargin: '-40% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids.join(',')])

  return active
}
