// ═══════════════════════════════════════════════════════════════
// INTRO — the loader hands over to the opening of the scene: a 3D
// graph draws itself (three/IntroGraph.tsx) while the decor appears as
// a hologram and fills in from the ship (three/Reveal.tsx). The HTML
// layer stays hidden (html[data-intro]) until the ship has formed.
// ═══════════════════════════════════════════════════════════════

let startedAt = 0;

export const intro = {
  /** Start the opening (idempotent). */
  begin() {
    if (!startedAt) startedAt = performance.now();
  },
  /** performance.now() when the opening started, 0 before. */
  startedAt: () => startedAt,
  /** Seconds since the opening started, 0 before. */
  elapsed: () => (startedAt ? (performance.now() - startedAt) / 1000 : 0),
};
