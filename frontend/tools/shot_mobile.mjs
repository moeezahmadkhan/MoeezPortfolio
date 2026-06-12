import puppeteer from 'puppeteer-core'
const PORT = process.env.PORT || '5176'
const TAG = process.env.TAG || 'mob'
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--window-size=420,900'],
})
const p = await b.newPage()
// iPhone-ish portrait viewport, coarse pointer so the mobile tier engages.
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const errs = []
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await p.waitForFunction(() => !document.querySelector('.preloader'), { timeout: 30000 })
await sleep(1200)
for (let i = 0; i < 8; i++) {
  const gone = await p.evaluate(() => {
    const el = document.querySelector('.intro')
    if (el) { el.click(); return false }
    return true
  })
  if (gone) break
  await sleep(600)
}
await sleep(1500)
const fracs = process.env.FRACS
  ? process.env.FRACS.split(',').map(Number)
  : [0.0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.74, 0.86, 0.95]
for (const f of fracs) {
  await p.evaluate((ff) => {
    const max = document.body.scrollHeight - window.innerHeight
    window.scrollTo(0, Math.round(ff * max))
  }, f)
  await sleep(3200)
  await p.screenshot({ path: `.shots/${TAG}_${f}.png` })
}
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)))
await b.close()
