#!/usr/bin/env node
/**
 * Budget gates. Exits non-zero on any breach, so a budget cannot quietly
 * become a wish. Run against a production build:
 *
 *   npm run build && npm run gates
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, extname } from 'node:path'

const DIST = 'dist'
const KB = 1024

const BUDGETS = {
  entryJsGzip: 150 * KB,      // initial JS before any 3D
  threeChunkGzip: 200 * KB,   // the lazily-imported 3D chunk
  firstViewTotal: 1.5 * 1024 * KB,
  worldTotal: 6 * 1024 * KB,
}

const failures = []
const notes = []

function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const files = walk(DIST)
if (files.length === 0) {
  console.error('gates: no dist/ — run `npm run build` first.')
  process.exit(2)
}

const gz = (p) => gzipSync(readFileSync(p)).length
const raw = (p) => statSync(p).size
const fmt = (n) => `${(n / KB).toFixed(1)}KB`

const js = files.filter((f) => extname(f) === '.js')
const threeChunks = js.filter((f) => /three/i.test(f))

// "Entry" is what a `<script>` tag in the document actually pulls in — not
// everything that is not three. A chunk reached only through a dynamic
// import() is not on the first-load path and must not be charged to it.
const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8')
const scriptSrcs = [...indexHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
const entryChunks = js.filter((f) => scriptSrcs.some((src) => f.endsWith(src.replace(/^\//, ''))))
// A zero-byte entry passes every size budget it is charged against, so an
// unresolved <script src> has to be a breach rather than a quiet 0.0KB.
if (entryChunks.length !== scriptSrcs.length) {
  failures.push(`${scriptSrcs.length} script src(s) in index.html resolved to ${entryChunks.length} chunk(s) in ${DIST}`)
}
const lazyChunks = js.filter((f) => !entryChunks.includes(f) && !threeChunks.includes(f))

// ── Gate 1: nothing in the entry graph may pull three ───────────────────────
// A dynamic import() is what keeps three out of the first load. If the string
// "THREE." or a three module marker appears in an entry chunk, the split broke
// and the 150KB budget is gone.
for (const f of entryChunks) {
  const src = readFileSync(f, 'utf8')
  if (/\bTHREE\b|three\/build\/three|WebGLRenderer/.test(src)) {
    failures.push(`entry chunk ${f} references three — the 3D layer must be dynamically imported`)
  }
}

// ── Gate 2: entry JS size ──────────────────────────────────────────────────
const entryBytes = entryChunks.reduce((n, f) => n + gz(f), 0)
if (entryBytes > BUDGETS.entryJsGzip) {
  failures.push(`entry JS ${fmt(entryBytes)} gzip exceeds ${fmt(BUDGETS.entryJsGzip)}`)
} else {
  notes.push(`entry JS ${fmt(entryBytes)} gzip / ${fmt(BUDGETS.entryJsGzip)}`)
}

// ── Gate 3: the three chunk ────────────────────────────────────────────────
// Presence first, size second. A budget alone is satisfied by an absent chunk,
// so deleting the 3D layer would have read as `three chunk 0.0KB — ok`. The
// floor is what makes the ceiling mean anything.
const THREE_FLOOR = 60 * KB
if (threeChunks.length !== 1) {
  failures.push(`expected exactly 1 three chunk in ${DIST}, found ${threeChunks.length}`)
}
const threeBytes = threeChunks.reduce((n, f) => n + gz(f), 0)
if (threeChunks.length && threeBytes < THREE_FLOOR) {
  failures.push(`three chunk ${fmt(threeBytes)} gzip is below ${fmt(THREE_FLOOR)} — that is not a real three build`)
} else if (threeBytes > BUDGETS.threeChunkGzip) {
  failures.push(`three chunk ${fmt(threeBytes)} gzip exceeds ${fmt(BUDGETS.threeChunkGzip)}`)
} else if (threeChunks.length) {
  notes.push(`three chunk ${fmt(threeBytes)} gzip / ${fmt(BUDGETS.threeChunkGzip)}`)
}

// ── Gate 3b: the scene chunk is real, and it is the thing that pulls three ──
// The renderer has to be constructed somewhere on the lazy path. If the turret
// stops importing three, the three chunk goes unreferenced and the whole 3D
// thesis is dead weight nobody executes.
// Minified identifiers make source matching useless here, so the check is on
// the module graph instead: some lazy chunk must import the three chunk by
// name, and the entry must know how to reach that lazy chunk.
const threeName = threeChunks[0]?.split('/').pop()
const sceneChunks = threeName
  ? lazyChunks.filter((f) => readFileSync(f, 'utf8').includes(threeName))
  : []

if (threeName && sceneChunks.length === 0) {
  failures.push(`no lazy chunk imports ${threeName} — the 3D layer is built but unreachable`)
} else if (sceneChunks.length) {
  const reachable = entryChunks.some((f) =>
    sceneChunks.some((s) => readFileSync(f, 'utf8').includes(s.split('/').pop())))
  if (!reachable) {
    failures.push('the entry never references the scene chunk — nothing will import() it')
  } else {
    notes.push(`scene chunk ${sceneChunks.map((f) => f.split('/').pop()).join(', ')} imports ${threeName}`)
  }
}

// ── Gate 4: first view ─────────────────────────────────────────────────────
// What a cold visitor downloads before any station streams in: the document,
// all CSS, the preloaded fonts, and the entry JS. 3D assets are excluded here
// and counted against the world budget instead.
const firstView = files
  .filter((f) => /\.(html|css)$/.test(f) || /fonts\/.*\.woff2$/.test(f))
  .reduce((n, f) => n + raw(f), 0) + entryBytes
if (firstView > BUDGETS.firstViewTotal) {
  failures.push(`first view ${fmt(firstView)} exceeds ${fmt(BUDGETS.firstViewTotal)}`)
} else {
  notes.push(`first view ${fmt(firstView)} / ${fmt(BUDGETS.firstViewTotal)}`)
}

// ── Gate 5: the whole world ────────────────────────────────────────────────
const world = files.reduce((n, f) => n + raw(f), 0)
if (world > BUDGETS.worldTotal) {
  failures.push(`total build ${fmt(world)} exceeds ${fmt(BUDGETS.worldTotal)}`)
} else {
  notes.push(`total build ${fmt(world)} / ${fmt(BUDGETS.worldTotal)}`)
}

// ── Gate 5b: lazy chunks are reported, never charged to the entry ──────────
const lazyBytes = lazyChunks.reduce((n, f) => n + gz(f), 0)
if (lazyChunks.length) notes.push(`lazy chunks ${fmt(lazyBytes)} gzip (not on the first-load path)`)

// ── Gate 6: the document still carries the argument without JavaScript ─────
// The static path is the default output, not a degraded mode, so every claim
// has to survive in the HTML response. If a refactor ever moves a case study
// into a script, this fails.
const required = [
  '10,291 faces seen',
  '214 prompts graded',
  'Ten model calls',
  'The composite is arithmetic',
  'cal.com/moeezahmadkhan/30min',
  'reply within one working day',
]
for (const needle of required) {
  if (!indexHtml.includes(needle)) {
    failures.push(`dist/index.html is missing "${needle}" — the no-JS path lost content`)
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
for (const n of notes) console.log(`  ok   ${n}`)
if (failures.length) {
  console.error('')
  for (const f of failures) console.error(`  FAIL ${f}`)
  console.error(`\ngates: ${failures.length} breach(es)`)
  process.exit(1)
}
console.log('\ngates: all budgets held')
