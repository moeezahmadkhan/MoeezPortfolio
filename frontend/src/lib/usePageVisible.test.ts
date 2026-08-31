import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { usePageVisible } from './usePageVisible'

/** jsdom leaves document.hidden read-only, so redefine it per test. */
function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  })
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => setHidden(false))

describe('usePageVisible', () => {
  it('starts visible on an ordinary page load', () => {
    const { result } = renderHook(() => usePageVisible())
    expect(result.current).toBe(true)
  })

  it('reports a backgrounded tab, and its return', () => {
    const { result } = renderHook(() => usePageVisible())
    act(() => setHidden(true))
    expect(result.current).toBe(false)
    act(() => setHidden(false))
    expect(result.current).toBe(true)
  })

  it('starts hidden if the page was already backgrounded at mount', () => {
    // A tab restored on session restore, or opened in the background, mounts
    // with visibilityState already 'hidden'. Rendering it at full rate until the
    // first visibilitychange would miss exactly the case this exists for.
    setHidden(true)
    const { result } = renderHook(() => usePageVisible())
    expect(result.current).toBe(false)
  })

  it('stops listening when it unmounts', () => {
    const { result, unmount } = renderHook(() => usePageVisible())
    unmount()
    // No throw, and no state update on an unmounted component — which would log
    // a React warning that the pristine-output rule would fail on.
    act(() => setHidden(true))
    expect(result.current).toBe(true)
  })
})
