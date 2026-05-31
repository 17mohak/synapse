# Synapse — Project Handover

## What We're Building

**Synapse** is an interactive mechanistic-interpretability tool that lets you *watch a
language model think*. You type a prompt, a real transformer (GPT-2 small) generates
text token by token, and Synapse renders the model's internal cognition live:

- **Attention** — glowing connections showing which earlier tokens each new token "looks at"
- **Logit lens** — the model's evolving best-guess for the next word, layer by layer, so you watch a prediction *form* as information flows up the network
- **Neuron activations** — which neurons fire for which concepts; click one to see what it has learned to detect
- **Induction heads** — automatically detect and highlight the famous attention heads responsible for in-context learning

This is **mechanistic interpretability** — the research program of reverse-engineering what
happens *inside* a neural network — turned into something you can see and play with. It is
the hottest research area at Anthropic, OpenAI, and DeepMind right now, and a student-built
interp visualizer is rare. That combination is the entire point of the project.

**Target demo moment:** Type *"The Eiffel Tower is in the city of"*. Watch the logit-lens
view: in the early layers the model's guess is noise, by the middle layers it's "the", and
in the final layers "Paris" surges to the top — you literally watch the fact get retrieved
and assembled, layer by layer.

---

## Why This Project (Read This — It's Your Interview Narrative)

Every visualization in Synapse corresponds to a real, citable interpretability technique.
You are not making pretty pictures; you are implementing the field's core tools. Be ready
to discuss each one:

| Synapse feature | Real technique | Source to read |
|---|---|---|
| Attention arcs | Attention pattern analysis | Elhage et al., "A Mathematical Framework for Transformer Circuits" (Anthropic, 2021) |
| Logit lens | Logit lens / "tuned lens" | nostalgebraist (2020); Belrose et al. (2023) |
| Induction head detector | Induction heads | Olsson et al., "In-context Learning and Induction Heads" (Anthropic, 2022) |
| Neuron inspector | Max-activating dataset examples | Standard interp practice; see Neuronpedia |
| Residual stream view | The residual stream as information highway | "Mathematical Framework" (above) |

**Read at least the first half of the "Mathematical Framework for Transformer Circuits"
before building. It defines the residual stream, QK/OV circuits, and attention heads in the
exact terms this project visualizes.** This reading IS part of the project.

---

## User Environment

- **OS:** Windows 11, PowerShell
- **Python:** 3.12.5 — use a venv (`python -m venv .venv`, activate `.venv\Scripts\Activate.ps1`)
- **Node:** use Vite, not CRA
- **GPU:** assume CPU-only. GPT-2 small does single forward passes on CPU in well under a
  second, which is fine. If an NVIDIA GPU is available, install CUDA PyTorch and it's faster,
  but never assume it.
- **Working dir:** `C:\Users\MOHAK\synapse\` (do NOT touch the unrelated `strata` folder)

---

## Confirmed Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Model + hooks | **TransformerLens** (`transformer_lens`) | Neel Nanda's library — THE standard for mech-interp. Gives clean access to every internal activation via a run-with-cache API. This decision is the backbone of the project. |
| Model | **GPT-2 small (124M)** | Small enough to run on CPU and to *understand fully*; large enough to show real circuits (induction heads, fact recall). Start here. `gpt2-medium` later if you want. |
| ML framework | PyTorch | TransformerLens is built on it |
| Backend | FastAPI + `uvicorn` | Serve activations to the frontend; WebSocket for streaming generation |
| Frontend | Vite + React + TypeScript | Modern, fast |
| Visualization | **D3.js** for 2D (attention heatmaps, logit-lens bars, token strips) + **Three.js** for the optional 3D residual-stream view | D3 is the right tool for precise data-driven 2D; Three.js only for the showpiece 3D layer |

**Do NOT** try to do this with in-browser inference (transformers.js / ONNX) as the primary
path. You'd lose clean access to internal activations, which is the whole project. Run the
model in Python where TransformerLens gives you everything.

---

## The One Library That Makes This Possible

TransformerLens turns a forward pass into a dictionary of every internal tensor:

```python
import transformer_lens
from transformer_lens import HookedTransformer

model = HookedTransformer.from_pretrained("gpt2")  # downloads ~500MB once

tokens = model.to_tokens("The Eiffel Tower is in the city of")
logits, cache = model.run_with_cache(tokens)

# Everything you need is now in `cache`:
cache["pattern", 0]          # attention patterns, layer 0  -> [batch, head, query, key]
cache["resid_post", 5]       # residual stream after layer 5
cache["mlp_out", 8]          # MLP output of layer 8
cache["blocks.3.mlp.hook_post"]  # post-activation neuron values, layer 3 MLP

# Logit lens: project the residual stream at each layer through the final unembed
for layer in range(model.cfg.n_layers):
    resid = cache["resid_post", layer]            # [batch, seq, d_model]
    resid = model.ln_final(resid)                 # apply final layernorm
    layer_logits = resid @ model.W_U              # unembed -> vocab logits
    top_token = layer_logits[0, -1].argmax()      # model's guess at THIS layer
    print(layer, model.to_string(top_token))
```

If you understand the snippet above, you understand 60% of the backend. Everything else is
serializing these tensors to JSON and drawing them.

GPT-2 small dimensions (memorize these — they define your data shapes):
- 12 layers, 12 attention heads per layer (144 heads total)
- `d_model` = 768 (residual stream width)
- `d_mlp` = 3072 (neurons per MLP layer)
- vocab size = 50257
- context length = 1024

---

## Project Structure

```
synapse/
├── backend/
│   ├── .venv/
│   ├── main.py              FastAPI app: /analyze (single pass) + /ws (streaming generation)
│   ├── model.py             Loads HookedTransformer once at startup (singleton)
│   ├── extract.py           run_with_cache -> trimmed JSON payloads per visualization
│   ├── logit_lens.py        Per-layer unembed projection
│   ├── induction.py         Induction-head detection score per head
│   ├── neurons.py           Max-activating-token lookup for a given neuron
│   └── requirements.txt
│
├── frontend/                Vite + React + TS
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts            fetch + WebSocket wrapper
│   │   ├── components/
│   │   │   ├── PromptBar.tsx        type prompt, trigger analysis / generation
│   │   │   ├── TokenStrip.tsx       the sequence of tokens, highlightable
│   │   │   ├── AttentionView.tsx    D3 attention heatmap + arc overlay
│   │   │   ├── HeadGrid.tsx         12x12 grid of all heads, click to inspect
│   │   │   ├── LogitLensView.tsx    THE showpiece: prediction forming across layers
│   │   │   ├── NeuronInspector.tsx  click a neuron -> what it fires for
│   │   │   └── ResidualStream3D.tsx Three.js optional 3D flow view (Phase 5)
│   │   ├── state/
│   │   │   └── store.ts             selected layer / head / token / neuron
│   │   └── App.tsx
│   └── public/
│
└── HANDOVER.md
```

---

## Build Phases

### Phase 0 — Environment + the "it works" moment (do this first, it's fast)
```powershell
cd C:\Users\MOHAK\synapse
mkdir backend; cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install transformer_lens torch fastapi "uvicorn[standard]"
```
Write a 15-line script that loads GPT-2, runs the Eiffel Tower prompt, and prints the
logit-lens layer-by-layer guesses (the snippet above). **When you see "Paris" emerge in the
later layers, the core thesis of the project is proven.** Everything after is visualization.

> Windows note: `transformer_lens` + CPU `torch` install cleanly on Python 3.12. First model
> load downloads weights from HuggingFace (~500MB) and caches them. If `torch` is slow to
> resolve, install it first from the official index, then the rest.

---

### Phase 1 — Backend API
- `model.py`: load `HookedTransformer.from_pretrained("gpt2")` once at startup, keep as a
  module singleton. Loading per-request is the #1 beginner mistake — it's slow.
- `extract.py`: a function `analyze(prompt: str) -> dict` that runs `run_with_cache` once and
  returns a single JSON payload containing:
  - `tokens`: list of token strings (use `model.to_str_tokens`)
  - `attention`: per layer/head pattern matrices (see size warning below)
  - `logit_lens`: per layer, the top-5 predicted tokens + probabilities for the final position
  - `final_prediction`: top-10 next-token predictions
- `main.py`: `POST /analyze` returns that payload.

> **Payload size warning:** full attention is `12 layers x 12 heads x seq x seq` floats. For
> a 20-token prompt that's ~57k floats — fine. But do NOT send all 144 heads at full
> precision for long prompts. Round to 3 decimals, and/or send attention lazily per
> requested (layer, head) via a `GET /attention/{layer}/{head}` endpoint. Send the logit
> lens (small) eagerly; fetch attention on demand.

---

### Phase 2 — The Logit Lens view (BUILD THIS BEFORE ATTENTION)
This is the showstopper and it's mostly small data, so it's the highest-impact / lowest-risk
first visual. `LogitLensView.tsx`:
- X axis = layers 0→11. For each layer, a vertical stack showing the top predicted tokens
  with bar lengths = probability.
- Animate left-to-right as if the prediction is "developing." Highlight the moment the
  correct/final token first reaches the top.
- The Eiffel Tower demo lives here. Get this beautiful and you have a demo even before
  attention works.

**Phase 2 done when:** typing a factual prompt shows the answer visibly crystallizing across
layers.

---

### Phase 3 — Attention visualization
- `HeadGrid.tsx`: a 12×12 grid; each cell is a thumbnail of that head's attention pattern.
  Click a cell to select (layer, head).
- `AttentionView.tsx`: for the selected head, draw the attention as either (a) a D3 heatmap
  (query tokens × key tokens) or (b) arcs over the `TokenStrip` connecting each token to the
  tokens it attends to, opacity = attention weight. Build the heatmap first (easier), add
  arcs as polish.
- Hover a token to isolate just its attention.

---

### Phase 4 — Induction heads + Neuron inspector
- `induction.py`: induction heads detect repeated patterns ("...A B ... A → predict B").
  Score each head by running a sequence of random repeated tokens and measuring how much each
  head attends from the current token to *the token after its previous occurrence*. Highlight
  the top-scoring heads in `HeadGrid`. This is a direct, namedropple result from the Anthropic
  induction-heads paper — gold in an interview.
- `neurons.py` + `NeuronInspector.tsx`: pick an MLP neuron (layer, index). Run a batch of
  varied text through the model, record that neuron's activation per token, surface the
  top-activating tokens/contexts. "Neuron 1, layer 6 fires on country names" is a great thing
  to be able to show.

---

### Phase 5 — Streaming generation + polish
- `WS /ws`: client sends a prompt; server generates token-by-token, streaming each new token
  *plus* its internals so the UI animates live as text is produced.
- Optional 3D `ResidualStream3D.tsx`: render the residual stream as a flowing 3D ribbon
  through the 12 layers, attention as connections — the "thinking" aesthetic. Pure polish;
  do this only after the substance works.
- Dark, clinical, "mission control" aesthetic. Monospace for tokens. Restrained, confident.

---

## Phase Success Criteria

| Phase | What you can demo |
|---|---|
| 0 | Console prints "Paris" emerging in GPT-2's later layers. Thesis proven. |
| 1 | `POST /analyze` returns clean JSON of tokens + logit lens + attention. |
| 2 | Logit-lens UI: watch a prediction form across 12 layers. **First real demo.** |
| 3 | Click any of 144 attention heads, see exactly what it attends to. |
| 4 | "Here are the induction heads" + "this neuron detects country names." |
| 5 | Type a prompt, watch text generate with internals animating live. |

---

## The Single Most Important Rule

**Do Phase 0 today.** It's ~30 minutes and one pip install. The moment you watch GPT-2's
guess turn into "Paris" across its layers in your terminal, you'll know the project is real
and you'll understand exactly what every later phase is drawing. Don't build any UI until
that script runs.

The depth that impresses here is *not* the graphics — it's that you can explain what a
residual stream is, what an induction head does, and why the logit lens works. Build the
understanding alongside the tool.
