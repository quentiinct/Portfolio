"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { scrollStore } from "../scroll/scrollStore";

// three.js only runs in the browser: keep it out of the server bundle.
const Experience = dynamic(() => import("./Experience"), { ssr: false });

/** If the 3D chunk fails to download (flaky network), show the static sky and unlock the page. */
class ChunkBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    scrollStore.setReady();
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="experience" aria-hidden>
          <div className="webgl-fallback" />
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ExperienceLoader() {
  return (
    <ChunkBoundary>
      <Experience />
    </ChunkBoundary>
  );
}
