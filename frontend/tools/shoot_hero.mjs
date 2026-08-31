// Renders the live hero and crops the wizard out of it, so the reduced-motion
// fallback is the same character in the same pose rather than a stand-in.
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const URL = process.env.SHOOT_URL ?? 'http://localhost:4173/'
mkdirSync('public/shots', { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 2500)) // let the model load and settle

// Crop tuned against the actual placement (`DESKTOP_POSITION [1.4, -0.21, 0]`,
// scale 1.3): at a 1440x900 viewport the figure — hair to wand-tip sparkle trail
// — sits roughly x:955-1300, y:290-720. This box adds ~15% padding around that
// and keeps the brief's original 4:5-ish portrait aspect; re-measure here if the
// placement constants in HeroWizard.tsx ever change.
await page.screenshot({
  path: 'public/shots/hero-wizard.png',
  clip: { x: 900, y: 210, width: 460, height: 580 },
  omitBackground: false,
})
await browser.close()
console.log('wrote public/shots/hero-wizard.png — convert to webp next')
