"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CHANNELS, type Channel } from "../data";

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

// ═══════════════════════════════════════════════════════════════
// CHANNEL CARD
//
// Structure :
//   ① Nom cliquable → chaîne YouTube  (+ date de début)
//   ② Rôle
//   ③ Stats : abonnés au départ / aujourd'hui / croissance
//   ④ Thumbnail vidéo cliquable → YouTube (overlay play)
//
// Thumbnail auto-générée : img.youtube.com/vi/{videoId}/hqdefault.jpg
// Remplace "VIDEO_ID" dans data.ts par le vrai ID YouTube.
// ═══════════════════════════════════════════════════════════════

function ChannelCard({ channel }: { channel: Channel }) {
  const hasRealVideoId = channel.featuredVideo.videoId !== "VIDEO_ID";
  const thumbnailUrl = `https://img.youtube.com/vi/${channel.featuredVideo.videoId}/hqdefault.jpg`;

  return (
    <motion.div
      variants={item}
      whileHover={{ scale: 1.012, transition: { duration: 0.2 } }}
      className="rounded-2xl border border-white/5 bg-[#111111] p-5 flex flex-col gap-4"
    >
      {/* ① En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            YouTube
          </p>
          <a
            href={channel.channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 text-2xl font-semibold text-white transition-colors hover:text-zinc-300"
          >
            {channel.name}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="opacity-30 transition-opacity group-hover:opacity-70"
            >
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        </div>
        <span className="mt-1 shrink-0 text-xs text-zinc-600">
          Depuis {channel.since}
        </span>
      </div>

      {/* ② Rôle */}
      <p className="text-sm text-zinc-500">{channel.role}</p>

      {/* ③ Stats abonnés */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/3 p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">
            Au départ
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {channel.subsStart}
          </p>
          <p className="text-[10px] text-zinc-600">abonnés</p>
        </div>
        <div className="rounded-xl bg-white/3 p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">
            Aujourd&apos;hui
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {channel.subsCurrent}
          </p>
          <p className="text-[10px] font-semibold" style={{ color: "#DE3E4A" }}>
            {channel.growth}
          </p>
        </div>
      </div>

      {/*
        ④ Thumbnail vidéo cliquable
        Si videoId == "VIDEO_ID" → placeholder avec message
        Sinon → vraie thumbnail YouTube
      */}
      <button
        onClick={() => window.open(channel.featuredVideo.url, "_blank")}
        className="group relative w-full overflow-hidden rounded-xl bg-zinc-900 focus:outline-none"
        style={{ minHeight: "130px" }}
      >
        {hasRealVideoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={channel.featuredVideo.title}
            className="h-[130px] w-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-[130px] w-full items-center justify-center">
            <p className="text-[11px] text-zinc-700">
              → Renseigne le{" "}
              <code className="text-zinc-500">videoId</code> dans data.ts
            </p>
          </div>
        )}

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110"
            style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>

        {/* Titre vidéo */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <p className="truncate text-left text-xs text-zinc-300">
            {channel.featuredVideo.title}
          </p>
        </div>
      </button>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE /clients
// ═══════════════════════════════════════════════════════════════

export default function ClientsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-10 md:px-8 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-6xl">

        {/* Bouton retour */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-10"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour au portfolio
          </Link>
        </motion.div>

        {/* En-tête de page */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-10"
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            Clients YouTube
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-white">
            Montage vidéo<span style={{ color: "#DE3E4A" }}>.</span>
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-zinc-400">
            Chaînes avec lesquelles je travaille — contenu, croissance et
            direction créative.
          </p>
        </motion.div>

        {/* Grille des 3 chaînes */}
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {CHANNELS.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
