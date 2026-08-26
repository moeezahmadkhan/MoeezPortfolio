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
const entryChunks = js.filter((f) => !threeChunks.includes(f))

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
const threeBytes = threeChunks.reduce((n, f) => n + gz(f), 0)
if (threeBytes > BUDGETS.threeChunkGzip) {
  failures.push(`three chunk ${fmt(threeBytes)} gzip exceeds ${fmt(BUDGETS.threeChunkGzip)}`)
} else {
  notes.push(`three chunk ${fmt(threeBytes)} gzip / ${fmt(BUDGETS.threeChunkGzip)}`)
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

// ── Gate 6: the document still carries the argument without JavaScript ─────
// The static path is the default output, not a degraded mode, so every claim
// has to survive in the HTML response. If a refactor ever moves a case study
// into a script, this fails.
const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const required = [
  '10,291 faces seen',
  '214 prompts graded',
  'Ten model calls',
  'The composite is arithmetic',
  'cal.com/moeezahmadkhan/30min',
  'reply within one working day',
]
for (const needle of required) {
  if (!html.includes(needle)) {
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
