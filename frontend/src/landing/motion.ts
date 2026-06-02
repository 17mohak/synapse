// Landing-page motion primitives. Two hooks, both transform/opacity only, both
// inert under prefers-reduced-motion. Kept deliberately small: the choreography
// lives in CSS (the easing curves, the --i stagger); these just decide *when*
// each element arms.

import { useEffect, type RefObject } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveal every `.reveal` element under `root` as it enters the viewport. Above
 * the fold the observer fires almost immediately, so the boot sequence is just
 * the `--i` stagger playing out (nav, then the headline lines, then the copy,
 * then the chart card). Below the fold each section arms on scroll. The CSS only
 * hides `.reveal` under `html.js-motion`, so if motion is off this is a no-op and
 * nothing is ever gated behind a transition.
 */
export function useScrollReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(".reveal"));
    if (prefersReduced() || !("IntersectionObserver" in window)) {
      items.forEach((n) => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}

/**
 * Subtle depth-parallax. Each `[data-depth]` element drifts vertically as it
 * crosses the viewport, by `depth` of its distance from screen centre, clamped
 * to `data-depth-max` px (default 28). One passive scroll listener, rAF-throttled,
 * writing a single CSS var so the transform stays on the compositor. Parallax
 * layers are always distinct wrappers from `.reveal` elements, so the two
 * transforms never collide.
 */
export function useParallax(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReduced()) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-depth]")).map(
      (n) => ({
        n,
        depth: parseFloat(n.dataset.depth || "0"),
        max: parseFloat(n.dataset.depthMax || "28"),
      }),
    );
    if (!items.length) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const it of items) {
        const r = it.n.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const py = Math.max(-it.max, Math.min(it.max, (vh / 2 - center) * it.depth));
        it.n.style.setProperty("--py", `${py.toFixed(1)}px`);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [root]);
}
