// Fails the build when the deployed security headers would break the site.
//
// A Content-Security-Policy is the one piece of hardening that fails SILENTLY
// and only in production: the dev server and `vite preview` send no such header,
// so every local check passes while the live page loads no fonts, decodes no
// models, and cannot send the contact form. The 3D stage is the worst case —
// both the Draco and Basis decoders are WebAssembly running inside a Worker
// built from a Blob URL, and each of those is a separate CSP directive.
//
// So this check serves the built `dist/` through a server that replays the exact
// headers from `vercel.json`, then loads it in a real browser and fails on any
// `securitypolicyviolation` event. Reading the policy from the manifest rather
// than from a copy here is the point: a header edit that breaks the page fails
// this check rather than the deploy.
//
// Two things this found that a `securitypolicyviolation` listener alone did not:
//
//  1. `window.__modelReady` is a MAP of rig id to true, not a boolean. A
//     `=== true` wait reported "not ready" under every policy, passing and
//     failing for reasons that had nothing to do with the header.
//  2. The Basis transcoder's failure arrives as an uncaught EvalError, NOT as a
//     violation event — so console and pageerror are collected too. See the
//     `'unsafe-eval'` note in CLAUDE.md (vercel.json is JSON and cannot hold it).
//
// Usage: `npm run check:csp`. Exits non-zero naming the directive that fired.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('check:csp — no dist/. Run `npm run build` first.')
  process.exit(1)
}

/** Every header rule in vercel.json whose `source` matches this path. */
function headersFor(pathname) {
  const out = {}
  for (const rule of manifest.headers ?? []) {
    if (!new RegExp(`^${rule.source}$`).test(pathname)) continue
    for (const h of rule.headers) out[h.key] = h.value
  }
  return out
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm',
  '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain',
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = path.join(dist, pathname)
  if (!file.startsWith(dist)) return res.writeHead(403).end()
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html')

  for (const [k, v] of Object.entries(headersFor(pathname))) res.setHeader(k, v)
  res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream')
  res.writeHead(200).end(fs.readFileSync(file))
})

await new Promise((r) => server.listen(0, '127.0.0.1', r))
const origin = `http://127.0.0.1:${server.address().port}`

// The policy under test names https origins for fonts and the Draco decoder. On
// a loopback origin the browser enforces the policy exactly as written, which is
// what we want: a request this policy would block is blocked here too.
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})
const page = await browser.newPage()

const violations = []
const failures = []
await page.evaluateOnNewDocument(() => {
  window.__csp = []
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__csp.push({
      directive: e.effectiveDirective || e.violatedDirective,
      blocked: e.blockedURI,
      sample: e.sample ?? '',
    })
  })
})
page.on('requestfailed', (r) => {
  const err = r.failure()?.errorText ?? ''
  if (/blocked/i.test(err)) failures.push(`${err} ${r.url()}`)
})
// A policy breach inside a blob worker never reaches the document's violation
// listener; it surfaces here, as an uncaught error, and nowhere else.
page.on('pageerror', (e) => {
  if (/Content Security Policy/i.test(e.message)) failures.push(`pageerror: ${e.message}`)
})
page.on('console', (m) => {
  if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) {
    failures.push(`console: ${m.text()}`)
  }
})

await page.goto(origin, { waitUntil: 'networkidle0', timeout: 60_000 })

// The stage is lazy and gated; wait on the same flag `shoot.mjs` does. It is a
// MAP of rig id to true (`modelReadiness.ts`), not a boolean — a `=== true`
// check here passed on a policy that blocked nothing and failed on one that
// blocked nothing either, which is to say it measured neither.
let modelReady = false
try {
  await page.waitForFunction(
    () => Boolean(window.__modelReady && Object.keys(window.__modelReady).length > 0),
    { timeout: 30_000 },
  )
  modelReady = true
} catch {
  modelReady = false
}

// Fonts are a separate origin and a separate directive from everything else.
const fontsLoaded = await page.evaluate(async () => {
  await document.fonts.ready
  return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
})

violations.push(...(await page.evaluate(() => window.__csp)))
await browser.close()
server.close()

const applied = headersFor('/')
console.log('headers replayed from vercel.json:')
for (const k of Object.keys(applied)) console.log(`  ${k}`)
console.log(`\nmodel decoded (Draco + Basis in a blob worker): ${modelReady}`)
console.log(`webfont families loaded: ${[...new Set(fontsLoaded)].join(', ') || 'none'}`)

let bad = false
if (violations.length) {
  bad = true
  console.error(`\n${violations.length} CSP violation(s):`)
  for (const v of violations) console.error(`  ${v.directive} blocked ${v.blocked} ${v.sample}`)
}
if (failures.length) {
  bad = true
  console.error(`\nblocked requests:`)
  for (const f of failures) console.error(`  ${f}`)
}
if (!applied['Content-Security-Policy']) {
  bad = true
  console.error('\nno Content-Security-Policy is applied to "/" — the check would pass vacuously')
}
if (!modelReady) {
  bad = true
  console.error('\nthe 3D stage never reported ready under this policy')
}
if (![...new Set(fontsLoaded)].length) {
  bad = true
  console.error('\nno webfont loaded under this policy')
}

console.log(bad ? '\ncheck:csp FAILED' : '\ncheck:csp OK')
process.exit(bad ? 1 : 0)
