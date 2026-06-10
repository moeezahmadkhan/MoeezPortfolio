import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './CinematicIntro.css'

const EASE = [0.16, 1, 0.3, 1] as const

// Timeline (ms).
const CARD_SWAP = 3000   // card 1 → card 2
const FINISH = 6500      // dissolve into the hero
const REDUCED_FINISH = 2000 // shortened path under prefers-reduced-motion

const CARDS = [
  { eyebrow: '✦  ✦  ✦', title: 'Welcome To The Archive' },
  { eyebrow: 'My Name Is', title: 'Moeez Ahmad Khan' },
]

// Hogwarts-ish skyline: layered walls rising to tall central spires.
const CASTLE =
  'M0,160 L0,112 L24,112 L24,96 L34,96 L34,70 L39,58 L44,70 L44,96 L70,96 L70,82 ' +
  'L82,82 L82,48 L88,34 L94,48 L94,82 L120,82 L120,92 L138,92 L138,58 L146,40 L154,58 ' +
  'L154,92 L176,92 L176,40 L186,18 L196,40 L196,92 L218,92 L218,52 L226,34 L234,52 ' +
  'L234,92 L262,92 L262,80 L274,80 L274,50 L280,38 L286,50 L286,80 L312,80 L312,98 ' +
  'L330,98 L330,84 L338,72 L346,84 L346,98 L368,98 L368,108 L400,108 L400,160 Z'

// A small flock — width in px, height follows the 3:1 viewBox.
const BIRDS = [
  { top: '24%', left: '10%', w: 26, delay: '0s', dur: '15s' },
  { top: '31%', left: '18%', w: 18, delay: '3.5s', dur: '18s' },
  { top: '20%', left: '68%', w: 22, delay: '1.4s', dur: '16s' },
  { top: '35%', left: '60%', w: 15, delay: '5s', dur: '20s' },
]

const EMBERS = [
  { left: '18%', delay: '0s', dur: '9s' },
  { left: '40%', delay: '3s', dur: '11s' },
  { left: '64%', delay: '1.5s', dur: '10s' },
  { left: '82%', delay: '5s', dur: '12s' },
]

export function CinematicIntro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const done = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const [reduced] = useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const finish = () => {
    if (done.current) return
    done.current = true
    onDoneRef.current()
  }

  useEffect(() => {
    const timers: number[] = []
    if (reduced) {
      setStep(1)
      timers.push(window.setTimeout(finish, REDUCED_FINISH))
    } else {
      timers.push(window.setTimeout(() => setStep(1), CARD_SWAP))
      timers.push(window.setTimeout(finish, FINISH))
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => {
      timers.forEach((t) => clearTimeout(t))
      window.removeEventListener('keydown', onKey)
    }
    // finish is stable for the life of the component (guarded by done ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  const card = CARDS[step]

  return (
    <motion.div
      className="intro"
      onClick={finish}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: 'easeInOut' }}
      role="dialog"
      aria-modal="true"
      aria-label="Intro sequence"
    >
      <div className="intro__sky" />
      <div className="intro__stars" />
      <div className="intro__moon" />
      <div className="intro__fog intro__fog--1" />
      <div className="intro__fog intro__fog--2" />
      <div className="intro__fog intro__fog--3" />
      <svg className="intro__castle" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <path d={CASTLE} />
      </svg>
      <div className="intro__mist" />

      {BIRDS.map((b, i) => (
        <svg
          key={i}
          className="intro__bird"
          aria-hidden="true"
          viewBox="0 0 24 8"
          width={b.w}
          height={b.w / 3}
          style={{ top: b.top, left: b.left, animationDelay: b.delay, animationDuration: b.dur }}
        >
          <path d="M0 6 Q6 0 12 6 Q18 0 24 6" />
        </svg>
      ))}

      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="intro__ember"
          aria-hidden="true"
          style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur }}
        />
      ))}

      <div className="intro__center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="intro__card"
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <p className="intro__eyebrow">{card.eyebrow}</p>
            <h1 className="intro__title">{card.title}</h1>
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        className="intro__skip"
        onClick={(e) => { e.stopPropagation(); finish() }}
      >
        Enter {'✦'}
      </button>
    </motion.div>
  )
}
