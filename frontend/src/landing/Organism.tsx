import { useEffect, useRef, useState } from "react";

import type { AnalyzeResponse } from "../api/client";
import { useStore } from "../state/store";
import ClimbView from "../components/ClimbView";

// The Organism — the protagonist. A real GPT-2-small logit lens, never idle: it
// poses itself a question, thinks it through the layers (the sweep), lands a
// Standing, breathes, and asks the next. It yields the instant you reach for it.
//
// Honest split (the vision's rule): the autonomous loop REPLAYS real captured runs
// (public/traces.json, captured from the live backend); the SEIZE runs LIVE
// inference on your sentence via the store. Nothing interactive is faked.
//
// It drives the real ClimbView (the deep-dive instrument, unchanged) by handing it
// each trace as `result`; ClimbView rebuilds and sweeps on every change. The store's
// playState is nudged to "sweeping" so the replay sweeps exactly like a live run.

interface Trace {
  prompt: string;
  fate: "knew" | "leaned" | "collapsed";
  trace: AnalyzeResponse;
}

const SWEEP_MS = 2700; // ClimbView's sweep (~2.6s) + a beat
const HOLD_MS = 3600; // the Standing dwells (the breath's long beat)
const CYCLE_MS = SWEEP_MS + HOLD_MS;

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Organism() {
  const runAnalyze = useStore((s) => s.runAnalyze);
  const setPlayState = useStore((s) => s.setPlayState);
  const storeResult = useStore((s) => s.result);
  const storeStatus = useStore((s) => s.status);
  const setFocusMode = useStore((s) => s.setFocusMode);

  const [traces, setTraces] = useState<Trace[]>([]);
  const [idx, setIdx] = useState(0);
  // Under reduced motion the loop never runs, so the instrument rests resolved.
  const [phase, setPhase] = useState<"thinking" | "standing">(() =>
    prefersReduced() ? "standing" : "thinking",
  );
  const [seized, setSeized] = useState(false); // user has the wheel (loop paused)
  const [userMode, setUserMode] = useState(false); // showing a live, user-run result
  const [field, setField] = useState("");
  const [dirty, setDirty] = useState(false);
  const reduced = useRef(prefersReduced());

  // Load the recorded runs.
  useEffect(() => {
    fetch("/traces.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Trace[]) => setTraces(d))
      .catch(() => setTraces([]));
  }, []);

  const current = traces[idx];
  const result: AnalyzeResponse | null = userMode
    ? storeResult
    : current?.trace ?? null;

  // The loop: each trace sweeps, the Standing holds, then the next is posed. Paused
  // while seized / in user mode, and never auto-runs under reduced motion.
  useEffect(() => {
    if (reduced.current || seized || userMode || traces.length === 0) return;
    setPlayState("sweeping"); // make the replay sweep like a live run
    setPhase("thinking");
    const toStand = window.setTimeout(() => setPhase("standing"), SWEEP_MS);
    const toNext = window.setTimeout(
      () => setIdx((i) => (i + 1) % traces.length),
      CYCLE_MS,
    );
    return () => {
      window.clearTimeout(toStand);
      window.clearTimeout(toNext);
    };
  }, [idx, traces, seized, userMode, setPlayState]);

  // Mirror the posed prompt into the field until the visitor takes it over.
  useEffect(() => {
    if (!dirty && !userMode && current?.prompt) setField(current.prompt);
  }, [idx, current, dirty, userMode]);

  function seize() {
    if (!seized && !userMode) setSeized(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = field.trim();
    if (!v || storeStatus === "loading") return;
    setUserMode(true);
    setSeized(true);
    setDirty(true);
    void runAnalyze(v); // LIVE inference — the model thinks your sentence
  }
  function resume() {
    setUserMode(false);
    setSeized(false);
    setDirty(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (seized || userMode)) resume();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seized, userMode]);

  const live = userMode
    ? storeStatus === "loading"
      ? "running"
      : "live"
    : seized
      ? "yours"
      : phase;
  const loading = storeStatus === "loading";

  return (
    <section className="organism" id="explore" aria-label="Synapse — a transformer thinking">
      {/* Top rail — the live-state cue, on the grid's left edge; a hairline brackets
          the top of the specimen below it. */}
      <div className="organism__top">
        <span className={`organism__live organism__live--${live}`}>
          <span className="organism__dot" aria-hidden="true" />
          <span className="organism__livelabel">
            {live === "live" ? "live · gpt-2 small" : live === "running" ? "running" : live === "yours" ? "yours" : live === "standing" ? "resolved" : "thinking"}
          </span>
        </span>
      </div>

      {/* The framed instrument, with the claim set into its reliably-empty upper-left
          negative space as the opening thesis — a peer to the standing on the right.
          Trajectories start low-left and the answer resolves right, so the claim,
          the instrument, and the standing form one balanced triangle. */}
      <div className="organism__stage">
        <div className="organism__claim-anchor">
          <p className="organism__claim">
            A machine&rsquo;s certainty is late, fragile, and reversible.
            <span className="organism__claim-dim"> Watch it almost decide.</span>
          </p>
        </div>
        <div className={`organism__chart${phase === "thinking" && !userMode && !seized ? " is-thinking" : ""}`}>
          {result ? (
            <ClimbView result={result} variant="hero" chrome={false} readout={false} />
          ) : (
            <div className="organism__warming" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Command rail — the instrument's controls: the seize prompt (left) and the
          honest note / live-feed controls (right), bracketed by a hairline above. */}
      <div className="organism__rail">
        <form className="organism__seize" onSubmit={submit}>
          <span className="organism__plabel">Prompt</span>
          <input
            className="organism__input"
            value={field}
            onChange={(e) => { setField(e.target.value); setDirty(true); seize(); }}
            onFocus={seize}
            spellCheck={false}
            autoComplete="off"
            aria-label="Prompt — type your own to run it live"
          />
          <button className="organism__run" type="submit" disabled={loading || !field.trim()} title="Run live">
            {loading ? <span className="organism__spin" aria-hidden="true" /> : "Run"}
          </button>
        </form>

        <div className="organism__rail-aside">
          {userMode || seized ? (
            <>
              <button className="organism__resume" type="button" onClick={resume}>
                <span className="organism__resume-icon" aria-hidden="true">←</span>
                back to the live feed
              </button>
              {/* Lean in: the same instrument, full attention. Only meaningful once a
                  real result is in the store (after a live run). */}
              {userMode && storeResult && (
                <button className="organism__deepen" type="button" onClick={() => setFocusMode(true)}>
                  open the full instrument
                </button>
              )}
            </>
          ) : (
            <p className="organism__honest">
              Replaying recorded runs. Type a sentence to watch it think one live.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
