"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Effect, EffectAttribute, EffectPass } from "postprocessing";
import * as THREE from "three";
import { intro } from "../intro";
import { scrollStore } from "../scroll/scrollStore";
import { rocketMatrix } from "./cameraPath";

// ═══════════════════════════════════════════════════════════════
// REVEAL — opening of the scene, in 3D. Each pixel's world position is
// rebuilt from the depth buffer, so the grid lives on the decor itself:
//  1. a glowing voxel lattice draws itself over the ship, the asteroids
//     and the planet (and a celestial grid on the sky), on black;
//  2. the voxels then fill in from the ship outwards, by real 3D
//     distance: each lands as a flat block with a flash, then resolves
//     to full detail, with a glow wave riding the lattice at the front.
// Post pass before bloom (so the lines glow), disabled once finished.
// ═══════════════════════════════════════════════════════════════

/** Schedule units: lattice sweep on [0.02, 0.22], voxels land on [0.24, ~1.05]. */
const END = 1.1;
const SECONDS = 3.4;
/** If the loader never hands over (it always should), start anyway this long after ready. */
const FALLBACK_START_MS = 2500;
/** Voxel edge near the camera, in world units; doubles with each octave of distance. */
const CELL = 1.6;

const FRAG = /* glsl */ `
uniform float uProgress;
uniform vec3 uOrigin;
uniform vec3 uCamPos;
uniform mat4 uProjInv;
uniform mat4 uCamWorld;
uniform mat4 uViewProj;
uniform float uCell;
uniform float uPx;
uniform vec3 uGlow;

const float LAND = 0.09;
const float SKY_STEP = 0.1309; // 7.5 degrees

float revealHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

vec3 worldAt(vec2 st, float d) {
  vec4 v = uProjInv * vec4(st * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  v /= v.w;
  return (uCamWorld * v).xyz;
}

vec2 screenOf(vec3 p) {
  vec4 c = uViewProj * vec4(p, 1.0);
  return clamp(c.xy / max(c.w, 1e-4) * 0.5 + 0.5, 0.0, 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  bool sky = depth >= 0.99999;
  vec3 wp = worldAt(uv, depth);
  vec3 dir = normalize(wp - uCamPos);

  // Derivatives first (outside any branch).
  // Surfaces: world-space voxels, coarser with distance so they stay ~40px on screen.
  float cell = uCell * exp2(floor(log2(max(distance(wp, uCamPos) / 30.0, 1.0))));
  vec3 q = wp / cell;
  vec3 wq = min(fwidth(q), vec3(0.08));
  // Sky: meridians and parallels every 7.5 degrees.
  vec2 sphere = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0))) / SKY_STEP;
  vec2 ws = min(fwidth(sphere), vec2(0.08));

  float order;   // 0 at the ship → 1 for the farthest sky
  float jitter;
  vec3 mosaic;
  float line;
  if (!sky) {
    vec3 id = floor(q);
    vec3 center = (id + 0.5) * cell;
    order = 0.8 * clamp(log(1.0 + distance(center, uOrigin) / 10.0) / 5.3, 0.0, 1.0);
    jitter = revealHash(id + cell * 0.37);
    mosaic = texture2D(inputBuffer, screenOf(center)).rgb;
    vec3 e = 0.5 - abs(fract(q) - 0.5);
    vec3 l = 1.0 - smoothstep(wq * 0.5 * uPx, wq * 1.5 * uPx, e);
    line = max(l.x, max(l.y, l.z));
  } else {
    vec2 id = floor(sphere * 2.0);
    vec2 c = (id + 0.5) * 0.5 * SKY_STEP;
    vec3 cdir = vec3(cos(c.y) * cos(c.x), sin(c.y), cos(c.y) * sin(c.x));
    float away = acos(clamp(dot(dir, normalize(uOrigin - uCamPos)), -1.0, 1.0)) / 3.14159;
    order = 0.82 + 0.18 * away;
    jitter = revealHash(vec3(id, 7.0));
    mosaic = texture2D(inputBuffer, screenOf(uCamPos + cdir * 1000.0)).rgb;
    vec2 e = 0.5 - abs(fract(sphere) - 0.5);
    vec2 l = 1.0 - smoothstep(ws * 0.5 * uPx, ws * 1.5 * uPx, e);
    line = max(l.x, l.y) * 0.6;
  }

  float wireIn = smoothstep(0.02 + order * 0.2, 0.1 + order * 0.2, uProgress);
  float start = 0.24 + order * 0.62 + jitter * 0.1;
  float local = clamp((uProgress - start) / LAND, 0.0, 1.0);

  // Before landing: black, with a faint ghost of the decor under the lattice.
  vec3 color = inputColor.rgb * 0.05 * wireIn;
  if (local > 0.0) {
    color = mix(mosaic, inputColor.rgb, smoothstep(0.45, 1.0, local));
    color += uGlow * 0.12 * (1.0 - smoothstep(0.0, 0.5, local));
  }

  float wave = exp(-pow((uProgress - start - 0.03) / 0.05, 2.0));
  float pending = 1.0 - smoothstep(start, start + 0.18, uProgress);
  float fadeOut = 1.0 - smoothstep(0.95, ${END.toFixed(2)}, uProgress);
  color += uGlow * line * wireIn * fadeOut * (0.4 * pending + 1.1 * wave);

  outputColor = vec4(color, inputColor.a);
}
`;

class RevealEffect extends Effect {
  constructor() {
    super("RevealEffect", FRAG, {
      // Reads depth (world positions) and samples the input elsewhere (voxel colours).
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["uProgress", new THREE.Uniform(0)],
        ["uOrigin", new THREE.Uniform(new THREE.Vector3())],
        ["uCamPos", new THREE.Uniform(new THREE.Vector3())],
        ["uProjInv", new THREE.Uniform(new THREE.Matrix4())],
        ["uCamWorld", new THREE.Uniform(new THREE.Matrix4())],
        ["uViewProj", new THREE.Uniform(new THREE.Matrix4())],
        ["uCell", new THREE.Uniform(CELL)],
        ["uPx", new THREE.Uniform(1)],
        // Ice white, above the bloom threshold at the wave.
        ["uGlow", new THREE.Uniform(new THREE.Color(0.75, 0.9, 1.35))],
      ]),
    });
  }
}

/** The reveal pass, to be placed before bloom so the lattice glows. */
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

/** Drives the reveal: timing, camera matrices, origin on the ship; hides the HTML layer until the ship has formed. */
export function RevealDriver({ pass, effect }: { pass: EffectPass; effect: Effect }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const reduce = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const readyAt = useRef(0);

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

    // The camera rig has already moved the camera this frame (priority -1).
    (u.get("uProjInv")!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.get("uCamWorld")!.value as THREE.Matrix4).copy(camera.matrixWorld);
    (u.get("uViewProj")!.value as THREE.Matrix4).multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    (u.get("uCamPos")!.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld);
    // Origin: the middle of the ship.
    (u.get("uOrigin")!.value as THREE.Vector3).set(0, 4, 0).applyMatrix4(rocketMatrix);
    u.get("uPx")!.value = gl.getPixelRatio();

    // The HTML layer arrives as the last voxels land.
    if (progress > 0.85) document.documentElement.removeAttribute("data-intro");
    if (progress >= END) pass.enabled = false;
  });

  return null;
}
