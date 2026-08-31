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

mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})

for (const size of WIDTHS) {
  const page = await browser.newPage()
  await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.screenshot({ path: `${OUT}/${size.name}-full.png`, fullPage: true })
  for (const id of ['top', 'about', 'work', 'skills', 'experience', 'contact']) {
    await page.evaluate((anchor) => {
      document.getElementById(anchor)?.scrollIntoView()
    }, id)
    await new Promise((r) => setTimeout(r, 400))
    await page.screenshot({ path: `${OUT}/${size.name}-${id}.png` })
  }
  await page.close()
}

await browser.close()
console.log(`shot ${WIDTHS.length} widths into ${OUT}/`)
