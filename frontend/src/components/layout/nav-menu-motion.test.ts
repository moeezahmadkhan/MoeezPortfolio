import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The mobile menu is the one control every phone visitor uses, and it was the
 * only interactive surface on the site with no motion at all: it toggles
 * between `display: none` and `display: flex`, which no transition could reach,
 * so it snapped. Measured in the browser as
 * `getComputedStyle('.nav__links').transitionDuration === '0s'` while every
 * other surface reported a real duration on the shared curve.
 *
 * Asserted against the stylesheet because jsdom resolves no stylesheets and has
 * no layout: a computed-style check here would report `0s` no matter what the
 * CSS said. The browser is where this was found and where it was confirmed.
 */
const css = readFileSync(join('src', 'components', 'layout', 'Nav.css'), 'utf8')

describe('the mobile menu opens and closes rather than snapping', () => {
  it('transitions the properties that can be animated, and display itself', () => {
    expect(css).toMatch(/transition:[^;]*\bopacity\b/)
    expect(css).toMatch(/transition:[^;]*\btranslate\b/)
    expect(css).toMatch(/transition:[^;]*\bdisplay\b/)
  })

  it('lets the discrete display flip wait for the transition', () => {
    // Without this the panel vanishes on the first frame of the exit and the
    // fade plays to an empty box — the failure mode the guidance calls out.
    expect(css).toMatch(/transition-behavior:\s*allow-discrete/)
  })

  it('declares an entry state, or opening would still be instant', () => {
    // A browser skips transitions on the style change that reveals an element
    // unless it is told what to start from.
    expect(css).toMatch(/@starting-style/)
  })

  it('keeps the entry animation off the layout properties', () => {
    // Same rule the rest of the site follows: transform and opacity only, so
    // opening the menu never re-flows the document behind it.
    // Just the at-rule's own block. Slicing to end-of-file swept in every rule
    // that happens to follow it, which is how the first version of this test
    // failed on a `padding-block` two rules further down.
    const start = css.indexOf('@starting-style')
    const open = css.indexOf('{', start)
    let depth = 0
    let end = open
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}' && --depth === 0) {
        end = i
        break
      }
    }
    const startingStyle = css.slice(start, end + 1)
    expect(startingStyle).toContain('.nav__links.is-open')
    expect(startingStyle).not.toMatch(/\b(height|width|margin|padding|top|left)\s*:/)
  })
})
