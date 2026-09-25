"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PROFILE, SECURITY } from "../../data";
import { DECKS } from "../decks";
import { ContactCard, GitHubCard, HeroCard, SceneActiveContext, killSystem } from "./bento";
import { deckFade, smooth, useFadeActive, useOverflowScroll, useScrollFade } from "./useChapter";
import { navigateTo, scrollStore } from "../scroll/scrollStore";

// ═══════════════════════════════════════════════════════════════
// STORY SECTIONS — HTML layer above the canvas. Each chapter is a tall
// <section data-chapter>; its content sticks to the viewport and fades
// in/out with the chapter time, in sync with the camera.
// ═══════════════════════════════════════════════════════════════

// ─── Icons ────────────────────────────────────────────────────

const Icon = {
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="11" width="6" height="5" rx="1" />
      <path d="M12 11V9a2 2 0 0 1 2-2" />
    </svg>
  ),
};

// ─── Building blocks ──────────────────────────────────────────

function DeckPanel({ chapter, deck, children, last = false }: { chapter: number; deck: number; children: ReactNode; last?: boolean }) {
  const fade = useMemo(() => deckFade(chapter, last), [chapter, last]);
  const ref = useScrollFade<HTMLDivElement>(fade, 26);
  useOverflowScroll(ref);
  const meta = DECKS[deck];
  return (
    <div className="sticky-screen">
      <div ref={ref} className="panel" style={{ "--accent": meta.accent } as CSSProperties}>
        <span className="panel__corner panel__corner--tl" aria-hidden />
        <span className="panel__corner panel__corner--br" aria-hidden />
        <header className="panel__head">
          <span className="panel__deck">
            Deck {meta.n} <span className="panel__of">/ 04</span>
          </span>
          <span className="panel__name">{meta.label}</span>
        </header>
        {children}
      </div>
    </div>
  );
}

/** One of the live site's bento cards, shown on its deck. Its pixel scene only animates while it is on screen. */
function DeckCard({ chapter, children, last = false, tall = false, wide = false }: { chapter: number; children: ReactNode; last?: boolean; tall?: boolean; wide?: boolean }) {
  const fade = useMemo(() => deckFade(chapter, last), [chapter, last]);
  const ref = useScrollFade<HTMLDivElement>(fade, 26);
  const body = useRef<HTMLDivElement>(null);
  useOverflowScroll(body);
  const active = useFadeActive(fade);
  return (
    <div className="sticky-screen">
      <div ref={ref} className={`deck-card ${tall ? "deck-card--tall" : ""} ${wide ? "deck-card--wide" : ""}`}>
        <div ref={body} className="deck-card__body">
          <SceneActiveContext value={active}>{children}</SceneActiveContext>
        </div>
      </div>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="chips">
      {items.map((s) => (
        <li key={s} className="chip">
          {s}
        </li>
      ))}
    </ul>
  );
}

// ─── Chapter 0 · hero (exterior) ──────────────────────────────

export function Hero() {
  const fade = useMemo(() => (t: number) => 1 - smooth(0.04, 0.32, t), []);
  const ref = useScrollFade<HTMLDivElement>(fade, -40);
  const scrim = useScrollFade<HTMLDivElement>(fade, 0);
  return (
    <div className="sticky-screen sticky-screen--hero">
      <div ref={scrim} className="hero-scrim" aria-hidden />
      <div ref={ref} className="hero">
        <h1 className="hero__title">
          <span>{PROFILE.firstName}</span>
          <span>
            {PROFILE.lastName}
            <em>.</em>
          </span>
        </h1>
        <p className="hero__roles">{PROFILE.roles.join(" · ")}</p>
        <p className="hero__tagline">{PROFILE.tagline}</p>
        <button type="button" className="hero__cta" onClick={() => navigateTo(2, DECKS[0].id)}>
          Board the ship {Icon.arrow}
        </button>
      </div>
      <ScrollHint />
    </div>
  );
}

function ScrollHint() {
  const fade = useMemo(() => (t: number) => 1 - smooth(0.01, 0.12, t), []);
  const ref = useScrollFade<HTMLDivElement>(fade, 0);
  return (
    <div ref={ref} className="scroll-hint" aria-hidden>
      <span>Scroll to board</span>
      <span className="scroll-hint__line" />
    </div>
  );
}

// ─── Chapter 1 · boarding ─────────────────────────────────────

export function Boarding() {
  const fade = useMemo(() => (t: number) => smooth(0.72, 0.95, t) * (1 - smooth(1.5, 1.72, t)), []);
  const ref = useScrollFade<HTMLDivElement>(fade, 12);
  const [status, setStatus] = useState("Docking");
  useEffect(
    () =>
      scrollStore.subscribe((s) => {
        setStatus(s.t < 0.98 ? "Docking" : s.t < 1.3 ? "Airlock open" : "Welcome aboard");
      }),
    []
  );
  return (
    <div className="sticky-screen sticky-screen--center">
      <div ref={ref} className="boarding">
        <p className="boarding__label">Airlock 01 · Deck 01</p>
        <p className="boarding__status">{status}</p>
        <span className="boarding__bar" aria-hidden />
      </div>
    </div>
  );
}

// ─── Chapter 2 · about ────────────────────────────────────────

export function AboutPanel() {
  return (
    <DeckCard chapter={2} tall>
      <HeroCard onKill={killSystem} />
    </DeckCard>
  );
}

// ─── Chapter 3 · security ─────────────────────────────────────

export function SecurityPanel() {
  return (
    <DeckPanel chapter={3} deck={1}>
      <h2 className="panel__title panel__title--icon">
        <span className="title-icon">{Icon.shield}</span> Cybersecurity
      </h2>
      <p className="lead">{SECURITY.summary}</p>
      <p className="muted">{SECURITY.detail}</p>
      <div className="block">
        <p className="label">Modules</p>
        <Chips items={SECURITY.modules} />
      </div>
      <div className="block">
        <p className="label">Status</p>
        <div className="progress" role="img" aria-label={SECURITY.status}>
          <span className="progress__fill" />
        </div>
        <p className="mono small warn">{SECURITY.status} — write-ups incoming</p>
      </div>
    </DeckPanel>
  );
}

// ─── Chapter 4 · projects ─────────────────────────────────────

export function ProjectsPanel() {
  return (
    <DeckCard chapter={4} wide>
      <GitHubCard />
    </DeckCard>
  );
}

// ─── Chapter 5 · contact ──────────────────────────────────────

export function ContactPanel() {
  return (
    <DeckCard chapter={5} last>
      <ContactCard />
    </DeckCard>
  );
}
