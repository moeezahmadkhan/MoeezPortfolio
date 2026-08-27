# 3D Character Asset Brief — Moeez Wizard Portfolio

Date: 2026-06-13

Brief for new/replacement characters to source (you generate the 3D models; I
wire them in). Keep the whole cast stylistically consistent — one "figurine
family" matching the existing hero wizard.

## Pipeline rules (make anything drop in cleanly)

- **Format:** export `.glb`, single character, full body.
- **Budget:** under ~25–30k tris; PBR textures (I re-bake to 2K + meshopt, like
  `tools/build_wizard.sh`). Target ~0.8–1 MB shipped.
- **The glow rule:** name any emissive material `Glow_*` (e.g. `Glow_eyes`,
  `Glow_wand`, `Glow_coin`). The scene's material pass skips `Glow_*` so Bloom
  makes them shine; everything else gets auto-tinted warm.
- **Facing:** glTF +X is fine; base rotation is applied in code.
- Static, rig-less mesh is OK — characters are animated in-scene (Float +
  rotation). The **pose** is what matters; pick one strong pose.

## Shared style prefix (prepend to every prompt)

> stylized collectible figurine, hand-painted PBR look, dark arcane wizarding
> theme, deep charcoal-navy robes with antique-gold trim, soft teal magical glow
> accents, candlelit mood, single character, full body, clean readable
> silhouette, neutral grey background, game-ready low-poly ~25k tris

---

## 1. The Founder — Pact chapter (left, faces right)

- **Where:** `src/scene/pact/ThePact.tsx`, `founder` group. Slides in from the
  left; a glowing cord binds it to the investor. Currently the wizard stand-in.
- **Reference:** young apprentice-mage entrepreneur — eager, leaning slightly
  forward, holding a **rolled glowing scroll (the "pitch deck")**, other hand
  open in offering. The one *presenting*.
- **Prompt:**
  > [shared style] a young wizard inventor in his twenties, short robe and
  > satchel, holding a glowing rolled parchment scroll in his right hand, left
  > hand extended forward in an offering gesture, hopeful confident pose, glowing
  > eyes. Emissive material named Glow_scroll on the parchment and Glow_eyes on
  > the eyes.

## 2. The Investor — Pact chapter (right, faces left)

- **Where:** `ThePact.tsx`, `investor` group. Slides in from the right.
  Currently the cricket player.
- **Reference:** older, wealthy patron-sorcerer — taller, heavier robes, a
  **floating gold coin or gem** over an upturned palm. The one *evaluating*.
- **Prompt:**
  > [shared style] an older distinguished wizard patron, long ornate robe with
  > fur-trimmed collar, one hand upturned with a floating glowing gold coin above
  > the palm, the other clasping a staff, shrewd evaluating pose, glowing eyes.
  > Emissive material named Glow_coin on the coin and Glow_eyes on the eyes.
- **Note:** keep Founder + Investor at matched height/scale — they stand as a
  pair. The cricket model stays in use for the Tracker chapter unless replaced.

## 3. The Spellcaster — Conjuring chapter ("One spell, end to end")

- **Where:** `src/scene/spell/SpellStation.tsx`. A `SpellBolt` effect already
  exists; this character is the one *casting* it.
- **Reference:** battle-mage mid-incantation — dynamic lunge, wand arm fully
  extended forward, robe swept by magical wind, free hand trailing runes. The
  most dynamic pose of the set.
- **Prompt:**
  > [shared style] a wizard mid-spellcast in a dynamic lunging stance, right arm
  > extended forward gripping a wooden wand with a bright glowing tip, robe
  > billowing from magical wind, swirling rune glyphs around the free hand,
  > intense focused expression. Emissive materials named Glow_wand on the wand
  > tip and Glow_runes on the floating glyphs.

## 4. The Scanned Subject — Marauder's Map ("It sees who passes") — DONE (2D SVG)

- **Decision:** a flat teal silhouette, not a 3D model. The scene is a
  computer-vision detection feed; a flat side-profile walker under the gold
  reticle reads like a YOLO bounding box on a camera frame. Cheaper too.
- **Asset:** `frontend/public/walker.svg` — hooded traveller, mid-stride,
  walking +X, solid `#7fd0c4`, transparent background. Rasterise via
  `useSvgTexture` and billboard onto the `Walker` patrol path; the existing
  detection reticle tightens onto it.

---

## Open question

- **Generator type:** prompts above are written for text-to-3D (Tripo / Meshy /
  Rodin). If using image-to-3D, rewrite as reference-image descriptions instead.
