import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Scene } from './scene/Scene'
import { Hero } from './components/Hero'
import { Cursor } from './components/Cursor'
import { Candles } from './components/Candles'
import { ScrollRail } from './components/ScrollRail'
import { ScrollCues } from './components/ScrollCues'
import { About, Spells, Grimoire, Tracker, Chronicles, OwlPost } from './components/Sections'
import { useSmoothScroll } from './smoothScroll'
import { useScrollTracker } from './scroll'
import { useScrollSettle } from './useScrollSettle'
import './App.css'

export default function App() {
  const { progress, active } = useProgress()
  const [loaded, setLoaded] = useState(false)
  const [reveal, setReveal] = useState(0)
  const raf = useRef<number>()

  useSmoothScroll()
  useScrollTracker()
  useScrollSettle()

  // Once assets finish, hold a beat then drive the conjuring reveal 0 → 1.
  useEffect(() => {
    if (!active && progress >= 100 && !loaded) {
      const t = setTimeout(() => setLoaded(true), 500)
      return () => clearTimeout(t)
    }
  }, [active, progress, loaded])

  useEffect(() => {
    if (!loaded) return
    const start = performance.now()
    const DURATION = 1800
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1)
      setReveal(p)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [loaded])

  return (
    <MotionConfig reducedMotion="user">
      <div className="canvas-layer">
        <Scene reveal={reveal} />
      </div>

      <Candles />
      <Cursor />
      <ScrollRail />
      <ScrollCues visible={loaded} />

      <AnimatePresence>
        {!loaded && (
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

      <main>
        <Hero />
        <About />
        <Spells />
        <Grimoire />
        <Tracker />
        <Chronicles />
        <OwlPost />
      </main>
    </MotionConfig>
  )
}
