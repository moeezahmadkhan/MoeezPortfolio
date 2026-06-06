/**
 * Original Marauder's-Map-*style* parchment art for the map table, authored
 * inline as SVG strings (no network fetch — honors the scene's no-fetch
 * convention). Two layers: an aged-parchment base used as the material `map`,
 * and a transparent gold ink overlay that blooms under postprocessing.
 *
 * Deliberately original: the layout, flourishes, and banner wording evoke the
 * wizarding "living map" without copying any Warner Bros. artwork or text
 * (no "Messrs Moony…", no "Marauder"). The corridor band is aligned to the
 * footprints' walk path (world x -2.6 → 2.6, weave ±1.1 → plane-local y ±1.1,
 * i.e. SVG y 120 → 340 at 100px/unit) so the live teal footsteps track down it.
 */

/** viewBox matches the 7 × 4.6 table plane at 100px / world-unit. */
export const MAP_VIEWBOX = '0 0 700 460'

/** Banner motto — original wording, echoes the chapter heading "It sees who passes". */
export const MAP_MOTTO = 'IT KNOWS WHO PASSES'

/** Aged parchment base: warm radial gradient, grain, stains, burnt inner border. */
export const PARCHMENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="460" viewBox="${MAP_VIEWBOX}">
  <defs>
    <radialGradient id="pg" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#6a5530"/>
      <stop offset="52%" stop-color="#4a3a1f"/>
      <stop offset="100%" stop-color="#241a0d"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"/>
    </filter>
  </defs>
  <rect width="700" height="460" fill="url(#pg)"/>
  <rect width="700" height="460" filter="url(#grain)"/>
  <g fill="#140d05" opacity="0.32">
    <ellipse cx="118" cy="92" rx="74" ry="42"/>
    <ellipse cx="604" cy="378" rx="92" ry="56"/>
    <ellipse cx="556" cy="64" rx="44" ry="30"/>
    <ellipse cx="84" cy="372" rx="52" ry="34"/>
  </g>
  <rect x="13" y="13" width="674" height="434" fill="none" stroke="#100a04" stroke-width="22" opacity="0.55"/>
</svg>`

/** Gold ink line-art on transparent ground: border + flourishes, the great
 *  corridor, branching chambers, a staircase, compass rose, ghost footsteps,
 *  and the motto banner. Slight feDisplacement gives a hand-inked wobble. */
export const INK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="460" viewBox="${MAP_VIEWBOX}">
  <defs>
    <filter id="wob" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="4"/>
    </filter>
  </defs>
  <g filter="url(#wob)" fill="none" stroke="#f3d79a" stroke-width="2.4"
     stroke-linecap="round" stroke-linejoin="round"
     font-family="Georgia, 'Times New Roman', serif">
    <!-- double-rule border -->
    <rect x="24" y="24" width="652" height="412" stroke-width="3.2"/>
    <rect x="32" y="32" width="636" height="396" stroke-width="1.4"/>
    <!-- corner flourishes -->
    <path d="M40 70 Q40 40 70 40 M52 70 Q52 52 70 52"/>
    <path d="M660 70 Q660 40 630 40 M648 70 Q648 52 630 52"/>
    <path d="M40 390 Q40 420 70 420 M52 390 Q52 408 70 408"/>
    <path d="M660 390 Q660 420 630 420 M648 390 Q648 408 630 408"/>

    <!-- the great corridor (footsteps weave between these rails) -->
    <path d="M58 104 H642" stroke-width="3.4"/>
    <path d="M58 356 H642" stroke-width="3.4"/>
    <!-- corridor end-jambs (open ends, continues off-map) -->
    <path d="M58 104 V128 M58 356 V332"/>
    <path d="M642 104 V128 M642 356 V332"/>

    <!-- top chambers with doorway gaps -->
    <path d="M120 104 V58 H214 V104 M150 104 V92"/>
    <path d="M300 104 V52 H400 V104 M340 104 V92"/>
    <path d="M486 104 V58 H580 V104 M516 104 V92"/>
    <!-- bottom chambers -->
    <path d="M150 356 V410 H272 V356 M196 356 V368"/>
    <path d="M408 356 V414 H540 V356 M462 356 V368"/>

    <!-- chamber placeholders (echo the · · · → name reveal; no real names) -->
    <g stroke-width="2.4" opacity="0.7">
      <path d="M158 80 h0 M170 80 h0 M182 80 h0"/>
      <path d="M338 78 h0 M350 78 h0 M362 78 h0"/>
      <path d="M524 80 h0 M536 80 h0 M548 80 h0"/>
    </g>

    <!-- staircase motif, lower-left chamber -->
    <path d="M170 392 h22 v10 h22 v10 h22 v10" stroke-width="1.3" opacity="0.85"/>

    <!-- ghost footstep trail down the corridor centreline -->
    <g fill="#f3d79a" stroke="none" opacity="0.42">
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
      <path d="M0 -30 L6 0 L0 30 L-6 0 Z" stroke-width="1" fill="#e7c27d" fill-opacity="0.18"/>
      <path d="M-30 0 L0 -6 L30 0 L0 6 Z" stroke-width="1" fill="#e7c27d" fill-opacity="0.18"/>
      <path d="M0 -34 v-6 M0 34 v6 M-34 0 h-6 M34 0 h6" stroke-width="1"/>
      <text x="0" y="-40" font-size="11" fill="#e7c27d" stroke="none"
            text-anchor="middle" letter-spacing="1">N</text>
    </g>

    <!-- motto banner, top-centre -->
    <g transform="translate(350 44)">
      <path d="M-150 0 h300 l-12 11 12 11 h-300 l12 -11 z"
            stroke-width="1.2" fill="#1b140a" fill-opacity="0.35"/>
      <text x="0" y="15" font-size="15" fill="#e7c27d" stroke="none"
            text-anchor="middle" letter-spacing="3"
            font-style="italic">&#183; ${MAP_MOTTO} &#183;</text>
    </g>
  </g>
</svg>`
