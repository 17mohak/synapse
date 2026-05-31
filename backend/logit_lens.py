"""The logit lens.

For each layer L, take the residual stream after that layer
(``cache["resid_post", L]``), apply the model's final layernorm, project
through the unembedding ``W_U`` to get vocab logits, softmax, and read the
top-k predictions for the FINAL token position. This reveals how the model's
"current guess" sharpens as information flows up the network.

(BRIEF.md sec. 7 step 4; nostalgebraist 2020.)
"""

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
