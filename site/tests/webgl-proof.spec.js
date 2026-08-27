import { test, expect } from '@playwright/test'

/**
 * Proof that the 3D layer is doing the thing the page claims it does.
 *
 * The existing enhancement tests check that a canvas is attached and that
 * three's own counters move. Neither is evidence of a rendered frame: a
 * renderer with a broken context still increments `info.render.calls`, and an
 * empty scene still attaches a canvas. These read the framebuffer back and
 * read the scene graph, so both halves of the thesis — it renders, and what it
 * renders is the data quoted in the prose — are asserted rather than assumed.
 */

const stageMounted = async (page) => {
  await page.locator('[data-stage]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-stage] canvas')).toBeAttached({ timeout: 15_000 })
  // Stations 2-4 arrive on idle; the instrument is only whole after they do.
  await page.waitForTimeout(2500)
}

const capture = (page) =>
  page.evaluate(() => document.querySelector('[data-stage] canvas').captureFrame())

test('the GPU actually rasterises the scene', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const frame = await capture(page)

  expect(frame.width, 'drawing buffer has size').toBeGreaterThan(0)
  // Covered pixels are geometry: the renderer is alpha:true over the page
  // ground, so anything with alpha was drawn by this scene and nothing else.
  expect(frame.lit, 'pixels covered by geometry').toBeGreaterThan(1000)
  expect(frame.coverage, 'the instrument does not fill the frame').toBeLessThan(0.9)
  // Plate, brass frame, bar track and bar fill are four distinct inks. A
  // single-tone frame means a clear colour and nothing on top of it.
  expect(frame.tones, 'distinct tones in the frame').toBeGreaterThanOrEqual(3)
})

test('the station being read is the station in the light path', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  // This used to be driven by scroll progress across the whole document, and
  // it could not work: the loop pauses when the stage leaves the viewport, at
  // scrollY 699 on desktop, while the second detent needed 1038. Every visitor
  // saw Vanguard and nothing else. Four distinct frames is the proof that the
  // other three instruments now exist for somebody.
  const frames = new Map()

  for (const id of ['vanguard', 'sumero', 'pawlyse', 'nexis']) {
    await page.evaluate((station) => document.getElementById(station).scrollIntoView(), id)
    await page.waitForTimeout(700)

    const seat = await page.evaluate(() => {
      const canvas = document.querySelector('[data-stage] canvas')
      const frame = canvas.captureFrame()
      return {
        lit: canvas.readInstrument().find((s) => s.lit)?.id,
        checksum: frame.checksum,
        lit_pixels: frame.lit,
      }
    })

    expect(seat.lit, `reading ${id} seats ${id}`).toBe(id)
    expect(seat.lit_pixels, `${id} draws geometry`).toBeGreaterThan(1000)
    frames.set(id, seat.checksum)
  }

  expect(new Set(frames.values()).size, 'four stations, four different pictures').toBe(4)

  // The caption and the index follow the ring rather than the scroll, so they
  // agree with it at the far end of the page too.
  await expect(page.locator('.stage-caption')).toContainText(/nexis/i)
  await expect(page.locator('.index a[aria-current="true"]')).toHaveAttribute('href', '#nexis')
})

test('every bar is the length the prose says it is', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const stations = await page.evaluate(
    () => document.querySelector('[data-stage] canvas').readInstrument(),
  )
  expect(stations.map((s) => s.id)).toEqual(['vanguard', 'sumero', 'pawlyse', 'nexis'])

  for (const station of stations) {
    const drawn = station.declared.filter((r) => r > 0)
    // A zero-valued reading is drawn as nothing at all, never as a sliver.
    expect(station.fills, `${station.id} draws one fill per non-zero reading`)
      .toHaveLength(drawn.length)
    station.fills.forEach((ratio, i) => {
      expect(ratio, `${station.id} bar ${i}`).toBeCloseTo(drawn[i], 3)
    })
  }

  // And the ratios are the page's own numbers, not numbers that happen to
  // live in the scene module. This is read out of the document.
  const desc = await page.locator('[data-stage] svg desc').textContent()
  const [, kept, seen] = desc.match(/Vanguard kept ([\d,]+) of ([\d,]+) faces/)
  const num = (s) => Number(s.replace(/,/g, ''))

  const vanguard = stations.find((s) => s.id === 'vanguard')
  expect(vanguard.fills[0], 'the first bar is faces kept over faces seen')
    .toBeCloseTo(num(kept) / num(seen), 3)
})

test('the whole ring is inside the frame, not cropped by the canvas', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const { width, bounds } = await capture(page)

  // A 30 degree lens at this radius used to put two of the four stations
  // outside the frustum: the picture read as one panel with a sliver clipped
  // against each edge, and the ring the whole thesis rests on was only ever
  // visible mid-rotation. Margin on both sides is the fix, and this is what
  // stops it drifting back.
  expect(bounds.left, 'left edge clear of the frame').toBeGreaterThan(0)
  expect(bounds.right, 'right edge clear of the frame').toBeLessThan(width - 1)

  // And all four stations are actually out there: the ring has to be wider
  // than the station square to the viewer.
  const litStation = 0.55 * width
  expect(bounds.right - bounds.left, 'the ring is wider than one station')
    .toBeGreaterThan(litStation)
})

test('the caption never sits on top of a reading', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const overlap = await page.evaluate(() => {
    const canvas = document.querySelector('[data-stage] canvas')
    const { bounds, height } = canvas.captureFrame()
    const cap = document.querySelector('.stage-caption').getBoundingClientRect()
    const box = canvas.getBoundingClientRect()
    // Caption top in the same device-pixel space as the bounds.
    const capTop = ((cap.top - box.top) / box.height) * height
    return bounds.bottom - capTop
  })

  // At 390 the caption wraps to three lines. Anything below zero here means
  // text is being set over the lit frame and the bars it describes.
  expect(overlap, 'geometry ends above the caption band').toBeLessThanOrEqual(0)
})

test('the scene paints in the stylesheet\'s inks, not its own', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const { ink, tokens } = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    const read = (name) => style.getPropertyValue(name).trim().toLowerCase()
    return {
      ink: document.querySelector('[data-stage] canvas').readInk(),
      tokens: {
        cyanotype: read('--cyanotype'), brass: read('--brass'), sodium: read('--sodium'),
        oxide: read('--oxide'), plate: read('--plate'), ground: read('--lampblack'),
      },
    }
  })

  // Two files each holding their own copy of six hexes is how the scene's
  // oxide and --oxide drifted apart. The scene reads the tokens now, and a
  // drift inside a canvas is invisible to everything except this.
  expect(ink).toEqual(tokens)
})

test('exactly one station is in the light path', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const stations = await page.evaluate(
    () => document.querySelector('[data-stage] canvas').readInstrument(),
  )
  expect(stations.filter((s) => s.lit)).toHaveLength(1)

  // And the lit one is the one the DOM index and the caption both point at.
  const lit = stations.find((s) => s.lit)
  await expect(page.locator('.index a[aria-current="true"]')).toHaveAttribute('href', `#${lit.id}`)
  await expect(page.locator('.stage-caption')).toContainText(
    new RegExp(lit.id, 'i'),
  )
})
