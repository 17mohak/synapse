import type { CSSProperties } from "react";

import { FATES, type Fate } from "./fates-data";
import MiniClimb from "./MiniClimb";

function FateCard({ fate, i }: { fate: Fate; i: number }) {
  return (
    <article className="fate reveal" style={{ "--i": i } as CSSProperties}>
      <header className="fate__head">
        <span className={`fate__dot fate__dot--${fate.tone}`} aria-hidden="true" />
        <span className="fate__label">{fate.label}</span>
      </header>
      <p className="fate__blurb">{fate.blurb}</p>
      <div className="fate__chart">
        <MiniClimb fate={fate} />
      </div>
      <p className="fate__prompt">{fate.prompt}</p>
      <footer className="fate__verdict">
        <span className={`fate__word fate__word--${fate.tone}`}>{fate.verdict}</span>
        <span className="fate__measure">{fate.measure}</span>
      </footer>
    </article>
  );
}

export default function Fates() {
  return (
    <section className="fates" id="fates" aria-label="Three fates">
      <div className="fates__grid">
        {FATES.map((f, i) => (
          <FateCard key={f.key} fate={f} i={i} />
        ))}
      </div>
      <p className="fates__caption reveal" style={{ "--i": 3 } as CSSProperties}>
        Three fates. One model. Infinite thoughts.
      </p>
    </section>
  );
}
