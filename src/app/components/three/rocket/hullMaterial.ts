import * as THREE from "three";
import { GLSL_BUMP, GLSL_HASH, GLSL_SIMPLEX } from "../glsl";
import { BODY_BOTTOM, BODY_TOP, DECK_FLOORS, DOOR, DOOR_CENTER_Y, HULL_R, WINDOWS, WINDOW_R, WINDOW_Y } from "../config";

// ═══════════════════════════════════════════════════════════════
// HULL MATERIAL — stainless steel all around.
//
// Everything is computed from the object-space position (cylindrical
// coordinates), so no UVs are needed:
//  · steel rings (1.83 m) with their own tint/roughness, horizontal
//    and vertical weld seams, heat tint near the engines;
//  · real holes for the windows and the airlock (fragments discarded),
//    so the lit interior is visible through them.
// ═══════════════════════════════════════════════════════════════

const f = (n: number) => n.toFixed(5);

export type HullHole = { angle: number; y: number; a: number; b: number };

export function hullHoles(): HullHole[] {
  const holes: HullHole[] = [
    { angle: DOOR.angle, y: DOOR_CENTER_Y, a: DOOR.width / 2, b: DOOR.height / 2 },
  ];
  for (const w of WINDOWS) holes.push({ angle: w.angle, y: DECK_FLOORS[w.deck] + WINDOW_Y, a: WINDOW_R, b: 0 });
  return holes;
}

export function createHullMaterial() {
  const holes = hullHoles();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, envMapIntensity: 1.25 });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHoles = { value: holes.map((h) => new THREE.Vector4(h.angle, h.y, h.a, h.b)) };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vObj;
        uniform vec4 uHoles[${holes.length}];
        ${GLSL_HASH}
        ${GLSL_SIMPLEX}
        ${GLSL_BUMP}
        const float TAU_ = 6.28318530718;
        const float HULL_R = ${f(HULL_R)};
        const float RING_H = 1.83;`
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        float hTheta = atan(vObj.x, vObj.z);
        float hR = length(vObj.xz);
        float holeDist = 1e5;
        if (vObj.y > ${f(BODY_BOTTOM)} && vObj.y < ${f(BODY_TOP)} && hR > HULL_R - 0.25) {
          for (int i = 0; i < ${holes.length}; i++) {
            vec4 h = uHoles[i];
            float dt = mod(hTheta - h.x + PI, TAU_) - PI;
            vec2 q = vec2(dt * HULL_R, vObj.y - h.y);
            float d;
            if (h.w > 0.0) {
              vec2 e = abs(q) - vec2(h.z, h.w);
              d = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
            } else {
              d = length(q) - h.z;
            }
            if (d < 0.0) discard;
            holeDist = min(holeDist, d);
          }
        }

        // ── Stainless steel rings
        float pixelArc = max(length(fwidth(vObj.xz)), fwidth(vObj.y));
        float ringId = floor(vObj.y / RING_H);
        float rf = vObj.y / RING_H - ringId;
        float seamDistH = min(rf, 1.0 - rf) * RING_H;
        float seamH = 1.0 - smoothstep(0.004, 0.01 + fwidth(vObj.y), seamDistH);
        float ph = hash11(ringId * 3.7 + 1.3) * TAU_;
        float arcToSeam = 1e5;
        for (int k = 0; k < 3; k++) {
          float a = ph + float(k) * TAU_ / 3.0;
          arcToSeam = min(arcToSeam, abs(mod(hTheta - a + PI, TAU_) - PI) * max(hR, 0.5));
        }
        float seamV = 1.0 - smoothstep(0.004, 0.01 + length(fwidth(vObj.xz)), arcToSeam);
        float seam = max(seamH, seamV);
        float ringTint = hash11(ringId * 1.93 + 0.7);
        // Broad, soft variations only: elongated noise read as dripping streaks in the reflections.
        float streak = snoise(vec3(hTheta * HULL_R * 0.35, vObj.y * 0.2, ringId * 0.31));
        float grime = snoise(vec3(hTheta * HULL_R * 1.2, vObj.y * 1.2, 5.0));
        vec3 steel = vec3(0.6, 0.61, 0.63) * (0.9 + 0.12 * ringTint) * (0.98 + 0.02 * streak);
        float heat = smoothstep(-15.0, -24.0, vObj.y);
        steel = mix(steel, steel * vec3(1.0, 0.8, 0.58), heat * 0.55);
        steel = mix(steel, steel * vec3(0.72, 0.7, 0.86), heat * heat * 0.35);
        steel = mix(steel, vec3(0.18), seam * 0.55);
        float steelRough = 0.36 + 0.08 * hash11(ringId * 5.1) + 0.012 * grime + seam * 0.3 + heat * 0.1;
        // Seams thinner than a pixel must not perturb the normal (sparkles at a distance).
        float seamDetail = 1.0 - smoothstep(0.01, 0.03, pixelArc);

        float holeRim = 1.0 - smoothstep(0.0, 0.045, holeDist);

        // Relief: weld grooves and hole gaskets only.
        float surfH = -seam * 0.0012 * seamDetail + holeRim * 0.01;`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb = mix(steel, vec3(0.05), holeRim * 0.8);`
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(steelRough, 0.5, holeRim);`
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(1.0, 0.6, holeRim);`
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        normal = bumpNormalH(-vViewPosition, normal, surfH);`
      );
  };
  mat.customProgramCacheKey = () => "hull-v3";
  return mat;
}

/** Aft fins: the same brushed stainless steel as the hull. */
export function createFinMaterial() {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(0.56, 0.57, 0.59), metalness: 1, roughness: 0.4, envMapIntensity: 1.2 });
}
