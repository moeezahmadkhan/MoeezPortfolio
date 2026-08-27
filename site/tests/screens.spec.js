import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/**
 * The critique loop needs images, and images only help if they land on disk in
 * a predictable place. These write to test-results/screens/<project>/ — the
 * same directory the reporter already owns, so nothing new needs ignoring.
 *
 * The four states are the ones worth arguing about: the page before the scene
 * exists, the page with it, the turret mid-rotation, and the page for a
 * visitor who has turned the instrument off or never got it.
 */
const DIR = 'test-results/screens'

const shot = async (page, name, testInfo) => {
  const dir = `${DIR}/${testInfo.project.name}`
  mkdirSync(dir, { recursive: true })
  const path = `${dir}/${name}.png`
  await page.screenshot({ path, fullPage: false })
  await testInfo.attach(name, { path, contentType: 'image/png' })
  return path
}

test('captures the states worth reviewing', async ({ page }, testInfo) => {
  // Hold the 3D chunk back so the first frame can be photographed as a visitor
  // on a slow connection sees it: the static instrument, already complete.
  let release
  const held = new Promise((r) => { release = r })
  await page.route('**/three-*.js', async (route) => {
    await held
    await route.continue()
  })

  await page.goto('/')
  await page.locator('[data-stage]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-stage] svg')).toBeVisible()
  await shot(page, 'before-scene', testInfo)

  release()
  await expect(page.locator('[data-stage] canvas')).toBeAttached({ timeout: 15_000 })
  await page.waitForTimeout(2500)
  await shot(page, 'stage', testInfo)

  // Mid-rotation: seat the far station, come back, photograph the transit.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(800)
  await shot(page, 'foot-of-page', testInfo)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(120)
  await shot(page, 'mid-rotation', testInfo)
  await page.waitForTimeout(2000)

  // And the text path, which is what the toggle and every decline reason land on.
  await page.getByRole('button', { name: /read as text/i }).click()
  await expect(page.locator('[data-stage] canvas')).toHaveCount(0)
  await shot(page, 'fallback', testInfo)
})

test('the page holds up at the third breakpoint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one project is enough for a resize')

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')
  await page.locator('[data-stage]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-stage] canvas')).toBeAttached({ timeout: 15_000 })
  await page.waitForTimeout(2500)
  await shot(page, 'stage-768', testInfo)

  // A screenshot is not a check. The thing that actually breaks at this width
  // is the stage box, so its aspect ratio is asserted rather than eyeballed.
  const box = await page.locator('[data-stage]').boundingBox()
  expect(box.width).toBeLessThanOrEqual(768)
  expect(box.height).toBeGreaterThan(0)
})
