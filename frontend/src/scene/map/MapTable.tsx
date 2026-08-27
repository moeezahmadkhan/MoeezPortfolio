import { useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { TABLE_Y } from './map'

/** The map art is the square illustration the user supplied (a Marauder's-Map
 *  scene with a baked "TARGET TELEMETRY LOG" panel — the AI/vision angle in-frame).
 *  Source SVG wrapped a 1013×1024 raster; we ship that PNG directly. */
const MAP_SRC = '/maraudersmap.png'
/** Roughly square plane (matches the 1013×1024 art), sized to fill the easel. */
const MAP_W = 6.6
const MAP_H = MAP_W * (1024 / 1013)

useTexture.preload(MAP_SRC)

// Phones use the lighter post chain (small bloom kernel) and view the parchment at
// a steeper down-angle, so the same emissive reads dimmer than on desktop. Push the
// self-illumination harder there so the AI telemetry panel stays legible.
const isMobile =
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720)
const MAP_EMISSIVE = isMobile ? 1.25 : 0.7

/**
 * Horizontal aged-parchment map laid flat like the floor rings, tilted toward the
 * camera by the station. The illustration is lit by the station rig AND carries a
 * strong emissive copy of itself so it stays legible in the candlelit hall and so
 * its gold ink + teal "ink trail" bloom under postprocessing ("lighten parts").
 * The live footprints, reticle, EdgeBox and HUD animate on top of this surface.
 */
export function MapTable() {
  const map = useTexture(MAP_SRC)
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 8
  }, [map])

  return (
    <group position={[0, TABLE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        <planeGeometry args={[MAP_W, MAP_H]} />
        <meshStandardMaterial
          map={map}
          emissive="#ffffff"
          emissiveMap={map}
          emissiveIntensity={MAP_EMISSIVE}
          roughness={0.92}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
