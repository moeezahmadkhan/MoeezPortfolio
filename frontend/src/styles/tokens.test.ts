import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync('src/styles/tokens.css', 'utf8')

describe('design tokens', () => {
  it('defines the locked palette values', () => {
    expect(tokens).toContain('--ink: #07070d')
    expect(tokens).toContain('--gold: #e7c27d')
    expect(tokens).toContain('--teal: #5fd3c6')
  })

  // Two curves, and only two: `--ease` for anything arriving and settling,
  // `--ease-loop` for anything that repeats (an out-curve on a loop snaps to
  // each extreme and hangs there). A third curve here would be curve sprawl,
  // which is the thing this test has always existed to prevent — and
  // src/test/motion-language.test.ts stops any stylesheet declaring its own.
  it('defines exactly two easing curves', () => {
    expect(tokens).toContain('--ease: cubic-bezier(0.16, 1, 0.3, 1)')
    expect(tokens).toContain('--ease-loop: cubic-bezier(0.65, 0, 0.35, 1)')
    expect(tokens.match(/cubic-bezier/g)?.length).toBe(2)
  })

  it('defines an 8px-derived spacing scale', () => {
    for (const [name, value] of [
      ['--s-1', '4px'],
      ['--s-2', '8px'],
      ['--s-3', '16px'],
      ['--s-4', '24px'],
      ['--s-5', '32px'],
      ['--s-6', '48px'],
      ['--s-7', '64px'],
      ['--s-8', '96px'],
      ['--s-9', '128px'],
    ]) {
      expect(tokens).toContain(`${name}: ${value}`)
    }
  })
})

function walk(dir: string, match: RegExp): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full, match)
    return match.test(entry) ? [full] : []
  })
}

describe('press feedback', () => {
  // A tap has no hover in front of it, so without an :active state the only
  // confirmation a control was hit is the page having already changed.
  const controls = [
    ['src/components/ui/Button.css', '.btn:active'],
    ['src/components/ui/Tag.css', '.tag:active'],
    ['src/components/layout/Nav.css', '.nav__link:active'],
    ['src/components/chat/ChatDock.css', '.chat__launcher:active'],
  ] as const

  for (const [file, selector] of controls) {
    it(`gives ${selector} a press state behind the coarse-pointer query`, () => {
      const css = readFileSync(file, 'utf8')
      expect(css).toContain('@media (pointer: coarse)')
      expect(css.slice(css.indexOf('@media (pointer: coarse)'))).toContain(selector)
    })
  }

  it('never presses with something that would re-flow the row', () => {
    // `scale` is a transform. A press built from padding or font-size would
    // re-flow whatever the control sits in, every time anyone touched it.
    for (const file of walk('src', /\.css$/)) {
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      for (const block of css.matchAll(/([^{}]*:active[^{}]*)\{([^{}]*)\}/g)) {
        expect(block[2]).not.toMatch(/(?:^|[;\s])(padding|font-size|width|height)\s*:/)
      }
    }
  })
})
