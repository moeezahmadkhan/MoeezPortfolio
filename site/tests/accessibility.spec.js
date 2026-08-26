import { test, expect } from '@playwright/test'

/** WCAG relative luminance, so contrast is measured rather than eyeballed. */
function contrast(hexA, hexB) {
  const lum = (hex) => {
    const [r, g, b] = hex.replace('#', '').match(/../g).map((h) => {
      const c = parseInt(h, 16) / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [lum(hexA), lum(hexB)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

test('body and label colours clear 4.5:1 against their own ground', async ({ page }) => {
  await page.goto('/')
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement)
    const read = (name) => s.getPropertyValue(name).trim()
    return {
      ground: read('--lampblack'),
      plate: read('--plate'),
      ink: read('--ink'),
      muted: read('--muted'),
      brassText: read('--brass-text'),
      sodium: read('--sodium'),
      cyanLift: read('--cyanotype-lift'),
    }
  })

  for (const [name, colour, ground] of [
    ['ink', tokens.ink, tokens.ground],
    ['muted', tokens.muted, tokens.ground],
    ['brass-text', tokens.brassText, tokens.ground],
    ['brass-text on plate', tokens.brassText, tokens.plate],
    ['sodium', tokens.sodium, tokens.ground],
    ['cyanotype-lift', tokens.cyanLift, tokens.ground],
  ]) {
    expect(contrast(colour, ground), `${name} contrast`).toBeGreaterThanOrEqual(4.5)
  }
})

test('focus is visible when moving by keyboard', async ({ page }) => {
  await page.goto('/')

  // Focus must be driven by real Tab presses, not element.focus(). On a touch
  // device :focus-visible deliberately does not match programmatic focus, so
  // scripting it would test the heuristic rather than the styling.
  const rings = []
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    rings.push(await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const s = getComputedStyle(el)
      return {
        name: (el.textContent || '').trim().slice(0, 28),
        style: s.outlineStyle,
        width: parseFloat(s.outlineWidth),
        colour: s.outlineColor,
      }
    }))
  }

  const focused = rings.filter(Boolean)
  expect(focused.length, 'tab reaches interactive elements').toBeGreaterThan(5)

  for (const ring of focused) {
    expect(ring.style, `outline style on "${ring.name}"`).not.toBe('none')
    expect(ring.width, `outline width on "${ring.name}"`).toBeGreaterThan(0)
    // Sodium is the lamp: focus is literally "the light is on this".
    expect(ring.colour, `outline colour on "${ring.name}"`).toBe('rgb(242, 193, 78)')
  }
})

test('tab order follows reading order and uses no positive tabindex', async ({ page }) => {
  await page.goto('/')

  const meta = await page.$$eval(
    'a[href],button,summary,[tabindex]:not([tabindex="-1"])',
    // Playwright's DOM-query helper, not JavaScript eval().
    (els) => els.map((e) => ({
      text: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30),
      tabindex: e.getAttribute('tabindex'),
      top: Math.round(e.getBoundingClientRect().top + window.scrollY),
      left: Math.round(e.getBoundingClientRect().left),
    })),
  )

  expect(meta.every((m) => !m.tabindex || +m.tabindex <= 0), 'no positive tabindex').toBe(true)
  expect(meta.every((m) => m.text.length > 0), 'every focusable has a name').toBe(true)

  // A two-column layout interleaves by `top` — the hero controls sit at 706px
  // while the index rail beside them runs 641-773 — so a globally sorted list
  // is the wrong assertion. What must hold is that focus moves down within a
  // column and never jumps back up it, which is the actual WCAG requirement.
  const columns = new Map()
  for (const m of meta) {
    if (m.top < 0) continue                    // the skip link, parked off-screen
    const key = Math.round(m.left / 200)       // coarse column band
    if (!columns.has(key)) columns.set(key, [])
    columns.get(key).push(m)
  }

  for (const [band, items] of columns) {
    const tops = items.map((m) => m.top)
    const sorted = [...tops].sort((a, b) => a - b)
    // 48px of slack so controls sharing a row are not treated as out of order.
    const backwards = tops.filter((t, i) => t < sorted[i] - 48)
    expect(backwards, `focus order jumps backwards in column band ${band}`).toEqual([])
  }
})

test('tap targets are at least 24px in both axes', async ({ page }) => {
  await page.goto('/')
  const small = await page.$$eval('a[href],button,summary', (els) =>
    els
      .map((e) => ({ r: e.getBoundingClientRect(), t: (e.textContent || '').trim().slice(0, 24) }))
      .filter(({ r }) => r.width > 0 && (r.width < 24 || r.height < 24))
      .map(({ t, r }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`),
  )
  expect(small).toEqual([])
})

test('no horizontal scroll at a 200% zoom viewport', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 800 })   // 1280 at 200%
  await page.goto('/')
  const { scrollWidth, inner } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(inner + 1)
})

test('reduced motion stops the exposure animation from running', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const durations = await page.$$eval('.fig[data-measured="yes"]', (els) =>
    els.map((e) => getComputedStyle(e).animationDuration),
  )
  // The global reduced-motion rule collapses duration; the end state still renders.
  for (const d of durations) expect(parseFloat(d)).toBeLessThan(0.05)

  const colour = await page.locator('.fig[data-measured="yes"]').first().evaluate(
    (e) => getComputedStyle(e).color,
  )
  expect(colour).not.toBe('rgba(0, 0, 0, 0)')
})

test('the skip link is reachable and targets main', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => ({
    text: document.activeElement?.textContent?.trim(),
    href: document.activeElement?.getAttribute('href'),
  }))
  expect(focused.text).toBe('Skip to content')
  expect(focused.href).toBe('#main')
})
