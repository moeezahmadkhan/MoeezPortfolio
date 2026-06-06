// Minimal, XSS-safe markdown for the Familiar's replies. Supports the small subset
// the model actually emits: **bold**, "- "/"* " bullet lists, and paragraph breaks.
// Builds React nodes directly (no dangerouslySetInnerHTML), so it's safe by construction.
import { Fragment, type ReactNode } from 'react'

// Parse inline **bold** spans within a single line.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(<strong key={key++}>{m[1]}</strong>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  let key = 0

  const flushList = () => {
    if (list.length === 0) return
    const items = list
    blocks.push(
      <ul key={key++} className="md-list">
        {items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </ul>,
    )
    list = []
  }

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      list.push(bullet[1])
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      blocks.push(
        <p key={key++} className="md-p">
          {inline(line)}
        </p>,
      )
    }
  }
  flushList()

  return <Fragment>{blocks}</Fragment>
}
