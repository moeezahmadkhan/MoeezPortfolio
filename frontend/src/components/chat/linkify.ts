/**
 * Splits a reply into text and links.
 *
 * The model already emits URLs: `SYSTEM_PROMPT` orders it to "Copy a link from
 * the notes exactly, character for character", and the corpus carries the
 * LinkedIn profile, the GitHub account, the site and QuerySphere's two links.
 * They simply arrived as plain text inside a `<p>`, so a visitor asking "where
 * is your code?" got an address they had to select and paste.
 *
 * A splitter rather than an HTML builder, deliberately. The reply is untrusted
 * text — it comes from a model a stranger is allowed to talk to — and it must
 * stay text. The caller maps these parts to React nodes, so the structure is
 * ours and only the characters are the model's. There is no path here that
 * could reach `dangerouslySetInnerHTML`.
 */
export type LinkPart = { href: string; text: string }

/**
 * The only schemes that may become an href. Everything else — `javascript:`,
 * `data:`, `file:` — stays exactly what it is: characters on the page.
 */
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:']

/**
 * Candidates, not verdicts. Every match is checked against `SAFE_SCHEMES`
 * before it becomes a link, so widening this pattern can never widen what ends
 * up clickable.
 */
const CANDIDATE = /(https?:\/\/[^\s<>]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g

/** Trailing sentence punctuation is the sentence's, not the URL's. */
const TRAILING = /[.,;:!?)\]}'"]+$/

/**
 * Whether a match that runs to the very end of the message can be trusted.
 *
 * `MAX_OUTPUT_TOKENS` is 256, so a reply can stop in the middle of an address.
 * A link to half a URL is worse than no link at all: it looks live, and it goes
 * nowhere. If the message does not end in sentence punctuation, the last token
 * is assumed cut off and is left as text.
 */
function looksComplete(message: string): boolean {
  return /[.!?)\]}'"]\s*$/.test(message)
}

export function linkify(text: string): Array<string | LinkPart> {
  const parts: Array<string | LinkPart> = []
  let cursor = 0

  for (const match of text.matchAll(CANDIDATE)) {
    const start = match.index ?? 0
    const whole = match[0]

    // Give the punctuation back to the sentence before judging the rest.
    const trimmed = whole.replace(TRAILING, '')
    const tail = whole.slice(trimmed.length)
    const href = match[2] ? `mailto:${trimmed}` : trimmed

    let safe = false
    try {
      safe = SAFE_SCHEMES.includes(new URL(href).protocol)
    } catch {
      safe = false
    }
    if (start + whole.length >= text.length && !looksComplete(text)) safe = false

    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(safe ? { href, text: trimmed } : trimmed)
    if (tail) parts.push(tail)
    cursor = start + whole.length
  }

  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts.length > 0 ? parts : [text]
}
