import { useLayoutEffect, useRef } from "react";

import type { AnalyzeResponse } from "../api/client";
import { useStore } from "../state/store";
import "./LayerBeliefs.css";

interface LayerBeliefsProps {
  result: AnalyzeResponse;
}

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const DELTA = 0.003; // ignore sub-0.3pt wobble when calling a token rising/falling
const disp = (t: string) => t.replace(/^ /, "·"); // leading space -> middot

type Trend = "up" | "down" | "new" | "steady";

interface Row {
  token: string;
  prob: number;
  bar: number; // 0..100, relative to the leader (the gap structure)
  isLeader: boolean;
  justLead: boolean; // the leader changed at this layer
  trend: Trend;
}

// The model's belief at the current layer, as a live leaderboard. While you scrub,
// rows climb and fall (FLIP), bars grow and shrink, and the amber row is what the
// model believes now: you watch one candidate overtake another and a guess become
// an answer. This is the logit lens read directly (per-layer top-k), not a debug
// dump. Reads the same playhead the chart and scrubber share.
export default function LayerBeliefs({ result }: LayerBeliefsProps) {
  const playheadLayer = useStore((s) => s.playheadLayer);
  const hoveredToken = useStore((s) => s.hoveredToken);
  const setHoveredToken = useStore((s) => s.setHoveredToken);
  const nLayers = result.logit_lens.length;
  const L = Math.max(0, Math.min(nLayers - 1, playheadLayer));

  const cur = result.logit_lens[L]?.predictions ?? [];
  const prev = L > 0 ? (result.logit_lens[L - 1]?.predictions ?? []) : [];
  const prevByTok = new Map(prev.map((p, i) => [p.token, { prob: p.prob, rank: i }]));
  const prevLeader = prev[0]?.token ?? null;
  const leaderProb = cur[0]?.prob ?? 1;
  const entropy = result.entropy?.[L];

  const rows: Row[] = cur.map((p, i) => {
    const pv = prevByTok.get(p.token);
    let trend: Trend;
    if (L === 0) trend = "steady";
    else if (!pv) trend = "new";
    else trend = p.prob - pv.prob > DELTA ? "up" : p.prob - pv.prob < -DELTA ? "down" : "steady";
    return {
      token: p.token,
      prob: p.prob,
      bar: Math.sqrt(p.prob / (leaderProb || 1)) * 100,
      isLeader: i === 0,
      justLead: i === 0 && prevLeader != null && prevLeader !== p.token,
      trend,
    };
  });

  // FLIP: animate each surviving row from its previous y to its new y, so a token
  // overtaking another is *seen* climbing. New rows fade up. Runs every layer change.
  const listRef = useRef<HTMLUListElement>(null);
  const prevTops = useRef<Map<string, number>>(new Map());
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = Array.from(list.children) as HTMLElement[];
    const tops = new Map<string, number>();
    for (const el of items) {
      const key = el.dataset.token ?? "";
      const top = el.getBoundingClientRect().top;
      tops.set(key, top);
      if (reduce) continue;
      const was = prevTops.current.get(key);
      if (was !== undefined) {
        const dy = was - top;
        if (Math.abs(dy) > 0.5) {
          el.animate(
            [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
            { duration: 440, easing: EXPO },
          );
        }
      } else if (prevTops.current.size > 0) {
        el.animate(
          [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 320, easing: EXPO },
        );
      }
    }
    prevTops.current = tops;
  });

  return (
    <aside className="beliefs" aria-label="The model's belief at the current layer">
      <header className="beliefs__head">
        <span className="beliefs__title">
          Believes at layer <b>{L}</b>
        </span>
        {entropy != null && (
          <span className="beliefs__entropy">
            {entropy.toFixed(1)} <span className="beliefs__unit">bits</span>
          </span>
        )}
      </header>
      <ul className="beliefs__list" ref={listRef}>
        {rows.map((r) => (
          <li
            key={r.token}
            data-token={r.token}
            className={`belief${r.isLeader ? " is-leader" : ""}${r.token === hoveredToken ? " is-hovered" : ""}`}
            onMouseEnter={() => setHoveredToken(r.token)}
            onMouseLeave={() => setHoveredToken(null)}
          >
            <span
              className={`belief__trend belief__trend--${r.trend}${r.justLead ? " is-justlead" : ""}`}
              aria-hidden="true"
            >
              {r.trend === "up" ? "▲" : r.trend === "down" ? "▼" : r.trend === "new" ? "•" : ""}
            </span>
            <span className="belief__word" title={r.token}>
              {disp(r.token)}
            </span>
            <span className="belief__bar" aria-hidden="true">
              <span className="belief__fill" style={{ width: `${r.bar.toFixed(1)}%` }} />
            </span>
            <span className="belief__pct">{(r.prob * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
