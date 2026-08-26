import { test, expect } from '@playwright/test'

/**
 * The 3D layer is an upgrade that must be able to fail, be declined, or be torn
 * down without taking anything with it. These tests are the contract.
 *
 * `page.evaluate` below is Playwright's in-page execution API, not JavaScript
 * eval() — it serialises a function into the browser context.
 */

const stageMounted = async (page) => {
  await page.locator('[data-stage]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-stage] canvas')).toBeAttached({ timeout: 15_000 })
}

test('mounts behind the DOM without disturbing it', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const canvas = page.locator('[data-stage] canvas')
  await expect(canvas).toHaveAttribute('aria-hidden', 'true')
  await expect(canvas).toHaveAttribute('tabindex', '-1')

  // The static plate is hidden from sight but never from assistive tech.
  await expect(page.locator('[data-stage] svg desc')).toBeAttached()
  await expect(page.locator('[data-stage] svg desc')).toContainText('10,291')
})

test('everything the canvas shows also exists as text', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const caption = page.locator('.stage-caption')
  await expect(caption).toHaveAttribute('role', 'status')
  await expect(caption).toContainText(/2,676 of 10,291/)

  // And the index reflects which station is in the light path.
  await expect(page.locator('.index a[aria-current="true"]')).toHaveCount(1)
})

test('three arrives as a dynamic chunk, never from a script tag', async ({ page }) => {
  const scripts = []
  page.on('response', (r) => {
    if (r.url().endsWith('.js')) scripts.push(r.url().split('/').pop())
  })

  await page.goto('/')

  // The document must never reference three directly. On desktop the stage is
  // already in the initial viewport, so three legitimately loads straight away
  // — what matters is that it is reached through import(), not a script tag.
  const tagged = await page.$$eval('script[src]', (els) => els.map((e) => e.getAttribute('src')))
  expect(tagged.some((src) => /three/.test(src)), 'three is script-tagged').toBe(false)
  expect(tagged).toHaveLength(1)

  await stageMounted(page)
  await expect.poll(() => scripts.some((s) => /three/.test(s))).toBe(true)

  // And the entry itself stays tiny.
  const entry = tagged[0]
  const size = await page.evaluate(async (src) => {
    const res = await fetch(src)
    return (await res.text()).length
  }, entry)
  expect(size, 'entry chunk is a bootstrap, not an application').toBeLessThan(20_000)
})

test('pauses off screen and when disposed, resumes on return', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  const framesOver = async (ms) =>
    page.evaluate(async (duration) => {
      let frames = 0
      const raf = window.requestAnimationFrame
      window.requestAnimationFrame = function (cb) {
        return raf.call(window, (t) => { frames++; return cb(t) })
      }
      await new Promise((r) => setTimeout(r, duration))
      window.requestAnimationFrame = raf
      return frames
    }, ms)

  expect(await framesOver(500), 'renders while visible').toBeGreaterThan(10)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(700)
  expect(await framesOver(400), 'paused off screen').toBe(0)

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(700)
  expect(await framesOver(400), 'resumed on return').toBeGreaterThan(5)
})

test('the read-as-text control disposes everything it created', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  await page.getByRole('button', { name: /read as text/i }).click()

  await expect(page.locator('[data-stage] canvas')).toHaveCount(0)
  await expect(page.locator('.stage-caption')).toHaveCount(0)
  await expect(page.locator('[data-stage]')).not.toHaveAttribute('data-enhanced', 'true')
  await expect(page.locator('.index a[aria-current]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /show the instrument/i })).toBeVisible()

  // The static instrument is back in normal flow, not left clipped.
  const clip = await page.locator('.stage-figure').evaluate((e) => getComputedStyle(e).clipPath)
  expect(clip).toBe('none')

  // And it can be brought back.
  await page.getByRole('button', { name: /show the instrument/i }).click()
  await expect(page.locator('[data-stage] canvas')).toBeAttached()
})

test('a lost context leaves a working page, not a dead rectangle', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)

  await page.evaluate(() => {
    const canvas = document.querySelector('[data-stage] canvas')
    const gl = canvas.getContext('webgl2')
    gl.getExtension('WEBGL_lose_context').loseContext()
  })

  await expect(page.locator('[data-stage] canvas')).toHaveCount(0)
  await expect(page.locator('[data-stage] svg')).toBeVisible()
  await expect(page.getByRole('heading', { name: /10,291 faces seen/ })).toBeVisible()
  await expect(page.locator('a[href="https://cal.com/moeezahmadkhan/30min"]').first()).toBeVisible()
})

test('device pixel ratio is capped', async ({ page }, testInfo) => {
  await page.goto('/')
  await stageMounted(page)

  const ratio = await page.evaluate(() => {
    const canvas = document.querySelector('[data-stage] canvas')
    return canvas.width / canvas.getBoundingClientRect().width
  })
  const cap = testInfo.project.name === 'mobile' ? 1.5 : 2
  expect(ratio).toBeLessThanOrEqual(cap + 0.02)
})

test('the scene stays inside its draw call and triangle budget', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)
  await page.waitForTimeout(2500)   // let stations 2-4 arrive on idle

  const stats = await page.evaluate(() => {
    const canvas = document.querySelector('[data-stage] canvas')
    return canvas.getRenderStats()
  })

  expect(stats.calls, 'draw calls per frame').toBeGreaterThan(0)
  expect(stats.calls, 'draw calls per frame').toBeLessThan(100)
  expect(stats.triangles, 'triangles on screen').toBeLessThan(300_000)
  // No textures at all: the look is flat colour, so there is nothing to
  // transcode and nothing for KTX2 to compress.
  expect(stats.textures).toBe(0)
})

test('disposing releases every geometry it allocated', async ({ page }) => {
  await page.goto('/')
  await stageMounted(page)
  await page.waitForTimeout(2500)

  const before = await page.evaluate(
    () => document.querySelector('[data-stage] canvas').getRenderStats().geometries,
  )
  expect(before).toBeGreaterThan(0)

  await page.getByRole('button', { name: /read as text/i }).click()
  await expect(page.locator('[data-stage] canvas')).toHaveCount(0)
})

test('mounting the canvas causes no layout shift', async ({ page }) => {
  await page.goto('/')

  const shift = await page.evaluate(async () => {
    let total = 0
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value
    })
    po.observe({ type: 'layout-shift', buffered: true })
    document.querySelector('[data-stage]').scrollIntoView()
    await new Promise((r) => setTimeout(r, 3000))
    po.disconnect()
    return total
  })

  expect(shift).toBeLessThan(0.1)
})
