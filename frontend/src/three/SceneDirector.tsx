import { Suspense, useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { whenIdle } from '../lib/idle'
import { CharacterRig } from './CharacterRig'
import { preloadKtx2Gltf } from './ktx2'
import { nextRig, rigFor, type RigSpec } from './rigs'

// Must comfortably exceed the settle time of the rig cross-fade's own
// FADE_LAMBDA (motion.ts) so the outgoing rig has visually finished fading
// before it unmounts.
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
export function SceneDirector({
  activeId,
  mobile,
  onMountedChange,
}: {
  activeId: string
  mobile: boolean
  /**
   * Fires when this component goes from holding no rigs to holding at least
   * one, or back. `Stage` uses it to decide whether the post-processing chain
   * is worth running at all — see the composer's comment there. Called on a
   * section change, never per frame.
   */
  onMountedChange?: (mounted: boolean) => void
}) {
  // `mobile` is a gate, not a style: on a phone `rigFor` resolves every
  // non-hero section to null, so the work and experience models never mount
  // and — via `nextRig` below — are never fetched either. See rigs.ts.
  const target = rigFor(activeId, mobile)
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
    for (const entry of rigs) {
      if (entry.fadeIn || unmountTimers.current.has(entry.genId)) continue
      const genId = entry.genId
      const id = window.setTimeout(() => {
        unmountTimers.current.delete(genId)
        setRigs((prev) => prev.filter((r) => r.genId !== genId))
      }, OUTGOING_UNMOUNT_MS)
      unmountTimers.current.set(genId, id)
    }
  }, [rigs])

  // Report whether anything is on stage. The interesting edge is the trailing
  // one: a rig that has started fading out is still mounted and still drawing,
  // so this stays true until the last outgoing rig is actually removed. That
  // is what stops the composer from being torn out from under a wand that is
  // still mid-dissolve.
  const mounted = rigs.length > 0
  useEffect(() => {
    onMountedChange?.(mounted)
  }, [mounted, onMountedChange])

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
    const upcoming = nextRig(target?.id, mobile)
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
  }, [target?.id, gl, mobile])

  return (
    <>
      {rigs.map((entry) => (
        <Suspense key={entry.genId} fallback={null}>
          <CharacterRig
            spec={entry.spec}
            fadeIn={entry.fadeIn}
            skipInitialFade={entry.skipInitialFade}
            mobile={mobile}
            // The section that currently owns the screen, forwarded so the one
            // persistent mobile rig knows which of `rigs.ts`'s MOBILE_STATIONS
            // to travel to. A prop, not a module singleton: this changes on
            // section boundaries, not per frame, so it is ordinary React state
            // and belongs in the render path like any other.
            activeId={activeId}
          />
        </Suspense>
      ))}
    </>
  )
}
