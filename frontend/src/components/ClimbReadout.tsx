import type { AnalyzeResponse } from "../api/client";
import { useStore } from "../state/store";
import "./ClimbReadout.css";

interface ClimbReadoutProps {
  result: AnalyzeResponse;
}

const disp = (t: string) => t.replace(/^ /, "·");

// Orients the viewer at the playhead layer. Just enough to answer "where am I
// and what is the model doing here?": the layer, the current leader and its
// probability at this layer, and the uncertainty at this layer. No more.
export default function ClimbReadout({ result }: ClimbReadoutProps) {
  const playheadLayer = useStore((s) => s.playheadLayer);
  const nLayers = result.trajectories[0]?.probs.length ?? 12;
  const L = Math.max(0, Math.min(nLayers - 1, playheadLayer));

  // Leader at this layer = the tracked token with the highest probability here.
  let leader = result.trajectories[0];
  for (const t of result.trajectories) if (t.probs[L] > leader.probs[L]) leader = t;
  const leaderProb = leader ? leader.probs[L] : 0;
  const entropy = result.entropy?.[L] ?? 0;

  return (
    <dl className="readout" aria-label="Current layer readout">
      <div className="readout__item">
        <dt className="readout__key">Layer</dt>
        <dd className="readout__val readout__val--layer">{L}</dd>
      </div>
      <div className="readout__item">
        <dt className="readout__key">Leader</dt>
        <dd className="readout__val">
          <span className="readout__tok">{disp(leader?.token ?? "")}</span>{" "}
          <span className="readout__muted">{(leaderProb * 100).toFixed(1)}%</span>
        </dd>
      </div>
      <div className="readout__item">
        <dt className="readout__key">Entropy</dt>
        <dd className="readout__val">
          {entropy.toFixed(1)} <span className="readout__muted">bits</span>
        </dd>
      </div>
    </dl>
  );
}
