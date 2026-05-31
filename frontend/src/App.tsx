import PromptBar from "./components/PromptBar";
import TokenStrip from "./components/TokenStrip";
import LogitLensView from "./components/LogitLensView";
import type { TokenPrediction } from "./api/client";
import { useStore } from "./state/store";
import "./App.css";

/** MVP-1 next-token top-10 — the model's actual prediction for the final
 *  position. Rendered inline (kept out of the BRIEF sec. 12 component list). */
function NextToken({ predictions }: { predictions: TokenPrediction[] }) {
  const max = predictions[0]?.prob ?? 1;
  return (
    <section className="nexttoken" aria-label="Next-token prediction">
      <div className="nexttoken__head">
        <span className="nexttoken__title">Next token</span>
        <span className="nexttoken__sub">top 10 · final position</span>
      </div>
      <ol className="nexttoken__list">
        {predictions.map((p, i) => (
          <li className="nexttoken__row" key={i}>
            <span className="nexttoken__tok">{p.token.replace(/^ /, "·")}</span>
            <span className="nexttoken__bar-track">
              <span
                className="nexttoken__bar"
                style={{ width: `${(p.prob / max) * 100}%` }}
              />
            </span>
            <span className="nexttoken__pct">{(p.prob * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="empty">
      <h2 className="empty__title">Watch a transformer think.</h2>
      <p className="empty__body">
        Type a factual prompt and run a real GPT-2 small forward pass. The logit lens
        reads the model&rsquo;s top guess for the next token out of the residual stream
        at each of its 12 layers, so you can watch the answer assemble itself layer by
        layer. Try an example to start.
      </p>
    </div>
  );
}

function LensSkeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <div className="skeleton__strip" />
      <div className="skeleton__cols">
        {Array.from({ length: 12 }).map((_, i) => (
          <div className="skeleton__col" key={i} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const status = useStore((s) => s.status);
  const result = useStore((s) => s.result);
  const analyzedPrompt = useStore((s) => s.analyzedPrompt);

  return (
    <div className="app">
      <header className="app__bar">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true" />
          <span className="app__name">Synapse</span>
          <span className="app__tag">GPT-2 small · logit lens</span>
        </div>
        <PromptBar />
      </header>

      <main className="app__main">
        {status === "idle" && <EmptyState />}
        {status === "loading" && <LensSkeleton />}
        {(status === "ready" || status === "error") && result && (
          <div className="app__content">
            {analyzedPrompt && (
              <p className="app__prompt">
                <span className="app__prompt-label">Analyzing</span>
                <span className="app__prompt-text">{analyzedPrompt}</span>
              </p>
            )}
            <TokenStrip tokens={result.tokens} />
            <NextToken predictions={result.next_token_topk} />
            <LogitLensView result={result} />
          </div>
        )}
        {status === "error" && !result && (
          <div className="empty">
            <p className="empty__body">
              The analysis could not run. Check that the backend is started, then try
              again.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
