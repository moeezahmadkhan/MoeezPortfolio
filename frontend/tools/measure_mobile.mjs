import puppeteer from 'puppeteer-core'
const PORT = process.env.PORT || '5176'
const W = Number(process.env.W || 390)
const H = Number(process.env.H || 844)
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', `--window-size=${W + 20},${H}`],
})
const p = await b.newPage()
await p.setViewport({ width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await p.waitForFunction(() => !document.querySelector('.preloader'), { timeout: 30000 })
await sleep(1000)
for (let i = 0; i < 8; i++) {
  const gone = await p.evaluate(() => {
    const el = document.querySelector('.intro')
    if (el) { el.click(); return false }
    return true
  })
  if (gone) break
  await sleep(500)
}
await sleep(1200)
await p.evaluate(() => window.scrollTo(0, 0))
await sleep(400)
const data = await p.evaluate(() => {
  const ids = ['wizard', 'spells', 'grimoire', 'conjuring', 'pact', 'tracker', 'map', 'chronicles', 'owlpost']
  const max = document.documentElement.scrollHeight - window.innerHeight
  const vh = window.innerHeight
  const sy = window.scrollY
  return {
    max,
    vh,
    sections: ids.map((id) => {
      const el = document.getElementById(id)
      if (!el) return { id, missing: true }
      const r = el.getBoundingClientRect()
      const top = r.top + sy
      const h = r.height
      return {
        id,
        topFrac: +(top / max).toFixed(4),
        // fraction when the section's vertical center sits at viewport center
        centerFrac: +((top + h / 2 - vh / 2) / max).toFixed(4),
        hVH: +(h / vh).toFixed(2),
      }
    }),
  }
})
console.log(JSON.stringify(data, null, 2))
await b.close()
