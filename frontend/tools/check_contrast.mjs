// Fails the build when the site's body copy drops below the WCAG AA contrast
// floor against what is ACTUALLY behind it.
//
// The tokens alone say #9a978f on #07070d, a comfortable 6.9:1 — and that is
// not what a visitor receives, because a WebGL backdrop paints a warm, moving
// wash behind the copy. Nothing in a unit test can see that: jsdom has no
// layout, no compositor and no shader. This measures the composited pixels of a
// real screenshot instead, and it earned its place by catching the hero's copy
// at 3.73:1 on mobile while desktop sat at 5.79:1 — same text, same colour, a
// ground 3.85x brighter because on a phone the copy sits over the middle of the
// screen where the backdrop's radial falloff peaks.
//
// Usage: `npm run check:contrast` against a running preview (SHOOT_URL to
// override the origin). Exits non-zero on any sample below MIN_RATIO.
import puppeteer from 'puppeteer-core'
import { inflateSync } from 'node:zlib'

function decodePng(buf) {
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  if (bitDepth !== 8) throw new Error('unexpected bit depth ' + bitDepth)
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : (() => { throw new Error('colorType ' + colorType) })()
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(height * stride)
  let rp = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++]
    for (let x = 0; x < stride; x++) {
      const cur = raw[rp + x]
      const a = x >= channels ? out[y * stride + x - channels] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0
      let v
      if (filter === 0) v = cur
      else if (filter === 1) v = cur + a
      else if (filter === 2) v = cur + b
      else if (filter === 3) v = cur + ((a + b) >> 1)
      else {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        v = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
      }
      out[y * stride + x] = v & 0xff
    }
    rp += stride
  }
  return { width, height, channels, data: out }
}

const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

// WCAG AA for body text. Large text is allowed 3:1, but everything sampled here
// is body copy, so one floor is enough.
const MIN_RATIO = 4.5

// Each sample is a selector whose text must stay legible over whatever the
// canvas is drawing behind it.
const SAMPLES = ['.hero__thesis', '.hero__meta']

const URL = process.env.SHOOT_URL ?? 'http://localhost:4174/'
const failures = []

const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome-stable', args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] })

for (const [name, w, h] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
  const p = await b.newPage()
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await p.goto(URL, { waitUntil: 'networkidle0' })
  // The backdrop eases its tint in over about a second and the rig fades in on
  // top of it; sampling before both have settled measures a frame no visitor
  // sees.
  await p.waitForFunction(() => window.__modelReady && window.__modelReady.hero, { timeout: 20000 })
  await new Promise((r) => setTimeout(r, 2000))

  for (const selector of SAMPLES) {
    const box = await p.evaluate((sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      const ink = getComputedStyle(el).color.match(/[\d.]+/g).slice(0, 3).map(Number)
      return {
        x: Math.round(r.left), y: Math.round(r.top),
        width: Math.round(r.width), height: Math.round(r.height),
        ink,
      }
    }, selector)
    if (!box || box.width < 2 || box.height < 2) {
      throw new Error(`${name} ${selector}: nothing to sample — the selector matched no laid-out element`)
    }

    const clip = { x: box.x, y: box.y, width: box.width, height: box.height }
    const { width, height, channels, data } = decodePng(Buffer.from(await p.screenshot({ clip })))

    // The INK comes from computed style, not from the pixels. Reading it back
    // off the screenshot was the first attempt and it is biased: glyphs are a
    // minority of the pixels in a line of text and, at --t-micro in a mono
    // face, most of the ones that exist are antialiased edges at partial
    // coverage. Any percentile therefore reports something darker than the
    // colour actually specified, and the smaller the type the worse it lies —
    // it scored `.hero__meta` a failing 4.36:1 while the same rule passed the
    // larger `.hero__thesis` beside it.
    //
    // The GROUND is the half that has to be measured, because it is the half
    // the tokens cannot tell you: a shader is painting it. The 25th percentile
    // of the box is solidly background at every type size.
    const lums = []
    for (let i = 0; i < width * height; i++) {
      const o = i * channels
      lums.push(lum(data[o], data[o + 1], data[o + 2]))
    }
    lums.sort((a, c) => a - c)
    const ground = lums[Math.floor(lums.length * 0.25)]
    const glyph = lum(box.ink[0], box.ink[1], box.ink[2])
    const r = ratio(glyph, ground)
    const ok = r >= MIN_RATIO
    if (!ok) failures.push(`${name} ${selector}: ${r.toFixed(2)}:1`)
    console.log(
      `${ok ? '\u2713' : '\u2717'} ${name.padEnd(8)} ${selector.padEnd(16)} ${r.toFixed(2)}:1` +
        `  (ground ${ground.toFixed(4)}, glyph ${glyph.toFixed(4)})`,
    )
  }
  await p.close()
}
await b.close()

if (failures.length) {
  console.error(`\nbelow ${MIN_RATIO}:1 — body copy is not legible over the live backdrop:`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`\nall samples clear ${MIN_RATIO}:1`)
