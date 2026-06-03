# Moeez's Wizard Portfolio

A single-page personal portfolio for **Moeez Ahmad Khan** — AI/ML Engineer (generative AI, computer vision, full-stack). Themed as a Harry Potter–style "Wizard's Archive": a candlelit 3D hero with a floating wizard figurine, followed by scroll-driven chapters — About, Spells (skills), the Grimoire (projects), Chronicles (experience), and an Owl-post contact.

## Tech stack

- **Vite + React 18 + TypeScript**
- **react-three-fiber** + **drei** + **postprocessing** for the WebGL scene (Bloom, vignette, SMAA)
- **three.js** for the 3D figurine and procedural rune circle
- **framer-motion** for scroll-reveal animations

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with HMR (exposed on the LAN) |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |

## How it works

A single fixed WebGL canvas renders behind scrollable HTML. Rather than re-mounting the scene per section, the **camera glides through a static 3D scene** as you scroll while the HTML chapters scroll past on top. Scroll and pointer state is shared with the render loop through a lightweight module singleton so scrolling never re-renders the canvas.

Portfolio content (projects, skills, experience) lives in `src/data.ts`. The 3D scene is in `src/scene/`; the HTML chapters and UI are in `src/components/`.

For architecture details and contributor guidance, see [CLAUDE.md](./CLAUDE.md).
