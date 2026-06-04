# Synapse — Product Vision

> Authoritative product vision. A future agent should be able to read **only this
> file** and understand the intended end state. Engineering state lives in
> CONTEXT.md; motion/visual direction in ART_DIRECTION.md and MOTION_DIRECTION.md;
> binding scope in BRIEF.md. When the *feel* and these conflict, this file and
> ART_DIRECTION.md govern the experience; BRIEF.md still governs scope and honesty.

---

## 1. What Synapse is

**Synapse is a living scientific paper — an explorable explanation with a pulse.**

It runs a real transformer (GPT-2 small) on a prompt and renders the **logit lens**:
the model's next-token prediction assembling itself **layer by layer**. You watch a
machine reach for an answer and either keep or lose its nerve.

It is, simultaneously and on one surface:
- a **keynote** (it performs — it is alive before you touch it),
- a **Distill-style explanation** (it teaches the mechanism on the live thing),
- a **real scientific instrument** (it responds — you operate and interrogate it).

The homepage is not a page *about* the instrument. **The homepage *is* the
instrument, mid-thought.** The deepest version of the product and the first thing a
visitor sees are the same object at different depths of attention.

The one sentence a stranger should be able to say after ~30 seconds, unprompted:
**"I watched a neural network almost change its mind — and I understood why."**

---

## 2. What Synapse is NOT

- **Not a landing page** that wraps a tool. (No hero headline, CTA, or copy that
  competes with the instrument; no "Explore" gate; no marketing-site nav map.)
- **Not a tool page / dashboard.** No panels of controls as the primary surface.
- **Not a slide deck** of stacked sections.
- **Not a screensaver.** It is interruptible and meaningful every frame.
- **Not a generic AI site.** No glassmorphism, neon, cyberpunk, particle fog, or
  startup-landing tropes.
- **Not novel research.** It re-implements known, citable techniques (logit lens,
  attention). The contribution is a clean, *understood*, interactive artifact —
  **the understanding is the product**, not the graphics.

The audience that matters: **a technical interviewer / ML hiring manager** who will
spend 3–5 minutes with the live demo and 20–30 minutes asking the author to explain
how it works. Synapse succeeds if it survives that conversation and leaves them
thinking *"this person understands transformers."*

---

## 3. The Organism (the core concept)

The **Organism** is the protagonist: the real logit-lens instrument, **never idle.**
It poses itself a question, **thinks** it across the 12 layers (the sweep), lands a
**Standing** (the verdict), **breathes** in that stillness, dissolves, and poses the
next — forever. It **yields the instant you reach for it.**

**The honesty split (non-negotiable):**
- The autonomous **loop replays real captured runs** (pre-computed `/analyze`
  traces — real model data, deterministic, instant, free, deployable static).
- The **seize runs LIVE inference** on the visitor's own sentence.
- This is **always labelled honestly** (e.g. "replaying recorded runs" vs
  "live · gpt-2 small"). **Never fake interactivity.**

The Organism drives the **real `ClimbView`** (the deep-dive chart) — it is the same
instrument the deep dive uses, never a separate preview.

---

## 4. The journey: watch → understand → seize → interrogate → master

One object, five depths of attention — never a jump to a new screen:

1. **Watch** (curiosity/wonder): the Organism performs. You see a mind at work
   before any words. Comprehension arrives wordlessly.
2. **Understand** (clarity): the narrative + Science teach the mechanism *on the
   live instrument* — the logit lens, the residual stream, why certainty is late.
3. **Seize** (agency): you type your own sentence; live inference runs; the model
   thinks *your* thought. Watching becomes operating.
4. **Interrogate** (depth): scrub any layer, read the per-layer belief leaderboard,
   hover any token. The same object submits to scrutiny.
5. **Master** (trust): the open source and the science credits prove it is real and
   defensible; you leave understanding the machine — and the person who made it.

**Crucial rule:** this is **interruptible at every point.** You never have to finish
the essay to use the tool. Reading and doing are the same surface.

---

## 5. Product → deeper product (the governing philosophy)

The visitor must **never** feel `landing page → product`. They must feel
`product → deeper product`. There is no preview and no real-thing-behind-a-button —
only **one instrument at increasing depths of attention.** "Going deeper" is leaning
in to what is already in front of you, not navigating to a different place.

---

## 6. Roles of each element

- **The Organism — the spine / protagonist.** It opens as the living centerpiece,
  persists as the live illustration the whole explanation annotates, and culminates
  as the destination. Always the subject; never decoration, never a background.
- **The narrative — the voice, never the protagonist.** It converts *watching* into
  *understanding* and must always read as **annotation of the live thing**, never a
  standalone marketing block. Explain the **mechanism** (how). Preserve the
  **suspense** (will it know?) and the **wonder** (it almost decided, then lost its
  nerve). Never narrate "watch this"; let the instrument be the argument.
- **The Science section — the keynote core + credibility engine.** A guided
  walkthrough taught **on the live Organism**: tokenization (BPE); the residual
  stream + the logit lens; why certainty is late, fragile, and **measurable**; what
  the moat means. Cites the real lineage (nostalgebraist 2020; Elhage et al. 2021;
  Belrose et al. 2023). Guided but skimmable. This is what makes it keynote- and
  Distill-worthy and interview-defensible.
- **The Deep Dive — the destination, not a separate place.** The same Organism at
  full attention: layer scrub, per-layer belief leaderboard, per-token competition,
  hover interrogation, live prompt entry. No "Explore" gate; reached by leaning in.
- **GitHub / open source — the trust close, not a CTA.** Proof that it is real, the
  code is readable, and a person who understands transformers built it. Lives quietly
  in the chrome; lands with weight at the close. Makes it resume-linkable.

---

## 7. The Standing and the moat (the soul)

- **The Standing** is the still that the motion earns: the trajectories resolve into
  **words at their true final-layer height** on the chart's own (√) probability
  axis. The winner word (editorial serif, **amber**) over its measured gap; the
  nearest rival beneath (ash). It is contemplative, ma-style negative space. It is
  the resting state of the whole organism, the README/social image, and what a
  screenshot captures. Motion exists to earn it; during the hold, motion **stops.**
- **The moat** is the **measured gap** between the winner and its nearest rival on
  the real probability axis. It answers the only question that matters:
  **"did the model actually know?"** Wide moat = it knew. Hairline = it only leaned.
  No separation (a packed crowd) = it never decided.
- **The moat never lies.** GPT-2 small is genuinely weak; the moat is honestly
  *moderate* at best (~29 points for oxygen). No faked vastness, no truncated-axis
  tricks. Honesty is **gated** on the same `decisive` test the thesis uses
  (`finalProb ≥ 0.10 && ≥ 2× runner-up`), so the words and the picture can never
  disagree. A hedge shows "no separation."

The three canonical fates (real numbers):
- **Knew** — `Water is made of hydrogen and` → oxygen 48% vs helium 19% (peak 64% @L10).
- **Leaned (wrong)** — `The Eiffel Tower is in the city of` → London 8%, Paris 7% right beneath.
- **Collapsed** — `The quick brown fox jumps over the lazy` → fox peaks 63% @L9, craters to a hedge.

---

## 8. Non-negotiable principles

1. **The understanding is the product.** Never hide the mechanism for beauty; it
   must stay the real logit lens, explainable on a whiteboard.
2. **The moat is the icon and it never lies.** Honest probabilities; honesty-gated;
   no faked gaps.
3. **The thesis/caption is the payoff, never the spoiler.** Hidden through motion,
   lands after the Standing resolves; derived from the same event core as the chart.
4. **Honesty about live vs replayed.** Label it. Never fake interactivity.
5. **The Organism is the center of gravity; everything orbits it.**
6. **Motion is meaning, not decoration.** Apple/editorial/scientific register only.
   No ticking counters, type scale-pops, glows/halo discs, bounce/spring, parallax
   for its own sake, SaaS idioms. The **model thinking is the animation; the page
   itself stays calm.** Every motion choice must serve understanding, continuity,
   handoff, or scientific clarity.
7. **Reduced motion + a11y are first-class.** Resolved state renders without
   playback; no autonomous loop under reduced motion (rest on a Standing, fully
   operable); meaning carried by brightness + the static number + the word, not hue
   alone; reachable contrast; keyboard-operable.
8. **Identity preservation.** Dark canvas; **amber reserved strictly for held
   conviction** (drains to ash the instant doubt wins); **JetBrains Mono** = the
   measure; one editorial serif **voice** (**Instrument Serif**); **Inter** = chrome
   only. No rebrand, no marketing scaffolding.
9. **One object, not a dashboard.** One protagonist relationship per run; everything
   else subordinate.
10. **Deep-dive track boundary.** The chart internals (`ClimbView`, `climbEvents`,
    `LayerBeliefs`, `ClimbScrubber`, `store`) are a separate, validated track
    (milestones `dd-1/2/3`). Reuse them as a black box via props; do not edit them.

---

## 9. The emotional journey

A single rising line, ending in **respect for a fragile intelligence**:
- **Wonder** (the Open): a mind at work, reaching, almost deciding — uncanny, magnetic.
- **Clarity** (the Science): a hard idea made *visible*; the Distill/Bret-Victor pleasure.
- **Agency** (the Seize): "I can ask it anything," and it thinks *my* sentence.
- **Mastery** (the Deep Dive): "I can see exactly what it believed at every layer."
- **Trust** (the Close): real science, open code, a person who clearly gets it.

The memory we are engineering: *"I watched a neural network almost change its mind —
and I understood why."*

---

## 10. Success criteria

The experience succeeds only if:
- A stranger understands what Synapse is **within 30 seconds**, wordlessly.
- The homepage **feels alive** before the user touches it.
- The **Organism is unmistakably the protagonist**; the rest orbits it.
- The **narrative feels necessary, not ornamental** (annotation of the live thing).
- The **Science section feels worthy of a keynote**, and survives a 20-minute
  "explain how it works" interview.
- **GitHub feels like proof, not a CTA.**
- The **deep dive feels like the same object at full depth**, not a separate screen.
- Live vs replayed is **honest**.
- The whole thing **feels unlike a normal website** — inevitable, editorial,
  scientific, alive, trustworthy, memorable.

**Anti-criteria (failure even if it looks busy):** a beautiful page *about* the
instrument; the chart as wallpaper or a demo screenshot; copy as the protagonist; a
CTA competing with the instrument; the product hidden behind "Explore"; faked
interactivity; a dashboard or a slide deck.

---

## 11. One-line summary

**Synapse is a living scientific paper: a real transformer, caught perpetually in
the act of thinking, that explains itself and hands you the controls — product →
deeper product, with one instrument at every depth.**
