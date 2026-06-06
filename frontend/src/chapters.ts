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
  { id: 'wizard',     numeral: 'II',   theme: 'The Mind',              plain: 'about me',      at: 0.124 },
  { id: 'spells',     numeral: 'III',  theme: 'Spells',                plain: 'skills',        at: 0.189 },
  { id: 'conjuring',  numeral: 'IV',   theme: 'The Conjuring of Apps', plain: 'service · full-stack AI', at: 0.498 },
  { id: 'grimoire',   numeral: 'V',    theme: 'The Grimoire',          plain: 'projects',               at: 0.653 },
  { id: 'tracker',    numeral: 'VI',   theme: 'The Pulse',             plain: 'live AI demo',  at: 0.731 },
  { id: 'chronicles', numeral: 'VII',  theme: 'The Path',              plain: 'experience',    at: 0.917 },
  { id: 'owlpost',    numeral: 'VIII', theme: 'Owl Post',              plain: 'contact',       at: 0.981 },
]
