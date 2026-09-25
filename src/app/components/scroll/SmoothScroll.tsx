"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { CHAPTERS, scrollStore, T_MAX, type ChapterId } from "./scrollStore";

/** Whether a chapter's panel is on screen at chapter time t (see the fades in useChapter / sections). */
function panelVisible(index: number, t: number) {
  if (index === 0) return t < 0.2;
  return t > index - 0.02 && (index === T_MAX - 1 || t < index + 0.47);
}

// Lenis smooth scrolling + scroll → chapter time mapping.
export default function SmoothScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Anchors are handled by navigateTo (chapter offsets + focus), not by Lenis.
    const lenis = reduceMotion
      ? null
      : new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.4, autoRaf: true });
    scrollStore.setLenis(lenis);

    let tops: number[] = [];
    let maxScroll = 1;
    let lastY = window.scrollY;
    let lastTime = performance.now();

    const measure = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
      tops = sections.map((el) => el.getBoundingClientRect().top + window.scrollY);
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollStore.setChapterTops(tops);
    };

    const computeT = (y: number) => {
      const n = tops.length;
      if (!n) return 0;
      for (let i = n - 1; i >= 0; i--) {
        if (y >= tops[i]) {
          const end = i < n - 1 ? tops[i + 1] : maxScroll;
          const span = Math.max(1, end - tops[i]);
          return Math.min(T_MAX, i + Math.min(1, (y - tops[i]) / span));
        }
      }
      return 0;
    };

    const update = () => {
      const y = window.scrollY;
      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      const velocity = (y - lastY) / dt;
      lastY = y;
      lastTime = now;
      scrollStore.setT(computeT(y), velocity);
    };

    measure();
    update();

    const ro = new ResizeObserver(() => {
      measure();
      update();
    });
    ro.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });

    // Tabbing into a panel that is faded out (or find-in-page landing there): fly to its chapter.
    const onFocusIn = (e: FocusEvent) => {
      const section = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-chapter]") : null;
      if (!section) return;
      const index = CHAPTERS.indexOf(section.dataset.chapter as ChapterId);
      if (index < 0 || panelVisible(index, scrollStore.get().t) || scrollStore.isHeadingTo(index)) return;
      // Next frame: after the browser's own scroll-into-view for the focused element.
      requestAnimationFrame(() => scrollStore.scrollToChapter(index, index === 0 ? 0 : 0.02, 0.7));
    };
    document.addEventListener("focusin", onFocusIn);

    // Keep the page locked on the loader until the 3D scene is ready.
    lenis?.stop();
    const unsub = scrollStore.subscribe((s) => {
      if (s.ready) lenis?.start();
    });

    return () => {
      unsub();
      ro.disconnect();
      window.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocusIn);
      lenis?.destroy();
      scrollStore.setLenis(null);
    };
  }, []);

  return null;
}
