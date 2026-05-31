"""FastAPI app for Synapse (MVP backend).

Endpoints (BRIEF.md sec. 6):
  POST /analyze                       -> { prompt_id, tokens, logit_lens, next_token_topk }
  GET  /attention/{layer}/{head}      -> one head's [seq x seq] pattern (lazy)

The model singleton loads at import (via extract -> model), i.e. at startup.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import extract

app = FastAPI(title="Synapse", description="Watch a transformer think (GPT-2 small).")


class AnalyzeRequest(BaseModel):
    prompt: str


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt must not be empty")
    return extract.analyze(req.prompt)


@app.get("/attention/{layer}/{head}")
def attention(layer: int, head: int, prompt_id: str):
    try:
        pattern = extract.get_attention(prompt_id, layer, head)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"layer": layer, "head": head, "pattern": pattern}
