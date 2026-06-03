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

export default function App() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const focusMode = useStore((s) => s.focusMode);

  useScrollReveal(rootRef);
  useParallax(rootRef);

  // The landing is inert (unfocusable, hidden from AT) while the deep dive holds
  // focus. Set imperatively so we don't depend on `inert` being in the JSX types.
  useEffect(() => {
    const shell = shellRef.current;
    if (shell) (shell as unknown as { inert: boolean }).inert = focusMode;
  }, [focusMode]);

  // The first analysis is no longer fired here on a blind timer: the hero owns it
  // now and triggers it when the headline's ignition word resolves, so the
  // headline and the chart read as one causal power-on (see Hero).

  return (
    <div className="page" ref={rootRef}>
      {/* One continuous field behind every section: soft gold/cool light that
          drifts on scroll so the page reads as one space, not stacked slides.
          Each glow is a scroll-parallax wrapper (writes --py) holding an inner
          layer that breathes on a slow time clock — so even at rest the field is
          never frozen and the whole page inhales as one instrument. The two
          transforms live on different elements so they never collide (the same
          discipline the hero chart uses for parallax vs. reveal). */}
      <div className="page__ambient" aria-hidden="true">
        <span className="page__glow page__glow--1 parallax" data-depth="0.08" data-depth-max="44">
          <span className="page__glow-breath" />
        </span>
        <span className="page__glow page__glow--2 parallax" data-depth="0.05" data-depth-max="30">
          <span className="page__glow-breath" />
        </span>
        <span className="page__glow page__glow--3 parallax" data-depth="0.06" data-depth-max="34">
          <span className="page__glow-breath" />
        </span>
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
