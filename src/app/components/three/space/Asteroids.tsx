"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mulberry32 } from "../config";
import { exteriorPathSamples, rocketMatrix } from "../cameraPath";
import { cameraState } from "../CameraRig";

// ═══════════════════════════════════════════════════════════════
// ASTEROIDS — real scanned rocks: Poly Haven's Moon Rock collection
// (photogrammetry of regolith-dusted rocks, CC0), baked from their 8K
// maps by scripts/build-asteroids.mjs. Seven scans fill the field: the
// four hero models carry 2048px maps (1024px on low-end devices), the
// three others 1024px (512px). Near rocks draw the full scan, far ones
// a simplified mesh sharing the same vertices and maps.
//
// Credit: Poly Haven. Photography: Greg Zaal, Rico Cilliers.
// Processing: Jenelle van Heerden, Dario Barresi.
// ═══════════════════════════════════════════════════════════════

const HERO_MODELS = ["moon_rock_02", "moon_rock_04", "moon_rock_06", "moon_rock_03"];
const FIELD_MODELS = ["moon_rock_01", "moon_rock_05", "moon_rock_07"];
const MODEL_COUNT = HERO_MODELS.length + FIELD_MODELS.length;

/** The scans are pale regolith (about 0.19 linear albedo): tinted down to dark asteroid rock. */
const ROCK_TINT = new THREE.Color(0.38, 0.37, 0.36);

type RockModel = { near: THREE.BufferGeometry; far: THREE.BufferGeometry; material: THREE.MeshStandardMaterial };

function useRockModels(quality: "high" | "low"): RockModel[] {
  const [hero, field] = quality === "high" ? [2048, 1024] : [1024, 512];
  const urls = [...HERO_MODELS.map((m) => `/asteroids/${hero}/${m}.glb`), ...FIELD_MODELS.map((m) => `/asteroids/${field}/${m}.glb`)];
  // Suspends until every model is loaded, so the loader covers the download.
  const gltfs = useGLTF(urls, false, false);
  return useMemo(
    () =>
      gltfs.map((gltf) => {
        const near = gltf.nodes.lod0 as THREE.Mesh;
        const far = gltf.nodes.lod1 as THREE.Mesh;
        const material = near.material as THREE.MeshStandardMaterial;
        material.color.copy(ROCK_TINT);
        material.envMapIntensity = 0.7;
        // Grazing sunlight across the rock faces: keep the relief sharp at an angle.
        for (const map of [material.map, material.normalMap]) if (map) map.anisotropy = 8;
        return { near: near.geometry, far: far.geometry, material };
      }),
    [gltfs]
  );
}

type Instance = {
  pos: THREE.Vector3;
  scale: THREE.Vector3;
  axis: THREE.Vector3;
  spin: number;
  phase: number;
  drift: number;
  q0: THREE.Quaternion;
  tone: THREE.Color;
};

function useField(count: number) {
  return useMemo(() => {
    const rng = mulberry32(4242);
    const path = exteriorPathSamples(90);
    const axis = new THREE.Vector3(0, 1, 0).applyMatrix4(new THREE.Matrix4().extractRotation(rocketMatrix));
    const origin = new THREE.Vector3().setFromMatrixPosition(rocketMatrix);
    const tmp = new THREE.Vector3();
    const near: Instance[][] = Array.from({ length: MODEL_COUNT }, () => []);
    const far: Instance[][] = Array.from({ length: MODEL_COUNT }, () => []);

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

      // Seven scans, each squashed a little differently, so no two rocks read the same.
      const stretch = new THREE.Vector3(0.8 + rng() * 0.2, 0.8 + rng() * 0.2, 0.8 + rng() * 0.2);
      const shade = 0.82 + rng() * 0.36;
      const warm = rng() * 0.08;
      const inst: Instance = {
        pos,
        scale: stretch.multiplyScalar(scale),
        axis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
        spin: ((0.03 + rng() * 0.14) * (rng() < 0.5 ? -1 : 1)) / Math.sqrt(Math.max(0.6, scale)),
        phase: rng() * Math.PI * 2,
        drift: 0.2 + rng() * 0.7,
        q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 6.28, rng() * 6.28, rng() * 6.28)),
        tone: new THREE.Color(shade * (1 + warm), shade, shade * (1 - warm)),
      };
      (isFar ? far : near)[Math.floor(rng() * MODEL_COUNT)].push(inst);
      placed++;
    }
    return { near, far };
  }, [count]);
}

function RockSet({ groups, models, lod }: { groups: Instance[][]; models: RockModel[]; lod: "near" | "far" }) {
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), qs: new THREE.Quaternion(), p: new THREE.Vector3() }), []);
  // Per-rock tone, multiplied into the scan's colour.
  const tones = useMemo(
    () =>
      groups.map((list) => {
        const colors = new Float32Array(Math.max(1, list.length) * 3);
        list.forEach((a, i) => a.tone.toArray(colors, i * 3));
        return colors;
      }),
    [groups]
  );

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
        tmp.m.compose(tmp.p, tmp.q, a.scale);
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
          args={[models[i][lod], models[i].material, Math.max(1, list.length)]}
          count={list.length}
          frustumCulled={false}
        >
          <instancedBufferAttribute attach="instanceColor" args={[tones[i], 3]} />
        </instancedMesh>
      ))}
    </>
  );
}

/** A few big rocks composed around the hero shot, one per hero model. */
const HERO_ROCKS = [
  { pos: [13.5, -3.5, 45.5], scale: 3.4, axis: [0.3, 1, 0.2], spin: 0.035 },
  { pos: [-27, 13, -32], scale: 5.5, axis: [1, 0.4, 0.1], spin: -0.02 },
  { pos: [-11, 18, 33], scale: 1.9, axis: [0.2, 0.3, 1], spin: 0.06 },
  { pos: [24, 24, -14], scale: 2.6, axis: [0.8, 0.2, 0.5], spin: -0.045 },
] as const;

function HeroRocks({ models }: { models: RockModel[] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const axes = useMemo(() => HERO_ROCKS.map((r) => new THREE.Vector3(...r.axis).normalize()), []);

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
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          geometry={models[i].near}
          material={models[i].material}
          position={r.pos as unknown as [number, number, number]}
          scale={r.scale}
        />
      ))}
    </>
  );
}

export default function Asteroids({ count = 190, quality = "high" }: { count?: number; quality?: "high" | "low" }) {
  const { near, far } = useField(count);
  const models = useRockModels(quality);

  return (
    <group>
      <RockSet groups={near} models={models} lod="near" />
      <RockSet groups={far} models={models} lod="far" />
      <HeroRocks models={models} />
    </group>
  );
}
