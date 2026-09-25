"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Effect, EffectAttribute, EffectPass } from "postprocessing";
import * as THREE from "three";
import { intro } from "../intro";
import { scrollStore } from "../scroll/scrollStore";
import { rocketMatrix } from "./cameraPath";

// ═══════════════════════════════════════════════════════════════
// REVEAL — the decor's side of the opening (after igloo.inc). World
// positions are rebuilt from the depth buffer, so everything happens
// in 3D, ordered by real distance from the ship:
//  · ahead of the front, a hologram on black: glowing outlines (depth
//    and luminance edges), rim light and a faint fine mesh;
//  · at the front, voxel by voxel (a stair-stepped edge), the surface
//    lands as a white flash that settles into the real image, its
//    outlines lingering a moment.
// The sky comes last, in square blocks. Post pass before bloom,
// switched off once finished. The floating graph is IntroGraph.tsx.
// ═══════════════════════════════════════════════════════════════

/** Schedule units: fronts start at 0.2 (ship) and end ~0.91 (far sky); flashes settle by ~1.13. */
const END = 1.15;
const SECONDS = 3.8;
/** If the loader never hands over (it always should), start anyway this long after ready. */
const FALLBACK_START_MS = 2500;
/** Voxel edge near the camera, in world units: sets the stair steps of the front. */
const CELL = 0.5;

const FRAG = /* glsl */ `
uniform float uProgress;
uniform vec3 uOrigin;
uniform vec3 uCamPos;
uniform mat4 uProjInv;
uniform mat4 uCamWorld;
uniform float uCell;
uniform float uPx;
uniform vec3 uGlow;

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

float lumaOf(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float viewDepth(vec2 st) { return -getViewZ(readDepth(st)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  bool sky = depth >= 0.99999;
  vec3 wp = worldAt(uv, depth);
  vec3 toCam = uCamPos - wp;
  float dist = length(toCam);

  // Derivatives first (outside any branch).
  vec3 n = normalize(cross(dFdx(wp), dFdy(wp)));
  float rim = pow(1.0 - clamp(abs(dot(n, toCam / dist)), 0.0, 1.0), 3.0);
  float cell = uCell * exp2(floor(log2(max(dist / 30.0, 1.0))));
  vec3 q = wp / cell;
  // Fine mesh: 1px iso-lines along three directions, faded where they would alias.
  vec3 f3 = vec3(q.x, q.z, (q.x + q.y + q.z) * 0.577) * 2.0;
  vec3 w3 = fwidth(f3);
  vec3 e3 = 0.5 - abs(fract(f3) - 0.5);
  vec3 m3 = 1.0 - smoothstep(w3 * 0.5 * uPx, w3 * 1.5 * uPx, e3);
  float mesh = max(m3.x, max(m3.y, m3.z)) * (1.0 - smoothstep(0.2, 0.4, max(w3.x, max(w3.y, w3.z))));

  // Outlines: depth jumps (silhouettes, creases) and luminance edges (seams, windows, craters).
  vec2 o = texelSize * uPx;
  float dz = abs(viewDepth(uv + vec2(o.x, 0.0)) - viewDepth(uv - vec2(o.x, 0.0)))
           + abs(viewDepth(uv + vec2(0.0, o.y)) - viewDepth(uv - vec2(0.0, o.y)));
  float depthEdge = smoothstep(0.03, 0.12, dz / max(viewDepth(uv), 1e-3));
  float gx = lumaOf(texture2D(inputBuffer, uv + vec2(o.x, 0.0)).rgb) - lumaOf(texture2D(inputBuffer, uv - vec2(o.x, 0.0)).rgb);
  float gy = lumaOf(texture2D(inputBuffer, uv + vec2(0.0, o.y)).rgb) - lumaOf(texture2D(inputBuffer, uv - vec2(0.0, o.y)).rgb);
  float lumEdge = smoothstep(0.12, 0.45, length(vec2(gx, gy)) / (lumaOf(inputColor.rgb) + 0.3));
  float outline = max(depthEdge, lumEdge * 0.75);

  // When each point lands: by 3D distance from the ship, per voxel (stair-stepped front).
  float order;
  float jitter;
  if (!sky) {
    vec3 id = floor(q);
    order = 0.8 * clamp(log(1.0 + distance((id + 0.5) * cell, uOrigin) / 10.0) / 5.3, 0.0, 1.0);
    jitter = revealHash(id + cell * 0.37);
  } else {
    vec2 block = floor(uv * resolution / (16.0 * uPx));
    order = 0.82 + 0.18 * acos(clamp(dot(-toCam / dist, normalize(uOrigin - uCamPos)), -1.0, 1.0)) / 3.14159;
    jitter = revealHash(vec3(block, 7.0));
  }
  float s = uProgress - (0.2 + order * 0.66 + jitter * 0.05);

  vec3 color;
  if (s < 0.0) {
    // Ahead of the front: the hologram, on black.
    float g = smoothstep(-0.16, -0.01, s);
    color = sky ? vec3(0.0) : g * (uGlow * (outline * 1.15 + rim * 0.35 + mesh * 0.17) + inputColor.rgb * 0.06);
  } else {
    // Landed: a white flash settling into the real image; outlines linger a moment.
    // The sky just comes up from black (a white wash there reads as a grey wall).
    float settle = smoothstep(0.0, 0.17, s);
    color = sky ? inputColor.rgb * settle : mix(uGlow, inputColor.rgb, settle);
    // Not on the sky: every star would get a ring.
    if (!sky) color += uGlow * outline * 0.55 * (1.0 - smoothstep(0.08, 0.4, s));
  }
  outputColor = vec4(color, inputColor.a);
}
`;

class RevealEffect extends Effect {
  constructor() {
    super("RevealEffect", FRAG, {
      // Reads depth (world positions, outlines) and neighbouring pixels (edges).
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["uProgress", new THREE.Uniform(0)],
        ["uOrigin", new THREE.Uniform(new THREE.Vector3())],
        ["uCamPos", new THREE.Uniform(new THREE.Vector3())],
        ["uProjInv", new THREE.Uniform(new THREE.Matrix4())],
        ["uCamWorld", new THREE.Uniform(new THREE.Matrix4())],
        ["uCell", new THREE.Uniform(CELL)],
        ["uPx", new THREE.Uniform(1)],
        // Ice white: the hologram and the flash.
        ["uGlow", new THREE.Uniform(new THREE.Color(0.75, 0.9, 1.35))],
      ]),
    });
  }
}

/** The reveal pass, to be placed before bloom so the hologram glows. */
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

    const progress = reduce ? END : (intro.elapsed() / SECONDS) * END;
    u.get("uProgress")!.value = progress;

    // The camera rig has already moved the camera this frame (priority -1).
    (u.get("uProjInv")!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.get("uCamWorld")!.value as THREE.Matrix4).copy(camera.matrixWorld);
    (u.get("uCamPos")!.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld);
    // Origin: the middle of the ship.
    (u.get("uOrigin")!.value as THREE.Vector3).set(0, 4, 0).applyMatrix4(rocketMatrix);
    u.get("uPx")!.value = gl.getPixelRatio();

    // The HTML layer arrives as the last of the decor settles.
    if (progress > 0.92) document.documentElement.removeAttribute("data-intro");
    if (progress >= END) pass.enabled = false;
  });

  return null;
}
