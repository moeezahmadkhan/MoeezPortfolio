// Usage: node scripts/shoot.cjs <url> <outDir> [fractions] [--reduced]
// Captures the page at each scroll fraction (0..1 of document height).
// Example: node scripts/shoot.cjs http://localhost:5173 .shots 0,0.25,0.5,0.75,1
const puppeteer = require('puppeteer-core')
const fs = require('fs')

const CHROME = '/usr/bin/google-chrome-stable'

async function main() {
  const [url, outDir, fracArg] = process.argv.slice(2)
  const reduced = process.argv.includes('--reduced')
  const fractions = (fracArg || '0,0.25,0.5,0.75,1').split(',').map(Number)
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--window-size=1440,900'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  if (reduced) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  }
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  // let the preloader finish + scene settle
  await new Promise((r) => setTimeout(r, 6000))

  for (const f of fractions) {
    await page.evaluate((frac) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: max * frac, behavior: 'auto' })
    }, f)
    await new Promise((r) => setTimeout(r, 1500))
    const name = `${outDir}/${reduced ? 'rm-' : ''}f${String(f).replace('.', '_')}.png`
    await page.screenshot({ path: name })
    console.log('shot', name)
  }
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
