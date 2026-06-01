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
| rc2 | (this commit) | 2026-06-02 | **Recompose 2 — thesis becomes the payoff, not the premise.** Moved the thesis sentence out of the spoiler header to *below* the chart, where it lands as confirmation once the race resolves (kept hidden through the sweep, then fades in with `aria-live="polite"`). Reveal is latched on the result object (`revealedResult === result`, computed in render) so a new analysis hides it again with no spoiler flash. To kill a race between the build effect and the scrub effect, a new analysis now begins in `playState: "sweeping"` (`store.ts`) so the first render is never a stale "idle" frame (which had revealed the thesis early and overridden the sweep's opening). Applied: dataviz-data-storytelling ("the headline lands as the payoff") + emil (reveal is a rare, once-per-analysis beat; opacity+6px translateY, 380ms ease-out, movement dropped under reduced motion). Verified: thesis no longer in `.climb__head`, DOM order head→plot→thesis→scrubber→readout, reveals with correct per-prompt text. | Revert; thesis returns to the header above the chart, `store.runAnalyze` stops setting `playState`. |
