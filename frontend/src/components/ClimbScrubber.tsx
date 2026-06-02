import type { AnalyzeResponse } from "../api/client";
import { useStore } from "../state/store";
import "./ClimbScrubber.css";

interface ClimbScrubberProps {
  result: AnalyzeResponse;
  /** Show the transport (replay button + a "drag to inspect" affordance). Used in
   *  the deep dive, where scrubbing and replay are the headline interactions. */
  transport?: boolean;
  /** Re-run the layer sweep from the start. */
  onReplay?: () => void;
}

// The layer selector. A scientific instrument, not a media player: a ticked
// track with a thin cursor that slides across the 12 layers. Native range input
// underneath gives drag, click, touch, and keyboard (arrows / Home / End) plus
// the slider ARIA role for free. Aligned to the chart's plot area so the cursor
// sits under the same layer on the X axis (margins mirror ClimbView).
const PLOT_LEFT = `${(56 / 1000) * 100}%`; // ClimbView margin.left / viewBox width
const PLOT_RIGHT = `${(292 / 1000) * 100}%`; // ClimbView margin.right / viewBox width

export default function ClimbScrubber({ result, transport, onReplay }: ClimbScrubberProps) {
  const playheadLayer = useStore((s) => s.playheadLayer);
  const playState = useStore((s) => s.playState);
  const setPlayheadLayer = useStore((s) => s.setPlayheadLayer);
  const setPlayState = useStore((s) => s.setPlayState);
  const nLayers = result.trajectories[0]?.probs.length ?? 12;
  const max = nLayers - 1;
  const L = Math.max(0, Math.min(max, playheadLayer));
  const sweeping = playState === "sweeping";

  const rail = (
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

  if (!transport) return rail;

  return (
    <div className="scrubber-wrap">
      <div className="scrubber-transport">
        <button
          type="button"
          className="scrubber-transport__play"
          onClick={onReplay}
          disabled={sweeping}
          aria-label="Replay the layer sweep"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M7 5l12 7-12 7z" fill="currentColor" />
          </svg>
          <span>{sweeping ? "Sweeping" : "Replay"}</span>
        </button>
        <span className="scrubber-transport__hint" aria-hidden="true">
          Drag to inspect any layer
        </span>
      </div>
      {rail}
    </div>
  );
}
