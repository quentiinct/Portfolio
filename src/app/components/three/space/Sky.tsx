"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLSL_HASH, GLSL_SIMPLEX } from "../glsl";
import { mulberry32 } from "../config";

// ═══════════════════════════════════════════════════════════════
// SKY — Milky Way band + faint nebulae, rendered ONCE into a cube map
// used as scene.background (zero per-frame cost), plus a live star
// field (twinkling points) that stays centred on the camera.
// ═══════════════════════════════════════════════════════════════

export const GALACTIC_NORMAL = new THREE.Vector3(0.615, 0.706, -0.353).normalize();
const GALACTIC_CENTER = new THREE.Vector3(-0.72, -0.35, -0.6).projectOnPlane(GALACTIC_NORMAL).normalize();

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragment = /* glsl */ `
${GLSL_HASH}
${GLSL_SIMPLEX}
uniform vec3 uGalNormal;
uniform vec3 uGalCenter;
uniform vec3 uNebA;
uniform vec3 uNebB;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float b = dot(d, uGalNormal);
  vec3 inPlane = normalize(d - uGalNormal * b);
  float toCenter = max(dot(inPlane, uGalCenter), 0.0);

  float n1 = fbm(d * 2.2, 5);
  float n2 = fbm(d * 5.5 + 3.1, 5);
  float warp = fbm(d * 3.0 + n1 * 1.4, 4);

  // Galactic disc: narrow bright core + wide faint halo, brighter toward the bulge.
  float width = 0.012 + 0.018 * (0.5 + 0.5 * n1);
  float core = exp(-b * b / width);
  float halo = exp(-b * b / 0.11);
  float bulge = pow(toCenter, 4.0) * exp(-b * b / 0.05);

  vec3 col = vec3(0.0);
  col += vec3(0.42, 0.5, 0.78) * halo * (0.010 + 0.010 * n2);
  col += vec3(0.92, 0.84, 0.74) * core * (0.028 + 0.05 * toCenter) * (0.55 + 0.9 * max(n2 + 0.3, 0.0));
  col += vec3(1.0, 0.82, 0.62) * bulge * 0.09 * (0.7 + 0.6 * n1);

  // Dark dust lanes cutting through the disc.
  float dust = smoothstep(-0.05, 0.35, warp) * exp(-b * b / 0.006);
  col *= 1.0 - dust * 0.8;

  // Two faint emission nebulae.
  float na = pow(max(dot(d, uNebA), 0.0), 10.0) * smoothstep(-0.2, 0.6, fbm(d * 4.0 + 7.0, 5));
  float nb = pow(max(dot(d, uNebB), 0.0), 7.0) * smoothstep(-0.1, 0.7, fbm(d * 3.2 + 11.0, 5));
  col += vec3(0.7, 0.18, 0.32) * na * 0.05;
  col += vec3(0.1, 0.42, 0.7) * nb * 0.1;

  // Unresolved background stars.
  vec3 cell = floor(d * 380.0);
  float s = hash13(cell);
  col += vec3(0.8, 0.85, 1.0) * step(0.9965, s) * 0.09 * (0.3 + halo);

  // Dither to avoid banding in the dark gradients.
  col += (hash13(d * 911.0) - 0.5) / 255.0;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

function SkyBackground() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const size = window.innerWidth < 768 ? 512 : 1024;
    const target = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
    const cubeCamera = new THREE.CubeCamera(1, 100, target);
    const skyScene = new THREE.Scene();
    const material = new THREE.ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uGalNormal: { value: GALACTIC_NORMAL },
        uGalCenter: { value: GALACTIC_CENTER },
        uNebA: { value: new THREE.Vector3(-0.55, 0.1, -0.83).normalize() },
        uNebB: { value: new THREE.Vector3(0.7, -0.45, -0.55).normalize() },
      },
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), material);
    skyScene.add(sphere);
    cubeCamera.update(gl, skyScene);
    scene.background = target.texture;
    scene.backgroundIntensity = 1;

    return () => {
      scene.background = null;
      target.dispose();
      material.dispose();
      sphere.geometry.dispose();
    };
  }, [gl, scene]);

  return null;
}

// ─── Stars ────────────────────────────────────────────────────

const starVertex = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;
uniform float uTime;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vTwinkle = 0.78 + 0.22 * sin(uTime * (0.7 + aPhase * 2.1) + aPhase * 40.0);
  vColor = aColor;
  gl_PointSize = aSize * uPixelRatio;
}
`;

const starFragment = /* glsl */ `
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d2 = dot(c, c);
  float core = exp(-d2 * 90.0);
  float halo = exp(-d2 * 16.0) * 0.18;
  // Faint diffraction cross on the brightest stars.
  float spikes = (exp(-abs(c.x) * 60.0) * exp(-abs(c.y) * 7.0) + exp(-abs(c.y) * 60.0) * exp(-abs(c.x) * 7.0)) * 0.22;
  float a = (core + halo + spikes * step(1.2, max(vColor.r, vColor.b))) * vTwinkle;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;

function Stars({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const camera = useThree((s) => s.camera);
  const dpr = useThree((s) => s.viewport.dpr);

  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(7);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const v = new THREE.Vector3();
    const tangentA = new THREE.Vector3(1, 0, 0).projectOnPlane(GALACTIC_NORMAL).normalize();
    const tangentB = new THREE.Vector3().crossVectors(GALACTIC_NORMAL, tangentA);
    const palette = [
      [0.72, 0.8, 1.0],
      [0.86, 0.9, 1.0],
      [1.0, 1.0, 1.0],
      [1.0, 0.95, 0.86],
      [1.0, 0.84, 0.66],
      [1.0, 0.72, 0.52],
    ];
    const gauss = () => {
      const u = Math.max(1e-6, rng());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
    };
    for (let i = 0; i < count; i++) {
      if (rng() < 0.45) {
        // Concentrated along the galactic plane.
        const a = rng() * Math.PI * 2;
        v.copy(tangentA).multiplyScalar(Math.cos(a)).addScaledVector(tangentB, Math.sin(a)).addScaledVector(GALACTIC_NORMAL, gauss() * 0.12);
      } else {
        v.set(gauss(), gauss(), gauss());
      }
      v.normalize().multiplyScalar(1800);
      positions.set([v.x, v.y, v.z], i * 3);
      const mag = Math.pow(rng(), 7);
      sizes[i] = 1.1 + mag * 6.5;
      const c = palette[Math.floor(rng() * palette.length)];
      const intensity = 0.35 + mag * 2.6 + rng() * 0.25;
      colors.set([c[0] * intensity, c[1] * intensity, c[2] * intensity], i * 3);
      phases[i] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
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
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPixelRatio.value = dpr;
    ref.current?.position.copy(camera.position);
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={-10} />;
}

export default function Sky({ starCount = 7000 }: { starCount?: number }) {
  return (
    <>
      <SkyBackground />
      <Stars count={starCount} />
    </>
  );
}
