// Typed wrappers over the Synapse backend (FastAPI). Shapes mirror the API
// contract in CONTEXT.md sec. 6. Requests go through the Vite dev proxy at
// `/api` (see vite.config.ts), so the backend origin stays out of this file.

const BASE = "/api";

/** One predicted token and its probability. */
export interface TokenPrediction {
  token: string;
  prob: number;
}

/** The logit lens at a single layer: top-k predictions for the final position. */
export interface LayerLens {
  layer: number;
  predictions: TokenPrediction[];
}

/** One token's probability trajectory across every layer (The Race centerpiece).
 *  `probs[i]` is this token's probability at layer `i` (length = n_layers). */
export interface TokenTrajectory {
  token: string;
  probs: number[];
  peak: number;
  peakLayer: number;
  finalProb: number;
}

/** Response of POST /analyze. */
export interface AnalyzeResponse {
  prompt_id: string;
  tokens: string[];
  logit_lens: LayerLens[];
  next_token_topk: TokenPrediction[];
  /** Per-token probability lines across layers, for The Race. */
  trajectories: TokenTrajectory[];
  /** Per-layer Shannon entropy in bits (length = n_layers); the uncertainty channel. */
  entropy: number[];
}

// --- Phase 3 (attention) type stub. Not fetched in Phase 2; declared here so
// the contract is documented and `getAttention` can be wired up later. ---
export interface AttentionResponse {
  layer: number;
  head: number;
  pattern: number[][]; // [seq x seq], query rows x key cols
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    // Network / proxy failure — backend almost certainly not running.
    throw new ApiError(
      "Could not reach the backend. Is the FastAPI server running on port 8000?",
      0,
    );
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as T;
}

/** Run one forward pass over `prompt` and return the eager analysis payload. */
export function analyze(prompt: string): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
}

export { ApiError };
