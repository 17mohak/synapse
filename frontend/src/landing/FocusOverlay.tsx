import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import ClimbView from "../components/ClimbView";
import LayerBeliefs from "../components/LayerBeliefs";
import { useStore } from "../state/store";
import PromptField from "./PromptField";

// The deep dive. Explore expands the landing chart into the full instrument: the
// same analysis, now with its scrubber, readout, and thesis. It is rendered in a
// body-level portal (so no transformed ancestor can trap its fixed position) and
// it does NOT route away — it lifts forward out of the card's own position and
// settles, then the live sweep plays. Close reverses the same motion.

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const prefersReduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The live instrument the panel emerges from / returns to, in viewport
// coordinates. This is the Organism's own chart (the protagonist the visitor is
// watching) — not a dead thumbnail — so the deep dive grows out of the very object
// on screen rather than appearing from the centre of nowhere.
function originRect(): DOMRect | null {
  return document.querySelector(".organism__chart")?.getBoundingClientRect() ?? null;
}

// FLIP from the chart's footprint to the panel's resting position: the panel's
// first frame occupies the chart's centre and (height-scaled) size, then settles.
// Because land-8 put the chart on the same grid the panel uses, their widths nearly
// match, so the visible growth is vertical — the chart's box unfolds into the taller
// instrument (gaining its header, transport, and belief rail). It reads as the same
// object deepening, not a new surface arriving.
function emerge(panel: HTMLElement) {
  const o = originRect();
  const p = panel.getBoundingClientRect();
  if (!o) return { tx: 0, ty: 0, scale: 0.93 };
  return {
    tx: o.left + o.width / 2 - (p.left + p.width / 2),
    ty: o.top + o.height / 2 - (p.top + p.height / 2),
    scale: Math.min(0.99, Math.max(0.82, o.height / p.height)),
  };
}

export default function FocusOverlay() {
  const result = useStore((s) => s.result);
  const setFocusMode = useStore((s) => s.setFocusMode);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const reduced = useRef(prefersReduced());
  const [hydrated, setHydrated] = useState(reduced.current);

  // Open: lift the panel forward from the card's position.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop || reduced.current) return;
    const { tx, ty, scale } = emerge(panel);
    panel.animate(
      [
        { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, opacity: 0 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ],
      { duration: 640, easing: EXPO, fill: "both" },
    ).finished.then(
      () => setHydrated(true),
      () => setHydrated(true),
    );
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 440,
      easing: EXPO,
      fill: "both",
    });
  }, []);

  // Scroll lock, move focus into the dialog, Escape to close.
  useLayoutEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current
      ?.querySelector<HTMLInputElement>(".prompt__input")
      ?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop || reduced.current) {
      setFocusMode(false);
      return;
    }
    const { tx, ty, scale } = emerge(panel);
    const a = panel.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, opacity: 0 },
      ],
      { duration: 460, easing: EXPO, fill: "forwards" },
    );
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 440,
      easing: EXPO,
      fill: "forwards",
    });
    a.finished.then(
      () => setFocusMode(false),
      () => setFocusMode(false),
    );
  }

  return createPortal(
    <div className="focus" role="dialog" aria-modal="true" aria-label="Synapse, the deep dive">
      <div className="focus__backdrop" ref={backdropRef} onClick={close} />
      <div
        className={`focus__panel${hydrated ? " is-hydrated" : ""}`}
        ref={panelRef}
        style={reduced.current ? undefined : { opacity: 0 }}
      >
        <button className="focus__close" onClick={close} aria-label="Close the deep dive">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="focus__head">
          <PromptField />
        </div>
        <div className="focus__body">
          {result ? (
            <>
              <div className="focus__chart">
                <ClimbView result={result} readout={false} />
              </div>
              {/* Deeper instrumentation: arrives once the chart has settled
                  (.is-hydrated), so the chart reads as the persistent object
                  gaining depth rather than a pre-built screen appearing at once. */}
              <div className="focus__rail">
                <LayerBeliefs result={result} />
              </div>
            </>
          ) : (
            <p className="focus__empty">Run a prompt to watch the model think.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
