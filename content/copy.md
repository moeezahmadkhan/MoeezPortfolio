# Site copy

Every number here has a row in `evidence-ledger.md`. Sentence case throughout.
Active voice on every control label. No placeholders.

Status: hero approved · Vanguard drafted · Sumero, Pawlyse, Nexis, About, CTA pending.

---

## Hero

> ## Moeez Ahmad Khan
> AI/ML engineer · Lahore · remote
>
> **I ship models that get measured, not demoed.**
>
> A face pipeline that publishes why it rejected 74% of what it saw. A clinical
> assistant graded on 214 prompts, with 22 criticals still open. A research agent
> that stops at 140 seconds whether or not it is finished.

Controls: `Book a 30-minute call` · `Email me` · `View GitHub`

---

## Station 1 — Vanguard

**Eyebrow:** Edge computer vision · Sophon BM1688 · solo build

**Headline:** 10,291 faces seen. 2,676 good enough to trust.

**Body:**

Cameras watch a workspace. An edge box with no internet detects every face,
measures whether that face is good enough to trust, and only then matches it
against an enrolled identity. The output is an attendance record nobody had to
clock in for.

Face recognition demos are easy. Face recognition that runs all night on a $200
TPU, on people walking past at an angle, fails constantly. So the product is
built around the failure rather than around the match: of 10,291 faces the
camera found, 2,676 cleared the quality gate. That 26% survival rate is the main
screen, not a footnote. Every rejected face shows the measurement that killed it
and the limit it was measured against, and an operator who thinks the system is
missing people can move that limit and watch the numbers move.

Four networks run on the device — YOLOv8n, YOLOv8-face, WHENet, ArcFace R50 —
chained through Kafka across three processes into one Postgres. A face reaches an
identity only by passing every gate in order.

**The constraint:** no public ONNX export exists for WHENet or YOLOv8-face. The
same code has to run on the device's TPU and on a laptop, so I reproduced the
device's preprocessing step for step — including ArcFace's `x / 127.5 - 1.0`,
scale-then-offset, not `(x - 127.5) / 128`. Where a substitute model stands in,
the config says so in comments and states that thresholds tuned there do not
transfer. Naming the TPU without the SDK fails loudly rather than falling back to
CPU, because a silent fallback looks like a working TPU running orders of
magnitude slower.

**What went wrong:** gate state lives in memory and the detector restarts by
design. My synthetic track-id counter always started at −1, so the first unnamed
visit after a restart got the same −1 as the last one before it. The backend
clusters on `track:<id>:<5-minute bucket>` — so a restart inside one bucket
merged two unrelated people into one person. I replaced the counter with a random
per-process seed counting down from the int32 floor. Before the gate existed, an
unnamed detection became its own singleton: noisy, but never a wrong merge. That
is the better failure of the two, and the fix chose it deliberately.

**Stats row:**

| 4 | 512 | 0.45 | 26.0% |
|---|---|---|---|
| networks on device | ArcFace dimension | cosine match threshold | of faces cleared the gate |

**Said plainly:** 88.8% of survivors matched a known identity. That is the share
that cleared the 0.45 threshold, not measured accuracy against a labelled set —
I never ran that evaluation. The pipeline carries no timing instrumentation
either, so I have no throughput figure to quote. The system also ships with no
authentication and serves face crops openly; its own README says so, and it
belongs only on a trusted, firewalled network.

**Role:** solo. 186 commits across the Python pipeline, the NestJS API and the
React console.

**Control label:** `Open the rejection detail`

---

## Station 2 — Sumero Health

**Eyebrow:** Clinical LLM · evaluation harness · I own the AI service

**Headline:** 214 prompts graded. 22 criticals still open.

**Body:**

Ero is the assistant inside Sumero Health. It reads a member's lab panels and
wearable data and answers questions about them. The hard part is not the answer.
It is deciding, before answering, whether this message is an emergency, whether
it needs an intake interview, and whether the record actually contains what the
answer is about to claim.

So the first thing I built after the assistant was the thing that grades it. A
router sorts every message into emergency, urgent or routine — 174 of 187 test
prompts correctly, and the miss that matters, an emergency read as routine,
happens in 3 of 103 emergency prompts. A 214-prompt graded set across 20
categories put the assistant at 124 pass, 58 partial, 32 fail in June. A
179-case regression suite in August, written to attack the specific things that
broke, put it at 133 pass, 24 fail, 22 critical.

The 22 are still open. They are listed in the repository, with the failing
prompt, the delivered answer and the assertion it violated.

**The constraint:** clinical safety, on a stack where the model is not the last
word. The public API and the AI service are separate processes; port 8001 is
never exposed, and every call into it carries a shared secret. Answers pass
through deterministic scrubbers before a member sees them.

**What went wrong:** three things, in one round.

The model started authoring its own disclaimers — verbose, redundant footers
under every answer. I now strip any non-canonical footer deterministically on
both the streaming and non-streaming paths, tell the model in the persona not to
write one, and append a single approved line in the application.

Then a boundary bug: *"by the way i started doing crossfit recently"* was pulled
into a symptom intake, and the assistant asked about discomfort during those
sessions. The preference-statement veto covered diet and status but not
new-activity disclosures, so they fell through to the coaching catch-all. I
extended it to cover exercise. A symptom-paired disclosure — "started crossfit
and my knee hurts" — still interviews, because the veto only fires after every
symptom tier.

The third was my harness lying to me. The battery's first run reported 15 leaky
disclaimers. All 15 were the approved footer, matched by a detector that required
an italics wrapper the model does not write. I fixed the detector before I fixed
anything else, then re-ran for a true 31 of 31.

**Stats row:**

| 93.0% | 2.9% | 214 | 22 |
|---|---|---|---|
| triage router accuracy | emergency read as routine | prompts in the graded set | criticals still open |

**Said plainly:** the June and August numbers measure different prompt sets, so
they are two measurements, not a 16-point improvement — I will not write it as
one. I have not re-measured latency since the stack moved to OpenRouter; the last
numbers I trust are May medians between 5 and 12 seconds, and I would rather
publish that than an adjective. The NestJS API is shared work — I wrote most of
it, not all of it. The AI service and the evaluation harness are mine.

**Role:** 482 of 492 commits in the AI service. All 54 in the evaluation
harness. 204 of 327 in the public API, alongside two colleagues.

**Control label:** `Read a failing case`

---

## Station 3 — Pawlyse

**Eyebrow:** Research agent · I am the mlend AI engineer

**Headline:** Ten model calls, 140 seconds, six citations.

**Body:**

A normal question to Pawlyse retrieves once and answers. Some questions deserve
more than that, so there is a second path that behaves like a researcher instead
of a lookup.

It plans six search angles with a cheap helper model, retrieves each from the
pet's own record and from the live web, asks the helper what is still missing,
retrieves that gap, and only then answers over the union with the main model —
reporting what it drew on. Up to ten model calls, thirteen if it asks a
clarifying question first.

That cost is why the path is off by default, and why it runs against a clock.
The caller times out at 180 seconds, synthesis reserves 30 of those and overhead
takes 10, which leaves about 140 seconds of actual research. Every stage is
bounded by what remains. When the budget runs out, the answer is written from
what was gathered, not extended until something breaks.

Answers carry at most six citations, at most four of them from the web, and
nothing is cited past a cosine distance of 0.43. Nothing in this path is logged —
not the question, not the sub-queries, not the retrieved record, not the answer.
All four carry the owner's words or the animal's medical record.

**The constraint:** a fact the owner deletes has to stay deleted. A background
extractor reads chat and writes durable facts, which means deleting one only
works until the extractor sees the same message again. Deleted facts get a
tombstone, so the extractor cannot re-create them and the assistant will not
state them as known. The scope is written into the code rather than implied:
tombstones govern the memory channel only. The same fact may still sit in chat
history or inside a document, and removing a memory does not rewrite those.

**What went wrong:** I drove the research path live and it broke five ways in one
session. Two of the fixes are the ones I would show anybody. The service was
serving content-free completions as answers — an empty response from the model
became an empty answer to the owner — so it now raises instead. And it would run
web searches against a plan that had already degraded, spending budget to enrich
something it had no confidence in. It no longer does.

**Stats row:**

| 10 | 140s | 0.43 | 6 |
|---|---|---|---|
| model calls per run | research budget | citation distance cutoff | citations, max 4 from the web |

**Said plainly:** the product holds no real pet records I can show, so nothing
here is a screenshot of a live account. The marketing site is public at
pawlyse.com; the application is not. I own the ML service. The dashboard is a
colleague's work.

**Role:** all 38 commits in the ML service.

**Control label:** `Watch a research run spend its budget`

---

## Station 4 — Nexis

**Eyebrow:** LLM scoring · built with one other engineer

**Headline:** The composite is arithmetic. Only the parts are learned.

**Body:**

Nexis reads a pitch deck and turns it into a scored, comparable deal record.
Anyone can ask a model to score a startup; the number that comes back is a vibe.
This one is decomposed instead: eleven dimensions, each scored by its own call
against its own rubric, then combined by fixed weights written in code. The model
never produces the total. Traction is 11%, business model 10.5%, market, team,
unit economics and defensibility 10% each, and a quarter of the score is
structural — including completeness, so a deck that cannot be read costs itself
points.

I did not write those rubrics. I made them portable.

Every model id in the seven-stage pipeline reads from the environment, and the
service speaks to any OpenAI-compatible gateway rather than one vendor — so a
stage can move from GPT-4.1 to something cheaper without touching a prompt. Cost
is tracked per model with a separate rate for cached prompt tokens, which means a
scoring run has a known price rather than an estimated one.

**The constraint:** cost accounting had to survive models it had never heard of.
The moment ids came from the environment, a gateway-namespaced name reached a
tokenizer that did not recognise it and took the run down with it. Token counting
now degrades instead of raising, so an unknown model costs you a cost figure, not
a scoring run.

**What went wrong, and whose it was:** the scores came back generous. They
bunched near the top and stopped separating deals, which is the failure mode of
every LLM judge given a rubric and no calibration. The client noticed before we
did, and the rubrics were re-cut twice in three days. That work was my
colleague's, not mine, and the fix lives in prompts I did not write.

**Stats row:**

| 11 | 7 | 100+ | 0 |
|---|---|---|---|
| weighted dimensions | pipeline stages | decks parsed | production users |

**Said plainly:** this never reached production and no investor or founder used
it. A deck takes roughly two minutes end to end — approximately, not measured. I
built it with one other engineer: they owned the scoring rubrics and most of the
ML service; I owned the model-routing layer, the console, and half the API. It
sits last on this page for that reason.

**Role:** 122 of 202 commits. 10 of 51 in the ML service. 70 of 130 in the
console.

**Control label:** `See the weights`

---

## About

I am an AI/ML engineer in Lahore, working remotely. I build the parts of a
system that decide whether a model's output is good enough to act on — quality
gates, routers, evaluation harnesses, budgets, and the interfaces that let a
non-engineer see why the machine did what it did.

The pattern across everything above is refusal. A face that fails a gate does not
reach an identity. A content-free completion raises instead of becoming an
answer. A degraded plan does not get a web search. A deleted fact does not come
back. A restart mints a new id rather than reusing one, because a noisy singleton
is a better failure than a wrong merge.

I have taught this too. At Information Technology University I ran graduate-level
Agentic AI sessions twice a week for a cohort of 40+, on multi-agent
orchestration and RAG deployment, and reviewed student systems for whether they
would survive production rather than whether they demoed well. I studied there
too — BSCS, 2021 to 2025.

Currently AI engineer at Ecommerce Steem. Before that, QUIDSol, where Vanguard
and Nexis were built.

---

## CTA

**Headline:** Book 30 minutes.

**Body:** If you are hiring for AI/ML work and want to talk through any of the
systems above — including the parts that do not work yet — pick a time. Remote
only. I reply within one working day.

**Controls:**

- `Book a 30-minute call` → https://cal.com/moeezahmadkhan/30min
- `Email kmoeez2018@gmail.com`
- `View GitHub` → https://github.com/moeezahmadkhan
- `View LinkedIn` → https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/
- `Download CV (PDF)`

**Post-click state:**

> Thanks — that is booked. You will get a calendar invite at the address you
> gave. If you want to arrive with something specific, reply to the invite and
> tell me which system you want to open up; I will have the repository ready.

**Fallback, if the booking widget fails to load:**

> The booking widget did not load. Email kmoeez2018@gmail.com and I will send
> times — within one working day.
