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

/**
 * The count in words as well as digits.
 *
 * Both forms go into the block on purpose. The evaluation's grader — and the
 * honesty rule behind it — treats any number in a reply that is not in the notes
 * as an invention, and a model asked "how many" answers "seven" far more often
 * than "7". A total that is true but only written one way still reads as made up.
 */
function numberWord(n) {
  const words = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve',
  ]
  return words[n] ?? String(n)
}

/** The href for one of profile.socials, by label. Undefined if he removed it. */
function socialHref(profile, label) {
  return profile.socials.find((s) => s.label === label)?.href
}

/**
 * "QuerySphere" -> "Query Sphere"; a name with no internal capital is unchanged.
 *
 * Lowercase before the capital, never a digit: with `[a-z0-9]` here, "Interactive
 * 3D Portfolio" split into "Interactive 3 D Portfolio" and the notes went out
 * claiming people write it that way. Nobody does. An alias the corpus invents is
 * worse than no alias — it is the one kind of sentence this whole file exists to
 * keep out of the bot's mouth.
 */
function spacedName(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2')
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

  // The visitor's words for a fact the bio already carries. Retrieval scores
  // vocabulary, not meaning, so "What did you study?" shared not one token with
  // "I hold a BSCS from ITU" and was refused at coverage 0.00 in the live
  // evaluation — four different phrasings of it, while the fact sat in the
  // corpus. Sourced from profile.education, so it cannot drift from the page.
  blocks.push({
    heading: 'Education, my degree and where I studied',
    text: profile.education,
  })

  // Every project in one block, with the total stated.
  //
  // This is the fix for the single most reproducible failure the live evaluation
  // found: asked how many projects he had, the model answered "six" in 5 of 5
  // samples and listed six, silently dropping Project Horus. It was counting
  // honestly — `retrieve`'s k = 6 had truncated seven project chunks to six, so
  // "six" was a fact about the retrieval cap, not about his career.
  //
  // The lever is here rather than in the prompt because the prompt was already
  // tried and measured: "never total anything up" moved it 10/10 failing to 8/10
  // and made the model start referring to "my notes", which the prompt forbids
  // (docs/redesign/chat-eval.md, "the prompt change that did not work"). A model
  // cannot be talked out of counting what it was handed. It can be handed the
  // whole list and the true total.
  //
  // Deliberately says "written up here" rather than "shipped" or "built": the
  // count is a fact about this portfolio, which is the only thing the notes can
  // honestly support.
  const projectNames = projects.map((p) => p.name)
  blocks.push({
    heading: 'Projects, all of them and how many there are',
    text:
      `There are ${numberWord(projectNames.length)} projects written up here in total, ` +
      `${projectNames.length} of them: ${projectNames.join(', ')}. ` +
      'That is the complete list of the projects on this site.',
  })

  for (const p of projects) {
    blocks.push({
      heading: `Project: ${p.name}`,
      text: [
        // The framing, and it is only here — `projects.ts` stays as it is,
        // because a project card on the page should read as a project card.
        //
        // The live evaluation flagged 18 of 101 replies with no first-person
        // pronoun anywhere, almost all of them "what is X" questions answered as
        // "Project Horus is an automated pipeline that identifies students…".
        // The model was not ignoring the persona; it was mirroring its notes,
        // which described his work in the third person because that is how the
        // site's copy is written. One clause in front of that copy gives it
        // something of his own to mirror instead.
        `${p.name} is a project I built.`,
        // A compound name is one token to a lexical retriever, so a visitor who
        // types the spaced form ("Query Sphere") scores zero against the chunk
        // that is entirely about it. The spelling people use is a fact about the
        // project, so it belongs in the notes rather than in a stopword table.
        spacedName(p.name) === p.name ? '' : `Some people write it ${spacedName(p.name)}.`,
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
