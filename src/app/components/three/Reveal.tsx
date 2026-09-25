"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Effect, EffectAttribute, EffectPass } from "postprocessing";
import * as THREE from "three";
import { intro } from "../intro";
import { scrollStore } from "../scroll/scrollStore";
import { rocketMatrix } from "./cameraPath";

// ═══════════════════════════════════════════════════════════════
// REVEAL — opening of the scene. A grid with glowing lines fades in
// over black, then the picture forms pixel by pixel from the ship
// outwards: each block lands as a flat mosaic pixel (with a flash),
// then resolves to full detail. A bright wave rides the grid at the
// front. Screen-space post pass, disabled once the reveal is over.
// ═══════════════════════════════════════════════════════════════

/** Schedule units: the grid appears on [0, 0.08], the last pixels land around 1.06. */
const END = 1.1;
const SECONDS = 2.8;
/** If the loader never hands over (it always should), start anyway this long after ready. */
const FALLBACK_START_MS = 2500;

const FRAG = /* glsl */ `
uniform float uProgress;
uniform vec2 uCenter;
uniform float uGrid;
uniform float uPx;
uniform vec3 uGlow;

const float SPREAD = 0.7;
const float JITTER = 0.18;
const float LAND = 0.1;

float revealHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

/** 0 at the ship, 1 at the farthest screen corner (aspect-correct). */
float shipDistance(vec2 pointUv) {
  vec2 far = max(uCenter, 1.0 - uCenter) * vec2(aspect, 1.0);
  return length((pointUv - uCenter) * vec2(aspect, 1.0)) / length(far);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;

  // Pixels: half a grid cell each, landing one by one (distance + jitter).
  float block = uGrid * 0.5;
  vec2 blockId = floor(px / block);
  vec2 blockUv = (blockId + 0.5) * block / resolution;
  float start = 0.08 + shipDistance(blockUv) * SPREAD + revealHash(blockId) * JITTER;
  float local = clamp((uProgress - start) / LAND, 0.0, 1.0);

  vec3 color = vec3(0.0);
  if (local > 0.0) {
    vec3 mosaic = texture2D(inputBuffer, blockUv).rgb;
    color = mix(mosaic, inputColor.rgb, smoothstep(0.45, 1.0, local));
    color += uGlow * 0.2 * (1.0 - smoothstep(0.0, 0.5, local));
  }

  // Grid lines, 1 CSS px wide.
  vec2 f = fract(px / uGrid);
  vec2 edge = min(f, 1.0 - f) * uGrid;
  float line = 1.0 - smoothstep(0.5 * uPx, 1.5 * uPx, min(edge.x, edge.y));
  vec2 cellId = floor(px / uGrid);
  float cellStart = 0.08 + shipDistance((cellId + 0.5) * uGrid / resolution) * SPREAD;
  float wave = exp(-pow((uProgress - cellStart - 0.05) / 0.06, 2.0));
  float pending = 1.0 - smoothstep(cellStart, cellStart + 0.25, uProgress);
  float gridIn = smoothstep(0.0, 0.08, uProgress);
  float gridOut = 1.0 - smoothstep(0.95, ${END.toFixed(2)}, uProgress);
  color += uGlow * line * gridIn * gridOut * (0.22 * pending + 1.15 * wave);

  outputColor = vec4(color, inputColor.a);
}
`;

class RevealEffect extends Effect {
  constructor() {
    super("RevealEffect", FRAG, {
      // Samples the input at other pixels (mosaic), so it can't be merged with other effects.
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ["uProgress", new THREE.Uniform(0)],
        ["uCenter", new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ["uGrid", new THREE.Uniform(48)],
        ["uPx", new THREE.Uniform(1)],
        // Ice white, above the bloom threshold at the wave.
        ["uGlow", new THREE.Uniform(new THREE.Color(0.75, 0.9, 1.35))],
      ]),
    });
  }
}

/** The reveal pass, to be placed before bloom so the grid glows. */
export function useRevealPass() {
  const camera = useThree((s) => s.camera);
  const effect = useMemo(() => new RevealEffect(), []);
  const pass = useMemo(() => new EffectPass(camera, effect), [camera, effect]);
  useEffect(
    () => () => {
      pass.dispose();
      effect.dispose();
    },
    [pass, effect]
  );
  return { pass, effect };
}

/** Drives the reveal: timing, origin on the ship, grid size; hides the HTML layer until the ship has formed. */
export function RevealDriver({ pass, effect }: { pass: EffectPass; effect: Effect }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const reduce = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const readyAt = useRef(0);
  const ship = useRef(new THREE.Vector3());

  useEffect(() => {
    const root = document.documentElement;
    if (!reduce) root.setAttribute("data-intro", "");
    return () => root.removeAttribute("data-intro");
  }, [reduce]);

  useFrame(() => {
    if (!pass.enabled) return;
    const u = effect.uniforms;

    if (!readyAt.current && scrollStore.get().ready) readyAt.current = performance.now();
    if (readyAt.current && performance.now() - readyAt.current > FALLBACK_START_MS) intro.begin();

    const started = intro.startedAt();
    const progress = reduce ? END : started ? ((performance.now() - started) / 1000 / SECONDS) * END : 0;
    u.get("uProgress")!.value = progress;

    // Origin: the middle of the ship, as framed right now.
    const p = ship.current.set(0, 4, 0).applyMatrix4(rocketMatrix).project(camera);
    (u.get("uCenter")!.value as THREE.Vector2).set(
      THREE.MathUtils.clamp(p.x * 0.5 + 0.5, 0.05, 0.95),
      THREE.MathUtils.clamp(p.y * 0.5 + 0.5, 0.05, 0.95)
    );
    const dpr = gl.getPixelRatio();
    u.get("uGrid")!.value = (size.width < 820 ? 26 : 32) * dpr;
    u.get("uPx")!.value = dpr;

    // The HTML layer arrives as the last pixels land.
    if (progress > 0.82) document.documentElement.removeAttribute("data-intro");
    if (progress >= END) pass.enabled = false;
  });

  return null;
}
