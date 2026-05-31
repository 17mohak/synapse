"""The logit lens.

For each layer L, take the residual stream after that layer
(``cache["resid_post", L]``), apply the model's final layernorm, project
through the unembedding ``W_U`` to get vocab logits, softmax, and read the
top-k predictions for the FINAL token position. This reveals how the model's
"current guess" sharpens as information flows up the network.

(BRIEF.md sec. 7 step 4; nostalgebraist 2020.)
"""

import math

import torch


def compute_logit_lens(model, cache, k: int = 5):
    """Return per-layer top-k predictions for the final token position.

    Shape of the result:
        [ { "layer": int,
            "predictions": [ { "token": str, "prob": float }, ... ] }, ... ]
    """
    lens = []
    for layer in range(model.cfg.n_layers):
        resid = cache["resid_post", layer]          # [batch, seq, d_model]
        resid = model.ln_final(resid)               # final layernorm
        # Full unembedding = W_U @ resid + b_U. Including the bias makes the
        # final layer's lens exactly reproduce the model's real logits; drop it
        # and layer 11 disagrees with the actual next-token prediction.
        logits = resid @ model.W_U + model.b_U      # unembed -> vocab logits
        probs = logits[0, -1].softmax(dim=-1)       # final position, vocab probs
        top = torch.topk(probs, k)
        predictions = [
            {"token": model.to_string(tok.item()), "prob": round(p.item(), 4)}
            for tok, p in zip(top.indices, top.values)
        ]
        lens.append({"layer": layer, "predictions": predictions})
    return lens


def compute_trajectories(model, cache, per_layer_k: int = 5, cap: int = 8):
    """Return continuous per-layer probability trajectories for a fixed token set.

    The logit lens (above) reports each layer's *own* top-k, so a token can
    appear in one layer and vanish in the next: you cannot draw a continuous
    line for it. The Race needs the opposite shape. Pick one token set once
    (the union of every layer's top-``per_layer_k``, ranked by peak probability
    and capped at ``cap``), then report each chosen token's probability at
    *every* layer. Same lens mechanism (ln_final -> W_U + b_U -> softmax).

    Shape of the result (sorted by final-layer probability, descending):
        [ { "token": str,
            "probs": [float, ... x n_layers],   # prob at each layer, in order
            "peak": float,                       # max prob across layers
            "peakLayer": int,                    # layer of that max
            "finalProb": float }, ... ]          # prob at the last layer
    """
    n_layers = model.cfg.n_layers

    # Full-vocab probabilities at the final position, one tensor per layer.
    layer_probs = []
    for layer in range(n_layers):
        resid = model.ln_final(cache["resid_post", layer])
        logits = resid @ model.W_U + model.b_U
        layer_probs.append(logits[0, -1].softmax(dim=-1))

    # Tracked token set: union of each layer's top-k ids.
    candidates = set()
    for probs in layer_probs:
        candidates.update(torch.topk(probs, per_layer_k).indices.tolist())

    # [n_layers x n_candidates] probability matrix, then rank by peak prob.
    cand_ids = list(candidates)
    idx = torch.tensor(cand_ids)
    stacked = torch.stack([layer_probs[L][idx] for L in range(n_layers)])  # [L, C]
    peaks = stacked.max(dim=0)  # .values, .indices(=peakLayer) per candidate
    order = torch.argsort(peaks.values, descending=True)[:cap]

    trajectories = []
    for j in order.tolist():
        probs_over_layers = stacked[:, j]
        trajectories.append({
            "token": model.to_string(cand_ids[j]),
            "probs": [round(p.item(), 4) for p in probs_over_layers],
            "peak": round(peaks.values[j].item(), 4),
            "peakLayer": int(peaks.indices[j].item()),
            "finalProb": round(probs_over_layers[-1].item(), 4),
        })

    # Stable, meaningful order for the frontend: the eventual winner first.
    trajectories.sort(key=lambda t: t["finalProb"], reverse=True)
    return trajectories


def compute_entropy(model, cache):
    """Return per-layer Shannon entropy (bits) of the final-position distribution.

    Entropy is the uncertainty channel under The Race: how *undecided* the model
    is at each layer. It is high in early layers (probability mass spread across
    many near-equal candidates) and collapses as the answer commits, so the trend
    is the numeric backbone of "undecided -> decided". Same lens projection as the
    trajectories (ln_final -> W_U + b_U -> softmax), over the full vocabulary.

    Result: [ float, ... x n_layers ]  # entropy in bits, one per layer in order.
    """
    inv_ln2 = 1.0 / math.log(2.0)  # nats -> bits
    entropy = []
    for layer in range(model.cfg.n_layers):
        resid = model.ln_final(cache["resid_post", layer])
        logits = resid @ model.W_U + model.b_U
        probs = logits[0, -1].softmax(dim=-1)
        # torch.special.entr(p) = -p * ln(p), with entr(0)=0 defined (no NaNs).
        nats = torch.special.entr(probs).sum()
        entropy.append(round((nats * inv_ln2).item(), 4))
    return entropy
