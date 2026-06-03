import type { CSSProperties } from "react";

import Hero from "./Hero";
import PullQuote from "./PullQuote";
import HeroChart from "./HeroChart";

// The stage: the artifact is the spine of the landing. The narrative scrolls in
// the left rail (the hero copy, then the pull-quote) while the instrument stays
// present in the right column via native `position: sticky` — not scroll-jacking,
// and with no edits to the chart/store/deep-dive. The artifact spans both narrative
// beats, so it is on screen from the headline through the struggle quote and only
// releases as the Fates band begins: the page reads as one continuous object you
// descend through, not a hero followed by stacked sections. On narrow screens the
// columns collapse (see App.css) and the artifact returns to the flow between the
// hero copy and the quote.
//
// The materialize-in-place reveal (no parallax here — scroll drift would fight the
// sticky) keeps the land-3 power-on: the chassis settles in place, then the
// headline's ignition triggers the signal.
export default function Stage() {
  return (
    <section className="stage" aria-label="Synapse, the instrument">
      <Hero />
      <div className="stage__artifact">
        <div className="stage__sticky">
          <div
            className="hero__chart-reveal reveal"
            style={{ "--i": 3 } as CSSProperties}
          >
            <HeroChart />
          </div>
        </div>
      </div>
      <PullQuote />
    </section>
  );
}
