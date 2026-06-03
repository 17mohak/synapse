# Synapse — Development Context (handoff for a fresh session)

> Read this first. It is the working memory of the project: what Synapse is, what has been
> built, why decisions were made, and how to continue. **BRIEF.md is the binding source of
> truth**; this file is the operational summary. If they ever conflict, BRIEF.md wins.

---

## 1. Project vision

Synapse is a **mechanistic-interpretability tool that lets you watch a transformer think**.
You submit a prompt, a real GPT-2 small forward pass runs, and the tool renders the model's
internal computation: how its next-token prediction assembles itself **layer by layer** (the
logit lens — the centerpiece), and which earlier tokens each token attends to (attention).

- **Primary audience:** a technical interviewer / ML hiring manager. The project must survive
  a 20–30 min "explain how it works" conversation. **The understanding is the product**, not
  the graphics.
- **Explicit non-goal:** novel research. Synapse re-implements known techniques (logit lens,
  attention analysis) as a clean, interactive tool.
- **The one-sentence pitch:** "Type a sentence and watch the model retrieve a fact, layer by
  layer, in real time."

**The MVP is exactly three views, one model (GPT-2 small), static analysis (no generation):**
1. **MVP-1** Token strip + next-token top-10.
2. **MVP-2** Logit lens — top prediction at each of 12 layers for the final token. *The demo.*
3. **MVP-3** Attention viewer — 12×12 head grid; click a head → heatmap (query × key).

---

## 2. The one rule that governs all work (scope lock)

**Nothing outside BRIEF.md Section 4 gets built until everything in Section 4 works.**
Excluded until the MVP ships (BRIEF.md §5): live/streaming generation, induction-head
detection, neuron inspector, 3D residual-stream view, multiple/larger models, activation
patching, user accounts/deployment polish, tuned lens. Do not scaffold these early. Do not
create files for future phases before their phase.

Per-phase instructions in this project have also been explicit ("implement only X", "do not
begin phase N without approval"). **Follow phase gates; do not jump ahead without explicit
user approval.**

---

## 3. Environment

- **OS:** Windows 11, **PowerShell** default shell (Bash tool also available). Working dir:
  `C:\Users\MOHAK\synapse\`. Do NOT touch the unrelated `strata` folder elsewhere.
- **Python:** 3.12.5. Backend venv at `backend/.venv` (gitignored).
- **CPU-only.** GPT-2 small forward passes are sub-second on CPU. No GPU assumed.
- **Git:** repo initialized, remote `origin` = https://github.com/17mohak/synapse (branch
  `main`). `gh` CLI is authenticated as account `17mohak`. Git user: Mohak Mandwani.
- **Node:** not yet installed/used; Phase 2 will use Vite (not CRA).

### Installed backend dependencies (in `backend/.venv`)
| Package | Version | Note |
|---|---|---|
| torch | 2.12.0+cpu | installed from the CPU index `https://download.pytorch.org/whl/cpu` |
| transformer_lens | 3.3.0 | the backbone; `HookedTransformer` |
| transformers | 5.9.0 | pulled in by transformer_lens |
| fastapi | 0.136.3 | |
| uvicorn[standard] | 0.48.0 | |

`backend/requirements.txt` pins torch/transformer_lens/fastapi/uvicorn. Note: torch is pinned
as `torch==2.12.0` there; install CPU torch from the official index first if resolution is slow.

### Run commands (from `backend/`, venv interpreter is `.venv/Scripts/python.exe`)
```powershell
# Phase 0 litmus script
.venv\Scripts\python.exe phase0_logit_lens.py

# Phase 1 backend server
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
# Swagger UI at http://127.0.0.1:8000/docs
```
> Bash-tool gotcha: the persisted working directory drifts between calls and background tasks
> start fresh. Use explicit paths (`backend/.venv/Scripts/python.exe` from repo root, or
> `cd /c/Users/MOHAK/synapse/backend` first). `/tmp` is NOT available — pipe data through
> stdin or write to the cwd. First model load downloads ~500MB GPT-2 weights to the HF cache,
> then it's cached. The "unauthenticated HF Hub" + Windows symlink warnings are harmless.

---

## 4. Architecture (the whole design in one breath)

Two processes over local HTTP (frontend not built yet):

```
Frontend (Vite+React+TS, D3)  ──POST /analyze──▶  Backend (FastAPI + HookedTransformer)
        [Phase 2+]            ◀──JSON payload───   model loaded ONCE at startup
                              ──GET /attention/{L}/{H}──▶  reads held cache, one head, lazily
```

**Key decisions and the reasoning behind them:**
- **TransformerLens `HookedTransformer` is the backbone.** `run_with_cache` exposes every
  internal activation. The project is essentially "serialize the right cache entries and draw
  them." This choice is non-negotiable — it's what gives clean activation access.
- **Model is a module-level singleton, loaded at import/startup**, never per request
  (per-request load is the canonical beginner mistake — slow).
- **Static request/response, no WebSockets** in the MVP. One `run_with_cache` per `/analyze`.
- **Logit lens is small → sent eagerly. Attention is large → fetched lazily** per
  `(layer, head)`. Full attention is 12×12×seq×seq floats; sending it all is wasteful.
- **Single-prompt in-memory cache.** The server holds only the most-recent prompt's cache,
  keyed by `prompt_id`; analyzing a new prompt evicts the previous one. No persistence needed.
- **GPT-2 small dimensions** (data shapes): 12 layers, 12 heads/layer (144 heads), d_model=768,
  d_mlp=3072, vocab=50257, context=1024.

---

## 5. Phase 0 — findings (DONE, committed & pushed)

Goal: prove the logit-lens mechanism in the terminal before any UI.

- Script: `backend/phase0_logit_lens.py` — loads GPT-2, runs *"The Eiffel Tower is in the city
  of"*, prints top-5 per layer for the final token.
- **Gate result: PASSED.** Predictions evolve from noise → geography → a tight cluster of
  European capitals; **`' Paris'` emerges in the top-5 across the final layers (9–11)**.
- **Honest caveat:** on GPT-2 *small*, Paris reaches the top-5 but **not #1** (London/Amsterdam
  lead, depending on whether the unembed bias is included — see §6). This is GPT-2-small being
  weak, not a bug. BRIEF.md §10 anticipates this: **curate 4–5 demo prompts that resolve
  cleanly** (a Phase 2 presets concern). When picking presets, verify which prompts put the
  target token at/near #1 under the *real* logits.
- Committed as `phase-0-logit-lens-validation` and pushed to `origin/main`.

---

## 6. Phase 1 — backend implementation (DONE, demonstrated; NOT yet committed)

All under `backend/`. Implements exactly BRIEF.md §6/§7/§12 — no more.

| File | Responsibility |
|---|---|
| `model.py` | Loads `HookedTransformer.from_pretrained("gpt2")` once at import (device="cpu"), `model.eval()`, `torch.set_grad_enabled(False)`. Exposes module global `model`. |
| `logit_lens.py` | `compute_logit_lens(model, cache, k=5)` → per-layer top-k for the final position. For each layer L: `resid = cache["resid_post", L]` → `model.ln_final(resid)` → `resid @ model.W_U + model.b_U` → softmax → topk. Returns `[{layer, predictions:[{token, prob}]}]` (prob rounded 4 dp). |
| `extract.py` | `analyze(prompt)` runs `run_with_cache` once, builds the eager payload, stores the cache under a `prompt_id` in a single-entry dict `_last` (cleared each call). `get_attention(prompt_id, layer, head)` reads `cache["pattern", layer][0, head]`, rounds to 3 dp, returns `[seq×seq]`; raises `ValueError` on stale id / out-of-range. Prompt capped at `MAX_TOKENS = 64` (BRIEF §10). |
| `main.py` | FastAPI app. `POST /analyze` (body `{prompt}` via pydantic `AnalyzeRequest`; 400 on empty). `GET /attention/{layer}/{head}?prompt_id=...` (404 on stale id / out-of-range, via mapping `ValueError`→`HTTPException`). |
| `requirements.txt` | Pinned deps. |

### API contract (what the frontend will consume)
`POST /analyze` →
```json
{
  "prompt_id": "hex string",
  "tokens": ["<|endoftext|>", "The", " E", "iff", "el", " Tower", ...],
  "logit_lens": [ { "layer": 0, "predictions": [ {"token": " the", "prob": 0.7347}, ... x5 ] }, ... x12 ],
  "next_token_topk": [ {"token": " London", "prob": 0.0805}, ... x10 ]
}
```
`GET /attention/{layer}/{head}?prompt_id=...` →
```json
{ "layer": 0, "head": 0, "pattern": [[...seq floats...], ...seq rows...] }
```

### Demonstrated behavior (all verified via curl this session)
- `/analyze` on the Eiffel prompt: tokens show real BPE splits (`' E','iff','el'`); logit-lens
  top-1 per layer = `' the'`(0–4) → `' England'`(5–6) → `' Chicago'`(8) → `' London'`/`' Paris'`
  (9–11); `next_token_topk` = London 8.05%, **Paris 6.87%**, Amsterdam, New, Berlin…
- `/attention/0/0`: correct 11×11 **causal** (lower-triangular) matrix, each query row sums
  to ~1.0, rounded to 3 dp.
- Error paths: out-of-range layer/head → 404; stale/unknown `prompt_id` → 404; empty prompt →
  400. **Single-prompt eviction confirmed**: after a new `/analyze`, the old `prompt_id` 404s.

### IMPORTANT reasoning — the `b_U` decision (read before touching logit_lens.py)
BRIEF.md §7 step 4 literally says "multiply by `model.W_U`". Implemented literally (W_U only),
**the layer-11 lens disagreed with the model's actual next-token prediction** (lens said
`Amsterdam`, real logits said `London`). Cause: GPT-2's unembedding has a **non-zero bias
`b_U`** that the real forward pass applies. We add it: `resid @ W_U + b_U`. This makes the
final-layer lens reproduce the real logits to ~1e-5, and as a bonus makes early layers sensible
(`' the'` instead of `' course'`). This is a deliberate, correct deviation from the brief's
literal wording — it is still "the logit lens" (the *complete* unembed), and it removes a
discrepancy an interviewer would immediately probe. **Do not "fix" this back to W_U-only.**

---

## 7. Known issues / watch-items
- **GPT-2-small demo quality:** the Eiffel prompt gets Paris to #2, not #1. Curate presets in
  Phase 2 (BRIEF §10) and verify each lands the target token cleanly under real logits.
- **Phase 1 is not committed yet.** Suggested message: `phase-1-backend-analyze-attention`.
  Commit only when the user approves (their commit instruction was scoped to Phase 0).
- **Attention payload size for long prompts.** Mitigated by lazy per-head fetch + 3-dp rounding
  + 64-token cap. Open question (BRIEF §10): do 144 head thumbnails render fast enough in the
  UI? Fallback: render thumbnails on demand, not all at once.
- **No CORS configured** on FastAPI yet. Phase 2 (Vite dev server on another port) will need
  `CORSMiddleware`. Add it when the frontend starts.
- **No automated tests.** Verification so far is manual curl. Consider a thin pytest later;
  not required by the brief.

---

## 8. Future phases (do NOT start without the gate + user approval)
- **Phase 2 — Logit Lens UI (NEXT).** Vite + React + TS scaffold under `frontend/`. Components:
  `PromptBar`, `TokenStrip`, `LogitLensView` (D3 centerpiece). `api/client.ts` typed fetch
  wrappers. `state/store.ts` (selected layer/head/token). `public/presets.json` curated prompts.
  **Gate:** a factual prompt visibly resolves across the 12 layers. Build logit lens UI BEFORE
  attention UI.
- **Phase 3 — Attention UI.** `HeadGrid` (12×12 thumbnails) + `AttentionView` (D3 heatmap, lazy
  fetch via `/attention/{L}/{H}`, token-hover isolation). **MVP COMPLETE here. Record demo
  video. This is the stop line — everything after is bonus.**
- **Phase 4 (post-MVP) — Depth.** `induction.py` (induction-head scoring) then `neurons.py`
  (max-activating tokens) + `NeuronInspector.tsx`. Ship one fully before the next.
- **Phase 5 (post-MVP) — Showpiece.** WebSocket streaming generation; optional Three.js
  `ResidualStream3D.tsx`. Aesthetics only, after Phase 4.

---

## 9. Coding conventions (observed in this codebase)
- **Smallest thing that satisfies the phase.** No speculative abstractions, no future-phase
  files. Match the brief's file layout (BRIEF.md §12) exactly.
- **Module docstrings** explain *what and why*, and cite the brief section / source (e.g.
  "BRIEF.md sec. 7 step 4", "nostalgebraist 2020"). Inline comments flag the non-obvious
  (e.g. the `b_U` rationale).
- **Backend imports are flat** (`from model import model`, `from logit_lens import
  compute_logit_lens`) — the server runs with `backend/` as cwd; not a package.
- **Tensors:** `[batch, seq, ...]`, batch index `[0]`, final position `[-1]`. Probabilities
  rounded for payloads (logit-lens probs 4 dp; attention 3 dp). Use `.item()` / `.tolist()`
  to leave torch types out of JSON.
- **JSON shapes** use lists of small objects (`{token, prob}`) so the frontend reads cleanly.
- **Errors:** raise `ValueError` in the logic layer; `main.py` maps to `HTTPException`
  (400 bad input, 404 stale/out-of-range).
- **No secrets in code.** CPU-only; no env config needed yet.
- **Git:** feature commits, descriptive kebab-case messages matching the phase. Don't commit
  `.venv/`, `__pycache__/`, HF cache, or `.claude/` (all gitignored). Commit/push only when the
  user asks.

---

## 10. Quick orientation for a fresh session
1. Read **BRIEF.md** (source of truth) and this **CONTEXT.md**.
2. Confirm where we are: Phase 0 ✅ (pushed), Phase 1 ✅ (built + demonstrated; commit pending
   user approval). **Next is Phase 2**, but do not start it without explicit user approval.
3. To sanity-check the backend: `cd backend`, start uvicorn (cmd in §3), open `/docs`, POST a
   prompt, GET an attention head with the returned `prompt_id`.
4. Respect the scope lock (§2) and the phase gates. The understanding is the product.

---

## 11. Phase 2.5 changelog — The Race redesign

Redesign of the Phase 2 logit-lens centerpiece from a rank×layer cell grid into
**The Race**, a continuous trajectory visualization (see DESIGN.md and the approved
build spec). Backend changes are additive; the old grid keeps working until the
swap at M10. Each milestone is one atomic commit. `(this commit)` in the Commit
column resolves to the hash printed for that milestone's commit.

| Milestone | Commit | Date | Summary | Rollback |
|---|---|---|---|---|
| m0a | 63f1ab3 | 2026-06-01 | Add `trajectories` to `/analyze`: per-layer probabilities for a fixed tracked token set (union of each layer's top-5, ranked by peak, capped at 8). New `compute_trajectories()` in `logit_lens.py`. Additive; old fields unchanged. | Revert the commit; `/analyze` loses `trajectories`. No frontend consumes it yet, so the running app is unaffected. |
| m0b | a4735b1 | 2026-06-01 | Add `entropy` to `/analyze`: per-layer Shannon entropy in bits (`torch.special.entr`, NaN-safe). New `compute_entropy()` in `logit_lens.py`. Additive. **Finding:** entropy is non-monotonic on the Eiffel prompt (low early, spikes ~7.7 bits at L5, dips at L9, rises to ~8.5 at L11) because GPT-2 small never strongly commits. The entropy ribbon (M6) and thesis sentence (M5) must render this honestly, not a fake collapse. | Revert the commit; `/analyze` loses `entropy`. No frontend consumer yet; app unaffected. |
| m1 | 2763e45 | 2026-06-01 | Extend `client.ts` types: new `TokenTrajectory` interface; add `trajectories` and `entropy` to `AnalyzeResponse`. Pure type plumbing. **No `store.ts` change** (the store already holds the full `AnalyzeResponse`, so the new fields reach components via `result` automatically). Interaction-state fields deferred to M7/M9. No UI reads, no visual change. | Revert the commit; types drop the new fields. Nothing reads them yet; old grid and app unaffected. |
| m2 | 9706282 | 2026-06-01 | Add `ClimbView` (axes-only scaffold for The Race), mounted **below** the live grid in `App.tsx`. X = layers 0–11, Y = real probabilities on an adaptive linear domain (0 → global-peak prob × 1.2, capped 100%). First D3 work; first visual checkpoint. Old grid untouched and fully functional. **Open finding (resolved in m3):** the global-peak domain is set by spurious early-layer / echo spikes (`' the'@L1=0.83`, `' lazy'@L0=0.999`) not the race, so it saturates ~100% and crushes the late-layer competition. | Revert the commit; `ClimbView` unmounts, `App.tsx` import removed. Grid and app unaffected. |
| m3 | c0ca8c0 | 2026-06-01 | Draw the trajectories as continuous monotone lines (`curveMonotoneX`) on the M2 axes. **Y-domain decision:** switched to a √ (sqrt) scale over the full domain `[0, global peak]` (user-approved) so early high-confidence spikes stay visible AND the low-probability late race lifts off the baseline; nothing clipped; ticks print true probabilities; matches the old grid's `gamma=0.5`. Cap 6 lines by peak, neutral ink, early bunching reads as the faint baseline cluster. No labels / crossover nodes / entropy ribbon / scrubber / motion yet. (Note: the "fox decisive winner ~63%" reading here was a mislabelled-line error, corrected in m4.) | Revert the commit; `ClimbView` returns to the M2 axes-only scaffold. Grid and app unaffected. |
| m4 | ec26a6c | 2026-06-01 | Direct endpoint labels + 3-tier hierarchy + leader emphasis. Tiers are driven by **final-layer probability**: winner (max `finalProb`) is the amber leader line + label, drawn on top; serious contenders (within 40% of the winner, ≥1%, max 3) are neutral ink + label; background (incl. transient early spikes like `the`) is faint and unlabelled. Endpoint dots + greedy vertical de-collision with connectors. Answers "who won / who almost won" in <2s. Verified: Eiffel (London 8.1% > Paris 6.9%, honest near-miss) and fox (collision stress: 4 labels fox 3.7 / brown 2.7 / white 2.6 / lazy 2.2). **Corrects m3:** the fox prompt is NOT a decisive win; `fox` peaks ~63% at L9 then collapses to 3.7%, ending in a flat 4-way hedge (unresolved ambiguity). No crossover nodes / entropy / playhead / scrubber / motion. | Revert the commit; lines return to uniform neutral ink with no labels (M3). |
| m5a | 0069f02 | 2026-06-01 | Add `deriveClimbEvents()` (new `climbEvents.ts`): pure event core deriving winner, contenders, per-layer leader, lead-taken layer, and `collapse` / `hedge` / `nearMiss` flags. `ClimbView` now uses it as the single source of truth for the M4 tiers, and renders **one** decisive node per run: a crossover ("takes lead") for a normal resolution, or the pre-collapse peak ("peaks N%") when the winner collapses. Only the event that matters, no noisy local changes. Verified: Eiffel node "takes lead" on London @L9; fox node "peaks 63%" on fox @L9 (before its collapse). Thesis sentence is m5b. | Revert; nodes and `climbEvents.ts` go away, `ClimbView` returns to the M4 inline tier logic. Lines and labels unaffected. |
| m5b | 8aa0ec7 | 2026-06-01 | Add `composeThesis()` to `climbEvents.ts`: a researcher-voice, fully data-driven thesis sentence built from the same event core (chart and words cannot disagree). Rendered as the prominent headline above The Race; the scale note + chart are demoted to supporting evidence (hierarchy: thesis > race > labels > note). Branches: collapse, hedge, flat-finish honesty guard, near-miss (gated on `!decisive`), decisive win, lead-from-start, narrow win. Verified on 3 prompts: Eiffel ("London takes the lead at layer 9 and remains ahead… Paris closes the gap but never overtakes."), fox ("…briefly commits to fox at layer 9 (63%), but confidence collapses and the run ends in a four-way hedge."), and NEW "Water is made of hydrogen and" → "Oxygen takes the lead at layer 10 and pulls clearly ahead, finishing at 48%." The water prompt surfaced + fixed a bug: near-miss must be gated on `!decisive`, else a clear win (oxygen 48% vs helium) reads as a false near-miss. | Revert; the thesis headline reverts to the prior descriptive caption. Lines, labels, and nodes unaffected. |
| m6 | 44c46ce | 2026-06-01 | Add the **entropy ribbon**: a quiet second channel below The Race (grey filled area, never amber/ink) answering "how certain is the model?" using the m0b per-layer entropy. Raw bits, non-monotonic, unsmoothed; fixed 10-bit reference ceiling (observed ≲9.5; theoretical max `log2(vocab)≈15.6`) so the shape stays glanceable and comparable across prompts with no per-prompt normalization; clamped; end value labelled. The Race stays dominant. Verified: Eiffel (end 8.5 — rises during the geographic search, dips at L9, re-broadens; ends uncertain), fox (end 9.4, highest — never concentrates, the 4-way hedge is literally high entropy), water (end 3.8, lowest — dips deepest to 1.2 @L9 as oxygen concentrates; the only one that meaningfully resolves). No playhead / scrubber / hover / animation. | Revert; the SVG returns to chart-only height, ribbon removed. Lines, labels, nodes, thesis unaffected. |
| m7 | 20c070d | 2026-06-01 | Add the **layer scrubber + playhead** (first interaction). New `store.playheadLayer` (rests at the final layer per analysis) + setter. New `ClimbScrubber` (accessible native range styled as a ticked layer-selector instrument: drag / click / touch / keyboard arrows + Home/End, slider ARIA, aligned to the plot) and `ClimbReadout` (Layer / Leader+prob@layer / Entropy@layer — just enough to orient). `ClimbView` reveals each trajectory **solid up to the playhead layer and ghosts the future**, draws a quiet vertical cursor through chart+ribbon, emphasises the active layer tick, dots the contenders' current positions, and subordinates the future endpoint labels while scrubbing; event nodes stay visible. Not a media player: no autoplay / sweep / transport controls (those are M8). Verified across early/decisive/final layers on Eiffel (L2 `the` 69% → L9 London surges to 38.1% @3.9 bits, the takeover → L11 8.1% @8.5 bits), fox (L9 `fox` peaks 63.0% @2.7 bits before collapse), water (L10 `oxygen` concentrates 63.6% @1.5 bits before relaxing to 48%). Scrubbing reveals the peak-commitment moments the static view hid. | Revert; `ClimbView` returns to the static full chart (M6), scrubber + readout removed, `store.playheadLayer` unused. |
| m8 | 16c6d25 | 2026-06-01 | Add the **signature reveal**. `ClimbView` restructured: the scene is built **once** per analysis (object constancy — lines are never recreated, reordered, or made to jump) and a single `applyLayer(frontier)` drives a clip reveal of the trajectories + entropy ribbon, the playhead cursor, the active tick, the current-layer dots, and crossover **ignition** (the winner line starts neutral ink and flips to amber when the frontier passes the decisive layer; the event node fades in there). A steady `d3.timer` sweeps the frontier 0→last (2.6s, constant velocity, no easing / overshoot / bounce / spring) after each analysis, advancing the readout layer-by-layer; any manual scrub cancels it (`store.playState`). **Reduced motion is first-class:** no sweep, the resolved state renders immediately, all info accessible (verified: layer 11 + amber within 150ms under `prefers-reduced-motion: reduce`). Verified live auto-sweep + ignition on Eiffel/fox/water (winner neutral mid-sweep & pre-crossover, amber at L9/L9/L10; ribbon + cursor + readout all synchronized). The sweep makes the forward pass legible as one unfolding process, not decoration. | Revert; `ClimbView` returns to the M7 static reveal/ghost (no auto-sweep, no ignition, winner amber throughout), `store.playState` unused. |
| r1 | 715bb81 | 2026-06-01 | **The Reckoning, step 1.** New climax direction (reframe: the question is no longer "which word won?" but "did the model know?"). Chosen composition after evaluating three: **"The Standing"** (the gap/relationship is the hero), over focal-word (answers the wrong question) and crowd-field (visceral but imprecise). Add `deriveVerdict()` and a static verdict tableau replacing the endpoint labels: the winner + the rivals it still entertains (finalProb ≥ 15% of winner, max 5) are placed on an implicit probability axis (higher = more probable), winner amber + large, rivals neutral + sized by ratio, de-collided so a dominant winner keeps a wide empty **moat** (it knew) while near-equal finishers **pack** tight (it didn't). Static at the final layer for now (crystallization + decay are later r-steps); ribbon and lines still present. Verified: water (oxygen alone above a wide moat = knew), fox (fox in a pack of near-equals = didn't), eiffel (London with Paris close beneath = leaned, unsure). | Revert; endpoint labels return, verdict tableau removed. Lines, ribbon, sweep unaffected. |
| r2a | 952a98a | 2026-06-02 | **The Reckoning, step 2a — remove the entropy ribbon.** Design re-evaluation (final pass, using `impeccable`/distill): kept **The Standing** as the climax (the gap answers "did it know?"; focal-word answers the wrong question, crowd-field can't show a precise moat), but ruled the ribbon a redundant *second, abstract* doubt-channel duplicating what the verdict's moat now shows *physically* — distill removes it. Deleted all ribbon geometry/chrome/CSS (`entY`/`entArea`/`entLine`, ghost+reveal areas, baseline/label/end value, `.climb-ribbon__*`, `MAX_ENTROPY`). **No information lost:** per-layer entropy still reads exactly in `ClimbReadout` while scrubbing. Reclaimed the freed vertical space for the race: `innerH` 396 → 452, `svgHeight` derived from margins (556 → 520); playhead + clip now span the chart, not the ribbon. Verified: water analysis renders ribbon-free, no horizontal overflow (doc scrollW == clientW), verdict intact above a wide moat, readout still shows entropy@layer. Build + typecheck green. | Revert; the entropy ribbon and its space return, `innerH` shrinks back. Verdict, lines, sweep, readout unaffected. |
| r2b | (this commit) | 2026-06-02 | **The Reckoning, step 2b — quiet non-winner lines at rest.** When the race settles on the final layer of a *decisive* run, the also-ran lines recede (contender stroke-opacity 0.85 → 0.34, background 0.30 → 0.12) so the lone winning answer carries the eye into "The Standing"; the winner stays full amber. **Honesty-gated** on the same `decisive` test composeThesis uses (`finalProb ≥ 10% and ≥ 2× the runner-up`), so the words and the chart can never disagree: a hedge or near-miss never separates, so its crowd stays co-present at rest — the honest picture of "didn't know". Scrub back to any earlier layer (or take manual control) and the full field returns. Smooth 320ms settle; collapses to instant under `prefers-reduced-motion` via the global rule. Verified at rest: water (decisive) `is-resolved`, contender→0.34/bg→0.12, winner alone; fox (four-way hedge) not resolved, contenders stay 0.85; eiffel (near-miss) not resolved, contenders stay 0.85. | Revert; non-winner lines keep full opacity at rest (the `is-resolved` class and its two CSS rules go away). Everything else unaffected. |
| rc1 | a03eb5f | 2026-06-02 | **Recompose 1 — retire redundant views.** Vision B recompose ("doubt has a shape, and you can see it"): the page must read as one object, not a dashboard. Removed the next-token top-10 list (the climax stated as a spreadsheet, *above* the climax — the biggest spoiler) and the old logit-lens grid (a redundant third view of one prediction) from `App.tsx`; The Race is now the single centerpiece. Components remain in the repo, unmounted. Applied: dataviz-data-storytelling ("don't hand back a dashboard") + impeccable/distill (one primary goal). | Revert; re-mount `NextToken` + `LogitLensView` in `App.tsx`. ClimbView unaffected. |
| rc2 | 8025187 | 2026-06-02 | **Recompose 2 — thesis becomes the payoff, not the premise.** Moved the thesis sentence out of the spoiler header to *below* the chart, where it lands as confirmation once the race resolves (kept hidden through the sweep, then fades in with `aria-live="polite"`). Reveal is latched on the result object (`revealedResult === result`, computed in render) so a new analysis hides it again with no spoiler flash. To kill a race between the build effect and the scrub effect, a new analysis now begins in `playState: "sweeping"` (`store.ts`) so the first render is never a stale "idle" frame (which had revealed the thesis early and overridden the sweep's opening). Applied: dataviz-data-storytelling ("the headline lands as the payoff") + emil (reveal is a rare, once-per-analysis beat; opacity+6px translateY, 380ms ease-out, movement dropped under reduced motion). Verified: thesis no longer in `.climb__head`, DOM order head→plot→thesis→scrubber→readout, reveals with correct per-prompt text. | Revert; thesis returns to the header above the chart, `store.runAnalyze` stops setting `playState`. |
| rc3 | 0ce133f | 2026-06-02 | **Recompose 3 — the standing on the chart's own axis; the moat is the hero.** The verdict is no longer a margin note: the trajectories resolve into large words at their *true* final-layer height on the same √ probability axis as the chart, so chart and verdict are one object. The **moat** — the empty span between the winner's endpoint and its nearest rival's — is drawn at their true axis heights with an amber rule + caps and the lead in points; it is the thing the eye is meant to remember. Words are de-collided only enough to read and each is tied to its true endpoint by a faint connector, so the gap never lies. Hedge → "no separation · N-way" instead of a lead. Chart taken to a Tufte whisper (grid opacity 0.35→0.2, rotated y-label replaced by a small top-left "probability · √ scale" note). Canvas widened (viewBox 920→1000, right margin 150→292) for the words; scrubber realigned. Applied: d3-viz/Tufte (direct labels + annotate the interesting + low ink) and impeccable (winner present, not shouting — `WINNER_SIZE` 31, the gap carries the story). Verified across all three regimes with no overflow: water (lone "oxygen" over a 29-pt amber moat), eiffel (London a hair above Paris, 1-pt moat, connectors converging), fox ("no separation · 4-way", packed crowd, no moat). | Revert; the verdict returns to the implicit-axis margin column (r1/r2 form), canvas back to 920-wide. |
| rc4 | d33327c | 2026-06-02 | **Recompose 4 — the standing arrives.** The verdict was drawn statically and visible during the sweep (a mild spoiler). Now it belongs to the final layer: `applyLayer` toggles `.climb-verdict.is-revealed` only when the frontier reaches the last layer, so the standing stays hidden through the approach and **blooms in** (opacity + a 10px rise, 440ms `cubic-bezier(0.23,1,0.32,1)`) when the race resolves — the answer arrives rather than being pre-printed. Scrub back to an earlier layer and it recedes (the answer exists at the end). Applied: emil (one deliberate, once-per-analysis reveal; custom ease-out; movement dropped to a 200ms opacity fade under reduced motion). Verified: at layer 11 `is-revealed` true; scrub to layer 3 toggles it false (recedes); back to 11 re-blooms. | Revert; remove the `is-revealed` toggle and the `.climb-verdict` bloom CSS — the standing is static and always visible again. |
| rc5 | 356ae58 | 2026-06-02 | **Recompose 5 — frame the question in the empty state.** Reframed the first-run copy from a mechanics description ("the logit lens reads the model's top guess...") to the memory hook: "Watch a transformer think. Then see if it knew." + a line naming the moat as the measure of the model's certainty. Primes the reveal so the moat lands as the payoff. No em dashes (impeccable copy rule). | Revert; restore the prior mechanics-first empty-state copy in `App.tsx`. |

---

## 12. Production port — the Cold Feet masterpiece

Porting the validated `studies/` masterpiece direction (the **Cold Feet** single-protagonist +
**rival-shadow** motion, the fade-in **Standing**, the **Instrument Serif** voice) into the
production `ClimbView`. The authoritative creative brief is **MOTION_DIRECTION.md**; this table
is the engineering changelog. The documented port order (MOTION_DIRECTION §15.2) is followed
exactly, one bullet per milestone, one atomic commit each. `(this commit)` resolves to the hash
printed for that milestone's commit.

| Milestone | Commit | Date | Summary | Rollback |
|---|---|---|---|---|
| port-1 | 43024cd | 2026-06-03 | **The nearest rival becomes a first-class line** (MOTION_DIRECTION §8/§15.2 bullet 1 — the rival-shadow breakthrough). Before: the runner-up the moat is measured against was just one undifferentiated `contender`, styled like the rest of the crowd and receding with the also-rans at rest. Now `ClimbView` computes the nearest rival as `deriveVerdict(trajectories)[1]` (the same verdict that already drives the Standing and the moat — one source, so the line and the moat can never point at different tokens), guarantees it is always in the `drawn` set even if it finishes below the contender ratio, and gives it its own tier `rival` (drawn on top of the crowd, just beneath the winner). New CSS `climb-line--rival`: mid-grey "ash" (`--muted`, never amber — amber stays reserved for held conviction), weight 1.8, solid-opacity 0.9 (the most-present field line during the race), and — unlike the contenders — it does **not** vanish at decisive rest (`is-resolved` settles it to 0.5, not 0.34/0.12), staying as the moat's visible second anchor so the gap is *earned* by a relationship still seen. Both the winner and the rival live in the same clipped reveal group, so one left→right sweep reveals them racing together by construction. **Verified live across all three fates** (build + tsc green): water/knew (helium distinct + present beneath the 29-pt moat), eiffel/leaned (Paris the boldest field line, climbs with London to the 1-pt moat and won't part), fox/collapsed (brown the boldest survivor; honesty gate keeps "no separation · 4-way", no faked gap). Does not yet add the racing dots / serif voice / prompt-swap rail (later port milestones). | Revert; the `rival` tier + its three CSS rules go away, the nearest rival returns to plain `contender` styling and recedes with the crowd at rest. Nothing else affected. |

---

## 13. The landing experience (brand surface)

A user-directed pivot (2026-06-03): Synapse gains a **cinematic landing page** wrapping the
instrument, built to a supplied reference. This is a deliberate departure from the prior
product-only doctrine; see the **Scope note** added to the top of MOTION_DIRECTION.md and
PRODUCT.md. The validated `ClimbView` (and `port-1`) are reused untouched as the centerpiece;
all new code lives under `frontend/src/landing/`. `(this commit)` resolves to that commit's hash.

| Milestone | Commit | Date | Summary | Rollback |
|---|---|---|---|---|
| land-3 | (this commit) | 2026-06-03 | **Hero Power-On — the instrument acquires signal.** Consolidated four audit symptoms that were one underlying problem (the hero performed a slide-builder, not a startup): uniform boot, the artifact sliding in like a paragraph, headline and chart as independent timelines, and the chart reading as a contained card. Re-choreographed the hero as ONE causal power-on with distinct physics per role instead of a uniform `--i` stagger of identical slides: **chrome** (nav, CTA) fades without travel (new `.reveal--chrome` → `--reveal-shift: 0`); headline text still rises; the gold word **"think." ignites** in place as a held later beat with a pilot-light glow (`.reveal--ignite`); the **artifact materializes at its destination** (`.hero__chart-reveal` overridden to opacity + a `scale(0.985)→1` settle, no paragraph-slide). **Causality:** the first analysis is no longer a blind timer in `App.tsx` — `Hero` now fires it on the ignition word's `transitionend` (opacity), so the headline *makes the model think*; reduced-motion fires immediately and a 1700ms safety timer guarantees the chart loads if the transition never runs (StrictMode single-fire via a ref guard). **Artifact primacy via restrained de-framing** (user-chosen, "observatory window, not dashboard card"): the chart card is restyled from a floating panel into an **aperture cut into the page** — translucent near-page-depth fill so the breathing ambient field shows *through* it, the elevation drop-shadow replaced by an **inset vignette** (recedes into depth, not floats above), and the border replaced by a masked **lit top lip** (`.card::before`) that catches warm light and dissolves downward. The pre-signal placeholder swapped from a SaaS skeleton-sweep to a still **armed** pool that breathes on the field's clock. Subtle pixels, large perceived shift; no frame-draw animation (per direction). **Strictly the landing frame** — no `ClimbView`/`store`/sweep edits (the existing sweep is reused as the "signal acquired" climax), no new sections, Explore morph untouched. **Reduced motion preserved:** resolved hero renders immediately, analysis fires immediately, the armed/glow animations freeze to rest. Verified: `tsc -b` + `vite build` green; headless frames confirm the staged sequence (nav fade → text rise → chassis materialize-in-place → gold ignition → signal) and the de-framed window embedded in the page with the field bleeding through. | Revert; restore `App.tsx`'s blind boot timer and `Hero`'s uniform `--i` reveals, drop `.reveal--chrome`/`.reveal--ignite`/the `.hero__chart-reveal` override, restore the elevated `.card` (drop-shadow + opaque fill, no `::before` lip), and restore the `card-shimmer` skeleton. Nothing else affected. |
| land-2 | e32a410 | 2026-06-03 | **The instrument breathes (ambient idle life).** Landing-feel audit (motion/continuity/product-feel) found the defining flaw: the page has one timeline — boot — then freezes (parallax is scroll-linked only, so at rest every transform is frozen), reading as "a beautiful page" rather than "a living instrument." Chosen single highest-leverage fix: give the whole frame one continuous, shared **breath** so the page is alive at rest and reads as one organism. Each ambient glow became a scroll-parallax **wrapper** holding an inner `.page__glow-breath` that swells on a slow time clock (transform+opacity only; three near-but-unequal periods 16.5/19/24.5s with negative delays so the field feels organic, one register, not three loops); the hero card's own halo (`.card__depth`) breathes on the same clock (13s) so the instrument belongs to the field instead of sitting inert in it. New `--ease-in-out-sine` token for symmetric breathing. **Strictly in the landing frame** — no chart/deep-dive edits (`ClimbView`/`store` untouched), no features, no architecture/route change. Ranges are deliberately tiny (scale ≤1.12 over ~20s, opacity modulating already-faint 0.09–0.14 gradients) so it reads as drift, never a pulse or a "loading" state. **Reduced motion preserved and provably identical to the prior static field:** the global rule freezes the animations to 0.001ms, so the breath layers rest at base (transform none / full gradient) exactly as before. Verified: tsc + vite build green; headless render confirms the restructured field + card halo compose with no breakage and the live chart still resolves. | Revert; the glow wrappers collapse back to single spans (drop `.page__glow-breath` + the three `glow-breath-*` keyframes), `.card__depth` loses its `card-depth-breath` animation, and `--ease-in-out-sine` is unused. The field returns to scroll-only parallax (frozen at rest). Nothing else affected. |
| land-1 | 8223d26 | 2026-06-03 | **Cinematic landing + seamless deep dive.** New `landing/` shell composed in `App.tsx`: `SiteNav`, `Hero` (Instrument-Serif headline, "think." in gold), `HeroChart` (the real `ClimbView` framed as the page's central artifact), `PullQuote`, `Fates` (KNEW/LEANED/COLLAPSED cards over `MiniClimb` sparklines from `fates-data.ts`), `SiteFooter`. **Logo "The Aperture"** (`SynapseLogo`): an instrument ring enclosing a climb that resolves to a gold node piercing it — the chart in miniature; two-tone in the ribbon, gold in the footer. **Motion** (`motion.ts`): boot choreography via `--i`-staggered `.reveal` (armed only under `html.js-motion`, set pre-paint when motion is allowed, so content is never gated behind a transition), IntersectionObserver scroll reveals, and a damped rAF parallax on ambient glow layers; all ease-out-expo, all inert under `prefers-reduced-motion`. **"Explore a thought" is the primary lever**: it opens `FocusOverlay`, a body-portal `role="dialog"` that lifts the full instrument forward out of the chart card's position (WAAPI scale+translate morph from the card origin), reveals the chrome'd `ClimbView` (scrubber, readout, thesis) over a blurred, `inert` landing, and reverses on Esc/backdrop/close. `ClimbView` gained additive `variant`/`chrome` props (the D3 scene, sweep, and standing are unchanged); `store` gained `focusMode`. Identity preserved: dark/gold/serif, gold reserved for conviction, the real logit lens. **Verified live** (build + tsc green, no console errors): boot sequence, hero chart auto-resolving the real "Water is made of hydrogen and" → oxygen/29-pt moat, all three fate cards, the open/close morph (scroll-lock + focus + inert restored), reduced-motion guards. **Adapted, not from the model:** the LEANED card names Marlowe as Hamlet's nearest rival; the doctrine-banned glow/parallax are applied only as restrained line-luminance + small ambient drift, never the rejected data-point halo or scroll-jacking. | Revert the commit + delete `frontend/src/landing/`; `App.tsx` returns to the prior tool shell. `ClimbView`/`store` additive changes are inert without the landing and can stay or be reverted with it. |

---

## 14. Deep-dive artifact excellence

Following an approved audit of the deep dive (the product): the instrument was a *player*, not
something you explore for ten minutes. Priority order (locked): (1) scrubber discoverability +
replay, (2) per-layer top-k panel, (3) hover inspection. One atomic, verified milestone each;
landing untouched. `(this commit)` resolves to that milestone's commit hash.

| Milestone | Commit | Date | Summary | Rollback |
|---|---|---|---|---|
| dd-1 | 8fa4276 | 2026-06-03 | **Scrubber discoverability + replay** (audit #1, the entry point to exploration). The deep dive's only real interaction was invisible: the sweep played once on open and froze, with no replay control and a rail that read as a static cursor. Refactored `ClimbView`'s sweep into a per-instance `runSweep()` (held in a ref, cancels its own in-flight timer) so it can run on build **and** be replayed on demand — the validated sweep logic, timing, and reduced-motion path are unchanged, just made callable. `ClimbScrubber` gained a `transport` mode (the deep-dive chrome passes `transport onReplay`): a **Replay** pill (shows "Sweeping"/disabled while running) and a plain-language **"Drag to inspect any layer"** affordance, plus a swelling thumb glow on hover/drag so the rail reads as a control. Bounded the deep-dive chart height (`.focus .climb__svg` max-height ~48vh) so the chart and its transport/scrubber/readout are on screen **together** (scrubbing is watch-while-you-drag; the control can't live below the fold). Landing card's own scrubber/replay untouched (no `transport`). **Verified live** (build + tsc green, no console errors): Replay re-runs the sweep locally with no re-fetch (mid-sweep layer 3 "Sweeping"/disabled → resolves layer 11 "Replay"/enabled), chart+controls fit one screen, manual scrub still cancels the sweep. | Revert; `ClimbScrubber` loses the transport (the deep dive returns to a bare rail with no replay), `ClimbView` keeps `runSweep` internally (inert — equivalent to the prior single sweep). The chart-height cap and thumb affordance go with it. |
| dd-2 | 834ab37 | 2026-06-03 | **Per-layer belief leaderboard** (audit #2 — make belief evolution visible, not just expose top-k). The richest payload field, `logit_lens` (per-layer top-k), was fetched and rendered nowhere. New `LayerBeliefs` reads it at the playhead layer and presents the model's belief as a live leaderboard beside the chart in the deep dive: token in the serif voice, probability in mono, a relative bar (√-scaled to the leader) for the gap structure, and a trend gutter (▲ rising / ▼ falling / • new) computed against the previous layer. **Amber is the current belief** (the leader row); brightness/▲ is rising, faint/▼ is falling; the token that *just took the lead* at this layer is marked amber (`is-justlead`). As you scrub, rows **climb and fall via FLIP** (per-row `translateY` from old to new position, new rows fade up) and bars grow/shrink, so you watch one guess overtake another and a guess become an answer; reduced motion skips the FLIP. Wired as a right rail: `FocusOverlay`'s `focus__body` is now a two-column grid (chart + rail), `ClimbView` gained an additive `readout` prop so the deep dive drops its one-line `ClimbReadout` (the rail subsumes layer + entropy, no redundancy), and the chart height cap tightened to ~46vh so chart + scrubber + leaderboard stay on one screen. Landing untouched; the D3 scene/sweep unchanged. **Verified live** (build + tsc green, no console errors): at L11 oxygen 48.4% ▼ (fell from the L10 crest) over helium 19.4% ▼, carbon ▲, water/chlorine new; scrub to L6 and the board is a different mind entirely — `therefore` 26.1% leads (just-took-lead, amber) over `its` 23.3% ▲, with oxygen not yet in the top 5. | Revert; delete `LayerBeliefs`, restore `FocusOverlay`'s single-column body + `ClimbReadout` (drop the `readout` prop). `logit_lens` returns to unused. Chart cap reverts to dd-1's ~48vh. |
| dd-3 | (this commit) | 2026-06-03 | **Hover interrogation — trajectories become inspectable competitors** (audit #3). You could watch the race (replay, scrub, belief board) but not *ask why* a line did what it did. Now a forgiving transparent overlay over the plot picks the nearest drawn line at the cursor (vertical-distance threshold, no pixel-perfect aiming on thin SVG), and the picked candidate is brought forward while the rest recede (`has-hover` + `is-hovered`, defined after the tier/ignite/resolved rules so focus wins); a marker dot + serif label land where the **scrubber** layer crosses that line. Crucially the pick is the *candidate* and the values are at the *scrubber layer*, so the instrument answers candidate-and-time at once. The payoff slot (the thesis line) doubles as the interrogation readout (no tooltip box, no telemetry panel): token in the serif voice, then layer-aware `layer N · rank R / outside top 5 · P%`, then a composed one-sentence **story** — `composeCandidateStory` (new in `climbEvents`, same event core) narrates emerged-at / led-or-never-led / peaked / collapsed. `LayerBeliefs` cross-lights: the hovered candidate's row lifts, and hovering a row drives the chart (shared `store.hoveredToken`, set by both). New per-instance `hoverRef` + Effect C apply the visuals on `[hoveredToken, playheadLayer]`; a new analysis clears stale hover (replay does not). Calm and scientific, never flashy; reduced motion unaffected (opacity/stroke only). Landing untouched; D3 scene/sweep/standing unchanged. **Verified live across all three fates** (build + tsc green, no console errors): knew — helium "emerged at layer 8, never led; peaked at 30%" (rank 2, 19.4%); leaned — Paris "emerged at layer 8, never led; peaked at 20%" (rank 2, 6.9%, London edged it); collapsed — fox "took the lead at layer 9; peaked at 63%, then collapsed to 4%" (rank 2, the hedge's `,` edges it). Chart focus + dot/label + rail cross-light all confirmed. | Revert; remove the hover overlay/`applyHover`/Effect C from `ClimbView`, the interrogation branch in the payoff slot, `composeCandidateStory`, the `LayerBeliefs` row hover, and `store.hoveredToken`. The chart returns to scrub+replay only. |
