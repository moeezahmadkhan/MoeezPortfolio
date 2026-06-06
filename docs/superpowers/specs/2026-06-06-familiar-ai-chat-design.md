# Design — "Ask My Familiar" (The Talking Grimoire AI Chat)

**Date:** 2026-06-06
**Status:** Approved (brainstorming complete)
**Author:** Moeez Ahmad Khan (with Claude)

## Summary

An in-character AI chatbot for the wizard-themed portfolio: **"The Talking Grimoire."**
A visitor (primarily recruiters/clients) clicks an enchanted book in the page corner and
chats with **the Familiar** — a magical companion that speaks *about* its master, Moeez,
answering questions about his skills, projects, experience, and availability, and gently
steering interested visitors toward contacting him.

The OpenRouter API key is kept **server-side** behind a Vercel serverless function; the
browser never sees it.

## Goals

- Convert portfolio visitors into leads (the primary purpose is **getting clients**).
- Answer recruiter/client questions accurately and in an on-theme, memorable voice.
- Keep the OpenRouter key secret on a publicly deployed site.
- Stay lean — no RAG/vector store; the knowledge base fits in a system prompt.

## Non-Goals

- General-purpose chat (HP lore, essay-writing, weather, etc.) — explicitly out of scope.
- RAG / embeddings / vector retrieval (revisit later only if the knowledge base grows).
- Streaming responses in v1 (noted as a future enhancement).
- Durable/distributed rate limiting in v1 (in-memory, best-effort to start).

## Key Decisions (from brainstorming)

| # | Decision |
|---|----------|
| Purpose | "Ask My Familiar" — Q&A about Moeez, tuned for recruiters/clients. |
| Key handling | Vercel serverless proxy. Key only in local gitignored `.env` + Vercel env vars. Never committed, logged, or shipped to the client. |
| Knowledge | Curated persona/system prompt (lean). Facts sourced from `src/data.ts` + the CV PDF. No RAG. |
| Voice | **The Familiar** — third person about "my master Moeez." Handles unknowns gracefully ("my master hasn't told me…"). |
| Model | Free **Kimi K2.6** via OpenRouter, as a single config constant (swappable to a paid backup like Haiku 4.5). |
| Launcher UI | **The Talking Grimoire** — an enchanted book button, fixed bottom-right. |
| Chat UI | **Corner Panel** — compact parchment book-panel; portfolio stays visible behind; collapses to a near-full-screen sheet on mobile. |
| Guardrails | Topic-scoped (Moeez only); in-character deflection of off-topic asks. |
| Abuse protection | Per-IP rate limit (~15/min, ~60/hr, in-memory), max message length + max conversation turns, graceful fallback on error/limit. |
| Lead capture | **Medium** — answer first, then a relevant in-character nudge; persistent "🦉 Owl my master" CTA; escalates when intent is signalled. |

## Architecture

```
Browser (Grimoire panel, React state — outside the R3F Canvas tree)
   │  POST /api/familiar   { messages: [{role, content}, ...] }
   ▼
Vercel Serverless Function   (api/familiar.ts)
   • per-IP rate limit (in-memory Map)
   • validate + cap input (message length, conversation turns)
   • build request via shared core; inject persona system prompt
   │  fetch → OpenRouter (Authorization: Bearer OPENROUTER_API_KEY from env)
   ▼
OpenRouter → free Kimi K2.6 → reply text
   ▲ on error / rate-limit / model-busy → graceful in-character fallback
   ▼
Browser renders the Familiar's reply in the panel
```

- **Same-origin**: Vercel serves both the static site and `/api/*`, so no CORS config needed.
- The chat is plain React state. It lives **outside** the WebGL `<Canvas>` tree, so its
  re-renders never touch the 3D scene (which reads the `scrollState` singleton in `useFrame`).

## Components / Files

### Backend (new `api/` directory inside the Vercel root — `frontend/api/`)

> The Vercel project's **Root Directory** is set to `frontend/` (where `package.json` +
> `vite.config.ts` live). Vercel's serverless functions convention is therefore
> `frontend/api/*`. Paths below are relative to `frontend/`.

- **`api/familiar.ts`** — the Vercel serverless handler. Responsibilities: parse the request
  body, apply per-IP rate limiting, delegate to the core, return JSON (`{ reply }` or an
  error with a fallback message). Reads `OPENROUTER_API_KEY` from `process.env`.
- **`api/_core/familiar.ts`** — *framework-agnostic* logic (no `req`/`res`): input validation,
  length/turn caps, builds the OpenRouter chat-completions request body, selects the model,
  performs the `fetch`, normalizes the response/errors. Pure and unit-testable by mocking
  `fetch`. This is the single source of truth reused by both the Vercel handler and the
  local Vite dev middleware.
- **`api/_core/persona.ts`** — exports the system prompt string (the Familiar's identity,
  third-person voice rules, scope guardrail, Medium lead-capture behavior, fallback voice)
  plus the model constant and caps. Facts compiled from `src/data.ts` content + the CV PDF.

> Files prefixed `_` under `api/` are treated by Vercel as non-route helpers (not exposed as
> endpoints). `/api/familiar` is the only public endpoint.

### Frontend (under `src/`)

- **`components/GrimoireChat.tsx`** + **`components/GrimoireChat.css`** — the corner book
  launcher and the parchment chat panel: greeting, tappable starter-question chips, message
  list, typing indicator ("consulting the grimoire…"), text input, and a persistent
  "🦉 Owl my master" CTA that links/scrolls to the Owl Post contact section. Uses your real
  design tokens (Cinzel / Cormorant Garamond / JetBrains Mono, ink/gold/teal) and a book-open
  animation. Mobile: panel expands to a near-full-screen sheet.
- **`components/familiarClient.ts`** — thin client: holds the conversation array, enforces
  client-side caps, POSTs to `/api/familiar`, and maps errors to the fallback message.
  Testable in isolation (mock `fetch`).
- **`data.ts`** — add the Familiar's greeting and starter questions here (content lives in
  `data.ts` per repo convention), e.g. "His best projects?", "Fit for my role?", "Tech stack?".
- **`App.tsx`** — mount `<GrimoireChat />` alongside the existing overlays (`Cursor`,
  `ScrollRail`).

### Local development

- **Production:** Vercel auto-runs `api/familiar.ts`.
- **Local:** a small **dev-only Vite middleware plugin** in `vite.config.ts` mounts the same
  handler at `/api/familiar`, reusing `api/_core/familiar.ts`. This keeps `npm run dev`
  working unchanged — no need to switch to `vercel dev`. The plugin reads the key from the
  local `.env` (gitignored).

## Configuration & Secrets

- `OPENROUTER_API_KEY` — set in **(1)** local `frontend/.env` (gitignored) and **(2)** Vercel
  project env vars. Nowhere else. Not `VITE_`-prefixed (must stay server-side).
- `.env.example` updated to document `OPENROUTER_API_KEY=` (placeholder only).
- Model id and caps live as constants in `api/_core/persona.ts` for one-line swaps.
- **Rotation:** the key shared during brainstorming should be rotated once after wiring
  (generate a fresh key, paste into local `.env` + Vercel), with a low/zero paid credit
  balance or spend cap as a backstop.

## Guardrails & Abuse Protection

- **Topic scope:** system prompt restricts answers to Moeez and his work, plus light
  wizarding banter; off-topic requests get an in-character deflection.
- **Per-IP rate limit:** ~15 messages/min and ~60/hour via a module-level in-memory `Map`
  in the serverless function. Best-effort — resets on cold start, not shared across
  instances. Acceptable for v1.
- **Input caps:** maximum single-message length and maximum number of conversation turns
  forwarded to the model, bounding token spend.
- **Graceful fallback:** any error, rate-limit, or model-unavailable condition returns a
  friendly in-character message ("The Familiar rests… owl my master directly") with the CTA.

## Lead Capture (Medium)

1. Answer the visitor's actual question first — never lead with a pitch.
2. After a substantive answer, add a light, relevant in-character nudge **only when it fits**.
3. Persistent "🦉 Owl my master" button in the panel footer (one tap to contact).
4. On explicit intent ("are you available?", "how do I hire him?"), escalate to a warm pitch
   and direct to the Owl Post contact form.

## Error Handling

- Network/upstream errors → fallback message (never surface raw errors or stack traces).
- Rate-limited (429 from our limiter or OpenRouter) → in-character "resting" message.
- Empty/invalid input → ignored client-side; oversized input → rejected with a gentle note.
- The key is never included in any response or log line.

## Testing (vitest — already configured)

- `api/_core/familiar.ts`: builds the correct request body (model, persona system message
  injected first, caps applied); maps upstream errors to fallback.
- Rate-limiter logic: allows under-limit, blocks over-limit, windows reset.
- Input validation: rejects oversized messages, trims conversation to the turn cap.
- `familiarClient.ts`: conversation accumulation, client-side caps, error → fallback mapping.
- All pure logic, mocking `fetch`; no 3D involved. `npm run build` (tsc) remains the type gate.

## Future Enhancements (out of scope for v1)

- Streaming responses (SSE / edge runtime) for token-by-token typing.
- Durable rate limiting (Vercel KV / Edge Config) shared across instances.
- RAG showcase (FAISS/embeddings) if the knowledge base outgrows a system prompt.
- Conversation analytics / lead logging.

## Model Strategy — as built (updated during implementation)

The account is OpenRouter **free-tier with no credits**, and the planned single slug
`moonshotai/kimi-k2:free` does not exist. The correct free K2.6 slug is
`moonshotai/kimi-k2.6:free`, but its upstream provider is frequently rate-limited (429).
To keep the Familiar answering for visitors without spending money, the implementation
uses a **cascade of free models** (`api/_core/persona.ts` → `MODELS`), trying each in order
and returning the first real answer:

1. `moonshotai/kimi-k2.6:free` (primary — your pick)
2. `z-ai/glm-4.5-air:free`
3. `openai/gpt-oss-120b:free`
4. `nvidia/nemotron-3-super-120b-a12b:free`
5. `meta-llama/llama-3.3-70b-instruct:free`
6. `qwen/qwen3-next-80b-a3b-instruct:free`

Only if **all** fail does it return the static fallback. To go fully reliable later, add
OpenRouter credits and put a paid model at the top of `MODELS`.

> Implementation note: OpenRouter (and all HTTP) header values must be Latin-1. The
> `X-Title` header must stay ASCII — an em-dash there throws in Node's `fetch` before the
> request is sent. A regression test guards this.

## Deploy notes (Vercel)

- Set the Vercel project **Root Directory** to `frontend/`.
- Add env var `OPENROUTER_API_KEY` in Vercel → Settings → Environment Variables
  (Production + Preview). Do NOT prefix with `VITE_`.
- `frontend/api/familiar.ts` is auto-detected as a serverless function at `/api/familiar`.
- After first deploy, **rotate** the OpenRouter key (the brainstorming-shared key is
  exposed) and keep a low/zero paid credit balance as a backstop.
