// Verifies every id in MODELS still exists on OpenRouter. Run before every deploy.
//
// This exists because the failure already happened: five of six ids in a previous
// list had gone stale, so every chat request burned five upstream 404s before
// reaching the one live model. Nothing surfaced that — the bot just got slower.
import { build } from 'esbuild'
import { mkdirSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

mkdirSync('.tmp', { recursive: true })
await build({
  entryPoints: ['api/_core/persona.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: '.tmp/persona.mjs',
  logLevel: 'silent',
})
const { MODELS } = await import(pathToFileURL('.tmp/persona.mjs').href + `?t=${Date.now()}`)
rmSync('.tmp', { recursive: true, force: true })

const res = await fetch('https://openrouter.ai/api/v1/models')
if (!res.ok) {
  console.error(`could not reach OpenRouter: HTTP ${res.status}`)
  process.exit(2)
}
const live = new Set((await res.json()).data.map((m) => m.id))

const dead = MODELS.filter((id) => !live.has(id))
for (const id of MODELS) console.log(`${dead.includes(id) ? '✗' : '✓'} ${id}`)

if (dead.length > 0) {
  console.error(`\n${dead.length} model id(s) no longer resolve. Replace them in api/_core/persona.ts.`)
  process.exit(1)
}
console.log('\nall models resolve')
