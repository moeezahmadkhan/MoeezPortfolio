// Builds the retrieval corpus the chat API ships with.
//
// Sources: the hand-written persona markdown, plus generated prose from the SAME
// typed content the page renders — so the page and the bot can never disagree
// about the facts. Output is committed; the serverless function does no I/O.
import { build } from 'esbuild'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const OUT = 'api/_core/corpus.generated.json'
const MAX_WORDS = 200

// --- read the TypeScript content modules by bundling them to a temp ESM file ---
async function loadContent() {
  mkdirSync('.tmp', { recursive: true })
  await build({
    entryPoints: ['src/content/index.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: '.tmp/content.mjs',
    logLevel: 'silent',
  })
  const mod = await import(pathToFileURL('.tmp/content.mjs').href + `?t=${Date.now()}`)
  rmSync('.tmp', { recursive: true, force: true })
  return mod
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Splits markdown into chunks at `##` headings, then again at MAX_WORDS. */
function chunkMarkdown(source, markdown) {
  const chunks = []
  const sections = markdown.split(/^##\s+/m).slice(1)
  for (const section of sections) {
    const [headingLine, ...rest] = section.split('\n')
    const heading = headingLine.trim()
    const body = rest
      .join('\n')
      .replace(/<!--[\s\S]*?-->/g, '') // drop the instruction comments
      .trim()
    if (countWords(body) < 8) continue // unanswered heading — skip it, never invent one
    const words = body.split(/\s+/)
    for (let i = 0; i < words.length; i += MAX_WORDS) {
      const text = words.slice(i, i + MAX_WORDS).join(' ')
      chunks.push({
        id: `${source}#${heading}#${i / MAX_WORDS}`.toLowerCase().replace(/\s+/g, '-'),
        source,
        heading,
        text,
        tokens: Math.ceil(countWords(text) * 1.35),
      })
    }
  }
  return chunks
}

/** Turns the typed content into prose the retriever can score. */
function factsFromContent({ profile, projects, skills, experience }) {
  const blocks = []

  blocks.push({
    heading: 'Who I am',
    text: `${profile.name}, ${profile.role}. ${profile.thesis} Based in ${profile.location}. Contact: ${profile.email}. ${profile.bio.join(' ')}`,
  })

  for (const p of projects) {
    blocks.push({
      heading: `Project: ${p.name}`,
      text: [
        p.outcome,
        p.metric ?? '',
        ...p.detail,
        `Built with ${p.stack.join(', ')}.`,
        p.links?.repo ? `Source: ${p.links.repo}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    })
  }

  for (const role of experience) {
    blocks.push({
      heading: `Role: ${role.title} at ${role.org}`,
      text: `${role.period}. ${role.bullets.join(' ')}`,
    })
  }

  blocks.push({
    heading: 'Skills',
    text: skills.map((g) => `${g.title}: ${g.items.join(', ')}.`).join(' '),
  })

  return blocks.map((b, i) => ({
    id: `facts#${b.heading}#${i}`.toLowerCase().replace(/\s+/g, '-'),
    source: 'src/content/index.ts',
    heading: b.heading,
    text: b.text,
    tokens: Math.ceil(countWords(b.text) * 1.35),
  }))
}

const content = await loadContent()
const chunks = [...factsFromContent(content)]

for (const file of ['content/persona/voice.md', 'content/persona/qa.md']) {
  if (!existsSync(file)) continue
  chunks.push(...chunkMarkdown(file, readFileSync(file, 'utf8')))
}

writeFileSync(OUT, JSON.stringify(chunks, null, 2) + '\n')
console.log(`wrote ${chunks.length} chunks to ${OUT}`)
