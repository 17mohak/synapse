# Synapse — Motion & Art Direction (self-contained handoff)

> Read this first. It is the authoritative creative brief for the Synapse centerpiece
> redesign. A brand-new session should be able to continue from this file alone, without
> reading any prior conversation. **CONTEXT.md** holds the engineering changelog; this file
> holds the *artistic* direction and the decisions behind it.

---

## 0. One-paragraph summary

Synapse runs a real GPT-2 small forward pass on a prompt and visualizes the **logit lens**
(the model's evolving next-token prediction, layer by layer). The centerpiece is being
redesigned from a multi-line "race" chart into a single, editorial, *scientific piece* whose
one unforgettable idea is: **a machine's certainty is fragile, late, and reversible — you can
watch it almost decide, and you can see the shape of the doubt it leaves behind.** The final
form is a **hybrid**: the still icon is **The Standing** (the *moat* — the measured gap between
the answer and its nearest rival); the motion language is **Cold Feet** (a winner trajectory
and a rival trajectory racing through the 12 layers, so the moat is *earned* by a relationship
the viewer watched form). The work is currently prototyped in `studies/`; it is **not yet
ported to the production app**.

---

## 1. Environment / where everything is

- **OS:** Windows 11, PowerShell default (Bash tool also available). Working dir
  `C:\Users\MOHAK\synapse\`. Do **not** touch the unrelated `strata` folder.
- **Repo:** git, remote `origin` = https://github.com/17mohak/synapse (`gh` authed as `17mohak`).
  Branch `main`. Repo description is already set.
- **Backend:** FastAPI + TransformerLens. Run from `backend/`:
  `.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000`
  (loads GPT-2 once at startup; sub-second forward passes on CPU).
- **Frontend:** Vite + React + TS + D3 + Zustand. Run from `frontend/`: `npm run dev`
  (port 5173; proxies `/api` → backend 8000). `npm run build` = `tsc -b && vite build`.
- **Production centerpiece:** `frontend/src/components/ClimbView.tsx` (+ `ClimbView.css`,
  `climbEvents.ts`, `ClimbScrubber.tsx`, `ClimbReadout.tsx`). State in `state/store.ts`.
- **Design studies (the masterpiece prototype — NOT wired to the app):**
  - `studies/frames.html` — the **frozen frame study**: the three Standing stills
    (Oxygen / London / Fox) at 1200×630 (GitHub social-card size). Approved as beautiful.
  - `studies/motion.html` — the **motion study** (seek-driven). Currently **mid-refactor**
    (see §13). Open as `file:///C:/Users/MOHAK/synapse/studies/<file>.html`.
- **Verification:** drive a real browser via the chrome-devtools MCP tools. The standalone
  studies expose `window.show(id, t)` / `window.play(id)` so you can seek to any frame and
  screenshot it. NOTE: headless/background tabs throttle `requestAnimationFrame`, so timed
  playback can't be captured — always drive motion via a deterministic `seek(t)` for capture.
  Keep capture viewport width so screenshots stay < 2000px (the image reader rejects larger).

---

## 2. What Synapse is (vision)

"Type a sentence and watch the model retrieve a fact, layer by layer." The audience is a
technical interviewer / ML hiring manager; the project must survive a 20–30 min "explain how
it works" conversation. **The understanding is the product, not the graphics.** This is the
hard constraint that kills any direction which hides the mechanism (see §11, the rejected
"Condensation"). The logit lens is a real, citable technique (nostalgebraist 2020; Belrose et
al. 2023). The unembed includes the bias `b_U` so the final-layer lens reproduces the model's
real logits to ~1e-5 — do not "fix" this to W_U-only.

---

## 3. Design philosophy / what we're optimizing for

The bar is **not** "a clean chart" or "a good visualization." The bar is **"I have never seen
anything quite like this before"** and **"someone remembers it a week later."** The piece is an
**explorable explanation / scientific artifact** in the lineage of Distill.pub, Bret Victor,
Nicky Case, Observable, Information Is Beautiful — **NOT** a product dashboard, SaaS hero, or
landing page. Two memory targets must both succeed:

- **Screenshot only (no motion):** the image that remains = the answer word above its measured
  moat, with a faint **descent-trace** freezing the relationship into the still.
- **Animation only (no screenshot):** the moment that remains = the two trajectories that
  climbed together, then **separating** (knew), **refusing to part** (leaned), or **cratering
  together** (collapse).

---

## 4. The decided direction: a hybrid (locked)

Evaluated five concepts across five categories (iconic still / motion / explanation /
recruiter hook / scientific honesty). No concept won outright, so the answer is a principled
hybrid — each "loser" assigned the category it actually wins:

- **Icon = The Standing (the moat).** Center of gravity, resting state, poster/README/social
  image. *Contemplative, ma-style negative space.*
- **Motion = Cold Feet (the conviction race).** Earns the icon: the moat is the end-state of a
  relationship the viewer watched.
- **Explanation = a whisper of "The Descent"** (a depth scrubber + a few honest annotations;
  not a scrollytelling essay).
- **Honesty = "Two Minds" as an interaction** (swap prompts to run the knowing-vs-guessing
  experiment yourself; NOT a static side-by-side diptych, which splits the icon).
- **"Condensation" (a 50k-vocab collapsing field): CUT.** Won no category, least honest, hides
  the mechanism. Only its faint echo survives (the crowd flooding back at a collapse).

The governing sentence for every decision: **"The motion is the model keeping or losing its
nerve; the still is the shape that nerve left behind."**

---

## 5. The Standing (the icon) — spec

The trajectories resolve into **words at their true final-layer height on the chart's own
probability (√) axis**, so chart and verdict are one object (not a margin-note). Composition,
as locked by the frozen frame study (`studies/frames.html`):

- Near-black stage, generous margins, asymmetric (editorial split: standing on the right, one
  caption lower-left). Lots of negative space.
- **Winner word**: large editorial serif, amber, at its endpoint. The **conviction %** sits in
  mono just past it (static, not ticking).
- **Rival word(s)**: smaller, ash; a **ghost** (faint italic) for the "correct but unchosen"
  word in the leaned case (Paris).
- **The moat** (the hero): the empty span between the winner's endpoint and its nearest
  rival's, drawn at their TRUE axis heights, with an amber rule + the lead in points
  ("29 points apart" / "1 point apart"), or **"no separation"** for a hedge.
- **Descent-trace**: a faint vertical mark from where the rival began (near the winner) to
  where it ended, so the frozen still encodes the motion's memory ("something let go").
- A faint **history line** (the conviction climb) whispering up from the lower-left.
- Faint depth ruler (0…11) at the bottom; tiny top-left "probability · √ scale" disclosure.
- One serif-italic **caption** lands last (it is the payoff, never a spoiler — see §16).

The frozen study is **approved as beautiful**. Hero assignment: README/social = Oxygen (the
clean icon); attention/thumbnail = Fox (the drama); in-body honesty beat = London (confidently
wrong).

---

## 6. The moat concept (the heart)

The moat is the **measured gap** between the winner and its nearest rival, on the real
probability axis. It answers the only question that matters: **"did the model actually know?"**
- Wide moat = it knew. Near-zero moat = it only leaned. No moat (a packed crowd) = it never
  decided.
- **The moat must never lie.** GPT-2 small never gets very confident, so the moat is honestly
  *moderate* at best (~29 points for oxygen). Do not fake vastness; beauty comes from
  composition, type, and negative space, not exaggeration. No truncated-axis tricks.
- Honesty is **gated on the same `decisive` test** the thesis uses
  (`finalProb ≥ 0.10 && finalProb ≥ 2× runner-up`), so the words and the picture can never
  disagree. A hedge/near-miss shows "no separation" / a hairline, never a manufactured gap.

---

## 7. Cold Feet (the motion language)

Register: **Apple / high-end editorial / scientific** — never SaaS. The motion *is* the idea:
the model reaching for an answer and keeping or losing its nerve. Built as a deterministic
`seek(t)` scene (one function maps progress → the whole picture — same architecture as the
production `applyLayer(frontier)`), with an rAF clock for real playback.

**Motion materials:** position-with-mass (gravity), opacity, blur, color-drain. **BANNED:**
scale-pop, bounce, spring overshoot, glow/halo, parallax, ticking counters.
**Easing:** authoritative ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for the build; a heavier
gravity curve for the collapse. Never `linear`, never default `ease-in-out`.
**Stillness is a material:** an ~800ms hold after resolution, before the caption, is part of
the score.
**Reduced motion is first-class:** render the resolved still + descent-trace immediately with a
single ~200ms opacity fade; never gate content behind playback.

---

## 8. The rival-shadow-line discovery (the breakthrough — APPROVED)

The first motion build drew **only the winner's trajectory**; the rival appeared only at the
end. The merciless critique found the moat felt **asserted, not earned** — the separation was
mechanical because the viewer never watched the two compete. The fix, now the core of the
motion:

> **Treat the rival as a first-class character.** Draw the winner trajectory AND the nearest
> rival trajectory racing together through all 12 layers (both revealed by the same left→right
> clip). The viewer watches the gap form. The moat then emerges from a relationship already
> seen, told entirely through the two lines:
> - **Pursuit** — both climb together, the rival chasing.
> - **Hesitation** — time dilates at the crest (the held breath).
> - **Separation** — the winner pulls away and stays apart → moat opens (Oxygen / "knew").
> - **Convergence** — the two end nearly fused, both low → hairline moat (London / "leaned").
> - **Collapse** — the winner craters down to meet the crowd → no moat (Fox / "lost its nerve").

The words and the conviction number **fade in at rest** at the line endpoints (NO scaling),
and the moat measure / descent-trace annotate a gap the viewer just watched appear.

---

## 9. Storyboard (the beats)

0. **Empty** — flat dim baseline + prompt. "Watch a machine make up its mind. Or fail to."
1. **Begin** — a seed at layer 0; depth ruler lights.
2. **Pursuit** — two trajectories (winner amber-by-conviction, rival ash) draw together; the
   leading word may flicker among early fillers.
3. **Rising** — the lines climb; the gap between them grows or stays tight.
4. **The crest (hesitation)** — time dilates ~0.5×; the winner peaks; a quiet ring marks the
   peak value (e.g., 63%). Held breath.
5. **Resolution (one of three):**
   - **5A Knew** — winner holds high, rival left below → moat opens; winner word locks amber.
   - **5B Leaned** — both fall and converge low → hairline moat; winner dim-locks; correct word
     ghosts beneath.
   - **5C Collapsed** — winner craters into the crowd → no moat; word drains to ash + blur;
     crowd floods up.
6. **The Standing** — motion stops; the iconic still (word, moat, descent-trace, caption).
7. **Human understanding** — depth scrubber + a prompt rail: "Try one it knows. Try one it
   doesn't." The viewer runs the experiment.

---

## 10. Type system & tokens (the "said" vs the "measured")

- **The voice** (the word the model "says" + the caption): an **editorial serif display** —
  prototyped with **Instrument Serif** (Fraunces is an alternative). This reframes a token from
  *data* into *utterance*.
- **The measure** (conviction %, lead, layer indices, peak %): **JetBrains Mono** (existing).
- **Chrome** (controls only): existing **Inter** — identity preservation; UI is not where we
  get editorial.
- **Amber** (`--accent` ≈ oklch(0.8 0.14 80)) is reserved strictly for **held conviction**; it
  drains to **ash** the instant doubt wins. Color is state, never decoration.
- Dark tokens already in `frontend/src/index.css` (`--bg`, `--ink`, `--muted`, `--faint`,
  `--accent`, etc.). Study hex equivalents: bg `#16181c`, ink `#f3f4f5`, ash `#8d9298`,
  amber `#e8a33e`, amber-dim `#c1893f`, whisper `#4a4f56`.

---

## 11. The three canonical fates (real GPT-2 small numbers)

Use these for demos and frame studies. Per-layer arrays are layers 0→11. `arc` = the tracked
token's probability trajectory; `r0` = the nearest rival's trajectory (approximate, for the
study — derive exact values from `/analyze` `trajectories` in production).

| Fate | Prompt | Winner (final) | Nearest rival (final) | Peak | Caption |
|---|---|---|---|---|---|
| **Oxygen** (knew) | `Water is made of hydrogen and` | oxygen 48% | helium 19% | 64% @ L10 | "It knew. Nothing else came close." |
| **London** (leaned, wrong) | `The Eiffel Tower is in the city of` | London 8% | Paris 7% | 38% @ L9 | "It chose London. Paris was right there. It never knew." |
| **Fox** (collapsed) | `The quick brown fox jumps over the lazy` | fox 4% | brown 3% | 63% @ L9 | "It almost said fox. Then it lost its nerve." |

Study arrays (from `studies/motion.html`):
- oxygen `arc=[.01,.01,.01,.012,.02,.03,.05,.12,.30,.45,.636,.484]`, `r0(helium)=[.01,.01,.01,.01,.02,.03,.04,.06,.10,.14,.20,.194]`
- London `arc=[.01,.01,.012,.02,.03,.05,.08,.10,.20,.381,.20,.081]`, `r0(Paris)=[.01,.01,.01,.02,.03,.04,.06,.08,.14,.20,.13,.069]`
- fox `arc=[.01,.01,.02,.03,.05,.08,.15,.25,.45,.63,.30,.037]`, `r0(brown)=[.01,.01,.02,.03,.04,.05,.07,.09,.10,.10,.07,.027]`

Honest note: London's winner ALSO crests (~38% @ L9) then falls to 8% — a partial collapse
ending in a near-tie. Fox is the full collapse (63% → 4%). These are real properties of the
model, not cherry-picks; confidence is genuinely non-monotonic (entropy spikes mid-network).

---

## 12. What has been BUILT and committed (production)

The production `ClimbView` already implements an earlier moat recompose (on `main`):
`rc1` retire redundant views (next-token list + old grid removed; The Race is the only
centerpiece) · `rc2` thesis moved below the chart, reveals after the sweep (no spoiler) ·
`rc3` the verdict promoted onto the shared √ axis with the measured moat (the hero) ·
`rc4` the standing blooms in only when the race resolves · `rc5` empty-state poses the
question. README + three screenshots in `docs/` reflect this state.

**This production version still uses the multi-line race + the existing Inter/mono type.** The
**Cold Feet single-protagonist + rival-shadow + Instrument-Serif** masterpiece direction lives
only in `studies/` and has NOT been ported.

---

## 13. Current state of the motion study (`studies/motion.html`)

- Deterministic `seek(t)` scene; `window.show(id,t)` and `window.play(id)`.
- Halo/glow: **removed** (it rendered as a giant amber disc — a spotlight, not a glow). Good.
- Timing fixed so the arc finishes drawing before the standing blooms (no detach gap).
- **Rival-shadow line added** (`r0` data + a second ash trajectory under the same reveal clip).
- **MID-REFACTOR / currently inconsistent:** the winner word was being changed from a
  "riding word that scales 34→96 + a ticking conviction number" to a **fixed-size word + static
  conviction that simply fade in at rest**, and a second **rival leading dot** was added. The
  `buildScene` half of this change landed; the `seek()` body still contains the OLD
  riding-word / ticking / scaling logic and must be replaced with: two racing dots during the
  build (winner amber at `yAt(arc@frontier)`, rival ash at `yAt(r0@frontier)`, both fading as
  the standing blooms), and `word`/`conv`/rival-words/moat all driven purely by the bloom
  factor `b` (opacity fade, no position/size/text changes). Finish that replacement, reload,
  and re-record before judging.

---

## 14. What has been REJECTED (do not revive without strong cause)

**Concepts:** Condensation (cut). Two Minds as a static diptych (kept only as a prompt-swap
interaction). Descent as a full scrollytelling essay (kept only as a scrubber + light
annotation). Cold Feet as the *center of gravity* (it is the motion, not the icon — the moat is
the icon).
**Motion / visual approaches:** the conviction **halo/glow**; the **riding word that scales up**
(34→96); the **ticking conviction counter**; drawing only the winner's line (rival must be
first-class). The earlier **margin-note verdict** (replaced by the shared-axis standing).
**Whole skill families:** SaaS/landing idioms — bento grids, "double-bezel" cards, glass pills,
AIDA section funnels, GSAP scroll-pinning, magnetic buttons, eyebrow/numbered section markers,
hero-metric templates. These come from `high-end-visual-design` / `gpt-taste` / `stitch` /
`brandkit`; take only their macro-whitespace + custom easing + editorial type contrast, reject
the rest. **No em dashes in copy** (impeccable rule). Identity preservation: do not rebrand
mid-project (keep amber/dark; add only the serif *voice*).

---

## 15. What still needs to be built (priorities)

1. **Finish the motion study** (`studies/motion.html`): complete the `seek()` refactor (§13),
   then record Oxygen / London / Fox and judge whether the moat is now *earned* (the rival
   relationship is watched, the separation/convergence/collapse reads). Iterate in the study
   until beautiful — do NOT touch the production app until it is.
2. **Port to production** (`ClimbView.tsx`) once the study is approved:
   - Add the **rival trajectory as a first-class line** alongside the winner during the sweep.
   - Replace riding/standing logic with the **fade-in (no scale)** standing + the **moat +
     descent-trace** at rest; remove the ticking conviction counter.
   - Introduce the **Instrument Serif voice** for the winner word + caption (load the font;
     keep mono for measure, Inter for chrome only).
   - Keep the existing honesty gate, reduced-motion path, scrubber, readout.
   - The **prompt-swap rail** ("try one it knows / one it doesn't") for the Two-Minds-as-
     interaction honesty.
3. **Time-dilated crest** ("hesitation") in the real playback clock.
4. **Refresh `docs/` screenshots + README** once the visual changes land.
5. **Performance pass** when building: re-evaluate the marketplace skill
   `ibelick/ui-skills@fixing-motion-performance` (held, not installed) to certify 60fps;
   animate only `transform`/`opacity`/`filter`.

---

## 16. Non-negotiable design principles

1. **The moat is the icon, and it never lies.** Honest probabilities; honesty-gated; no faked
   gaps; no truncated-axis exaggeration. A hedge shows "no separation."
2. **The thesis/caption is the payoff, never the spoiler.** It is hidden through the motion and
   lands only after the standing resolves (`aria-live`). It is derived from the same event core
   as the chart, so words and picture can never disagree.
3. **The rival is a first-class character.** The moat must emerge from a relationship the
   viewer watched (pursuit → separation/convergence/collapse).
4. **Motion is meaning, not decoration.** Apple/editorial/scientific register only. No ticking
   counters, no type scale-pops, no glows, no bounce/spring, no SaaS idioms. Custom ease-out.
   Stillness is a material.
5. **Reduced motion + a11y are first-class.** Resolved state renders without playback; meaning
   carried by brightness + the static number + caption, not hue alone; reachable contrast.
6. **The understanding is the product.** Never hide the mechanism for beauty; it must stay the
   logit lens, explainable in an interview.
7. **Identity preservation.** Dark canvas, amber = held conviction only, mono = measure; add
   exactly one editorial serif *voice*. No rebrand, no marketing scaffolding.
8. **One object, not a dashboard.** One protagonist relationship per run; everything else
   subordinate (scrubber, readout, prompt rail).

---

## 17. Skills & process

- **Apply** (already evaluated as the right set): `impeccable` (craft/distill/identity),
  `d3-viz` (Tufte low-ink, direct labels, annotate the evidence), `emil-design-eng` (timing,
  easing, asymmetric in/out, blur-to-mask, reduced-motion), `dataviz-data-storytelling`
  (one claim, headline as payoff, don't hand back a dashboard), `minimalist-ui` (editorial
  serif voice + restraint).
- **Reject for this project:** `gpt-taste`, `high-end-visual-design`, `brandkit`,
  `stitch-design`, `frontend-design`, `design-taste-frontend(*)` as *generators* (they pull
  toward landing-page idioms). Harvest principles only.
- **Motion-skill marketplace audit (done):** nothing worth installing —
  `remotion-*` is video (wrong medium), `hyperframes/css-animations` + `mblode/ui-animation`
  are generic (redundant with emil), `dylantarre/animation-principles` is mobile-touch/low-rep.
  **Hold** `ibelick/ui-skills@fixing-motion-performance` for the build-phase 60fps pass only.

### Version-control discipline (binding)
Every milestone ends with: verify build + typecheck, verify success criteria, atomic commit,
push. **One logical change per commit** — never mix logic/styling/refactor/deps. Short
imperative messages (`phase-2.5-...` / `rc#-...`). Maintain the CHANGELOG table in CONTEXT.md
(milestone, hash, date, summary, rollback); use `(this commit)` as the placeholder and
back-fill the previous hash in the next commit. End commit messages with
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Commit/push only when the user asks;
branch off `main` if needed. Verify visual milestones with real-browser screenshots across all
three fates (Oxygen / London / Fox) before claiming done.

---

*Last updated for the motion-direction phase. The frozen frame study is approved; the motion
study is mid-refactor (§13). Continue there, judge the earned moat, then port to production.*
