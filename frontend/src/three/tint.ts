/**
 * Backdrop colour per section. Gold and ink only — teal is reserved for the chat
 * surface, so "the machine is speaking" stays a distinct signal.
 */
const TINTS: Record<string, [number, number, number]> = {
  '': [0.55, 0.42, 0.22], // hero — warmest
  about: [0.42, 0.33, 0.19],
  work: [0.3, 0.25, 0.17],
  skills: [0.26, 0.22, 0.16],
  experience: [0.2, 0.17, 0.13],
  contact: [0.34, 0.27, 0.17],
}

export function sectionTint(id: string): [number, number, number] {
  return TINTS[id] ?? TINTS['']
}
