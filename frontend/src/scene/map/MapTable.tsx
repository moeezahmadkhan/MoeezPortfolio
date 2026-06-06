import * as THREE from 'three'
import { TABLE_Y } from './map'
import { PARCHMENT_SVG, INK_SVG } from './parchment'
import { useSvgTexture } from './useSvgTexture'

/**
 * Horizontal aged-parchment map, drawn from original Marauder's-Map-style SVG
 * art (see parchment.ts). Two layers: a matte parchment base lit by the scene
 * rig, and a gold ink overlay lifted toward the viewer so it blooms under
 * postprocessing. Rotated flat like the floor rings. No texture fetch — the SVGs
 * are inlined and rasterized once via useSvgTexture. The live footprints,
 * reticle, EdgeBox and HUD animate on top of this surface.
 */
export function MapTable() {
  const parchment = useSvgTexture(PARCHMENT_SVG)
  const ink = useSvgTexture(INK_SVG)

  return (
    <group position={[0, TABLE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* parchment slab — falls back to a flat tone until the texture resolves */}
      <mesh receiveShadow>
        <planeGeometry args={[7, 4.6]} />
        <meshStandardMaterial
          map={parchment ?? undefined}
          color={parchment ? '#ffffff' : '#241d10'}
          emissive="#c9a460"
          emissiveMap={parchment ?? undefined}
          emissiveIntensity={parchment ? 0.55 : 0.22}
          roughness={0.95}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* gold ink line-art, lifted slightly toward the viewer; glows under bloom */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[7, 4.6]} />
        <meshBasicMaterial
          map={ink ?? undefined}
          color="#ffffff"
          transparent
          opacity={ink ? 1 : 0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
