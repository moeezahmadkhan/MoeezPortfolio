#!/usr/bin/env node
/**
 * Renders the portraits and the social card, then writes them into
 * public/figures/. Run after changing a model or a camera:
 *
 *   npm run figures
 *
 * Everything expensive stays on this side of the line. The site ships the
 * images and nothing else — no GLB, no Draco decoder, no Basis transcoder.
 */
import { cpSync, mkdirSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const HERE = new URL('.', import.meta.url).pathname
const OUT = `${HERE}../public/figures`
const THREE_LIBS = `${HERE}../node_modules/three/examples/jsm/libs`

// The decoders are copied in for the render and thrown away after, so they can
// never drift into the build or into git.
rmSync(`${HERE}decoders`, { recursive: true, force: true })
mkdirSync(`${HERE}decoders`, { recursive: true })
cpSync(`${THREE_LIBS}/draco`, `${HERE}decoders/draco`, { recursive: true })
cpSync(`${THREE_LIBS}/basis`, `${HERE}decoders/basis`, { recursive: true })
// The card is set in the site's own faces, so they come along for the render.
rmSync(`${HERE}fonts`, { recursive: true, force: true })
cpSync(`${HERE}../public/fonts`, `${HERE}fonts`, { recursive: true })
mkdirSync(OUT, { recursive: true })

const server = spawn('npx', ['vite', '--config', `${HERE}vite.figures.config.js`], {
  stdio: 'ignore', detached: true,
})
const url = 'http://localhost:5199/'
const ready = async () => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) return true } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

const RAD = Math.PI / 180

// Portraits are transparent WebP at 2x. The social card is opaque JPEG,
// because WebP is still not read by every crawler that matters.
const JOBS = [
  // Yaws chosen off a contact sheet (tools/sweep.mjs), not guessed: every one
  // of these models faces a different way in its own local space.
  { file: 'wizard', model: 'wizard_improved', width: 720, height: 900, yaw: 75 * RAD, pitch: 5 * RAD, zoom: 0.92 },
  { file: 'spellcaster', model: 'spellcaster', width: 720, height: 900, yaw: 105 * RAD, pitch: 6 * RAD, zoom: 0.92 },
  { file: 'cricket', model: 'cricket_improved', width: 720, height: 900, yaw: 60 * RAD, pitch: 5 * RAD, zoom: 0.92 },
  { file: 'pact', model: 'pact_pair', width: 720, height: 900, yaw: 95 * RAD, pitch: 5 * RAD, zoom: 0.92 },
]

const CARD = { file: 'og', model: 'wizard_improved', yaw: 75 * RAD, pitch: 5 * RAD }


if (!(await ready())) {
  process.kill(-server.pid)
  throw new Error('figures: the render server never came up')
}

const browser = await chromium.launch({
  args: ['--use-angle=vulkan', '--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist',
         '--enable-features=Vulkan,VulkanFromANGLE', '--disable-gpu-sandbox'],
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(url)
await page.waitForFunction(() => !!window.renderFigure)

for (const { file, model, ...opts } of JOBS) {
  const data = await page.evaluate(
    ([name, o]) => window.renderFigure(name, o), [model, opts],
  )
  const ext = opts.type === 'image/jpeg' ? 'jpg' : 'webp'
  const path = `${OUT}/${file}.${ext}`
  writeFileSync(path, Buffer.from(data.split(',')[1], 'base64'))
  console.log(`  ${file.padEnd(12)} ${(statSync(path).size / 1024).toFixed(1)}KB  ${opts.width}x${opts.height}  ${ext}`)
}

const cardData = await page.evaluate(
  ([name, o]) => window.renderCard(name, o), [CARD.model, { yaw: CARD.yaw, pitch: CARD.pitch }],
)
writeFileSync(`${OUT}/og.jpg`, Buffer.from(cardData.split(',')[1], 'base64'))
console.log(`  ${'og'.padEnd(12)} ${(statSync(`${OUT}/og.jpg`).size / 1024).toFixed(1)}KB  1200x630  jpg`)

await browser.close()
process.kill(-server.pid)
rmSync(`${HERE}decoders`, { recursive: true, force: true })
rmSync(`${HERE}fonts`, { recursive: true, force: true })

if (errors.length) {
  console.error(errors)
  process.exit(1)
}
console.log('\nfigures: written to public/figures/')
