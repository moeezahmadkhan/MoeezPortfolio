import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatDock } from './ChatDock'

vi.mock('./chatClient', () => ({ askMoeez: vi.fn(async () => ({ reply: 'stub' })) }))

/**
 * The panel opened with a 0.28s animation and then vanished on a single frame.
 * Measured in the browser: after the close button was clicked the element was
 * gone from the DOM on the very next frame, with zero frames at partial
 * opacity — the same shape as the mobile menu's snap, on the site's headline
 * feature.
 *
 * The cause was `{open && <panel/>}`: an element React has already unmounted
 * cannot animate. It now stays mounted and is hidden with `display`, which
 * `transition-behavior: allow-discrete` can hold open for the length of the
 * fade.
 */
const cssSource = readFileSync(join('src', 'components', 'chat', 'ChatDock.css'), 'utf8')
/** Comments carry prose about the rules, including the name of the keyframes
 *  this file no longer declares — lint the declarations, not the commentary. */
const css = cssSource.replace(/\/\*[\s\S]*?\*\//g, '')

describe('the chat panel leaves as deliberately as it arrives', () => {
  it('keeps the panel mounted while closed, so there is something left to animate', () => {
    const { container } = render(<ChatDock />)
    expect(container.querySelector('.chat__panel')).not.toBeNull()
  })

  it('still keeps a closed panel out of the accessibility tree', () => {
    // The contract the rest of ChatDock.test.tsx relies on: closed means
    // `queryByRole('dialog')` finds nothing. Staying in the DOM for the sake of
    // an animation must not put a hidden dialog back in front of a screen
    // reader, or in front of Tab.
    render(<ChatDock />)
    expect(screen.queryByRole('dialog')).toBeNull()
    const panel = document.querySelector('.chat__panel')
    expect(panel?.getAttribute('aria-hidden')).toBe('true')
    expect(panel?.hasAttribute('inert')).toBe(true)
  })

  it('transitions out rather than relying on a one-shot entrance animation', () => {
    expect(css).toMatch(/transition:[^;]*\bopacity\b/)
    expect(css).toMatch(/transition:[^;]*\btransform\b/)
    expect(css).toMatch(/transition-behavior:\s*allow-discrete/)
    expect(css).toMatch(/@starting-style/)
    // The entrance keyframes are gone: a `@keyframes` plays on mount and has
    // nothing to say about leaving, which is exactly how this was missed.
    expect(css).not.toMatch(/@keyframes\s+chat-in/)
  })
})
