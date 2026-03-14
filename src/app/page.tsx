"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { CHANNELS } from "./data";

// ═══════════════════════════════════════════════════════════════
// DONNÉES LOCALES
// ═══════════════════════════════════════════════════════════════

const WIP_PROJECTS = [
  {
    id: "cyber",
    category: "Cybersécurité",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <rect x="9" y="11" width="6" height="5" rx="1" />
        <path d="M12 11V9a2 2 0 0 1 2-2" />
      </svg>
    ),
    description: "CTF, pentest & projets de sécurité — prochainement.",
    tags: ["CTF", "Pentest", "Kali Linux", "OSCP"],
    colClass: "col-span-12 md:col-span-4",
  },
  {
    id: "ai",
    category: "Intelligence Artificielle",
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
    description: "Automatisation, LLMs & projets IA — prochainement.",
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

function BentoCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={card}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
      className={`bento-card rounded-2xl p-5 ${className}`}
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

function WIPBadge() {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: "rgba(222,62,74,0.12)", color: "#DE3E4A" }}
    >
      WIP
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════

// ─── HERO ─────────────────────────────────────────────────────
// Memoji : idle.png affiché par défaut, wink.gif swappé au hover.
// Le changement de `gifKey` force React à re-monter le <img>,
// ce qui redémarre le GIF depuis le début à chaque entrée de souris.
function HeroCard() {
  const [hovered, setHovered] = useState(false);
  const [gifKey, setGifKey] = useState(0);

  return (
    <BentoCard className="col-span-12 flex flex-col md:col-span-4 md:row-span-3 md:h-full">
      <div>
        <SectionLabel text="Portfolio" />
        <h1 className="mb-4 text-5xl font-semibold tracking-tight text-white">
          Quentin<span style={{ color: "#DE3E4A" }}>.</span>
        </h1>
        <p className="text-[15px] leading-relaxed text-zinc-400">
          I build tools, agents, and systems •
          focused on AI and cybersecurity.
          I want the logic to hold and the code to be clean. Not done until both are right.
        </p>
      </div>

      {/* Memoji — centré, occupe l'espace vertical libre.
          Hover : redémarre le GIF depuis le début via changement de key + scale.
          Pour l'état idle, pose frame-01.png dans public/memoji/ ;
          en attendant, le GIF tourne en boucle. */}
      <div
        className="flex flex-1 cursor-pointer items-center justify-center py-4"
        onMouseEnter={() => { setHovered(true); setGifKey((k) => k + 1); }}
        onMouseLeave={() => setHovered(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={hovered ? gifKey : "idle"}
          src={hovered ? "/memoji/memogif.gif" : "/memoji/frame-01.PNG"}
          alt="Memoji Quentin"
          className="w-40 select-none rounded-2xl drop-shadow-2xl transition-transform duration-300"
          style={{ transform: hovered ? "scale(1.08)" : "scale(1)" }}
          draggable={false}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {["Montage Vidéo", "Développement", "Cybersécurité", "IA"].map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400"
          >
            {tag}
          </span>
        ))}
      </div>
    </BentoCard>
  );
}

// ─── CONTACT ──────────────────────────────────────────────────
function ContactCard() {
  return (
    <BentoCard className="col-span-12 flex flex-col justify-between md:col-span-4">
      <SectionLabel text="Contact" />
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-500">Disponible pour vos projets.</p>
        <a
          href="mailto:quentincourtade33@gmail.com"
          className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all hover:brightness-110"
          style={{
            borderColor: "rgba(222,62,74,0.25)",
            backgroundColor: "rgba(222,62,74,0.08)",
            color: "#DE3E4A",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          Me contacter
        </a>
      </div>
    </BentoCard>
  );
}

// ─── YOUTUBE TEASER ───────────────────────────────────────────
function YoutubeTeaserCard() {
  return (
    <motion.div
      variants={card}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
      className="col-span-12 md:col-span-8"
    >
      <Link href="/clients" className="block">
        <div className="bento-card rounded-2xl p-5 cursor-pointer">
          <div className="flex items-center justify-between mb-5">
            <div>
              <SectionLabel text="Clients YouTube" />
              <p className="text-lg font-semibold text-white">Montage vidéo freelance</p>
              <p className="text-sm text-zinc-500 mt-1">
                3 chaînes accompagnées — croissance, contenu & direction créative
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/8 text-zinc-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {CHANNELS.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between rounded-xl bg-white/3 px-4 py-3"
              >
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
            ))}
          </div>
        </div>
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
  const [direction, setDirection] = useState(0); // -1 = prev, 1 = next

  useEffect(() => {
    fetch("https://api.github.com/users/quentiinct/repos?sort=updated&per_page=20")
      .then((r) => r.json())
      .then((data: Repo[]) => {
        // Filtre les forks, trie par étoiles décroissantes
        const filtered = data
          .filter((r) => !("fork" in r && (r as unknown as { fork: boolean }).fork))
          .sort((a, b) => b.stargazers_count - a.stargazers_count);
        setRepos(filtered);
      })
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

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
          // Skeleton de chargement
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-white/5" />
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
          </div>
        ) : repos.length === 0 ? (
          <p className="text-sm text-zinc-600">Aucun repo trouvé.</p>
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
function WIPCard({ project }: { project: (typeof WIP_PROJECTS)[0] }) {
  return (
    <BentoCard className={`${project.colClass} flex min-h-40 flex-col justify-between`}>
      <div>
        <div className="mb-2 flex items-center gap-2">
          {project.icon}
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            {project.category}
          </p>
          <WIPBadge />
        </div>
        <p className="text-sm text-zinc-600">{project.description}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <Tag key={tag} label={tag} />
        ))}
      </div>
    </BentoCard>
  );
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
  return (
    <div className="min-h-screen px-4 py-10 md:px-8 lg:px-12 lg:py-16">
      <motion.div
        className="mx-auto grid max-w-6xl grid-cols-12 gap-3"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Col gauche — s'étire sur 3 rangées */}
        <HeroCard />

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
