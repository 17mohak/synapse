import "./TokenStrip.css";

interface TokenStripProps {
  tokens: string[];
}

/** Render one BPE token, making leading spaces and specials visible. */
function tokenDisplay(token: string) {
  if (token === "<|endoftext|>") {
    return { text: "<|endoftext|>", special: true, lead: false };
  }
  if (token.startsWith(" ")) {
    // GPT-2 encodes a leading space into the token; show it so " Paris" vs
    // "Paris" is legible (BRIEF.md sec. 8 — tokenization).
    return { text: token.slice(1), special: false, lead: true };
  }
  return { text: token, special: false, lead: false };
}

export default function TokenStrip({ tokens }: TokenStripProps) {
  const lastIndex = tokens.length - 1;

  return (
    <section className="tokenstrip" aria-label="Tokenized prompt">
      <div className="tokenstrip__head">
        <span className="tokenstrip__title">Tokens</span>
        <span className="tokenstrip__count">{tokens.length} BPE tokens</span>
      </div>
      <div className="tokenstrip__row">
        {tokens.map((token, i) => {
          const { text, special, lead } = tokenDisplay(token);
          const isFinal = i === lastIndex;
          return (
            <span
              key={i}
              className={
                "tokenstrip__chip" +
                (isFinal ? " tokenstrip__chip--final" : "") +
                (special ? " tokenstrip__chip--special" : "")
              }
              title={isFinal ? "Final position — the logit lens reads here" : token}
            >
              {lead && <span className="tokenstrip__space">·</span>}
              {text}
            </span>
          );
        })}
      </div>
    </section>
  );
}
