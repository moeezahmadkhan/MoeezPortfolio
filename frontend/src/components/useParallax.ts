import { useRef } from 'react'
import { useScroll, useTransform, type MotionValue } from 'framer-motion'
import { prefersReducedMotion } from '../smoothScroll'

/**
 * Returns a [ref, y] pair. `y` drifts the element by `speed` px across the
 * element's scroll-through-viewport range (positive speed enters lower and
 * rises as you scroll). No-op under reduced motion.
 */
export function useParallax(speed = 60): [React.RefObject<HTMLElement>, MotionValue<number>] {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const reduced = prefersReducedMotion()
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [speed, -speed])
  return [ref, y]
}
