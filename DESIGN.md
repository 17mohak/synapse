# Design

Visual system for Synapse. Dark, refined research-tooling aesthetic in the lineage of Linear
and Observable. Scope: Phase 2 (logit-lens UI). Re-run `$impeccable document` once components
exist to capture real tokens.

## Theme

**Mode:** Dark. One sentence of scene: *an ML engineer reading a dense activation readout off a
laptop in a dim room, wanting every token and probability to be instantly legible and the
moment the answer forms to feel quietly inevitable.* That forces dark, high-contrast, cool, and
restrained — a precise instrument, not a hacker terminal.

**Color strategy:** Restrained. Cool near-black neutral architecture carries the whole UI; a
single warm **amber** brand color (seed hue 80°) is reserved for one job — the *answer/peak*: the
high-probability end of the logit-lens ramp, the current selection, focus, and links. Because
amber appears almost nowhere in the chrome, when the lens resolves and the top token glows amber
it reads as meaningful, not decorative.

## Color palette (OKLCH)

Neutral architecture — cool-tinted near-black (faint hue 256°), Linear-like:

```css
:root {
  /* Surfaces (dark) */
  --bg:         oklch(0.165 0.005 256);  /* app background */
  --surface:    oklch(0.205 0.006 256);  /* panels, cards */
  --surface-2:  oklch(0.245 0.007 256);  /* raised / hover */
  --border:     oklch(0.300 0.008 256);  /* hairline dividers, panel edges */
  --border-strong: oklch(0.380 0.010 256);

  /* Text — all clear WCAG AA on --bg/--surface */
  --ink:    oklch(0.965 0.003 256);  /* primary text/data  ~16:1 on bg */
  --muted:  oklch(0.760 0.006 256);  /* secondary labels   ~6.4:1 on bg */
  --faint:  oklch(0.620 0.006 256);  /* axis ticks, tertiary ~4.0:1 on bg (large/UI only) */

  /* Brand accent — amber/honey (seed hue 80°). The "answer/peak" colour. */
  --accent:        oklch(0.800 0.140 80);  /* selection, focus, links, ramp peak */
  --accent-strong: oklch(0.860 0.150 85);  /* hover/active on accent */
  --accent-ink:    oklch(0.200 0.030 80);  /* dark text ON an amber fill (fills are pale) */

  /* Semantic */
  --error:  oklch(0.640 0.180 25);
  --focus:  var(--accent);

  /* Radii / elevation */
  --radius-sm: 4px;
  --radius:    8px;
  --radius-lg: 12px;          /* card ceiling; never 24px+ */
  --shadow:    0 4px 16px oklch(0 0 0 / 0.35);  /* defined, not a ghost glow */
}
```

### Logit-lens data ramp (the centerpiece)

A single-hue sequential scale from cool-faint (low probability) → amber (high probability), so
the dominant token at each layer glows toward the brand accent. Probability is **always** also
encoded by bar length/position, never by color alone (color-vision safety).

```css
:root {
  --ramp-0: oklch(0.380 0.010 256);  /* ~0.0 prob — barely present, cool grey */
  --ramp-1: oklch(0.520 0.040 120);
  --ramp-2: oklch(0.650 0.090 95);
  --ramp-3: oklch(0.760 0.130 84);
  --ramp-4: oklch(0.840 0.150 80);   /* ~1.0 prob — the answer, amber */
}
```

Implement as a continuous interpolation in D3 (`d3.interpolateLab` / `scaleSequential` between
`--ramp-0` and `--ramp-4`) keyed on probability ∈ [0,1]. Reserve `--accent` itself for the
single top token / current selection so the peak reads as special.

## Typography

Two families, on a real contrast axis (geometric/UI sans vs monospace), capped at 2:

- **UI / body / headings:** `Inter` (variable), with `system-ui, sans-serif` fallback. Product
  UI needs one well-tuned sans, not display pairing.
- **Mono — tokens, probabilities, layer indices, anything that is model data:** `JetBrains Mono`
  (fallback `ui-monospace, "SF Mono", Menlo, monospace`). Token strings *must* be monospace so
  BPE splits and leading spaces are visible and aligned.

Fixed rem scale (product UI; not fluid/clamp), ratio ~1.2:

| Token | Size / line-height | Use |
|---|---|---|
| `--text-xs`  | 0.75rem / 1.4 | axis ticks, layer labels, captions |
| `--text-sm`  | 0.875rem / 1.45 | secondary labels, table data |
| `--text-base`| 1rem / 1.5 | body, inputs |
| `--text-lg`  | 1.25rem / 1.35 | section headings |
| `--text-xl`  | 1.6rem / 1.25 | the one app title |

Display letter-spacing on the title: -0.02em (never below -0.04em). No all-caps body. Uppercase
only for ≤4-word labels, used sparingly.

## Components (Phase 2)

Every interactive element ships all states: default / hover / focus-visible / active / disabled,
plus loading and error where it applies.

- **PromptBar** — full-width text input (`--surface`, 1px `--border`, `--radius`), an "Analyze"
  button (verb+object label: **"Analyze prompt"**), and a preset `<select>` (native control,
  populated from `public/presets.json`). Loading: button shows an inline spinner + disabled
  state; error: a single inline message in `--error`, not a modal.
- **TokenStrip** — horizontal row of monospace token chips (`--surface-2`, `--radius-sm`).
  Leading-space tokens render the space visibly (e.g. `·Paris` or a subtle leading gap). The
  **final position is emphasized** (accent ring) because it is the position the logit lens reads.
- **LogitLensView** — the D3 centerpiece. 12 layer columns (0→11, left→right). Each column is a
  vertical stack of its top-k tokens; bar length = probability, fill = ramp color. The top token
  per layer is labeled (mono). A subtle marker calls out the **first layer where the final
  answer reaches #1**. Left-to-right reveal on new analysis (see Motion).
- **Loading:** skeleton columns for the lens, not a center spinner. **Empty/first-run:** a quiet
  prompt to type or pick a preset, naming what they'll see ("the model's top guess at each of
  the 12 layers"), teaching the interface rather than "nothing here".

Affordances stay consistent: one button shape, one input shape, one radius vocabulary, hairline
`--border` dividers (no side-stripe accents, no border+wide-shadow ghost cards).

## Layout

- App shell: a slim top bar (title + PromptBar) over a single content column; TokenStrip above,
  LogitLensView filling the main area. No sidebar needed in Phase 2.
- Content max-width ~1200px, generous gutters; the lens may scroll horizontally on narrow
  viewports rather than shrinking columns illegibly (responsive behavior is structural).
- 8px spacing base; vary section spacing for rhythm. Flexbox for the strip, CSS grid for the
  12-column lens.
- Semantic z-index scale (dropdown → sticky → toast → tooltip); no magic 9999.

## Motion

State-conveying only; 150-250ms; ease-out (quart/expo), no bounce.

- **Logit-lens reveal:** on a completed analysis, columns resolve left→right (layer 0→11) with a
  short stagger, so the prediction visibly "develops" up the network — this is the one signature
  motion and it conveys real meaning (information flowing through layers). Bars grow from 0 to
  their probability height.
- Standard transitions on hover/focus/selection (≤200ms).
- **Reduced motion:** under `prefers-reduced-motion: reduce`, render the final state instantly
  (or a single crossfade). Content is never gated behind the animation — the lens renders fully
  even if the reveal never fires.
