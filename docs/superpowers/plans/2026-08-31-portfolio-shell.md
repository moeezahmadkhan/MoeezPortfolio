# Portfolio v2 — Shell Implementation Plan (1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wizard-world site with a clean, recruiter-readable portfolio that is complete and shippable with zero WebGL and zero chatbot.

**Architecture:** Delete the v1 station/camera-rig machinery; keep the asset pipeline and the chat proxy untouched on disk for later plans. All content moves into typed modules under `src/content/`, consumed by plain semantic sections. Active-section tracking uses `IntersectionObserver`, so no numeric scroll fractions couple content to anything.

**Tech Stack:** Vite 5, React 18, TypeScript (strict), vitest + jsdom + @testing-library/react, plain CSS with custom-property tokens. No CSS framework, no router, no state library.

**Spec:** `docs/superpowers/specs/2026-08-31-portfolio-redesign-design.md`
**Architecture doc:** `docs/redesign/ARCHITECTURE.md`
**Phase plan:** `docs/redesign/PLAN.md` (this plan covers Phases 0–2)

## Global Constraints

- All work happens in `frontend/`. Run every command from `frontend/`.
- Branch: `redesign/v2`. Tag `v1-wizard-world` must exist before any deletion.
- Palette, exact values: ink `#07070d`, surface `#0e0e17`, gold `#e7c27d` (the ONLY accent), rune-teal `#5fd3c6` (reserved for chat/AI surfaces — do not use it in Plan 1), text `#ece9e4`, muted `#9a978f`.
- Type: three faces maximum — one modern sans (body/UI), one display face (headings), JetBrains Mono (metrics/tags).
- Spacing: 8px scale only. Motion: one easing curve site-wide, `cubic-bezier(0.16, 1, 0.3, 1)`.
- Copy: plain section names — Work, About, Experience, Contact. Wizard vocabulary is banned from `src/` outside of deliberate micro-copy; Task 2 adds a test that enforces this.
- **Never invent a fact.** No fabricated metrics, employers, dates, or client names. A project ships with `metric` omitted rather than with a guessed number.
- Every phase ends green: `npm run build` and `npm test` both pass.
- `prefers-reduced-motion` is honoured by every animation added.

---

### Task 1: Branch, tag, and a DOM-capable test harness

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts:41-50`
- Create: `frontend/src/test/setup.ts`
- Test: `frontend/src/test/harness.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` that can render React components and assert on the DOM. Every later task depends on this.

- [ ] **Step 1: Tag the old world and branch**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git tag v1-wizard-world
git push origin v1-wizard-world
git checkout -b redesign/v2
```

If the push fails (no network / EMU auth), continue — the local tag is what protects the old tree.

- [ ] **Step 2: Install the test dependencies**

```bash
cd frontend
npm install -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Write the setup file**

Create `frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// jsdom implements neither of these, and both are used by the site.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

if (!window.IntersectionObserver) {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds: number[] = []
  }
  window.IntersectionObserver = NoopObserver as unknown as typeof window.IntersectionObserver
}
```

- [ ] **Step 4: Write the failing harness test**

Create `frontend/src/test/harness.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('test harness', () => {
  it('renders React into a DOM and matches on accessible roles', () => {
    render(<h1>Moeez Ahmad Khan</h1>)
    expect(screen.getByRole('heading', { name: 'Moeez Ahmad Khan' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run it and watch it fail**

Run: `npm test -- src/test/harness.test.tsx`
Expected: FAIL — `document is not defined` (vitest is still on the node environment).

- [ ] **Step 6: Configure vitest**

In `frontend/vite.config.ts`, extend the returned config object (it currently ends with the `server` key):

```ts
    server: { host: true, cors: true },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    },
```

Vite's `defineConfig` does not type the `test` key unless the config file references vitest's types. Add this as the first line of `vite.config.ts`:

```ts
/// <reference types="vitest/config" />
```

- [ ] **Step 7: Run it and watch it pass**

Run: `npm test -- src/test/harness.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 8: Confirm the whole suite and build still pass**

Run: `npm test && npm run build`
Expected: both succeed. The pre-existing v1 tests still pass at this point — they are deleted in Task 2.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/test/
git commit -m "test: give the suite a DOM so components can be tested"
```

---

### Task 2: Demolition

**Files:**
- Delete: `frontend/src/scene/` (entire directory except the two salvaged files moved in Step 2)
- Delete: `frontend/src/components/` (entire directory except `owlPost.ts` + `owlPost.test.ts`, moved in Step 2)
- Delete: `frontend/src/data.ts`, `chapters.ts`, `chapters.test.ts`, `scroll.ts`, `scrollMath.ts`, `scrollMath.test.ts`, `smoothScroll.ts`, `useScrollSettle.ts`, `App.css`
- Move: `src/scene/ktx2.ts` → `src/three/ktx2.ts`; `src/scene/characterMaterial.ts` → `src/three/characterMaterial.ts`; `src/components/owlPost.ts` → `src/lib/contactForm.ts`; `src/components/owlPost.test.ts` → `src/lib/contactForm.test.ts`
- Modify: `frontend/src/App.tsx` (reduced to a stub)
- Test: `frontend/src/test/copy-voice.test.ts`

**Interfaces:**
- Consumes: Task 1's test harness.
- Produces: an empty, building app shell. `src/lib/contactForm.ts` exports `validate(fields: OwlFields): FieldErrors` and `buildSubmission(fields: OwlFields, accessKey: string): Web3FormsPayload` — Task 13 consumes both. `src/three/ktx2.ts` exports `useKtx2Gltf` — Plan 2 consumes it.

- [ ] **Step 1: Write the failing copy-voice test**

This test is the enforcement mechanism for the spec's "plain copy" decision. Create `frontend/src/test/copy-voice.test.ts`:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const BANNED = [
  'grimoire',
  'owl post',
  'owlpost',
  'spellbook',
  'incantation',
  'chronicles',
  'familiar',
  'muggle',
  'hogwarts',
]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.(ts|tsx|css)$/.test(entry) ? [full] : []
  })
}

describe('copy voice', () => {
  it('has no wizard-metaphor vocabulary left in src/', () => {
    const offenders = walk('src')
      .filter((f) => !f.includes('copy-voice.test'))
      .flatMap((file) => {
        const text = readFileSync(file, 'utf8').toLowerCase()
        return BANNED.filter((word) => text.includes(word)).map((word) => `${file}: ${word}`)
      })
    expect(offenders).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/test/copy-voice.test.ts`
Expected: FAIL, listing dozens of offenders across `src/components/` and `src/data.ts`.

- [ ] **Step 3: Move the salvaged files**

```bash
cd frontend
mkdir -p src/three src/lib
git mv src/scene/ktx2.ts src/three/ktx2.ts
git mv src/scene/characterMaterial.ts src/three/characterMaterial.ts
git mv src/components/owlPost.ts src/lib/contactForm.ts
git mv src/components/owlPost.test.ts src/lib/contactForm.test.ts
```

Fix the import path at the top of `src/lib/contactForm.test.ts` (`./owlPost` → `./contactForm`). Rename the type `OwlFields` to `ContactFields` and `Web3FormsPayload`'s `from_name` value from `'Wizard Portfolio'` to `'Portfolio contact'`, and the `subject` template from `` `New owl from ${name} — portfolio contact` `` to `` `Portfolio message from ${name}` ``. Update the test's expectations to match. Nothing else in that file changes — the validation logic is good and already tested.

- [ ] **Step 4: Delete the v1 tree**

```bash
cd frontend
git rm -r --quiet src/scene src/components
git rm --quiet src/data.ts src/chapters.ts src/chapters.test.ts src/scroll.ts \
  src/scrollMath.ts src/scrollMath.test.ts src/smoothScroll.ts src/useScrollSettle.ts src/App.css
```

`src/scene/` and `src/components/` are now gone apart from the four files moved out in Step 3.

- [ ] **Step 5: Reduce App.tsx to a stub**

Replace the whole of `frontend/src/App.tsx` with:

```tsx
export default function App() {
  return (
    <main>
      <h1>Moeez Ahmad Khan</h1>
    </main>
  )
}
```

Remove the `import './App.css'` line from `src/main.tsx` if it is there, and make sure `main.tsx` imports only `./styles/global.css` for now (Task 5 replaces that import).

- [ ] **Step 6: Run the copy-voice test and watch it pass**

Run: `npm test -- src/test/copy-voice.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: PASS. If `tsc -b` complains about `vite.config.ts` importing `./api/_core/familiar`, leave the API untouched — that file still exists and is renamed in Plan 3.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: tear out the wizard world, keep the asset pipeline

The station/camera-rig machinery coupled every content edit to three
separate numeric tables. v2 has one 3D place, so none of it survives.
Salvaged: the KTX2 loader, the character materials, and the contact-form
validation, all of which are independent of the old layout."
```

---

### Task 3: Environment capability helpers

**Files:**
- Create: `frontend/src/lib/media.ts`
- Test: `frontend/src/lib/media.test.ts`

**Interfaces:**
- Consumes: Task 1 harness.
- Produces: `prefersReducedMotion(): boolean`, `isCoarsePointer(): boolean`, `hasWebGL(): boolean`. Task 6 uses `prefersReducedMotion`; Plan 2's `Stage.tsx` uses `prefersReducedMotion` and `hasWebGL`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/media.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { hasWebGL, isCoarsePointer, prefersReducedMotion } from './media'

function stubMatchMedia(matching: string[]) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('media', () => {
  it('reports reduced motion when the query matches', () => {
    stubMatchMedia(['(prefers-reduced-motion: reduce)'])
    expect(prefersReducedMotion()).toBe(true)
  })

  it('reports no reduced motion otherwise', () => {
    stubMatchMedia([])
    expect(prefersReducedMotion()).toBe(false)
  })

  it('detects a coarse pointer', () => {
    stubMatchMedia(['(pointer: coarse)'])
    expect(isCoarsePointer()).toBe(true)
  })

  it('reports no WebGL when getContext yields nothing', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(hasWebGL()).toBe(false)
  })

  it('reports WebGL when a context is returned', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext)
    expect(hasWebGL()).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/lib/media.test.ts`
Expected: FAIL — `Failed to resolve import "./media"`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/media.ts`:

```ts
// Capability probes. Each one is called at render time rather than cached at module
// load, because a visitor can flip the OS reduced-motion switch while the tab is open.

function matches(query: string): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(query).matches
}

export function prefersReducedMotion(): boolean {
  return matches('(prefers-reduced-motion: reduce)')
}

export function isCoarsePointer(): boolean {
  return matches('(pointer: coarse)')
}

let webglCache: boolean | undefined

export function hasWebGL(): boolean {
  // This one IS cached: creating a probe context is expensive and the answer cannot
  // change within a page lifetime.
  if (webglCache !== undefined) return webglCache
  try {
    const canvas = document.createElement('canvas')
    webglCache = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    webglCache = false
  }
  return webglCache
}

/** Test-only: clears the WebGL probe cache. */
export function resetWebGLCache(): void {
  webglCache = undefined
}
```

Add `resetWebGLCache()` calls to the two WebGL tests (before each assertion) so the cache does not leak between them.

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- src/lib/media.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/media.ts src/lib/media.test.ts
git commit -m "feat: probe reduced-motion, pointer, and WebGL support"
```

---

### Task 4: The content model

**Files:**
- Create: `frontend/src/content/profile.ts`, `projects.ts`, `skills.ts`, `experience.ts`, `index.ts`
- Test: `frontend/src/content/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the types and data every site component reads.
  - `Profile = { name; role; thesis; bio: string[]; location; email; cvUrl; portrait; stats: Stat[]; socials: Social[] }`
  - `Stat = { value: string; label: string }`, `Social = { label: string; href: string }`
  - `Project = { slug; name; outcome; metric?; detail: string[]; stack: string[]; shot?; links?: { repo?; demo?; writeup? }; featured: boolean }`
  - `SkillGroup = { title: string; items: string[] }`
  - `Role = { period: string; title: string; org: string; bullets: string[] }`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/content/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { experience, profile, projects, skills } from './index'

const PLACEHOLDER = /\b(tbd|todo|lorem|xxx|placeholder|coming soon)\b/i

describe('content', () => {
  it('has a complete profile', () => {
    expect(profile.name).toBe('Moeez Ahmad Khan')
    expect(profile.thesis.length).toBeGreaterThan(20)
    expect(profile.email).toMatch(/@/)
    expect(profile.stats.length).toBeGreaterThanOrEqual(3)
    expect(profile.socials.every((s) => s.href.startsWith('https://'))).toBe(true)
  })

  it('has at least three featured projects, each fully described', () => {
    const featured = projects.filter((p) => p.featured)
    expect(featured.length).toBeGreaterThanOrEqual(3)
    for (const p of featured) {
      expect(p.name).not.toBe('')
      expect(p.outcome.length).toBeGreaterThan(20)
      expect(p.detail.length).toBeGreaterThanOrEqual(2)
      expect(p.stack.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('uses unique slugs', () => {
    const slugs = projects.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('links absolutely or not at all', () => {
    for (const p of projects) {
      for (const href of Object.values(p.links ?? {})) {
        expect(href).toMatch(/^https:\/\//)
      }
    }
  })

  it('contains no placeholder copy anywhere', () => {
    const blob = JSON.stringify({ profile, projects, skills, experience })
    expect(blob).not.toMatch(PLACEHOLDER)
  })

  it('describes every role with real bullets', () => {
    expect(experience.length).toBeGreaterThanOrEqual(3)
    for (const role of experience) {
      expect(role.bullets.length).toBeGreaterThanOrEqual(2)
      expect(role.org).not.toBe('')
    }
  })

  it('groups skills without empty groups', () => {
    expect(skills.length).toBeGreaterThanOrEqual(3)
    expect(skills.every((g) => g.items.length > 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/content/content.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Write `profile.ts`**

Every fact below is carried over from the v1 `data.ts`, `Sections.tsx`, and `Hero.tsx`. Do not add facts that are not here.

```ts
export type Stat = { value: string; label: string }
export type Social = { label: string; href: string }

export type Profile = {
  name: string
  role: string
  thesis: string
  bio: string[]
  location: string
  email: string
  cvUrl: string
  portrait: string
  stats: Stat[]
  socials: Social[]
}

export const profile: Profile = {
  name: 'Moeez Ahmad Khan',
  role: 'AI/ML Engineer',
  thesis:
    'I build computer-vision and LLM systems, and the infrastructure that keeps them running in production.',
  bio: [
    'I work across the whole span of an AI product: the model, the serving layer, and the interface people actually touch. Most of my work lives in computer vision and LLM systems — face recognition pipelines, document understanding, and low-latency chat over live biometric data.',
    'I studied at Information Technology University, Lahore (BSCS), and I now assist on its MS Agentic AI course while shipping production systems for two teams.',
  ],
  location: 'Lahore, Pakistan · open to remote',
  email: 'kmoeez2018@gmail.com',
  cvUrl: '/Moeez_Ahmad_Khan_CV.pdf',
  portrait: '/moeez.jpeg',
  stats: [
    { value: 'CV + LLM', label: 'Core focus' },
    { value: '3', label: 'Teams shipped for' },
    { value: 'Lahore, PK', label: 'Based in' },
  ],
  socials: [
    { label: 'GitHub', href: 'https://github.com/moeezahmadkhan' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/' },
  ],
}
```

**Open item for Moeez:** the `stats` above are honest but weak. Replace them with three real numbers when you have them (e.g. models deployed, latency achieved, dataset size). Do not invent them to fill the row.

- [ ] **Step 4: Write `projects.ts`**

```ts
export type Project = {
  slug: string
  name: string
  outcome: string
  metric?: string
  detail: string[]
  stack: string[]
  shot?: string
  links?: { repo?: string; demo?: string; writeup?: string }
  featured: boolean
}

export const projects: Project[] = [
  {
    slug: 'horus',
    name: 'Project Horus',
    outcome:
      'A face identification pipeline that detects, embeds, and matches people in live video against a searchable index.',
    detail: [
      'YOLO and SCRFD for detection, ArcFace embeddings for identity, FAISS for nearest-neighbour search across the enrolled set.',
      'Hardened against the conditions that actually break these systems in the field: uneven lighting, motion blur, and high-throughput streams.',
    ],
    stack: ['Python', 'YOLO', 'SCRFD', 'ArcFace', 'FAISS', 'OpenCV'],
    featured: true,
  },
  {
    slug: 'silmaril',
    name: 'Silmaril AI',
    outcome:
      'Pitch-deck analysis that pulls financial metrics and founder signals out of investor decks and matches them against investor criteria.',
    detail: [
      'Ingests and parses decks, runs LLM extraction over the contents, and embeds the result so founders and investors can be matched.',
      'Shipped as a FastAPI service behind a React front end with a Kanban view of the deal pipeline.',
    ],
    stack: ['FastAPI', 'React', 'LLM extraction', 'Embeddings', 'PostgreSQL'],
    featured: true,
  },
  {
    slug: 'whoop-chat',
    name: 'Wearable AI chat',
    outcome:
      'Low-latency conversational AI over live Whoop biometric streams, turning raw signals into health and performance insight.',
    detail: [
      'Parses a live biometric stream into a real-time store the model can query without a round trip to cold storage.',
      'Prompt and context strategy tuned to the hardware budget — the constraint is latency and context size, not model quality.',
    ],
    stack: ['Python', 'LLM serving', 'Streaming data', 'Prompt engineering'],
    featured: true,
  },
  {
    slug: 'query-sphere',
    name: 'Query Sphere',
    outcome:
      'A cross-platform community app with real-time messaging, built on Flutter and Firebase.',
    detail: [
      'Realtime sync across devices with Firebase as the backing store.',
      'Full client build for both mobile platforms from one codebase.',
    ],
    stack: ['Flutter', 'Firebase', 'Realtime'],
    links: { repo: 'https://github.com/moeezahmadkhan/querysphere' },
    featured: false,
  },
  {
    slug: 'stay-booking',
    name: 'Stay-booking platform',
    outcome:
      'A full MERN booking application with property management and JWT-secured authentication.',
    detail: [
      'Property listing, search, and booking flows backed by MongoDB.',
      'Token-based auth with protected routes across an Express API.',
    ],
    stack: ['MongoDB', 'Express', 'React', 'Node', 'JWT'],
    featured: false,
  },
]
```

**Open item for Moeez:** each featured project wants a real `metric` (`metric: 'x% accuracy on y'`, `'p95 under Nms'`, `'N decks/day'`) and a screenshot at `public/shots/<slug>.webp`. Both are optional in the type precisely so the site can ship without them rather than with invented ones.

- [ ] **Step 5: Write `skills.ts` and `experience.ts`**

```ts
// skills.ts
export type SkillGroup = { title: string; items: string[] }

export const skills: SkillGroup[] = [
  {
    title: 'MLOps & orchestration',
    items: ['Docker', 'Kafka', 'QLoRA fine-tuning', 'n8n automation', 'CI/CD'],
  },
  {
    title: 'Model deployment & serving',
    items: ['FastAPI', 'Nginx', 'LLM serving & quantization', 'Edge deployment', 'REST APIs'],
  },
  {
    title: 'Cloud & infrastructure',
    items: ['AWS (EC2 · Bedrock)', 'GCP', 'Linux', 'FAISS', 'PostgreSQL'],
  },
  { title: 'Languages', items: ['Python', 'C++', 'SQL', 'Bash', 'TypeScript'] },
]
```

```ts
// experience.ts
export type Role = { period: string; title: string; org: string; bullets: string[] }

export const experience: Role[] = [
  {
    period: 'Jan 2026 — present',
    title: 'AI Developer',
    org: 'Ecommerce Steem',
    bullets: [
      'Building low-latency AI chat over Whoop wearable data.',
      'Turning live biometric streams into real-time health and performance insight.',
      'Tuning LLM prompt and context strategy against a hard hardware budget.',
    ],
  },
  {
    period: '2025 — present',
    title: 'AI & Computer Vision Developer',
    org: 'QUIDSol',
    bullets: [
      'Built Project Horus: YOLO/SCRFD detection with ArcFace identification over FAISS.',
      'Built Silmaril AI: financial-metric extraction and founder insight from pitch decks.',
      'Hardened both pipelines for varied lighting and high-throughput processing.',
    ],
  },
  {
    period: '2024 — 2025',
    title: "Teacher's Assistant",
    org: 'Information Technology University',
    bullets: [
      'Mentoring MS students in Agentic AI — multi-agent systems and RAG.',
      'Running workshops on agent orchestration and scalable workflows.',
      'Reviewing student projects up to production engineering standards.',
    ],
  },
]
```

- [ ] **Step 6: Write the barrel**

```ts
// index.ts
export { profile } from './profile'
export type { Profile, Social, Stat } from './profile'
export { projects } from './projects'
export type { Project } from './projects'
export { skills } from './skills'
export type { SkillGroup } from './skills'
export { experience } from './experience'
export type { Role } from './experience'
```

- [ ] **Step 7: Run the tests and watch them pass**

Run: `npm test -- src/content/content.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 8: Commit**

```bash
git add src/content/
git commit -m "feat: put every portfolio fact in one typed place"
```

---

### Task 5: Design tokens and base styles

**Files:**
- Create: `frontend/src/styles/tokens.css`, `frontend/src/styles/base.css`
- Delete: `frontend/src/styles/global.css`
- Modify: `frontend/src/main.tsx`, `frontend/index.html`
- Test: `frontend/src/styles/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the CSS custom properties every component uses. Names are fixed here and referenced by every later task: `--ink`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted`, `--gold`, `--gold-rgb`, `--teal`, `--font-sans`, `--font-display`, `--font-mono`, `--s-1`…`--s-10`, `--r-base`, `--r-soft`, `--r-pill`, `--ease`, `--nav-h`, `--maxw`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/styles/tokens.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync('src/styles/tokens.css', 'utf8')

describe('design tokens', () => {
  it('defines the locked palette values', () => {
    expect(tokens).toContain('--ink: #07070d')
    expect(tokens).toContain('--gold: #e7c27d')
    expect(tokens).toContain('--teal: #5fd3c6')
  })

  it('defines one easing curve', () => {
    expect(tokens).toContain('--ease: cubic-bezier(0.16, 1, 0.3, 1)')
    expect(tokens.match(/cubic-bezier/g)?.length).toBe(1)
  })

  it('defines an 8px-derived spacing scale', () => {
    for (const [name, value] of [
      ['--s-1', '4px'],
      ['--s-2', '8px'],
      ['--s-3', '16px'],
      ['--s-4', '24px'],
      ['--s-5', '32px'],
      ['--s-6', '48px'],
      ['--s-7', '64px'],
      ['--s-8', '96px'],
      ['--s-9', '128px'],
    ]) {
      expect(tokens).toContain(`${name}: ${value}`)
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/styles/tokens.test.ts`
Expected: FAIL — `ENOENT: src/styles/tokens.css`.

- [ ] **Step 3: Write `tokens.css`**

```css
:root {
  /* Ground and surfaces. The site is dark by design — there is no light theme. */
  --ink: #07070d;
  --surface: #0e0e17;
  --surface-2: #14141f;
  --line: rgb(231 194 125 / 0.14);

  /* Text */
  --text: #ece9e4;
  --muted: #9a978f;

  /* Accent. Gold is the ONLY accent on the page. Teal is reserved for the
     chat/AI surface so that "the machine is talking" reads as a different voice. */
  --gold: #e7c27d;
  --gold-bright: #f6dfa6;
  --gold-rgb: 231 194 125;
  --teal: #5fd3c6;

  /* Type */
  --font-sans: 'Geist', 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Fraunces', 'Cinzel', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Type scale, fluid between 390px and 1440px */
  --t-hero: clamp(2.6rem, 1.4rem + 5vw, 5.2rem);
  --t-h2: clamp(1.7rem, 1.2rem + 2vw, 2.6rem);
  --t-h3: clamp(1.15rem, 1rem + 0.6vw, 1.4rem);
  --t-body: clamp(1rem, 0.96rem + 0.2vw, 1.08rem);
  --t-small: 0.86rem;
  --t-micro: 0.74rem;

  /* Spacing — 8px scale. Nothing outside this list. */
  --s-1: 4px;
  --s-2: 8px;
  --s-3: 16px;
  --s-4: 24px;
  --s-5: 32px;
  --s-6: 48px;
  --s-7: 64px;
  --s-8: 96px;
  --s-9: 128px;
  --s-10: 192px;

  --r-base: 4px;
  --r-soft: 12px;
  --r-pill: 999px;

  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --nav-h: 64px;
  --maxw: 1120px;
}
```

- [ ] **Step 4: Write `base.css`**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: calc(var(--nav-h) + var(--s-4));
  color-scheme: dark;
}

body {
  background: var(--ink);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--t-body);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

h1,
h2,
h3 {
  font-family: var(--font-display);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.015em;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
  display: block;
}

:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
  border-radius: var(--r-base);
}

.skip-link {
  position: absolute;
  left: var(--s-3);
  top: calc(-1 * var(--s-9));
  z-index: 100;
  padding: var(--s-2) var(--s-3);
  background: var(--surface-2);
  border-radius: var(--r-base);
  transition: top 0.2s var(--ease);
}

.skip-link:focus-visible {
  top: var(--s-3);
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Swap the stylesheet imports and the fonts**

In `src/main.tsx`, replace the `global.css` import with:

```ts
import './styles/tokens.css'
import './styles/base.css'
```

Then `git rm src/styles/global.css`.

In `index.html`, replace the Google Fonts `<link href=...>` with the three faces the tokens name:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
```

Also update the `<meta name="description">`, `og:description`, and `twitter:description` to `profile.thesis`'s text ("I build computer-vision and LLM systems, and the infrastructure that keeps them running in production."), dropping the "Conjuring intelligent systems" copy.

- [ ] **Step 6: Run the tests and the build**

Run: `npm test && npm run build`
Expected: PASS. The copy-voice test from Task 2 now also covers `index.html`? It does not — it walks `src/` only. That is deliberate; the meta description is checked by eye in Task 14.

- [ ] **Step 7: Commit**

```bash
git add -A src/styles src/main.tsx index.html
git commit -m "feat: dark arcane-tech tokens, three faces, one easing curve"
```

---

### Task 6: Section shell and the reveal primitive

**Files:**
- Create: `frontend/src/components/layout/Section.tsx`, `Section.css`
- Create: `frontend/src/components/ui/Reveal.tsx`, `Reveal.css`
- Test: `frontend/src/components/layout/Section.test.tsx`, `frontend/src/components/ui/Reveal.test.tsx`

**Interfaces:**
- Consumes: `prefersReducedMotion` from `src/lib/media.ts` (Task 3).
- Produces:
  - `<Section id: string, title: string, eyebrow?: string, children: ReactNode />` — renders `<section id>` with an `<h2>` wired by `aria-labelledby`.
  - `<Reveal delay?: number, children: ReactNode />` — fade + 8px rise on scroll into view, no-op under reduced motion.

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/layout/Section.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Section } from './Section'

describe('Section', () => {
  it('renders a labelled landmark with the given id', () => {
    const { container } = render(
      <Section id="work" title="Work">
        <p>body</p>
      </Section>,
    )
    const section = container.querySelector('section')
    expect(section).toHaveAttribute('id', 'work')
    const heading = screen.getByRole('heading', { level: 2, name: 'Work' })
    expect(section).toHaveAttribute('aria-labelledby', heading.id)
  })

  it('renders an optional eyebrow', () => {
    render(
      <Section id="about" title="About" eyebrow="01">
        <p>body</p>
      </Section>,
    )
    expect(screen.getByText('01')).toBeInTheDocument()
  })
})
```

`frontend/src/components/ui/Reveal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Reveal } from './Reveal'

vi.mock('../../lib/media', () => ({ prefersReducedMotion: () => true }))

describe('Reveal', () => {
  it('renders its children visible immediately under reduced motion', () => {
    render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    const el = screen.getByText('content').parentElement as HTMLElement
    expect(el.className).toContain('is-shown')
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- src/components`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Write `Section.tsx`**

```tsx
import type { ReactNode } from 'react'
import './Section.css'

type SectionProps = {
  id: string
  title: string
  eyebrow?: string
  children: ReactNode
}

export function Section({ id, title, eyebrow, children }: SectionProps) {
  const headingId = `${id}-heading`
  return (
    <section id={id} className="section" aria-labelledby={headingId}>
      <div className="section__inner">
        <header className="section__head">
          {eyebrow && <p className="section__eyebrow">{eyebrow}</p>}
          <h2 id={headingId} className="section__title">
            {title}
          </h2>
        </header>
        {children}
      </div>
    </section>
  )
}
```

```css
/* Section.css */
.section {
  padding-block: var(--s-8);
}

.section__inner {
  width: min(100% - var(--s-5) * 2, var(--maxw));
  margin-inline: auto;
}

.section__head {
  margin-bottom: var(--s-6);
}

.section__eyebrow {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: var(--s-2);
}

.section__title {
  font-size: var(--t-h2);
}

@media (min-width: 900px) {
  .section {
    padding-block: var(--s-10);
  }
}
```

- [ ] **Step 4: Write `Reveal.tsx`**

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { prefersReducedMotion } from '../../lib/media'
import './Reveal.css'

type RevealProps = { children: ReactNode; delay?: number }

export function Reveal({ children, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Reduced motion starts shown, so the content is never gated behind an
  // animation that will not run.
  const [shown, setShown] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (shown || !ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [shown])

  return (
    <div
      ref={ref}
      className={`reveal${shown ? ' is-shown' : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
```

```css
/* Reveal.css */
.reveal {
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.6s var(--ease),
    transform 0.6s var(--ease);
}

.reveal.is-shown {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npm test -- src/components`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout src/components/ui
git commit -m "feat: one section shell and one reveal, both reduced-motion aware"
```

---

### Task 7: Navigation and active-section tracking

**Files:**
- Create: `frontend/src/lib/useSectionObserver.ts`
- Create: `frontend/src/components/layout/Nav.tsx`, `Nav.css`
- Test: `frontend/src/lib/useSectionObserver.test.tsx`, `frontend/src/components/layout/Nav.test.tsx`

**Interfaces:**
- Consumes: `src/content` (Task 4).
- Produces:
  - `useSectionObserver(ids: string[]): string` — the id of the section currently in the reading band, `''` before any intersects.
  - `<Nav />` — fixed header, anchor links, `aria-current="true"` on the active one, mobile disclosure button.
  - Exported const `NAV_ITEMS: { id: string; label: string }[]` from `Nav.tsx`, consumed by Plan 2's backdrop tint map.

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/useSectionObserver.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useSectionObserver } from './useSectionObserver'

type Cb = (entries: IntersectionObserverEntry[]) => void
let callback: Cb

function stubObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Cb) {
        callback = cb
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}

function Probe({ ids }: { ids: string[] }) {
  const active = useSectionObserver(ids)
  return <p data-testid="active">{active}</p>
}

describe('useSectionObserver', () => {
  it('reports the intersecting section id', () => {
    stubObserver()
    document.body.innerHTML = '<section id="work"></section><section id="about"></section>'
    render(<Probe ids={['work', 'about']} />)
    expect(screen.getByTestId('active')).toHaveTextContent('')

    act(() => {
      callback([
        {
          isIntersecting: true,
          target: document.getElementById('about') as Element,
          intersectionRatio: 0.8,
        } as IntersectionObserverEntry,
      ])
    })
    expect(screen.getByTestId('active')).toHaveTextContent('about')
  })
})
```

`frontend/src/components/layout/Nav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Nav, NAV_ITEMS } from './Nav'

describe('Nav', () => {
  it('renders one anchor per section', () => {
    render(<Nav />)
    const nav = screen.getByRole('navigation', { name: /primary/i })
    expect(nav).toBeInTheDocument()
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', `#${item.id}`)
    }
  })

  it('exposes a resume link that opens the CV', () => {
    render(<Nav />)
    expect(screen.getByRole('link', { name: /résumé/i })).toHaveAttribute(
      'href',
      '/Moeez_Ahmad_Khan_CV.pdf',
    )
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- src/lib/useSectionObserver.test.tsx src/components/layout/Nav.test.tsx`
Expected: FAIL — modules do not resolve.

- [ ] **Step 3: Write `useSectionObserver.ts`**

```ts
import { useEffect, useState } from 'react'

/**
 * Reports which section owns the reading band. Uses IntersectionObserver rather
 * than scroll fractions on purpose: adding or reordering a section then requires
 * no numeric resync anywhere in the codebase.
 */
export function useSectionObserver(ids: string[]): string {
  const [active, setActive] = useState('')

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio)
          else visible.delete(entry.target.id)
        }
        let best = ''
        let bestRatio = 0
        for (const [id, ratio] of visible) {
          if (ratio >= bestRatio) {
            best = id
            bestRatio = ratio
          }
        }
        if (best) setActive(best)
      },
      // A band across the middle of the viewport: the section a reader is
      // actually looking at, not the one that has merely entered the screen.
      { rootMargin: '-40% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids.join(',')])

  return active
}
```

- [ ] **Step 4: Write `Nav.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { profile } from '../../content'
import { useSectionObserver } from '../../lib/useSectionObserver'
import './Nav.css'

export const NAV_ITEMS = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

export function Nav() {
  const ids = useMemo(() => NAV_ITEMS.map((i) => i.id), [])
  const active = useSectionObserver(ids)
  const [open, setOpen] = useState(false)

  // Close the mobile menu on Escape and whenever a link is followed.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="nav">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="nav__inner">
        <a className="nav__brand" href="#top">
          {profile.name}
        </a>
        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
        <nav id="nav-links" aria-label="Primary" className={`nav__links${open ? ' is-open' : ''}`}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="nav__link"
              aria-current={active === item.id ? 'true' : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a className="nav__cv" href={profile.cvUrl} target="_blank" rel="noreferrer">
            Résumé
          </a>
        </nav>
      </div>
    </header>
  )
}
```

```css
/* Nav.css */
.nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: 20;
  height: var(--nav-h);
  backdrop-filter: blur(12px);
  background: rgb(7 7 13 / 0.72);
  border-bottom: 1px solid var(--line);
}

.nav__inner {
  height: 100%;
  width: min(100% - var(--s-5) * 2, var(--maxw));
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
}

.nav__brand {
  font-family: var(--font-mono);
  font-size: var(--t-small);
  letter-spacing: 0.06em;
}

.nav__toggle {
  font: inherit;
  font-size: var(--t-small);
  color: var(--text);
  background: none;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: var(--s-1) var(--s-3);
  cursor: pointer;
}

.nav__links {
  display: none;
}

.nav__links.is-open {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  position: absolute;
  inset: var(--nav-h) 0 auto;
  padding: var(--s-4) var(--s-5);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.nav__link,
.nav__cv {
  font-size: var(--t-small);
  color: var(--muted);
  transition: color 0.2s var(--ease);
}

.nav__link:hover,
.nav__cv:hover,
.nav__link[aria-current='true'] {
  color: var(--text);
}

.nav__link[aria-current='true'] {
  position: relative;
}

.nav__link[aria-current='true']::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 1px;
  background: var(--gold);
}

.nav__cv {
  color: var(--gold);
}

@media (min-width: 780px) {
  .nav__toggle {
    display: none;
  }
  .nav__links {
    display: flex;
    align-items: center;
    gap: var(--s-5);
  }
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npm test -- src/lib/useSectionObserver.test.tsx src/components/layout/Nav.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/useSectionObserver.* src/components/layout/Nav.*
git commit -m "feat: nav that tracks the section you are actually reading"
```

---

### Task 8: Hero

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`, `Button.css`
- Create: `frontend/src/components/site/Hero.tsx`, `Hero.css`
- Test: `frontend/src/components/site/Hero.test.tsx`

**Interfaces:**
- Consumes: `profile` (Task 4).
- Produces: `<Hero />` rendering the single `<h1>`; `<Button href, variant?: 'solid' | 'ghost', children, ...anchorProps />`. Plan 2 mounts the 3D stage behind this section and relies on the id `top` and the class `hero`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { profile } from '../../content'
import { Hero } from './Hero'

describe('Hero', () => {
  it('renders the name as the only h1 and the thesis as text', () => {
    render(<Hero />)
    expect(screen.getByRole('heading', { level: 1, name: profile.name })).toBeInTheDocument()
    expect(screen.getByText(profile.thesis)).toBeInTheDocument()
  })

  it('offers work, résumé, and GitHub as the three calls to action', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: /view work/i })).toHaveAttribute('href', '#work')
    expect(screen.getByRole('link', { name: /résumé/i })).toHaveAttribute('href', profile.cvUrl)
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute(
      'href',
      'https://github.com/moeezahmadkhan',
    )
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/components/site/Hero.test.tsx`
Expected: FAIL — cannot resolve `./Hero`.

- [ ] **Step 3: Write `Button.tsx`**

```tsx
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import './Button.css'

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: 'solid' | 'ghost'
  children: ReactNode
}

export function Button({ variant = 'solid', children, className = '', ...rest }: ButtonProps) {
  return (
    <a className={`btn btn--${variant} ${className}`.trim()} {...rest}>
      {children}
    </a>
  )
}
```

```css
/* Button.css */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-4);
  border-radius: var(--r-pill);
  font-size: var(--t-small);
  font-weight: 500;
  border: 1px solid transparent;
  transition:
    background 0.2s var(--ease),
    border-color 0.2s var(--ease),
    color 0.2s var(--ease);
}

.btn--solid {
  background: var(--gold);
  color: var(--ink);
}

.btn--solid:hover {
  background: var(--gold-bright);
}

.btn--ghost {
  border-color: var(--line);
  color: var(--text);
}

.btn--ghost:hover {
  border-color: rgb(var(--gold-rgb) / 0.5);
  color: var(--gold);
}
```

- [ ] **Step 4: Write `Hero.tsx`**

The `<h1>` and thesis are the LCP element — they are plain DOM text with no animation gating their paint. Do not wrap them in `Reveal`.

```tsx
import { profile } from '../../content'
import { Button } from '../ui/Button'
import './Hero.css'

export function Hero() {
  const github = profile.socials.find((s) => s.label === 'GitHub')
  return (
    <section id="top" className="hero" aria-label="Introduction">
      <div className="hero__inner">
        <p className="hero__role">{profile.role}</p>
        <h1 className="hero__name">{profile.name}</h1>
        <p className="hero__thesis">{profile.thesis}</p>
        <div className="hero__actions">
          <Button href="#work">View work</Button>
          <Button href={profile.cvUrl} variant="ghost" target="_blank" rel="noreferrer">
            Résumé
          </Button>
          {github && (
            <Button href={github.href} variant="ghost" target="_blank" rel="noreferrer">
              GitHub
            </Button>
          )}
        </div>
        <p className="hero__meta">{profile.location}</p>
      </div>
      <a className="hero__cue" href="#about" aria-label="Scroll to About">
        <span aria-hidden="true">↓</span>
      </a>
    </section>
  )
}
```

```css
/* Hero.css */
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  padding-top: var(--nav-h);
}

.hero__inner {
  width: min(100% - var(--s-5) * 2, var(--maxw));
  margin-inline: auto;
  max-width: 22ch;
}

.hero__role {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: var(--s-3);
}

.hero__name {
  font-size: var(--t-hero);
  margin-bottom: var(--s-4);
}

.hero__thesis {
  max-width: 46ch;
  color: var(--muted);
  font-size: clamp(1.05rem, 1rem + 0.5vw, 1.3rem);
  margin-bottom: var(--s-5);
}

.hero__inner {
  max-width: none;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  margin-bottom: var(--s-5);
}

.hero__meta {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  color: var(--muted);
}

.hero__cue {
  position: absolute;
  left: 50%;
  bottom: var(--s-5);
  translate: -50% 0;
  color: var(--muted);
  font-size: var(--t-small);
  animation: cue 2.4s var(--ease) infinite;
}

@keyframes cue {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(6px);
    opacity: 1;
  }
}

@media (min-width: 900px) {
  .hero__inner {
    /* Leave the right half clear — Plan 2 puts the wizard there. */
    padding-right: 42%;
  }
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test -- src/components/site/Hero.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Button.* src/components/site/Hero.*
git commit -m "feat: hero that states the thesis in one screen"
```

---

### Task 9: About and the stat strip

**Files:**
- Create: `frontend/src/components/ui/StatStrip.tsx`, `StatStrip.css`
- Create: `frontend/src/components/site/About.tsx`, `About.css`
- Test: `frontend/src/components/site/About.test.tsx`

**Interfaces:**
- Consumes: `profile` (Task 4), `Section` (Task 6), `Reveal` (Task 6).
- Produces: `<About />`, `<StatStrip items: Stat[] />`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { profile } from '../../content'
import { About } from './About'

describe('About', () => {
  it('renders every bio paragraph', () => {
    render(<About />)
    for (const para of profile.bio) {
      expect(screen.getByText(para)).toBeInTheDocument()
    }
  })

  it('renders the stat strip as a description list', () => {
    render(<About />)
    for (const stat of profile.stats) {
      expect(screen.getByText(stat.value)).toBeInTheDocument()
      expect(screen.getByText(stat.label)).toBeInTheDocument()
    }
  })

  it('gives the portrait real alternative text', () => {
    render(<About />)
    expect(screen.getByRole('img', { name: /moeez ahmad khan/i })).toHaveAttribute(
      'src',
      profile.portrait,
    )
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/components/site/About.test.tsx`
Expected: FAIL — cannot resolve `./About`.

- [ ] **Step 3: Write `StatStrip.tsx`**

```tsx
import type { Stat } from '../../content'
import './StatStrip.css'

export function StatStrip({ items }: { items: Stat[] }) {
  return (
    <dl className="stats">
      {items.map((stat) => (
        <div className="stats__item" key={stat.label}>
          <dt className="stats__value">{stat.value}</dt>
          <dd className="stats__label">{stat.label}</dd>
        </div>
      ))}
    </dl>
  )
}
```

```css
/* StatStrip.css */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--s-4);
  padding-top: var(--s-5);
  border-top: 1px solid var(--line);
}

.stats__value {
  font-family: var(--font-mono);
  font-size: var(--t-h3);
  color: var(--gold);
}

.stats__label {
  font-size: var(--t-small);
  color: var(--muted);
  margin-top: var(--s-1);
}
```

- [ ] **Step 4: Write `About.tsx`**

```tsx
import { profile } from '../../content'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { StatStrip } from '../ui/StatStrip'
import './About.css'

export function About() {
  return (
    <Section id="about" title="About" eyebrow="01">
      <div className="about">
        <Reveal>
          <div className="about__copy">
            {profile.bio.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
            <StatStrip items={profile.stats} />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <figure className="about__portrait">
            <img src={profile.portrait} alt={`${profile.name}, portrait`} loading="lazy" />
          </figure>
        </Reveal>
      </div>
    </Section>
  )
}
```

```css
/* About.css */
.about {
  display: grid;
  gap: var(--s-6);
}

.about__copy p + p {
  margin-top: var(--s-3);
}

.about__copy p {
  color: var(--muted);
  max-width: 62ch;
}

.about__portrait img {
  border-radius: var(--r-soft);
  border: 1px solid var(--line);
  filter: grayscale(0.25) contrast(1.05);
}

@media (min-width: 900px) {
  .about {
    grid-template-columns: 1.6fr 1fr;
    align-items: start;
    gap: var(--s-7);
  }
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test -- src/components/site/About.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/StatStrip.* src/components/site/About.*
git commit -m "feat: about section with the stat strip"
```

---

### Task 10: Work and project cards

**Files:**
- Create: `frontend/src/components/ui/Tag.tsx`, `Tag.css`
- Create: `frontend/src/components/site/ProjectCard.tsx`, `ProjectCard.css`
- Create: `frontend/src/components/site/Work.tsx`, `Work.css`
- Test: `frontend/src/components/site/Work.test.tsx`

**Interfaces:**
- Consumes: `projects`, `Project` (Task 4), `Section`, `Reveal` (Task 6).
- Produces: `<Work />`, `<ProjectCard project: Project />`, `<Tag>{children}</Tag>`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { projects } from '../../content'
import { Work } from './Work'

describe('Work', () => {
  it('renders every featured project as an article with a heading', () => {
    render(<Work />)
    for (const project of projects.filter((p) => p.featured)) {
      const card = screen.getByRole('article', { name: project.name })
      expect(within(card).getByText(project.outcome)).toBeInTheDocument()
      for (const tech of project.stack) {
        expect(within(card).getByText(tech)).toBeInTheDocument()
      }
    }
  })

  it('lists the non-featured projects separately', () => {
    render(<Work />)
    const earlier = screen.getByRole('list', { name: /earlier work/i })
    for (const project of projects.filter((p) => !p.featured)) {
      expect(within(earlier).getByText(project.name)).toBeInTheDocument()
    }
  })

  it('opens external project links in a new tab safely', () => {
    render(<Work />)
    const withRepo = projects.find((p) => p.links?.repo)
    if (!withRepo) return
    const link = screen.getByRole('link', { name: new RegExp(`${withRepo.name}.*(code|repo)`, 'i') })
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/components/site/Work.test.tsx`
Expected: FAIL — cannot resolve `./Work`.

- [ ] **Step 3: Write `Tag.tsx`**

```tsx
import type { ReactNode } from 'react'
import './Tag.css'

export function Tag({ children }: { children: ReactNode }) {
  return <li className="tag">{children}</li>
}
```

```css
/* Tag.css */
.tag {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 2px var(--s-2);
  list-style: none;
}
```

- [ ] **Step 4: Write `ProjectCard.tsx`**

```tsx
import type { Project } from '../../content'
import { Tag } from '../ui/Tag'
import './ProjectCard.css'

export function ProjectCard({ project }: { project: Project }) {
  const headingId = `project-${project.slug}`
  return (
    <article className="card" aria-labelledby={headingId}>
      {project.shot && (
        <img className="card__shot" src={project.shot} alt="" loading="lazy" aria-hidden="true" />
      )}
      <div className="card__body">
        <h3 className="card__title" id={headingId}>
          {project.name}
        </h3>
        {project.metric && <p className="card__metric">{project.metric}</p>}
        <p className="card__outcome">{project.outcome}</p>
        <ul className="card__detail">
          {project.detail.map((line) => (
            <li key={line.slice(0, 24)}>{line}</li>
          ))}
        </ul>
        <ul className="card__stack">
          {project.stack.map((tech) => (
            <Tag key={tech}>{tech}</Tag>
          ))}
        </ul>
        {project.links && (
          <p className="card__links">
            {project.links.repo && (
              <a href={project.links.repo} target="_blank" rel="noreferrer noopener">
                {project.name} code
              </a>
            )}
            {project.links.demo && (
              <a href={project.links.demo} target="_blank" rel="noreferrer noopener">
                {project.name} live
              </a>
            )}
            {project.links.writeup && (
              <a href={project.links.writeup} target="_blank" rel="noreferrer noopener">
                {project.name} write-up
              </a>
            )}
          </p>
        )}
      </div>
    </article>
  )
}
```

```css
/* ProjectCard.css */
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-soft);
  overflow: hidden;
  transition: border-color 0.25s var(--ease);
}

.card:hover {
  border-color: rgb(var(--gold-rgb) / 0.36);
}

.card__shot {
  aspect-ratio: 16 / 9;
  object-fit: cover;
  width: 100%;
  border-bottom: 1px solid var(--line);
}

.card__body {
  padding: var(--s-5);
}

.card__title {
  font-size: var(--t-h3);
}

.card__metric {
  font-family: var(--font-mono);
  font-size: var(--t-small);
  color: var(--gold);
  margin-top: var(--s-1);
}

.card__outcome {
  margin-top: var(--s-3);
  color: var(--text);
}

.card__detail {
  margin-top: var(--s-3);
  padding-left: var(--s-3);
  color: var(--muted);
  font-size: var(--t-small);
}

.card__detail li + li {
  margin-top: var(--s-2);
}

.card__stack {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin-top: var(--s-4);
  padding: 0;
}

.card__links {
  display: flex;
  gap: var(--s-4);
  margin-top: var(--s-4);
  font-size: var(--t-small);
  color: var(--gold);
}

.card__links a {
  border-bottom: 1px solid rgb(var(--gold-rgb) / 0.4);
}
```

- [ ] **Step 5: Write `Work.tsx`**

```tsx
import { projects } from '../../content'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { ProjectCard } from './ProjectCard'
import './Work.css'

export function Work() {
  const featured = projects.filter((p) => p.featured)
  const earlier = projects.filter((p) => !p.featured)

  return (
    <Section id="work" title="Work" eyebrow="02">
      <div className="work__grid">
        {featured.map((project, i) => (
          <Reveal key={project.slug} delay={i * 60}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </div>

      {earlier.length > 0 && (
        <div className="work__earlier">
          <h3 className="work__earlier-title" id="earlier-work">
            Earlier work
          </h3>
          <ul className="work__list" aria-labelledby="earlier-work">
            {earlier.map((project) => (
              <li className="work__list-item" key={project.slug}>
                <span className="work__list-name">{project.name}</span>
                <span className="work__list-outcome">{project.outcome}</span>
                <span className="work__list-stack">{project.stack.join(' · ')}</span>
                {project.links?.repo && (
                  <a href={project.links.repo} target="_blank" rel="noreferrer noopener">
                    {project.name} code
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}
```

```css
/* Work.css */
.work__grid {
  display: grid;
  gap: var(--s-4);
}

.work__earlier {
  margin-top: var(--s-7);
}

.work__earlier-title {
  font-size: var(--t-h3);
  margin-bottom: var(--s-4);
}

.work__list {
  list-style: none;
  padding: 0;
  border-top: 1px solid var(--line);
}

.work__list-item {
  display: grid;
  gap: var(--s-1);
  padding: var(--s-4) 0;
  border-bottom: 1px solid var(--line);
}

.work__list-name {
  font-weight: 500;
}

.work__list-outcome,
.work__list-stack {
  color: var(--muted);
  font-size: var(--t-small);
}

.work__list-stack {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
}

.work__list-item a {
  color: var(--gold);
  font-size: var(--t-small);
}

@media (min-width: 900px) {
  .work__grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .work__grid > :first-child {
    grid-column: 1 / -1;
  }
  .work__list-item {
    grid-template-columns: 1fr 2fr 1fr auto;
    align-items: baseline;
    gap: var(--s-4);
  }
}
```

- [ ] **Step 6: Run it and watch it pass**

Run: `npm test -- src/components/site/Work.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Tag.* src/components/site/ProjectCard.* src/components/site/Work.*
git commit -m "feat: work section — featured cards plus an earlier-work list"
```

---

### Task 11: Skills

**Files:**
- Create: `frontend/src/components/site/Skills.tsx`, `Skills.css`
- Test: `frontend/src/components/site/Skills.test.tsx`

**Interfaces:**
- Consumes: `skills` (Task 4), `Section`, `Reveal` (Task 6), `Tag` (Task 10).
- Produces: `<Skills />`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { skills } from '../../content'
import { Skills } from './Skills'

describe('Skills', () => {
  it('renders each group as a labelled list', () => {
    render(<Skills />)
    for (const group of skills) {
      const list = screen.getByRole('list', { name: group.title })
      for (const item of group.items) {
        expect(within(list).getByText(item)).toBeInTheDocument()
      }
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/components/site/Skills.test.tsx`
Expected: FAIL — cannot resolve `./Skills`.

- [ ] **Step 3: Write `Skills.tsx`**

```tsx
import { skills } from '../../content'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { Tag } from '../ui/Tag'
import './Skills.css'

export function Skills() {
  return (
    <Section id="skills" title="Skills" eyebrow="03">
      <div className="skills">
        {skills.map((group, i) => (
          <Reveal key={group.title} delay={i * 50}>
            <div className="skills__group">
              <h3 className="skills__title" id={`skills-${i}`}>
                {group.title}
              </h3>
              <ul className="skills__items" aria-labelledby={`skills-${i}`}>
                {group.items.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
```

```css
/* Skills.css */
.skills {
  display: grid;
  gap: var(--s-5);
}

.skills__title {
  font-size: var(--t-small);
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: var(--s-3);
}

.skills__items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  padding: 0;
}

@media (min-width: 780px) {
  .skills {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--s-6);
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- src/components/site/Skills.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/Skills.*
git commit -m "feat: skills grouped by what they actually do"
```

---

### Task 12: Experience timeline

**Files:**
- Create: `frontend/src/components/ui/Timeline.tsx`, `Timeline.css`
- Create: `frontend/src/components/site/Experience.tsx`
- Test: `frontend/src/components/site/Experience.test.tsx`

**Interfaces:**
- Consumes: `experience`, `Role` (Task 4), `Section`, `Reveal` (Task 6).
- Produces: `<Experience />`, `<Timeline roles: Role[] />`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { experience } from '../../content'
import { Experience } from './Experience'

describe('Experience', () => {
  it('renders each role with its org, period, and bullets', () => {
    render(<Experience />)
    for (const role of experience) {
      const heading = screen.getByRole('heading', { name: `${role.title} · ${role.org}` })
      const item = heading.closest('li') as HTMLElement
      expect(within(item).getByText(role.period)).toBeInTheDocument()
      for (const bullet of role.bullets) {
        expect(within(item).getByText(bullet)).toBeInTheDocument()
      }
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/components/site/Experience.test.tsx`
Expected: FAIL — cannot resolve `./Experience`.

- [ ] **Step 3: Write `Timeline.tsx`**

```tsx
import type { Role } from '../../content'
import './Timeline.css'

export function Timeline({ roles }: { roles: Role[] }) {
  return (
    <ol className="timeline">
      {roles.map((role) => (
        <li className="timeline__item" key={`${role.org}-${role.period}`}>
          <p className="timeline__period">{role.period}</p>
          <div className="timeline__body">
            <h3 className="timeline__role">{`${role.title} · ${role.org}`}</h3>
            <ul className="timeline__bullets">
              {role.bullets.map((bullet) => (
                <li key={bullet.slice(0, 24)}>{bullet}</li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  )
}
```

```css
/* Timeline.css */
.timeline {
  list-style: none;
  padding: 0;
  counter-reset: none;
}

.timeline__item {
  display: grid;
  gap: var(--s-2);
  padding: var(--s-5) 0;
  border-top: 1px solid var(--line);
}

.timeline__period {
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  color: var(--gold);
  letter-spacing: 0.06em;
}

.timeline__role {
  font-size: var(--t-h3);
  margin-bottom: var(--s-2);
}

.timeline__bullets {
  color: var(--muted);
  font-size: var(--t-small);
  padding-left: var(--s-3);
}

.timeline__bullets li + li {
  margin-top: var(--s-2);
}

@media (min-width: 900px) {
  .timeline__item {
    grid-template-columns: 200px 1fr;
    gap: var(--s-5);
  }
}
```

- [ ] **Step 4: Write `Experience.tsx`**

```tsx
import { experience } from '../../content'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { Timeline } from '../ui/Timeline'

export function Experience() {
  return (
    <Section id="experience" title="Experience" eyebrow="04">
      <Reveal>
        <Timeline roles={experience} />
      </Reveal>
    </Section>
  )
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test -- src/components/site/Experience.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Timeline.* src/components/site/Experience.tsx
git commit -m "feat: experience timeline"
```

---

### Task 13: Contact

**Files:**
- Create: `frontend/src/components/site/Contact.tsx`, `Contact.css`
- Modify: `frontend/src/lib/contactForm.ts` (already moved in Task 2 — no further change expected)
- Test: `frontend/src/components/site/Contact.test.tsx`

**Interfaces:**
- Consumes: `validate(fields: ContactFields): FieldErrors` and `buildSubmission(fields: ContactFields, accessKey: string): Web3FormsPayload` from `src/lib/contactForm.ts` (Task 2); `profile` (Task 4); `Section` (Task 6); `Button` (Task 8).
- Produces: `<Contact />`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { profile } from '../../content'
import { Contact } from './Contact'

describe('Contact', () => {
  it('shows the direct email as a mailto link', () => {
    render(<Contact />)
    expect(screen.getByRole('link', { name: profile.email })).toHaveAttribute(
      'href',
      `mailto:${profile.email}`,
    )
  })

  it('reports field errors instead of submitting an empty form', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<Contact />)
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(await screen.findByText(/please share your name/i)).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('posts a valid message and confirms it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }),
    )
    render(<Contact />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Sam Recruiter')
    await userEvent.type(screen.getByLabelText(/email/i), 'sam@example.com')
    await userEvent.type(screen.getByLabelText(/message/i), 'We have a CV role open.')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/thanks/i))
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/components/site/Contact.test.tsx`
Expected: FAIL — cannot resolve `./Contact`.

- [ ] **Step 3: Write `Contact.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { profile } from '../../content'
import { buildSubmission, validate, type ContactFields, type FieldErrors } from '../../lib/contactForm'
import { Section } from '../layout/Section'
import './Contact.css'

const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined
const EMPTY: ContactFields = { name: '', email: '', message: '' }

export function Contact() {
  const [fields, setFields] = useState<ContactFields>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate(fields)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (!ACCESS_KEY) {
      // No key configured (local dev, or a fork). Say so rather than pretending to send.
      setState('failed')
      return
    }

    setState('sending')
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(buildSubmission(fields, ACCESS_KEY)),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState('sent')
      setFields(EMPTY)
    } catch {
      setState('failed')
    }
  }

  return (
    <Section id="contact" title="Contact" eyebrow="05">
      <div className="contact">
        <div className="contact__direct">
          <p className="contact__lead">
            Hiring, or have a system that needs building? Mail me directly — I answer.
          </p>
          <a className="contact__email" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <p className="contact__meta">{profile.location}</p>
          <ul className="contact__socials">
            {profile.socials.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noreferrer noopener">
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <form className="contact__form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Name</span>
            <input
              name="name"
              value={fields.name}
              onChange={(e) => setFields({ ...fields, name: e.target.value })}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <em className="field__error">{errors.name}</em>}
          </label>

          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={fields.email}
              onChange={(e) => setFields({ ...fields, email: e.target.value })}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <em className="field__error">{errors.email}</em>}
          </label>

          <label className="field">
            <span>Message</span>
            <textarea
              name="message"
              rows={5}
              value={fields.message}
              onChange={(e) => setFields({ ...fields, message: e.target.value })}
              aria-invalid={Boolean(errors.message)}
            />
            {errors.message && <em className="field__error">{errors.message}</em>}
          </label>

          <button className="btn btn--solid" type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send message'}
          </button>

          <p role="status" aria-live="polite" className="contact__status">
            {state === 'sent' && 'Thanks — I have your message and will reply soon.'}
            {state === 'failed' && `That did not send. Mail me at ${profile.email} instead.`}
          </p>
        </form>
      </div>
    </Section>
  )
}
```

```css
/* Contact.css */
.contact {
  display: grid;
  gap: var(--s-6);
}

.contact__lead {
  color: var(--muted);
  max-width: 40ch;
}

.contact__email {
  display: inline-block;
  margin-top: var(--s-4);
  font-size: var(--t-h3);
  color: var(--gold);
  border-bottom: 1px solid rgb(var(--gold-rgb) / 0.4);
}

.contact__meta {
  margin-top: var(--s-3);
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  color: var(--muted);
}

.contact__socials {
  display: flex;
  gap: var(--s-4);
  list-style: none;
  padding: 0;
  margin-top: var(--s-4);
  font-size: var(--t-small);
}

.contact__socials a {
  color: var(--muted);
  border-bottom: 1px solid var(--line);
}

.contact__form {
  display: grid;
  gap: var(--s-3);
}

.field {
  display: grid;
  gap: var(--s-1);
  font-size: var(--t-small);
  color: var(--muted);
}

.field input,
.field textarea {
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-base);
  padding: var(--s-2) var(--s-3);
}

.field input[aria-invalid='true'],
.field textarea[aria-invalid='true'] {
  border-color: #d97070;
}

.field__error {
  font-style: normal;
  color: #d97070;
  font-size: var(--t-micro);
}

.contact__form .btn {
  justify-self: start;
  font: inherit;
  font-size: var(--t-small);
  cursor: pointer;
}

.contact__status {
  min-height: 1.2em;
  font-size: var(--t-small);
  color: var(--muted);
}

@media (min-width: 900px) {
  .contact {
    grid-template-columns: 1fr 1fr;
    gap: var(--s-7);
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- src/components/site/Contact.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/Contact.*
git commit -m "feat: contact — direct mail first, form second"
```

---

### Task 14: Compose the page, then verify it by eye

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/layout/Footer.tsx`, `Footer.css`
- Create: `frontend/tools/shoot.mjs`
- Modify: `frontend/package.json` (add the `shoot` script)
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: every component from Tasks 6–13.
- Produces: the finished shell. Plan 2 mounts `<Stage />` as the first child of `App`'s fragment; Plan 3 mounts `<ChatDock />` as the last.

- [ ] **Step 1: Write the failing test**

`frontend/src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders exactly one h1', () => {
    render(<App />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('renders every section landmark in reading order', () => {
    const { container } = render(<App />)
    const ids = [...container.querySelectorAll('section[id]')].map((el) => el.id)
    expect(ids).toEqual(['top', 'about', 'work', 'skills', 'experience', 'contact'])
  })

  it('has a skip link that targets the main landmark', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main')
    expect(container.querySelector('main')).toHaveAttribute('id', 'main')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — App still renders the Task 2 stub.

- [ ] **Step 3: Write `Footer.tsx`**

```tsx
import { profile } from '../../content'
import './Footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <ul className="footer__links">
          {profile.socials.map((social) => (
            <li key={social.label}>
              <a href={social.href} target="_blank" rel="noreferrer noopener">
                {social.label}
              </a>
            </li>
          ))}
          <li>
            <a href={`mailto:${profile.email}`}>Email</a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
```

```css
/* Footer.css */
.footer {
  border-top: 1px solid var(--line);
  padding-block: var(--s-5);
  font-size: var(--t-small);
  color: var(--muted);
}

.footer__inner {
  width: min(100% - var(--s-5) * 2, var(--maxw));
  margin-inline: auto;
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  justify-content: space-between;
}

.footer__links {
  display: flex;
  gap: var(--s-4);
  list-style: none;
  padding: 0;
}
```

- [ ] **Step 4: Write `App.tsx`**

```tsx
import { Nav } from './components/layout/Nav'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/site/Hero'
import { About } from './components/site/About'
import { Work } from './components/site/Work'
import { Skills } from './components/site/Skills'
import { Experience } from './components/site/Experience'
import { Contact } from './components/site/Contact'

export default function App() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <About />
        <Work />
        <Skills />
        <Experience />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test -- src/App.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Write the screenshot tool**

Create `frontend/tools/shoot.mjs`:

```js
// Screenshots the running preview build at two widths so the design can be reviewed
// by eye. Drives system Chrome through puppeteer-core; SwiftShader keeps it headless.
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const URL = process.env.SHOOT_URL ?? 'http://localhost:4173/'
const OUT = '.shots'
const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})

for (const size of WIDTHS) {
  const page = await browser.newPage()
  await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.screenshot({ path: `${OUT}/${size.name}-full.png`, fullPage: true })
  for (const id of ['top', 'about', 'work', 'skills', 'experience', 'contact']) {
    await page.evaluate((anchor) => {
      document.getElementById(anchor)?.scrollIntoView()
    }, id)
    await new Promise((r) => setTimeout(r, 400))
    await page.screenshot({ path: `${OUT}/${size.name}-${id}.png` })
  }
  await page.close()
}

await browser.close()
console.log(`shot ${WIDTHS.length} widths into ${OUT}/`)
```

Add to `frontend/package.json` scripts:

```json
    "shoot": "node tools/shoot.mjs",
```

- [ ] **Step 7: Look at the site**

```bash
npm run build && npm run preview &
npm run shoot
```

Then review `.shots/*.png`. **Invoke the `design-critique-loop` skill** against those screenshots and fix what it finds: typography hierarchy, spacing rhythm, whether the hero states a real thesis, and whether anything reads as templated. Repeat until it is clean. Kill the preview server when done.

- [ ] **Step 8: Check accessibility and responsiveness by hand**

- Tab from the top: skip link → brand → nav links → résumé → hero CTAs, all with a visible gold focus ring.
- At 390px: no horizontal scroll, nav collapses to the Menu button, cards stack.
- Set `prefers-reduced-motion: reduce` in Chrome DevTools rendering panel: reveals show instantly, the scroll cue stops, anchor jumps are instant.
- Run Lighthouse against `http://localhost:4173/`: accessibility ≥ 95, performance ≥ 90 (there is no WebGL yet — if it is below 90 now, it will not survive Plan 2).

Fix anything that fails before committing.

- [ ] **Step 9: Full green check**

Run: `npm test && npm run build`
Expected: both pass. The copy-voice test from Task 2 still passes over the new components.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: compose the shell — the site now reads without any 3D

Phase 2 done: a recruiter can reach the name, the thesis, three projects,
the résumé, and the email without touching WebGL. The canvas in Plan 2 is
additive from here."
```

---

## Self-Review

**Spec coverage:** Spec §3 information architecture → Tasks 8–13 (Hero/About/Work/Skills/Experience/Contact) and the chat dock deferred to Plan 3, as scoped. §4 visual system → Task 5. §7 salvage/delete list → Task 2. §8 success criteria: "recruiter reaches the facts without 3D" → Task 14 Step 7–8; Lighthouse thresholds → Task 14 Step 8; "usable with WebGL disabled" → true by construction in this plan, re-verified in Plan 2. §6 chatbot → Plan 3. §5 3D → Plan 2.

**Type consistency:** `ContactFields`/`FieldErrors` are renamed in Task 2 Step 3 and consumed under those names in Task 13. `Stat`, `Project`, `SkillGroup`, `Role` are defined in Task 4 and used unchanged in Tasks 9–12. `NAV_ITEMS` is exported from `Nav.tsx` in Task 7 and referenced by its test in the same task; Plan 2 consumes it for the backdrop tint map.

**Known open items carried to the reviewer, not invented here:** three real `profile.stats` values, a `metric` per featured project, and screenshots at `public/shots/<slug>.webp`. The site ships correctly without all three.
