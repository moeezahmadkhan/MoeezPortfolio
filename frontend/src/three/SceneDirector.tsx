import { Suspense, useEffect, useRef, useState } from 'react'
import { CharacterRig } from './CharacterRig'
import { rigFor, type RigSpec } from './rigs'

// Must comfortably exceed CharacterRig's own FADE_LAMBDA settle time so the
// outgoing rig has visually finished fading before it unmounts.
const OUTGOING_UNMOUNT_MS = 900

/**
 * Hands the one model slot between sections as `activeId` changes. Mounts at
 * most two rigs at once — the incoming one and, briefly, the outgoing one it is
 * replacing — each in its own `Suspense` boundary so a section's model downloads
 * only once that section becomes active, never before.
 */
export function SceneDirector({ activeId }: { activeId: string }) {
  const target = rigFor(activeId)
  // Keep the outgoing rig mounted until it has faded, so the swap is a dissolve
  // rather than a pop.
  const [current, setCurrent] = useState<RigSpec | null>(target)
  const [outgoing, setOutgoing] = useState<RigSpec | null>(null)
  const timer = useRef<number>()

  useEffect(() => {
    if (target?.id === current?.id) return
    setOutgoing(current)
    setCurrent(target)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOutgoing(null), OUTGOING_UNMOUNT_MS)
    return () => window.clearTimeout(timer.current)
  }, [target?.id])

  return (
    <>
      {current && (
        <Suspense fallback={null}>
          <CharacterRig key={current.id} spec={current} fadeIn />
        </Suspense>
      )}
      {outgoing && (
        <Suspense fallback={null}>
          <CharacterRig key={outgoing.id} spec={outgoing} fadeIn={false} />
        </Suspense>
      )}
    </>
  )
}
