import { useEffect, useRef, type CSSProperties } from "react";

import { useStore } from "../state/store";

const v = (i: number) => ({ "--i": i }) as CSSProperties;

// The hero boots with a real, clean "knew" result so the oxygen/helium standing
// and its measured moat are genuine, not a placeholder string.
const BOOT_PROMPT = "Water is made of hydrogen and";

// The hero is the opening narrative beat of the stage (the artifact itself lives
// in the sticky spine — see Stage). This component owns only the copy and the
// causal boot trigger.
export default function Hero() {
  const setFocusMode = useStore((s) => s.setFocusMode);
  const runAnalyze = useStore((s) => s.runAnalyze);
  const igniteRef = useRef<HTMLSpanElement | null>(null);
  const firedRef = useRef(false);

  // Causality: the instrument acquires its signal when the headline finishes —
  // the gold word "think." completing its reveal is what makes the model think,
  // so the headline and the chart sweep read as one power-on sequence rather than
  // two independent timelines. Reduced motion / no choreography fires immediately;
  // a safety timer guarantees the chart still loads if the transition never runs.
  useEffect(() => {
    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      void runAnalyze(BOOT_PROMPT);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fire();
      return;
    }
    const el = igniteRef.current;
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === "opacity") fire();
    };
    el?.addEventListener("transitionend", onEnd);
    const safety = window.setTimeout(fire, 1700);
    // Cleanup removes the listener and clears the timer; in StrictMode the first
    // (discarded) mount is torn down before either can fire, so analysis runs once.
    return () => {
      el?.removeEventListener("transitionend", onEnd);
      window.clearTimeout(safety);
    };
  }, [runAnalyze]);

  return (
    <div className="hero">
      <div className="hero__copy">
        <h1 className="hero__title">
          <span className="reveal" style={v(1)}>
            Watch a
          </span>
          <span className="reveal" style={v(2)}>
            transformer
          </span>
          {/* The ignition beat: lands after the chassis is on, glows up like a pilot
              light, and its completion triggers the analysis (the handoff). */}
          <span
            className="reveal reveal--ignite hero__accent"
            style={v(4)}
            ref={igniteRef}
          >
            think.
          </span>
        </h1>
        <p className="hero__lede reveal" style={v(5)}>
          Synapse visualizes the hidden competition inside large language models,
          layer by layer, token by token.
        </p>
        {/* The primary doorway: pulling this lever expands the chart itself into
            the full instrument (see FocusOverlay), not a route change. Chrome role:
            it fades in last ("ready"), it is not part of the power-on event. */}
        <button
          type="button"
          className="hero__cta reveal reveal--chrome"
          style={v(6)}
          onClick={() => setFocusMode(true)}
        >
          <span className="hero__cta-label">Explore a thought</span>
          <span className="hero__cta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
