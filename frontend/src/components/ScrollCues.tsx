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

    // Section tops were re-measured every frame: 10 getElementById plus 10
    // getBoundingClientRect, each forcing a style/layout flush, at 60fps alongside a
    // WebGL scene, a post-processing chain, Lenis and the cursor loop. Layout only
    // changes on resize, so measure there instead and read the cache per frame.
    let cache: { top: number; ci: number }[] = []
    const measure = () => {
      const scrollY = window.scrollY
      cache = chapters
        .map((c, ci) => {
          const el = document.getElementById(c.id)
          return el ? { top: el.getBoundingClientRect().top + scrollY, ci } : null
        })
        .filter((e): e is { top: number; ci: number } => e !== null)
    }
    measure()

    window.addEventListener('resize', measure)
    // Section tops also move when the document reflows (fonts landing, images sizing,
    // a pinned stage changing height), which no resize event covers.
    const ro = new ResizeObserver(measure)
    ro.observe(document.documentElement)

    // Show/hide together: an element faded to opacity 0 keeps its focusable children
    // in the tab order, so the back-to-top button was reachable while invisible.
    const setShown = (root: HTMLElement, shown: boolean) => {
      root.style.opacity = shown ? '1' : '0'
      root.style.visibility = shown ? 'visible' : 'hidden'
    }

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const root = rootRef.current
      const text = textRef.current
      if (!root || !text) return

      // Nothing to show during the preloader and intro — skip the whole body rather
      // than run the cue maths behind a hidden overlay.
      if (!visible) {
        setShown(root, false)
        return
      }

      if (cache.length < 2) {
        setShown(root, false)
        return
      }
      const tops = cache.map((e) => e.top)
      const scrollY = window.scrollY
      const vh = window.innerHeight

      const idx = activeIndex(scrollY + vh * 0.5, tops)

      // Final section → end cue (back to top).
      if (idx >= tops.length - 1) {
        root.dataset.mode = 'end'
        text.textContent = "you've reached the end"
        setShown(root, true)
        return
      }

      // Hide in the hero so we don't double Hero's own "scroll to descend" cue.
      if (idx === 0) {
        root.dataset.mode = 'next'
        setShown(root, false)
        return
      }

      // Next-section cue: threshold = 16% of the CURRENT section's height.
      const threshold = (tops[idx + 1] - tops[idx]) * CUE_FRACTION
      const { active, nextIndex } = nextCue(scrollY, tops, threshold)
      root.dataset.mode = 'next'
      if (active && nextIndex !== null) {
        const c = chapters[cache[nextIndex].ci]
        text.textContent = `${c.theme} · ${c.plain}`
        setShown(root, true)
      } else {
        setShown(root, false)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [visible])

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
