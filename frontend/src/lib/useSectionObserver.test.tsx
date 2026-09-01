import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useSectionObserver } from './useSectionObserver'

type Cb = (entries: IntersectionObserverEntry[]) => void
let callback: Cb

function stubObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Cb) {
        callback = cb
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}

function Probe({ ids }: { ids: string[] }) {
  const active = useSectionObserver(ids)
  return <p data-testid="active">{active}</p>
}

describe('useSectionObserver', () => {
  it('reports the intersecting section id', () => {
    stubObserver()
    document.body.innerHTML = '<section id="work"></section><section id="about"></section>'
    render(<Probe ids={['work', 'about']} />)
    expect(screen.getByTestId('active')).toHaveTextContent('')

    act(() => {
      callback([
        {
          isIntersecting: true,
          target: document.getElementById('about') as Element,
          intersectionRatio: 0.8,
        } as IntersectionObserverEntry,
      ])
    })
    expect(screen.getByTestId('active')).toHaveTextContent('about')
  })

  it('returns to the hero section once every other section has left the band', () => {
    // The bug this pins down: `best` was only committed when truthy, so once a
    // section had been reported the hook could never go back to reporting
    // nothing. Scrolling to About and back to the top left `active` stuck on
    // 'about' forever — the nav kept About underlined at the top of the page,
    // and SceneDirector, seeing a section with no rig, faded the hero model out
    // and never brought it back. On mobile, where the gate leaves the hero as
    // the only model, that meant one scroll permanently emptied the scene.
    //
    // The hero is now an observed section like any other ('top'), so returning
    // to it is a positive report rather than the absence of one.
    stubObserver()
    document.body.innerHTML = '<section id="top"></section><section id="about"></section>'
    render(<Probe ids={['top', 'about']} />)

    act(() => {
      callback([
        {
          isIntersecting: true,
          target: document.getElementById('about') as Element,
          intersectionRatio: 0.8,
        } as IntersectionObserverEntry,
      ])
    })
    expect(screen.getByTestId('active')).toHaveTextContent('about')

    act(() => {
      callback([
        {
          isIntersecting: false,
          target: document.getElementById('about') as Element,
          intersectionRatio: 0,
        } as IntersectionObserverEntry,
        {
          isIntersecting: true,
          target: document.getElementById('top') as Element,
          intersectionRatio: 0.9,
        } as IntersectionObserverEntry,
      ])
    })
    expect(screen.getByTestId('active')).toHaveTextContent('top')
  })
})
