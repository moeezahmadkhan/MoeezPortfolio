import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAGNETIC_LAMBDA,
  MAGNETIC_MAX_PX,
  MAGNETIC_MIN_TARGET_PX,
  MAGNETIC_RADIUS_PX,
  Magnetic,
  magneticOffset,
  type MagneticRect,
} from './Magnetic'

/** The resting box of a hero CTA: at least the enforced minimum target in both axes. */
const REST: MagneticRect = {
  left: 200,
  top: 300,
  width: 148,
  height: MAGNETIC_MIN_TARGET_PX,
}

/**
 * Every pointer position worth caring about: dead centre, each edge, each corner,
 * just inside and just outside the activation radius, and well beyond it. Built
 * once and reused by the bound / evasion / hit-area proofs so all three cover
 * exactly the same ground.
 */
function sweep(rect: MagneticRect): Array<[number, number]> {
  const points: Array<[number, number]> = []
  const spanX = rect.width / 2 + MAGNETIC_RADIUS_PX * 1.5
  const spanY = rect.height / 2 + MAGNETIC_RADIUS_PX * 1.5
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  for (let ix = -20; ix <= 20; ix++) {
    for (let iy = -20; iy <= 20; iy++) {
      points.push([cx + (spanX * ix) / 20, cy + (spanY * iy) / 20])
    }
  }
  return points
}

const out = { x: 0, y: 0 }

describe('magneticOffset', () => {
  it('never exceeds the offset ceiling, anywhere', () => {
    for (const [px, py] of sweep(REST)) {
      const o = magneticOffset(px, py, REST, out)
      expect(Math.abs(o.x)).toBeLessThanOrEqual(MAGNETIC_MAX_PX + 1e-9)
      expect(Math.abs(o.y)).toBeLessThanOrEqual(MAGNETIC_MAX_PX + 1e-9)
    }
  })

  it('is zero beyond the activation radius', () => {
    const o = magneticOffset(REST.left - MAGNETIC_RADIUS_PX - 1, REST.top + 10, REST, out)
    expect(o.x).toBe(0)
    expect(o.y).toBe(0)
  })

  it('is zero when the pointer sits on the centre', () => {
    const o = magneticOffset(REST.left + REST.width / 2, REST.top + REST.height / 2, REST, out)
    expect(o.x).toBeCloseTo(0, 10)
    expect(o.y).toBeCloseTo(0, 10)
  })

  it('leans toward the pointer, not away from it', () => {
    const o = magneticOffset(REST.left + REST.width + 20, REST.top + REST.height / 2, REST, out)
    expect(o.x).toBeGreaterThan(0)
    const back = magneticOffset(REST.left - 20, REST.top + REST.height / 2, REST, out)
    expect(back.x).toBeLessThan(0)
  })

  it('can never evade a cursor chasing it', () => {
    // The whole hazard of a magnetic control: if the offset could carry the
    // element away from the pointer, or past it, a visitor would chase a button
    // that keeps sidestepping. Proven per axis (strictly closer, never over) and
    // then on the resulting distance.
    const cx = REST.left + REST.width / 2
    const cy = REST.top + REST.height / 2
    for (const [px, py] of sweep(REST)) {
      const o = magneticOffset(px, py, REST, out)
      const dx = px - cx
      const dy = py - cy
      expect(Math.abs(dx - o.x)).toBeLessThanOrEqual(Math.abs(dx) + 1e-9)
      expect(Math.abs(dy - o.y)).toBeLessThanOrEqual(Math.abs(dy) + 1e-9)
      const before = Math.hypot(dx, dy)
      const after = Math.hypot(dx - o.x, dy - o.y)
      expect(after).toBeLessThanOrEqual(before + 1e-9)
    }
  })

  it('keeps at least a 44x44 hit area shared with the control at rest', () => {
    // A translation cannot change the target's size, but it can move it off the
    // point the visitor aimed at. What must survive is the overlap between where
    // the control was when they aimed and where it is mid-lean.
    for (const [px, py] of sweep(REST)) {
      const o = magneticOffset(px, py, REST, out)
      const overlapW = REST.width - Math.abs(o.x)
      const overlapH = REST.height - Math.abs(o.y)
      expect(overlapW).toBeGreaterThanOrEqual(44)
      expect(overlapH).toBeGreaterThanOrEqual(44)
    }
  })

  it('enforces a minimum target big enough for that guarantee to hold', () => {
    expect(MAGNETIC_MIN_TARGET_PX).toBeGreaterThanOrEqual(44 + MAGNETIC_MAX_PX)
  })

  it('is inert for a degenerate or non-finite input rather than producing NaN', () => {
    const zero = magneticOffset(10, 10, { left: 0, top: 0, width: 0, height: 0 }, out)
    expect(zero.x).toBe(0)
    expect(zero.y).toBe(0)
    const nan = magneticOffset(Number.NaN, 10, REST, out)
    expect(nan.x).toBe(0)
    expect(nan.y).toBe(0)
  })

  it('writes into the caller-owned object rather than allocating per call', () => {
    const target = { x: 0, y: 0 }
    expect(magneticOffset(REST.left, REST.top, REST, target)).toBe(target)
  })
})

/** Drives the media queries the component gates on. */
function stubMedia(matching: string[]) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: matching.includes(query),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  )
}

/** Replaces rAF with a hand-cranked queue so frames are stepped, never awaited. */
function stubFrames() {
  let next = 1
  let pending: Array<[number, FrameRequestCallback]> = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = next++
    pending.push([id, cb])
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    pending = pending.filter(([pendingId]) => pendingId !== id)
  })
  let clock = 0
  return function step(ms = 16.7) {
    clock += ms
    const due = pending
    pending = []
    for (const [, cb] of due) act(() => cb(clock))
  }
}

describe('<Magnetic>', () => {
  let added: string[] = []
  let removed: string[] = []

  beforeEach(() => {
    added = []
    removed = []
    const realAdd = window.addEventListener.bind(window)
    const realRemove = window.removeEventListener.bind(window)
    vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, ...rest: unknown[]) => {
      added.push(type)
      return (realAdd as (...a: unknown[]) => void)(type, ...rest)
    }) as typeof window.addEventListener)
    vi.spyOn(window, 'removeEventListener').mockImplementation(((
      type: string,
      ...rest: unknown[]
    ) => {
      removed.push(type)
      return (realRemove as (...a: unknown[]) => void)(type, ...rest)
    }) as typeof window.removeEventListener)
  })

  afterEach(() => vi.restoreAllMocks())

  it('renders its child untouched', () => {
    stubMedia([])
    render(
      <Magnetic>
        <a href="#work">View work</a>
      </Magnetic>,
    )
    expect(screen.getByRole('link', { name: 'View work' })).toHaveAttribute('href', '#work')
  })

  it('costs no pointer listener on a coarse pointer', () => {
    stubMedia(['(pointer: coarse)'])
    const { container } = render(
      <Magnetic>
        <a href="#work">View work</a>
      </Magnetic>,
    )
    expect(container.querySelector('.magnetic--live')).toBeNull()
    expect(added).not.toContain('pointermove')
  })

  it('costs no pointer listener under prefers-reduced-motion', () => {
    stubMedia(['(prefers-reduced-motion: reduce)'])
    const { container } = render(
      <Magnetic>
        <a href="#work">View work</a>
      </Magnetic>,
    )
    expect(container.querySelector('.magnetic--live')).toBeNull()
    expect(added).not.toContain('pointermove')
  })

  it('holds the offset at exactly zero on a coarse pointer', () => {
    stubMedia(['(pointer: coarse)'])
    const step = stubFrames()
    const { container } = render(
      <Magnetic>
        <a href="#work">View work</a>
      </Magnetic>,
    )
    const wrapper = container.querySelector('.magnetic') as HTMLElement
    act(() => {
      window.dispatchEvent(
        new MouseEvent('pointermove', {
          clientX: REST.left + REST.width + 8,
          clientY: REST.top + 10,
        }),
      )
    })
    step()
    step()
    expect(wrapper.style.getPropertyValue('--magnetic-x')).toBe('')
    expect(wrapper.style.getPropertyValue('--magnetic-y')).toBe('')
  })

  it('eases a bounded offset toward the pointer on a fine pointer, then releases it', () => {
    stubMedia([])
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: REST.left,
      top: REST.top,
      width: REST.width,
      height: REST.height,
      right: REST.left + REST.width,
      bottom: REST.top + REST.height,
      x: REST.left,
      y: REST.top,
      toJSON: () => ({}),
    } as DOMRect)
    const step = stubFrames()
    const { container, unmount } = render(
      <Magnetic>
        <a href="#work">View work</a>
      </Magnetic>,
    )
    const wrapper = container.querySelector('.magnetic') as HTMLElement
    expect(wrapper.classList.contains('magnetic--live')).toBe(true)
    expect(added).toContain('pointermove')

    act(() => {
      window.dispatchEvent(
        new MouseEvent('pointermove', {
          clientX: REST.left + REST.width + 10,
          clientY: REST.top + REST.height / 2,
        }),
      )
    })

    const samples: number[] = []
    for (let i = 0; i < 30; i++) {
      step()
      samples.push(Number.parseFloat(wrapper.style.getPropertyValue('--magnetic-x')))
    }

    // It moves, it moves the right way, it never overshoots the ceiling, and it
    // approaches monotonically rather than springing past.
    expect(samples[samples.length - 1]).toBeGreaterThan(0)
    expect(Math.max(...samples)).toBeLessThanOrEqual(MAGNETIC_MAX_PX + 1e-6)
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1] - 1e-6)
    }

    unmount()
    expect(removed).toContain('pointermove')
    expect(wrapper.style.getPropertyValue('--magnetic-x')).toBe('')
  })

  it('lands in the same place on a 60Hz frame as on two 120Hz frames', () => {
    // The frame-rate independence the whole codebase insists on: a naive
    // `v += (t - v) * k` would put a 120Hz display nearly twice as far along.
    expect(MAGNETIC_LAMBDA).toBeGreaterThan(0)
    stubMedia([])
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: REST.left,
      top: REST.top,
      width: REST.width,
      height: REST.height,
      right: REST.left + REST.width,
      bottom: REST.top + REST.height,
      x: REST.left,
      y: REST.top,
      toJSON: () => ({}),
    } as DOMRect)

    const runAt = (steps: number[]) => {
      const step = stubFrames()
      const view = render(
        <Magnetic>
          <a href="#work">View work</a>
        </Magnetic>,
      )
      const wrapper = view.container.querySelector('.magnetic') as HTMLElement
      act(() => {
        window.dispatchEvent(
          new MouseEvent('pointermove', {
            clientX: REST.left + REST.width + 10,
            clientY: REST.top + REST.height / 2,
          }),
        )
      })
      // The first frame establishes the clock baseline; dt only exists from the second.
      step(0)
      for (const ms of steps) step(ms)
      const x = Number.parseFloat(wrapper.style.getPropertyValue('--magnetic-x'))
      view.unmount()
      return x
    }

    const slow = runAt([16.7])
    const fast = runAt([8.35, 8.35])
    // Precision 1, not more: the offset is written to the DOM at two decimals.
    // A naive `v += (t - v) * k` would land ~0.5px apart here, far outside this.
    expect(fast).toBeCloseTo(slow, 1)
  })
})
