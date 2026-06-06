// Land on named sections (by element id) and screenshot each, after the
// preloader + conjuring reveal + smooth-scroll settle.
//   node scripts/peek.mjs <outDir> <id|frac> [id|frac ...]
// A numeric arg is treated as a scroll fraction; anything else as an element id.
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const outDir = args[0] || '/tmp/peek'
const targets = args.slice(1)
if (targets.length === 0) targets.push('top', 'tracker')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const W = Number(process.env.W || 1440)
const H = Number(process.env.H || 900)

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', `--window-size=${W},${H}`],
})
const page = await browser.newPage()
await page.setViewport({ width: W, height: H })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page
  .waitForFunction(() => !document.querySelector('.preloader'), { timeout: 45000 })
  .catch(() => console.warn('preloader wait timed out — proceeding'))
await sleep(2200)

for (const t of targets) {
  await page.evaluate((t) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    if (!Number.isNaN(Number(t))) {
      window.scrollTo({ top: max * Number(t), behavior: 'auto' })
    } else {
      const el = document.getElementById(t)
      const top = el ? el.getBoundingClientRect().top + window.scrollY : 0
      window.scrollTo({ top: Math.round(top + 40), behavior: 'auto' })
    }
  }, t)
  await sleep(4500) // smooth-scroll travel + settle magnet + camera lerp + reveal
  const name = String(t).replace(/[^a-z0-9]/gi, '_')
  await page.screenshot({ path: `${outDir}/${name}.png` })
  console.log('shot', name)
}
await browser.close()
