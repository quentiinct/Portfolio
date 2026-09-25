"use client";

import { useSyncExternalStore } from "react";
import { GITHUB_USER } from "../data";

// ═══════════════════════════════════════════════════════════════
// GITHUB REPOS — public API, no key needed (60 req/h per IP), cached
// 5 min in localStorage. Shared by the HTML panel and the 3D screens.
// ═══════════════════════════════════════════════════════════════

export type Repo = {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  fork: boolean;
  pushed_at: string;
};

/** "rate": GitHub's anonymous limit (60 req/h per IP) is used up; "network": anything else. */
export type RepoError = "rate" | "network";

type State = { status: "idle" | "loading" | "ok" | "error"; repos: Repo[]; error?: RepoError };

const CACHE_KEY = "gh_repos_cache_v3";
const CACHE_TTL = 5 * 60 * 1000;

let state: State = { status: "idle", repos: [] };

/** Projects only: no forks, no profile README repo (named after the account), no .github. */
function isProject(repo: Repo) {
  const name = repo.name.toLowerCase();
  return !repo.fork && name !== GITHUB_USER.toLowerCase() && name !== ".github";
}
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export async function loadRepos(force = false) {
  if (!force && (state.status === "loading" || state.status === "ok")) return;
  set({ status: "loading", repos: state.repos });

  if (!force) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, data } = JSON.parse(cached) as { ts: number; data: Repo[] };
        if (Date.now() - ts < CACHE_TTL) {
          set({ status: "ok", repos: data });
          return;
        }
      }
    } catch {
      /* storage unavailable or invalid JSON */
    }
  }

  try {
    const r = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=30`);
    if (r.status === 403 || r.status === 429) {
      set({ status: "error", repos: state.repos, error: "rate" });
      return;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as Repo[];
    const repos = data
      .filter(isProject)
      .sort((a, b) => b.stargazers_count - a.stargazers_count || Date.parse(b.pushed_at) - Date.parse(a.pushed_at));
    set({ status: "ok", repos });
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: repos }));
    } catch {
      /* quota */
    }
  } catch {
    set({ status: "error", repos: state.repos, error: "network" });
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => state;
const serverSnapshot: State = { status: "idle", repos: [] };

export function useRepos() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function getRepos() {
  return state;
}

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  Java: "#b07219",
  PHP: "#4F5D95",
  Jupyter: "#DA5B0B",
  "Jupyter Notebook": "#DA5B0B",
};
