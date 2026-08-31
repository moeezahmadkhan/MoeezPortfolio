import { beforeEach, describe, expect, it } from 'vitest'
import { clearProjectFocus, focusState, setProjectFocus } from './focusState'

describe('focusState', () => {
  beforeEach(() => clearProjectFocus())

  it('starts with null slug and source', () => {
    expect(focusState.projectSlug).toBe(null)
    expect(focusState.source).toBe(null)
  })

  it('mutates in place when setting focus', () => {
    const ref = focusState
    setProjectFocus('horus', 'pointer')
    expect(ref.projectSlug).toBe('horus')
    expect(ref.source).toBe('pointer')
  })

  it('clears focus when clearProjectFocus is called without arguments', () => {
    setProjectFocus('horus', 'pointer')
    clearProjectFocus()
    expect(focusState.projectSlug).toBe(null)
    expect(focusState.source).toBe(null)
  })

  it('does not clear keyboard focus when pointer leaves a different card', () => {
    setProjectFocus('horus', 'keyboard')
    clearProjectFocus('other-slug')
    expect(focusState.projectSlug).toBe('horus')
    expect(focusState.source).toBe('keyboard')
  })

  it('clears focus when called with the matching slug', () => {
    setProjectFocus('horus', 'pointer')
    clearProjectFocus('horus')
    expect(focusState.projectSlug).toBe(null)
    expect(focusState.source).toBe(null)
  })
})
