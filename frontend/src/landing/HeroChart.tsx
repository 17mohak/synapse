import ClimbView from "../components/ClimbView";
import ClimbScrubber from "../components/ClimbScrubber";
import { useStore } from "../state/store";
import PromptField from "./PromptField";

function ChartPlaceholder({ note }: { note: string }) {
  return (
    <div className="card__placeholder" aria-hidden={note ? undefined : true}>
      <div className="card__shimmer" />
      {note && <p className="card__note">{note}</p>}
    </div>
  );
}

// The hero card: a single framed object. Prompt line on top, the live logit-lens
// chart in the middle, a transport row below (replay, the layer scrubber, the
// current layer). The chart itself is the real ClimbView in its chrome-less hero
// variant; the card supplies the surrounding instrument.
export default function HeroChart() {
  const status = useStore((s) => s.status);
  const result = useStore((s) => s.result);
  const error = useStore((s) => s.error);
  const analyzedPrompt = useStore((s) => s.analyzedPrompt);
  const playheadLayer = useStore((s) => s.playheadLayer);
  const playState = useStore((s) => s.playState);
  const runAnalyze = useStore((s) => s.runAnalyze);

  const setFocusMode = useStore((s) => s.setFocusMode);
  const nLayers = result?.trajectories[0]?.probs.length ?? 12;
  const layer = Math.max(0, Math.min(nLayers - 1, playheadLayer));
  const sweeping = playState === "sweeping";

  return (
    <div className="card">
      <div className="card__depth" aria-hidden="true" />
      <button
        type="button"
        className="card__expand"
        onClick={() => setFocusMode(true)}
        aria-label="Open the full instrument"
        title="Expand"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="card__head">
        <PromptField />
      </div>

      <div className="card__body">
        {result ? (
          <ClimbView result={result} variant="hero" chrome={false} />
        ) : status === "error" ? (
          <ChartPlaceholder note={error ?? "The analysis could not run."} />
        ) : (
          <ChartPlaceholder note="" />
        )}
      </div>

      <div className="card__foot">
        <button
          type="button"
          className="card__play"
          onClick={() => analyzedPrompt && runAnalyze(analyzedPrompt)}
          disabled={!analyzedPrompt || sweeping || status === "loading"}
          aria-label="Replay the layer sweep"
          title="Replay"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M7 5l12 7-12 7z" fill="currentColor" />
          </svg>
        </button>
        {result ? (
          <ClimbScrubber result={result} />
        ) : (
          <span className="card__rail-stub" aria-hidden="true" />
        )}
        <span className="card__layer">
          Layer <b>{result ? layer : "—"}</b>
          <span className="card__layer-sep"> / </span>
          {nLayers}
        </span>
      </div>
    </div>
  );
}
