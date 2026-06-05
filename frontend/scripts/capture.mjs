// Dev-only scroll-capture utility. Run from frontend/ with the dev server up:
//   node scripts/capture.mjs <outDir> <pos1> <pos2> ...
// Each pos is a scroll fraction 0..1. Optionally append "settle" as the FIRST
// arg after outDir to scroll-then-pause (tests the proximity settle).
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const outDir = args[0] || '/tmp/cap'
const settle = args[1] === 'settle'
const positions = (settle ? args.slice(2) : args.slice(1)).map(Number)
if (positions.length === 0) positions.push(0, 0.5, 1)

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 4500)) // preloader + conjuring reveal

await page.evaluate((d) => {
  // node can't mkdir from the page; expose dir for filename only
  window.__d = d
}, outDir)

let i = 0
for (const p of positions) {
  await page.evaluate((p) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: max * p, behavior: 'auto' })
  }, p)
  // If testing settle, nudge slightly off the seam then wait for the magnet.
  if (settle) {
    await page.evaluate(() => window.scrollBy({ top: 60, behavior: 'auto' }))
  }
  await new Promise((r) => setTimeout(r, settle ? 1600 : 1300))
  await page.screenshot({ path: `${outDir}/p${String(i).padStart(2, '0')}_${Math.round(p * 100)}.png` })
  i++
}
await browser.close()
console.log('captured', positions.length, 'frames to', outDir)
