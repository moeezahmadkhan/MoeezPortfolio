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

test('scroll position drives the rotation, and the rotation changes the frame', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const atRest = await capture(page)
  const firstCaption = await page.locator('.stage-caption').textContent()

  // Bottom of the document seats the fourth station. The stage is off screen
  // there and the loop is paused by design, so the observable moment is the
  // return trip: the turret is mid-rotation when it resumes and settled a
  // second later, and those two frames must not be the same picture.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(800)

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(120)
  const midRotation = await capture(page)

  await page.waitForTimeout(2000)
  const settled = await capture(page)

  expect(midRotation.checksum, 'mid-rotation differs from settled').not.toBe(settled.checksum)
  expect(midRotation.lit, 'geometry is on screen mid-rotation').toBeGreaterThan(1000)

  // Coverage, not a checksum. The approach is damped rather than keyframed, so
  // it converges on the detent without ever landing exactly on it — a frame
  // one ten-thousandth of a radian off is the correct behaviour and a
  // different picture. The silhouette returning to its old size is the real
  // claim: the same station is square to the viewer again.
  expect(settled.lit, 'the starting station is back in the light path')
    .toBeGreaterThan(atRest.lit * 0.9)
  expect(settled.lit).toBeLessThan(atRest.lit * 1.1)

  await expect(page.locator('.stage-caption')).toHaveText(firstCaption)
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
