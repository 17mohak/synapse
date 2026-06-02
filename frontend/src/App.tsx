import { useEffect, useRef } from "react";

import SiteNav from "./landing/SiteNav";
import Hero from "./landing/Hero";
import PullQuote from "./landing/PullQuote";
import Fates from "./landing/Fates";
import SiteFooter from "./landing/SiteFooter";
import FocusOverlay from "./landing/FocusOverlay";
import { useScrollReveal, useParallax } from "./landing/motion";
import { useStore } from "./state/store";
import "./App.css";

// The hero boots with a real, clean "knew" result so the oxygen/helium standing
// and its measured moat are genuine, not a placeholder string.
const BOOT_PROMPT = "Water is made of hydrogen and";
// Hold the first analysis until the hero heading has settled, so the chart's own
// layer sweep lands as the next beat of the composition (the chart reveals itself
// with weight, it is not dropped in). Skipped under reduced motion.
const BOOT_ANALYZE_DELAY = 900;

export default function App() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const runAnalyze = useStore((s) => s.runAnalyze);
  const focusMode = useStore((s) => s.focusMode);

  useScrollReveal(rootRef);
  useParallax(rootRef);

  // The landing is inert (unfocusable, hidden from AT) while the deep dive holds
  // focus. Set imperatively so we don't depend on `inert` being in the JSX types.
  useEffect(() => {
    const shell = shellRef.current;
    if (shell) (shell as unknown as { inert: boolean }).inert = focusMode;
  }, [focusMode]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(
      () => void runAnalyze(BOOT_PROMPT),
      reduce ? 0 : BOOT_ANALYZE_DELAY,
    );
    // Cleanup clears the pending timer; in StrictMode the first (discarded) mount
    // is torn down before its timer fires, so the analysis runs exactly once.
    return () => window.clearTimeout(t);
  }, [runAnalyze]);

  return (
    <div className="page" ref={rootRef}>
      {/* One continuous field behind every section: soft gold/cool light that
          drifts on scroll so the page reads as one space, not stacked slides. */}
      <div className="page__ambient" aria-hidden="true">
        <span className="page__glow page__glow--1 parallax" data-depth="0.08" data-depth-max="44" />
        <span className="page__glow page__glow--2 parallax" data-depth="0.05" data-depth-max="30" />
        <span className="page__glow page__glow--3 parallax" data-depth="0.06" data-depth-max="34" />
      </div>

      <div className="page__shell" ref={shellRef}>
        <SiteNav />
        <main className="page__main">
          <Hero />
          <PullQuote />
          <Fates />
        </main>
        <SiteFooter />
      </div>

      {focusMode && <FocusOverlay />}
    </div>
  );
}
