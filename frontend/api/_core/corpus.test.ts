import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const corpus = JSON.parse(readFileSync('api/_core/corpus.generated.json', 'utf8'))

describe('persona corpus', () => {
  it('is a non-trivial array of chunks', () => {
    expect(Array.isArray(corpus)).toBe(true)
    expect(corpus.length).toBeGreaterThanOrEqual(8)
  })

  it('gives every chunk an id, a source, and real text', () => {
    for (const chunk of corpus) {
      expect(chunk.id).toMatch(/\S/)
      expect(chunk.source).toMatch(/\.(md|ts)$/)
      expect(chunk.text.length).toBeGreaterThan(20)
      expect(chunk.tokens).toBeGreaterThan(0)
    }
  })

  it('keeps chunks small enough to inject several at once', () => {
    for (const chunk of corpus) expect(chunk.tokens).toBeLessThanOrEqual(320)
  })

  it('is in sync with the sources it was generated from', () => {
    // Regenerating must be a no-op. A stale corpus is the failure mode where the
    // page says one thing and the chatbot says another.
    const before = readFileSync('api/_core/corpus.generated.json', 'utf8')
    execFileSync('node', ['tools/build_persona_index.mjs'], { stdio: 'pipe' })
    const after = readFileSync('api/_core/corpus.generated.json', 'utf8')
    expect(after).toBe(before)
  })
})
