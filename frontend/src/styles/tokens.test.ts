import { readFileSync } from 'node:fs'
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
