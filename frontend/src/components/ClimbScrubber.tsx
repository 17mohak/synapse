import type { AnalyzeResponse } from "../api/client";
import { useStore } from "../state/store";
import "./ClimbScrubber.css";

interface ClimbScrubberProps {
  result: AnalyzeResponse;
}

// The layer selector. A scientific instrument, not a media player: a ticked
// track with a thin cursor that slides across the 12 layers. Native range input
// underneath gives drag, click, touch, and keyboard (arrows / Home / End) plus
// the slider ARIA role for free. Aligned to the chart's plot area so the cursor
// sits under the same layer on the X axis (margins mirror ClimbView).
const PLOT_LEFT = `${(56 / 920) * 100}%`; // ClimbView margin.left / viewBox width
const PLOT_RIGHT = `${(150 / 920) * 100}%`; // ClimbView margin.right / viewBox width

export default function ClimbScrubber({ result }: ClimbScrubberProps) {
  const playheadLayer = useStore((s) => s.playheadLayer);
  const setPlayheadLayer = useStore((s) => s.setPlayheadLayer);
  const setPlayState = useStore((s) => s.setPlayState);
  const nLayers = result.trajectories[0]?.probs.length ?? 12;
  const max = nLayers - 1;
  const L = Math.max(0, Math.min(max, playheadLayer));

  return (
    <div className="scrubber" style={{ paddingLeft: PLOT_LEFT, paddingRight: PLOT_RIGHT }}>
      <div className="scrubber__rail" aria-hidden="true">
        <span className="scrubber__line" />
        <div className="scrubber__ticks">
          {Array.from({ length: nLayers }).map((_, i) => (
            <span key={i} className="scrubber__tick" />
          ))}
        </div>
      </div>
      <input
        type="range"
        className="scrubber__range"
        min={0}
        max={max}
        step={1}
        value={L}
        onChange={(e) => {
          setPlayState("idle"); // taking manual control cancels the sweep
          setPlayheadLayer(Number(e.target.value));
        }}
        aria-label="Layer"
        aria-valuetext={`Layer ${L} of ${max}`}
      />
    </div>
  );
}
