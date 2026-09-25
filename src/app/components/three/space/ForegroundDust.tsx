"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32, smoothstep } from "../config";
import { cameraState } from "../CameraRig";
import { SUN_DIR } from "./Planet";

// ═══════════════════════════════════════════════════════════════
// FOREGROUND DUST — floating specks close to the camera, wrapped in a
// box that follows it. A depth-of-field model turns the nearest ones
// into large soft bokeh discs while mid-range ones stay crisp, which
// gives the open-space shots real depth. Sunlight catches them more
// when looking toward the sun (forward scattering). Faded out before
// the camera boards the ship.
// ═══════════════════════════════════════════════════════════════

const BOX = 18;

const vertex = /* glsl */ `
attribute float aSeed;
attribute vec3 aDrift;
uniform vec3 uCam;
uniform float uTime;
uniform float uPixelRatio;
uniform float uOpacity;
uniform float uFocus;
uniform vec3 uSunDir;
varying float vAlpha;
varying float vCoc;
varying float vWarm;

void main() {
  // Lazy zero-g drift, each speck on its own slow orbit.
  float t = uTime * (0.08 + aSeed * 0.12) + aSeed * 40.0;
  vec3 p = position + aDrift * vec3(sin(t), sin(t * 0.83 + 1.7), cos(t * 0.71)) * 0.9;
  vec3 rel = mod(p - uCam, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)};
  vec3 world = uCam + rel;
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = max(-mv.z, 0.01);
  // Circle of confusion: 0 in focus, 1 fully blurred.
  float coc = clamp(abs(depth - uFocus) / (depth + 0.6) * 1.15, 0.0, 1.0);
  vCoc = coc;

  vec3 viewDir = normalize(world - cameraPosition);
  float forward = pow(max(dot(viewDir, uSunDir), 0.0), 3.0);
  float glint = 0.9 + 1.1 * forward + 0.6 * step(0.93, aSeed);

  float d = length(rel);
  float edges = smoothstep(${(BOX / 2).toFixed(1)}, ${(BOX / 2 - 3).toFixed(1)}, d) * smoothstep(0.9, 2.2, depth);
  vAlpha = uOpacity * edges * glint * (0.4 + 0.7 * aSeed) / (1.0 + coc * coc * 3.0);
  vWarm = fract(aSeed * 13.7);

  float px = (1.2 + aSeed * 1.5) * (1.0 + coc * 2.2);
  gl_PointSize = min(px * 50.0 / depth, 24.0) * uPixelRatio;
}
`;

const fragment = /* glsl */ `
varying float vAlpha;
varying float vCoc;
varying float vWarm;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  if (r > 1.0) discard;
  // Crisp speck when in focus, soft disc with a faint brighter rim when blurred.
  float sharp = exp(-r * r * 9.0);
  float disc = smoothstep(1.0, 0.62, r) * (0.82 + 0.18 * smoothstep(0.5, 0.95, r));
  float shape = mix(sharp, disc * 0.5, smoothstep(0.08, 0.5, vCoc));
  float a = shape * vAlpha;
  if (a < 0.003) discard;
  vec3 col = mix(vec3(0.78, 0.86, 1.0), vec3(1.0, 0.9, 0.76), vWarm);
  gl_FragColor = vec4(col * a, a);
}
`;

export default function ForegroundDust({ count = 1800 }: { count?: number }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const camera = useThree((s) => s.camera);

  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(77);
    const pos = new Float32Array(count * 3);
    const drift = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([rng() * BOX, rng() * BOX, rng() * BOX], i * 3);
      drift.set([rng() - 0.5, rng() - 0.5, rng() - 0.5], i * 3);
      seeds[i] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aDrift", new THREE.BufferAttribute(drift, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uCam: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uOpacity: { value: 1 },
        uFocus: { value: 9 },
        uSunDir: { value: SUN_DIR },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, [count]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((state) => {
    const t = cameraState.t;
    const u = material.uniforms;
    u.uCam.value.copy(camera.position);
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = dpr;
    // Gone before the airlock: nothing floats inside the hull.
    u.uOpacity.value = 1 - smoothstep(0.95, 1.3, t);
    // Focus pulls in as the ship gets closer, so the dust stays out of focus in front of it.
    u.uFocus.value = THREE.MathUtils.lerp(9, 4.5, smoothstep(0.3, 1.0, t));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
