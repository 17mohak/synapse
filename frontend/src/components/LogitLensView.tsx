import { useEffect, useRef } from "react";
import * as d3 from "d3";

import type { AnalyzeResponse } from "../api/client";
import { useStore } from "../state/store";
import "./LogitLensView.css";

interface LogitLensViewProps {
  result: AnalyzeResponse;
}

// OKLCH probability ramp stops (see DESIGN.md). Piecewise-linear interpolation
// in OKLCH space: low probability -> cool faint grey, high -> amber (the answer).
const RAMP: { L: number; C: number; h: number }[] = [
  { L: 0.38, C: 0.01, h: 256 },
  { L: 0.52, C: 0.04, h: 120 },
  { L: 0.65, C: 0.09, h: 95 },
  { L: 0.76, C: 0.13, h: 84 },
  { L: 0.84, C: 0.15, h: 80 },
];

/** Map probability [0,1] -> {css oklch string, L} along the ramp. */
function ramp(prob: number): { css: string; L: number } {
  const p = Math.max(0, Math.min(1, prob));
  const seg = p * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(seg));
  const t = seg - i;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  const L = a.L + (b.L - a.L) * t;
  const C = a.C + (b.C - a.C) * t;
  const h = a.h + (b.h - a.h) * t;
  return { css: `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`, L };
}

const PROB_GAMMA = 0.5; // perceptual boost so small early-layer probs still register

export default function LogitLensView({ result }: LogitLensViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const setSelectedLayer = useStore((s) => s.setSelectedLayer);

  // The model's actual next-token answer, and the first layer where the lens'
  // top-1 first matches it — "where the answer crystallizes".
  const answer = result.next_token_topk[0]?.token ?? "";
  const resolveLayer = result.logit_lens.findIndex(
    (l) => l.predictions[0]?.token === answer,
  );

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const layers = result.logit_lens;
    const k = Math.max(...layers.map((l) => l.predictions.length));
    const colW = 88;
    const rowH = 46;
    const gutter = 26; // left rank gutter
    const headerH = 22; // bottom layer-label row
    const gap = 6;

    const width = gutter + layers.length * colW;
    const height = headerH + k * (rowH + gap);

    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const plot = svg.append("g");

    // Rank gutter (1..k) down the left edge.
    plot
      .append("g")
      .selectAll("text")
      .data(d3.range(k))
      .join("text")
      .attr("x", gutter - 10)
      .attr("y", (r) => r * (rowH + gap) + rowH / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("class", "lens__rank")
      .text((r) => `#${r + 1}`);

    // One group per layer column.
    const cols = plot
      .selectAll("g.lens__col")
      .data(layers)
      .join("g")
      .attr("class", "lens__col")
      .attr("transform", (l) => `translate(${gutter + l.layer * colW}, 0)`)
      .style("cursor", "pointer")
      .on("mouseenter", (_e, l) => setSelectedLayer(l.layer))
      .on("mouseleave", () => setSelectedLayer(null));

    // Cells: one per (layer, rank).
    cols.each(function (layer) {
      const col = d3.select(this);
      col
        .selectAll("g.lens__cell")
        .data(layer.predictions)
        .join("g")
        .attr("class", "lens__cell")
        .attr("transform", (_p, r) => `translate(0, ${r * (rowH + gap)})`)
        .each(function (pred) {
          const cell = d3.select(this);
          const { css, L } = ramp(Math.pow(pred.prob, PROB_GAMMA));
          const isAnswer = pred.token === answer;
          const darkText = L >= 0.72;

          cell
            .append("rect")
            .attr("width", colW - gap)
            .attr("height", rowH)
            .attr("rx", 6)
            .attr("fill", css)
            .attr("class", isAnswer ? "lens__rect lens__rect--answer" : "lens__rect");

          // Token string (monospace).
          cell
            .append("text")
            .attr("x", 10)
            .attr("y", rowH / 2 - 5)
            .attr("dominant-baseline", "central")
            .attr("class", "lens__token")
            .attr("fill", darkText ? "var(--accent-ink)" : "var(--ink)")
            .text(pred.token.replace(/^ /, "·"));

          // Probability label.
          cell
            .append("text")
            .attr("x", 10)
            .attr("y", rowH / 2 + 11)
            .attr("dominant-baseline", "central")
            .attr("class", "lens__prob")
            .attr("fill", darkText ? "var(--accent-ink)" : "var(--muted)")
            .text(`${(pred.prob * 100).toFixed(1)}%`);

          // Bottom underline encodes probability by LENGTH (color-blind safe).
          cell
            .append("rect")
            .attr("x", 0)
            .attr("y", rowH - 3)
            .attr("height", 3)
            .attr("rx", 1.5)
            .attr("fill", darkText ? "var(--accent-ink)" : "var(--ink)")
            .attr("opacity", 0.55)
            .attr("width", (colW - gap) * pred.prob);
        });
    });

    // Bottom layer labels L0..L11.
    plot
      .append("g")
      .selectAll("text")
      .data(layers)
      .join("text")
      .attr("x", (l) => gutter + l.layer * colW + (colW - gap) / 2)
      .attr("y", height - 6)
      .attr("text-anchor", "middle")
      .attr("class", (l) =>
        resolveLayer >= 0 && l.layer === resolveLayer
          ? "lens__layerlabel lens__layerlabel--resolve"
          : "lens__layerlabel",
      )
      .text((l) => `L${l.layer}`);

    // Left-to-right reveal: columns rise + fade in, staggered by layer.
    if (!reduce) {
      cols
        .attr("opacity", 0)
        .attr(
          "transform",
          (l) => `translate(${gutter + l.layer * colW}, 8)`,
        )
        .transition()
        .duration(300)
        .delay((l) => l.layer * 38)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1)
        .attr("transform", (l) => `translate(${gutter + l.layer * colW}, 0)`);
    }
  }, [result, answer, resolveLayer, setSelectedLayer]);

  return (
    <section className="lens" aria-label="Logit lens">
      <header className="lens__head">
        <h2 className="lens__title">Logit lens</h2>
        <p className="lens__caption">
          The model&rsquo;s top guesses for the next token, read out of the residual
          stream at each of the 12 layers.{" "}
          {answer && resolveLayer >= 0 ? (
            <>
              <span className="lens__token-inline">{answer.replace(/^ /, "·")}</span>{" "}
              reaches the top at <strong>layer {resolveLayer}</strong>.
            </>
          ) : answer ? (
            <>
              Final prediction:{" "}
              <span className="lens__token-inline">{answer.replace(/^ /, "·")}</span>.
            </>
          ) : null}
        </p>
      </header>
      <div className="lens__scroll" role="img" aria-label="Per-layer top token heatmap">
        <svg ref={svgRef} className="lens__svg" />
      </div>
    </section>
  );
}
