import { Suspense, useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { whenIdle } from '../lib/idle'
import { CharacterRig } from './CharacterRig'
import { preloadKtx2Gltf } from './ktx2'
import { nextRig, rigFor, type RigSpec } from './rigs'

// Must comfortably exceed CharacterRig's own FADE_LAMBDA settle time so the
// outgoing rig has visually finished fading before it unmounts.
const OUTGOING_UNMOUNT_MS = 900

// One mounted CharacterRig, tracked by a `genId` that is assigned once, when
// the rig first becomes current, and then kept for the rest of its life —
// including once it becomes an outgoing entry (`fadeIn: false`). This is
// what lets a rig that is still fading out survive a second, faster
// transition: it stays the same array entry (and the same React element
// identity, via `key={genId}` below) throughout, rather than being
// discarded and replaced the instant another transition starts. See
// Finding 1.
type RigEntry = {
  genId: number
  spec: RigSpec
  fadeIn: boolean
  // True only for the very first entry ever created, and only when it's the
  // hero — threaded through to CharacterRig's `skipInitialFade` prop.
  skipInitialFade: boolean
}

/**
 * Hands the one model slot between sections as `activeId` changes. Mounts at
 * most a couple of rigs at once — the current one and, briefly, whichever
 * ones are still mid-dissolve out — each in its own `Suspense` boundary so a
 * section's model downloads only once that section becomes active, never
 * before.
 *
 * Every mounted rig lives in a single `rigs` list rather than two separate
 * "current" / "outgoing" slots. A rig already fading out when a second
 * transition fires keeps its own list entry (and its own unmount timer)
 * instead of being clobbered by whatever the new outgoing rig is — so two
 * quick transitions produce two independently-dissolving rigs, not a
 * dropped/popped one.
 */
export function SceneDirector({ activeId }: { activeId: string }) {
  const target = rigFor(activeId)
  const nextGenId = useRef(1)
  const [rigs, setRigs] = useState<RigEntry[]>(() =>
    target
      ? [{ genId: 0, spec: target, fadeIn: true, skipInitialFade: target.id === 'hero' }]
      : [],
  )
  // genId -> unmount timeout id. A single shared map so the unmount effect
  // below can sweep every outstanding timer regardless of which render
  // scheduled it, and clear timers cannot fire after this component itself
  // unmounts.
  const unmountTimers = useRef(new Map<number, number>())
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    setRigs((prev) => {
      const incomingId = prev.find((r) => r.fadeIn)?.spec.id ?? null
      if (incomingId === (target?.id ?? null)) return prev
      // Whichever entry was incoming now starts fading out — it keeps its
      // existing genId/entry rather than being replaced, so its own
      // CharacterRig instance (and in-flight fade value) survives.
      const withOutgoing = prev.map((r) => (r.fadeIn ? { ...r, fadeIn: false } : r))
      if (!target) return withOutgoing
      return [
        ...withOutgoing,
        { genId: nextGenId.current++, spec: target, fadeIn: true, skipInitialFade: false },
      ]
    })
  }, [target?.id])

  // Schedule removal for whichever entries just started fading out — keyed
  // on genId so an entry that was already scheduled (from an earlier
  // transition) never gets a second timer.
  useEffect(() => {
    // TEMP DEBUG — Finding 1 verification only, removed before commit.
    const w = window as unknown as { __sdLog?: unknown[] }
    w.__sdLog ??= []
    w.__sdLog.push({
      t: Math.round(performance.now()),
      rigs: rigs.map((r) => ({ genId: r.genId, id: r.spec.id, fadeIn: r.fadeIn })),
    })
    for (const entry of rigs) {
      if (entry.fadeIn || unmountTimers.current.has(entry.genId)) continue
      const genId = entry.genId
      const scheduledAt = performance.now()
      const id = window.setTimeout(() => {
        unmountTimers.current.delete(genId)
        w.__sdLog!.push({
          t: Math.round(performance.now()),
          removedGenId: genId,
          removedSpecId: entry.spec.id,
          msSinceScheduled: Math.round(performance.now() - scheduledAt),
        })
        setRigs((prev) => prev.filter((r) => r.genId !== genId))
      }, OUTGOING_UNMOUNT_MS)
      unmountTimers.current.set(genId, id)
    }
  }, [rigs])

  // Belt-and-braces: clear every still-pending unmount timer on unmount, so
  // none of them can fire (and call setRigs on an unmounted component) after
  // the fact.
  useEffect(() => {
    const timers = unmountTimers.current
    return () => {
      for (const id of timers.values()) window.clearTimeout(id)
      timers.clear()
    }
  }, [])

  // Lookahead: start fetching the model for the section that FOLLOWS the
  // current one, so it has usually already arrived by the time that section
  // becomes active and the rig fades in instead of popping. The hero is the
  // odd case — it's already "current" the instant the page mounts, before the
  // visitor has done anything — so its lookahead additionally waits for a
  // real scroll event. That keeps a load-and-never-scroll visit down to
  // exactly the hero's own model, same as before this change.
  useEffect(() => {
    const upcoming = nextRig(target?.id)
    if (!upcoming) return undefined

    const schedule = () => whenIdle(() => preloadKtx2Gltf(upcoming.model, gl))

    if (target?.id !== 'hero') {
      const cancel = schedule()
      return cancel
    }

    let cancelIdle: (() => void) | undefined
    const onScroll = () => {
      window.removeEventListener('scroll', onScroll)
      cancelIdle = schedule()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelIdle?.()
    }
  }, [target?.id, gl])

  return (
    <>
      {rigs.map((entry) => (
        <Suspense key={entry.genId} fallback={null}>
          <CharacterRig
            spec={entry.spec}
            fadeIn={entry.fadeIn}
            skipInitialFade={entry.skipInitialFade}
          />
        </Suspense>
      ))}
    </>
  )
}
