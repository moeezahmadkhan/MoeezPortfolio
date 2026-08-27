import { cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'
const HERE = new URL('.', import.meta.url).pathname
const LIBS = `${HERE}../node_modules/three/examples/jsm/libs`
rmSync(`${HERE}decoders`, { recursive: true, force: true })
mkdirSync(`${HERE}decoders`, { recursive: true })
cpSync(`${LIBS}/draco`, `${HERE}decoders/draco`, { recursive: true })
cpSync(`${LIBS}/basis`, `${HERE}decoders/basis`, { recursive: true })
const srv = spawn('npx', ['vite', '--config', `${HERE}vite.figures.config.js`], { stdio: 'ignore', detached: true })
for (let i = 0; i < 60; i++) { try { if ((await fetch('http://localhost:5199/')).ok) break } catch {} await new Promise(r => setTimeout(r, 500)) }
const b = await chromium.launch({ args: ['--use-angle=vulkan','--use-gl=angle','--enable-gpu','--ignore-gpu-blocklist','--enable-features=Vulkan,VulkanFromANGLE','--disable-gpu-sandbox'] })
const p = await b.newPage()
p.on('pageerror', e => console.log('ERR', String(e)))
await p.goto('http://localhost:5199/')
await p.waitForFunction(() => !!window.renderSheet)
for (const m of ['wizard_improved','spellcaster','cricket_improved','pact_pair']) {
  const d = await p.evaluate((n) => window.renderSheet(n), m)
  writeFileSync(`${process.argv[2]}/sheet-${m}.webp`, Buffer.from(d.split(',')[1], 'base64'))
  console.log('sheet', m)
}
await b.close(); process.kill(-srv.pid); rmSync(`${HERE}decoders`, { recursive: true, force: true })
