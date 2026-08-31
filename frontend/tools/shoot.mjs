// Screenshots the running preview build at two widths so the design can be reviewed
// by eye. Drives system Chrome through puppeteer-core; SwiftShader keeps it headless.
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const URL = process.env.SHOOT_URL ?? 'http://localhost:4173/'
const OUT = '.shots'
const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

// Which rig (src/three/rigs.ts) SceneDirector should be showing by the time
// each section's screenshot is taken. Sections that carry no model of their
// own (about, skills, contact) inherit whichever rig-bearing section came
// before them — exactly what SceneDirector does at runtime, since `current`
// only changes when `rigFor(activeId)` actually resolves to a rig.
const EXPECTED_RIG = {
  top: 'hero',
  about: 'hero',
  work: 'work',
  skills: 'work',
  experience: 'experience',
  contact: 'experience',
}

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

for (const size of WIDTHS) {
  const page = await browser.newPage()
  await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.screenshot({ path: `${OUT}/${size.name}-full.png`, fullPage: true })
  for (const id of ['top', 'about', 'work', 'skills', 'experience', 'contact']) {
    await page.evaluate((anchor) => {
      document.getElementById(anchor)?.scrollIntoView()
    }, id)

    const rigId = EXPECTED_RIG[id]
    let waitedMs
    try {
      waitedMs = await waitForRigSettled(page, rigId)
    } catch (err) {
      throw new Error(
        `${size.name}-${id}: rig '${rigId}' never reported ready within ${READY_TIMEOUT_MS}ms — ` +
          `this capture would not be trustworthy, aborting instead of guessing.`,
        { cause: err },
      )
    }
    console.log(`${size.name}-${id}: waited ${waitedMs}ms for rig '${rigId}' to settle in`)

    await page.screenshot({ path: `${OUT}/${size.name}-${id}.png` })
  }
  await page.close()
}

await browser.close()
console.log(`shot ${WIDTHS.length} widths into ${OUT}/`)
