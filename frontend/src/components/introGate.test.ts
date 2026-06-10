import { describe, it, expect } from 'vitest'
import { shouldPlayIntro, markIntroSeen } from './introGate'

// Minimal in-memory stand-in for the parts of Storage we use.
function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => { m.set(k, v) },
  }
}

describe('introGate', () => {
  it('plays when the flag was never set', () => {
    expect(shouldPlayIntro(fakeStorage())).toBe(true)
  })

  it('does not play once marked seen', () => {
    const s = fakeStorage()
    markIntroSeen(s)
    expect(shouldPlayIntro(s)).toBe(false)
  })

  it('markIntroSeen persists the flag', () => {
    const s = fakeStorage()
    markIntroSeen(s)
    expect(s.getItem('introSeen')).toBe('1')
  })
})
