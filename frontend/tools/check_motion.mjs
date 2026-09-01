// Fails the build when an interactive surface changes state without animating.
//
// This class of bug has now shipped three times — the mobile menu snapped
// because it toggles `display`, which no transition could reach; the chat panel
// vanished on the next frame because it was conditionally rendered, and React
// cannot animate an element it has already unmounted; and the contact form's
// invalid border flipped instantly. None of them was visible to a unit test:
// jsdom resolves no stylesheets, has no layout, and has no compositor.
//
// A source-level lint cannot do this either. That was prototyped and it flagged
// 12 of 22 state rules with roughly 10 false positives, because the CASCADE
// decides the answer: `.btn--solid:hover` looks untransitioned until you notice
// `.btn` two rules above it. `getComputedStyle` resolves the cascade for free,
// so the check runs in a browser.
//
// It is scenario-driven rather than selector-driven because every bug found so
// far came from an action ("close the panel"), never from reading a selector.
//
// Usage: `npm run check:motion` against a running preview (SHOOT_URL overrides
// the origin). Exits non-zero naming the scenario that snapped.
import puppeteer from 'puppeteer-core'

const URL = process.env.SHOOT_URL ?? 'http://localhost:4174/'

// How many frames to watch after the interaction, for the corroborating sample
// trace. Not the thing being asserted on — see below.
const WINDOW_FRAMES = 40

/**
 * Why this asks the Web Animations API instead of counting frames.
 *
 * The first version counted how many sampled frames sat between the start and
 * end states, with a floor of four. Then the harness was measured: puppeteer
 * under SwiftShader runs rAF at **12Hz**, not 60, and the anti-throttling flags
 * make no difference because it is software rendering, not backgrounding. At
 * 12Hz the site's 0.28s transitions span barely three frames, so the floor was
 * measuring the harness rather than the site and would have failed spuriously.
 *
 * `getAnimations()` asks the question directly — "is this element running a
 * transition right now?" — and the answer does not depend on how fast anything
 * samples. A snap runs none. The frame trace is still collected, because a
 * number to look at is worth having when something fails, but it does not gate.
 */
const MIN_ANIMATION_MS = 60

// Scenarios are DECLARATIVE step lists, not source strings.
//
// The first version passed each interaction as JavaScript source and rebuilt it
// in the page with `new Function`. That works, and every string in this file is
// a literal written here — but it is a code-injection shape, and the moment
// someone parameterises a scenario from a filename or an argv it becomes a real
// one. A tiny interpreter costs a dozen lines and removes the class outright.
//
// Steps: { click }, { scrollTo }, { style: { selector, set } }, { wait } —
// `wait` only in `setup`, since `act` must land inside a single frame.
const SCENARIOS = [
  {
    name: 'chat panel opens',
    viewport: [390, 844],
    act: [{ click: '.chat__launcher' }],
    watch: '.chat__panel',
  },
  {
    name: 'chat panel closes',
    viewport: [390, 844],
    setup: [{ click: '.chat__launcher' }, { wait: 600 }],
    act: [{ click: '.chat__close' }],
    watch: '.chat__panel',
  },
  {
    name: 'mobile menu opens',
    viewport: [390, 844],
    act: [{ click: '.nav__toggle' }],
    watch: '.nav__links',
  },
  {
    name: 'mobile menu closes',
    viewport: [390, 844],
    setup: [{ click: '.nav__toggle' }, { wait: 600 }],
    act: [{ click: '.nav__toggle' }],
    watch: '.nav__links',
  },
  {
    name: 'field turns invalid',
    viewport: [390, 844],
    // Submitting an empty form is what marks the fields invalid; that is the
    // path a visitor actually takes, not a synthetic attribute flip.
    setup: [{ scrollTo: '#contact' }, { wait: 900 }],
    act: [{ click: '.contact__form button[type=submit]' }],
    watch: '.field input',
  },
  {
    name: 'project card on hover',
    viewport: [1440, 900],
    setup: [{ scrollTo: '#work' }, { wait: 1200 }],
    // `:hover` cannot be forced from script, so drive the same declarations the
    // hover rule sets. If `.card`'s transition is ever dropped this still fails.
    act: [
      {
        style: {
          selector: '.card',
          set: { borderColor: 'rgb(231 194 125 / 0.36)', transform: 'translateY(-2px)' },
        },
      },
    ],
    watch: '.card',
  },
  {
    name: 'nav marker moves between sections',
    viewport: [1440, 900],
    setup: [{ scrollTo: '#about' }, { wait: 1400 }],
    act: [{ scrollTo: '#work' }],
    watch: '.nav__marker',
  },
]

/**
 * Runs one scenario and reports how many frames the watched element spent
 * looking like neither its start state nor its end state.
 *
 * Everything happens inside one in-page rAF loop, including the interaction.
 * Driving the click from Node instead would put it on a different clock from
 * the sampling and the first frames of the transition would be missed.
 */
async function runScenario(page, scenario) {
  return page.evaluate(
    async ({ watch, act, setup, frames }) => {
      const need = (selector) => {
        const el = document.querySelector(selector)
        if (!el) throw new Error(`no element matches ${selector}`)
        return el
      }

      /** Runs a declarative step list. Async so `setup` may wait; `act` may not. */
      const perform = async (steps) => {
        for (const step of steps) {
          if (step.click !== undefined) need(step.click).click()
          else if (step.scrollTo !== undefined) need(step.scrollTo).scrollIntoView()
          else if (step.style !== undefined) {
            Object.assign(need(step.style.selector).style, step.style.set)
          } else if (step.wait !== undefined) {
            await new Promise((r) => setTimeout(r, step.wait))
          } else throw new Error(`unknown step: ${JSON.stringify(step)}`)
        }
      }

      if (setup) await perform(setup)

      // Re-queried every frame on purpose: an element REMOVED mid-transition is
      // the exact bug being hunted, and a captured reference would keep
      // reporting stale style for a node no longer in the document.
      const signature = () => {
        const el = document.querySelector(watch)
        if (!el) return 'gone'
        const s = getComputedStyle(el)
        return [
          s.opacity,
          s.transform,
          s.color,
          s.backgroundColor,
          s.borderColor,
          s.display,
          s.translate,
          s.scale,
        ].join('|')
      }

      const rows = []
      let running = []
      await new Promise((resolve) => {
        let f = 0
        const tick = () => {
          f++
          // Two frames of baseline first, so `rows[0]` is the settled start
          // state rather than whatever the click itself produced.
          // `act` is synchronous by contract, so it lands inside this frame.
          if (f === 3) perform(act)
          // Ask what is animating on EVERY frame after the act, not one chosen
          // frame. A transition that has finished reports nothing, so a single
          // late sample misses it — but so does a single early one, and that is
          // the trap: the nav marker only starts moving once a smooth scroll
          // has settled and the section observer has fired, several frames
          // after the interaction. Accumulating across the window catches a
          // transition wherever in it the transition happens to live.
          if (f > 3) {
            const el = document.querySelector(watch)
            if (el) {
              for (const a of el.getAnimations()) {
                const timing = a.effect ? a.effect.getComputedTiming() : {}
                running.push({
                  duration: typeof timing.duration === 'number' ? timing.duration : 0,
                  property: a.transitionProperty ?? a.animationName ?? 'unknown',
                })
              }
            }
          }
          rows.push(signature())
          if (f < frames) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })

      const first = rows[0]
      const last = rows[rows.length - 1]
      return {
        changed: first !== last,
        intermediate: rows.filter((r) => r !== first && r !== last).length,
        running,
        first,
        last,
      }
    },
    {
      watch: scenario.watch,
      act: scenario.act,
      setup: scenario.setup ?? null,
      frames: WINDOW_FRAMES,
    },
  )
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})

const failures = []

for (const scenario of SCENARIOS) {
  const [width, height] = scenario.viewport
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  // The scene fades in over roughly a second; measuring through that would
  // report motion this check did not cause.
  await page.waitForFunction(() => window.__modelReady && window.__modelReady.hero, {
    timeout: 20000,
  })
  await new Promise((r) => setTimeout(r, 1200))

  const result = await runScenario(page, scenario)
  const longest = result.running.reduce((max, a) => Math.max(max, a.duration), 0)
  const properties = [...new Set(result.running.map((a) => a.property))].join(', ') || 'nothing'

  if (!result.changed && longest === 0) {
    failures.push(
      `${scenario.name}: nothing changed at all — the scenario no longer exercises anything`,
    )
    console.log(`✗ ${scenario.name.padEnd(34)} no state change`)
  } else if (longest < MIN_ANIMATION_MS) {
    failures.push(
      `${scenario.name}: the state changed but nothing was animating (${properties})`,
    )
    console.log(`✗ ${scenario.name.padEnd(34)} state changed, nothing animating — it snaps`)
  } else {
    console.log(
      `✓ ${scenario.name.padEnd(34)} ${longest}ms on ${properties}` +
        `  (${result.intermediate} sampled frames mid-change)`,
    )
  }
  await page.close()
}

await browser.close()

if (failures.length) {
  console.error('\nsurfaces that change state without animating:')
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`\nall ${SCENARIOS.length} scenario(s) animate`)
