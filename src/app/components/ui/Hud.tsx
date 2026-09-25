"use client";

import { type MouseEvent } from "react";
import { navigateTo } from "../scroll/scrollStore";
import { DECKS, deckChapter } from "../decks";
import { useChapterT } from "./useChapter";

// ═══════════════════════════════════════════════════════════════
// HUD — the only fixed chrome over the scene: the deck navigation,
// bare text links melting into the decor (no bar, no border).
// ═══════════════════════════════════════════════════════════════

/** Which deck the camera is on (0 = still outside); switches mid-descent. */
function activeDeck(t: number) {
  if (t < 1.8) return 0;
  return 1 + Math.min(3, Math.max(0, Math.floor(t - 2 + 0.2)));
}

/** Plain clicks fly the camera; modified clicks keep the browser's own behavior (new tab…). */
const onNav = (chapter: number, id: string) => (e: MouseEvent) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigateTo(chapter, id);
};

export default function Hud() {
  const active = activeDeck(useChapterT(0.02));

  return (
    <div className="hud">
      <header className="hud__top">
        <nav className="hud__nav" aria-label="Decks">
          {DECKS.map((d, i) => {
            const current = active === i + 1;
            return (
              <a
                key={d.id}
                href={`#${d.id}`}
                className={`hud__link ${current ? "is-active" : ""}`}
                aria-current={current ? "location" : undefined}
                onClick={onNav(deckChapter(i), d.id)}
              >
                {d.nav}
              </a>
            );
          })}
        </nav>
      </header>
    </div>
  );
}
