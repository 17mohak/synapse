import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

import type { AnalyzeResponse, TokenTrajectory } from "../api/client";
import { useStore } from "../state/store";
import { deriveClimbEvents, composeThesis } from "./climbEvents";
import ClimbScrubber from "./ClimbScrubber";
import ClimbReadout from "./ClimbReadout";
import "./ClimbView.css";

interface ClimbViewProps {
  result: AnalyzeResponse;
}

// True-probability ticks, printed where they fall on the sqrt scale.
const Y_TICKS = [0, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0];
const MAX_LINES = 6;

const disp = (t: string) => t.replace(/^ /, "·"); // show leading BPE space
const pct = d3.format(".1%");

// The Race. A data-derived thesis sentence (the highest-value text in the view)
// leads; the chart is its supporting evidence. Lines are tiered by final-layer
// probability (amber winner, neutral contenders, faint background), labelled at
// their endpoints with de-collision, and the single decisive event is ringed.
// Thesis and chart both read from the same climbEvents derivation, so they can
// never disagree. No entropy ribbon, playhead, scrubber, or motion yet.
export default function ClimbView({ result }: ClimbViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const playheadLayer = useStore((s) => s.playheadLayer);

  // Single derivation for both the thesis (rendered in JSX) and the D3 chart.
  const events = useMemo(() => deriveClimbEvents(result.trajectories), [result]);
  const thesis = events.winner ? composeThesis(events) : null;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const trajectories = result.trajectories;
    const nLayers = trajectories[0]?.probs.length ?? 12;
    const L = Math.max(0, Math.min(nLayers - 1, playheadLayer)); // current layer
    const atRest = L === nLayers - 1; // parked at the final, fully-revealed layer
    const globalPeak = d3.max(trajectories, (t) => t.peak) ?? 1;
    const yMax = Math.min(1, globalPeak * 1.02);

    const width = 920;
    const chartHeight = 460;
    const svgHeight = 556; // chart + the entropy ribbon below it
    const margin = { top: 20, right: 150, bottom: 44, left: 56 };
    const innerW = width - margin.left - margin.right;
    const innerH = chartHeight - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${svgHeight}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, nLayers - 1]).range([0, innerW]);
    const y = d3.scaleSqrt().domain([0, yMax]).range([innerH, 0]);

    // Axes (unchanged from M3).
    const yTickValues = Y_TICKS.filter((v) => v <= yMax);
    const yg = g
      .append("g")
      .attr("class", "climb-axis")
      .call(d3.axisLeft(y).tickValues(yTickValues).tickFormat(d3.format(".0%")));
    yg.select(".domain").remove();
    yg.selectAll(".tick line").attr("x2", innerW).attr("class", "climb-grid");

    const xg = g
      .append("g")
      .attr("class", "climb-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(d3.range(nLayers)).tickFormat(d3.format("d")));
    xg.select(".domain").remove();
    xg.selectAll(".tick line").attr("y2", 4);

    g.append("text")
      .attr("class", "climb__axislabel")
      .attr("x", innerW / 2)
      .attr("y", innerH + 38)
      .attr("text-anchor", "middle")
      .text("layer");
    g.append("text")
      .attr("class", "climb__axislabel")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -42)
      .attr("text-anchor", "middle")
      .text("probability (√ scale)");

    // --- Tiers + nodes from the shared event derivation (component body) ---
    const { winner, contenders } = events;
    const labelled = new Set<string>([winner?.token, ...contenders.map((t) => t.token)].filter(Boolean) as string[]);

    // Drawn set: always the winner + contenders, then fill with high-peak lines.
    const drawn: TokenTrajectory[] = [winner, ...contenders].filter(Boolean) as TokenTrajectory[];
    for (const t of [...trajectories].sort((a, b) => b.peak - a.peak)) {
      if (drawn.length >= MAX_LINES) break;
      if (!drawn.includes(t)) drawn.push(t);
    }

    const tierOf = (t: TokenTrajectory) =>
      t.token === winner?.token ? "winner" : labelled.has(t.token) ? "contender" : "bg";
    const tierRank = { bg: 0, contender: 1, winner: 2 } as const;

    const line = d3
      .line<number>()
      .x((_d, i) => x(i))
      .y((d) => y(d))
      .curve(d3.curveMonotoneX);

    const ordered = [...drawn].sort((a, b) => tierRank[tierOf(a)] - tierRank[tierOf(b)]);
    const linesG = g.append("g").attr("class", "climb-lines");

    // Each trajectory is drawn twice: a faint ghost of the full path (the part
    // that "hasn't happened yet" at the current layer), and a solid segment from
    // layer 0 up to the playhead. At rest (final layer) the solid covers it all.
    linesG
      .selectAll("path.climb-line--ghost")
      .data(ordered, (d) => (d as TokenTrajectory).token)
      .join("path")
      .attr("class", (d) => `climb-line climb-line--ghost climb-line--${tierOf(d)}`)
      .attr("d", (d) => line(d.probs));
    linesG
      .selectAll("path.climb-line--solid")
      .data(ordered, (d) => (d as TokenTrajectory).token)
      .join("path")
      .attr("class", (d) => `climb-line climb-line--solid climb-line--${tierOf(d)}`)
      .attr("d", (d) => line(d.probs.slice(0, L + 1)));

    // --- Endpoint labels (winner + contenders), vertically de-collided ---
    const labelItems = [winner, ...contenders]
      .filter(Boolean)
      .map((t) => ({
        token: (t as TokenTrajectory).token,
        tier: tierOf(t as TokenTrajectory),
        final: (t as TokenTrajectory).finalProb,
        y0: y((t as TokenTrajectory).finalProb), // true endpoint y
        ly: y((t as TokenTrajectory).finalProb), // label y (adjusted below)
      }));

    // Greedy vertical declutter: enforce a min gap top-to-bottom, then lift the
    // block if it overflows the plot bottom.
    const MIN_GAP = 15;
    labelItems.sort((a, b) => a.ly - b.ly);
    let last = -Infinity;
    for (const it of labelItems) {
      it.ly = Math.max(it.ly, last + MIN_GAP);
      last = it.ly;
    }
    const overflow = last - innerH;
    if (overflow > 0) for (const it of labelItems) it.ly -= overflow;

    const labels = g.append("g").attr("class", "climb-labels");
    for (const it of labelItems) {
      // Endpoint dot on the line.
      labels
        .append("circle")
        .attr("class", `climb-dot climb-dot--${it.tier}`)
        .attr("cx", innerW)
        .attr("cy", it.y0)
        .attr("r", it.tier === "winner" ? 3 : 2.25);
      // Connector from endpoint to displaced label.
      if (Math.abs(it.ly - it.y0) > 1) {
        labels
          .append("path")
          .attr("class", "climb-connector")
          .attr("d", `M${innerW},${it.y0} L${innerW + 8},${it.ly}`);
      }
      // Label text: token + final probability.
      labels
        .append("text")
        .attr("class", `climb-label climb-label--${it.tier}`)
        .attr("x", innerW + 12)
        .attr("y", it.ly)
        .attr("dominant-baseline", "middle")
        .text(`${disp(it.token)}  ${pct(it.final)}`);
    }

    // --- Event nodes: the single decisive moment (crossover or collapse) ---
    const nodeG = g.append("g").attr("class", "climb-nodes");
    for (const ev of events.nodes) {
      const cx = x(ev.layer);
      const cy = y(ev.prob);
      nodeG
        .append("circle")
        .attr("class", "climb-node")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 4.5);
      nodeG
        .append("text")
        .attr("class", "climb-nodelabel")
        .attr("x", cx)
        .attr("y", cy - 10)
        .attr("text-anchor", "middle")
        .text(ev.label);
    }

    // --- Entropy ribbon: a second, quiet channel. The Race answers "what does
    // the model believe?"; this answers "how certain is it?". Raw per-layer
    // entropy (bits) on a fixed 0..log2(vocab) domain so spikes stay honest and
    // comparable across prompts; deliberately not normalised or smoothed. ---
    // Fixed, comparable ceiling. The theoretical max is log2(vocab) ≈ 15.6, but
    // GPT-2 small's per-layer entropy never approaches it (observed ≲ 9.5 bits),
    // so a fixed 10-bit reference keeps the shape legible while the printed end
    // value stays exact. Fixed (not per-prompt) so spikes stay honest.
    const MAX_ENTROPY = 10;
    const entropy = result.entropy ?? [];
    const ribbonTop = innerH + 38 + 26; // below the "layer" axis label
    const ribbonH = 52;
    const ribbonBase = ribbonTop + ribbonH;
    const entY = d3.scaleLinear().domain([0, MAX_ENTROPY]).range([ribbonBase, ribbonTop]).clamp(true);

    const ribbon = g.append("g").attr("class", "climb-ribbon");
    ribbon
      .append("line")
      .attr("class", "climb-ribbon__base")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", ribbonBase)
      .attr("y2", ribbonBase);
    ribbon
      .append("path")
      .datum(entropy)
      .attr("class", "climb-ribbon__area")
      .attr(
        "d",
        d3
          .area<number>()
          .x((_d, i) => x(i))
          .y0(ribbonBase)
          .y1((d) => entY(d))
          .curve(d3.curveMonotoneX),
      );
    ribbon
      .append("path")
      .datum(entropy)
      .attr("class", "climb-ribbon__line")
      .attr(
        "d",
        d3
          .line<number>()
          .x((_d, i) => x(i))
          .y((d) => entY(d))
          .curve(d3.curveMonotoneX),
      );
    ribbon
      .append("text")
      .attr("class", "climb-ribbon__label")
      .attr("x", 0)
      .attr("y", ribbonTop - 6)
      .text("uncertainty (bits)");
    const lastE = entropy[entropy.length - 1] ?? 0;
    ribbon
      .append("text")
      .attr("class", "climb-ribbon__end")
      .attr("x", innerW + 8)
      .attr("y", entY(lastE))
      .attr("dominant-baseline", "middle")
      .text(lastE.toFixed(1));

    // --- Playhead: mark the current layer across both channels. (The line
    //     reveal/ghost split was drawn above.) ---
    // Subordinate the (future) endpoint labels while parked on an earlier layer.
    labels.attr("opacity", atRest ? 1 : 0.5);

    // Emphasise the active layer's tick on the X axis.
    xg.selectAll<SVGGElement, number>(".tick")
      .filter((d) => d === L)
      .select("text")
      .classed("climb-tick--active", true);

    // A quiet vertical cursor through the chart and the ribbon.
    const px = x(L);
    g.append("line")
      .attr("class", "climb-playhead")
      .attr("x1", px)
      .attr("x2", px)
      .attr("y1", 0)
      .attr("y2", ribbonBase);

    // Dots where the labelled lines sit at the current layer.
    const playG = g.append("g").attr("class", "climb-playdots");
    for (const t of [winner, ...contenders].filter(Boolean) as TokenTrajectory[]) {
      playG
        .append("circle")
        .attr(
          "class",
          t.token === winner?.token ? "climb-playdot climb-playdot--winner" : "climb-playdot",
        )
        .attr("cx", px)
        .attr("cy", y(t.probs[L]))
        .attr("r", 3);
    }
  }, [result, events, playheadLayer]);

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
