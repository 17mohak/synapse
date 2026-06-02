import type { CSSProperties } from "react";

import { useStore } from "../state/store";
import HeroChart from "./HeroChart";

const v = (i: number) => ({ "--i": i }) as CSSProperties;

export default function Hero() {
  const setFocusMode = useStore((s) => s.setFocusMode);

  return (
    <section className="hero" id="explore">
      <div className="hero__copy">
        <h1 className="hero__title">
          <span className="reveal" style={v(1)}>
            Watch a
          </span>
          <span className="reveal" style={v(2)}>
            transformer
          </span>
          <span className="reveal hero__accent" style={v(3)}>
            think.
          </span>
        </h1>
        <p className="hero__lede reveal" style={v(4)}>
          Synapse visualizes the hidden competition inside large language models,
          layer by layer, token by token.
        </p>
        {/* The primary doorway: pulling this lever expands the chart itself into
            the full instrument (see FocusOverlay), not a route change. */}
        <button
          type="button"
          className="hero__cta reveal"
          style={v(5)}
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

      {/* Parallax wrapper (drifts on scroll) stays distinct from the reveal
          wrapper (entrance), so the two transforms never collide. */}
      <div className="hero__chart parallax" data-depth="0.045" data-depth-max="20">
        <div className="hero__chart-reveal reveal" style={v(4)}>
          <HeroChart />
        </div>
      </div>
    </section>
  );
}
