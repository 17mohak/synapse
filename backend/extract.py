"""Analysis: one forward pass -> a small JSON payload, plus lazy attention.

`analyze(prompt)` runs `run_with_cache` exactly once and returns the small
parts of the result eagerly (tokens, per-layer logit lens, next-token top-k).
The full cache is large (attention is 12x12xseqxseq), so it is held in memory
keyed by a `prompt_id` and read lazily, one head at a time, by
`get_attention()`.

Single-prompt memory (BRIEF.md sec. 7): only the most recently analyzed
prompt's cache is kept; analyzing a new prompt drops the previous one.
"""

import uuid

import torch

from logit_lens import compute_logit_lens, compute_trajectories, compute_entropy
from model import model

# Cap prompt length in the MVP to keep attention payloads bounded
# (BRIEF.md sec. 10 mitigation).
MAX_TOKENS = 64

# Single-prompt in-memory store: { prompt_id: {"cache": cache, "tokens": [...]} }
_last = {}


def analyze(prompt: str) -> dict:
    """Run one forward pass and return the eager analysis payload."""
    tokens = model.to_tokens(prompt)
    if tokens.shape[1] > MAX_TOKENS:
        tokens = tokens[:, :MAX_TOKENS]

    str_tokens = model.to_str_tokens(tokens)
    logits, cache = model.run_with_cache(tokens)

    # Per-layer logit lens for the final position (small).
    logit_lens = compute_logit_lens(model, cache, k=5)

    # Continuous per-layer trajectories for a fixed token set (The Race centerpiece).
    trajectories = compute_trajectories(model, cache)

    # Per-layer entropy (bits): the uncertainty channel under The Race.
    entropy = compute_entropy(model, cache)

    # Actual next-token prediction: top-10 over the final position (BRIEF sec. 7 step 5).
    final_probs = logits[0, -1].softmax(dim=-1)
    top = torch.topk(final_probs, 10)
    next_token_topk = [
        {"token": model.to_string(tok.item()), "prob": round(p.item(), 4)}
        for tok, p in zip(top.indices, top.values)
    ]

    prompt_id = uuid.uuid4().hex

    # Drop the previous prompt's cache, keep only this one.
    _last.clear()
    _last[prompt_id] = {"cache": cache, "tokens": str_tokens}

    return {
        "prompt_id": prompt_id,
        "tokens": str_tokens,
        "logit_lens": logit_lens,
        "next_token_topk": next_token_topk,
        "trajectories": trajectories,
        "entropy": entropy,
    }


def get_attention(prompt_id: str, layer: int, head: int):
    """Return one head's [seq x seq] attention pattern from the held cache.

    Rounded to 3 decimals (BRIEF.md sec. 7 step 8). Raises ValueError on a
    stale/unknown prompt_id or out-of-range layer/head.
    """
    entry = _last.get(prompt_id)
    if entry is None:
        raise ValueError("unknown or stale prompt_id; re-run /analyze")

    n_layers = model.cfg.n_layers
    n_heads = model.cfg.n_heads
    if not (0 <= layer < n_layers):
        raise ValueError(f"layer must be in [0, {n_layers - 1}]")
    if not (0 <= head < n_heads):
        raise ValueError(f"head must be in [0, {n_heads - 1}]")

    pattern = entry["cache"]["pattern", layer][0, head]  # [query, key]
    return torch.round(pattern, decimals=3).tolist()
