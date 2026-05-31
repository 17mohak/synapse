# Synapse — Project Brief

> A mechanistic-interpretability tool that lets you watch a transformer think.
> Scoped ruthlessly for one student, one semester, while proving deep understanding
> of transformer internals.

---

## 1. Project Vision and Goals

**Vision.** Make the internal computation of a language model *visible and legible*. Synapse
takes a real transformer (GPT-2 small), runs it on a prompt, and renders what happens inside:
how the prediction assembles itself layer by layer, and which earlier tokens each token
attends to.

**Goals (in priority order):**
1. **Prove understanding.** The project must demonstrate that the author understands the
   transformer forward pass at the level of the residual stream, attention, layernorm, and
   the unembedding — not at the level of `model.generate()`.
2. **Produce one unforgettable demo.** The logit-lens view — watching "Paris" surface across
   layers — must be genuinely striking in under 30 seconds.
3. **Be finishable.** A single student must be able to ship the MVP. Scope is cut to protect
   this.

**Explicit non-goal:** novelty of *research*. Synapse re-implements known, published
techniques (logit lens, attention analysis). The contribution is a clean, interactive tool
plus the author's demonstrated understanding — not a new interpretability result.

---

## 2. Target User

**Primary (the one that matters): a technical interviewer / hiring manager at an ML team.**
They will spend 3–5 minutes with the live demo and 20–30 minutes asking the author to explain
how it works. The project succeeds if it survives that conversation and leaves them thinking
"this person understands transformers."

**Secondary: ML learners.** Someone studying transformers who wants to *see* the abstractions
(residual stream, attention heads) instead of only reading about them.

**Not a target:** interpretability researchers needing a production tool. Synapse is a
learning/demo artifact, not a competitor to TransformerLens or Neuronpedia.

---

## 3. Core Value Proposition

> Most ML portfolio projects call `.fit()` and `.predict()` and show a metric. Synapse opens
> the model up and shows the machinery moving. It is the difference between *using* a
> transformer and *understanding* one — made visible.

The single sentence that sells it: **"Type a sentence and watch the model retrieve a fact,
layer by layer, in real time."**

---

## 4. MVP Scope (Strictly Limited)

The MVP is **exactly three things** on **one model** (GPT-2 small) in **static analysis mode**
(submit a prompt, get a full analysis — no live generation).

**MVP-1 — Token strip + next-token prediction.**
Submit a prompt → see it tokenized (GPT-2's actual BPE tokens, visibly) and the model's top-10
predictions for the next token with probabilities.

**MVP-2 — Logit Lens view. (The centerpiece.)**
For the final token position, show the model's top prediction at *each of the 12 layers*,
revealing how the answer forms as you move up the network. This is the demo. It alone proves
understanding of the residual stream + unembedding.

**MVP-3 — Attention viewer.**
A 12×12 grid of all heads as thumbnails; click one to see its attention pattern as a
heatmap (query tokens × key tokens) over the prompt.

That is the entire MVP. Three views, one model, no generation. If only MVP-1 and MVP-2 ship,
the project is *still* a strong portfolio piece.

---

## 5. Features Explicitly Excluded From MVP

Cut on purpose. Each is a tempting rabbit hole that does not improve the core demo.

| Excluded | Why it's cut |
|---|---|
| **Live token-by-token generation / streaming** | Doubles backend complexity (WebSocket, state) for marginal demo gain over static analysis. Post-MVP. |
| **Induction-head detection** | Great interview material, but a whole sub-feature. Phase 2, after MVP ships. |
| **Neuron inspector (max-activating examples)** | Requires running a corpus through the model + storage. Phase 2. |
| **3D residual-stream visualization (Three.js)** | Pure aesthetics; high effort, no understanding-signal. Last thing, if ever. |
| **Multiple / larger models, model comparison** | One model done well beats three done shallowly. |
| **Activation patching / causal interventions** | Real research-grade interp; far beyond a finishable MVP. |
| **User accounts, saving, sharing, deployment polish** | Irrelevant to the value prop. A local app + a recorded demo video is enough. |
| **Tuned lens (trained probes)** | Requires training; the plain logit lens is enough to demonstrate the idea. |

**Rule:** anything not in Section 4 does not get built until all of Section 4 works.

---

## 6. Technical Architecture

Two processes, one machine, talking over local HTTP.

```
┌─────────────────────────────┐        POST /analyze         ┌──────────────────────────────┐
│  Frontend (browser)         │  ───────────────────────────▶ │  Backend (Python, FastAPI)    │
│  Vite + React + TypeScript  │                                │                                │
│                             │ ◀───────────────────────────  │  HookedTransformer (GPT-2)    │
│  - PromptBar                │     JSON analysis payload      │  loaded ONCE at startup        │
│  - TokenStrip               │                                │                                │
│  - LogitLensView (D3)       │        GET /attention/{L}/{H}  │  run_with_cache() → extract:   │
│  - HeadGrid + AttentionView │  ───────────────────────────▶ │   • str tokens                 │
│    (D3)                     │ ◀───────────────────────────  │   • logit lens (per layer)     │
└─────────────────────────────┘     single head pattern       │   • next-token top-k           │
                                                               │   • attention (lazy per head)  │
                                                               └──────────────────────────────┘
```

**Key architectural decisions:**
- **TransformerLens (`HookedTransformer`)** is the backbone. It exposes every internal
  activation via `run_with_cache`. The project is essentially "serialize the right entries of
  that cache and draw them."
- **Model loaded once** as a module-level singleton at startup. Never per request.
- **CPU-only assumption.** GPT-2 small forward passes are sub-second on CPU. No GPU required.
- **Static, request/response.** No WebSockets in the MVP. `POST /analyze` does one
  `run_with_cache` and returns everything small (tokens, logit lens, next-token top-k).
  Attention patterns are large, so they are fetched **lazily** per `(layer, head)`.
- **D3 for all MVP visuals.** Precise, data-driven 2D. Three.js is post-MVP only.

**Backend endpoints (MVP):**
- `POST /analyze` → `{ tokens, logit_lens, next_token_topk }`
- `GET /attention/{layer}/{head}?prompt_id=...` → one head's `[seq × seq]` pattern

(The server caches the last analyzed prompt's full cache in memory so attention fetches don't
re-run the model.)

---

## 7. Data Flow Through the System

1. **User submits prompt** in `PromptBar` → `POST /analyze { prompt }`.
2. **Backend tokenizes**: `tokens = model.to_tokens(prompt)`; string forms via
   `model.to_str_tokens(prompt)`.
3. **Single forward pass**: `logits, cache = model.run_with_cache(tokens)`. The cache (all
   internal activations) is held in memory keyed by a `prompt_id`.
4. **Logit lens computed**: for each layer `L`, take `cache["resid_post", L]`, apply
   `model.ln_final`, multiply by `model.W_U`, softmax, take top-k for the final position.
5. **Next-token top-k**: softmax of final `logits[0, -1]`, top-10.
6. **Small payload returned**: tokens + per-layer logit lens + next-token top-k + `prompt_id`.
   Attention is **not** included (too large).
7. **Frontend renders** TokenStrip, LogitLensView, and an empty HeadGrid.
8. **User clicks a head** → `GET /attention/{L}/{H}?prompt_id=...` → backend reads
   `cache["pattern", L][0, H]` from the held cache, rounds to 3 decimals, returns `[seq×seq]`.
9. **AttentionView renders** the heatmap; hovering a token isolates its row.

The held cache is dropped when a new prompt is analyzed (single-prompt memory — no
persistence needed for the MVP).

---

## 8. Interpretability Concepts We Will Support

These are the concepts the tool makes visible — and the ones the author must be able to
explain on a whiteboard. Each maps to a citable result.

**In the MVP:**
- **Tokenization (BPE).** Why "Paris" and " Paris" are different tokens; why text isn't words.
- **The residual stream** as the model's central information highway; every layer reads from
  and writes to it. *(Elhage et al., "A Mathematical Framework for Transformer Circuits", 2021.)*
- **The logit lens.** Projecting intermediate residual-stream states through the final
  unembedding to read the model's "current guess" at each layer; understanding `ln_final` and
  `W_U`. *(nostalgebraist, 2020.)*
- **Attention as information movement.** Each head moves information from key positions to
  query positions; reading an attention pattern. *(Elhage et al., 2021.)*

**Post-MVP (Phase 2), supported conceptually, built only if time allows:**
- **Induction heads** and their role in in-context learning. *(Olsson et al., 2022.)*
- **Polysemantic neurons / superposition** via max-activating examples in the neuron inspector.
  *(Elhage et al., "Toy Models of Superposition", 2022.)*

**Author's required reading before coding:** first half of "A Mathematical Framework for
Transformer Circuits" (residual stream, QK/OV, heads) + the original logit-lens post.

---

## 9. Development Phases

**Phase 0 — Litmus test (≈ half a day).** venv + `pip install transformer_lens torch fastapi
uvicorn`. A 15-line script that loads GPT-2 and prints the logit-lens top token per layer for
*"The Eiffel Tower is in the city of"*. **Gate:** "Paris" emerges in later layers in the
terminal. Do not proceed to UI until this passes.

**Phase 1 — Backend (≈ 2–3 days).** `model.py` (singleton load), `extract.py` (analyze →
payload), `logit_lens.py`, FastAPI `POST /analyze` + `GET /attention/{L}/{H}`, in-memory
prompt cache. Verify with raw HTTP calls / Swagger before any frontend.

**Phase 2 — Logit Lens UI (≈ 3–4 days).** Vite scaffold, `PromptBar`, `TokenStrip`,
`LogitLensView` in D3. **Gate / first real demo:** factual prompt visibly resolves across
layers.

**Phase 3 — Attention UI (≈ 3–4 days).** `HeadGrid` (12×12 thumbnails), `AttentionView`
(heatmap, lazy fetch), token-hover isolation. **MVP COMPLETE here.** Record a demo video.

**Phase 4 (post-MVP, optional) — Depth features.** Induction-head detector, then neuron
inspector. Each is independently shippable; ship one fully before starting the next.

**Phase 5 (post-MVP, optional) — Showpiece polish.** Streaming generation and/or 3D
residual-stream view. Aesthetics only; only after Phase 4.

**Stop rule:** the project is portfolio-ready and recordable at the end of Phase 3. Everything
after is bonus, not obligation.

---

## 10. Risks and Unknowns

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Author can't *explain* the concepts under questioning | Med | **Fatal** to the value prop | Reading is a Phase-0 deliverable, not optional. The understanding is the product. |
| `transformer_lens` / `torch` install friction on Windows/3.12 | Med | Med | Install `torch` (CPU) first from the official index, then the rest. Phase 0 surfaces this immediately. |
| Attention payloads too large / UI jank | Med | Med | Lazy per-head fetch; round to 3 decimals; cap prompt length (e.g. 64 tokens) in MVP. |
| Logit lens looks unconvincing on a bad example | Low | Med | Curate 4–5 demo prompts known to resolve cleanly (factual recall). Ship them as presets. |
| Scope creep (the real killer) | **High** | **High** | Section 5 is binding. Nothing outside Section 4 until Section 4 is done. |
| Re-running the model per request makes it feel slow | Low | Med | Singleton model + cached last prompt; attention reads from cache, no re-run. |
| Tokenizer/`W_U`/`ln_final` API details differ from memory | Low | Low | TransformerLens docs + Phase 0 script nail the exact API before UI work. |

**Known unknowns to resolve in Phase 0/1:** exact memory footprint of holding a full cache;
whether `gpt2` thumbnails for 144 heads render fast enough (fallback: render thumbnails on
click/scroll, not all at once).

---

## 11. Success Criteria

**Minimum (project is a success if all true):**
- Type a factual prompt; the logit-lens view shows the answer forming across the 12 layers.
- Click any of the 144 attention heads; see its attention pattern over the prompt.
- The author can, unprompted, explain: what the residual stream is, why the logit lens works
  (ln_final + unembed), and what an attention head computes.
- A 60–90s demo video exists and is linkable from a resume/GitHub.

**Strong (clearly above bar):**
- Above, plus a working induction-head detector with a one-line explanation of why those heads
  matter for in-context learning.

**Exceptional (rare for a student):**
- Above, plus a neuron inspector that surfaces an interpretable neuron ("fires on country
  names"), and/or live streaming generation with internals animating.

**Anti-criteria (signs of failure even if it looks busy):** a beautiful 3D globe of activations
the author can't explain; five half-built features; no clean logit-lens demo.

---

## 12. Folder Structure

```
synapse/
├── BRIEF.md                  this document
├── HANDOVER.md               build-start guide for a fresh session
│
├── backend/
│   ├── .venv/
│   ├── main.py               FastAPI app; /analyze + /attention/{L}/{H}
│   ├── model.py              HookedTransformer singleton (load once at startup)
│   ├── extract.py            run_with_cache → analysis payload; holds last cache
│   ├── logit_lens.py         per-layer ln_final + W_U projection → top-k
│   ├── requirements.txt
│   │
│   │  # ── Phase 4+ only, do not create during MVP ──
│   ├── induction.py          (post-MVP) induction-head scoring
│   └── neurons.py            (post-MVP) max-activating-token lookup
│
└── frontend/                 Vite + React + TypeScript
    ├── public/
    │   └── presets.json      curated demo prompts that resolve cleanly
    ├── src/
    │   ├── api/
    │   │   └── client.ts      typed fetch wrappers for /analyze and /attention
    │   ├── state/
    │   │   └── store.ts       selected layer / head / token
    │   ├── components/
    │   │   ├── PromptBar.tsx
    │   │   ├── TokenStrip.tsx
    │   │   ├── LogitLensView.tsx   ← the centerpiece (D3)
    │   │   ├── HeadGrid.tsx        ← 12×12 head thumbnails
    │   │   └── AttentionView.tsx   ← selected-head heatmap (D3)
    │   ├── App.tsx
    │   └── main.tsx
    └── index.html

# Created only in later phases (kept out of the tree until then):
#   frontend/src/components/NeuronInspector.tsx   (Phase 4)
#   frontend/src/components/ResidualStream3D.tsx  (Phase 5, Three.js)
```

---

### The one rule that protects this project

**Nothing outside Section 4 gets built until everything in Section 4 works.** The MVP is three
views on one model with no generation. That is enough to demonstrate deep understanding of
transformer internals and to survive a hard technical conversation. Ship that first; treat
everything else as a bonus you may never need.
