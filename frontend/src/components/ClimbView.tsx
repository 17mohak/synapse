import { useEffect, useRef } from "react";
import * as d3 from "d3";

import type { AnalyzeResponse } from "../api/client";
import "./ClimbView.css";

interface ClimbViewProps {
  result: AnalyzeResponse;
}

// Candidate Y ticks (true probabilities). Printed where they actually fall on
// the sqrt scale, so the axis stays honest while the low-probability race is
// lifted off the baseline.
const Y_TICKS = [0, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0];

// Draw at most this many lines (highest-peak first), so early spikes and the
// late race are both retained without clutter.
const MAX_LINES = 6;

// M3: draw the trajectories as continuous lines on the M2 axes. Y is a
// square-root probability scale over the full domain (decision recorded in
// CONTEXT.md): nothing is clipped, early high-confidence spikes stay visible,
// and the low-probability late race is lifted off the baseline. No labels,
// crossover nodes, entropy ribbon, scrubber, or motion yet.
export default function ClimbView({ result }: ClimbViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nLayers = result.trajectories[0]?.probs.length ?? 12;
    const globalPeak = d3.max(result.trajectories, (t) => t.peak) ?? 1;
    const yMax = Math.min(1, globalPeak * 1.02); // hair of headroom above the tallest spike

    const width = 920;
    const height = 460;
    const margin = { top: 20, right: 140, bottom: 44, left: 56 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, nLayers - 1]).range([0, innerW]);
    const y = d3.scaleSqrt().domain([0, yMax]).range([innerH, 0]);

    // Y axis: true-probability ticks placed on the sqrt scale, faint gridlines.
    const yTickValues = Y_TICKS.filter((v) => v <= yMax);
    const yg = g
      .append("g")
      .attr("class", "climb-axis")
      .call(d3.axisLeft(y).tickValues(yTickValues).tickFormat(d3.format(".0%")));
    yg.select(".domain").remove();
    yg.selectAll(".tick line").attr("x2", innerW).attr("class", "climb-grid");

    // X axis: one tick per layer, 0..nLayers-1.
    const xg = g
      .append("g")
      .attr("class", "climb-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(d3.range(nLayers)).tickFormat(d3.format("d")));
    xg.select(".domain").remove();
    xg.selectAll(".tick line").attr("y2", 4);

    // Axis labels.
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

    // Trajectories: highest-peak first, capped, as continuous monotone lines.
    const drawn = [...result.trajectories]
      .sort((a, b) => b.peak - a.peak)
      .slice(0, MAX_LINES);

    const line = d3
      .line<number>()
      .x((_d, i) => x(i))
      .y((d) => y(d))
      .curve(d3.curveMonotoneX);

    g.append("g")
      .attr("class", "climb-lines")
      .selectAll("path")
      .data(drawn, (d) => (d as AnalyzeResponse["trajectories"][number]).token)
      .join("path")
      .attr("class", "climb-line")
      .attr("d", (d) => line(d.probs));
  }, [result]);

  return (
    <section className="climb" aria-label="The Climb">
      <header className="climb__head">
        <h2 className="climb__title">The Climb</h2>
        <p className="climb__caption">
          Each line is one candidate next token; its height is that token&rsquo;s probability
          at each layer. Y is a square-root probability scale (ticks mark true probabilities),
          so the low-probability late race stays legible without hiding the early
          high-confidence spikes. Lines only for now.
        </p>
      </header>
      <div className="climb__plot">
        <svg
          ref={svgRef}
          className="climb__svg"
          role="img"
          aria-label="Logit-lens probability trajectories across layers"
        />
      </div>
    </section>
  );
}
