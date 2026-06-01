import type { TokenTrajectory } from "../api/client";

// The event core for The Race. Pure derivation from the trajectories: who wins,
// who contends, where the lead is taken, whether the winner collapses, and
// whether the run ends in a multi-way hedge. m5a renders the nodes; m5b composes
// the thesis sentence from the same object, so the picture and the words can
// never disagree.

// A token is a "serious contender" if it finishes within this fraction of the
// winner's final probability and clears a small floor. (Matches the M4 tiers.)
const CONTENDER_RATIO = 0.4;
const CONTENDER_FLOOR = 0.01;
const MAX_CONTENDERS = 3;

// The winner "collapses" if it was once very confident but gives most of it back.
const COLLAPSE_PEAK = 0.4;
const COLLAPSE_RATIO = 0.3;

/** A single annotated moment worth drawing on the chart. */
export interface ClimbNode {
  token: string; // which line the node sits on
  layer: number; // x position
  prob: number; // y value (the token's probability at that layer)
  label: string; // short tag, <= 3 words
  kind: "crossover" | "collapse";
}

export interface ClimbEvents {
  winner: TokenTrajectory;
  contenders: TokenTrajectory[];
  ways: number; // 1 winner + contenders
  perLayerLeader: string[]; // argmax token at each layer
  leadTakenLayer: number; // first layer the winner holds the lead through the end
  winnerLeadsAtEnd: boolean;
  collapse: boolean; // winner peaked high then fell back
  hedge: boolean; // 3+ near-equal finishers
  nearMiss: boolean; // exactly one contender that never leads
  nodes: ClimbNode[];
}

const asPct = (p: number) => `${Math.round(p * 100)}%`;

export function deriveClimbEvents(trajectories: TokenTrajectory[]): ClimbEvents {
  const n = trajectories[0]?.probs.length ?? 0;

  const byFinal = [...trajectories].sort((a, b) => b.finalProb - a.finalProb);
  const winner = byFinal[0];
  const contenders = byFinal
    .slice(1)
    .filter((t) => t.finalProb >= winner.finalProb * CONTENDER_RATIO && t.finalProb >= CONTENDER_FLOOR)
    .slice(0, MAX_CONTENDERS);
  const ways = 1 + contenders.length;

  // Leader (argmax among tracked tokens) at each layer.
  const perLayerLeader: string[] = [];
  for (let L = 0; L < n; L++) {
    let best = trajectories[0];
    for (const t of trajectories) if (t.probs[L] > best.probs[L]) best = t;
    perLayerLeader.push(best.token);
  }

  // The decisive crossover: the first layer of the final unbroken run where the
  // winner is the leader through to the end.
  let leadTakenLayer = n - 1;
  for (let L = n - 1; L >= 0; L--) {
    if (perLayerLeader[L] === winner.token) leadTakenLayer = L;
    else break;
  }
  const winnerLeadsAtEnd = perLayerLeader[n - 1] === winner.token;

  const collapse = winner.peak >= COLLAPSE_PEAK && winner.finalProb < winner.peak * COLLAPSE_RATIO;
  const hedge = ways >= 3;
  const nearMiss = ways === 2 && !perLayerLeader.includes(contenders[0]?.token);

  // One node: the single most important moment. A collapse marks the peak right
  // before confidence drains; otherwise the crossover where the winner takes over.
  const nodes: ClimbNode[] = [];
  if (collapse) {
    nodes.push({
      token: winner.token,
      layer: winner.peakLayer,
      prob: winner.probs[winner.peakLayer],
      label: `peaks ${asPct(winner.peak)}`,
      kind: "collapse",
    });
  } else if (winnerLeadsAtEnd) {
    nodes.push({
      token: winner.token,
      layer: leadTakenLayer,
      prob: winner.probs[leadTakenLayer],
      label: "takes lead",
      kind: "crossover",
    });
  }

  return {
    winner,
    contenders,
    ways,
    perLayerLeader,
    leadTakenLayer,
    winnerLeadsAtEnd,
    collapse,
    hedge,
    nearMiss,
    nodes,
  };
}
