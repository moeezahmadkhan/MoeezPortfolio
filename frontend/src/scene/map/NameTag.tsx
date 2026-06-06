import { useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { scrollState } from '../../scroll'
import { localProgress, revealState, detectionAt, walkerPosition, PASSERSBY } from './map'

function driveNow(): number {
  return revealState.active
    ? revealState.progress
    : localProgress(scrollState.progress) * 0.6
}

/** One label per passer-by; resolves from "· · ·" to the name once the reveal sweep
 * passes its position and detection has locked. State flips at most a few times, so
 * a guarded setState here is cheap (not per-frame churn). */
function Tag({ name, at }: { name: string; at: number }) {
  const [resolved, setResolved] = useState(false)
  const pos = walkerPosition(at)

  useFrame(() => {
    const drive = driveNow()
    const next = drive >= at && detectionAt(drive).locked
    if (next !== resolved) setResolved(next)
  })

  return (
    <Billboard position={[pos[0], pos[1] + 0.6, pos[2]]}>
      <Text
        fontSize={0.16}
        color={resolved ? '#ffe2b0' : '#7fd0c4'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.004}
        outlineColor="#07070d"
      >
        {resolved ? name : '· · ·'}
      </Text>
    </Billboard>
  )
}

export function NameTag() {
  return (
    <>
      {PASSERSBY.map((p) => (
        <Tag key={p.name} name={p.name} at={p.at} />
      ))}
    </>
  )
}
