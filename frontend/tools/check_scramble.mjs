/*
 * A one-off browser probe for the two motions ported from the Devsteem site:
 * the nav's hover decode and the chat log's message entrance.
 *
 * jsdom can verify neither. It has no layout, so it cannot say whether a
 * decoding label shoves its neighbours; and it runs no transitions, so it
 * cannot say whether a newly inserted message actually animates or simply
 * appears. Both are the whole point of the change.
 *
 * Usage: npm run preview, then `node tools/check_scramble.mjs`.
 */
import puppeteer from 'puppeteer-core'

const URL = process.env.URL ?? 'http://localhost:4173'
const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome-stable'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(URL, { waitUntil: 'networkidle2' })
await page.waitForSelector('.nav__link')

const failures = []
const report = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

/* --- the nav's hover decode ---------------------------------------- */

const before = await page.evaluate(() => {
  const links = [...document.querySelectorAll('.nav__link')]
  return {
    labels: links.map((l) => l.textContent),
    rights: links.map((l) => l.getBoundingClientRect().right),
  }
})

const box = await page.evaluate(() => {
  const link = document.querySelectorAll('.nav__link')[1]
  const r = link.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.move(box.x, box.y)

// Sample every frame for a third of a second: the decode is 500ms, so this
// lands squarely inside it.
const during = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const seen = []
      const rights = []
      const t0 = performance.now()
      const step = () => {
        const links = [...document.querySelectorAll('.nav__link')]
        seen.push(links[1].textContent)
        rights.push(links.map((l) => l.getBoundingClientRect().right))
        if (performance.now() - t0 < 330) requestAnimationFrame(step)
        else resolve({ seen, rights })
      }
      requestAnimationFrame(step)
    }),
)

const scrambled = during.seen.filter((t) => t !== before.labels[1])
report(
  'the hovered label decodes',
  scrambled.length > 0,
  `${scrambled.length}/${during.seen.length} frames showed glyphs, e.g. "${scrambled[0] ?? ''}"`,
)

report(
  'every frame keeps the length of the label',
  during.seen.every((t) => t.length === before.labels[1].length),
  `label is ${before.labels[1].length} chars`,
)

// The reason the element's width is frozen on enter: a proportional font would
// otherwise re-measure the row on every frame and walk its neighbours sideways.
const drift = Math.max(
  ...during.rights.map((row) =>
    Math.max(...row.map((right, i) => Math.abs(right - before.rights[i]))),
  ),
)
report('no nav item moves while a sibling decodes', drift < 0.5, `max drift ${drift.toFixed(2)}px`)

await page.mouse.move(10, 400)
await new Promise((r) => setTimeout(r, 700))
const after = await page.evaluate(() =>
  [...document.querySelectorAll('.nav__link')].map((l) => l.textContent),
)
report(
  'the label is restored exactly on the way out',
  JSON.stringify(after) === JSON.stringify(before.labels),
  after.join(' / '),
)

/* --- the chat log's message entrance -------------------------------- */

await page.click('.chat__launcher')
await page.waitForSelector('.chat__panel.is-open')
await page.type('.chat__form input, .chat__form textarea', 'hello')

// Watch for the transition on the message the submit inserts. `getAnimations()`
// is the assertion, not a frame count: under SwiftShader rAF runs at ~12Hz, so
// counting frames would measure the harness rather than the motion.
const entrance = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const log = document.querySelector('.chat__log')
      const observer = new MutationObserver(() => {
        const msgs = [...log.querySelectorAll('.chat__msg')]
        const last = msgs[msgs.length - 1]
        if (!last) return
        observer.disconnect()
        const anims = last.getAnimations().map((a) => a.transitionProperty ?? a.animationName)
        resolve({ found: true, anims, opacity: getComputedStyle(last).opacity })
      })
      observer.observe(log, { childList: true })
      document.querySelector('.chat__form').requestSubmit()
      setTimeout(() => {
        observer.disconnect()
        resolve({ found: false, anims: [], opacity: null })
      }, 2000)
    }),
)

report(
  'a new message transitions in rather than appearing',
  entrance.found && entrance.anims.length > 0,
  entrance.found ? `animating ${entrance.anims.join(', ')} from opacity ${entrance.opacity}` : 'no message was inserted',
)

await browser.close()
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
