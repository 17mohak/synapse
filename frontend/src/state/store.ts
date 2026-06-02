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
  /** The layer the playhead/scrubber is parked on (The Race). Rests at the
   *  final layer after each analysis; clamped to the real layer count by the UI. */
  playheadLayer: number;
  /** Whether the automatic layer sweep is currently running (M8). Any manual
   *  scrub cancels it. */
  playState: "idle" | "sweeping";
  /** The prompt that produced `result`, for display. */
  analyzedPrompt: string | null;
  /** Deep-dive: the landing chart card has been expanded into the focused
   *  full-instrument overlay. The overlay owns the open/close morph. */
  focusMode: boolean;

  runAnalyze: (prompt: string) => Promise<void>;
  setSelectedLayer: (layer: number | null) => void;
  setPlayheadLayer: (layer: number) => void;
  setPlayState: (state: "idle" | "sweeping") => void;
  setFocusMode: (on: boolean) => void;
}

const LAST_LAYER = 11; // GPT-2 small: 12 layers (0..11). The scrubber rests here.

export const useStore = create<SynapseState>((set) => ({
  status: "idle",
  result: null,
  error: null,
  selectedLayer: null,
  playheadLayer: LAST_LAYER,
  playState: "idle",
  analyzedPrompt: null,
  focusMode: false,

  runAnalyze: async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    set({ status: "loading", error: null, selectedLayer: null });
    try {
      const result = await analyze(trimmed);
      // A new analysis begins in the sweeping state so the very first render is
      // not a stale "idle" frame: that frame would otherwise reveal the thesis
      // early and let the scrub effect override the sweep's opening. ClimbView's
      // build effect flips this back to idle immediately under reduced motion.
      set({
        status: "ready",
        result,
        analyzedPrompt: trimmed,
        playheadLayer: LAST_LAYER,
        playState: "sweeping",
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong analyzing the prompt.";
      set({ status: "error", error: message });
    }
  },

  setSelectedLayer: (layer) => set({ selectedLayer: layer }),
  setPlayheadLayer: (layer) => set({ playheadLayer: layer }),
  setPlayState: (state) => set({ playState: state }),
  setFocusMode: (on) => set({ focusMode: on }),
}));
