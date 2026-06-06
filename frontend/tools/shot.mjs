import puppeteer from 'puppeteer-core'

const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--window-size=1440,900'],
})
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Wait for the preloader to finish + the conjuring reveal to settle.
await p.waitForFunction(() => !document.querySelector('.preloader'), { timeout: 30000 })
await sleep(1500)

// Land exactly on the conjuring section top (where the scroll-settle magnet rests)
// and hold there so the camera framing is stable across shots.
async function holdAtConjuring() {
  await p.evaluate(() => {
    const el = document.getElementById('conjuring')
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, Math.round(top + 40)) // nudge just inside the window
  })
  await sleep(4500) // smooth-scroll travel + settle magnet + camera lerp + reveal blur
}

await holdAtConjuring()
await p.screenshot({ path: '.shots/conjuring-idle.png' })

// Cast the spell.
await p.evaluate(() => document.querySelector('.cast-btn')?.click())
await sleep(1100) // ~37% through the 3s cast
await p.screenshot({ path: '.shots/conjuring-midcast.png' })
await sleep(2300) // fully lit
await p.screenshot({ path: '.shots/conjuring-final.png' })

// Read back the button label + spell progress for a sanity check.
const info = await p.evaluate(() => ({
  label: document.querySelector('.cast-btn')?.textContent?.trim(),
}))
console.log(JSON.stringify(info))

await b.close()
