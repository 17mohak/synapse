// The three canonical fates, as illustrative sparkline data for the landing
// strip. These are the real GPT-2 small trajectory shapes recorded in the motion
// study (MOTION_DIRECTION sec. 11): the answer's probability arc and its nearest
// rival's, layer 0 -> 11. They are presentational here (the hero card above runs
// the live model); their only job is to show the three regimes honestly — a wide
// gap that holds, a hair that never parts, and a peak that craters.

export interface FateLine {
  token: string;
  probs: number[];
}

export interface Fate {
  key: "knew" | "leaned" | "collapsed";
  label: string;
  tone: "gold" | "ash";
  blurb: string;
  prompt: string;
  winner: FateLine;
  rival: FateLine;
  verdict: string; // the word (gold) or the absence of one (ash)
  measure: string; // the right-aligned measure
  crestLayer: number; // where the dotted "standing" cursor falls
}

// Faint background field, shared across the cards: low, wandering, never near the
// winners. Drawn at ~0.1 opacity so it reads as the crowd the answer climbs out of.
export const CROWD: number[][] = [
  [0.02, 0.03, 0.05, 0.04, 0.06, 0.08, 0.06, 0.05, 0.07, 0.06, 0.05, 0.04],
  [0.01, 0.02, 0.02, 0.03, 0.05, 0.07, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03],
  [0.03, 0.04, 0.03, 0.05, 0.04, 0.03, 0.05, 0.07, 0.06, 0.08, 0.07, 0.06],
  [0.01, 0.01, 0.02, 0.04, 0.06, 0.05, 0.04, 0.06, 0.05, 0.04, 0.03, 0.02],
];

export const FATES: Fate[] = [
  {
    key: "knew",
    label: "Knew",
    tone: "gold",
    blurb: "The answer pulls clearly ahead.",
    prompt: "Why is oxygen important?",
    winner: { token: "oxygen", probs: [0.01, 0.01, 0.01, 0.012, 0.02, 0.03, 0.05, 0.12, 0.3, 0.45, 0.636, 0.484] },
    rival: { token: "helium", probs: [0.01, 0.01, 0.01, 0.01, 0.02, 0.03, 0.04, 0.06, 0.1, 0.14, 0.2, 0.194] },
    verdict: "oxygen",
    measure: "29 points apart",
    crestLayer: 11,
  },
  {
    key: "leaned",
    label: "Leaned",
    tone: "gold",
    blurb: "A narrow lead, but still a lead.",
    prompt: "Who wrote Hamlet?",
    winner: { token: "Shakespeare", probs: [0.01, 0.01, 0.012, 0.02, 0.03, 0.05, 0.08, 0.1, 0.2, 0.381, 0.2, 0.081] },
    rival: { token: "Marlowe", probs: [0.01, 0.01, 0.01, 0.02, 0.03, 0.04, 0.06, 0.08, 0.14, 0.2, 0.13, 0.069] },
    verdict: "Shakespeare",
    measure: "1 point apart",
    crestLayer: 11,
  },
  {
    key: "collapsed",
    label: "Collapsed",
    tone: "ash",
    blurb: "Confidence peaked, then broke.",
    prompt: "The quick brown fox jumps over?",
    winner: { token: "fox", probs: [0.01, 0.01, 0.02, 0.03, 0.05, 0.08, 0.15, 0.25, 0.45, 0.63, 0.3, 0.037] },
    rival: { token: "brown", probs: [0.01, 0.01, 0.02, 0.03, 0.04, 0.05, 0.07, 0.09, 0.1, 0.1, 0.07, 0.027] },
    verdict: "no separation",
    measure: "peak 63% → 4%",
    crestLayer: 9,
  },
];
