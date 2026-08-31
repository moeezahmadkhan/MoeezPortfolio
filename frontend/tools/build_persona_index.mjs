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

/** The href for one of profile.socials, by label. Undefined if he removed it. */
function socialHref(profile, label) {
  return profile.socials.find((s) => s.label === label)?.href
}

/** Turns the typed content into prose the retriever can score. */
function factsFromContent({ profile, projects, skills, experience }) {
  const blocks = []

  blocks.push({
    heading: 'Who I am',
    text: `${profile.name}, ${profile.role}. ${profile.thesis} Based in ${profile.location}. Contact: ${profile.email}. ${profile.bio.join(' ')}`,
  })

  // A chunk of its own, not a line inside "Who I am". "How do I get in touch?"
  // is one of the most likely questions a recruiter asks, and it shares almost
  // no vocabulary with a bio — so the links need a block whose own wording is
  // the wording of that question. Every URL here comes from profile.socials;
  // nothing is typed in by hand.
  blocks.push({
    heading: 'How to reach me and where to find me online',
    text: [
      `The best way to contact me is email: ${profile.email}.`,
      `You can also reach me, connect, or message me on LinkedIn: ${socialHref(profile, 'LinkedIn')}.`,
      `My code is on GitHub: ${socialHref(profile, 'GitHub')}.`,
      `My site is ${socialHref(profile, 'Website')}.`,
      'If you want to hire me, talk about a role, or just get in touch, LinkedIn and email both work.',
    ]
      .filter((line) => !line.includes('undefined'))
      .join(' '),
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
