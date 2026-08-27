import { test, expect } from '@playwright/test'

/**
 * The static path is the page. Everything here must hold with JavaScript
 * switched off entirely — that is the promise the build order makes, and it is
 * the only version some visitors will ever get.
 */
test.describe('the page with no JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('carries every case study, in full', async ({ page }) => {
    await page.goto('/')

    for (const claim of [
      '10,291 faces seen',
      '2,676 good enough to trust',
      '214 prompts graded',
      '22 criticals still open',
      'Ten model calls',
      '140 seconds, six citations',
      'The composite is arithmetic',
      'Only the parts are learned',
    ]) {
      await expect(page.getByText(claim, { exact: false }).first()).toBeVisible()
    }
  })

  test('the avatars are images, not a script that draws them', async ({ page }) => {
    await page.goto('/')

    // The figures are the one decorative thing on the page, so they have to
    // cost the least: stills, in the document, present with JavaScript off.
    const avatars = page.locator('.avatars img')
    await expect(avatars).toHaveCount(4)

    for (const img of await avatars.all()) {
      await expect(img).toHaveAttribute('alt', /\S/)
      await expect(img).toHaveAttribute('width', /\d+/)
      await expect(img).toHaveAttribute('height', /\d+/)
      await expect(img).toHaveAttribute('loading', 'lazy')
    }

    // And nothing here reaches for a model or a decoder at runtime.
    const html = await page.content()
    expect(html).not.toContain('.glb')
    expect(html).not.toContain('draco')
  })

  test('the social card is declared and is a large image', async ({ page }) => {
    await page.goto('/')

    const meta = (selector) => page.locator(selector).getAttribute('content')
    expect(await meta('meta[property="og:image"]')).toBe('https://moeezahmadkhan.com/figures/og.jpg')
    expect(await meta('meta[property="og:image:width"]')).toBe('1200')
    expect(await meta('meta[property="og:image:height"]')).toBe('630')
    expect(await meta('meta[property="og:image:alt"]')).toMatch(/\S/)
    // Without this the card renders as a small square in every share.
    expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image')
  })

  test('states what was not measured', async ({ page }) => {
    await page.goto('/')

    // The page's whole credibility rests on these admissions surviving.
    await expect(page.getByText('not measured accuracy against a labelled set')).toBeVisible()
    await expect(page.getByText('no throughput figure to quote')).toBeVisible()
    await expect(page.getByText('approximately, not measured')).toBeVisible()
    await expect(page.getByText('never reached production')).toBeVisible()

    const hollow = page.locator('.fig[data-measured="no"]')
    await expect(hollow).toHaveCount(1)
    await expect(hollow).toContainText('2 min')
    // Marked in text too, for anyone who cannot see the outline.
    await expect(hollow.locator('.visually-hidden')).toHaveText(/not measured/)
  })

  test('can be acted on: booking, email, CV, availability', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('a[href="https://cal.com/moeezahmadkhan/30min"]').first()).toBeVisible()
    await expect(page.locator('a[href^="mailto:kmoeez2018"]').first()).toBeVisible()
    await expect(page.locator('a[href$=".pdf"]').first()).toHaveCount(1)
    await expect(page.getByText('Remote only · reply within one working day')).toBeVisible()
  })

  test('the reserved stage is never an empty hole', async ({ page }) => {
    await page.goto('/')

    const svg = page.locator('[data-stage] svg')
    await expect(svg).toBeVisible()
    await expect(svg.locator('title')).toHaveCount(1)
    await expect(svg.locator('desc')).toContainText('2,676')
  })

  test('ships no render-blocking stylesheet and no layout shift', async ({ page }) => {
    await page.goto('/')
    const links = await page.locator('link[rel="stylesheet"]').count()
    expect(links, 'the stylesheet is inlined, so there is no blocking request').toBe(0)
  })
})

test.describe('document structure', () => {
  test('has one h1 and no skipped heading levels', async ({ page }) => {
    await page.goto('/')

    const levels = await page.$$eval('h1,h2,h3,h4,h5,h6', (els) => els.map((e) => +e.tagName[1]))
    expect(levels.filter((l) => l === 1)).toHaveLength(1)

    const skips = []
    levels.reduce((prev, level, i) => {
      if (prev && level > prev + 1) skips.push(`${i}: h${prev} -> h${level}`)
      return level
    }, 0)
    expect(skips).toEqual([])
  })

  test('every station is an article with an accessible name', async ({ page }) => {
    await page.goto('/')
    for (const id of ['vanguard', 'sumero', 'pawlyse', 'nexis']) {
      const article = page.locator(`article#${id}`)
      await expect(article).toHaveCount(1)
      await expect(article).toHaveAttribute('aria-labelledby', `${id}-head`)
    }
  })

  test('the index links to all four stations by their governing threshold', async ({ page }) => {
    await page.goto('/')
    const rows = page.locator('.index a')
    await expect(rows).toHaveCount(4)
    await expect(rows.locator('.thr')).toHaveText(['0.45', '93.0%', '140s', '11×w'])
  })
})
