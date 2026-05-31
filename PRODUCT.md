# Product

## Register

product

## Users

**Primary: a technical interviewer / ML hiring manager.** They spend 3-5 minutes with the
live demo and 20-30 minutes asking the author to explain how it works. They are fluent in
transformers and will immediately probe anything that looks hand-wavy. Their context is an
interview or portfolio review; their job-to-be-done is deciding "does this person actually
understand transformer internals?" The interface must make the *understanding* legible, fast,
and unembellished. The understanding is the product, not the graphics.

**Secondary: ML learners.** Someone studying transformers who wants to *see* the residual
stream and attention heads instead of only reading about them.

## Product Purpose

Synapse is a mechanistic-interpretability tool that lets you watch a transformer think. You
submit a prompt, a real GPT-2 small forward pass runs, and the tool renders the model's
internal computation: how its next-token prediction assembles itself layer by layer (the
**logit lens**, the centerpiece) and, in a later phase, which earlier tokens each token
attends to. The one-sentence pitch: *"Type a sentence and watch the model retrieve a fact,
layer by layer, in real time."*

Success = a factual prompt's answer visibly crystallizes across the 12 layers in under 30
seconds, and the interface never gets in the way of that moment or invites a "what is this
actually showing?" objection.

It is explicitly **not** a research tool or a Neuronpedia/TransformerLens competitor, and not
a marketing site. It is a learning/demo instrument.

## Brand Personality

Precise, confident, quiet. The voice of professional research tooling, not a product launch.
Three words: **instrument, legible, unshowy.** The interface behaves like Linear or Observable:
it disappears into the task and lets the data carry the moment. Labels are exact and technical
(layer indices, token strings, probabilities) because the audience is technical and vague
labels read as not understanding the material.

## Anti-references

- **Hacker-terminal / cyberpunk / "mission control" theatrics.** No neon glow, no scanlines, no
  matrix-green-on-black, no fake-CRT framing. The brief's "clinical, dark" was reinterpreted as
  *refined dark research tooling*, not a movie hacker set.
- **Glassmorphism**, frosted panels, decorative blur.
- **Excessive or orchestrated motion.** No page-load choreography, no gratuitous animation. The
  only motion that earns its place is the logit-lens reveal (it conveys the prediction forming)
  and standard state transitions.
- **The hero-metric / dashboard-card template**, identical icon-card grids, gradient text.
- **Dumbed-down or marketing copy.** No "supercharge", no "AI magic". Name the technique.

## Design Principles

1. **The visualization is the source of delight.** Chrome stays quiet so the logit lens can be
   striking. Spend the design budget on the data rendering, not on the frame around it.
2. **Show the real thing, unsmoothed.** Real BPE tokens with their actual splits, real
   probabilities, real layer indices. Honesty about the data (e.g. GPT-2-small landing the
   answer at #2 not #1) beats a prettier lie, because the audience will check.
3. **Earned familiarity over novelty.** Standard, trustworthy affordances (a real text input, a
   normal select). Reinventing controls reads as strangeness, not craft.
4. **Legibility is non-negotiable.** Dense, technical information presented at high contrast.
   The interviewer reading from a laptop must parse every token and number instantly.
5. **Stay inside the phase gate.** Build only what the current phase needs; no speculative UI
   for attention/neurons until their phase. Scope discipline is itself part of the demonstrated
   judgment.

## Accessibility & Inclusion

- Target **WCAG AA**: body/data text ≥4.5:1 against its surface; large text ≥3:1. The dark
  theme is tuned so muted/secondary text still clears AA, not just "looks elegant".
- **Reduced motion is required.** `prefers-reduced-motion: reduce` replaces the logit-lens
  reveal with an instant render / crossfade; nothing is gated behind an animation.
- Color is never the sole carrier of meaning in the data viz: probability is encoded by bar
  length / position as well as color, so the logit lens reads under color-vision deficiency.
- Keyboard-operable controls (prompt input, presets, layer selection) with visible focus rings.
