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

// Hogwarts-ish turreted skyline.
const CASTLE =
  'M0,160 L0,96 L18,96 L18,80 L26,80 L26,96 L48,96 L48,60 L54,52 L60,60 L60,96 ' +
  'L92,96 L92,40 L98,40 L98,26 L104,26 L104,40 L110,40 L110,96 L150,96 L150,70 ' +
  'L158,62 L166,70 L166,96 L210,96 L210,30 L216,30 L216,14 L222,14 L222,30 L228,30 ' +
  'L228,96 L270,96 L270,66 L278,58 L286,66 L286,96 L330,96 L330,82 L338,74 L346,82 ' +
  'L346,96 L372,96 L372,88 L382,88 L382,96 L400,96 L400,160 Z'

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
      <div className="intro__moon" />
      <div className="intro__fog intro__fog--1" />
      <div className="intro__fog intro__fog--2" />
      <div className="intro__fog intro__fog--3" />
      <svg className="intro__castle" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <path d={CASTLE} />
      </svg>
      <span className="intro__bird" aria-hidden="true" style={{ top: '30%', left: '24%' }}>{'⌃'}</span>
      <span className="intro__bird intro__bird--2" aria-hidden="true" style={{ top: '38%', left: '60%' }}>{'⌃'}</span>

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
