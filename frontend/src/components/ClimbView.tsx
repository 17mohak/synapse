import { useEffect, useRef } from "react";
import * as d3 from "d3";

import type { AnalyzeResponse } from "../api/client";
import "./ClimbView.css";

interface ClimbViewProps {
  result: AnalyzeResponse;
}

// M2 scaffold: render only the axes for The Race. The Y domain adapts to the
// data (peak probability any candidate reaches, plus headroom) so a low-
// confidence GPT-2-small race still fills the vertical space honestly. No
// trajectories, labels, entropy, playhead, or interaction yet.
export default function ClimbView({ result }: ClimbViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nLayers = result.trajectories[0]?.probs.length ?? 12;
    const maxProb = d3.max(result.trajectories, (t) => t.peak) ?? 1;
    // Adaptive linear domain: 0 -> peak prob + 20% headroom, capped at 100%.
    const yMax = Math.min(1, maxProb * 1.2);

    const width = 920;
    const height = 460;
    const margin = { top: 20, right: 140, bottom: 44, left: 56 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, nLayers - 1]).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

    // Y axis: real probabilities, with faint full-width gridlines as the frame.
    const yg = g
      .append("g")
      .attr("class", "climb-axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")));
    yg.select(".domain").remove();
    yg.selectAll(".tick line").attr("x2", innerW).attr("class", "climb-grid");

    // X axis: one tick per layer, 0..nLayers-1.
    const xg = g
      .append("g")
      .attr("class", "climb-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(d3.range(nLayers))
          .tickFormat(d3.format("d")),
      );
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
      .text("probability");
  }, [result]);

  return (
    <section className="climb" aria-label="The Climb">
      <header className="climb__head">
        <h2 className="climb__title">The Climb</h2>
        <p className="climb__caption">
          Probability of each candidate next token, read at every layer. Y scale is
          linear and adapts to the peak probability in this run. Axes only for now.
        </p>
      </header>
      <div className="climb__plot">
        <svg
          ref={svgRef}
          className="climb__svg"
          role="img"
          aria-label="Logit-lens trajectory axes: layer on the x axis, probability on the y axis"
        />
      </div>
    </section>
  );
}
