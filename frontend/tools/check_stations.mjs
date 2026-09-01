// Verifies the two motions no screenshot can see.
//
// `tools/shoot.mjs` waits for `window.__modelReady`, which latches only once a
// rig has settled — so it proves the figure ARRIVED and says nothing about
// whether it got there by moving. Both of the things mobile gained are
// mid-transition states:
//
//   1. the hero's opening push-in (three/choreography.ts's HERO_INTRO): the
//      figure starts back along z and smaller, at FULL opacity, and settles
//      forward. A settled screenshot of the hero is identical with or without
//      it.
//   2. the travel between rigs.ts's MOBILE_STATIONS: one rig crossing the
//      screen as sections hand over. A screenshot of each station is identical
//      whether the figure slid there or teleported.
//
// Both are read from `window.__rig` (src/three/rigTelemetry.ts), sampled every
// animation frame across a real change.
//
// Usage: `npm run check:stations` against a running preview (SHOOT_URL to
// override the origin).
import puppeteer from 'puppeteer-core'

const URL = process.env.SHOOT_URL ?? 'http://localhost:4174/'
// Puppeteer under SwiftShader runs rAF at roughly 12Hz, not 60 — anti-throttling
// flags change nothing, it is software rendering. So every window here is
// expressed in wall-clock milliseconds and every assertion is on VALUES, never
// on a frame count, which would only ever measure the harness.
const SAMPLE_MS = 2600

const failures = []
const pass = (name, detail) => console.log(`✓ ${name.padEnd(34)} ${detail}`)
const fail = (name, detail) => {
  failures.push(`${name}: ${detail}`)
  console.log(`✗ ${name.padEnd(34)} ${detail}`)
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})

/** Samples `window.__rig` every animation frame for `ms`, starting now. */
async function sample(page, ms) {
  return page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const frames = []
        const start = performance.now()
        const tick = () => {
          const r = window.__rig
          if (r) frames.push({ t: performance.now() - start, ...r })
          if (performance.now() - start < ms) requestAnimationFrame(tick)
          else resolve(frames)
        }
        requestAnimationFrame(tick)
      }),
    ms,
  )
}

const spread = (frames, key) => {
  const vs = frames.map((f) => f[key])
  return Math.max(...vs) - Math.min(...vs)
}

// ---------------------------------------------------------------- the push-in
{
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  // Sampling starts the moment the document exists, so the very first frames of
  // the rig's life are in the window. Waiting for networkidle first would miss
  // the whole entrance.
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  const frames = await sample(page, 6000)

  if (frames.length < 3) {
    fail('hero push-in', `only ${frames.length} frames carried telemetry`)
  } else {
    const first = frames[0]
    const last = frames[frames.length - 1]

    // It must MOVE: a wired-up intro travels forward along z and grows.
    if (last.z - first.z > 0.05 && last.scale > first.scale) {
      pass('hero push-in moves', `z ${first.z.toFixed(3)} -> ${last.z.toFixed(3)}, scale ${first.scale.toFixed(3)} -> ${last.scale.toFixed(3)}`)
    } else {
      fail('hero push-in moves', `z ${first.z.toFixed(3)} -> ${last.z.toFixed(3)}, scale ${first.scale.toFixed(3)} -> ${last.scale.toFixed(3)} — the figure never travelled`)
    }

    // It must NOT fade in. The hero mounts with skipInitialFade and has to look
    // settled and lit on the first frame; a wand igniting out of black over a
    // second is the failure this entrance was written to avoid.
    const opacities = frames.map((f) => f.opacity)
    const lit = Math.min(...opacities)
    if (lit > 0.6) pass('hero is lit from frame one', `opacity never below ${lit.toFixed(3)}`)
    else fail('hero is lit from frame one', `opacity dropped to ${lit.toFixed(3)} — the figure is materialising, not arriving`)

    // And it must finish.
    if (last.intro > 0.9) pass('push-in settles', `intro reached ${last.intro.toFixed(3)}`)
    else fail('push-in settles', `intro only reached ${last.intro.toFixed(3)}`)
  }
  await page.close()
}

// --------------------------------------------------------------- the stations
{
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => window.__rig && window.__rig.intro > 0.9, { timeout: 20000 })

  // `scrollTo({behavior:'instant'})`, not scrollBy: `scroll-behavior: smooth`
  // makes the browser pre-smooth the gesture, which would measure the browser's
  // easing rather than the rig's.
  const jump = (id) =>
    page.evaluate((id) => {
      const el = document.getElementById(id)
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
    }, id)

  for (const [from, to] of [['top', 'about'], ['about', 'work'], ['work', 'skills']]) {
    await jump(from)
    await new Promise((r) => setTimeout(r, 3200))
    const before = (await sample(page, 120)).at(-1)
    await jump(to)
    const frames = await sample(page, SAMPLE_MS)
    const after = frames.at(-1)

    const travelled = Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)
    const name = `${from} -> ${to}`

    if (travelled < 0.15) {
      fail(name, `the figure moved ${travelled.toFixed(3)} world units — the stations are not wired up`)
      continue
    }
    // The point of the whole exercise: it has to be seen CROSSING, not just to
    // end up somewhere else. Intermediate frames must occupy intermediate
    // positions rather than the target from the first frame after the change.
    const midway = frames.filter((f) => {
      const done = Math.hypot(f.x - after.x, f.y - after.y, f.z - after.z) / travelled
      return done > 0.05 && done < 0.95
    })
    if (midway.length >= 2) {
      pass(name, `travelled ${travelled.toFixed(2)} units, ${midway.length} frames caught in flight, x spread ${spread(frames, 'x').toFixed(2)}`)
    } else {
      fail(name, `travelled ${travelled.toFixed(2)} units but only ${midway.length} frames were mid-flight — it snapped`)
    }
  }
  await page.close()
}

await browser.close()

if (failures.length) {
  console.error('\nmotion that is only true mid-transition is missing:')
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log('\nthe push-in and every station handover animate')
