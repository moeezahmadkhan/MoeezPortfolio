// Measure each section's scroll fraction the same way scrollState.progress does:
//   progress = scrollY / (scrollHeight - innerHeight)
// Prints each section's entry fraction (its top) and, for pinned sections, a "held"
// fraction (top + 55% of the section's height) plus its height in viewports — the
// numbers used to calibrate CameraRig KEYS, chapters.ts `at`, and the spell-chamber
// visibility window in spell.ts. Run `npm run dev` first, then:
//   node tools/measure.mjs <port>
import puppeteer from 'puppeteer-core'

const PORT = process.argv[2] || '5173'
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--window-size=1440,900'],
})
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// SwiftShader starves rAF, so poll on a timer rather than waitForFunction's rAF poll.
for (let i = 0; i < 25; i++) {
  if (await p.evaluate(() => !document.querySelector('.preloader'))) break
  await sleep(1500)
}
await sleep(1200)

const data = await p.evaluate(() => {
  const max = document.documentElement.scrollHeight - window.innerHeight
  const ids = ['top', 'wizard', 'spells', 'conjuring', 'grimoire', 'tracker', 'chronicles', 'owlpost']
  return {
    max,
    sections: ids.map((id) => {
      const el = document.getElementById(id)
      if (!el) return { id, missing: true }
      const top = el.getBoundingClientRect().top + window.scrollY
      const h = el.offsetHeight
      return {
        id,
        entry: +(top / max).toFixed(3),
        held: +((top + h * 0.55) / max).toFixed(3),
        vh: +(h / window.innerHeight).toFixed(2),
      }
    }),
  }
})
console.log(JSON.stringify(data, null, 2))
await b.close()
