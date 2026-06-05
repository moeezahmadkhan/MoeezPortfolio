import { useEffect, useRef } from 'react'
import { getLenis, prefersReducedMotion } from '../smoothScroll'
import { chapters } from '../chapters'
import { activeIndex, nextCue } from '../scrollMath'
import './ScrollCues.css'

const CUE_FRACTION = 0.16 // show the cue in the last 16% of the current section

/**
 * Fixed bottom-center wayfinding overlay. A single rAF loop reads scroll + live
 * section tops and mutates its own refs directly (no per-frame React state), in
 * keeping with the scrollState singleton philosophy. `visible` gates it off during
 * the preloader.
 */
export function ScrollCues({ visible }: { visible: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const root = rootRef.current
      const text = textRef.current
      if (!root || !text) return

      const scrollY = window.scrollY
      const vh = window.innerHeight
      const tops = chapters.map((c) => {
        const el = document.getElementById(c.id)
        return el ? el.getBoundingClientRect().top + scrollY : Number.POSITIVE_INFINITY
      })
      const valid = tops.filter((t) => Number.isFinite(t)) as number[]
      if (valid.length < 2) {
        root.style.opacity = '0'
        return
      }

      const idx = activeIndex(scrollY + vh * 0.5, valid)

      // Final section → end cue (back to top).
      if (idx >= valid.length - 1) {
        root.dataset.mode = 'end'
        text.textContent = "you've reached the end"
        root.style.opacity = '1'
        return
      }

      // Hide in the hero so we don't double Hero's own "scroll to descend" cue.
      if (idx === 0) {
        root.dataset.mode = 'next'
        root.style.opacity = '0'
        return
      }

      // Next-section cue: threshold = 16% of the CURRENT section's height.
      const threshold = (valid[idx + 1] - valid[idx]) * CUE_FRACTION
      const { active, nextIndex } = nextCue(scrollY, valid, threshold)
      root.dataset.mode = 'next'
      if (active && nextIndex !== null) {
        const c = chapters[nextIndex]
        text.textContent = `${c.theme} · ${c.plain}`
        root.style.opacity = '1'
      } else {
        root.style.opacity = '0'
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const toTop = () => {
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { duration: 1.0 })
    else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <div
      ref={rootRef}
      className={`scroll-cues${reduced ? ' scroll-cues--static' : ''}`}
      data-mode="next"
      style={{ opacity: 0, visibility: visible ? 'visible' : 'hidden' }}
    >
      <span className="scroll-cues__label" aria-hidden="true">next</span>
      <span className="scroll-cues__arrow" aria-hidden="true">↓</span>
      <span ref={textRef} className="scroll-cues__text" aria-hidden="true" />
      <button className="scroll-cues__top" onClick={toTop}>↑ back to top</button>
    </div>
  )
}
