"use client";

import { motion, AnimatePresence, useAnimation, useMotionValue, useAnimationFrame, useTransform, animate as animateEl } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { CHANNELS } from "./data";

// ═══════════════════════════════════════════════════════════════
// DONNÉES LOCALES
// ═══════════════════════════════════════════════════════════════

const WIP_PROJECTS = [
  {
    id: "cyber",
    category: "Cybersecurity",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <rect x="9" y="11" width="6" height="5" rx="1" />
        <path d="M12 11V9a2 2 0 0 1 2-2" />
      </svg>
    ),
    description: "CTF, pentest & security projects — soon.",
    tags: ["CTF", "Pentest", "Kali Linux", "OSCP"],
    colClass: "col-span-12 md:col-span-4",
  },
  {
    id: "ai",
    category: "Artificial Intelligence",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
        <path d="M12 2a2 2 0 0 1 2 2v1a2 2 0 0 1-4 0V4a2 2 0 0 1 2-2z" />
        <path d="M12 19a2 2 0 0 1 2 2v1a2 2 0 0 1-4 0v-1a2 2 0 0 1 2-2z" />
        <path d="M4.22 4.22a2 2 0 0 1 2.83 0l.7.7a2 2 0 0 1-2.83 2.83l-.7-.7a2 2 0 0 1 0-2.83z" />
        <path d="M16.24 16.24a2 2 0 0 1 2.83 0l.7.7a2 2 0 0 1-2.83 2.83l-.7-.7a2 2 0 0 1 0-2.83z" />
        <path d="M2 12a2 2 0 0 1 2-2h1a2 2 0 0 1 0 4H4a2 2 0 0 1-2-2z" />
        <path d="M19 12a2 2 0 0 1 2-2h1a2 2 0 0 1 0 4h-1a2 2 0 0 1-2-2z" />
        <path d="M4.22 19.78a2 2 0 0 1 0-2.83l.7-.7a2 2 0 0 1 2.83 2.83l-.7.7a2 2 0 0 1-2.83 0z" />
        <path d="M16.24 7.76a2 2 0 0 1 0-2.83l.7-.7a2 2 0 0 1 2.83 2.83l-.7.7a2 2 0 0 1-2.83 0z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    description: "Automation, LLMs & AI Projects — soon.",
    tags: ["Python", "LLMs", "Claude API", "Automation"],
    colClass: "col-span-12 md:col-span-4",
  },
];

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const card = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

// ═══════════════════════════════════════════════════════════════
// COMPOSANTS UI
// ═══════════════════════════════════════════════════════════════

function BentoCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const boxShadow = useMotionValue("none");

  const handleHoverStart = async () => {
    animateEl(x, [0, 1.5, 0], { duration: 0.35, ease: "easeOut" });
    await animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0.30), 0 0 18px rgba(255,255,255,0.06)", { duration: 0.15 });
    animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0), 0 0 0px rgba(255,255,255,0)", { duration: 0.85 });
  };

  return (
    <motion.div
      variants={card}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
      className={`bento-card rounded-2xl p-5 ${className}`}
      style={{ x, boxShadow }}
      onHoverStart={handleHoverStart}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
      {text}
    </p>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-zinc-500">
      {label}
    </span>
  );
}


// ═══════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════

// ─── TERMINAL WIDGET ──────────────────────────────────────────
// Fond : Matrix rain sur canvas (continu, ralenti en idle).
// Hover terminal : accélère la pluie + couleur rouge près du curseur.
// Hover ligne individuelle : translateX.

const TERMINAL_LINES = [
  { prompt: "$", text: "last deploy", dim: true },
  { prompt: ">", text: "portfolio v1", tag: "LIVE" },
  { prompt: "$", text: "currently building", dim: true },
  { prompt: ">", text: "image search", tag: "WIP" },
];

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function TerminalWidget({ onKill }: { onKill?: () => void }) {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number[]>(TERMINAL_LINES.map(() => 0));
  const [typingDone, setTypingDone] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [killLine, setKillLine] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await delay(400);
      for (let li = 0; li < TERMINAL_LINES.length; li++) {
        if (cancelled) return;
        const text = TERMINAL_LINES[li].text;
        const speed = TERMINAL_LINES[li].dim ? 28 : 50;
        for (let ci = 1; ci <= text.length; ci++) {
          if (cancelled) return;
          await delay(speed);
          setRevealed((prev) => {
            const next = [...prev];
            next[li] = ci;
            return next;
          });
        }
        await delay(130);
      }
      if (!cancelled) setTypingDone(true);
    };

    run();
    return () => { cancelled = true; };
  }, []);

  const currentTypingLine = !typingDone
    ? TERMINAL_LINES.findIndex((l, i) => revealed[i] < l.text.length)
    : -1;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!typingDone) return;
    if (e.key === "Backspace") {
      setCurrentInput((v) => v.slice(0, -1));
    } else if (e.key === "Enter") {
      if (currentInput === "/kill") {
        setKillLine(true);
        setTimeout(() => onKill?.(), 800);
      }
      setCurrentInput("");
    } else if (e.key.length === 1) {
      setCurrentInput((v) => v + e.key);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="overflow-hidden rounded-xl border border-white/5 bg-black/40 p-3 font-mono text-xs outline-none"
      onClick={() => containerRef.current?.focus()}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseLeave={() => setActiveLine(null)}
    >
      <div>
        {/* Header macOS dots */}
        <div className="mb-3 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <span className="ml-2 text-[10px] text-zinc-600">quentin@portfolio ~ zsh</span>
        </div>

        {TERMINAL_LINES.map((line, i) => (
          <div
            key={i}
            className="flex cursor-default items-center gap-2 py-[3px]"
            style={{
              transform:  activeLine === i ? "translateX(6px)" : "translateX(0)",
              opacity:    line.dim ? (activeLine === i ? 0.7 : 0.35) : 1,
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
            onMouseEnter={() => setActiveLine(i)}
            onMouseLeave={() => setActiveLine(null)}
          >
            <span style={{ color: activeLine === i ? "#DE3E4A" : "#52525b" }}>{line.prompt}</span>
            <span
              className="text-zinc-300"
              style={
                !line.dim && activeLine === i
                  ? { textShadow: "0 0 10px rgba(255,255,255,0.55)", color: "#ffffff" }
                  : undefined
              }
            >
              {line.text.slice(0, revealed[i])}
              {currentTypingLine === i && (
                <span className="animate-pulse opacity-60">▍</span>
              )}
            </span>
            {revealed[i] >= line.text.length && line.tag && (
              <span
                className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold"
                style={{
                  backgroundColor: line.tag === "WIP" ? "rgba(222,62,74,0.12)" : "rgba(74,222,128,0.12)",
                  color:           line.tag === "WIP" ? "#DE3E4A"              : "#4ade80",
                }}
              >
                {line.tag}
              </span>
            )}
          </div>
        ))}

        {killLine && (
          <div className="mt-1 flex items-center gap-2 py-[3px]">
            <span style={{ color: "#DE3E4A" }}>!</span>
            <span className="text-xs font-semibold tracking-widest" style={{ color: "#DE3E4A" }}>SYSTEM TERMINATED</span>
          </div>
        )}

        <div
          className="mt-2 flex items-center gap-2"
          style={{ opacity: typingDone && !killLine ? 1 : 0, transition: "opacity 0.4s ease" }}
        >
          <span style={{ color: "#DE3E4A" }}>$</span>
          <span className="text-zinc-300">{currentInput}</span>
          <span
            className={focused ? "animate-pulse text-zinc-400" : "text-zinc-700"}
          >█</span>
        </div>
      </div>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────
// Memoji : idle.png affiché par défaut, wink.gif swappé au hover.
// Le changement de `gifKey` force React à re-monter le <img>,
// ce qui redémarre le GIF depuis le début à chaque entrée de souris.
function HeroCard({ onKill }: { onKill?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [gifKey, setGifKey] = useState(0);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  return (
    <BentoCard className="col-span-12 flex flex-col md:col-span-4 md:row-span-3 md:h-full">
      <SectionLabel text="AI • CYBERSECURITY" />

      {/* Badge disponibilité */}
      <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
        </span>
        <span className="text-xs text-zinc-300">Available to work</span>
      </div>

      {/* Nom + memoji en accompagnement */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-5xl font-semibold tracking-tight text-white">
          Quentin<span style={{ color: "#DE3E4A" }}>.</span>
        </h1>
        {/* Deux images superposées en position relative/absolute.
            On crossfade l'opacité plutôt que de swapper le src —
            aucun remount, aucun flash quelle que soit la frame du GIF. */}
        <div
          className="relative w-27 cursor-pointer select-none rounded-2xl"
          style={{
            transform: hovered ? "translateY(-4px) scale(1.05)" : "translateY(0px) scale(1)",
            transition: "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
          onMouseEnter={() => { setHovered(true); setGifKey((k) => k + 1); }}
          onMouseLeave={() => setHovered(false)}
        >
          {/* idle — optimisé via Next.js Image */}
          <Image
            src="/memoji/frame-01.PNG"
            alt="Memoji Quentin"
            width={108}
            height={108}
            priority
            className="w-full rounded-2xl"
            style={{ opacity: hovered ? 0 : 1, transition: "opacity 0.15s ease" }}
            draggable={false}
          />
          {/* GIF — <img> conservé : Next.js Image ne supporte pas les GIFs animés */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={gifKey}
            src="/memoji/memogif.gif"
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 w-full rounded-2xl"
            style={{ opacity: hovered ? 1 : 0, transition: "opacity 0.15s ease" }}
            draggable={false}
          />
        </div>
      </div>

      {/* Localisation */}
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-600">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        Bordeaux · Remote
      </div>

      {/* Description + terminal + tags */}
      <div className="mt-5 flex flex-1 flex-col justify-between">
        <div>
          <p className="mb-6 text-[15px] leading-relaxed text-zinc-400">
            I build AI tools and secure systems for real-world use.
            <br />
            Useful. Reliable. Built clean.
          </p>
          <TerminalWidget onKill={onKill} />
        </div>
        <div className="mt-5 flex gap-1.5">
          {["Video Editing", "Development", "CyberSecurity", "AI"].map((tag) => (
            <span
              key={tag}
              className={`whitespace-nowrap rounded-full py-1 text-center text-[11px] cursor-default ${tag === "AI" ? "px-3" : "flex-1"}`}
              style={{
                backgroundColor: hoveredTag === tag ? "rgba(222,62,74,0.1)" : "rgba(255,255,255,0.05)",
                color: hoveredTag === tag ? "#DE3E4A" : "#a1a1aa",
                transition: "background-color 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={() => setHoveredTag(tag)}
              onMouseLeave={() => setHoveredTag(null)}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}

// ─── CONTACT ──────────────────────────────────────────────────
function ContactCard() {
  const [hovered, setHovered] = useState(false);
  const borderControls = useAnimation();

  const handleHoverStart = async () => {
    setHovered(true);
    await borderControls.start({
      boxShadow: "0 0 0 1.5px rgba(222,62,74,0.9), 0 0 24px rgba(222,62,74,0.28)",
      transition: { duration: 0.12 },
    });
    borderControls.start({
      boxShadow: "0 0 0 1px rgba(222,62,74,0.25), 0 0 0px rgba(222,62,74,0)",
      transition: { duration: 0.88 },
    });
  };

  return (
    <BentoCard className="col-span-12 relative flex flex-col gap-4 overflow-hidden md:col-span-4">
      {/* SVG de fond — enveloppe discrète, coin bas-droit */}
      <svg
        className="pointer-events-none absolute -bottom-6 -right-6 opacity-[0.04]"
        width="160" height="160" viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden
      >
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>

      <SectionLabel text="Contact" />
      <div>
        <p className="text-xl font-semibold leading-snug text-white">
          Open to the right<br />opportunity<span style={{ color: "#DE3E4A" }}>.</span>
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          Editing, dev, or something in between — if the project is interesting, I&apos;m in.
        </p>
      </div>
      <motion.a
        href="mailto:quentincourtade33@gmail.com"
        className="relative flex items-center justify-center gap-2.5 overflow-hidden rounded-xl border px-4 py-3.5 text-sm font-medium"
        style={{
          borderColor: "rgba(222,62,74,0.30)",
          backgroundColor: "rgba(222,62,74,0.10)",
          color: "#DE3E4A",
        }}
        animate={borderControls}
        onHoverStart={handleHoverStart}
        onHoverEnd={() => setHovered(false)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <span className="relative flex-1 overflow-hidden" style={{ height: "1.25rem" }}>
          <AnimatePresence mode="wait" initial={false}>
            {hovered ? (
              <motion.span
                key="email"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 flex items-center whitespace-nowrap text-xs"
              >
                quentincourtade33@gmail.com
              </motion.span>
            ) : (
              <motion.span
                key="label"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 flex items-center"
              >
                Let&apos;s talk
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.a>
    </BentoCard>
  );
}

// ─── YOUTUBE TEASER ───────────────────────────────────────────
const parseSubs = (s: string) => parseFloat(s) * (s.includes("M") ? 1_000_000 : s.includes("K") ? 1_000 : 1);

function FlashBorder({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const boxShadow = useMotionValue("none");

  const handleHoverStart = async () => {
    animateEl(x, [0, 1.5, 0], { duration: 0.35, ease: "easeOut" });
    await animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0.30), 0 0 18px rgba(255,255,255,0.06)", { duration: 0.15 });
    animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0), 0 0 0px rgba(255,255,255,0)", { duration: 0.85 });
  };

  return (
    <motion.div style={{ x, boxShadow }} className="bento-card rounded-2xl p-5 cursor-pointer" onHoverStart={handleHoverStart}>
      {children}
    </motion.div>
  );
}

function Sparkline({ start, current, id }: { start: number; current: number; id: string }) {
  const W = 100;
  const H = 32;
  const ratio = start / current;
  const startY = ratio * H;
  const path = `M 0,${startY} C ${W * 0.4},${startY} ${W * 0.6},0 ${W},0`;
  const area = `M 0,${startY} C ${W * 0.4},${startY} ${W * 0.6},0 ${W},0 L ${W},${H} L 0,${H} Z`;
  const gradId = `sg-${id}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeOpacity="0.7" strokeLinecap="round" />
      <circle cx={W} cy={0} r="2.5" fill="#4ade80" opacity="0.9" />
    </svg>
  );
}

function YoutubeTeaserCard() {
  const seeAllControls = useAnimation();

  const handleSeeAllHover = async () => {
    await seeAllControls.start({
      boxShadow: "0 0 0 1.5px rgba(222,62,74,0.9), 0 0 24px rgba(222,62,74,0.28)",
      transition: { duration: 0.12 },
    });
    seeAllControls.start({
      boxShadow: "0 0 0 1px rgba(222,62,74,0.25), 0 0 0px rgba(222,62,74,0)",
      transition: { duration: 0.88 },
    });
  };

  return (
    <motion.div
      variants={card}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
      className="col-span-12 md:col-span-8"
    >
      <Link href="/clients" className="block">
        <FlashBorder>
          <div className="flex items-center justify-between mb-5">
            <div>
              <SectionLabel text="YouTube Clients" />
              <p className="text-lg font-semibold text-white">YouTube Growth Editing</p>
              <p className="text-sm text-zinc-500 mt-1">
                3 channels supported across editing, growth and creative direction
              </p>
            </div>
            <motion.div
              className="group flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium"
              style={{
                borderColor: "rgba(222,62,74,0.25)",
                backgroundColor: "rgba(222,62,74,0.06)",
                color: "#DE3E4A",
              }}
              animate={seeAllControls}
              onHoverStart={handleSeeAllHover}
            >
              <span>See all</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {CHANNELS.map((channel) => {
              const start = parseSubs(channel.subsStart);
              const current = parseSubs(channel.subsCurrent);
              return (
                <div
                  key={channel.id}
                  className="flex flex-col gap-2 rounded-xl bg-white/3 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{channel.name}</p>
                      <p className="text-xs text-zinc-600">{channel.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{channel.subsCurrent}</p>
                      <p className="text-xs font-medium" style={{ color: "#DE3E4A" }}>
                        {channel.growth}
                      </p>
                    </div>
                  </div>
                  <Sparkline start={start} current={current} id={channel.id} />
                </div>
              );
            })}
          </div>
        </FlashBorder>
      </Link>
    </motion.div>
  );
}

// ─── GITHUB CARD ──────────────────────────────────────────────
// Fetch les repos publics via l'API GitHub (pas de clé API nécessaire,
// limite de 60 req/h par IP — largement suffisant pour un portfolio).
// Affiche un carousel : < > pour naviguer, dots pour la position.
// Chaque repo : nom cliquable, étoiles, description, langage.

type Repo = {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
};

function GitHubCard() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = prev, 1 = next

  useEffect(() => {
    const CACHE_KEY = "gh_repos_cache";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { ts, data } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL) {
            setRepos(data);
            setLoading(false);
            return;
          }
        }
      } catch { /* localStorage indisponible ou JSON invalide */ }

      try {
        const r = await fetch("https://api.github.com/users/quentiinct/repos?sort=updated&per_page=20");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: Repo[] = await r.json();
        const filtered = data
          .filter((repo) => !("fork" in repo && (repo as unknown as { fork: boolean }).fork))
          .sort((a, b) => b.stargazers_count - a.stargazers_count);
        setRepos(filtered);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: filtered })); } catch { /* quota */ }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [retryKey]);

  const prev = () => {
    setDirection(-1);
    setIndex((i) => (i - 1 + repos.length) % repos.length);
  };
  const next = () => {
    setDirection(1);
    setIndex((i) => (i + 1) % repos.length);
  };

  const repo = repos[index];

  // Variants pour le slide du carousel
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
    exit: (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.2 } }),
  };

  return (
    <BentoCard className="col-span-12 flex flex-col gap-4 md:col-span-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Icône GitHub SVG */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <p className="text-sm font-semibold text-white">GitHub Projects</p>
        </div>

        {/* Boutons navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            disabled={repos.length === 0}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-300 disabled:opacity-30"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={next}
            disabled={repos.length === 0}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-300 disabled:opacity-30"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-white/5" />
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-3 w-4/5 rounded bg-white/5" />
            <div className="mt-1 flex gap-1.5">
              <div className="h-5 w-14 rounded-full bg-white/5" />
              <div className="h-5 w-16 rounded-full bg-white/5" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-zinc-500">GitHub API unavailable.</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Retry
            </button>
          </div>
        ) : repos.length === 0 ? (
          <p className="text-xs text-zinc-600">No repos found.</p>
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={repo.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col gap-2"
            >
              {/* Nom + étoiles */}
              <div className="flex items-center justify-between gap-2">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-white hover:underline truncate"
                >
                  {repo.name}
                </a>
                {repo.stargazers_count > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-400">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {repo.stargazers_count}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed text-zinc-500 line-clamp-2">
                {repo.description ?? "Pas de description."}
              </p>

              {/* Langage + topics */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {repo.language && (
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-zinc-400">
                    {repo.language}
                  </span>
                )}
                {repo.topics.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full border border-white/8 px-2.5 py-0.5 text-[11px] text-zinc-500">
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Dots de pagination */}
      {repos.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {repos.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === index ? "20px" : "6px",
                backgroundColor: i === index ? "#DE3E4A" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      )}

      {/* Lien vers le profil */}
      <a
        href="https://github.com/quentiinct"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
        github.com/quentiinct
      </a>
    </BentoCard>
  );
}

// ─── WIP CARD ─────────────────────────────────────────────────

// Bande coulissante — backgroundPositionX animé en JS, sans reset CSS
// Gradient period = 14px (dernier stop), X-period = 14 / sin(110°) ≈ 14.90px
const STRIPE_PERIOD = 14 / Math.sin(110 * Math.PI / 180);

function AnimatedStripe({ dir, bg }: { dir: -1 | 1; bg: string }) {
  const pos = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    let v = pos.get() + dir * 40 * (delta / 1000);
    if (dir === -1) { if (v <= -STRIPE_PERIOD) v += STRIPE_PERIOD; }
    else            { if (v >=  STRIPE_PERIOD) v -= STRIPE_PERIOD; }
    pos.set(v);
  });
  const backgroundPositionX = useTransform(pos, v => `${v}px`);
  return <motion.div style={{ position: "absolute", inset: 0, backgroundImage: bg, backgroundPositionX }} />;
}

type WorkerVariant = { hat: string; vest: string; pants: string };

const WORKER_VARIANTS: WorkerVariant[] = [
  { hat: "#f59e0b", vest: "#f97316", pants: "#2563eb" },  // casque jaune, gilet orange, bleu
  { hat: "#e2e8f0", vest: "#eab308", pants: "#7c2d12" },  // casque blanc, gilet jaune, marron
  { hat: "#f97316", vest: "#16a34a", pants: "#171717" },  // casque orange, gilet vert, noir
  { hat: "#ef4444", vest: "#7c3aed", pants: "#1e3a5f" },  // casque rouge, gilet violet, marine
];

function PixelWorker({ variant, duration, delay }: { variant: WorkerVariant; duration: number; delay: number }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => 1 - f), 260);
    return () => clearInterval(id);
  }, []);

  const P = 2;
  const C: Record<string, string | null> = {
    H: variant.hat, S: "#fcd34d", e: "#292524",
    V: variant.vest, P: variant.pants, b: "#1c1917", ".": null,
  };

  const FRAMES = [
    ["..HH...", ".HHHH..", ".SSSS..", ".SeS...", ".VVVV..", "VVVVVVV", ".VVVV..", "..PP...", ".P..P..", ".P..P..", "bb..bb."],
    ["..HH...", ".HHHH..", ".SSSS..", ".SeS...", ".VVVV..", "VVVVVVV", ".VVVV..", "..PP...", "..PP...", ".P..P..", ".bb.bb."],
  ];

  const rects: React.ReactNode[] = [];
  FRAMES[frame].forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const color = C[ch];
      if (color) rects.push(<rect key={`${r}-${c}`} x={c * P} y={r * P} width={P} height={P} fill={color} />);
    })
  );

  return (
    <div style={{ position: "absolute", bottom: 8, left: 0, animation: `walk-worker ${duration}s linear ${delay}s infinite`, zIndex: 2 }}>
      <svg viewBox={`0 0 ${7 * P} ${11 * P}`} width={7 * P} height={11 * P} style={{ imageRendering: "pixelated", display: "block" }}>
        {rects}
      </svg>
    </div>
  );
}

function ConstructionScene() {
  const A = "#f59e0b";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Grue — coin droit */}
      <svg viewBox="0 0 60 82" width={54} height={74} aria-hidden
        style={{ position: "absolute", right: 6, bottom: 8, opacity: 0.18, imageRendering: "pixelated" }}>
        <rect x={27} y={14} width={4} height={60} fill={A} />
        <rect x={4} y={14} width={52} height={4} fill={A} />
        <line x1={29} y1={34} x2={46} y2={14} stroke={A} strokeWidth={2.5} />
        <rect x={0} y={18} width={10} height={6} fill={A} />
        <motion.g
          style={{ transformOrigin: "47px 18px" } as React.CSSProperties}
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity }}
        >
          <rect x={45} y={18} width={2} height={26} fill={A} />
          <rect x={41} y={44} width={8} height={3} fill={A} />
          <rect x={44} y={47} width={2} height={5} fill={A} />
        </motion.g>
        <rect x={22} y={74} width={14} height={4} fill={A} />
      </svg>

      {/* Tractopelle — coin gauche */}
      <svg viewBox="0 0 72 52" width={64} height={46} aria-hidden
        style={{ position: "absolute", left: 10, bottom: 8, opacity: 0.15, imageRendering: "pixelated" }}>
        <rect x={2} y={38} width={58} height={10} rx={3} fill={A} />
        <rect x={6} y={40} width={50} height={6} rx={2} fill="#1a1a1a" />
        <circle cx={14} cy={43} r={3} fill={A} />
        <circle cx={30} cy={43} r={3} fill={A} />
        <circle cx={46} cy={43} r={3} fill={A} />
        <rect x={6} y={22} width={48} height={18} rx={2} fill={A} />
        <rect x={12} y={10} width={26} height={14} rx={1} fill={A} />
        <rect x={16} y={13} width={10} height={8} fill="#1a1a1a" />
        <motion.g
          style={{ transformOrigin: "54px 22px" } as React.CSSProperties}
          animate={{ rotate: [-16, 2, -16] }}
          transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
        >
          <rect x={52} y={12} width={5} height={22} rx={1} fill={A} />
          <rect x={50} y={32} width={13} height={8} rx={1} fill={A} />
          <rect x={50} y={38} width={15} height={3} fill={A} />
        </motion.g>
      </svg>

      {/* Cônes */}
      <svg viewBox="0 0 14 18" width={11} height={14} aria-hidden
        style={{ position: "absolute", left: 88, bottom: 8, opacity: 0.22 }}>
        <polygon points="7,0 13,13 1,13" fill={A} />
        <rect x={0} y={13} width={14} height={4} rx={1} fill={A} />
      </svg>
      <svg viewBox="0 0 14 18" width={9} height={12} aria-hidden
        style={{ position: "absolute", right: 74, bottom: 8, opacity: 0.18 }}>
        <polygon points="7,0 13,13 1,13" fill={A} />
        <rect x={0} y={13} width={14} height={4} rx={1} fill={A} />
      </svg>

      {/* Ligne de sol */}
      <div style={{ position: "absolute", bottom: 7, left: 0, right: 0, height: 1, backgroundColor: A, opacity: 0.10 }} />
    </div>
  );
}

function WIPCard({ project }: { project: (typeof WIP_PROJECTS)[0] }) {
  const stripes = "repeating-linear-gradient(110deg, #f59e0b 0px, #f59e0b 6px, #1a1a1a 6px, #1a1a1a 14px)";
  const x = useMotionValue(0);
  const boxShadow = useMotionValue("none");

  const handleHoverStart = async () => {
    animateEl(x, [0, 1.5, 0], { duration: 0.35, ease: "easeOut" });
    await animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0.30), 0 0 18px rgba(255,255,255,0.06)", { duration: 0.15 });
    animateEl(boxShadow, "0 0 0 1px rgba(255,255,255,0), 0 0 0px rgba(255,255,255,0)", { duration: 0.85 });
  };

  return (
    <motion.div
      variants={card}
      className={`${project.colClass} bento-card overflow-hidden rounded-2xl flex flex-col`}
      style={{ x, boxShadow }}
      onHoverStart={handleHoverStart}
    >
      <div className="h-2.5 w-full shrink-0 overflow-hidden relative">
        <AnimatedStripe dir={-1} bg={stripes} />
      </div>

      <div
        className="relative flex flex-1 flex-col justify-between p-5 pb-10"
        style={{ backgroundColor: "rgba(245,158,11,0.025)" }}
      >
        <ConstructionScene />

        <PixelWorker variant={WORKER_VARIANTS[0]} duration={9}  delay={0}  />
        <PixelWorker variant={WORKER_VARIANTS[1]} duration={14} delay={-4} />
        <PixelWorker variant={WORKER_VARIANTS[2]} duration={11} delay={-8} />
        <PixelWorker variant={WORKER_VARIANTS[3]} duration={16} delay={-2} />

        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-2">
            {project.icon}
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{project.category}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#f59e0b" }}>
              Under Construction
            </span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "#f59e0b", animation: `pulse 1.4s ease-in-out ${i * 0.22}s infinite` }} />
              ))}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap gap-2">
          {project.tags.map((tag) => <Tag key={tag} label={tag} />)}
        </div>
      </div>

      <div className="h-2.5 w-full shrink-0 overflow-hidden relative">
        <AnimatedStripe dir={1} bg={stripes} />
      </div>
    </motion.div>
  );
}

// ─── DUST EFFECT ──────────────────────────────────────────────
// Canvas de particules pixel — déclenché par /kill.
// 500 carrés colorés partent en vol depuis des positions aléatoires,
// montent puis retombent légèrement avant de s'estomper.

function DustEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = { x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string };
    const COLORS = ["#ffffff", "#ededed", "#a1a1aa", "#DE3E4A", "#71717a", "#52525b"];
    const particles: Particle[] = Array.from({ length: 500 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 5,
      vy: -(Math.random() * 4 + 0.5),
      size: [1, 1, 2, 2, 2, 3][Math.floor(Math.random() * 6)],
      opacity: Math.random() * 0.8 + 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let raf: number;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07;
        p.vx *= 0.98;
        p.opacity -= 0.006;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9998 }} />;
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
//
// Grille 12 colonnes :
//   Col 1-4  (row 1-3) : HeroCard — colonne verticale gauche (row-span-3)
//   Col 5-12 (row 1)   : YoutubeTeaserCard (8 cols)
//   Col 5-8  (row 2)   : GitHubCard        (4 cols)
//   Col 9-12 (row 2)   : ContactCard       (4 cols)
//   Col 5-8  (row 3)   : Cyber WIP         (4 cols)
//   Col 9-12 (row 3)   : AI WIP            (4 cols)
// ═══════════════════════════════════════════════════════════════

export default function Home() {
  const [killed, setKilled] = useState(false);
  const gridControls = useAnimation();

  useEffect(() => {
    gridControls.start("visible");
  }, [gridControls]);

  useEffect(() => {
    if (!killed) return;
    gridControls.start({
      opacity: 0,
      scale: 0.97,
      filter: "blur(12px)",
      y: -30,
      transition: { duration: 1.4, ease: [0.4, 0, 1, 1], delay: 0.5 },
    });
  }, [killed, gridControls]);

  return (
    <div className="min-h-screen px-4 py-10 md:px-8 lg:px-12 lg:py-16">
      {killed && <DustEffect />}
      {killed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.6 }}
          className="fixed inset-0 z-9999 flex items-center justify-center font-mono text-[11px] tracking-[0.25em]"
          style={{ color: "#DE3E4A" }}
        >
          SYSTEM TERMINATED — refresh to restore
        </motion.p>
      )}
      <motion.div
        className="mx-auto grid max-w-6xl grid-cols-12 gap-3"
        variants={container}
        initial="hidden"
        animate={gridControls}
      >
        {/* Col gauche — s'étire sur 3 rangées */}
        <HeroCard onKill={() => setKilled(true)} />

        {/* Col droite — rangée 1 */}
        <YoutubeTeaserCard />

        {/* Col droite — rangée 2 */}
        <GitHubCard />
        <ContactCard />

        {/* Col droite — rangée 3 */}
        <WIPCard project={WIP_PROJECTS[0]} />
        <WIPCard project={WIP_PROJECTS[1]} />
      </motion.div>
    </div>
  );
}
