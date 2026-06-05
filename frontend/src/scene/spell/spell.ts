import * as THREE from 'three'

/** Clamped 0→1 linear ramp of `now` across [start, start+duration]. */
export function castProgress(now: number, start: number, duration: number): number {
  if (duration <= 0) return 0
  return THREE.MathUtils.clamp((now - start) / duration, 0, 1)
}

/** Rise window (in progress units) over which a node fades from dark to fully lit. */
const RISE = 0.14

/** Local clamped smoothstep — 0 at/below start, 1 at/above end, eased between. */
function smooth01(x: number, start: number, end: number): number {
  if (end <= start) return x >= end ? 1 : 0
  const t = THREE.MathUtils.clamp((x - start) / (end - start), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * Ignition is compressed into [0, 1-RISE] of progress so that even the last node
 * (which sits at the path's end) finishes lighting by progress 1.
 */
const SPAN = 1 - RISE

/**
 * Glow (0→1) of node `index` of `count` at cast `progress`. Nodes sit evenly along
 * the path at i/(count-1); each ignites with a smoothstep as the bolt passes and
 * then stays lit (monotonic in progress). count<=1 → single node lights at 0.
 */
export function nodeGlow(progress: number, index: number, count: number): number {
  const frac = count <= 1 ? 0 : index / (count - 1)
  const start = frac * SPAN
  return smooth01(progress, start, start + RISE)
}

/**
 * Glow (0→1) of the stream segment `segIndex` (0..count-2) connecting node segIndex
 * to segIndex+1, at cast `progress`. Fills as the bolt travels that span.
 */
export function streamGlow(progress: number, segIndex: number, count: number): number {
  if (count <= 1) return 0
  const start = (segIndex / (count - 1)) * SPAN
  const end = ((segIndex + 1) / (count - 1)) * SPAN
  return smooth01(progress, start, end)
}

/** World placement of the spell chamber — left of the wizard (Tracker is on the right). */
export const STATION: [number, number, number] = [-13, 0, 0]

/**
 * Scroll fractions spanning the pinned #conjuring section. PLACEHOLDER values —
 * Task 9 re-measures real DOM offsets and overwrites these two numbers.
 */
export const SECTION_START = 0.62
export const SECTION_END = 0.72

/** Global scroll progress → 0→1 local progress within the conjuring section. */
export function localProgress(progress: number): number {
  return THREE.MathUtils.clamp(
    (progress - SECTION_START) / (SECTION_END - SECTION_START),
    0,
    1,
  )
}

export interface PipelineNode {
  name: string       // themed title shown big
  sub: string        // plain-language one-liner
  tags: string[]     // stack chips
  color: string      // orb hue (three.js literal)
}

/** The six A→Z build stages (client-grab framing). Single source of truth. */
export const NODES: PipelineNode[] = [
  { name: 'The Brief',     sub: 'Your idea, scoped',     tags: ['Discovery', 'Scope'],       color: '#e7c27d' },
  { name: 'The Mind',      sub: 'Retrieval + reasoning', tags: ['RAG', 'LangChain', 'LLMs'], color: '#7fd0c4' },
  { name: 'The Conduit',   sub: 'Backend API',           tags: ['FastAPI', 'REST'],          color: '#7fb6d8' },
  { name: 'The Vessel',    sub: 'Containerized',         tags: ['Docker'],                   color: '#9b8cff' },
  { name: 'The Summoning', sub: 'Deployed to the cloud', tags: ['AWS', 'GCP', 'CI/CD'],      color: '#ffa64d' },
  { name: 'Live App',      sub: 'Delivered, end to end', tags: ['Full-stack AI'],            color: '#ffe2b0' },
]

/** Local-space position of node `i` along a gentle left→right, slightly rising arc. */
export function nodePosition(i: number): [number, number, number] {
  const n = NODES.length - 1
  const t = n === 0 ? 0 : i / n // 0→1
  const x = THREE.MathUtils.lerp(-3.2, 3.2, t)
  const y = 0.2 + Math.sin(t * Math.PI) * 0.9 // arch upward in the middle
  const z = -Math.cos(t * Math.PI) * 0.6      // gentle bow toward camera at the ends
  return [x, y, z]
}

/**
 * Out-of-React cast state — written by the HTML Cast button, read in useFrame.
 * Same pattern as scrollState: never lift into useState/context.
 *   requested → a new cast was asked for (consumed by SpellStation to set startedAt)
 *   startedAt → clock time the active cast began (-1 when idle)
 *   progress  → 0→1 driven each frame from castProgress()
 *   hasCast   → true after the first cast (button label flips to "Recast")
 */
export const spellState = {
  requested: false,
  startedAt: -1,
  progress: 0,
  hasCast: false,
}

/** Duration of one cast, in seconds. */
export const CAST_DURATION = 3.0
