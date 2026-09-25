"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { scrollStore } from "../scroll/scrollStore";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Drives an element's opacity from the chapter time without re-rendering:
 * `fn(t)` returns 0…1, applied as opacity + a small lift (none with reduced
 * motion). While invisible the element ignores the pointer and its CSS loops
 * pause ([data-idle]), but its text stays readable by assistive tech; keyboard
 * focus landing inside flies the camera to its chapter (see SmoothScroll).
 */
export function useScrollFade<T extends HTMLElement>(fn: (t: number) => number, lift = 18) {
  const ref = useRef<T>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(() => {
    const dy = prefersReducedMotion() ? 0 : lift;
    return scrollStore.subscribe((s) => {
      const el = ref.current;
      if (!el) return;
      const v = fnRef.current(s.t);
      el.style.opacity = v.toFixed(3);
      el.style.transform = dy ? `translate3d(0, ${((1 - v) * dy).toFixed(1)}px, 0)` : "";
      const hidden = v < 0.02;
      el.style.pointerEvents = hidden ? "none" : "";
      el.toggleAttribute("data-idle", hidden);
    });
  }, [lift]);
  return ref;
}

/** Whether `fn(t)` is on screen; re-renders only when that flips. */
export function useFadeActive(fn: (t: number) => number) {
  const [active, setActive] = useState(false);
  useEffect(() => scrollStore.subscribe((s) => setActive(fn(s.t) >= 0.02)), [fn]);
  return active;
}

/**
 * On screens too short for a panel, its content scrolls inside it: while it
 * overflows, the wheel scrolls it natively instead of driving Lenis.
 */
export function useOverflowScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Only a real scroll container counts: decorations poking out (panel corners) also raise scrollHeight.
    const check = () =>
      el.toggleAttribute("data-lenis-prevent", /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    check();
    return () => ro.disconnect();
  }, [ref]);
}

/** Panel fade for a deck chapter: in as the deck is reached, out before the descent. */
export function deckFade(chapter: number, last = false) {
  return (t: number) => smooth(chapter - 0.14, chapter - 0.01, t) * (last ? 1 : 1 - smooth(chapter + 0.47, chapter + 0.57, t));
}

export { smooth };

/** Current chapter time as React state, throttled to meaningful changes. */
export function useChapterT(step = 0.01) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let last = -1;
    return scrollStore.subscribe((s) => {
      if (Math.abs(s.t - last) >= step) {
        last = s.t;
        setT(s.t);
      }
    });
  }, [step]);
  return t;
}

export function useReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => scrollStore.subscribe((s) => setReady(s.ready)), []);
  return ready;
}
