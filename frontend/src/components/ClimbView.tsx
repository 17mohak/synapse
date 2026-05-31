import { useEffect, useRef } from "react";
import * as d3 from "d3";

import type { AnalyzeResponse, TokenTrajectory } from "../api/client";
import "./ClimbView.css";

interface ClimbViewProps {
  result: AnalyzeResponse;
}

// True-probability ticks, printed where they fall on the sqrt scale.
const Y_TICKS = [0, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0];
const MAX_LINES = 6;

// A token counts as a "serious contender" if it finishes within this fraction
// of the winner's final probability and clears a small floor. Drives who the
// reader should read as "almost won".
const CONTENDER_RATIO = 0.4;
const CONTENDER_FLOOR = 0.01;
const MAX_CONTENDERS = 3;

const disp = (t: string) => t.replace(/^ /, "·"); // show leading BPE space
const pct = d3.format(".1%");

// M4: name the lines. Tiers are driven by final-layer probability (the race
// outcome), not by peak, so transient early spikes stay background. The winner
// (model's actual prediction) gets the amber leader emphasis; serious
// contenders are labelled in neutral ink; background candidates recede and are
// left unlabelled. Endpoint labels are de-collided vertically. No crossover
// nodes, entropy ribbon, playhead, scrubber, or motion yet.
export default function ClimbView({ result }: ClimbViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const trajectories = result.trajectories;
    const nLayers = trajectories[0]?.probs.length ?? 12;
    const globalPeak = d3.max(trajectories, (t) => t.peak) ?? 1;
    const yMax = Math.min(1, globalPeak * 1.02);

    const width = 920;
    const height = 460;
    const margin = { top: 20, right: 150, bottom: 44, left: 56 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);
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

    // --- Tiers (by final-layer probability) ---
    const byFinal = [...trajectories].sort((a, b) => b.finalProb - a.finalProb);
    const winner = byFinal[0];
    const contenders = byFinal
      .slice(1)
      .filter(
        (t) =>
          winner != null &&
          t.finalProb >= winner.finalProb * CONTENDER_RATIO &&
          t.finalProb >= CONTENDER_FLOOR,
      )
      .slice(0, MAX_CONTENDERS);
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

    // Draw background first, winner last (on top).
    g.append("g")
      .attr("class", "climb-lines")
      .selectAll("path")
      .data(
        [...drawn].sort((a, b) => tierRank[tierOf(a)] - tierRank[tierOf(b)]),
        (d) => (d as TokenTrajectory).token,
      )
      .join("path")
      .attr("class", (d) => `climb-line climb-line--${tierOf(d)}`)
      .attr("d", (d) => line(d.probs));

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
  }, [result]);

  return (
    <section className="climb" aria-label="The Climb">
      <header className="climb__head">
        <h2 className="climb__title">The Climb</h2>
        <p className="climb__caption">
          Each line is one candidate next token, by layer. The{" "}
          <span className="climb__amber">amber line</span> is the model&rsquo;s final
          prediction; labelled lines are the serious contenders. Y is a square-root
          probability scale (ticks mark true probabilities).
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
    </section>
  );
}
