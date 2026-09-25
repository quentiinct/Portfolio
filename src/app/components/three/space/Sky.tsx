"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useCubeTexture } from "@react-three/drei";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
// SKY — the real sky: NASA's Deep Star Maps 2020 (1.7 billion Gaia
// stars and the Milky Way), baked into six cube faces by
// scripts/build-sky.mjs with the galaxy oriented for the hero shot.
// 2048px faces (about one texel per screen pixel at 1080p), 1024px on
// low-end devices. Used as scene.background: no per-frame cost.
//
// Credit: NASA/Goddard Space Flight Center Scientific Visualization
// Studio. Gaia DR2: ESA/Gaia/DPAC.
// ═══════════════════════════════════════════════════════════════

const FACES = ["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"];

export default function Sky({ size }: { size: 1024 | 2048 }) {
  const scene = useThree((s) => s.scene);
  // Suspends until the six faces are loaded, so the loader covers the download.
  const texture = useCubeTexture(FACES, { path: `/sky/${size}/` });

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    scene.background = texture;
    // A touch above 1 so the brightest stars just catch the bloom.
    scene.backgroundIntensity = 1.15;
    return () => {
      scene.background = null;
    };
  }, [scene, texture]);

  return null;
}
