import * as THREE from "three";
import { GLSL_BUMP, GLSL_HASH, GLSL_SIMPLEX } from "../glsl";
import { BELLY_ANGLE, BODY_BOTTOM, BODY_TOP, DECK_FLOORS, DOOR, DOOR_CENTER_Y, HULL_R, WINDOWS, WINDOW_R, WINDOW_Y } from "../config";
import { rocketMatrix } from "../cameraPath";

// ═══════════════════════════════════════════════════════════════
// HULL MATERIAL — stainless steel with a ceramic heat shield.
//
// Everything is computed from the object-space position (cylindrical
// coordinates), so no UVs are needed:
//  · steel rings (1.83 m) with their own tint/roughness, horizontal
//    and vertical weld seams, heat tint near the engines, soft dents
//    where the thin sheet sits on its stringers, and scanned 4K detail
//    (ambientCG, CC0: brushing, scratches, smudges) tiled every 4 m;
//  · the windward half, between the flaps, covered in hexagonal black
//    tiles, each a shade and an angle of its own, set in dark grout;
//  · real holes for the windows and the airlock (fragments discarded),
//    so the lit interior is visible through them.
// ═══════════════════════════════════════════════════════════════

const f = (n: number) => n.toFixed(5);

/** Tiles, steel detail and helpers shared by the hull and the flaps. */
const GLSL_SHIP = /* glsl */ `
uniform sampler2D uSteel;
const float TILE_W = 0.3;
const float STEEL_TILE = 4.0;
const float BELLY = ${f(BELLY_ANGLE)};
const vec2 BELLY_DIR = vec2(${f(Math.sin(BELLY_ANGLE))}, ${f(Math.cos(BELLY_ANGLE))});

// Hexagon grid of unit width: offset from the cell centre (xy), cell id (zw).
// The centre of cell id sits at id * vec2(1.0, sqrt(3)).
vec4 hexCell(vec2 p) {
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hc.xy) : vec4(h.zw, hc.zw + 0.5);
}
// 0 at the centre of a cell, 0.5 on its edge.
float hexEdge(vec2 q) {
  q = abs(q);
  return max(dot(q, vec2(0.5, 0.8660254)), q.x);
}

// One heat-shield tile at surface coordinates p (metres). px is the size of a
// screen pixel on the surface: the grout, then the bevels, then the tilt fade
// out as a tile gets too small to show them, instead of shimmering.
void heatShield(vec2 p, float px, out vec3 color, out float rough, out float h, out vec2 id) {
  vec4 c = hexCell(p / TILE_W);
  id = c.zw;
  float e = hexEdge(c.xy);
  float r1 = hash12(id + 0.37);
  float r2 = hash12(id * 1.91 + 5.3);
  float r3 = hash12(id * 0.73 + 2.9);
  float pxu = px / TILE_W;
  float grout = smoothstep(0.488 - pxu, 0.488 + pxu, e) * (1.0 - smoothstep(0.01, 0.03, pxu));
  color = vec3(0.028, 0.029, 0.032) * (0.7 + 0.6 * r1);
  // The odd replacement tile, a shade lighter.
  color *= r2 > 0.965 ? 1.9 : 1.0;
  color = mix(color, vec3(0.012), grout);
  // Glassy black coating: a sheen that varies tile to tile, so the pattern
  // reads in the reflections even in shadow.
  rough = mix(0.22 + 0.4 * r3, 0.95, grout);
  // Tiles sit a hair out of plane, each catching the light at its own angle.
  vec2 tilt = (vec2(hash12(id + 9.1), hash12(id + 4.7)) - 0.5) * 0.03;
  float bevel = smoothstep(0.38, 0.5, e);
  h = dot(c.xy * TILE_W, tilt) * (1.0 - smoothstep(0.08, 0.2, pxu)) - 0.004 * bevel * bevel * (1.0 - smoothstep(0.03, 0.08, pxu));
}

// Scanned stainless: R brushed roughness, G smudges, B brushing grooves.
vec3 steelDetail(vec2 p) {
  return texture2D(uSteel, p / STEEL_TILE).rgb;
}
float steelDetailRough(vec3 d) {
  return (d.r - 0.47) * 0.4 + (d.g - 0.09) * 0.35;
}
float steelDetailHeight(vec3 d) {
  return (d.b - 0.58) * 0.0003;
}
`;

export type HullHole = { angle: number; y: number; a: number; b: number };

export function hullHoles(): HullHole[] {
  const holes: HullHole[] = [
    { angle: DOOR.angle, y: DOOR_CENTER_Y, a: DOOR.width / 2, b: DOOR.height / 2 },
  ];
  for (const w of WINDOWS) holes.push({ angle: w.angle, y: DECK_FLOORS[w.deck] + WINDOW_Y, a: WINDOW_R, b: 0 });
  return holes;
}

export function createHullMaterial(steelDetail: THREE.Texture) {
  const holes = hullHoles();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, envMapIntensity: 1.25 });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHoles = { value: holes.map((h) => new THREE.Vector4(h.angle, h.y, h.a, h.b)) };
    shader.uniforms.uSteel = { value: steelDetail };

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
        ${GLSL_SHIP}
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
        // Scanned detail, brushed along the rings (the wrap at θ = ±π hides under the tiles).
        vec3 detail = steelDetail(vec2(hTheta * hR, vObj.y));
        float steelRough = 0.36 + 0.08 * hash11(ringId * 5.1) + 0.012 * grime + seam * 0.3 + heat * 0.1 + steelDetailRough(detail);
        // Seams thinner than a pixel must not perturb the normal (sparkles at a distance).
        float seamDetail = 1.0 - smoothstep(0.01, 0.03, pixelArc);
        // Thin sheet over stringers: soft dents that ripple the reflections.
        float quilt = snoise(vec3(hTheta * hR * 1.4, vObj.y * 0.6, 2.0)) * 0.0035;
        float steelH = -seam * 0.0012 * seamDetail + steelDetailHeight(detail) + quilt;

        // ── Heat shield: whole tiles over the windward half. Angles are taken
        // from the belly so the grid wraps on the steel side, never on the tiles.
        float rel = mod(hTheta - BELLY + PI, TAU_) - PI;
        vec3 tileColor;
        float tileRough;
        float tileH;
        vec2 tileId;
        heatShield(vec2(rel * hR, vObj.y), pixelArc, tileColor, tileRough, tileH, tileId);
        float tiled = step(abs(tileId.x * TILE_W), 0.5 * PI * hR);

        float holeRim = 1.0 - smoothstep(0.0, 0.045, holeDist);

        // Relief: weld grooves, dents, brushing, tile bevels and hole gaskets.
        float surfH = mix(steelH, tileH, tiled) + holeRim * 0.01;`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb = mix(mix(steel, tileColor, tiled), vec3(0.05), holeRim * 0.8);`
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(steelRough, tileRough, tiled), 0.5, holeRim);`
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(1.0 - tiled, 0.6, holeRim);`
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        normal = bumpNormalH(-vViewPosition, normal, surfH);`
      );
  };
  mat.customProgramCacheKey = () => "hull-v4";
  return mat;
}

const toShip = rocketMatrix.clone().invert();

/**
 * Flaps, chines and aerocovers: the same steel, tiled on every face that
 * looks toward the belly. Works in ship space whatever the mesh transform.
 */
export function createFlapMaterial(steelDetail: THREE.Texture) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.4, envMapIntensity: 1.2 });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSteel = { value: steelDetail };
    shader.uniforms.uToShip = { value: toShip };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform mat4 uToShip;\nvarying vec3 vShip;\nvarying vec3 vShipN;")
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvShipN = mat3(uToShip) * mat3(modelMatrix) * objectNormal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvShip = (uToShip * modelMatrix * vec4(transformed, 1.0)).xyz;");

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vShip;
        varying vec3 vShipN;
        ${GLSL_HASH}
        ${GLSL_BUMP}
        ${GLSL_SHIP}`
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        // Flap faces lie in the (radius, height) plane of the ship.
        vec2 fp = vec2(length(vShip.xz), vShip.y);
        float px = max(length(fwidth(vShip)), 1e-5);
        vec3 detail = steelDetail(fp);
        float steelRough = 0.4 + steelDetailRough(detail);
        vec3 tileColor;
        float tileRough;
        float tileH;
        vec2 tileId;
        heatShield(fp, px, tileColor, tileRough, tileH, tileId);
        vec3 sn = normalize(vShipN);
        float sideN = length(sn.xz);
        float tiled = sideN > 0.3 ? step(0.45, dot(sn.xz / sideN, BELLY_DIR)) : 0.0;
        float surfH = mix(steelDetailHeight(detail), tileH, tiled);`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb = mix(vec3(0.56, 0.57, 0.59), tileColor, tiled);`
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(steelRough, tileRough, tiled);`
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
        metalnessFactor = 1.0 - tiled;`
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        normal = bumpNormalH(-vViewPosition, normal, surfH);`
      );
  };
  mat.customProgramCacheKey = () => "flap-v1";
  return mat;
}
