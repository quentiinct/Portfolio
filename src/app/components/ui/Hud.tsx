"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { navigateTo, scrollStore, T_MAX } from "../scroll/scrollStore";
import { DECKS, deckChapter } from "../decks";
import { useChapterT } from "./useChapter";

// ═══════════════════════════════════════════════════════════════
// HUD — fixed chrome over the scene: logo, deck navigation, the
// elevator-style deck indicator and a location read-out. On phones
// and short screens only the logo and the deck navigation remain.
// ═══════════════════════════════════════════════════════════════

const RAIL = [
  { id: "top", n: "EXT", label: "Open space", chapter: 0 },
  ...DECKS.map((d, i) => ({ id: d.id, n: d.n, label: d.label, chapter: deckChapter(i) })),
];

/** Which rail stop is active: switches mid-descent between decks. */
function activeStop(t: number) {
  if (t < 1.8) return 0;
  return 1 + Math.min(3, Math.max(0, Math.floor(t - 2 + 0.2)));
}

function location(t: number) {
  if (t < 0.85) return "Open space · Orbit 408 km";
  if (t < 1.8) return "Airlock 01 · Docking";
  const s = RAIL[activeStop(t)];
  return `Deck ${s.n} · ${s.label}`;
}

/** Plain clicks fly the camera; modified clicks keep the browser's own behavior (new tab…). */
const onNav = (chapter: number, id: string) => (e: MouseEvent) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigateTo(chapter, id);
};

export default function Hud() {
  const t = useChapterT(0.02);
  const fill = useRef<HTMLSpanElement>(null);
  const stop = activeStop(t);

  useEffect(
    () =>
      scrollStore.subscribe((s) => {
        if (fill.current) fill.current.style.transform = `scaleY(${(s.t / T_MAX).toFixed(4)})`;
      }),
    []
  );

  return (
    <div className="hud">
      <header className="hud__top">
        <a href="#top" className="hud__logo" onClick={onNav(0, "top")} aria-label="Back to the top">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
            <path d="M12 4.5c2.2 1.9 3.3 4.4 3.3 7.3v4.4H8.7v-4.4c0-2.9 1.1-5.4 3.3-7.3Z" fill="currentColor" />
            <path d="M8.7 14.2 6.8 17.6h1.9M15.3 14.2l1.9 3.4h-1.9" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
          <span>QC-01</span>
        </a>
        <nav className="hud__nav" aria-label="Decks">
          {DECKS.map((d, i) => {
            const active = stop === i + 1;
            return (
              <a
                key={d.id}
                href={`#${d.id}`}
                className={`hud__link ${active ? "is-active" : ""}`}
                aria-current={active ? "location" : undefined}
                onClick={onNav(deckChapter(i), d.id)}
              >
                {d.nav}
              </a>
            );
          })}
        </nav>
      </header>

      <nav className="rail" aria-label="Deck indicator">
        <span className="rail__track" aria-hidden>
          <span ref={fill} className="rail__fill" />
        </span>
        {RAIL.map((r, i) => (
          <a
            key={r.id}
            href={`#${r.id}`}
            className={`rail__stop ${i === stop ? "is-active" : ""} ${i < stop ? "is-past" : ""}`}
            aria-current={i === stop ? "location" : undefined}
            aria-label={i === 0 ? r.label : `Deck ${r.n} · ${r.label}`}
            onClick={onNav(r.chapter, r.id)}
          >
            <span className="rail__label">{r.label}</span>
            <span className="rail__id">{r.n}</span>
            <span className="rail__pip" aria-hidden />
          </a>
        ))}
      </nav>

      <p className="hud__loc" aria-live="polite">
        <span className="hud__loc-dot" aria-hidden />
        {location(t)}
      </p>
    </div>
  );
}
