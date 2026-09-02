import { useCallback, useEffect, useRef } from 'react'
import { isCoarsePointer, prefersReducedMotion } from './media'
import { SCRAMBLE_MS, revealedCount, scrambleFrame } from './scramble'

/**
 * Wires the hover decode onto one interactive element. Spread the result:
 *
 *   <a {...useScramble('View work')}>View work</a>
 *
 * The label is passed in rather than read off the node, because the label is
 * what the decode resolves back TO. Reading it from the DOM would mean reading
 * a half-decoded string if a second hover started mid-flight, and the label
 * would rot into glyphs one hover at a time.
 *
 * Three things this deliberately does:
 *
 * `aria-label` holds the accessible name still. The decode mutates
 * `textContent`, so without it a screen reader announcing the link mid-hover
 * would read out punctuation.
 *
 * The element's width is frozen for the duration. Every glyph in a proportional
 * font has its own advance, so a label left to size itself would shove its
 * neighbours around sixty times a second — the one thing the motion rules are
 * most insistent about. One measurement on enter costs one reflow; the frames
 * after it repaint inside a box that no longer moves.
 *
 * Nothing runs under reduced motion, or on a coarse pointer where `mouseenter`
 * fires on a tap and the decode would sit between the tap and the navigation.
 */
export function useScramble(label: string) {
  const nodeRef = useRef<HTMLElement | null>(null)
  const frameRef = useRef(0)

  const settle = useCallback(() => {
    const node = nodeRef.current
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
    if (!node) return
    node.textContent = label
    node.style.width = ''
  }, [label])

  const ref = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node
  }, [])

  const onMouseEnter = useCallback(() => {
    const node = nodeRef.current
    if (!node || prefersReducedMotion() || isCoarsePointer()) return
    settle()
    node.style.width = `${node.getBoundingClientRect().width}px`
    const started = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / SCRAMBLE_MS)
      if (t >= 1) return settle()
      node.textContent = scrambleFrame(label, revealedCount(label, t))
      frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
  }, [label, settle])

  // A hover that leaves mid-decode restores the label outright rather than
  // playing the rest of it out: the pointer has gone, so the animation has no
  // audience, and a label frozen on glyphs is the one failure that matters.
  useEffect(() => settle, [settle])

  return { ref, onMouseEnter, onMouseLeave: settle, 'aria-label': label }
}
