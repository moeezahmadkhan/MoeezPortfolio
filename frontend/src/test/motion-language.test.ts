import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The motion sweep (Plan 2c, Task 3), made permanent.
 *
 * Task 3 audited every animated property on the site into one table and brought
 * the failing rows into line. Nothing keeps them there — the next feature adds
 * one `transition: height 0.3s ease` or one `damp(x, y, 4, dt)` and the site has
 * two motion languages again. So the audit's rules are asserted here, against
 * the source itself, rather than written down in a report nobody re-reads.
 *
 * Each rule below is one row of `frontend/CLAUDE.md`'s "Motion — the rules that
 * keep being rediscovered". If a rule is wrong, change it here and there
 * together; do not add a special case to get a change through.
 */

function walk(dir: string, match: RegExp): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full, match)
    return match.test(entry) ? [full] : []
  })
}

const cssFiles = walk('src', /\.css$/)
const tsFiles = walk('src', /\.tsx?$/).filter((f) => !/\.test\.tsx?$/.test(f))

/** CSS comments carry example declarations and prose; never lint them. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Every `transition:` / `animation:` value in a stylesheet, comments removed. */
function shorthandValues(css: string, property: 'transition' | 'animation'): string[] {
  const out: string[] = []
  const re = new RegExp(`(?:^|[;{\\s])${property}\\s*:([^;}]*)`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(stripComments(css)))) out.push(m[1].trim())
  return out
}

/**
 * Properties whose animation forces the browser to re-run layout. This is the
 * list the sweep is actually about: a paint-only change (a colour, a border
 * tint) costs a repaint of one element on a discrete hover, but animating any
 * of these on the scroll path re-flows the document every frame.
 */
const LAYOUT_PROPERTIES = [
  'top',
  'left',
  'right',
  'bottom',
  'inset',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'margin',
  'padding',
  'gap',
  'font-size',
  'line-height',
  'flex',
  'grid-template-columns',
  'grid-template-rows',
]

/**
 * The one sanctioned layout animation on the site, recorded rather than hidden.
 *
 * `.skip-link` slides down from above the viewport on focus. It animates `top`
 * because it is positioned off-screen by `top`, it exists only for the keyboard
 * visitor's first Tab, it is a single element with nothing laid out after it,
 * and it is nowhere near the scroll path. Re-expressing it as a transform would
 * buy a compositor promotion for an animation that runs at most once a visit.
 */
const LAYOUT_EXCEPTIONS = [{ file: join('src', 'styles', 'base.css'), property: 'top' }]

function isExcepted(file: string, property: string): boolean {
  return LAYOUT_EXCEPTIONS.some((e) => file.endsWith(e.file) && e.property === property)
}

/**
 * The one sanctioned one-shot entrance with no matching transition, recorded
 * rather than hidden.
 *
 * The rule below exists for surfaces that come and go — the mobile menu, the
 * chat panel — where a `@keyframes` entrance plays on mount and has nothing to
 * say about leaving. The hero's copy is on the page from first paint to last.
 * There is no exit to describe, and a transition would need JS to add a class
 * after mount: if that JS never ran, the copy would sit at `opacity: 0`
 * forever. `animation-fill-mode: both` cannot strand it that way.
 *
 * Named by the animation, not by the selector, so this cannot quietly widen to
 * cover the next keyframe entrance somebody adds to the same file.
 */
const ENTRANCE_EXCEPTIONS = ['hero-in']

describe('CSS motion', () => {
  it('never hardcodes a timing function — every curve is a shared token', () => {
    const offenders: string[] = []
    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf8')
      for (const property of ['transition', 'animation'] as const) {
        for (const value of shorthandValues(css, property)) {
          if (value === 'none' || value === '') continue
          if (!value.includes('var(--ease')) {
            offenders.push(`${file}: ${property}: ${value} — no --ease token`)
          }
          // Check for a bare curve keyword only outside the var() references —
          // `var(--ease-loop)` is a token, not a hardcoded `ease-...` keyword.
          const bare = value.replace(/var\([^)]*\)/g, '')
          if (/cubic-bezier|steps\(|\bease[\w-]*\b|\blinear\b/.test(bare)) {
            offenders.push(`${file}: ${property}: ${value} — inline curve`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('only references easing tokens that tokens.css actually defines', () => {
    const tokens = readFileSync(join('src', 'styles', 'tokens.css'), 'utf8')
    const defined = new Set(Array.from(tokens.matchAll(/(--ease[\w-]*)\s*:/g), (m) => m[1]))
    const offenders: string[] = []
    for (const file of cssFiles) {
      for (const m of stripComments(readFileSync(file, 'utf8')).matchAll(/var\((--ease[\w-]*)/g)) {
        if (!defined.has(m[1])) offenders.push(`${file}: var(${m[1]}) is not defined`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('never animates a layout-triggering property, bar the recorded exception', () => {
    const offenders: string[] = []
    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf8')
      // transition shorthand: the first token of each comma-separated part is
      // the property being animated.
      for (const value of shorthandValues(css, 'transition')) {
        for (const part of value.split(',')) {
          const property = part.trim().split(/\s+/)[0]
          if (!LAYOUT_PROPERTIES.includes(property)) continue
          if (isExcepted(file, property)) continue
          offenders.push(`${file}: transition on ${property}`)
        }
      }
      // keyframes bodies: whatever they declare is what they animate.
      for (const block of stripComments(css).matchAll(/@keyframes[^{]*\{([\s\S]*?)\n\}/g)) {
        for (const decl of block[1].matchAll(/([a-z-]+)\s*:/g)) {
          if (!LAYOUT_PROPERTIES.includes(decl[1])) continue
          if (isExcepted(file, decl[1])) continue
          offenders.push(`${file}: @keyframes animates ${decl[1]}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('does not drive a looping animation with the one-shot entrance curve', () => {
    // `--ease` is an out-curve: it spends 99% of its distance in the first 40%
    // of the duration, which is right for a thing arriving and settling. Run it
    // on a loop and each cycle snaps to its extreme and then hangs there. A
    // repeating animation breathes, so it needs a symmetric curve.
    const offenders: string[] = []
    for (const file of cssFiles) {
      for (const value of shorthandValues(readFileSync(file, 'utf8'), 'animation')) {
        if (!/\binfinite\b/.test(value)) continue
        if (/var\(--ease\)/.test(value)) offenders.push(`${file}: looping on var(--ease)`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('never gives an element an entrance with no way to leave', () => {
    // The smell behind two of the three snapping surfaces: a `@keyframes`
    // entrance plays once, on mount, and says nothing about leaving. The chat
    // panel had `animation: chat-in` and vanished between two frames; the
    // mobile menu had no motion at all. A transition has both directions.
    //
    // A one-shot `animation` is only a problem when the element it decorates
    // can go away again. Looping animations (the scroll cue breathes forever)
    // and elements that also declare a transition are fine.
    const offenders: string[] = []
    for (const file of cssFiles) {
      const css = stripComments(readFileSync(file, 'utf8'))
      for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = block[1].trim()
        const body = block[2]
        if (selector.startsWith('@')) continue
        const animation = body.match(/(?:^|[;\s])animation\s*:([^;]*)/)
        if (!animation) continue
        const value = animation[1].trim()
        // `animation: none` is how the reduced-motion block TAKES an animation
        // away. Flagging it would be exactly backwards.
        if (value === 'none') continue
        if (/\binfinite\b/.test(value)) continue
        if (/(?:^|[;\s])transition\s*:/.test(body)) continue
        if (ENTRANCE_EXCEPTIONS.some((name) => value.split(/\s+/).includes(name))) continue
        offenders.push(`${file}: ${selector} has a one-shot animation and no transition`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('still neutralises every transition and animation under reduced motion', () => {
    // The site-wide safety net. Individual components may (and do) additionally
    // opt out by hand; this is what covers the ones that forget.
    const base = stripComments(readFileSync(join('src', 'styles', 'base.css'), 'utf8'))
    const query = base.slice(base.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(query).toContain('animation-duration: 0.01ms !important')
    expect(query).toContain('transition-duration: 0.01ms !important')
    expect(query).toContain('scroll-behavior: auto')
  })
})

/** Split a call's argument list on top-level commas, starting after the `(`. */
function callArgs(text: string, open: number): string[] | null {
  const args: string[] = []
  let depth = 0
  let start = open + 1
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0 && c === ')') {
        args.push(text.slice(start, i))
        return args
      }
      depth--
    } else if (c === ',' && depth === 0) {
      args.push(text.slice(start, i))
      start = i + 1
    }
  }
  return null
}

describe('JS motion', () => {
  it('names every damping rate — no bare lambda literals in a frame path', () => {
    // D4 of the plan. These numbers are the site's motion signature; three
    // features already needed the same ones. A literal in a call site is a
    // number nobody can re-tune without hunting for its twins.
    const offenders: string[] = []
    for (const file of tsFiles) {
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(/\bdamp\s*\(/g)) {
        if (/function\s+damp\s*\($/.test(text.slice(0, m.index! + m[0].length))) continue
        const args = callArgs(text, m.index! + m[0].length - 1)
        if (!args || args.length < 3) continue
        const lambda = args[2].trim()
        if (/^-?\d/.test(lambda)) offenders.push(`${file}: damp(..., ${lambda}, ...)`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('reads scroll from the smoothed channel inside every frame loop', () => {
    // The whole point of Task 1. A wheel notch lands a raw field on its new
    // value in one frame, so anything animated off a raw field steps no matter
    // how well it is damped afterwards.
    const offenders: string[] = []
    for (const file of tsFiles) {
      const text = readFileSync(file, 'utf8')
      if (!text.includes('useFrame(')) continue
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      for (const m of code.matchAll(/scrollState\.(\w+)/g)) {
        const field = m[1]
        // `smooth` is the channel motion is entitled to; the pointer is not a
        // scroll measure and is damped downstream in the rig itself.
        if (field === 'smooth' || field === 'pointerX' || field === 'pointerY') continue
        offenders.push(`${file}: reads raw scrollState.${field} in a frame loop`)
      }
    }
    expect(offenders).toEqual([])
  })
})
