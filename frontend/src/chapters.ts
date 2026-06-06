export interface Chapter {
  id: string // matches the section element id in the DOM
  numeral: string // roman numeral shown on the rail
  theme: string // themed display name
  plain: string // plain-language translation
  at: number // measured scroll fraction (0..1) — rail dot placement only
}

/**
 * Single source of truth for the page's chapters. `at` is an approximate measured
 * fraction kept in hand-sync with CameraRig KEYS, used ONLY for rail dot placement.
 * Settle/cue logic measures live DOM offsets and never relies on `at`.
 */
export const chapters: Chapter[] = [
  { id: 'top',        numeral: 'I',    theme: 'The Conjuring',         plain: 'intro',         at: 0.0 },
  { id: 'wizard',     numeral: 'II',   theme: 'The Mind',              plain: 'about me',      at: 0.092 },
  { id: 'spells',     numeral: 'III',  theme: 'Spells',                plain: 'skills',        at: 0.140 },
  { id: 'conjuring',  numeral: 'IV',   theme: 'The Conjuring of Apps', plain: 'service · full-stack AI', at: 0.370 },
  { id: 'grimoire',   numeral: 'V',    theme: 'The Grimoire',          plain: 'projects',               at: 0.486 },
  { id: 'pact',       numeral: 'VI',   theme: 'The Pact',              plain: 'AI matchmaking',         at: 0.546 },
  { id: 'tracker',    numeral: 'VII',  theme: 'The Pulse',             plain: 'live AI demo',           at: 0.661 },
  { id: 'map',        numeral: 'VIII', theme: "The Marauder's Map",    plain: 'edge AI · on-device',    at: 0.799 },
  { id: 'chronicles', numeral: 'IX',   theme: 'The Path',              plain: 'experience',             at: 0.937 },
  { id: 'owlpost',    numeral: 'X',    theme: 'Owl Post',              plain: 'contact',                at: 0.984 },
]
