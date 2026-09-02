import { describe, expect, it } from 'vitest'
import { GLYPHS, revealedCount, scrambleFrame } from './scramble'

/** A `rand` that always picks the first glyph, so a frame is exactly predictable. */
const first = () => 0

describe('revealedCount', () => {
  it('settles nothing while the label is still holding on noise', () => {
    expect(revealedCount('View work', 0)).toBe(0)
    expect(revealedCount('View work', 0.3)).toBe(0)
  })

  it('settles the whole label once the run is over', () => {
    expect(revealedCount('View work', 1)).toBe('View work'.length)
  })

  it('settles left to right, never backwards', () => {
    const counts = [0, 0.25, 0.5, 0.75, 1].map((t) => revealedCount('View work', t))
    expect(counts).toEqual([...counts].sort((a, b) => a - b))
    expect(counts[counts.length - 1]).toBe('View work'.length)
  })

  it('never claims more characters than the label has', () => {
    for (const t of [0.9, 0.99, 1, 1.5]) {
      expect(revealedCount('Go', t)).toBeLessThanOrEqual(2)
    }
  })
})

describe('scrambleFrame', () => {
  it('keeps the length of the label, so the box it sits in never changes size', () => {
    expect(scrambleFrame('View work', 0, first)).toHaveLength('View work'.length)
    expect(scrambleFrame('View work', 4, first)).toHaveLength('View work'.length)
  })

  it('shows the settled prefix and glyphs after it', () => {
    expect(scrambleFrame('Résumé', 3, first)).toBe('Rés' + GLYPHS[0].repeat(3))
  })

  it('never scrambles a space — the word boundary is what keeps it readable', () => {
    expect(scrambleFrame('View work', 0, first)[4]).toBe(' ')
  })

  it('returns the label untouched once every character has settled', () => {
    expect(scrambleFrame('View work', 'View work'.length, first)).toBe('View work')
  })

  it('replaces a character outside the BMP as one character, not two halves', () => {
    // Indexing a string walks UTF-16 code units; this label is 2 units long and
    // 1 character long, and a half-replaced surrogate renders as a tofu box.
    const frame = scrambleFrame('\u{1F701}', 0, first)
    expect(frame).toBe(GLYPHS[0])
    expect(revealedCount('\u{1F701}', 1)).toBe(1)
  })

  it('draws only from the glyph set', () => {
    const frame = scrambleFrame('GitHub', 0, Math.random)
    for (const char of frame) expect(GLYPHS).toContain(char)
  })
})
