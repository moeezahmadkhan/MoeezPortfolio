import { useScroll, useTransform, motion, type MotionValue } from 'framer-motion'
import './Candles.css'

type Spec = { left: string; top: string; depth: number; scale: number; delay: number }

// depth = parallax strength (further candles drift less)
const CANDLES: Spec[] = [
  { left: '8%', top: '18%', depth: -220, scale: 0.7, delay: 0 },
  { left: '82%', top: '12%', depth: -360, scale: 1, delay: 1.2 },
  { left: '67%', top: '32%', depth: -140, scale: 0.55, delay: 0.6 },
  { left: '18%', top: '62%', depth: -300, scale: 0.85, delay: 0.3 },
  { left: '90%', top: '58%', depth: -180, scale: 0.65, delay: 2.1 },
  { left: '38%', top: '8%', depth: -260, scale: 0.5, delay: 1.7 },
  { left: '52%', top: '78%', depth: -120, scale: 0.75, delay: 0.9 },
]

function Candle({ spec, progress }: { spec: Spec; progress: MotionValue<number> }) {
  const y = useTransform(progress, [0, 1], [0, spec.depth])
  return (
    <motion.div
      className="candle"
      style={{ left: spec.left, top: spec.top, y, scale: spec.scale }}
    >
      <span className="candle__flame" style={{ animationDelay: `${spec.delay}s` }} />
      <span className="candle__halo" />
      <span className="candle__body" />
    </motion.div>
  )
}

/** Floating candles à la the Great Hall, drifting at different depths as you scroll. */
export function Candles() {
  const { scrollYProgress } = useScroll()
  return (
    <div className="candles" aria-hidden>
      {CANDLES.map((c, i) => (
        <Candle key={i} spec={c} progress={scrollYProgress} />
      ))}
    </div>
  )
}
