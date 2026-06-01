import PromptBar from "./components/PromptBar";
import TokenStrip from "./components/TokenStrip";
import ClimbView from "./components/ClimbView";
import { useStore } from "./state/store";
import "./App.css";

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
            {/* The Race is now the single centerpiece. The old next-token list
                and logit-lens grid were redundant views of the same prediction;
                they competed with the climax and were retired (their components
                remain in the repo, unmounted). */}
            <ClimbView result={result} />
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
