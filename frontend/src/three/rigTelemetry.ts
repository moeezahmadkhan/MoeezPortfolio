// Where the live rig actually is, this frame.
//
// This exists because of a rule that keeps being rediscovered: still
// screenshots cannot verify motion. `tools/shoot.mjs` waits for
// `window.__modelReady`, which latches only once a rig has SETTLED, so it is
// blind by construction to anything that is only true mid-transition — and the
// two things mobile gained (the opening push-in, and the figure travelling
// between `rigs.ts`'s MOBILE_STATIONS) are visible only mid-transition. A
// screenshot of a settled station cannot tell you whether the figure slid there
// or teleported.
//
// So the rig publishes its own transform and `tools/check_stations.mjs` samples
// it across a real section change. The pure maths underneath (`introOffsets`,
// `damp`) is unit-tested; what this measures is the WIRING, which is the half a
// unit test cannot reach.
//
// Shaped like the other per-frame singletons (`scrollState`, `wizardState`,
// `focusState`, `orbitState`): one mutable module object, written in the frame
// loop, never React state. It is preallocated and written in place, so a frame
// costs six numeric property writes and allocates nothing.

export type RigTelemetry = {
  /** World-space position of the mounted rig group. */
  x: number
  y: number
  z: number
  /** Uniform scale of the group. */
  scale: number
  /** The opacity the body materials are actually being given. */
  opacity: number
  /** The one-shot opening push-in's progress, 0 to 1. */
  intro: number
}

export const rigTelemetry: RigTelemetry = { x: 0, y: 0, z: 0, scale: 0, opacity: 0, intro: 0 }

declare global {
  interface Window {
    __rig?: RigTelemetry
  }
}

/** Publishes the singleton on `window` so a headless probe can read it. */
export function exposeRigTelemetry(): void {
  if (typeof window === 'undefined') return
  window.__rig = rigTelemetry
}
