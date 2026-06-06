import * as THREE from 'three'
import { TABLE_Y } from './map'

/** Faint gold corridor bars laid on the parchment (local plane XY after rotation). */
const CORRIDORS: { x: number; y: number; w: number; h: number }[] = [
  { x: 0, y: 1.4, w: 6.2, h: 0.03 },
  { x: 0, y: -1.4, w: 6.2, h: 0.03 },
  { x: -2.6, y: 0, w: 0.03, h: 2.8 },
  { x: 2.6, y: 0, w: 0.03, h: 2.8 },
  { x: -1.0, y: 0.4, w: 2.6, h: 0.025 },
  { x: 1.2, y: -0.5, w: 2.2, h: 0.025 },
  { x: 0.2, y: 0, w: 0.025, h: 1.8 },
]

/** Horizontal aged-parchment map with emissive gold corridor line-art (no texture
 * fetch — honors the no-network convention). Rotated flat like the floor rings. */
export function MapTable() {
  return (
    <group position={[0, TABLE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* parchment slab */}
      <mesh receiveShadow>
        <planeGeometry args={[7, 4.6]} />
        <meshStandardMaterial
          color="#241d10"
          emissive="#6b5526"
          emissiveIntensity={0.22}
          roughness={0.95}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* corridor bars, lifted slightly toward the viewer */}
      {CORRIDORS.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, 0.012]}>
          <planeGeometry args={[c.w, c.h]} />
          <meshBasicMaterial color="#e7c27d" transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  )
}
