import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The chat dock floats over the page for the whole visit, so what it covers is
 * a correctness question, not a taste one. Both rules below were written after
 * measuring the built site in a real browser:
 *
 *  - `.chat` is a `position: fixed` flex column holding the launcher AND the
 *    pointer trail above it. At 390x844 its box measured 343x106 — nearly the
 *    full width of the screen — and it hit-tested all of it. Every footer link
 *    reported `document.elementFromPoint(...) === .chat`: GitHub, LinkedIn,
 *    Website and Email were all unclickable on a phone, and anything else that
 *    scrolled under that band was too.
 *  - Even with the box made inert, the launcher pill itself still landed on the
 *    footer's right-hand links at every width up to about 1400px, because the
 *    footer's last line and the dock's corner are the same corner.
 *
 * These are asserted against the stylesheet source rather than a rendered
 * layout because jsdom has none: it reports every box as 0x0, so an
 * `elementFromPoint` test here would pass whatever the CSS said. The browser
 * check is the real one; this exists to stop the fix being silently deleted.
 */

const chatCss = readFileSync(join('src', 'components', 'chat', 'ChatDock.css'), 'utf8')
const footerCss = readFileSync(join('src', 'components', 'layout', 'Footer.css'), 'utf8')
const tokens = readFileSync(join('src', 'styles', 'tokens.css'), 'utf8')

/**
 * The body of the rule for exactly this selector — `.chat`, never
 * `.chat__launcher`. The `\\s*\\{` is what makes it exact: a plain substring
 * search for `.chat` matches every BEM child of it too, which is how the first
 * version of this helper reported an empty body for a rule that was right
 * there.
 */
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))
  return match ? match[1] : ''
}

describe('the chat dock never swallows the page underneath it', () => {
  it('makes its own container inert, so only the controls inside it hit-test', () => {
    expect(ruleBody(chatCss, '.chat')).toMatch(/pointer-events:\s*none/)
  })

  it('gives the launcher and the panel their clicks back', () => {
    expect(chatCss).toMatch(/\.chat__launcher[^{]*\{[^}]*pointer-events:\s*auto/s)
    expect(chatCss).toMatch(/\.chat__panel[^{]*\{[^}]*pointer-events:\s*auto/s)
  })
})

describe('the footer clears the dock', () => {
  it('reserves the launcher footprint below its own content', () => {
    // Unconditionally, not under a media query: the overlap persists at every
    // width where the content column's right edge reaches the dock's corner,
    // which measured as everything below roughly 1400px. A breakpoint here
    // would be a number to get wrong.
    expect(footerCss).toMatch(/padding-bottom:[^;]*--dock-clearance/)
  })

  it('derives that footprint from the launcher itself, not a copied number', () => {
    expect(tokens).toMatch(/--dock-clearance:/)
    expect(tokens).toMatch(/--dock-launcher-h:/)
    expect(tokens).toMatch(/--dock-inset:/)
    // The dock must spend the same tokens, or the reserve drifts away from the
    // thing it is reserving for.
    expect(chatCss).toMatch(/min-height:\s*var\(--dock-launcher-h\)/)
    expect(chatCss).toMatch(/bottom:\s*var\(--dock-inset\)/)
  })
})
