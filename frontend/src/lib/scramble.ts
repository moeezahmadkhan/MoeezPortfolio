/**
 * The hover decode: a label dissolves into terminal glyphs and resolves back
 * into itself, left to right. Adapted from the Devsteem site's hover scramble,
 * which drove it with GSAP's ScrambleTextPlugin — this is the same effect in
 * about thirty lines, because the site's whole animation budget is smaller than
 * that library.
 *
 * The pure part lives here, apart from the frame loop and the DOM, so the shape
 * of the decode can be asserted without a clock: given a label and a progress,
 * what does the visitor see?
 */

/**
 * Code and terminal punctuation, deliberately not binary 0/1 or letters. A
 * label decoding through `{}` and `=>` reads as something being compiled; one
 * decoding through random letters just reads as a typo.
 */
export const GLYPHS = '{}[]()<>/;:=+-*&|!?$#%_'

/** How long one decode runs, in milliseconds. */
export const SCRAMBLE_MS = 500

/**
 * The share of the run that is pure noise before the first character settles.
 * Without a hold the label is already half readable on the first frame and the
 * effect reads as a glitch rather than as a decode.
 */
const HOLD = 0.35

/** How many of `text`'s characters have settled at progress `t` (0 to 1). */
export function revealedCount(text: string, t: number): number {
  if (t <= HOLD) return 0
  if (t >= 1) return text.length
  const progress = (t - HOLD) / (1 - HOLD)
  return Math.min(text.length, Math.ceil(progress * text.length))
}

/**
 * One frame of the decode: the first `revealed` characters are the label's own,
 * every later one is a glyph.
 *
 * Whitespace never scrambles. A word boundary that moves reads as a different
 * phrase rather than as this phrase decoding, and the gaps are what let a
 * visitor still recognise the label mid-flight.
 *
 * `rand` is injected so a test can pin the glyph choice; callers pass nothing.
 */
export function scrambleFrame(
  text: string,
  revealed: number,
  rand: () => number = Math.random,
): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (i < revealed || char === ' ') out += char
    else out += GLYPHS[Math.floor(rand() * GLYPHS.length)]
  }
  return out
}
