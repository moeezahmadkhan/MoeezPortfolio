# Evidence ledger

Every number that may appear on the site, and where it came from. Nothing enters
`copy.md` without a row here. Sources are `file:line`, a commit hash, or a named
PDF page — never "from memory".

Compiled 2026-08-27. Re-verify before any claim is edited.

Repo paths, once:

| Alias | Path | Public codename |
|---|---|---|
| `horusmoeez` | `~/Documents/projects/horusmoeez` | **Vanguard** (never "Horus") |
| `sumero-rewrite` | `~/sumero-rewrite` | **Sumero Health** / the assistant is **Ero** |
| `pawlyse` | `~/Documents/projects/pawlyse/app` | **Pawlyse** |
| `silmaril-ai` | `~/Documents/projects/silmaril-ai` | **Nexis** (never "Silmaril") |

`~/Documents/projects/sumero/health` is the **older archive**. All Sumero claims
come from `~/sumero-rewrite`.

---

## Contribution splits

Measured with `git shortlog -sne --all -- <dir>`. These govern how every claim is
worded. Re-run before editing any case study.

| Project / area | Moeez | Others |
|---|---|---|
| Vanguard, whole repo | **186** | 0 |
| Vanguard `apps/mlend` | 43 | 0 |
| Vanguard `apps/backend` | 43 | 0 |
| Vanguard `apps/frontend` | 50 | 0 |
| Sumero `mlend/` | **482** | 10 |
| Sumero `backend/` (FastAPI) | **148** | 13 |
| Sumero `live_probes/` (eval harness) | **54** | **0** |
| Sumero `tests/` | 14 | 0 |
| Sumero `src/` (NestJS API) | 204 | 123 — Talha 94, Hanaan 29 |
| Pawlyse `mlend/` | **38** | **0** |
| Pawlyse `apps/api` | 27 | 7 |
| Pawlyse `apps/dashboard` | 17 | 17 — ashan 11, Hanaan 6 |
| Nexis, whole repo | 122 | 80 — fizahkhalid 74, Umar 5, other 1 |
| Nexis `mlend/` (the ML service) | **10** | **41** — fizahkhalid |
| Nexis `backend/` | 41 | 50 |
| Nexis `frontend/` | 70 | 60 |

**Wording rules that follow from the table.** Vanguard: unqualified "I built".
Sumero: "I own the AI service and the evaluation harness"; the NestJS API is
shared — do not claim it alone. Pawlyse: "I am the mlend AI engineer" — the
research agent is entirely his; the dashboard is not. Nexis: never claim the
scoring architecture or the prompt library. Say the split.

---

## Publishing constraints

All four are NDA- or privacy-constrained. **No real screenshot ships.** Every
station is a reconstruction.

| Project | Constraint |
|---|---|
| Vanguard | Face crops are biometric data of real people. Gauges, counters and threshold bars only — never a recognisable face. |
| Nexis | Screenshots carry real company names, revenue, valuations. Invented but plausible companies only. |
| Sumero | Clinical chat and lab values. Show the mechanism, never a real conversation or biomarker. |
| Pawlyse | No pet or owner records. Marketing site at `pawlyse.com` is live and public; the product is not shown. |

---

## Vanguard — edge face recognition on a $200 TPU

**Source key:** `cfg` = `deploy/local/config.local.yaml`, `brief` =
`~/Documents/personal/portfolio-briefs/Vanguard-portfolio-brief.pdf`.

| Claim | Value | Source |
|---|---|---|
| Runs fully offline on an edge TPU | Sophon BM1688, ~$200 | brief p.1; `CLAUDE.md` "What this is" |
| Neural networks on device | 4 — YOLOv8n, YOLOv8-face, WHENet, ArcFace R50 | brief p.1 |
| Embedding dimension | 512 | `cfg` `faiss.dimension` |
| Candidates retrieved per query | 5 | `cfg` `faiss.top_k` |
| Match threshold, enrolled index | **0.45 cosine** | `apps/mlend/faiss_search.py:12` |
| Match threshold, unverified index | 0.5 cosine | `apps/mlend/faiss_search.py:74` |
| "Same person?" grouping bar | 0.65 cosine + temporal tiebreaker | `apps/mlend/tests/test_grouping_temporal.py:8` |
| Faces the camera found | **10,291** | brief p.2, `/activity` capture |
| Faces good enough to keep | **2,676 — 26.0%** | brief p.2 |
| Of survivors, matched to a known identity | 2,376 — 88.8% | brief p.2 |
| Strangers | 300 — 11.2% | brief p.2 |
| Enrolled / unverified identities | 14 / 165 | brief p.2, `/people` capture |
| Groups awaiting a human decision | 177 | brief p.2, `/enrolment` capture |
| Python pipeline | 51.7k lines | brief p.1 |
| Full system | 79.5k lines, Python + NestJS + React | brief p.1 |
| Pose limits **on the device** | yaw 12°, pitch 10°, roll 7° (WHENet) | `cfg:70` comment |
| Pose limits on a laptop | yaw 65°, pitch 55°, roll 35° (PnP fit) | `cfg` `pose_estimation` |
| Quality gates | 5 landmarks required, min face 70px, blur floor 100, min area ratio 0.02 | `cfg` `quality_filter`, `yolo` |
| Tracker | ByteTrack, track_thresh 0.2, buffer 90, match 0.8 | `cfg` `bytetrack` |
| ArcFace preprocessing reproduced by hand | `x / 127.5 - 1.0`, scale-then-offset | `CLAUDE.md` "The two model runtimes" |

**Do not publish 65° as the production yaw limit.** It is the laptop value. The
device runs 12°. The brief's own carousel line ("Yaw 76.7° against a 65° limit")
is from a local run and must be labelled as such or dropped.

### The failure, with both sides

| | |
|---|---|
| Before | Capture rate = frame rate. One Review Queue cluster held **208 detections** of one seated person, beside a dozen singletons of the same head. |
| Change | `DwellGate` — 10 captures per visit, sampled 1/sec, 30s max dwell, 60s absence gap. Suppression runs *before* the PNG encode, crop write, DB row and Kafka send, so a dropped detection costs one gate call. |
| After | Bounded at 10 per visit. |
| Source | `docs/specs/2026-08-05-dwell-gate-design.md`; `apps/mlend/modules/track_budget.py:24` (`DwellConfig`) |

### The better failure — the one to actually tell

Gate state lives in memory and the detector restarts by design. A synthetic
track-id counter that always started at `-1` handed the next unnamed visit the
same `-1` the previous process used. The backend clusters on
`track:<id>:<5-minute bucket>`, so **a restart inside one bucket merged two
unrelated people into one card.** Fixed with a random per-process seed counting
down from the int32 floor. The code names the tradeoff: before the gate, an
unnamed detection became a per-detection singleton — noisy, but never a wrong
merge, "which is the better failure of the two."

Source: `apps/mlend/modules/track_budget.py`, `_new_synthetic_track_seed`.

### Stated honestly, not measured

- **No timing instrumentation exists.** No fps, no per-stage milliseconds, no
  FAISS query latency anywhere in `yolo_detector.py`, `quality_checker.py` or
  `recognition.py`. Do not publish a latency or throughput number.
- **No FAR/FRR.** The 88.8% "known" is *the share that cleared 0.45* — not
  measured accuracy against a labelled set. Word it exactly that way.
- **No authentication anywhere**, and `/media` serves biometric crops with
  `Access-Control-Allow-Origin: *`. The repo's own README says so. Acceptable
  only on a trusted, firewalled network. This is a *strength* on the page — the
  system states its own limits.

---

## Sumero Health — the clinical assistant that gets graded

| Claim | Value | Source |
|---|---|---|
| Service split | NestJS API :3000 public; FastAPI mlend :8001 internal only, shared secret | `README.md` |
| Current stack | OpenRouter — `gemini-3.1-flash-lite` (main) + `llama-3.3-70b-instruct` (router) | `docs/SCORECARD.md` |
| Previous stack | local Gemma-4-31B-it Q4_K_M GGUF via llama-cpp, 8192 ctx | `Modelfile-gemma-4-31b` (archive repo) |
| **Triage router accuracy** | **174/187 = 93.0%** over 187 prompts | `ero_baseline_results.json`, computed |
| Dangerous miss rate (emergency → routine) | **3/103 = 2.9%** | same, computed |
| **Graded eval, June** | **214 prompts, 20 categories** — 124 pass / 58 partial / 32 fail = **57.9% pass**; 2 critical, 32 high | `eval/2026-06-16/graded_full.json`, computed |
| **Regression suite, August** | **179 cases** — 133 pass / 24 fail / 22 critical = **74.3% pass** | `docs/ERO-REGRESSION-FINDINGS-2026-08-13.md` |
| Safety battery | 31/31 pass, 2 Jul 2026 | `docs/SCORECARD.md` |
| Latency, 22 May 2026 — **STALE** | medians: greeting 5.14s · medical_short 8.68s · complex_reason 8.75s · today_data 10.19s · lab_interp 12.21s | `bench/results-after.json` |

**Two suites, not one delta.** June and August measure different prompt sets.
Write them as two measurements, never as "improved 16 points".

**The 22 open criticals go on the page.** Publishing your own unresolved
criticals is the strongest credibility move available and nobody else is doing it.

**"Ultra-low-latency" is banned** until the bench is re-run. The only latency
data in the repo is 5–12s medians. Runner: `bench_ero_latency.py` (written
2026-08-27; needs `BENCH_TOKEN` + the service up). **OPEN.**

### Fixes shipped, with the root cause

- **Disclaimer leak.** The model authored its own verbose footers. Three layers
  now enforce one canonical line: `_strip_authored_disclaimer` removes any
  non-canonical footer on both the stream and non-stream paths; the persona's
  STRICT OUTPUT POLICY tells the model not to write one; the app appends the
  single approved line.
- **Interview-boundary hijack.** *"by the way i started doing crossfit
  recently"* was pulled into a symptom intake. The preference-statement veto
  covered diet and status but not new-activity disclosures. Extended
  `_PREFERENCE_STATEMENT_RE` to exercise nouns. Symptom-paired disclosures
  ("started crossfit and my knee hurts") still interview.
- **Detector honesty.** The battery's first run reported 15 "leaky disclaimer"
  fails; all 15 were the *approved* footer matched by an over-strict detector.
  Fixed the detector, then re-ran for a true 31/31. Worth telling — it shows the
  harness itself gets audited.

Source for all three: `docs/SCORECARD.md`, Round 3.

---

## Pawlyse — a research agent with a wall clock

Moeez's role: **mlend AI engineer**. `mlend/` is 38 commits, 100% his.

| Claim | Value | Source |
|---|---|---|
| Model calls per research run | **up to 10** — plan, up to 3 web searches, critique, up to 2 gap searches, synthesis | `mlend/deep_research.py` docstring |
| With a clarify turn first | up to 13 | same |
| Wall-clock budget | 180s caller timeout − 30s synthesis reserve − 10s overhead ≈ **140s of research** | `mlend/research_budget.py:35,40,48` |
| Planned search angles | 6 | `deep_research.py:150` `PLAN_QUERY_COUNT` |
| Sub-queries / corpus hits each | 3 / 8 | `:61`, `:63` |
| Web queries per run | 3, plus 2 gap queries | `:162`, `:152` |
| Citations | max 6, of which max 4 from the web | `:66`, `:73` |
| Citation distance cutoff | **0.43** | `:93` `MAX_CITATION_DISTANCE` |
| Tests | 10 files, incl. `test_no_silent_sdk_retries.py`, `test_research_budget.py` | `mlend/tests/` |
| Deliberately off the default path | because of the call count | docstring |
| Nothing is logged | not the question, sub-queries, retrieved corpus, or answer — all four carry the owner's words or the pet's record | docstring |
| Marketing site live | `pawlyse.com` | user |

### The detail that carries the station

`memory_tombstones` — a fact the owner deletes gets a tombstone, so the
background extractor cannot re-create it and the assistant will not state it as
known. The entity comment scopes its own honesty: tombstones govern the memory
channel only; the same fact may still sit in chat history or inside a document,
and deleting a memory row does not rewrite those.

Source: `apps/api/src/modules/memory/infrastructure/entities/memory-tombstone.entity.ts`.

### The failure

`a9ff516 fix(mlend): five defects found driving deep research live` — ran it
live, found five. The two follow-ups say what kind of engineer found them:

- `af1d84f` raise on a content-free completion instead of serving it as an answer
- `95c5f76` never web-search a degraded plan, bound every stage by the budget

---

## Nexis — eleven weights, and a model you can swap

**Station four, last in scroll order.** The ML service was mostly a colleague's.

| Claim | Value | Source |
|---|---|---|
| Weighted dimensions | 11, fixed weights in code | `mlend/deal_scoring.py:37` |
| Exact weights | traction .11 · business .105 · market .10 · team .10 · unit_economics .10 · defensibility .10 · signals .075 · valuation .06 · peer_matching .09 · investor_readiness .08 · completeness .08 | same |
| Split | 75% core business / 25% structural & context | brief p.2 |
| Pipeline stages | 7 — ingest, extract, enrich, classify, gather evidence, sub-score ×11, weight & explain | brief p.1 |
| Prompt library | `mlend/prompts.py`, 944 lines | `wc -l` |
| Per-model cost tracking | gpt-4o-mini / gpt-4o / gpt-4.1-mini, with a separate cached-prompt rate | `mlend/ml_service.py:252` |
| Decks parsed | **100+** | user |
| Runtime per deck | ~2 minutes, **approximate — not measured** | user; brief p.1 |
| Production users | **none** — not production, no real investors or founders | user |

### What is actually his, and it is a real story

The model-portability and cost-accounting layer:

- `2f77927` support OpenAI-compatible gateways, model ids from env
- `498c0c9` route direct POSTs through the gateway, add reasoning control
- `2e286f5` survive model ids tiktoken does not recognise
- `cd370dc` enable on-demand scoring, env-driven
- `e7ea890` one root `.env` across three services · `5f5d411` callback secret required

Plus the frontend (70 of 130 commits) and half the NestJS API.

### What is not his — say so

The prompt library, the 11 rubrics, and the calibration work. The scores came
back generous, bunched at the top, and stopped separating deals; the client
noticed and the rubrics were re-cut twice in three days — `138e38c` (24 Sep
2025) and `9fe9bbb` (26 Sep 2025), both authored by a colleague. Good story,
**not his story.** The page says: built with one other engineer; the scoring
rubrics were theirs.

### Unverified

The brief claims a 16-prompt versioned library; a grep of module-level prompt
constants counts 14. Either recount or write "a versioned prompt library" with
no number.

---

## About, contact, and the CTA

| Field | Value |
|---|---|
| Booking | `https://cal.com/moeezahmadkhan/30min` — a 30-minute intro call |
| Email | `kmoeez2018@gmail.com` |
| Domain | `moeezahmadkhan.com` |
| GitHub | `github.com/moeezahmadkhan` — do **not** mention `EcomMcpSheetExtractor` |
| LinkedIn | `https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/` |
| CV | PDF, downloadable from the page |
| Availability | **Remote only** |
| Response commitment | **Within one working day** (not "instant" — a promise the page makes at 3am on a Sunday) |
| Post-click state | "Thanks" is acceptable; real text drafted in `copy.md` |
| Teaching | ITU, graduate-level Agentic AI — **40+ students, twice weekly** |
| Employment | Ecommerce Steem, AI Engineer, May 2026 – present. QUIDSol Nov 2025 – Jun 2026 (Vanguard, Nexis) |
| Education | BSCS, Information Technology University Lahore, 2021–2025 |

---

## Open items

1. **Sumero p95 on the current stack** — run `bench_ero_latency.py`. Blocks any
   latency claim.
2. **Nexis USD per scored deck** — optional. The cost-*accounting* story works
   without a dollar figure.
3. **Nexis prompt count** — 16 (brief) vs 14 (grep). Recount or drop the number.
4. **Before `horusmoeez` goes public** — rotate `DB_PASSWORD`,
   `SYNC_INGESTION_API_KEY`, `SYNC_COMMAND_API_KEY`, `CLOUD_INGESTION_API_KEY`;
   purge `ENVs/` and `frontend/.env.production.aibox` from history with
   `git filter-repo`; delete `legacy/horus-main/faiss_index/` (one real ArcFace
   template + name); check `apps/mlend/diagnostic_input_bgr.jpg` for a face.
