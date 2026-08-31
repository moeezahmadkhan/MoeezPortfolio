import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMatchMedia } from './useMatchMedia'

type ChangeListener = (e: { matches: boolean }) => void

function stubMatchMedia(initialMatches: boolean) {
  let listener: ChangeListener | null = null
  const mql = {
    matches: initialMatches,
    media: '',
    onchange: null,
    addEventListener: (type: string, cb: ChangeListener) => {
      if (type === 'change') listener = cb
    },
    removeEventListener: (type: string) => {
      if (type === 'change') listener = null
    },
  }
  vi.stubGlobal('matchMedia', () => mql)
  return {
    fire(matches: boolean) {
      mql.matches = matches
      listener?.({ matches })
    },
    hasListener: () => listener !== null,
  }
}

describe('useMatchMedia', () => {
  it('reads the initial match state', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useMatchMedia('(min-width: 900px)'))
    expect(result.current).toBe(true)
  })

  it('reports false when the query does not match', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useMatchMedia('(min-width: 900px)'))
    expect(result.current).toBe(false)
  })

  it('flips when matchMedia reports a change event — this is the breakpoint fix', () => {
    const media = stubMatchMedia(true)
    const { result } = renderHook(() => useMatchMedia('(min-width: 900px)'))
    expect(result.current).toBe(true)

    act(() => media.fire(false))
    expect(result.current).toBe(false)

    act(() => media.fire(true))
    expect(result.current).toBe(true)
  })

  it('removes its change listener on unmount', () => {
    const media = stubMatchMedia(true)
    const { unmount } = renderHook(() => useMatchMedia('(min-width: 900px)'))
    expect(media.hasListener()).toBe(true)
    unmount()
    expect(media.hasListener()).toBe(false)
  })
})
