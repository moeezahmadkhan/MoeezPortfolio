// Screenshots the running preview build at two widths so the design can be reviewed
// by eye. Drives system Chrome through puppeteer-core; SwiftShader keeps it headless.
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const URL = process.env.SHOOT_URL ?? 'http://localhost:4173/'
const OUT = '.shots'
// Which rig (src/three/rigs.ts) SceneDirector should be showing by the time
// each section's screenshot is taken, per width. `null` means "no rig is
// expected here" — a real state, not a gap: `rigFor` returns null for a
// section that carries no model, and SceneDirector then fades the outgoing rig
// away and mounts nothing. There is no readiness flag to wait on in that case,
// so the capture waits for paint alone.
//
// The two maps differ because the mobile gate in rigs.ts differs: on a phone
// the hero is the ONLY rig that ever mounts, so every section below it expects
// nothing. If that gate is ever relaxed, this map is the other half of the
// change — a stale entry here shows up as a 15s timeout, not a wrong picture.
const DESKTOP_RIG = {
  top: 'hero',
  about: null,
  work: 'work',
  skills: null,
  experience: 'experience',
  contact: null,
}

// Every section, not just the hero. The mobile gate in rigs.ts still allows a
// phone exactly one GLB, but it no longer throws the figure away below the
// hero: `rigFor(id, true)` returns the same hero spec for every section, so one
// rig stays mounted and travels between MOBILE_STATIONS. `__modelReady` is
// keyed on the rig id, which is `hero` the whole way down.
const MOBILE_RIG = {
  top: 'hero',
  about: 'hero',
  work: 'hero',
  skills: 'hero',
  experience: 'hero',
  contact: 'hero',
}

const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900, rigs: DESKTOP_RIG },
  { name: 'mobile', width: 390, height: 844, rigs: MOBILE_RIG },
]

// A genuine failure (a section's rig never reports ready — a real bug, a
// stalled network, whatever) must surface as a loud, specific error rather
// than an indefinite hang.
const READY_TIMEOUT_MS = 15000
const POLL_INTERVAL_MS = 100

mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})

/**
 * Waits for `CharacterRig`'s debug-only `window.__modelReady[rigId]` flag —
 * set once that rig's model has actually loaded AND its cross-fade has
 * visibly settled in (see `src/three/modelReadiness.ts` / `CharacterRig.tsx`),
 * not merely once Suspense has resolved — then waits two more animation
 * frames so the compositor has actually painted that settled state before
 * the screenshot fires. Returns the elapsed wait in ms so the caller can
 * report exactly what it waited for and how long.
 */
async function waitForRigSettled(page, rigId) {
  const start = Date.now()
  await page.waitForFunction(
    (id) => Boolean(window.__modelReady && window.__modelReady[id]),
    { timeout: READY_TIMEOUT_MS, polling: POLL_INTERVAL_MS },
    rigId,
  )
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
  return Date.now() - start
}

// How many consecutive polls must report an unchanged scroll position before
// the page counts as still. One is not enough, and that is the whole subtlety:
// `scrollIntoView` returns before the smooth-scroll animation has begun, so a
// single sample taken immediately after it sees the old position twice and
// declares victory while the page has not started moving yet. At
// POLL_INTERVAL_MS this asks for roughly a third of a second of genuine
// stillness.
const SCROLL_STILL_POLLS = 4

/**
 * Waits for the page to stop moving.
 *
 * `base.css` sets `scroll-behavior: smooth`, so `scrollIntoView` starts an
 * animation rather than jumping — and every wait that follows is meaningless
 * until it lands, because "what is in the viewport" is still changing. Without
 * this the reveal check below looks at the section we are scrolling AWAY from,
 * finds its entrances long since finished, passes instantly, and screenshots
 * the page mid-flight with the incoming section's cards still at opacity 0.
 * The rig waits used to hide this by taking seconds; the sections with no rig
 * to wait for are where it surfaced.
 */
async function waitForScrollSettled(page) {
  const start = Date.now()
  await page.evaluate(() => {
    window.__shootScroll = { last: null, still: 0 }
  })
  await page.waitForFunction(
    (needed) => {
      const state = window.__shootScroll
      state.still = window.scrollY === state.last ? state.still + 1 : 0
      state.last = window.scrollY
      return state.still >= needed
    },
    { timeout: READY_TIMEOUT_MS, polling: POLL_INTERVAL_MS },
    SCROLL_STILL_POLLS,
  )
  return Date.now() - start
}

/**
 * Waits for every `Reveal` currently in the viewport to have finished its
 * entrance transition (src/components/ui/Reveal.css: 0.6s on opacity and
 * transform, some with a stagger delay on top).
 *
 * This used to be covered by accident: the rig wait above took seconds, and
 * the reveals finished inside it. Sections with no rig to wait on exposed it —
 * the first capture of a model-less section came back with the heading painted
 * and the cards still at opacity 0. Polling the computed opacity is the honest
 * version of that wait: it asks the same question the eye does, rather than
 * sleeping for a duration copied out of a stylesheet.
 */
async function waitForRevealsSettled(page) {
  const start = Date.now()
  await page.waitForFunction(
    () => {
      const viewportHeight = window.innerHeight
      for (const el of document.querySelectorAll('.reveal')) {
        const rect = el.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > viewportHeight) continue
        if (Number(getComputedStyle(el).opacity) < 0.99) return false
      }
      return true
    },
    { timeout: READY_TIMEOUT_MS, polling: POLL_INTERVAL_MS },
  )
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
  return Date.now() - start
}

for (const size of WIDTHS) {
  const page = await browser.newPage()
  await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.screenshot({ path: `${OUT}/${size.name}-full.png`, fullPage: true })
  for (const id of ['top', 'about', 'work', 'skills', 'experience', 'contact']) {
    await page.evaluate((anchor) => {
      document.getElementById(anchor)?.scrollIntoView()
    }, id)

    try {
      await waitForScrollSettled(page)
    } catch (err) {
      throw new Error(
        `${size.name}-${id}: the page never stopped scrolling within ${READY_TIMEOUT_MS}ms — ` +
          `every wait after this one would be measuring the wrong section.`,
        { cause: err },
      )
    }

    const rigId = size.rigs[id]
    let rigMs = 0
    if (rigId !== null) {
      try {
        rigMs = await waitForRigSettled(page, rigId)
      } catch (err) {
        throw new Error(
          `${size.name}-${id}: rig '${rigId}' never reported ready within ${READY_TIMEOUT_MS}ms — ` +
            `this capture would not be trustworthy, aborting instead of guessing.`,
          { cause: err },
        )
      }
    }

    let revealMs
    try {
      revealMs = await waitForRevealsSettled(page)
    } catch (err) {
      throw new Error(
        `${size.name}-${id}: a Reveal in view never reached full opacity within ` +
          `${READY_TIMEOUT_MS}ms — this capture would show half-entered content, ` +
          `aborting instead of guessing.`,
        { cause: err },
      )
    }

    const waitedForRig = rigId === null ? 'no rig here' : `${rigMs}ms for rig '${rigId}'`
    console.log(`${size.name}-${id}: ${waitedForRig}, ${revealMs}ms for reveals`)

    await page.screenshot({ path: `${OUT}/${size.name}-${id}.png` })
  }
  await page.close()
}

await browser.close()
console.log(`shot ${WIDTHS.length} widths into ${OUT}/`)
