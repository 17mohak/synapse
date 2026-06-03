import type { CSSProperties } from "react";

import Hero from "./Hero";
import PullQuote from "./PullQuote";
import HeroChart from "./HeroChart";

// land-5 — Instrument First. The first viewport IS the instrument: the chart is
// full content width and card-less (its marks sit on the page's own stage, no
// panel), and the headline is set INTO the instrument's empty lower-left, so the
// copy emerges from the artifact rather than sitting beside it. The instrument is
// the unquestioned centre of gravity; the pull-quote and fates follow as the
// supporting narrative. No chart/store/deep-dive edits — the real ClimbView is used
// as-is at its honest aspect.
export default function Stage() {
  return (
    <section className="stage" aria-label="Synapse, the instrument">
      <div className="instrument" id="explore">
        <div
          className="instrument__chart hero__chart-reveal reveal"
          style={{ "--i": 1 } as CSSProperties}
        >
          <HeroChart />
        </div>
        {/* The headline lives in the instrument's negative space (overlay on wide
            screens, stacked above the chart on narrow ones — see App.css). */}
        <div className="instrument__title">
          <Hero />
        </div>
      </div>
      <PullQuote />
    </section>
  );
}
