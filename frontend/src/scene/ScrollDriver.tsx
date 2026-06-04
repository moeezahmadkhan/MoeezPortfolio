import { useFrame } from '@react-three/fiber'
import { getLenis } from '../smoothScroll'

/** Drives Lenis's RAF from inside the R3F loop. Renders nothing. */
export function ScrollDriver() {
  useFrame((state) => {
    getLenis()?.raf(state.clock.elapsedTime * 1000)
  })
  return null
}
