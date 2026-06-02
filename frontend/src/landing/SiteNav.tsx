import type { CSSProperties } from "react";

import SynapseLogo from "./SynapseLogo";

const LINKS = [
  { label: "About", href: "#about" },
  { label: "Science", href: "#science" },
  { label: "Explore", href: "#explore" },
];

export default function SiteNav() {
  return (
    <header className="nav reveal" style={{ "--i": 0 } as CSSProperties}>
      <a className="nav__brand" href="#explore" aria-label="Synapse, home">
        <SynapseLogo size={26} className="nav__logo" />
        <span className="nav__wordmark">Synapse</span>
      </a>
      <nav className="nav__links" aria-label="Primary">
        {LINKS.map((l) => (
          <a key={l.href} className="nav__link" href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
