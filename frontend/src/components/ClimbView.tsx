import { useEffect, useId, useMemo, useRef, useState } from "react";
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
// The winner is present, not shouting: the gap (the moat) is the hero, not the
// word size. Rivals shrink by how probable they are relative to the winner.
const WINNER_SIZE = 31; // winning word size (viewBox units)
const RIVAL_MAX = 25;
const RIVAL_MIN = 15; // floor so small rivals stay readable

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

  // The thesis is confirmation, not a spoiler: it stays hidden through the sweep
  // and lands once the race has resolved. Keyed on the result object so a new
  // analysis hides it again with no spoiler flash (computed during render, so it
  // is already false before the rebuild effect runs).
  const [revealedResult, setRevealedResult] = useState<AnalyzeResponse | null>(null);
  const revealed = revealedResult === result;

  // --- Effect A: build the scene once, then sweep (or render resolved). ---
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const trajectories = result.trajectories;
    const nLayers = trajectories[0]?.probs.length ?? 12;
    const last = nLayers - 1;
    const globalPeak = d3.max(trajectories, (t) => t.peak) ?? 1;
    const yMax = Math.min(1, globalPeak * 1.02);

    // The standing lives on the chart's own probability axis: the trajectories
    // resolve into large words at their final-layer height, and the empty gap
    // between the winner and its nearest rival — the moat — is the hero. The
    // right margin holds those words, so it is wide.
    const width = 1000;
    const margin = { top: 24, right: 292, bottom: 48, left: 56 };
    const innerW = width - margin.left - margin.right;
    const innerH = 452;
    const svgHeight = margin.top + innerH + margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${svgHeight}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, last]).range([0, innerW]);
    const y = d3.scaleSqrt().domain([0, yMax]).range([innerH, 0]);

    // Axes, kept to a Tufte whisper: faint reference lines carry the probability
    // meaning the moat depends on, nothing more. The rotated y-label is gone; a
    // small disclosure sits top-left instead, and the lines never compete.
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
    g.append("text").attr("class", "climb__axisnote").attr("x", 0).attr("y", -10).text("probability · √ scale");

    // Tiers + drawn set (winner + the nearest rival + contenders, then high-peak fill).
    const { winner, contenders } = events;
    // Did the winner clearly separate? (Same test composeThesis uses for "pulls
    // clearly ahead".) Drives both the rest-state line dimming and whether the
    // moat is drawn as a real lead or as a "no separation" hedge.
    const runnerFinal = contenders[0]?.finalProb ?? 0;
    const decisive = !!winner && winner.finalProb >= 0.1 && winner.finalProb >= 2 * runnerFinal;

    // The nearest rival is the runner-up the moat is measured against (the verdict's
    // [1]). It is promoted to a first-class line, distinct from the anonymous crowd,
    // so the gap the viewer watches form during the sweep is between two *named*
    // characters — the winner and the one answer that shadowed it the whole climb —
    // and so it stays present at rest as the moat's second anchor rather than
    // receding with the also-rans (the rival-shadow breakthrough; MOTION_DIRECTION
    // sec. 8). Computed here so the same verdict drives the tiers and the standing.
    const verdict = deriveVerdict(trajectories);
    const rivalToken = verdict[1]?.token ?? null;

    const labelled = new Set<string>([winner?.token, ...contenders.map((t) => t.token)].filter(Boolean) as string[]);
    const drawn: TokenTrajectory[] = [winner, ...contenders].filter(Boolean) as TokenTrajectory[];
    // Guarantee the nearest rival is always drawn: it may finish below the contender
    // ratio yet still be the line the moat measures against.
    const rivalTraj = rivalToken ? trajectories.find((t) => t.token === rivalToken) : undefined;
    if (rivalTraj && !drawn.includes(rivalTraj)) drawn.push(rivalTraj);
    for (const t of [...trajectories].sort((a, b) => b.peak - a.peak)) {
      if (drawn.length >= MAX_LINES) break;
      if (!drawn.includes(t)) drawn.push(t);
    }
    const tierOf = (t: TokenTrajectory): "bg" | "contender" | "rival" | "winner" =>
      t.token === winner?.token
        ? "winner"
        : t.token === rivalToken
          ? "rival"
          : labelled.has(t.token)
            ? "contender"
            : "bg";
    // Rival draws above the other contenders and the crowd, just beneath the winner,
    // so the two protagonists read as one race.
    const tierRank = { bg: 0, contender: 1, rival: 2, winner: 3 } as const;
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

    // The Standing. The trajectories resolve into words at their true final-layer
    // height on the SAME probability axis as the chart (so the chart and verdict
    // are one object). The hero is the moat: the empty span between the winner's
    // endpoint and its nearest rival's, on the real axis, labelled with the lead.
    // Words are de-collided only enough to stay legible and each is tied back to
    // its true endpoint by a faint connector, so the gap never lies. (The `verdict`
    // computed above for the rival tier is reused here — one source for both.)
    const wordX = innerW + 110; // left edge of the words (clears the moat label)
    const vItems = verdict.map((c) => ({
      token: prose(c.token),
      isWinner: c.isWinner,
      size: c.isWinner ? WINNER_SIZE : Math.max(RIVAL_MIN, Math.min(RIVAL_MAX, WINNER_SIZE * c.ratio)),
      trueY: y(c.finalProb), // honest position on the axis (for endpoints + moat)
      wy: y(c.finalProb), // rendered baseline (de-collided below)
    }));
    // De-collide downward for legibility, leaving the true endpoints untouched.
    let prevBottom = -Infinity;
    for (const it of vItems) {
      const gap = it.size * 0.96;
      it.wy = Math.max(it.wy, prevBottom + gap);
      prevBottom = it.wy;
    }

    const vg = g.append("g").attr("class", "climb-verdict");
    // Endpoint dots + connectors from each true axis position to its word.
    for (const it of vItems) {
      vg.append("circle")
        .attr("class", it.isWinner ? "climb-verdict__dot climb-verdict__dot--winner" : "climb-verdict__dot")
        .attr("cx", innerW).attr("cy", it.trueY).attr("r", it.isWinner ? 3.5 : 2.5);
      vg.append("path")
        .attr("class", "climb-verdict__connector")
        .attr("d", `M${innerW},${it.trueY} L${wordX - 8},${it.wy}`);
    }
    // The words themselves.
    for (const it of vItems) {
      vg.append("text")
        .attr("class", it.isWinner ? "climb-verdict__word climb-verdict__word--winner" : "climb-verdict__word")
        .attr("x", wordX)
        .attr("y", it.wy)
        .attr("dominant-baseline", "middle")
        .style("font-size", `${it.size}px`)
        .text(it.token);
    }

    // The moat: the measured void between the winner and its nearest rival, drawn
    // at their TRUE axis heights (honest), with the lead in points. A hedge never
    // separates, so it gets "no separation" instead of a lead.
    const moatX = innerW + 24;
    if (winner && verdict[1] && !events.hedge) {
      const yTop = y(winner.finalProb);
      const yBot = y(verdict[1].finalProb);
      const leadPts = Math.round((winner.finalProb - verdict[1].finalProb) * 100);
      const moat = vg.append("g").attr("class", "climb-moat");
      moat.append("line").attr("class", "climb-moat__rule").attr("x1", moatX).attr("x2", moatX).attr("y1", yTop).attr("y2", yBot);
      for (const yy of [yTop, yBot]) {
        moat.append("line").attr("class", "climb-moat__cap").attr("x1", moatX - 4).attr("x2", moatX + 4).attr("y1", yy).attr("y2", yy);
      }
      moat.append("text")
        .attr("class", "climb-moat__label")
        .attr("x", moatX + 9)
        .attr("y", (yTop + yBot) / 2)
        .attr("dominant-baseline", "middle")
        .text(leadPts >= 1 ? `${leadPts}-pt lead` : "<1-pt lead");
    } else if (winner && events.hedge) {
      vg.append("text")
        .attr("class", "climb-moat__label climb-moat__label--hedge")
        .attr("x", moatX)
        .attr("y", y(winner.finalProb) - 18)
        .text(`no separation · ${events.ways}-way`);
    }

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

    // The one function that maps a (possibly fractional) layer to the whole scene.
    const applyLayer = (frontier: number) => {
      const f = Math.max(0, Math.min(last, frontier));
      const fx = x(f);
      clip.attr("width", Math.max(0, fx + 1));
      playhead.attr("x1", fx).attr("x2", fx);

      const ignited = igniteLayer == null || f >= igniteLayer - 1e-6;
      revealG.classed("is-ignited", ignited);
      nodeG.style("opacity", ignited ? 1 : 0);

      // The standing belongs to the final layer: it stays hidden through the
      // approach and blooms in only once the race reaches the last layer (the
      // answer arrives, it is not pre-printed). Scrub back and it recedes.
      const atEnd = f >= last - 1e-6;
      vg.classed("is-revealed", atEnd);

      // At rest on the final, resolved layer the winner stands alone (decisive
      // runs only); scrub back to any earlier layer and the field returns.
      revealG.classed("is-resolved", decisive && atEnd);

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
    if (playState !== "sweeping") {
      applyRef.current?.(playheadLayer);
      // Settled (sweep finished, reduced motion, or manual control taken): the
      // race has resolved, so the confirming thesis may land. Setting the same
      // value is a no-op, so this is cheap to call on every scrub tick.
      setRevealedResult(result);
    }
  }, [playheadLayer, playState, result]);

  return (
    <section className="climb" aria-label="The Climb">
      <header className="climb__head">
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
      {/* The thesis is the payoff, not the premise: it stays hidden through the
          sweep and arrives once the race resolves, confirming what the standing
          already showed. aria-live announces it for screen readers. */}
      <p
        className={`climb__thesis${revealed ? " climb__thesis--revealed" : ""}`}
        aria-live="polite"
      >
        {revealed && thesis ? thesis : ""}
      </p>
      <ClimbScrubber result={result} />
      <ClimbReadout result={result} />
    </section>
  );
}
