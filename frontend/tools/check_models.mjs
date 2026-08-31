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
const { MODELS, MAX_OUTPUT_TOKENS } = await import(pathToFileURL('.tmp/persona.mjs').href + `?t=${Date.now()}`)
rmSync('.tmp', { recursive: true, force: true })

const res = await fetch('https://openrouter.ai/api/v1/models')
if (!res.ok) {
  console.error(`could not reach OpenRouter: HTTP ${res.status}`)
  process.exit(2)
}
const live = new Set((await res.json()).data.map((m) => m.id))

const dead = MODELS.filter((id) => !live.has(id))
for (const id of MODELS) console.log(`${dead.includes(id) ? '✗' : '✓'} ${id}  (id resolves)`)

// Resolving is not working. On 2026-09-01 all five configured ids resolved, three
// returned "Provider returned error" on a real request, and one leaked its own
// reasoning into the reply. So when a key is available, actually call them.
const key = process.env.OPENROUTER_API_KEY
if (!key) {
  console.log('\nno OPENROUTER_API_KEY — checked that ids resolve, did NOT check that they answer.')
  console.log('set the key and re-run to catch a model that resolves but errors or leaks.')
} else {
  // Probe at the SAME cap production uses. A tighter probe is not a cheaper
  // version of this check, it is a different and misleading one: several models
  // spend 40+ completion tokens on hidden reasoning before writing a word, so a
  // 24- or 64-token probe reports "empty" for a model that answers perfectly at
  // MAX_OUTPUT_TOKENS. That mistake cost an afternoon; do not re-tighten it.
  //
  // Free endpoints are also genuinely flaky — sampled four times each, the free
  // models here returned between two and four good replies out of four. One bad
  // sample is not a dead model, so each is retried once before being called bad.
  console.log(`\ncalling each model twice at max_tokens ${MAX_OUTPUT_TOKENS}:\n`)
  for (const id of MODELS) {
    if (dead.includes(id)) continue
    let verdict
    for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: id,
          max_tokens: MAX_OUTPUT_TOKENS,
          messages: [
            { role: 'system', content: 'You are Moeez. One short sentence, first person.' },
            { role: 'user', content: 'What do you build?' },
          ],
        }),
      })
      const j = await r.json()
      const choice = j.choices?.[0]
      const content = choice?.message?.content?.trim() ?? ''
      const reasoning = choice?.message?.reasoning ?? choice?.message?.reasoning_content ?? null
      const reasoningTokens = j.usage?.completion_tokens_details?.reasoning_tokens ?? 0
      if (!r.ok || j.error) verdict = `✗ ERROR ${JSON.stringify(j.error?.message ?? r.status)}`
      else if (!content) verdict = '✗ answered with no content'
      // The scratchpad leak: the model narrates its own instructions into the reply.
      else if (/^(we need to|the user (is )?(asking|wants)|okay,? (so|the user)|first,? i)/i.test(content))
        verdict = `✗ LEAKS ITS SCRATCHPAD: ${JSON.stringify(content.slice(0, 60))}`
      else if (reasoning || reasoningTokens > 0)
        verdict = `~ answers, but spent ${reasoningTokens} tokens reasoning: ${JSON.stringify(content.slice(0, 40))}`
      else verdict = `✓ ${JSON.stringify(content.slice(0, 40))}`
    } catch (e) {
      verdict = `✗ threw: ${e.message.slice(0, 60)}`
    }
      if (!verdict.startsWith('✗')) break
    }
    console.log(`${verdict}\n    ${id}\n`)
  }
}

if (dead.length > 0) {
  console.error(`\n${dead.length} model id(s) no longer resolve. Replace them in api/_core/persona.ts.`)
  process.exit(1)
}
console.log('all configured model ids resolve')
