# Progressive Course Generation — Design

**Status:** Accepted, pending implementation
**Date:** 2026-08-22
**Supersedes:** the "generate everything, then reveal" module pipeline

---

## Problem

A measured run on a real 63-page ML textbook took **247.6s** to produce a
student's first visible content — worse than the ~2 minute baseline that
prompted the work, and on exactly the kind of dense STEM document the platform
exists to serve. Only 8 of 15 target modules survived the run.

### Why it was slow

Latency is dominated by **output token volume**. LLM generation time is roughly
linear in tokens emitted; retrieval is milliseconds, prompt size barely matters.

```
40k-char segment
  -> outline call: 15 modules                          (~15s)
  -> domain detected (computer_science)
  -> effectiveBatchSize = domain ? 2 : 3   ->  2        [moduleGenerator.js:293]
  -> 15 modules / 2 = 8 batches
  -> BATCH_CONCURRENCY = 5  ->  2 sequential waves
  -> each batch = 2 modules x (600-1200 words + 5 questions
                               with explanation + misconception)
                ~ 3-5k output tokens
  = 247.6s
```

Contributing causes, ranked:

1. **Volume.** ~15 modules x ~1000 words x 5 questions each is a small book per segment.
2. **Insert granularity is per-segment.** Nothing is visible until all 8 batches
   land, so time-to-first-visible equals total time.
3. **The pedagogy layer made volume worse.** Adding `outcome`, `bloomLevel`,
   retrieval-structured content and a `misconception` per question increased
   output per module by roughly 30-40%. Good teaching, bad latency; it shipped
   without being measured.
4. **Domain mode halves batch size** (3 -> 2) to dodge output token limits, but
   the cap was since raised to 16384, leaving that guard over-tuned and doubling
   the batch count.
5. **Concurrency 5 < 8 batches** forces two waves where one would do. The key
   pool supports ~225 concurrent.

### Key insight: grounding is not what costs time

Grounding lives on the **input** side (the full segment is passed to every batch,
so every module is written from the student's real document). Latency lives on
the **output** side. They are independent, so grounding can stay at 100% while
generation gets faster. No tradeoff is required.

---

## Target shape

```
t~0      Upload acked                            (already <1s)
t~1-2s   Structural page index -> CHAT READY     (already shipped)
t~3-5s   MODULE 0 lands - orientation module     -> something real to read
t~15s    Outline lands -> 15 skeleton modules    -> FULL COURSE MAP visible
t~15-60s Content fills batch-by-batch, demand-ordered
         (student clicks module 7 -> it jumps the queue)
later    Module 0 regenerates, grounded in the finished course
on open  Full quiz generates, distractors mined from that student's errors
```

Module 0 and the outline fire in parallel at t~2s. Module 0 wins because its
output is tiny, so the student is reading before the map appears.

### Projected effect

| Lever | Change | Effect |
|---|---|---|
| Module length | 600-1200 -> 300-500 default | ~60% fewer content tokens |
| Questions | 5 -> 1 inline | ~80% fewer question tokens |
| Batch size | 2 -> 3 (16384 cap makes old guard obsolete) | 8 batches -> 5 |
| Concurrency | 5 -> 8 | 2 waves -> 1 wave |

### Measured result

Benchmarked on the same 63-page ML textbook that produced the 247.6s baseline:

| Milestone | Before | After |
|---|---|---|
| First readable content (Module 0) | — | **2.3s** |
| Course map visible | 247.6s | **5.1s** |
| All content generated | 247.6s | **22.3s** |
| Modules produced | 8 of 15 (lossy) | **21 of 21, zero failures** |

Quality held: average 495 words per module (target 300-500), 21/21 carry an
outcome and Bloom tag, quiz option lengths measured at 19/24/28/23 characters
(no length tell), and the orientation module correctly hedged ("appears to
offer") rather than asserting facts.

### The finding that actually mattered: thinking tokens

The dominant cause was not volume, batching or concurrency. It was that
**gemini-2.5-flash is a reasoning model whose thinking tokens count against
`maxOutputTokens`**.

A measured batch returned `finishReason: MAX_TOKENS` having emitted only ~669
visible tokens against a 16384 budget — the remainder was consumed by internal
reasoning. Every batch therefore truncated mid-JSON, failed to parse, and
retried, turning a ~25s batch into ~148s.

Two changes fixed it, both measured rather than assumed:

| Configuration | Time | Finish | Modules parsed |
|---|---|---|---|
| `fast`, default thinking | 68.9s | MAX_TOKENS | 0 of 3 |
| `fast` + `thinkingBudget: 0` | 67.7s | STOP | 2 of 3 |
| `fast_lite` (no reasoning) | **15.7s** | STOP | **3 of 3** |

Structured extraction does not benefit from reasoning before answering, so
disabling it is close to free. Raising `maxOutputTokens` alone — the obvious
first move, and the one taken before measuring — does not help, because thinking
expands to fill whatever budget it is given.

---

## Decision log

### 1. Skeleton-first

All module titles from the outline are persisted immediately as a full course
map; content fills in underneath.

*Alternatives:* wait for one complete module before showing anything; show map
and first module together.
*Why:* the outline call already completes at ~15s and its result was being
thrown away. Persisting it is nearly free and gives the student the map — the
sense of where they are going — before any content exists.

### 2. Adaptive module length

300-500 words by default and for focus-mode / slow-pace learners; 600-1200 only
for advanced learners who have earned depth. Driven by existing `buildLearnerState`.

*Alternatives:* uniformly short; keep 600-1200 for STEM; layered core + expandable.
*Why:* content is ~50% of output tokens, so this is the single largest latency
lever. It is also better pedagogy for this platform's core audience — a 1200-word
wall of text is the failure mode StudyRAG exists to fix. The default path (new
upload, unknown learner) is therefore also the fast path.

### 3. Split questions: 1 inline now, full quiz lazy

One recall question ships with the module; the full 5-question quiz generates
when the student opens it.

*Alternatives:* all 5 eagerly (current); fully lazy; lazy with background pre-warm.
*Why:* questions are ~40% of output tokens and most are never seen. Keeping one
inline preserves the retrieval-practice loop. Deferring the rest is also
*pedagogically better*: at quiz time the learner model is richer, so distractors
can be built from that student's actual past mistakes rather than generic wrong
answers.

### 4. Jump queue + outline meanwhile

Clicking an unfilled module shows its outline detail immediately and bumps it to
the front of the generation queue.

*Alternatives:* lock until ready; outline detail only; queue jump only.
*Why:* student attention becomes the scheduling signal, so nobody waits on
modules they do not care about, and there is always something to read.

### 5. Code-first diagrams; images = paid AND spatial

Mermaid/D2 by default. Image generation only when the content is genuinely
spatial/anatomical **and** the user is on a paid tier.

*Alternatives:* drop image gen entirely; images for any paid request; upsell prompt.
*Why:* Gemini image generation left the free tier. Code-rendered diagrams are
free, ~10x faster (text not pixels), deterministic, accessible, themeable, and
avoid the garbled-text failure mode of AI image models — which is disqualifying
for a study diagram. The exception is anatomy/spatial realism, which matters to
medical users, so that is preserved behind the paid tier.
*Note:* `diagramGenerationService` already contains D2 CLI support, Mermaid
generation, a type-selector prompt and an image->mermaid fallback. The current
waste is trying image-gen first, failing, and falling back anyway.

### 6. Module 0 is permanent, upgraded later

Ships fast and cheap immediately so there is something to read, then quietly
regenerates once all modules exist so the surviving version is grounded in the
finished course.

*Alternatives:* transient scaffolding; permanent as-is; merge with the map.
*Why:* a returning student still gets orientation, and the throwaway-quality
first pass never becomes the permanent artifact.

### 7. Module 0 is orientation-only; asserting facts is forbidden

Generated from document title + derived headers. The prompt constrains it to
orientation ("this course covers X, here is the path, here is why it matters")
and explicitly forbids asserting subject facts not present in the document.

*Alternatives:* unconstrained title+header synthesis; add a page sample; label
parametric content as background.
*Why:* generating from the model's parametric knowledge is precisely what RAG
exists to prevent, and it fails *invisibly* — confident, fluent, wrong — on the
lecturer slide decks, local course packs and personal notes that make up much of
the real user base. Constraining output to orientation keeps the speed while
removing nearly all hallucination risk: the module cannot be wrong about facts it
is forbidden to state. Title and headers are themselves document-derived, so
structure remains grounded.

### 8. Backfill existing modules

Backfill `outcome` / `bloom_level` for the 1251 existing modules rather than
enriching only on rewrite.

### 9. Web-first

Skeleton/progressive UX ships on web first; mobile follows in a later pass.

### 10. Drop `GEMINI_API_KEY_3`

Confirmed dead (1 of 15 in the pool). Every request landing on it burns a retry
before falling back, adding latency for real users.

---

## Mechanics

### order_index collisions are eliminated, not managed

Per-batch insert was previously deferred as risky because out-of-order `INSERT`s
collide on `order_index`. Skeleton-first removes the problem entirely: all rows
are inserted **once, upfront, in correct order**, and batches then perform
`UPDATE ... WHERE id = ?`. There are no concurrent inserts, so there is no
collision.

### Data model (additive)

```
modules.content_status   'pending' | 'ready' | 'failed'
modules.order_index      0 = intro module, 1..N = real modules
```

A skeleton row carries `title`, `topic` and `objectives` (from the outline
description) with `content_status = 'pending'`. Batch completion flips it to
`'ready'`.

### API

`POST /modules/:id/prioritize` — move a module to the front of the fill queue.

### Frontend (web)

Pending modules render from their outline detail plus a "being written" state.
Existing module polling already picks up the fill, so no new polling machinery is
required.

---

## Risks

1. **Stuck skeletons.** If a batch dies, its rows remain `pending` indefinitely.
   Requires a timeout to `failed` plus a retry affordance. This is the main new
   failure mode being introduced.
2. **Backfill cost.** 1251 modules, batched ~20 per call on `fast_lite` (~60
   calls, tiny outputs). Cheap, but it is a one-off background script against
   live data. It writes only to currently-null columns.
3. **Jump-queue starvation** if a student clicks around rapidly; the queue must
   still drain in order behind any prioritized item.
4. **Projections may be wrong.** See the caveat above; every number here needs
   to be re-benchmarked against a real dense STEM document.

---

## Non-goals

- Sub-second full course generation (not physically possible with LLMs).
- Trading citation/grounding fidelity for speed.
- Changing the RAG retrieval path — already fast (2.0s page-select, 4.3s first
  token).
