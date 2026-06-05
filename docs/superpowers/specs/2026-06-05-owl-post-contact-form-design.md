# Owl Post — Working Contact Form

**Date:** 2026-06-05
**Status:** Approved

## Goal

Turn the "Send an owl" (Owl Post) section into a real, working contact form that
emails Moeez each submission. The site is intentionally backend-free, so
submissions go straight from the browser to **Web3Forms**, which forwards them to
Moeez's inbox. The existing email / phone / location links and CV button stay as
secondary contact options beside the form.

## Decisions (from brainstorming)

- **Service:** Web3Forms (no backend, public access key).
- **Fields:** Name, Email, Message (minimal, low-friction).
- **Existing links:** Keep alongside the form (form is primary, links secondary).
- **Access key:** Provided; stored in a gitignored `.env` as `VITE_WEB3FORMS_KEY`,
  read via `import.meta.env`. (Web3Forms keys are designed to be public, so client
  exposure is fine.)
- **Success UX:** Inline themed confirmation — the form swaps in place to
  "Your owl is away — I'll reply soon."

## Architecture (all front-end)

Three pieces:

1. **`src/components/OwlPostForm.tsx`** (new) — form UI + submit logic. Three
   controlled fields, a submit button, and a state machine:
   `idle → submitting → success | error`. On success the form is replaced in
   place by a themed confirmation; on error an inline retry message appears with
   the direct email link as a fallback. Uses existing `Reveal` / framer-motion
   primitives to match the section's scroll-in feel. Paired with
   `OwlPostForm.css`.

2. **`src/components/owlPost.ts`** (new, pure module) — framework-free, testable
   logic:
   - `validate(fields): FieldErrors` — name non-empty, email matches a basic
     pattern, message non-empty.
   - `buildSubmission(fields, accessKey): Web3FormsPayload` — assembles the POST
     body: `access_key`, `name`, `email`, `message`, a derived `subject`
     (e.g. `New owl from <name>`), a `from_name`, and the `botcheck` honeypot
     field.

3. **Wiring** — `OwlPost()` in `src/components/Sections.tsx` renders
   `<OwlPostForm/>` between the lede and the existing `owl__links` block. The
   links and CV button are unchanged.

## Data flow

`OwlPostForm` holds field state in `useState`. On submit:
`validate()` gates → if clean, `buildSubmission()` builds the payload →
`fetch('https://api.web3forms.com/submit', { method: POST, json })` →
parse `{ success }` → set `success` or `error` state. Access key from
`import.meta.env.VITE_WEB3FORMS_KEY`.

## Config & secrets

- `frontend/.env` (gitignored) holds the real `VITE_WEB3FORMS_KEY`.
- `frontend/.env.example` (committed) documents the variable with a placeholder.
- Add `.env` / `.env.local` to `frontend/.gitignore`.

## Spam protection

Web3Forms' built-in honeypot: a visually hidden `botcheck` checkbox that bots
tick and humans don't. Zero UX cost.

## Error handling

- Client validation failure → inline per-field hints, no network call.
- Network / API failure (`success !== true` or thrown) → "The owl couldn't take
  flight — try again or email me directly," with the direct email link below.
- Missing key (dev only) → submit disabled, dev-only console note.

## Styling

`OwlPostForm.css` using existing design tokens (gold `#e7c27d`, ink `#07070d`,
rune-teal; Cinzel / Cormorant Garamond). Inputs styled as candlelit "parchment"
fields with a rune-teal underline-glow on focus; submit reuses `.btn--primary`.
Labels/placeholders in wizard voice ("Your name", "Where should the owl return?",
"Your message…"). Respects `prefers-reduced-motion` for the success transition.

## Testing & verification

- Unit tests (`owlPost.test.ts`, vitest — matching `scrollMath.test.ts` style) for
  `validate()` and `buildSubmission()`.
- `npm run build` (tsc gate) passes.
- Manual: a real submission with the live key confirms the email arrives.

## Out of scope (YAGNI)

- No subject/project-type fields, no file uploads, no submission archive, no
  multi-recipient routing, no reCAPTCHA (honeypot is sufficient at this scale).
