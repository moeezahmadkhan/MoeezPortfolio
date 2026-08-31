import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const BANNED = [
  'grimoire',
  'owl post',
  'owlpost',
  'spellbook',
  'incantation',
  'chronicles',
  'familiar',
  'muggle',
  'hogwarts',
]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.(ts|tsx|css)$/.test(entry) ? [full] : []
  })
}

describe('copy voice', () => {
  it('has no wizard-metaphor vocabulary left in src/', () => {
    const offenders = walk('src')
      .filter((f) => !f.includes('copy-voice.test'))
      .flatMap((file) => {
        const text = readFileSync(file, 'utf8').toLowerCase()
        return BANNED.filter((word) => text.includes(word)).map((word) => `${file}: ${word}`)
      })
    expect(offenders).toEqual([])
  })
})
