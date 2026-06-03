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

/** One token in the verdict tableau ("The Standing"). */
export interface VerdictCandidate {
  token: string;
  finalProb: number;
  ratio: number; // finalProb relative to the winner (winner = 1)
  isWinner: boolean;
}

/**
 * The verdict: the winning token plus the rivals the model still entertains at
 * the final layer (those finishing at >= `ratioFloor` of the winner, capped).
 * The reader's question is "did it know?" — answered by the gap between the
 * winner and its nearest rival, which these candidates' probabilities define.
 */
export function deriveVerdict(
  trajectories: TokenTrajectory[],
  maxResidue = 5,
  ratioFloor = 0.15,
): VerdictCandidate[] {
  const byFinal = [...trajectories].sort((a, b) => b.finalProb - a.finalProb);
  const winner = byFinal[0];
  if (!winner) return [];
  const out: VerdictCandidate[] = [
    { token: winner.token, finalProb: winner.finalProb, ratio: 1, isWinner: true },
  ];
  for (const t of byFinal.slice(1)) {
    if (out.length - 1 >= maxResidue) break;
    const ratio = winner.finalProb > 0 ? t.finalProb / winner.finalProb : 0;
    if (ratio < ratioFloor) break;
    out.push({ token: t.token, finalProb: t.finalProb, ratio, isWinner: false });
  }
  return out;
}
const prose = (t: string) => t.trim(); // token as a word, no leading-space dot
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const WAYS = ["", "one", "two", "three", "four", "five", "six"];
const waysWord = (n: number) => WAYS[n] ?? String(n);

// Below this final probability the top token is not a meaningful prediction; we
// say so rather than narrate a winner.
const FLAT_FINAL = 0.02;

/**
 * The thesis: a one- or two-sentence observation in a researcher's voice,
 * generated entirely from the event core so the words can never disagree with
 * the chart. Handles clean wins, near-misses, collapses, hedges, lead-from-start
 * runs, and flat/unresolved finishes; when it cannot classify confidently it
 * states the ambiguity instead of forcing a narrative.
 */
export function composeThesis(ev: ClimbEvents): string {
  const w = ev.winner;
  const W = prose(w.token);
  const finalPct = asPct(w.finalProb);
  const leadLayer = ev.leadTakenLayer;

  // 1. Collapse: the model was confident, then gave most of it back.
  if (ev.collapse) {
    const head = `The model briefly commits to ${W} at layer ${w.peakLayer} (${asPct(w.peak)}), but confidence collapses`;
    return ev.hedge
      ? `${head} and the run ends in a ${waysWord(ev.ways)}-way hedge.`
      : `${head}, finishing at just ${finalPct}.`;
  }

  // 2. Hedge: several near-equal finishers, none separates.
  if (ev.hedge) {
    return `No single candidate separates: the run ends in a ${waysWord(ev.ways)}-way hedge near ${finalPct}, led narrowly by ${W}.`;
  }

  // 3. Flat finish: honesty over forced narrative.
  if (w.finalProb < FLAT_FINAL) {
    return `No clear prediction forms: the final distribution stays flat, with ${cap(W)} only narrowly on top at ${finalPct}.`;
  }

  const runnerFinal = ev.contenders[0]?.finalProb ?? 0;
  const decisive = w.finalProb >= 0.1 && w.finalProb >= 2 * runnerFinal;

  // 4. Near-miss: a genuinely close contest the winner holds (not a decisive win
  //    that merely happens to have one runner-up).
  if (ev.nearMiss && !decisive) {
    const C = cap(prose(ev.contenders[0].token));
    return `${cap(W)} takes the lead at layer ${leadLayer} and remains ahead through the final layers. ${C} closes the gap but never overtakes.`;
  }

  // 5. A win. Distinguish lead-from-start vs a real crossover, decisive vs narrow.
  if (leadLayer <= 1) {
    return decisive
      ? `${cap(W)} leads from the opening layers and finishes at ${finalPct}, never seriously challenged.`
      : `${cap(W)} leads throughout but only reaches ${finalPct} by the final layer.`;
  }
  return decisive
    ? `${cap(W)} takes the lead at layer ${leadLayer} and pulls clearly ahead, finishing at ${finalPct}.`
    : `${cap(W)} edges ahead at layer ${leadLayer} and holds a narrow lead, finishing at ${finalPct}.`;
}

/**
 * The story of one candidate, for hover interrogation: not its current value (the
 * readout shows that, layer-aware) but its arc across the whole forward pass —
 * when it emerged, whether it ever led, where it peaked, and whether it then
 * collapsed. Composed from the same event core so it can never contradict the
 * chart. Researcher voice, one sentence.
 */
export function composeCandidateStory(t: TokenTrajectory, ev: ClimbEvents): string {
  const led: number[] = [];
  ev.perLayerLeader.forEach((tok, l) => {
    if (tok === t.token) led.push(l);
  });
  const leadsEnd = ev.perLayerLeader[ev.perLayerLeader.length - 1] === t.token;
  const collapsed = t.peak >= 0.3 && t.finalProb < t.peak * 0.4;
  const emergedAt = t.probs.findIndex((p) => p >= 0.02);
  const W = cap(prose(t.token));

  let lead: string;
  if (leadsEnd) lead = led[0] <= 1 ? "led from the opening layers" : `took the lead at layer ${led[0]}`;
  else if (led.length) lead = `briefly led at layer ${led[0]}`;
  else lead = "never led";

  let arc = `peaked at ${asPct(t.peak)} (layer ${t.peakLayer})`;
  if (collapsed) arc += `, then collapsed to ${asPct(t.finalProb)}`;

  const emerge = emergedAt > 1 && (led[0] ?? 99) !== 0 ? `emerged at layer ${emergedAt}, ` : "";
  return `${W} ${emerge}${lead}; it ${arc}.`;
}

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
