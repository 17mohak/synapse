"""Phase 0 litmus test: logit lens over GPT-2 small.

Loads GPT-2 small via TransformerLens, runs one prompt, and prints the
top-5 next-token predictions at every layer for the final token position.

Gate: "Paris" should emerge in the later layers for the Eiffel Tower prompt.
"""

import torch
from transformer_lens import HookedTransformer

PROMPT = "The Eiffel Tower is in the city of"
TOP_K = 5

model = HookedTransformer.from_pretrained("gpt2")

tokens = model.to_tokens(PROMPT)
_, cache = model.run_with_cache(tokens)

print(f'Prompt: "{PROMPT}"')
print(f"Top {TOP_K} predictions at the final token position, per layer:\n")

for layer in range(model.cfg.n_layers):
    resid = cache["resid_post", layer]              # [batch, seq, d_model]
    resid = model.ln_final(resid)                   # final layernorm
    layer_logits = resid @ model.W_U                # unembed -> vocab logits
    probs = layer_logits[0, -1].softmax(dim=-1)     # final position, vocab probs
    top = torch.topk(probs, TOP_K)
    preds = " | ".join(
        f"{model.to_string(tok.item())!r} {p.item():.2%}"
        for tok, p in zip(top.indices, top.values)
    )
    print(f"Layer {layer:2d}: {preds}")
