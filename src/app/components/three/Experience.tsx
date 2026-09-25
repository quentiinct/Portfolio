"use client";

import { Component, Suspense, use, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import Scene, { type Quality } from "./Scene";
import { fontsReady } from "./textures";
import { scrollStore } from "../scroll/scrollStore";

// ═══════════════════════════════════════════════════════════════
// EXPERIENCE — the fixed full-screen WebGL canvas behind the page.
// ═══════════════════════════════════════════════════════════════

function detectQuality(): Quality {
  if (typeof window === "undefined") return "high";
  const small = window.innerWidth < 820;
  const weakCpu = (navigator.hardwareConcurrency ?? 8) <= 4;
  return small || weakCpu ? "low" : "high";
}

class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    scrollStore.setReady();
  }
  render() {
    if (this.state.failed) return <div className="webgl-fallback" />;
    return this.props.children;
  }
}

/** Canvas textures are drawn with the page fonts: wait for them first. */
function FontsGate({ children }: { children: ReactNode }) {
  use(fontsReady());
  return <>{children}</>;
}

export default function Experience() {
  const [quality] = useState(detectQuality);
  const [dpr, setDpr] = useState(quality === "high" ? 1.6 : 1.1);

  return (
    <div className="experience" aria-hidden>
      <WebGLBoundary>
        <Canvas
          dpr={dpr}
          gl={{ antialias: false, powerPreference: "high-performance", stencil: false, alpha: false }}
          camera={{ fov: 38, near: 0.05, far: 6000, position: [30, 5, 60] }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color("#000000"));
          }}
        >
          <PerformanceMonitor
            onDecline={() => setDpr((d) => Math.max(0.85, d - 0.25))}
            onIncline={() => setDpr((d) => Math.min(quality === "high" ? 1.75 : 1.25, d + 0.15))}
          />
          <Suspense fallback={null}>
            <FontsGate>
              <Scene quality={quality} />
            </FontsGate>
          </Suspense>
        </Canvas>
      </WebGLBoundary>
    </div>
  );
}
