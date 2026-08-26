export interface Chapter {
  id: string // matches the section element id in the DOM
  numeral: string // roman numeral shown on the rail
  theme: string // themed display name
  plain: string // plain-language translation
  at: number // measured scroll fraction (0..1) — rail dot placement only
}

/**
 * Single source of truth for the page's chapters. `at` is a measured fraction
 * (scripts/measure.mjs) kept in sync with CameraRig KEYS and scene/spans.ts —
 * spans.test.ts fails if they drift apart, used ONLY for rail dot placement.
 * Settle/cue logic measures live DOM offsets and never relies on `at`.
 */
export const chapters: Chapter[] = [
  { id: 'top',        numeral: 'I',    theme: 'The Conjuring',      plain: 'intro',                at: 0.0   },
  { id: 'wizard',     numeral: 'II',   theme: 'The Mind',           plain: 'about me',             at: 0.118 },
  { id: 'spells',     numeral: 'III',  theme: 'Spells',             plain: 'skills',               at: 0.170 },
  { id: 'pact',       numeral: 'IV',   theme: 'The Pact',           plain: 'AI matchmaking',       at: 0.359 },
  { id: 'tracker',    numeral: 'V',    theme: 'The Pulse',          plain: 'live AI demo',         at: 0.507 },
  { id: 'map',        numeral: 'VI',   theme: "The Marauder's Map", plain: 'edge AI · on-device',  at: 0.684 },
  { id: 'chronicles', numeral: 'VII',  theme: 'The Path',           plain: 'experience',           at: 0.861 },
  { id: 'grimoire',   numeral: 'VIII', theme: 'The Grimoire',       plain: 'projects',             at: 0.923 },
  { id: 'owlpost',    numeral: 'IX',   theme: 'Owl Post',           plain: 'contact',              at: 0.974 },
]

/**
 * Roman numeral for a chapter id. Section eyebrows used to hardcode their own numeral,
 * so removing a chapter left every later one displaying the wrong number while the
 * rail beside it showed the right one. Derive instead.
 */
export function numeralFor(id: string): string {
  const c = chapters.find((ch) => ch.id === id)
  if (!c) throw new Error(`unknown chapter id: ${id}`)
  return c.numeral
}
