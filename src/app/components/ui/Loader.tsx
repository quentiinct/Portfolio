"use client";

import { useEffect, useRef, useState } from "react";
import { intro } from "../intro";
import { scrollStore } from "../scroll/scrollStore";
import { useReady } from "./useChapter";

// Pre-flight screen shown while the scene is generated and its shaders compile.

const STEPS = ["Generating asteroid field", "Polishing the hull", "Pressurizing the cabin", "Compiling shaders", "Ready for boarding"];

/** If the scene never reports ready (stuck GPU, driver hang…), unlock the page anyway. */
const READY_TIMEOUT = 25_000;

export default function Loader() {
  const ready = useReady();
  const [elapsed, setElapsed] = useState(0);
  const [gone, setGone] = useState(false);
  const start = useRef(0);

  const done = ready && elapsed > 1.1;

  useEffect(() => {
    if (done) return;
    if (!start.current) start.current = performance.now();
    const id = window.setInterval(() => setElapsed((performance.now() - start.current) / 1000), 120);
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
  const step = done ? STEPS[STEPS.length - 1] : STEPS[Math.min(STEPS.length - 2, Math.floor(elapsed / 1.3))];

  return (
    <div className={`loader ${done ? "loader--out" : ""}`}>
      <div className="loader__inner">
        <p className="loader__logo">QC-01</p>
        {/* Only the step is announced: the percentage changes too often for a live region. */}
        <p className="loader__step" role="status">
          {step}…
        </p>
        <div className="loader__bar" aria-hidden>
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="loader__pct" aria-hidden>
          {Math.round(progress * 100)}%
        </p>
      </div>
    </div>
  );
}
