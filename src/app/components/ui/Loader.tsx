"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { intro } from "../intro";
import { scrollStore } from "../scroll/scrollStore";
import { useReady } from "./useChapter";

// Pre-flight screen shown while the scene is generated and its shaders compile:
// the ship's name over a row of characters that fills as it loads (after igloo.inc).

/** If the scene never reports ready (stuck GPU, driver hang…), unlock the page anyway. */
const READY_TIMEOUT = 25_000;
const CELLS = 12;
const TICK = 70;
const SCRAMBLE = "+=*/-";

/**
 * One frame of the row: loaded cells are "=" with a run of "+" sweeping through
 * them, the two cells at the loading front scramble, the rest wait as "-".
 * Reduced motion keeps the fill and drops the sweep and the scramble.
 */
function progressRow(progress: number, frame: number, still: boolean) {
  const filled = Math.min(CELLS, Math.floor(progress * CELLS));
  const front = still ? 0 : Math.min(2, CELLS - filled);
  const sweep = ((frame * 0.45) % (filled + 6)) - 3;
  let done = "";
  for (let i = 0; i < filled; i++) done += !still && Math.abs(i - sweep) <= 1 ? "+" : "=";
  let scramble = "";
  for (let i = 0; i < front; i++) scramble += SCRAMBLE[(frame * 7 + i * 13 + (frame >> 2)) % SCRAMBLE.length];
  return { done, scramble, todo: "-".repeat(CELLS - filled - front) };
}

export default function Loader() {
  const ready = useReady();
  const [elapsed, setElapsed] = useState(0);
  const [gone, setGone] = useState(false);
  const start = useRef(0);
  const still = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const done = ready && elapsed > 1.1;

  useEffect(() => {
    if (done) return;
    if (!start.current) start.current = performance.now();
    const id = window.setInterval(() => setElapsed((performance.now() - start.current) / 1000), TICK);
    return () => window.clearInterval(id);
  }, [done]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!scrollStore.get().ready) scrollStore.setReady();
    }, READY_TIMEOUT);
    return () => window.clearTimeout(id);
  }, []);

  // Fade out and hand over to the pixel-grid reveal of the scene (three/Reveal.tsx).
  useEffect(() => {
    if (!done) return;
    intro.begin();
    const id = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(id);
  }, [done]);

  if (gone) return null;
  const progress = done ? 1 : Math.min(0.92, 1 - Math.exp(-elapsed / 2.2));
  const row = progressRow(progress, Math.floor((elapsed * 1000) / TICK), still || done);

  return (
    <div className={`loader ${done ? "loader--out" : ""}`}>
      <div className="loader__inner">
        <p className="loader__logo">QC</p>
        <p className="loader__row" aria-hidden>
          {row.done}
          <span className="loader__front">{row.scramble}</span>
          <span className="loader__todo">{row.todo}</span>
        </p>
        <p className="sr-only" role="status">
          {done ? "Ready" : "Loading"}
        </p>
      </div>
    </div>
  );
}
