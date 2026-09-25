"use client";

import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import DeckShell from "./DeckShell";
import { AboutDeck, ContactDeck, ProjectsDeck, SecurityDeck } from "./decks";
import { DECK_FLOORS, smoothstep } from "../config";
import { cameraState } from "../CameraRig";

// ═══════════════════════════════════════════════════════════════
// INTERIOR — the four decks stacked inside the hull, a light rig that
// follows the camera from deck to deck (constant light count = no
// shader recompiles), and visibility culling of far-away decks.
// ═══════════════════════════════════════════════════════════════

type LightCfg = { pos: [number, number, number]; color: string; intensity: number };
const RIG: LightCfg[][] = [
  [
    { pos: [0, 3.1, 0], color: "#ffdcb3", intensity: 24 },
    { pos: [2.3, 1.3, 1.25], color: "#5fd4ff", intensity: 7 },
    { pos: [1.4, 2.4, 2.4], color: "#ffb45e", intensity: 5 },
  ],
  [
    { pos: [0, 3.1, 0], color: "#9fb6e6", intensity: 8 },
    { pos: [0.9, 2.2, -3.0], color: "#ff2a3c", intensity: 16 },
    { pos: [1.69, 1.4, -1.41], color: "#3dffb5", intensity: 8 },
  ],
  [
    { pos: [0, 3.1, 0], color: "#e6efff", intensity: 20 },
    { pos: [-0.2, 1.5, 2.25], color: "#4d9dff", intensity: 10 },
    { pos: [-1.2, 2.3, 1.2], color: "#9a7bff", intensity: 6 },
  ],
  [
    { pos: [0, 3.1, 0], color: "#ffe2c4", intensity: 18 },
    { pos: [1.41, 1.65, 1.69], color: "#ff8a3d", intensity: 13 },
    { pos: [3.0, 1.4, 0], color: "#7fb0ff", intensity: 4 },
  ],
];

/** Continuous deck index (0 → 3) following the camera through the descents. */
export function deckFloat(t: number) {
  if (t < 2) return 0;
  if (t >= 5) return 3;
  const c = t - 2;
  const d = Math.floor(c);
  return d + smoothstep(0.6, 0.95, c - d);
}

function DeckLights() {
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const colors = useMemo(() => RIG.map((deck) => deck.map((l) => new THREE.Color(l.color))), []);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Color() }), []);

  useFrame(() => {
    const df = deckFloat(cameraState.t);
    const d0 = Math.min(3, Math.floor(df));
    const d1 = Math.min(3, d0 + 1);
    const k = df - d0;
    lights.current.forEach((light, i) => {
      if (!light) return;
      const A = RIG[d0][i];
      const B = RIG[d1][i];
      tmp.a.set(A.pos[0], A.pos[1] + DECK_FLOORS[d0], A.pos[2]);
      tmp.b.set(B.pos[0], B.pos[1] + DECK_FLOORS[d1], B.pos[2]);
      light.position.lerpVectors(tmp.a, tmp.b, k);
      light.color.copy(colors[d0][i]).lerp(colors[d1][i], k);
      light.intensity = THREE.MathUtils.lerp(A.intensity, B.intensity, k);
    });
  });

  return (
    <>
      {[0, 1, 2].map((i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lights.current[i] = el;
          }}
          distance={9}
          decay={2}
        />
      ))}
    </>
  );
}

const CONTENT = [AboutDeck, SecurityDeck, ProjectsDeck, ContactDeck];

export default function Interior() {
  const shells = useRef<(THREE.Group | null)[]>([]);
  const contents = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    const t = cameraState.t;
    const df = deckFloat(t);
    DECK_FLOORS.forEach((_, i) => {
      const near = Math.abs(df - i) < 1.35;
      const shell = shells.current[i];
      const content = contents.current[i];
      // From outside, every deck is visible through the portholes.
      if (shell) shell.visible = t < 1.9 || near;
      if (content) content.visible = (t > 0.7 && i === 0) || (t >= 1.9 && near);
    });
  });

  return (
    <group>
      <DeckLights />
      {DECK_FLOORS.map((y, i) => {
        const Content = CONTENT[i];
        return (
          <group key={i} position={[0, y, 0]}>
            <group
              ref={(el) => {
                shells.current[i] = el;
              }}
            >
              <DeckShell index={i} />
            </group>
            <group
              ref={(el) => {
                contents.current[i] = el;
              }}
            >
              <Suspense fallback={null}>
                <Content />
              </Suspense>
            </group>
          </group>
        );
      })}
    </group>
  );
}
