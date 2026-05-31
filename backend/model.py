"""HookedTransformer singleton.

The model is loaded exactly once, at import time, and shared across all
requests. Loading per-request is the canonical beginner mistake (slow); the
brief mandates a module-level singleton (BRIEF.md sec. 6).
"""

import torch
from transformer_lens import HookedTransformer

# CPU-only assumption (BRIEF.md sec. 6): GPT-2 small forward passes are
# sub-second on CPU, so no GPU is required.
DEVICE = "cpu"
MODEL_NAME = "gpt2"

# Loaded once, at import. Subsequent imports reuse this object.
model: HookedTransformer = HookedTransformer.from_pretrained(MODEL_NAME, device=DEVICE)
model.eval()
torch.set_grad_enabled(False)
