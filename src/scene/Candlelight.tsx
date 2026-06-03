import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** A warm point light that flickers like a floating candle. */
export function Candlelight({
  position,
  intensity = 8,
  color = '#ffb866',
  speed = 1,
  seed = 0,
}: {
  position: [number, number, number]
  intensity?: number
  color?: string
  speed?: number
  seed?: number
}) {
  const light = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    if (!light.current) return
    const t = state.clock.elapsedTime * speed + seed
    // Layered sines = organic candle flicker.
    const flicker = 0.78 + 0.22 * (Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1 + 1.7) * 0.3 + Math.sin(t * 3.1) * 0.2)
    light.current.intensity = intensity * flicker
    light.current.position.x = position[0] + Math.sin(t * 1.3 + seed) * 0.04
  })

  return (
    <pointLight
      ref={light}
      position={position}
      color={color}
      intensity={intensity}
      distance={14}
      decay={2}
      castShadow={false}
    />
  )
}
