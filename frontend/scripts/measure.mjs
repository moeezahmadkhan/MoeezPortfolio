// Print each section's scroll-offset fraction: (section top px) / (max scroll px).
// Usage: dev server running on :5173, then `node scripts/measure.mjs`
//   Override the target with URL=http://localhost:5174/ node scripts/measure.mjs
import puppeteer from 'puppeteer-core'

const URL = process.env.URL || 'http://localhost:5173/'

const ids = ['top', 'wizard', 'spells', 'conjuring', 'grimoire', 'pact', 'tracker', 'map', 'chronicles', 'owlpost']
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--window-size=1440,900'],
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.error('PAGEERR', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text()) })
await page.setViewport({ width: 1440, height: 900 })
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
// Sections render immediately (behind the preloader), so wait for the last one to mount.
await page.waitForSelector('#owlpost', { timeout: 45000 }).catch(() => console.error('owlpost never mounted'))
await page.waitForFunction(() => !document.querySelector('.preloader'), { timeout: 45000 }).catch(() => {})
await new Promise((r) => setTimeout(r, 2500))
const fracs = await page.evaluate((ids) => {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return ids.map((id) => {
    const el = document.getElementById(id)
    if (!el) return [id, null]
    const top = el.getBoundingClientRect().top + window.scrollY
    return [id, +(top / max).toFixed(3)]
  })
}, ids)
console.log(JSON.stringify(fracs))
await browser.close()
