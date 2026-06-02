import SynapseLogo from "./SynapseLogo";

const REPO = "https://github.com/17mohak/synapse";

export default function SiteFooter() {
  return (
    <footer className="foot reveal" id="about">
      <div className="foot__inner">
        <div className="foot__brand">
          <span className="foot__emblem">
            <SynapseLogo size={34} />
          </span>
          <p className="foot__text">
            <strong>Synapse</strong> is an open-source project exploring the inner
            workings of language models through visualization.
          </p>
        </div>
        <a className="foot__github" href={REPO} target="_blank" rel="noreferrer">
          <span>View on GitHub</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
