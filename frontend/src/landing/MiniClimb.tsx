import { useMemo } from "react";

import { CROWD, type Fate } from "./fates-data";

// A small, honest sparkline of one fate: the faint crowd, the nearest rival in
// ash, and the answer in gold with a soft luminance, all on the same square-root
// probability scale the real chart uses. A dotted cursor marks where the standing
// falls. Pure SVG (no D3) so the card stays light; the gold "glow" is a single
// drop-shadow on the stroke, never a halo disc.

const W = 320;
const H = 132;
const PAD = { t: 14, r: 14, b: 14, l: 14 };
const N = 12;

const xAt = (i: number) => PAD.l + (i / (N - 1)) * (W - PAD.l - PAD.r);

// Catmull-Rom -> cubic Bézier, the same smoothing the motion study used, so the
// curves read as continuous trajectories rather than connected dots.
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export default function MiniClimb({ fate }: { fate: Fate }) {
  const { winner, rival, crestLayer, tone } = fate;

  const geom = useMemo(() => {
    const peak = Math.max(...winner.probs, ...rival.probs, 0.01);
    const y0 = H - PAD.b;
    const y1 = PAD.t;
    const yAt = (p: number) => y0 - Math.sqrt(Math.max(0, p) / peak) * (y0 - y1);
    const toPts = (probs: number[]): [number, number][] =>
      probs.map((p, i) => [xAt(i), yAt(p)]);
    return {
      crowd: CROWD.map((c) => smoothPath(toPts(c))),
      rival: smoothPath(toPts(rival.probs)),
      winner: smoothPath(toPts(winner.probs)),
      winnerEnd: [xAt(N - 1), yAt(winner.probs[N - 1])] as [number, number],
      rivalEnd: [xAt(N - 1), yAt(rival.probs[N - 1])] as [number, number],
      cursorX: xAt(crestLayer),
    };
  }, [winner, rival, crestLayer]);

  return (
    <svg
      className="mini"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`${fate.label}: ${fate.winner.token} against ${fate.rival.token} across 12 layers`}
      preserveAspectRatio="none"
    >
      {geom.crowd.map((d, i) => (
        <path key={i} className="mini__crowd" d={d} />
      ))}
      <line
        className="mini__cursor"
        x1={geom.cursorX}
        x2={geom.cursorX}
        y1={PAD.t - 2}
        y2={H - PAD.b}
      />
      <path className="mini__rival" d={geom.rival} />
      <path className={`mini__winner mini__winner--${tone}`} d={geom.winner} />
      <circle className="mini__dot mini__dot--rival" cx={geom.rivalEnd[0]} cy={geom.rivalEnd[1]} r={2.6} />
      <circle
        className={`mini__dot mini__dot--winner mini__dot--${tone}`}
        cx={geom.winnerEnd[0]}
        cy={geom.winnerEnd[1]}
        r={3.2}
      />
    </svg>
  );
}
