import type Lenis from "lenis";

// ═══════════════════════════════════════════════════════════════
// SCROLL STORE
//
// The page is split into chapters (<section data-chapter>). The scroll
// position is mapped to a continuous "chapter time" t:
//   t = 2.0  → the "about" section just reached the top of the viewport
//   t = 2.5  → halfway through it
// The 3D camera and the HTML overlays both read t, so they stay in sync
// whatever the section heights are (desktop, mobile, resize…).
// Values live outside React to avoid re-rendering on every scroll tick.
// ═══════════════════════════════════════════════════════════════

export const CHAPTERS = ["space", "boarding", "about", "security", "projects", "contact"] as const;
export type ChapterId = (typeof CHAPTERS)[number];
export const T_MAX = CHAPTERS.length;

type Snapshot = { t: number; velocity: number; ready: boolean };
type Listener = (s: Snapshot) => void;

const state: Snapshot = { t: 0, velocity: 0, ready: false };
const listeners = new Set<Listener>();
let lenis: Lenis | null = null;
let chapterTops: number[] = [];
let heading: { index: number; until: number } | null = null;

export const scrollStore = {
  get: () => state,
  setT(t: number, velocity: number) {
    state.t = t;
    state.velocity = velocity;
    listeners.forEach((l) => l(state));
  },
  setReady() {
    state.ready = true;
    listeners.forEach((l) => l(state));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    l(state);
    return () => {
      listeners.delete(l);
    };
  },
  setLenis(l: Lenis | null) {
    lenis = l;
  },
  getLenis: () => lenis,
  setChapterTops(tops: number[]) {
    chapterTops = tops;
  },
  /** Scroll so that t reaches the given chapter (optionally a fraction inside it). */
  scrollToChapter(index: number, offset = 0, duration = 1.8) {
    const top = chapterTops[index];
    if (top === undefined) return;
    const next = chapterTops[index + 1];
    const span = next !== undefined ? next - top : 0;
    const y = top + span * offset + 1;
    heading = { index, until: performance.now() + duration * 1000 + 250 };
    if (lenis) lenis.scrollTo(y, duration > 0 ? { duration } : { immediate: true });
    // No Lenis means reduced motion: jump instead of gliding.
    else window.scrollTo({ top: y, behavior: "auto" });
  },
  /** True while a scrollToChapter(index) is still on its way. */
  isHeadingTo(index: number) {
    return heading !== null && heading.index === index && performance.now() < heading.until;
  },
};

/** Fly to a chapter, keep the URL shareable and move keyboard focus to that section. */
export function navigateTo(chapter: number, id: string) {
  scrollStore.scrollToChapter(chapter, chapter === 0 ? 0 : 0.02);
  history.replaceState(null, "", chapter === 0 ? location.pathname + location.search : `#${id}`);
  document.getElementById(id)?.focus({ preventScroll: true });
}

/** Fade helper for chapter-driven overlays: 0 → 1 → 0 over [a, b, c, d]. */
export function band(t: number, a: number, b: number, c: number, d: number) {
  if (t <= a || t >= d) return 0;
  if (t < b) return (t - a) / (b - a);
  if (t <= c) return 1;
  return 1 - (t - c) / (d - c);
}
