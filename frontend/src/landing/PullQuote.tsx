import type { CSSProperties } from "react";

const v = (i: number) => ({ "--i": i }) as CSSProperties;

export default function PullQuote() {
  return (
    <section className="quote" id="science">
      <blockquote className="quote__text reveal" style={v(0)}>
        Certainty is not the beginning.
        <br />
        It&rsquo;s the end of a <em>struggle</em>.
      </blockquote>
      <p className="quote__body reveal" style={v(1)}>
        In every forward pass, thousands of tokens compete for the next word.
        Synapse shows you how that competition evolves, and how fragile victory can
        be.
      </p>
    </section>
  );
}
