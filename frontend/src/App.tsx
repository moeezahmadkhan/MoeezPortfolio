import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Scene } from './scene/Scene'
import { Hero } from './components/Hero'
import { Cursor } from './components/Cursor'
import { Candles } from './components/Candles'
import { ScrollRail } from './components/ScrollRail'
import { ScrollCues } from './components/ScrollCues'
import { GrimoireChat } from './components/GrimoireChat'
import { SiteNav } from './components/SiteNav'
import { CinematicIntro } from './components/CinematicIntro'
import { About, Spells, Grimoire, Conjuring, Pact, Tracker, Marauders, Chronicles, OwlPost } from './components/Sections'
import { useSmoothScroll, getLenis } from './smoothScroll'
import { useScrollTracker } from './scroll'
import { useScrollSettle } from './useScrollSettle'
import './App.css'

export default function App() {
  const { progress, active } = useProgress()
  const [phase, setPhase] = useState<'loading' | 'intro' | 'live'>('loading')
  const [reveal, setReveal] = useState(0)
  const raf = useRef<number>()
  const ramped = useRef(false)

  useSmoothScroll()
  useScrollTracker()
  useScrollSettle()

  // Once assets finish, hold a beat then play the cinematic intro. It plays on
  // every load (no once-per-session gate).
  useEffect(() => {
    if (phase !== 'loading') return
    if (!active && progress >= 100) {
      const t = setTimeout(() => setPhase('intro'), 500)
      return () => clearTimeout(t)
    }
  }, [active, progress, phase])

  // Drive the conjuring reveal 0 → 1 once we leave the loader, so the figurine
  // is alive behind the intro and ready when it dissolves. Runs exactly once.
  useEffect(() => {
    if (phase === 'loading' || ramped.current) return
    ramped.current = true
    const start = performance.now()
    const DURATION = 1800
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1)
      setReveal(p)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [phase])

  // Hold the page still until the hero is live so the loader/intro can't be
  // scrolled past (which would silently drift the camera rig). Locks Lenis
  // (smooth scroll) and, for the reduced-motion path where Lenis is absent,
  // the document overflow as well.
  useEffect(() => {
    const root = document.documentElement
    if (phase === 'live') {
      root.style.overflow = ''
      getLenis()?.start()
    } else {
      root.style.overflow = 'hidden'
      getLenis()?.stop()
    }
    return () => { root.style.overflow = '' }
  }, [phase])

  const handleIntroDone = () => {
    setPhase('live')
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="canvas-layer">
        <Scene reveal={reveal} />
      </div>

      <Candles />
      <Cursor />
      <SiteNav />
      <ScrollRail />
      <ScrollCues visible={phase === 'live'} />
      <GrimoireChat />

      <AnimatePresence>
        {phase === 'loading' && (
          <motion.div
            className="preloader"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          >
            <div className="preloader__rune" />
            <p className="eyebrow">Lumos</p>
            <p className="preloader__pct">{Math.round(progress)}%</p>
            <p className="preloader__hint">summoning the figurine…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'intro' && <CinematicIntro onDone={handleIntroDone} />}
      </AnimatePresence>

      <main>
        <Hero />
        <About />
        <Spells />
        <Conjuring />
        <Grimoire />
        <Pact />
        <Tracker />
        <Marauders />
        <Chronicles />
        <OwlPost />
      </main>
    </MotionConfig>
  )
}
