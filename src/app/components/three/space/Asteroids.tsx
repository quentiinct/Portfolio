"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createNoise3D, type NoiseFunction3D } from "simplex-noise";
import { GLSL_BUMP, GLSL_SIMPLEX } from "../glsl";
import { mulberry32 } from "../config";
import { exteriorPathSamples, rocketMatrix } from "../cameraPath";
import { cameraState } from "../CameraRig";

// ═══════════════════════════════════════════════════════════════
// ASTEROIDS — procedural rocks: noise-displaced icosphere with real
// crater profiles (bowl + raised rim), baked cavity occlusion in the
// vertex colours, and fine bump noise evaluated in object space in
// the shader so the micro relief sticks to each rock as it tumbles.
// ═══════════════════════════════════════════════════════════════

type Crater = { c: THREE.Vector3; r: number; depth: number };

function smoothMin(a: number, b: number, k: number) {
  const h = Math.min(1, Math.max(0, (b - a + k) / (2 * k)));
  return a * h + b * (1 - h) - k * h * (1 - h);
}

/** Crater cross-section: flat floor, bowl, raised rim, fading ejecta. */
function craterShape(x: number) {
  const cavity = x * x - 1;
  const rimX = Math.min(x - 1.7, 0);
  const rim = 0.42 * rimX * rimX;
  const shape = -smoothMin(-cavity, 0.55, 0.3);
  return smoothMin(shape, rim, 0.3);
}

function fbm(noise: NoiseFunction3D, x: number, y: number, z: number, octaves: number) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * f, y * f, z * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

function ridged(noise: NoiseFunction3D, x: number, y: number, z: number, octaves: number) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise(x * f + 11, y * f + 7, z * f + 3));
    sum += amp * n * n;
    f *= 2.1;
    amp *= 0.5;
  }
  return sum;
}

export function makeAsteroidGeometry(seed: number, detail: number) {
  const rng = mulberry32(seed);
  const noise = createNoise3D(rng);
  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  geo = mergeVertices(geo);

  const stretch = new THREE.Vector3(0.75 + rng() * 0.45, 0.6 + rng() * 0.3, 0.8 + rng() * 0.4);
  stretch.divideScalar(Math.max(stretch.x, stretch.y, stretch.z));
  const lumpiness = 0.22 + rng() * 0.22;

  const craters: Crater[] = [];
  const craterCount = 8 + Math.floor(rng() * 14);
  for (let i = 0; i < craterCount; i++) {
    const c = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize();
    craters.push({ c, r: 0.08 + Math.pow(rng(), 2.2) * 0.5, depth: 0.22 + rng() * 0.25 });
  }

  const tone = 0.62 + rng() * 0.25;
  const warm = rng();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let h = fbm(noise, v.x * 1.1, v.y * 1.1, v.z * 1.1, 4) * lumpiness;
    h += (ridged(noise, v.x * 2.4, v.y * 2.4, v.z * 2.4, 3) - 0.35) * 0.09;

    let craterSum = 0;
    for (const cr of craters) {
      const ang = Math.acos(Math.min(1, Math.max(-1, v.dot(cr.c))));
      const x = ang / cr.r;
      if (x < 1.75) craterSum += craterShape(x) * cr.r * cr.depth;
    }
    h += craterSum;
    h += fbm(noise, v.x * 7 + 3, v.y * 7 + 1, v.z * 7 + 5, 3) * 0.035;

    const r = 1 + h;
    pos.setXYZ(i, v.x * r * stretch.x, v.y * r * stretch.y, v.z * r * stretch.z);

    // Albedo: dark rock, occluded crater floors, brighter ejecta on the rims.
    const patch = fbm(noise, v.x * 2.6 + 40, v.y * 2.6, v.z * 2.6, 3);
    const cavity = Math.max(0, -craterSum) * 3.2;
    const rimGlow = Math.max(0, craterSum) * 1.6;
    const g = Math.max(0.12, tone * (0.82 + patch * 0.35) * (1 - Math.min(0.55, cavity)) * (1 + Math.min(0.35, rimGlow)));
    colors[i * 3] = g * (1.0 + warm * 0.09);
    colors[i * 3 + 1] = g * (0.97 + warm * 0.02);
    colors[i * 3 + 2] = g * (0.93 - warm * 0.08);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** Rock material: vertex colours + object-space micro relief. */
export function makeRockMaterial(base = new THREE.Color("#5a534c")) {
  const mat = new THREE.MeshStandardMaterial({ color: base, vertexColors: true, roughness: 0.94, metalness: 0.0, envMapIntensity: 0.7 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRock;\nvarying float vRockScale;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vRock = position;
        #ifdef USE_INSTANCING
          vRockScale = length(instanceMatrix[0].xyz);
        #else
          vRockScale = 1.0;
        #endif
        vRockScale *= length(modelMatrix[0].xyz);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vRock;\nvarying float vRockScale;\n${GLSL_SIMPLEX}\n${GLSL_BUMP}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float rockN = snoise(vRock * 4.0) * 0.5 + snoise(vRock * 11.0) * 0.25;
        float speck = smoothstep(0.55, 0.9, snoise(vRock * 38.0));
        diffuseColor.rgb *= 0.85 + rockN * 0.28 + speck * 0.18;`
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        float rockH = (snoise(vRock * 9.0) * 0.012 + snoise(vRock * 23.0) * 0.006 + snoise(vRock * 57.0) * 0.0028) * vRockScale;
        normal = bumpNormalH(-vViewPosition, normal, rockH);`
      );
  };
  mat.customProgramCacheKey = () => "rock-v1";
  return mat;
}

type Instance = {
  pos: THREE.Vector3;
  scale: number;
  axis: THREE.Vector3;
  spin: number;
  phase: number;
  drift: number;
  q0: THREE.Quaternion;
};

const NEAR_GEOS = 6;
const FAR_GEOS = 3;

function useField(count: number) {
  return useMemo(() => {
    const rng = mulberry32(4242);
    const path = exteriorPathSamples(90);
    const axis = new THREE.Vector3(0, 1, 0).applyMatrix4(new THREE.Matrix4().extractRotation(rocketMatrix));
    const origin = new THREE.Vector3().setFromMatrixPosition(rocketMatrix);
    const tmp = new THREE.Vector3();
    const near: Instance[][] = Array.from({ length: NEAR_GEOS }, () => []);
    const far: Instance[][] = Array.from({ length: FAR_GEOS }, () => []);

    let placed = 0;
    let guard = 0;
    while (placed < count && guard < count * 80) {
      guard++;
      const isFar = rng() < 0.3;
      const angle = rng() * Math.PI * 2;
      const radius = isFar ? 120 + rng() * 280 : 13 + Math.pow(rng(), 1.5) * 95;
      const y = isFar ? (rng() - 0.5) * 260 : (rng() - 0.5) * 72 - 6;
      const pos = new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
      const scale = isFar ? 2.5 + Math.pow(rng(), 3) * 18 : 0.16 + Math.pow(rng(), 4.2) * 6.5;

      // Keep clear of the ship…
      tmp.subVectors(pos, origin);
      const along = tmp.dot(axis);
      const radial = tmp.addScaledVector(axis, -along).length();
      if (along > -34 && along < 36 && radial < 8.5 + scale * 1.6) continue;
      // …and of the camera flight path.
      let blocked = false;
      for (const p of path) {
        if (p.distanceTo(pos) < scale * 1.7 + 3.4) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const inst: Instance = {
        pos,
        scale,
        axis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
        spin: ((0.03 + rng() * 0.14) * (rng() < 0.5 ? -1 : 1)) / Math.sqrt(Math.max(0.6, scale)),
        phase: rng() * Math.PI * 2,
        drift: 0.2 + rng() * 0.7,
        q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 6.28, rng() * 6.28, rng() * 6.28)),
      };
      if (isFar) far[Math.floor(rng() * FAR_GEOS)].push(inst);
      else near[Math.floor(rng() * NEAR_GEOS)].push(inst);
      placed++;
    }
    return { near, far };
  }, [count]);
}

function RockSet({ groups, geometries, material }: { groups: Instance[][]; geometries: THREE.BufferGeometry[]; material: THREE.Material }) {
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), qs: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    // Once aboard, rocks are only glimpsed through portholes: update at half rate.
    if (cameraState.inside > 0.99 && state.clock.elapsedTime * 60 % 2 > 1) return;
    groups.forEach((list, gi) => {
      const mesh = meshes.current[gi];
      if (!mesh) return;
      list.forEach((a, i) => {
        tmp.qs.setFromAxisAngle(a.axis, time * a.spin + a.phase);
        tmp.q.copy(a.q0).premultiply(tmp.qs);
        tmp.p.set(
          a.pos.x + Math.sin(time * 0.05 * a.drift + a.phase) * a.drift,
          a.pos.y + Math.sin(time * 0.07 * a.drift + a.phase * 2.0) * a.drift * 0.6,
          a.pos.z + Math.cos(time * 0.04 * a.drift + a.phase) * a.drift
        );
        tmp.s.setScalar(a.scale);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        mesh.setMatrixAt(i, tmp.m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      {groups.map((list, i) => (
        <instancedMesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          args={[geometries[i], material, Math.max(1, list.length)]}
          count={list.length}
          frustumCulled={false}
        />
      ))}
    </>
  );
}

/** A few big, high-detail rocks composed around the hero shot. */
const HERO_ROCKS = [
  { pos: [13.5, -3.5, 45.5], scale: 3.4, seed: 901, axis: [0.3, 1, 0.2], spin: 0.035 },
  { pos: [-27, 13, -32], scale: 5.5, seed: 902, axis: [1, 0.4, 0.1], spin: -0.02 },
  { pos: [-11, 18, 33], scale: 1.9, seed: 903, axis: [0.2, 0.3, 1], spin: 0.06 },
  { pos: [24, 24, -14], scale: 2.6, seed: 904, axis: [0.8, 0.2, 0.5], spin: -0.045 },
] as const;

function HeroRocks({ material, detail }: { material: THREE.Material; detail: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const geometries = useMemo(() => HERO_ROCKS.map((r) => makeAsteroidGeometry(r.seed, detail)), [detail]);
  const axes = useMemo(() => HERO_ROCKS.map((r) => new THREE.Vector3(...r.axis).normalize()), []);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.quaternion.setFromAxisAngle(axes[i], time * HERO_ROCKS[i].spin + i);
      m.position.y = HERO_ROCKS[i].pos[1] + Math.sin(time * 0.08 + i) * 0.4;
    });
  });

  return (
    <>
      {HERO_ROCKS.map((r, i) => (
        <mesh
          key={r.seed}
          ref={(el) => {
            refs.current[i] = el;
          }}
          geometry={geometries[i]}
          material={material}
          position={r.pos as unknown as [number, number, number]}
          scale={r.scale}
        />
      ))}
    </>
  );
}

export default function Asteroids({ count = 190, quality = "high" }: { count?: number; quality?: "high" | "low" }) {
  const { near, far } = useField(count);
  const hi = quality === "high";

  const { nearGeos, farGeos, material } = useMemo(
    () => ({
      nearGeos: Array.from({ length: NEAR_GEOS }, (_, i) => makeAsteroidGeometry(101 + i * 17, hi ? 5 : 4)),
      farGeos: Array.from({ length: FAR_GEOS }, (_, i) => makeAsteroidGeometry(501 + i * 29, 3)),
      material: makeRockMaterial(),
    }),
    [hi]
  );

  useEffect(() => () => {
    nearGeos.forEach((g) => g.dispose());
    farGeos.forEach((g) => g.dispose());
    material.dispose();
  }, [nearGeos, farGeos, material]);

  return (
    <group>
      <RockSet groups={near} geometries={nearGeos} material={material} />
      <RockSet groups={far} geometries={farGeos} material={material} />
      <HeroRocks material={material} detail={hi ? 6 : 5} />
    </group>
  );
}
