import type { CSSProperties } from "react";

import Hero from "./Hero";
import PullQuote from "./PullQuote";
import HeroChart from "./HeroChart";

// land-6 — the synthesis. The instrument keeps its land-5 FORM (full-width,
// card-less, dominant) AND gains land-4's BEHAVIOUR (it persists through the
// descent), by folding the narrative rail INTO the chart's own negative space
// instead of placing it beside the chart. The chart is a full-width sticky stage;
// the narrative beats — the headline, then the pull-quote — scroll through the
// chart's empty left region while it stays pinned and present; the fates are the
// handoff. Native sticky + native scroll only: no scroll-jacking, no
// shrink-to-companion, no chart/store/deep-dive edits.
//
// DOM order is rail (headline, quote) then instrument, so the h1 leads the reading
// order; the grid overlaps them into one cell (rail above, chart behind).
export default function Stage() {
  return (
    <section className="stage" aria-label="Synapse, the instrument">
      <div className="stage__rail">
        <div className="stage__beat stage__beat--hero">
          <Hero />
        </div>
        <div className="stage__beat stage__beat--quote">
          <PullQuote />
        </div>
      </div>
      <div className="stage__instrument" id="explore">
        <div
          className="instrument__chart hero__chart-reveal reveal"
          style={{ "--i": 1 } as CSSProperties}
        >
          <HeroChart />
        </div>
      </div>
    </section>
  );
}
