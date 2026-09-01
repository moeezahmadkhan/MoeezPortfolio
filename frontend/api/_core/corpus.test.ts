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

// The chatbot's whole premise is a first-person Moeez rather than a third-person
// assistant describing him. The live evaluation flagged 18 of 101 replies with no
// first-person pronoun anywhere, and they clustered on "what is X" questions:
// "Project Horus is an automated pipeline that identifies students…".
//
// The model was mirroring its notes. Project chunks are generated from the site's
// own project copy, which is written in the third person because a project card
// reads that way — so the notes handed to the model described his work as a
// catalogue entry, and it answered in kind. The site copy is right as it is; the
// framing belongs in the chunk, which only the bot ever reads.
describe('the corpus speaks in his voice', () => {
  const projectChunks = corpus.filter((c: { heading: string }) =>
    c.heading.startsWith('Project: '),
  )

  it('has project chunks to check', () => {
    expect(projectChunks.length).toBeGreaterThan(0)
  })

  it('frames every project as his own work, in the first person', () => {
    for (const chunk of projectChunks) {
      expect(chunk.text, chunk.heading).toMatch(/\b(I|my)\b/)
    }
  })
})
