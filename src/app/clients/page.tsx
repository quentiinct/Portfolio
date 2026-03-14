"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CHANNELS, type Channel } from "../data";

const parseSubs = (s: string) => parseFloat(s) * (s.includes("M") ? 1_000_000 : s.includes("K") ? 1_000 : 1);

function Sparkline({ start, current, id }: { start: number; current: number; id: string }) {
  const W = 100;
  const H = 32;
  const ratio = start / current;
  const startY = ratio * H;
  const path = `M 0,${startY} C ${W * 0.4},${startY} ${W * 0.6},0 ${W},0`;
  const area = `M 0,${startY} C ${W * 0.4},${startY} ${W * 0.6},0 ${W},0 L ${W},${H} L 0,${H} Z`;
  const gradId = `csg-${id}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeOpacity="0.7" strokeLinecap="round" />
      <circle cx={W} cy={0} r="2.5" fill="#4ade80" opacity="0.9" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ═══════════════════════════════════════════════════════════════
// CHANNEL CARD
// ═══════════════════════════════════════════════════════════════

function ChannelCard({ channel }: { channel: Channel }) {
  const hasRealVideoId = channel.featuredVideo.videoId !== "VIDEO_ID";
  const thumbnailUrl = `https://img.youtube.com/vi/${channel.featuredVideo.videoId}/hqdefault.jpg`;
  const start = parseSubs(channel.subsStart);
  const current = parseSubs(channel.subsCurrent);

  return (
    <motion.div
      variants={item}
      whileHover={{ scale: 1.012, transition: { duration: 0.2 } }}
      className="bento-card rounded-2xl p-4 flex flex-col gap-3"
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-600">YouTube</p>
          <a
            href={channel.channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 text-xl font-semibold text-white transition-colors hover:text-zinc-300"
          >
            {channel.name}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className="opacity-30 transition-opacity group-hover:opacity-70">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        </div>
        <span className="shrink-0 text-xs text-zinc-600">Since {channel.since}</span>
      </div>

      {/* Rôle */}
      <p className="text-xs leading-relaxed text-zinc-500">{channel.role}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/3 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Start</p>
          <p className="mt-0.5 text-xl font-semibold text-white">{channel.subsStart}</p>
          <p className="text-[10px] text-zinc-600">Subscribers</p>
        </div>
        <div className="rounded-xl bg-white/3 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Today</p>
          <p className="mt-0.5 text-xl font-semibold text-white">{channel.subsCurrent}</p>
          <p className="text-[10px] font-semibold" style={{ color: "#DE3E4A" }}>{channel.growth}</p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="rounded-xl bg-white/3 px-3 pt-2 pb-1">
        <Sparkline start={start} current={current} id={channel.id} />
        <div className="flex justify-between text-[10px] text-zinc-700 mt-0.5">
          <span>{channel.subsStart}</span>
          <span>{channel.subsCurrent}</span>
        </div>
      </div>

      {/* Thumbnail */}
      <button
        onClick={() => window.open(channel.featuredVideo.url, "_blank")}
        className="group relative w-full overflow-hidden rounded-xl bg-zinc-900 focus:outline-none"
        style={{ minHeight: "110px" }}
      >
        {hasRealVideoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={channel.featuredVideo.title}
            className="h-28 w-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-28 w-full items-center justify-center">
            <p className="text-[11px] text-zinc-700">
              → Set <code className="text-zinc-500">videoId</code> in data.ts
            </p>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110"
            style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2.5">
          <p className="truncate text-left text-xs text-zinc-300">{channel.featuredVideo.title}</p>
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
    <div className="min-h-screen px-4 py-8 md:px-8 lg:px-12 lg:py-10">
      <div className="mx-auto max-w-6xl">

        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-7"
        >
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-600">YouTube Clients</p>
          <h2 className="text-4xl font-semibold tracking-tight text-white">
            YouTube Growth Editing<span style={{ color: "#DE3E4A" }}>.</span>
          </h2>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-zinc-400">
            Creators I work with — content, growth & creative direction.
          </p>
        </motion.div>

        {/* Grille des 3 chaînes */}
        <motion.div
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {CHANNELS.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-10 flex flex-col items-center gap-3 text-center"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Work with me</p>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
            You have a channel and want to level up the editing? Let&apos;s talk.
          </p>
          <a
            href="mailto:quentincourtade33@gmail.com"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 hover:brightness-110"
            style={{ borderColor: "rgba(222,62,74,0.3)", backgroundColor: "rgba(222,62,74,0.08)", color: "#DE3E4A" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            quentincourtade33@gmail.com
          </a>
        </motion.div>
      </div>
    </div>
  );
}
