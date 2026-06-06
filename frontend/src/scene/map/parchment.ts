/**
 * Original Marauder's-Map-*style* parchment art for the map table, authored
 * inline as SVG strings (no network fetch — honors the scene's no-fetch
 * convention). Two layers: an aged-parchment base used as the material `map`,
 * and a transparent gold ink overlay that blooms under postprocessing.
 *
 * The look is inspired by the wizarding "living map" aesthetic — aged folded
 * parchment, inked castle towers in elevation, calligraphic banner — but the
 * artwork and wording are deliberately ORIGINAL. No Warner Bros. drawing is
 * copied and none of its text appears (no "Marauder", "Moony", "Messrs", etc.;
 * regression-tested). The central corridor is aligned to the footprints' walk
 * path (world x -2.6 → 2.6, weave ±1.1 → plane-local y ±1.1, i.e. SVG y 120 → 340
 * at 100px/unit) so the live teal footsteps track straight down it.
 */

/** viewBox matches the 7 × 4.6 table plane at 100px / world-unit. */
export const MAP_VIEWBOX = '0 0 700 460'

/** Banner motto — original wording, echoes the chapter heading "It sees who passes". */
export const MAP_MOTTO = 'IT KNOWS WHO PASSES'

const GOLD = '#f3d79a'

/** A single inked castle tower in elevation: tapered body, conical roof + spire,
 *  a pennant, and arrow-slit windows. Returns SVG path markup (stroke inherited). */
function tower(x: number, base: number, w: number, h: number, flag = true): string {
  const cx = x + w / 2
  const roof = h * 0.55
  const top = base - h
  return `
    <path d="M${x} ${base} V${top} M${x + w} ${base} V${top}"/>
    <path d="M${x - 3} ${top} L${cx} ${top - roof} L${x + w + 3} ${top} Z"/>
    <path d="M${cx} ${top - roof} v-9"/>
    ${flag ? `<path d="M${cx} ${top - roof - 9} q10 3 0 6"/>` : ''}
    <path d="M${cx} ${base - h * 0.62} v8" stroke-width="1.1"/>
    <path d="M${x + w * 0.5} ${base - h * 0.32} v6" stroke-width="0.9"/>`
}

/** Crenellated curtain wall between two x positions at height y. */
function wall(x1: number, x2: number, y: number): string {
  let s = `<path d="M${x1} ${y} H${x2}"/>`
  for (let x = x1 + 6; x < x2 - 6; x += 22) {
    s += `<path d="M${x} ${y} v-6 h7 v6" stroke-width="1.1"/>`
  }
  return s
}

/** Distant castle skyline drawn along the far (top) edge of the map. */
const SKYLINE = [
  wall(96, 604, 92),
  tower(110, 96, 26, 54),
  tower(168, 96, 20, 40, false),
  tower(300, 96, 34, 78),
  tower(360, 96, 22, 46, false),
  tower(470, 96, 26, 58),
  tower(540, 96, 20, 38, false),
].join('')

/** Aged parchment base: warm sepia gradient, grain, stains, trifold creases. */
export const PARCHMENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="460" viewBox="${MAP_VIEWBOX}">
  <defs>
    <radialGradient id="pg" cx="50%" cy="44%" r="78%">
      <stop offset="0%" stop-color="#7c6438"/>
      <stop offset="50%" stop-color="#574325"/>
      <stop offset="100%" stop-color="#291d10"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.07 0"/>
    </filter>
  </defs>
  <rect width="700" height="460" fill="url(#pg)"/>
  <rect width="700" height="460" filter="url(#grain)"/>
  <g fill="#140d05" opacity="0.30">
    <ellipse cx="118" cy="92" rx="74" ry="42"/>
    <ellipse cx="604" cy="378" rx="92" ry="56"/>
    <ellipse cx="556" cy="64" rx="44" ry="30"/>
    <ellipse cx="84" cy="372" rx="52" ry="34"/>
  </g>
  <!-- trifold + half creases: a darker valley with a lighter highlight beside it -->
  <g opacity="0.5">
    <rect x="231" y="0" width="4" height="460" fill="#160f06"/>
    <rect x="235" y="0" width="2" height="460" fill="#8a7148"/>
    <rect x="465" y="0" width="4" height="460" fill="#160f06"/>
    <rect x="469" y="0" width="2" height="460" fill="#8a7148"/>
    <rect x="0" y="229" width="700" height="4" fill="#160f06"/>
    <rect x="0" y="233" width="700" height="2" fill="#8a7148"/>
  </g>
  <rect x="13" y="13" width="674" height="434" fill="none" stroke="#100a04" stroke-width="22" opacity="0.5"/>
</svg>`

/** Gold ink line-art on transparent ground: ornate border, castle skyline + side
 *  turrets, calligraphic banner, the great corridor, chambers, staircase, compass
 *  rose, and a ghost footstep trail. Slight feDisplacement gives a hand-inked wobble. */
export const INK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="460" viewBox="${MAP_VIEWBOX}">
  <defs>
    <filter id="wob" x="-4%" y="-4%" width="108%" height="108%">
      <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="2" seed="7" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="2.6"/>
    </filter>
  </defs>
  <g filter="url(#wob)" fill="none" stroke="${GOLD}" stroke-width="1.6"
     stroke-linecap="round" stroke-linejoin="round"
     font-family="Georgia, 'Times New Roman', serif">

    <!-- double-rule border with corner flourishes -->
    <rect x="24" y="24" width="652" height="412" stroke-width="3.2"/>
    <rect x="32" y="32" width="636" height="396" stroke-width="1.3"/>
    <path d="M40 78 Q40 40 78 40 M54 78 Q54 54 78 54 M40 78 q-6 -4 0 -10"/>
    <path d="M660 78 Q660 40 622 40 M646 78 Q646 54 622 54 M660 78 q6 -4 0 -10"/>
    <path d="M40 382 Q40 420 78 420 M54 382 Q54 406 78 406"/>
    <path d="M660 382 Q660 420 622 420 M646 382 Q646 406 622 406"/>

    <!-- distant castle skyline along the far edge -->
    <g stroke-width="1.5" opacity="0.92">${SKYLINE}</g>

    <!-- flanking side turrets -->
    <g stroke-width="1.5" opacity="0.85">
      ${tower(48, 300, 22, 50)}
      ${tower(630, 300, 22, 50)}
    </g>

    <!-- calligraphic banner, top-centre, over the skyline -->
    <g transform="translate(350 56)">
      <path d="M-168 0 q-14 -2 -18 12 q12 -6 18 0 M168 0 q14 -2 18 12 q-12 -6 -18 0"/>
      <path d="M-168 0 h336 l-13 12 13 12 h-336 l13 -12 z"
            stroke-width="1.3" fill="#1b140a" fill-opacity="0.4"/>
      <text x="0" y="16" font-size="17" fill="${GOLD}" stroke="none"
            text-anchor="middle" letter-spacing="3.5" font-style="italic">&#183; ${MAP_MOTTO} &#183;</text>
      <path d="M-120 28 q120 14 240 0" stroke-width="0.9" opacity="0.8"/>
    </g>

    <!-- the great corridor (footsteps weave between these rails) -->
    <path d="M58 120 H642" stroke-width="3"/>
    <path d="M58 348 H642" stroke-width="3"/>
    <path d="M58 120 V144 M58 348 V324 M642 120 V144 M642 348 V324"/>

    <!-- bottom chambers with doorway gaps + placeholder marks (· · · → name reveal) -->
    <path d="M150 348 V408 H272 V348 M196 348 V360"/>
    <path d="M408 348 V412 H540 V348 M462 348 V360"/>
    <g stroke-width="2.4" opacity="0.7">
      <path d="M196 384 h0 M208 384 h0 M220 384 h0"/>
      <path d="M462 388 h0 M474 388 h0 M486 388 h0"/>
    </g>

    <!-- staircase motif, lower-left -->
    <path d="M70 388 h20 v9 h20 v9 h20 v9" stroke-width="1.3" opacity="0.85"/>

    <!-- ghost footstep trail down the corridor centreline -->
    <g fill="${GOLD}" stroke="none" opacity="0.42">
      <ellipse cx="110" cy="222" rx="3.6" ry="6"/>
      <ellipse cx="172" cy="240" rx="3.6" ry="6"/>
      <ellipse cx="236" cy="218" rx="3.6" ry="6"/>
      <ellipse cx="300" cy="244" rx="3.6" ry="6"/>
      <ellipse cx="364" cy="216" rx="3.6" ry="6"/>
      <ellipse cx="428" cy="246" rx="3.6" ry="6"/>
      <ellipse cx="492" cy="220" rx="3.6" ry="6"/>
      <ellipse cx="556" cy="242" rx="3.6" ry="6"/>
    </g>

    <!-- compass rose, lower-right -->
    <g transform="translate(596 392)" opacity="0.9">
      <circle r="30" stroke-width="1.2"/>
      <circle r="20" stroke-width="0.7"/>
      <path d="M0 -30 L6 0 L0 30 L-6 0 Z" stroke-width="1" fill="${GOLD}" fill-opacity="0.18"/>
      <path d="M-30 0 L0 -6 L30 0 L0 6 Z" stroke-width="1" fill="${GOLD}" fill-opacity="0.18"/>
      <path d="M0 -34 v-6 M0 34 v6 M-34 0 h-6 M34 0 h6" stroke-width="1"/>
      <text x="0" y="-40" font-size="11" fill="${GOLD}" stroke="none"
            text-anchor="middle" letter-spacing="1">N</text>
    </g>
  </g>
</svg>`
