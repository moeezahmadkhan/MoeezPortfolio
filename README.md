# Moeez Ahmad Khan — Portfolio

A single-page personal portfolio for **Moeez Ahmad Khan** — AI/ML Engineer (generative AI,
computer vision, full-stack). Clean, recruiter-readable design: a plain HTML hero and scrollable
sections — About, Work, Skills, Experience, and Contact — with no theme or gimmick standing
between the content and the reader.

## Tech stack

- **Vite + React 18 + TypeScript**
- Plain CSS with design tokens (`src/styles/tokens.css` + `base.css`) — no CSS framework
- **vitest** + **jsdom** + **@testing-library/react** for tests

## Getting started

All commands run from `frontend/`:

```bash
cd frontend
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm test` | Run the test suite (vitest) |
| `npm run preview` | Serve the production build locally |
| `npm run shoot` | Screenshot the running preview at desktop/mobile widths for visual review |

## How it works

The page is composed from `src/components/`: `layout/` (Nav, Section, Footer), `site/` (Hero,
About, Work, Skills, Experience, Contact), and `ui/` (Button, Tag, StatStrip, Reveal, Timeline).
There is no 3D canvas or scroll-driven camera in this build.

All portfolio content — profile, projects, skills, and experience — lives in typed modules under
`src/content/`. This is the single source of truth for every visible string on the site; edit
copy there, not in JSX.

A serverless contact API and chat backend live under `api/`.

## What's planned next

A WebGL hero (a small 3D scene, salvaged pipeline in `src/three/`) and a chatbot dock are
designed but not yet built into the page. See [`docs/redesign/PLAN.md`](./docs/redesign/PLAN.md)
and [`docs/redesign/ARCHITECTURE.md`](./docs/redesign/ARCHITECTURE.md) for what's coming and why.

For contributor guidance and conventions, see [`frontend/CLAUDE.md`](./frontend/CLAUDE.md).
