// Minimal app state for Phase 2 (logit-lens UI). Holds the current analysis,
// request status, and which layer the user has focused. Head/neuron selection
// is intentionally absent — those arrive with their phases.

import { create } from "zustand";

import { analyze, ApiError, type AnalyzeResponse } from "../api/client";

type Status = "idle" | "loading" | "ready" | "error";

interface SynapseState {
  status: Status;
  result: AnalyzeResponse | null;
  error: string | null;
  /** Layer the user is hovering/focused in the lens (null = none). */
  selectedLayer: number | null;
  /** The prompt that produced `result`, for display. */
  analyzedPrompt: string | null;

  runAnalyze: (prompt: string) => Promise<void>;
  setSelectedLayer: (layer: number | null) => void;
}

export const useStore = create<SynapseState>((set) => ({
  status: "idle",
  result: null,
  error: null,
  selectedLayer: null,
  analyzedPrompt: null,

  runAnalyze: async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    set({ status: "loading", error: null, selectedLayer: null });
    try {
      const result = await analyze(trimmed);
      set({ status: "ready", result, analyzedPrompt: trimmed });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong analyzing the prompt.";
      set({ status: "error", error: message });
    }
  },

  setSelectedLayer: (layer) => set({ selectedLayer: layer }),
}));
