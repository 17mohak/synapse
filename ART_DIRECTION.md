# Synapse — Art Direction

> Durable design memory. Read this with **VISION.md** (the *what*) — this file is
> the *how it must look and feel*, and **why previous iterations fell short**. A
> future agent should read this and immediately know which layer of the stack now
> needs work and what "good" means. Engineering changelog: CONTEXT.md. Motion
> doctrine for the chart itself: MOTION_DIRECTION.md.

---

## 0. The one lesson, up front

**Do not redesign Synapse. Stage Synapse.**

The product model, the Organism, the Standing, the moat, and the honesty split are
**no longer the bottleneck.** They are correct. The bottleneck is now
**composition, hierarchy, proportion, and staging.** The page is *filled*, not
*staged*; *assembled*, not *authored*. Every future design pass operates at the
**art-direction layer only** — it must not relitigate the product model or the
information architecture.

---

## 1. The three layers of the stack (and where the bottleneck lives now)

Work on Synapse has moved **down** the stack as each layer got solved. Knowing which
layer a problem lives in prevents re-solving an already-correct layer.

1. **Product architecture** — *what the thing is.* The homepage IS the living
   instrument (the Organism); product → deeper product; watch → seize → interrogate.
   **STATUS: solved (land-7).** Do not reopen.
2. **Information architecture** — *what is on the page and in what order.* Organism
   (protagonist) → claim → Science → handoff/seize → deep dive → trust close. One
   continuous document; the narrative orbits the instrument. **STATUS: settled.**
   Do not add/remove/reorder sections as a "design" change.
3. **Art direction** — *how it is staged: hierarchy, scale, proportion, negative
   space, typography, alignment, narrative placement, rhythm.* **STATUS: first
   staging pass implemented (land-8) — the §6 plan of record is shipped.** The claim
   is now the upper-left thesis anchor, the instrument is framed in air, chrome is
   two quiet rails, and one grid / one voice carries the live cue → claim → prompt →
   pull-quote. This layer stays open for further refinement, but the named failures
   of §3 are addressed. Do not re-open layers 1/2 under cover of "it could be tighter."

If a proposed change alters layer 1 or 2, it is out of scope for design work.

---

## 2. Current diagnosis (post land-7)

- **Product model largely correct.** The Organism is alive, honest, seizable; the
  instrument is the protagonist.
- **Presentation still weak.** The page reads as **functional blocks placed on a
  canvas**, not a designed experience.
- **Assembled, not authored.** Elements are individually placed but not
  *proportioned relative to each other*; there is no shared grid or rhythm.
- **Filled, not staged.** Authority is sought through *size* (a ~96vh full-bleed
  graph) when it only comes from *proportion and restraint*.

---

## 3. The detailed findings (the named failures)

These are the concrete, recurring composition failures. Each is an
**art-direction** problem, not a CSS bug and not an architecture problem.

1. **The claim behaves like a caption, not a thesis.** It is set small in a bottom
   band (low-priority reading zone) and pitted against the chart's full area, peak
   brightness, and motion (all in the high-priority upper area). The eye goes
   graph → standing and never returns to the claim. The framing line is subordinate
   to the thing it should frame. **Hierarchy is inverted.**

2. **The chart is maximized, not framed.** Bleeding to all four edges reads as "a
   screenshot maximized," not "a specimen presented." Filling the viewport is the
   *enemy* of authority here. A capped, deliberately-framed instrument floating in
   calibrated air commands *more* by occupying *less*.

3. **Hierarchy problems.** No real size contrast does ranking work; the claim and
   the chrome are nearly the same weight. There is no instant, glanceable order of
   importance (claim → instrument → standing → chrome).

4. **Proportion problems.** The instrument is enormous and unframed; the claim is
   small; the chrome is small — no calibrated relationship between them. Inevitable
   layouts come from deliberate proportional relationships, not from filling space.

5. **Alignment problems.** The live indicator, the prompt, the claim, the standing,
   and the pull-quote each sit on their own implicit grid. **Nothing snaps to a
   shared left edge or baseline.** This is the single biggest reason it reads
   "placed on a canvas."

6. **Narrative placement problems.** The claim has no spatial *relationship* to any
   meaningful part of the chart — no shared edge, no proximity, no connecting
   gesture. It is a sentence under a picture. The thesis **feels detached** because
   it literally is, spatially.

7. **Quote transition problems.** A full-bleed dark instrument ends at a hard bottom
   edge; the pull-quote begins as a **centered** block on a fresh field — different
   alignment, no overlap, no shared element, no easing of density. Two slides
   abutting, not one column flowing. **The transition feels abrupt.**

8. **Residual vs intentional negative space.** The emptiness (right side, lower
   right) is **residual** (leftover, because the layout didn't reach the edge), not
   **intentional** (`ma` — composed emptiness that frames an object). The standing
   floats as a lonely island in dead air with no counterweight, so **the right side
   feels empty** rather than calm.

**Synthesis of the findings:** the chart's visual mass is a diagonal (low
trajectories lower-left → standing upper-right). There is a left anchor missing and
a grid missing. Both are staging fixes.

---

## 4. References & principles (how proportion creates inevitability)

- **Apple.** One object, alone on a vast calm field; huge, calibrated margins;
  **brutal type-scale contrast** (giant headline, whisper caption). Inevitability =
  the object is *placed perfectly in space*. Lesson: **stage the object in air;
  contrast scale violently.**
- **Distill.pub.** A strict editorial **measure** (~60–65ch text spine); figures
  break wider but **return to the column**, tied to prose by proximity and a
  **baseline grid**. Inevitability = rigorous figure↔text rhythm. Lesson: **one
  text spine; figures are *set into* the prose, captioned by proximity.**
- **Linear.** Dark, precise, tight type on an **invisible grid**; the product visual
  is **framed**, never chaotic full-bleed; generous, *consistent* vertical rhythm
  between beats. Inevitability = precision + restraint. Lesson: **everything snaps
  to a grid; restraint reads as confidence.**
- **Editorial design (print).** Asymmetric balance via anchors and counterweights;
  intentional negative space as a compositional element; a single consistent voice
  carried down a column; size and weight as the primary hierarchy tools.

**The shared lesson:** stage the object, don't maximize it; carry **one voice down
one grid**; let **calibrated emptiness** do the framing; rank by **scale and
position**, instantly.

---

## 5. Why the previous iterations fell short (the arc, for context)

The landing track chased the *feeling* through many architectural moves; each
improved a layer but the feeling didn't jump until the layer below was solved. This
is the key meta-lesson: **the bottleneck kept moving down the stack.**

- **land-1** cinematic landing + deep dive — the original page (good ambition, but a
  page *about* the instrument).
- **land-2** ambient breath (idle life) — fixed "dead at rest."
- **land-3** hero power-on — staged boot, headline→chart causality, "observatory
  window" de-frame of the card.
- **land-4** artifact as persistent scroll spine — sticky side-rail; the instrument
  persists on scroll.
- **land-5** instrument-first hero — full-width, card-less, headline in the chart's
  negative space.
- **land-6** the synthesis — folded the narrative rail *into* the chart's negative
  space (full-width sticky + narrative in the gutter).
- **land-7** **the Organism** — the homepage *becomes* the living instrument (replay
  loop + live seize). **This fixed the product model**, which architecture alone
  never could.

Every land-1..6 step was an **architecture** fix. land-7 was the **product-model**
fix. **None of them was an art-direction fix** — which is exactly why, even when the
architecture was right, the page still "felt assembled." That is the layer now open.

Corollary: do not interpret "it still doesn't feel right" as a cue to change
architecture again. The architecture and model are right. **Stage it.**

---

## 6. The plan of record: the staging pass (IMPLEMENTED — land-8)

The approved direction, now shipped (art direction only; no model/IA/feature/
`ClimbView` changes). Governing move: **invert the authority and impose one grid.**
Implementation note (land-8): the claim measure landed at ~22ch (not 16ch) and the
size at `clamp(1.95rem, 3.4vw, 2.95rem)` — at 16ch the full thesis wrapped to ~8
lines and collided with the layer axis and the diagonal's base; ~22ch keeps it to a
compact block in the genuinely-empty upper-left, still the largest type on the page
and a clear peer to the standing. Everything else below was implemented as written.

- **Claim becomes the upper-left anchor** (the opening thesis, not a caption): large
  editorial serif, ~`clamp(2.4rem, 4vw, 3.6rem)`, 2–3 lines, tight leading (~1.08),
  max-width ~16ch, set into the chart's reliably-empty **upper-left** negative space
  (faint scrim for legibility). Now a *peer* to the standing.
- **Cap and frame the instrument** to ~**64–68vh** with real top/bottom margins (it
  stops bleeding to the edges; it reads as a presented specimen; the right-margin
  void shrinks proportionally).
- **Balance the right:** claim (left anchor) ↔ standing (right anchor), trajectories
  the connecting diagonal — a balanced triangle replaces the lonely island.
- **Demote chrome to two quiet rails:** top = one small live-indicator cue
  (left, on the grid); bottom = a single calm **command rail** (the seize prompt
  left + the honest "replaying recorded runs" note right). Moving the prompt to the
  base reads as the instrument's controls and frees the top for the claim.
  (Placement only — same input, same behavior.)
- **One grid, one voice:** a shared left margin that the live cue, claim, prompt, and
  pull-quote all align to; the standing is the consistent right anchor. The
  **pull-quote becomes left-aligned to the claim's grid, same serif**, so scrolling
  reads as the *next line of the same narrator* (the claim plants "watch it almost
  decide"; the quote completes it). Continuity by typographic rhyme + shared
  alignment + calibrated vertical space (no hard edge).

Target reading order, instantly rankable by scale + position:
**claim (frame) → instrument (performance) → standing (answer) → chrome (controls).**

---

## 7. Identity & token constraints (binding for any visual work)

- **Dark canvas.** Tokens in `frontend/src/index.css` (`--bg`, `--ink`, `--muted`,
  `--faint`, `--accent`, etc.). Study hex: bg `#16181c`, ink `#f3f4f5`,
  ash `#8d9298`, amber `#e8a33e`.
- **Amber (`--accent`) is reserved strictly for held conviction** (the winner / the
  live state). It drains to **ash** the instant doubt wins. Color is state, never
  decoration.
- **Type:** **Instrument Serif** = the editorial *voice* (claim, quote, the words
  the model "says"). **JetBrains Mono** = the *measure* (probabilities, layer
  indices, chrome labels that are data). **Inter** = chrome only (UI), never where
  we get editorial.
- **Motion:** the **model thinking is the only animation; the page stays calm.**
  Custom ease-out (`--ease-out-expo` `cubic-bezier(0.16,1,0.3,1)`); breathing uses
  `--ease-in-out-sine`. No glow discs, bounce/spring, ticking counters, parallax for
  its own sake, scale-pops, or SaaS idioms. Every motion choice serves understanding,
  continuity, handoff, or scientific clarity.

---

## 8. Hard boundary (do not cross during design work)

- **Do not edit the deep-dive chart track:** `components/ClimbView.*`,
  `climbEvents.ts`, `LayerBeliefs.*`, `ClimbScrubber.*`, `state/store.ts`
  (milestones `dd-1/2/3`). Reuse `ClimbView` as a black box via its `result` /
  `variant` / `chrome` / `readout` props. Stage **around** it. Its internal viewBox,
  margins, and standing position are fixed; the "empty right" cannot be fixed inside
  it — only balanced and reframed from the landing layer.
- **Landing surface is the workspace:** `App.tsx`, `App.css`, `frontend/src/landing/*`
  (the live protagonist is `landing/Organism.tsx`; the prototype reference is
  `studies/organism.html`). Dead/unrendered: `landing/Stage.tsx`, `Hero.tsx`,
  `HeroChart.tsx` (superseded by `Organism`).
- **Verification reality:** headless Chrome throttles `requestAnimationFrame`, so
  the autonomous loop's *motion* can't be captured headless — drive and probe the
  live DOM over CDP (deterministic seek / DOM inspection) instead. The standalone
  study exposes `window.__seek(t)` for frozen capture.

---

## 9. Success criteria for design work

A staging pass succeeds only if:
- **Hierarchy is instantly rankable** by scale + position
  (claim → instrument → standing → chrome) within the first glance.
- The **instrument reads as framed and placed** (a specimen in air), not maximized.
- The **claim reads as a thesis**, a peer to the standing — not a caption.
- **Everything aligns to one grid**; one editorial voice carries down one column.
- **Negative space reads as intentional** (composed counterweights), not residual.
- The **transition into the quote is continuous** (same grid, same serif, eased
  density), not an abrupt cut.
- The page reads as **authored**, not assembled — it could plausibly sit on
  Apple / Distill / Linear for *proportion and restraint*, not for borrowed style.
- **Nothing in the product model, IA, features, honesty, identity, or `ClimbView`
  changed.** Only staging.
- Reduced-motion and accessibility remain first-class and verified.

**Anti-criteria:** Awwwards gimmicks, gratuitous motion, decorative parallax, added
sections, a CTA competing with the instrument, the chart as wallpaper, the claim as a
caption, or any change that touches the deep-dive track.

---

## 10. One line

**The model and the Organism are right. Now author the page: stage the instrument in
air, make the claim a thesis, and carry one voice down one grid.**
