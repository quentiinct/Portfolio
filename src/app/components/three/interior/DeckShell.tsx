"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  DECKS,
  DOOR,
  FLOOR_T,
  HOLE_R,
  HULL_R,
  PANEL_ANGLE,
  PANEL_W,
  ROOM_H,
  SIDES,
  WALL_A,
  WINDOWS,
  WINDOW_R,
  WINDOW_Y,
  deg,
  mulberry32,
  polar,
} from "../config";
import { glow, materials, std } from "./materials";
import { hazardTexture, labelTexture } from "../textures";

// ═══════════════════════════════════════════════════════════════
// DECK SHELL — the room itself: 24 flat wall panels (with real
// porthole / airlock openings), tread-plate floor with the central
// hatch, ceiling with a light ring, handrails, pipes, ladder, labels.
// Static parts are merged per material to keep draw calls low.
// ═══════════════════════════════════════════════════════════════

const CIRCUM_R = WALL_A / Math.cos(PANEL_ANGLE / 2);
const sameAngle = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-3;

function polygonShape(radius: number) {
  const s = new THREE.Shape();
  for (let k = 0; k <= SIDES; k++) {
    const a = k * PANEL_ANGLE + PANEL_ANGLE / 2;
    // Shape lives in XY; after rotating -90° on X, shape Y maps to world -Z.
    const x = Math.sin(a) * radius;
    const y = -Math.cos(a) * radius;
    if (k === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

function circlePath(r: number, cx = 0, cy = 0, segments = 48) {
  const p = new THREE.Path();
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy - Math.sin(a) * r; // clockwise for holes
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  return p;
}

/** Transform a geometry lying in XY (facing +Z) onto the wall panel at `angle`, facing inward. */
function onWall(geo: THREE.BufferGeometry, angle: number, inset = 0) {
  const m = new THREE.Matrix4().makeRotationY(angle + Math.PI);
  m.setPosition(polar(angle, WALL_A - inset, 0));
  return geo.applyMatrix4(m);
}

function remapPanelUV(geo: THREE.BufferGeometry, variant: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv[i * 2] = ((x + PANEL_W / 2) / PANEL_W) * 0.5 + variant * 0.5;
    uv[i * 2 + 1] = y / ROOM_H;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

function ringStrip(r0: number, r1: number, segments: number, uRepeat: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    pos.push(s * r0, 0, c * r0, s * r1, 0, c * r1);
    uv.push((i / segments) * uRepeat, 0, (i / segments) * uRepeat, 1);
    if (i < segments) {
      const b = i * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Cylinder between two points. */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 10) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

function merge(list: THREE.BufferGeometry[]) {
  const clean = list.map((g) => (g.index ? g.toNonIndexed() : g));
  clean.forEach((g) => {
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
  });
  const m = mergeGeometries(clean, false);
  list.forEach((g) => g.dispose());
  return m!;
}

function buildDeck(index: number) {
  const rng = mulberry32(300 + index * 31);
  const hasHoleBelow = index < 3;
  const hasHoleAbove = index > 0;
  const windows = WINDOWS.filter((w) => w.deck === index);

  // ── Walls
  const walls: THREE.BufferGeometry[] = [];
  const frames: THREE.BufferGeometry[] = [];
  const tubes: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  for (let k = 0; k < SIDES; k++) {
    const angle = k * PANEL_ANGLE;
    const isDoor = index === DOOR.deck && sameAngle(angle, DOOR.angle);
    const isWindow = windows.some((w) => sameAngle(w.angle, angle));
    const shape = new THREE.Shape();
    shape.moveTo(-PANEL_W / 2, 0);
    shape.lineTo(PANEL_W / 2, 0);
    shape.lineTo(PANEL_W / 2, ROOM_H);
    shape.lineTo(-PANEL_W / 2, ROOM_H);
    shape.lineTo(-PANEL_W / 2, 0);
    if (isWindow) shape.holes.push(circlePath(WINDOW_R, 0, WINDOW_Y));
    if (isDoor) {
      const hw = DOOR.width / 2;
      const h = new THREE.Path();
      h.moveTo(-hw, DOOR.bottom);
      h.lineTo(-hw, DOOR.bottom + DOOR.height);
      h.lineTo(hw, DOOR.bottom + DOOR.height);
      h.lineTo(hw, DOOR.bottom);
      h.lineTo(-hw, DOOR.bottom);
      shape.holes.push(h);
    }
    const variant = isWindow || isDoor ? 0 : rng() < 0.45 ? 1 : 0;
    walls.push(onWall(remapPanelUV(new THREE.ShapeGeometry(shape, 24), variant), angle));

    if (isWindow) {
      const ring = new THREE.TorusGeometry(WINDOW_R + 0.05, 0.05, 12, 48);
      ring.translate(0, WINDOW_Y, 0.005);
      frames.push(onWall(ring, angle));
      const depth = HULL_R + 0.02 - WALL_A;
      const tube = new THREE.CylinderGeometry(WINDOW_R, WINDOW_R, depth + 0.04, 40, 1, true);
      tube.rotateX(Math.PI / 2);
      tube.translate(0, WINDOW_Y, -depth / 2 + 0.02);
      tubes.push(onWall(tube, angle));
      const g = new THREE.CircleGeometry(WINDOW_R + 0.01, 40);
      g.translate(0, WINDOW_Y, -0.03);
      glass.push(onWall(g, angle));
    }
  }

  // ── Floor / ceiling
  const floorShape = polygonShape(CIRCUM_R + 0.02);
  if (hasHoleBelow) floorShape.holes.push(circlePath(HOLE_R, 0, 0, 64));
  const floor = new THREE.ShapeGeometry(floorShape, 32);
  floor.rotateX(-Math.PI / 2);

  const ceilShape = polygonShape(CIRCUM_R + 0.02);
  if (hasHoleAbove) ceilShape.holes.push(circlePath(HOLE_R, 0, 0, 64));
  const ceiling = new THREE.ShapeGeometry(ceilShape, 32);
  ceiling.rotateX(Math.PI / 2);

  // ── Hatch rim + safety stripes
  const rimParts: THREE.BufferGeometry[] = [];
  if (hasHoleBelow) {
    const rim = new THREE.CylinderGeometry(HOLE_R, HOLE_R, FLOOR_T, 64, 1, true);
    rim.translate(0, -FLOOR_T / 2, 0);
    rimParts.push(rim);
    const lip = new THREE.TorusGeometry(HOLE_R + 0.02, 0.035, 10, 64);
    lip.rotateX(Math.PI / 2);
    lip.translate(0, 0.012, 0);
    rimParts.push(lip);
  } else {
    // Closed hatch on the lowest deck.
    const hatch = new THREE.CylinderGeometry(HOLE_R, HOLE_R, 0.06, 64);
    hatch.translate(0, 0.03, 0);
    rimParts.push(hatch);
  }
  const hazard = ringStrip(HOLE_R + 0.04, HOLE_R + 0.2, 96, 22);
  hazard.translate(0, 0.004, 0);

  // ── Handrails with stand-offs
  const rails: THREE.BufferGeometry[] = [];
  const brackets: THREE.BufferGeometry[] = [];
  for (let k = 0; k < SIDES; k++) {
    const angle = k * PANEL_ANGLE;
    if (index === DOOR.deck && sameAngle(angle, DOOR.angle)) continue;
    const y = 1.05;
    const inset = 0.13;
    const half = PANEL_W / 2 - 0.08;
    const right = polar(angle - Math.PI / 2, 1, 0);
    const c = polar(angle, WALL_A - inset, y);
    rails.push(rod(c.clone().addScaledVector(right, -half), c.clone().addScaledVector(right, half), 0.022));
    for (const s of [-0.3, 0.3]) {
      const p = c.clone().addScaledVector(right, s);
      brackets.push(rod(p, polar(angle, WALL_A, y).addScaledVector(right, s), 0.015, 6));
    }
  }

  // ── Vertical pipes / cable runs along panel seams
  const pipesMetal: THREE.BufferGeometry[] = [];
  const pipesBlue: THREE.BufferGeometry[] = [];
  const pipesInsul: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    let angle = k * (Math.PI / 2) + PANEL_ANGLE / 2 + deg(15 * ((index + k) % 3));
    if (index === DOOR.deck && Math.abs(Math.atan2(Math.sin(angle - DOOR.angle), Math.cos(angle - DOOR.angle))) < deg(12)) angle += deg(30);
    const r = CIRCUM_R - 0.12;
    const side = polar(angle - Math.PI / 2, 1, 0);
    const base = polar(angle, r, 0);
    pipesMetal.push(rod(base.clone(), base.clone().setY(ROOM_H), 0.045, 12));
    const b2 = base.clone().addScaledVector(side, 0.11);
    pipesBlue.push(rod(b2.clone(), b2.clone().setY(ROOM_H), 0.03, 10));
    const b3 = base.clone().addScaledVector(side, -0.12).multiplyScalar(0.99);
    pipesInsul.push(rod(b3.clone(), b3.clone().setY(ROOM_H), 0.06, 12));
    for (let c = 0; c < 4; c++) {
      const y = 0.5 + c * 0.9;
      const clamp = new THREE.TorusGeometry(0.075, 0.012, 6, 16);
      clamp.rotateX(Math.PI / 2);
      clamp.translate(base.x, y, base.z);
      pipesMetal.push(clamp);
    }
  }

  // ── Ladder down through the hatch — placed where the camera views of
  // both this deck and the one below keep it out of the way (left side,
  // behind the HTML panel).
  const ladder: THREE.BufferGeometry[] = [];
  if (hasHoleBelow) {
    const la = deg([0, 250, 205][index]);
    const r = HOLE_R - 0.13;
    const side = polar(la - Math.PI / 2, 1, 0);
    const c = polar(la, r, 0);
    // Zero-g: the ladder only hangs a little below the hatch, it does not need to reach the floor.
    const bottom = -(FLOOR_T + 1.25);
    const top = 0.32;
    for (const s of [-0.21, 0.21]) {
      const p = c.clone().addScaledVector(side, s);
      ladder.push(rod(p.clone().setY(bottom), p.clone().setY(top), 0.022, 10));
    }
    for (let y = bottom + 0.3; y < top - 0.05; y += 0.3) {
      ladder.push(rod(c.clone().addScaledVector(side, -0.21).setY(y), c.clone().addScaledVector(side, 0.21).setY(y), 0.014, 8));
    }
  }

  // ── Ceiling light ring + floor accent strip
  const lightRing = new THREE.RingGeometry(2.46, 2.59, 128, 1);
  lightRing.rotateX(Math.PI / 2);
  lightRing.translate(0, ROOM_H - 0.062, 0);
  const lightHousing = new THREE.TorusGeometry(2.525, 0.1, 8, 128);
  lightHousing.rotateX(Math.PI / 2);
  lightHousing.scale(1, 0.35, 1);
  lightHousing.translate(0, ROOM_H - 0.02, 0);

  const strips: THREE.BufferGeometry[] = [];
  for (let k = 0; k < SIDES; k++) {
    const angle = k * PANEL_ANGLE;
    if (index === DOOR.deck && sameAngle(angle, DOOR.angle)) continue;
    const p = new THREE.PlaneGeometry(PANEL_W, 0.022);
    p.translate(0, 0.24, 0.012);
    strips.push(onWall(p, angle));
  }

  return {
    walls: merge(walls),
    frames: frames.length ? merge(frames) : null,
    tubes: tubes.length ? merge(tubes) : null,
    glass: glass.length ? merge(glass) : null,
    floor,
    ceiling,
    rim: merge(rimParts),
    hazard,
    rails: merge(rails),
    brackets: merge(brackets),
    pipesMetal: merge(pipesMetal),
    pipesBlue: merge(pipesBlue),
    pipesInsul: merge(pipesInsul),
    ladder: ladder.length ? merge(ladder) : null,
    lightRing,
    lightHousing,
    strips: merge(strips),
  };
}

// ─── Floating dust motes ──────────────────────────────────────

const moteVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
varying float vA;
void main() {
  vec3 p = position;
  float t = uTime * (0.05 + aSeed * 0.06);
  p.x += sin(t + aSeed * 40.0) * 0.25;
  p.y += sin(t * 0.8 + aSeed * 13.0) * 0.18;
  p.z += cos(t * 0.9 + aSeed * 27.0) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = 0.35 + 0.65 * abs(sin(uTime * 0.7 + aSeed * 30.0));
  gl_PointSize = (4.0 + aSeed * 6.0) * uPixelRatio / -mv.z;
}
`;

const moteFragment = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = exp(-dot(c, c) * 18.0) * vA * 0.55;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`;

function Motes({ color, seed }: { color: string; seed: number }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(seed);
    const count = 160;
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = 1.2 + Math.sqrt(rng()) * 2.7;
      pos.set([Math.sin(a) * r, 0.2 + rng() * (ROOM_H - 0.4), Math.cos(a) * r], i * 3);
      seeds[i] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: moteVertex,
      fragmentShader: moteFragment,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color(color).multiplyScalar(1.4) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, [color, seed]);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPixelRatio.value = dpr;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

/** Stencilled deck number on the wall. */
function DeckLabel({ index, angle }: { index: number; angle: number }) {
  const tex = useMemo(
    () =>
      labelTexture(
        `deck-${index}`,
        [
          { text: `DECK 0${index + 1}`, size: 104, weight: 800, color: "#1b1e23", spacing: 6, font: "display" },
          { text: DECKS[index].label.toUpperCase(), size: 44, weight: 700, color: "#2a2e35", spacing: 10 },
        ],
        900,
        300,
        { stencil: true }
      ),
    [index]
  );
  const mat = useMemo(() => std({ map: tex, transparent: true, depthWrite: false, opacity: 0.92, roughness: 0.7 }, 0.4), [tex]);
  useEffect(() => () => mat.dispose(), [mat]);
  const pos = polar(angle, WALL_A - 0.012, 2.82);
  return (
    <mesh position={pos} rotation={[0, angle + Math.PI, 0]} renderOrder={1} material={mat}>
      <planeGeometry args={[0.98, 0.33]} />
    </mesh>
  );
}

const LABEL_ANGLES = [deg(60), deg(150), deg(0), deg(30)];

/** Per-deck mood: wall/floor tint, ambient (image-based) light and ceiling ring brightness. */
const MOODS = [
  { wall: "#fff8ef", floor: "#ffffff", env: 0.3, ring: 3.4 },
  { wall: "#80858f", floor: "#9aa0aa", env: 0.16, ring: 1.4 },
  { wall: "#dde6f7", floor: "#e8eefa", env: 0.28, ring: 3.2 },
  { wall: "#f4e7da", floor: "#fff4ea", env: 0.26, ring: 2.8 },
];

export default function DeckShell({ index }: { index: number }) {
  const gl = useThree((s) => s.gl);
  const lib = materials(gl);
  const geo = useMemo(() => buildDeck(index), [index]);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);

  const extra = useMemo(() => {
    const hz = hazardTexture();
    const mood = MOODS[index];
    return {
      // Same panel textures, different tint and ambient per deck → four distinct moods.
      wall: std({ map: lib.wall.map, bumpMap: lib.wall.bumpMap, bumpScale: 2.2, roughness: 0.62, metalness: 0.08, color: mood.wall }, mood.env),
      floor: std({ map: lib.floor.map, bumpMap: lib.floor.bumpMap, bumpScale: 2.5, roughness: 0.46, metalness: 0.55, color: mood.floor }, mood.env + 0.1),
      hazard: std({ map: hz, roughness: 0.55, metalness: 0.2 }, 0.3),
      stripGlow: glow(DECKS[index].accent, 3.5),
      housing: std({ color: "#1e2126", roughness: 0.5, metalness: 0.7 }, 0.4),
      rim: std({ color: "#2c3036", roughness: 0.42, metalness: 0.8, side: THREE.DoubleSide }, 0.6),
    };
  }, [index, lib]);

  useEffect(() => () => {
    Object.values(geo).forEach((g) => g?.dispose());
    Object.values(extra).forEach((m) => m.dispose());
  }, [geo, extra]);

  useFrame((state) => {
    // Subtle mains flicker on the light ring.
    if (ringMat.current) {
      const t = state.clock.elapsedTime;
      const f = 1 - 0.03 * Math.max(0, Math.sin(t * 13.0 + index) * Math.sin(t * 7.3));
      ringMat.current.color.set(DECKS[index].light).multiplyScalar(MOODS[index].ring * f);
    }
  });

  return (
    <group>
      <mesh geometry={geo.walls} material={extra.wall} />
      {geo.frames && <mesh geometry={geo.frames} material={lib.darkMetal} />}
      {geo.tubes && <mesh geometry={geo.tubes} material={lib.darkMetal} />}
      {geo.glass && <mesh geometry={geo.glass} material={lib.glass} />}
      <mesh geometry={geo.floor} material={extra.floor} />
      <mesh geometry={geo.ceiling} material={lib.ceiling} position={[0, ROOM_H, 0]} />
      <mesh geometry={geo.rim} material={extra.rim} />
      <mesh geometry={geo.hazard} material={extra.hazard} />
      <mesh geometry={geo.rails} material={lib.rail} />
      <mesh geometry={geo.brackets} material={lib.darkMetal} />
      <mesh geometry={geo.pipesMetal} material={lib.metal} />
      <mesh geometry={geo.pipesBlue} material={lib.cableBlue} />
      <mesh geometry={geo.pipesInsul} material={lib.insulation} />
      {geo.ladder && <mesh geometry={geo.ladder} material={lib.darkMetal} />}
      <mesh geometry={geo.lightHousing} material={extra.housing} />
      <mesh geometry={geo.lightRing}>
        <meshBasicMaterial ref={ringMat} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.strips} material={extra.stripGlow} />
      <DeckLabel index={index} angle={LABEL_ANGLES[index]} />
      <Motes color={DECKS[index].light} seed={70 + index} />
    </group>
  );
}
