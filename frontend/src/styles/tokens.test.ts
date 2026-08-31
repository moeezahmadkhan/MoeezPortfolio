import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync('src/styles/tokens.css', 'utf8')

describe('design tokens', () => {
  it('defines the locked palette values', () => {
    expect(tokens).toContain('--ink: #07070d')
    expect(tokens).toContain('--gold: #e7c27d')
    expect(tokens).toContain('--teal: #5fd3c6')
  })

  it('defines one easing curve', () => {
    expect(tokens).toContain('--ease: cubic-bezier(0.16, 1, 0.3, 1)')
    expect(tokens.match(/cubic-bezier/g)?.length).toBe(1)
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
