import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { applyWizardingMaterials, disposeModel } from '../characterMaterial'
import { spellState } from './spell'

useGLTF.preload('/models/spellcaster.glb')

const MODEL = '/models/spellcaster.glb'

// ── live-tunable transform (station-local space) ──────────────────────────
/** Where the caster stands. Kept right-of-centre + forward so it clears the
 *  left-hand HTML text panel and reads as the figure casting the pipeline. */
const POS: [number, number, number] = [1.9, -0.35, 1.6]
const SCALE = 2.7
/** The model lunges with its wand toward +X; a turn toward the +Z camera gives
 *  a dramatic 3/4 view instead of a flat profile. */
const FACING_Y = 2.6
/**
 * Wand-tip in the model's own space (glTF), before Center/scale. Measured from
 * the mesh's extreme +X vertex. The FX group is parented under the same
 * Center+scale so it tracks the tip; tune if the model transform changes.
 */
const WAND_TIP_RAW: [number, number, number] = [0.5, 0.1, -0.38]

export function SpellCaster() {
  const wandLight = useRef<THREE.PointLight>(null)
  const body = useRef<THREE.Group>(null)
  const { scene } = useGLTF(MODEL)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    applyWizardingMaterials(clone)
    return clone
  }, [scene])

  useEffect(() => () => disposeModel(model), [model])

  const tip = useMemo<[number, number, number]>(
    () => [WAND_TIP_RAW[0] * SCALE, WAND_TIP_RAW[1] * SCALE, WAND_TIP_RAW[2] * SCALE],
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (body.current) {
      // a held, breathing lunge — alive but anchored
      body.current.position.y = POS[1] + Math.sin(t * 0.9) * 0.03
    }
    if (wandLight.current) {
      // baseline flicker, surges while a spell is being cast
      const cast = THREE.MathUtils.clamp(spellState.progress, 0, 1)
      wandLight.current.intensity = 1.4 + Math.sin(t * 3.2) * 0.5 + cast * 4
    }
  })

  return (
    <group ref={body} position={POS}>
      <group rotation={[0, FACING_Y, 0]}>
        <Center>
          <primitive object={model} scale={SCALE} />
        </Center>
        {/* wand-tip magic — additive orb + pulsing light + sparks */}
        <group position={tip}>
          <mesh>
            <sphereGeometry args={[0.06, 20, 20]} />
            <meshBasicMaterial
              color="#fff4d6"
              transparent
              opacity={0.75}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <pointLight ref={wandLight} color="#ffe2b0" intensity={1.6} distance={4} decay={2} />
          <Sparkles count={26} scale={1.0} size={3.4} speed={0.6} noise={0.55} color="#ffcf8f" />
        </group>
      </group>
    </group>
  )
}
