// ═══════════════════════════════════════════════════════════════
// INTRO — the loader hands over to a pixel-grid reveal of the scene
// (three/Reveal.tsx). The loader calls begin() as it fades out; the
// HTML layer stays hidden (html[data-intro]) until the ship has formed.
// ═══════════════════════════════════════════════════════════════

let startedAt = 0;

export const intro = {
  /** Start the reveal (idempotent). */
  begin() {
    if (!startedAt) startedAt = performance.now();
  },
  /** performance.now() when the reveal started, 0 before. */
  startedAt: () => startedAt,
};
