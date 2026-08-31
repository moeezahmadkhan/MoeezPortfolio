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
})
