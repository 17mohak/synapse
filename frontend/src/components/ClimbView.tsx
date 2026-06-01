import { useEffect, useId, useMemo, useRef } from "react";
import * as d3 from "d3";

import type { AnalyzeResponse, TokenTrajectory } from "../api/client";
import { useStore } from "../state/store";
import { deriveClimbEvents, composeThesis, deriveVerdict } from "./climbEvents";
import ClimbScrubber from "./ClimbScrubber";
import ClimbReadout from "./ClimbReadout";
import "./ClimbView.css";

interface ClimbViewProps {
  result: AnalyzeResponse;
}

const Y_TICKS = [0, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0];
const MAX_LINES = 6;
const SWEEP_MS = 2600; // one steady pass through the layers

const prose = (t: string) => t.trim(); // the token as a word, for the verdict
const VERDICT_FOCAL = 34; // winner word size (viewBox units)
const VERDICT_MIN = 14; // floor so small rivals stay readable

// The Race. The scene is built once per analysis (so lines are never recreated,
// reordered, or made to jump). A single applyLayer(frontier) drives everything
// from one value: a clip reveals the trajectories and entropy up to the current
// layer, a cursor tracks it, the winner ignites amber at the decisive layer, and
// the readout follows. A steady d3.timer sweeps that frontier 0 -> last after
// each analysis; scrubbing cancels it; reduced motion renders the resolved state.
export default function ClimbView({ result }: ClimbViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const applyRef = useRef<((frontier: number) => void) | null>(null);
  const clipId = useId().replace(/:/g, "");

  const playheadLayer = useStore((s) => s.playheadLayer);
  const playState = useStore((s) => s.playState);
  const setPlayheadLayer = useStore((s) => s.setPlayheadLayer);
  const setPlayState = useStore((s) => s.setPlayState);

  const events = useMemo(() => deriveClimbEvents(result.trajectories), [result]);
  const thesis = events.winner ? composeThesis(events) : null;

  // --- Effect A: build the scene once, then sweep (or render resolved). ---
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const trajectories = result.trajectories;
    const nLayers = trajectories[0]?.probs.length ?? 12;
    const last = nLayers - 1;
    const globalPeak = d3.max(trajectories, (t) => t.peak) ?? 1;
    const yMax = Math.min(1, globalPeak * 1.02);

    const width = 920;
    const margin = { top: 20, right: 150, bottom: 48, left: 56 };
    const innerW = width - margin.left - margin.right;
    // The entropy ribbon is gone (its story — the model's doubt — is now told by
    // the verdict's moat). The race grows into the reclaimed space so the
    // trajectories breathe and the winner's standing has room to read.
    const innerH = 452;
    const svgHeight = margin.top + innerH + margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${svgHeight}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, last]).range([0, innerW]);
    const y = d3.scaleSqrt().domain([0, yMax]).range([innerH, 0]);

    // Axes.
    const yg = g
      .append("g")
      .attr("class", "climb-axis")
      .call(d3.axisLeft(y).tickValues(Y_TICKS.filter((v) => v <= yMax)).tickFormat(d3.format(".0%")));
    yg.select(".domain").remove();
    yg.selectAll(".tick line").attr("x2", innerW).attr("class", "climb-grid");

    const xg = g
      .append("g")
      .attr("class", "climb-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(d3.range(nLayers)).tickFormat(d3.format("d")));
    xg.select(".domain").remove();
    xg.selectAll(".tick line").attr("y2", 4);

    g.append("text").attr("class", "climb__axislabel").attr("x", innerW / 2).attr("y", innerH + 38).attr("text-anchor", "middle").text("layer");
    g.append("text").attr("class", "climb__axislabel").attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -42).attr("text-anchor", "middle").text("probability (√ scale)");

    // Tiers + drawn set (winner + contenders, then high-peak fill).
    const { winner, contenders } = events;
    const labelled = new Set<string>([winner?.token, ...contenders.map((t) => t.token)].filter(Boolean) as string[]);
    const drawn: TokenTrajectory[] = [winner, ...contenders].filter(Boolean) as TokenTrajectory[];
    for (const t of [...trajectories].sort((a, b) => b.peak - a.peak)) {
      if (drawn.length >= MAX_LINES) break;
      if (!drawn.includes(t)) drawn.push(t);
    }
    const tierOf = (t: TokenTrajectory) => (t.token === winner?.token ? "winner" : labelled.has(t.token) ? "contender" : "bg");
    const tierRank = { bg: 0, contender: 1, winner: 2 } as const;
    const ordered = [...drawn].sort((a, b) => tierRank[tierOf(a)] - tierRank[tierOf(b)]);

    const line = d3.line<number>().x((_d, i) => x(i)).y((d) => y(d)).curve(d3.curveMonotoneX);

    // Ghost layer (the full, faint "not yet revealed" scaffold) — always visible.
    const ghostG = g.append("g").attr("class", "climb-ghost");
    ghostG.selectAll("path.climb-line")
      .data(ordered, (d) => (d as TokenTrajectory).token)
      .join("path")
      .attr("class", (d) => `climb-line climb-line--ghost climb-line--${tierOf(d)}`)
      .attr("d", (d) => line(d.probs));

    // Reveal layer (full-fidelity, clipped to x <= frontier).
    svg.append("clipPath").attr("id", clipId).append("rect").attr("class", "climb-clip").attr("x", -4).attr("y", -20).attr("width", 0).attr("height", innerH + 40);
    const revealG = g.append("g").attr("class", "climb-reveal").attr("clip-path", `url(#${clipId})`);
    revealG.selectAll("path.climb-line--solid")
      .data(ordered, (d) => (d as TokenTrajectory).token)
      .join("path")
      .attr("class", (d) => `climb-line climb-line--solid climb-line--${tierOf(d)}`)
      .attr("d", (d) => line(d.probs));

    // The verdict, "The Standing": the winner and the rivals the model still
    // entertains, placed on an implicit probability axis (higher = more probable).
    // The empty gap beneath the winner is the model's confidence; a rival pressed
    // against it is its doubt. This replaces the endpoint labels and is the answer
    // to "did it know?". (Static at the final layer for r1; animated later.)
    const verdict = deriveVerdict(trajectories);
    const winnerProb = verdict[0]?.finalProb || 1;
    const yV = d3.scaleLinear().domain([0, winnerProb]).range([innerH - 8, 16]);
    const vItems = verdict.map((c) => ({
      token: prose(c.token),
      isWinner: c.isWinner,
      size: c.isWinner ? VERDICT_FOCAL : Math.max(VERDICT_MIN, VERDICT_FOCAL * c.ratio),
      vy: yV(c.finalProb),
    }));
    // De-collide downward: where probabilities are close (a hedge) the words pack
    // tight; where the winner dominates (it knew) the natural gap is preserved.
    let prevBottom = -Infinity;
    for (const it of vItems) {
      const gap = it.size * 0.92;
      it.vy = Math.max(it.vy, prevBottom + gap);
      prevBottom = it.vy;
    }
    const verdictX = innerW + margin.right - 8; // right edge of the right margin
    const vg = g.append("g").attr("class", "climb-verdict");
    for (const it of vItems) {
      vg.append("text")
        .attr("class", it.isWinner ? "climb-verdict__word climb-verdict__word--winner" : "climb-verdict__word")
        .attr("x", verdictX)
        .attr("y", it.vy)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .style("font-size", `${it.size}px`)
        .text(it.token);
    }
    // A small amber marker where the winning line ends, anchoring the verdict.
    vg.append("circle").attr("class", "climb-verdict__anchor").attr("cx", innerW).attr("cy", y(winnerProb)).attr("r", 3);

    // Event nodes (decisive moment), hidden until the sweep reaches them.
    const nodeG = g.append("g").attr("class", "climb-nodes");
    for (const ev of events.nodes) {
      nodeG.append("circle").attr("class", "climb-node").attr("cx", x(ev.layer)).attr("cy", y(ev.prob)).attr("r", 4.5);
      nodeG.append("text").attr("class", "climb-nodelabel").attr("x", x(ev.layer)).attr("y", y(ev.prob) - 10).attr("text-anchor", "middle").text(ev.label);
    }

    // Playhead cursor + current-layer dots.
    const playhead = g.append("line").attr("class", "climb-playhead").attr("y1", 0).attr("y2", innerH);
    const dotData = [winner, ...contenders].filter(Boolean) as TokenTrajectory[];
    const playdots = g.append("g").attr("class", "climb-playdots").selectAll("circle")
      .data(dotData, (d) => (d as TokenTrajectory).token)
      .join("circle")
      .attr("class", (d) => (d.token === winner?.token ? "climb-playdot climb-playdot--winner" : "climb-playdot"))
      .attr("r", 3);

    const clip = svg.select<SVGRectElement>(".climb-clip");
    const igniteLayer = events.nodes[0]?.layer ?? null;

    // Did the winner clearly separate? (Same test composeThesis uses for "pulls
    // clearly ahead".) Only then do we quiet the also-rans once the race settles,
    // so the lone answer reads. A hedge or near-miss never separates, so its
    // crowd stays co-present at rest — the honest picture of "didn't know".
    const runnerFinal = events.contenders[0]?.finalProb ?? 0;
    const decisive = !!winner && winner.finalProb >= 0.1 && winner.finalProb >= 2 * runnerFinal;

    // The one function that maps a (possibly fractional) layer to the whole scene.
    const applyLayer = (frontier: number) => {
      const f = Math.max(0, Math.min(last, frontier));
      const fx = x(f);
      clip.attr("width", Math.max(0, fx + 1));
      playhead.attr("x1", fx).attr("x2", fx);

      const ignited = igniteLayer == null || f >= igniteLayer - 1e-6;
      revealG.classed("is-ignited", ignited);
      nodeG.style("opacity", ignited ? 1 : 0);

      // At rest on the final, resolved layer the winner stands alone (decisive
      // runs only); scrub back to any earlier layer and the field returns.
      revealG.classed("is-resolved", decisive && f >= last - 1e-6);

      const li = Math.round(f);
      xg.selectAll<SVGGElement, number>(".tick").classed("climb-tick--active", (d) => d === li);

      const parked = Math.abs(f - li) < 1e-6;
      playdots.style("opacity", parked ? 1 : 0).attr("cx", fx).attr("cy", (d) => y(d.probs[li] ?? 0));
    };
    applyRef.current = applyLayer;

    // Sweep, or render the resolved state under reduced motion.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      applyLayer(last);
      setPlayState("idle");
      return;
    }
    applyLayer(0);
    setPlayState("sweeping");
    const timer = d3.timer((elapsed) => {
      if (useStore.getState().playState !== "sweeping") {
        timer.stop();
        return;
      }
      const frontier = Math.min(last, (elapsed / SWEEP_MS) * last);
      applyLayer(frontier);
      const li = Math.min(last, Math.round(frontier));
      if (li !== useStore.getState().playheadLayer) setPlayheadLayer(li);
      if (elapsed >= SWEEP_MS) {
        applyLayer(last);
        setPlayheadLayer(last);
        setPlayState("idle");
        timer.stop();
      }
    });
    return () => timer.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, events, clipId]);

  // --- Effect B: manual scrub (only when the sweep is not running). ---
  useEffect(() => {
    if (playState !== "sweeping") applyRef.current?.(playheadLayer);
  }, [playheadLayer, playState]);

  return (
    <section className="climb" aria-label="The Climb">
      <header className="climb__head">
        {thesis && <h2 className="climb__thesis">{thesis}</h2>}
        <p className="climb__scalenote">
          Each line is one candidate next token by layer, on a square-root probability
          scale (ticks mark true probabilities). The{" "}
          <span className="climb__amber">amber line</span> is the model&rsquo;s final
          prediction.
        </p>
      </header>
      <div className="climb__plot">
        <svg
          ref={svgRef}
          className="climb__svg"
          role="img"
          aria-label="Logit-lens probability trajectories across layers, with the winning and contending tokens labelled"
        />
      </div>
      <ClimbScrubber result={result} />
      <ClimbReadout result={result} />
    </section>
  );
}
