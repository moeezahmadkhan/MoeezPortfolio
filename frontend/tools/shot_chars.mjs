import puppeteer from 'puppeteer-core'
const PORT = process.env.PORT || '5176'
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--window-size=1440,900'],
})
const p = await b.newPage()
await p.setViewport({ width: 2200, height: 1375 })
const errs = []
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await p.waitForFunction(() => !document.querySelector('.preloader'), { timeout: 30000 })
await sleep(1200)
// Skip the cinematic intro (it locks scroll until dismissed).
for (let i = 0; i < 6; i++) {
  const gone = await p.evaluate(() => {
    const el = document.querySelector('.intro')
    if (el) { el.click(); return false }
    return true
  })
  if (gone) break
  await sleep(600)
}
await sleep(1500)
async function shotAt(frac, name, clip) {
  await p.evaluate((f) => {
    const max = document.body.scrollHeight - window.innerHeight
    window.scrollTo(0, Math.round(f * max))
  }, frac)
  await sleep(4200)
  await p.screenshot({ path: `.shots/${name}.png` })
  if (clip) await p.screenshot({ path: `.shots/${name}_crop.png`, clip })
}
for (const [frac, name] of [
  [0.43, 'spell'],
  [0.59, 'pact'],
  [0.81, 'map'],
]) {
  await shotAt(frac, name)
}
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)))
await b.close()
