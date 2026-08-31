import { useEffect, useState } from 'react'

/**
 * Whether this tab is the one the visitor is looking at.
 *
 * The stage renders continuously — a fullscreen shader, a lit model, bloom and
 * vignette — and a browser throttles a background tab's rAF rather than
 * stopping it, so a portfolio left open behind other tabs keeps asking a GPU to
 * draw a scene nobody can see. On a laptop that is battery; on a phone it is
 * battery and heat.
 *
 * This is React state rather than a per-frame singleton on purpose: it changes
 * when the visitor switches tabs, not once a frame, and the Canvas needs a real
 * re-render to pick up a new `frameloop`.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    // A tab restored by session restore, or opened in the background, mounts
    // already hidden. Assuming "visible" here would miss the case this exists
    // for until the visitor's first tab switch.
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  )

  useEffect(() => {
    const read = () => setVisible(document.visibilityState !== 'hidden')
    read()
    document.addEventListener('visibilitychange', read)
    return () => document.removeEventListener('visibilitychange', read)
  }, [])

  return visible
}
