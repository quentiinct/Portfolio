"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RenderPass } from "postprocessing";
import * as THREE from "three";
import { intro } from "../intro";
import { mulberry32 } from "./config";
import { rocketMatrix } from "./cameraPath";
import { fontFamily } from "./textures";

// ═══════════════════════════════════════════════════════════════
// INTRO GRAPH — the opening's 3D network (after igloo.inc): points
// floating at several depths in front of and behind the ship, joined
// to their nearest neighbours by thin straight segments that draw
// themselves outwards from the ship, with small numbers beside some
// points. Drawn by its own render pass after the reveal (so the reveal
// doesn't black it out) and before bloom; gone once the ship is built.
// ═══════════════════════════════════════════════════════════════

const LABELS = ["32", "41", "47", "54", "59", "63", "68", "71", "76", "83", "87", "94", "99"];
/** Seconds for one segment to draw itself. */
const GROW = 0.45;
const FADE_START = 3.0;
const FADE_END = 3.9;

const LINE_VERT = /* glsl */ `
uniform float uTime;
attribute vec3 aTo;
attribute float aEnd;
attribute float aDelay;
varying float vOn;
void main() {
  float g = clamp((uTime - aDelay) / ${GROW.toFixed(2)}, 0.0, 1.0);
  g = 1.0 - pow(1.0 - g, 3.0);
  vOn = step(0.0001, g);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(mix(position, aTo, aEnd * g), 1.0);
}`;
const LINE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vOn;
void main() { gl_FragColor = vec4(uColor * uOpacity * vOn, 1.0); }`;

const NODE_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aDelay;
varying float vOn;
void main() {
  vOn = smoothstep(aDelay, aDelay + 0.15, uTime);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 3.0 * uPixelRatio;
}`;
const NODE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vOn;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  gl_FragColor = vec4(uColor * 1.4 * uOpacity * vOn, 1.0);
}`;

const LABEL_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uResolution;
attribute float aDelay;
attribute float aCell;
attribute float aBright;
varying float vOn;
varying float vCell;
varying float vBright;
void main() {
  vOn = smoothstep(aDelay + 0.1, aDelay + 0.35, uTime);
  vCell = aCell;
  vBright = aBright;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // Just right of and above the point, in screen pixels.
  clip.xy += vec2(15.0, 9.0) * uPixelRatio / uResolution * 2.0 * clip.w;
  gl_Position = clip;
  gl_PointSize = 24.0 * uPixelRatio;
}`;
const LABEL_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uCells;
uniform float uOpacity;
varying float vOn;
varying float vCell;
varying float vBright;
void main() {
  float a = texture2D(uAtlas, vec2((vCell + gl_PointCoord.x) / uCells, 1.0 - gl_PointCoord.y)).a;
  gl_FragColor = vec4(vec3(a * uOpacity * vOn * vBright), 1.0);
}`;

function labelAtlas() {
  const cell = 64;
  const canvas = document.createElement("canvas");
  canvas.width = cell * LABELS.length;
  canvas.height = cell;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.font = `600 26px ${fontFamily("mono")}`;
  LABELS.forEach((text, i) => ctx.fillText(text, i * cell + 4, cell / 2));
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

const additive = { transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending };

/** A render pass that draws over the current image: three would otherwise clear it (renderer.autoClear). */
class OverlayPass extends RenderPass {
  render(...args: Parameters<RenderPass["render"]>) {
    const renderer = args[0];
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    super.render(...args);
    renderer.autoClear = autoClear;
  }
}

export class IntroGraph {
  readonly scene = new THREE.Scene();
  private readonly uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uPixelRatio: { value: 1 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uColor: { value: new THREE.Color(0.82, 0.9, 1.08) },
  };
  private disposables: { dispose(): void }[] = [];
  built = false;

  /** Scatters the points in the current view (so they fill the screen at every depth), fixed in world space. */
  build(camera: THREE.Camera, narrow: boolean) {
    this.built = true;
    const rng = mulberry32(2026);
    const count = narrow ? 46 : 70;
    const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const ray = new THREE.Vector3();
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      ray.set((rng() * 2 - 1) * 1.08, (rng() * 2 - 1) * 1.08, 0.5).unproject(camera).sub(camPos).normalize();
      nodes.push(camPos.clone().addScaledVector(ray, 12 * Math.pow(150 / 12, rng())));
    }

    const screen = nodes.map((n) => n.clone().project(camera));
    const aspect = (camera as THREE.PerspectiveCamera).aspect ?? 1;
    const screenLength = (a: number, b: number) => Math.hypot((screen[a].x - screen[b].x) * aspect, screen[a].y - screen[b].y);

    // Each point joins its two nearest neighbours; no segment longer than ~40% of the screen height.
    const edges = new Map<string, [number, number]>();
    nodes.forEach((a, i) => {
      nodes
        .map((b, j) => ({ j, d: i === j ? Infinity : a.distanceToSquared(b) }))
        .sort((x, y) => x.d - y.d)
        .slice(0, 2)
        .filter(({ j }) => screenLength(i, j) < 0.8)
        .forEach(({ j }) => edges.set(i < j ? `${i}-${j}` : `${j}-${i}`, i < j ? [i, j] : [j, i]));
    });

    // Segments start near the ship on screen and spread outwards.
    const ship = new THREE.Vector3(0, 4, 0).applyMatrix4(rocketMatrix).project(camera);
    const fromShip = (p: THREE.Vector3) => Math.hypot((p.x - ship.x) * aspect, p.y - ship.y);
    const nodeDelay = new Array<number>(count).fill(Infinity);

    const pos: number[] = [];
    const to: number[] = [];
    const end: number[] = [];
    const delay: number[] = [];
    for (const [a, b] of edges.values()) {
      // Grow from the end nearer the ship.
      const [from, dest] = fromShip(screen[a]) <= fromShip(screen[b]) ? [a, b] : [b, a];
      const d = 0.05 + (fromShip(screen[from]) / 2.4) * 1.1 + rng() * 0.25;
      nodeDelay[from] = Math.min(nodeDelay[from], d);
      nodeDelay[dest] = Math.min(nodeDelay[dest], d + GROW * 0.8);
      for (const e of [0, 1]) {
        pos.push(nodes[from].x, nodes[from].y, nodes[from].z);
        to.push(nodes[dest].x, nodes[dest].y, nodes[dest].z);
        end.push(e);
        delay.push(d);
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    lineGeo.setAttribute("aTo", new THREE.Float32BufferAttribute(to, 3));
    lineGeo.setAttribute("aEnd", new THREE.Float32BufferAttribute(end, 1));
    lineGeo.setAttribute("aDelay", new THREE.Float32BufferAttribute(delay, 1));
    const lineMat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, ...additive });
    const lines = new THREE.LineSegments(lineGeo, lineMat);

    const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);
    nodeGeo.setAttribute("aDelay", new THREE.Float32BufferAttribute(nodeDelay.map((d) => (Number.isFinite(d) ? d : 99)), 1));
    const nodeMat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: NODE_VERT, fragmentShader: NODE_FRAG, ...additive });
    const points = new THREE.Points(nodeGeo, nodeMat);

    // Numbers beside some of the points: mostly dim, a few bright.
    const labelled = nodes.map((_, i) => i).filter(() => rng() < 0.45);
    const labelGeo = new THREE.BufferGeometry().setFromPoints(labelled.map((i) => nodes[i]));
    labelGeo.setAttribute("aDelay", new THREE.Float32BufferAttribute(labelled.map((i) => (Number.isFinite(nodeDelay[i]) ? nodeDelay[i] : 99)), 1));
    labelGeo.setAttribute("aCell", new THREE.Float32BufferAttribute(labelled.map(() => Math.floor(rng() * LABELS.length)), 1));
    labelGeo.setAttribute("aBright", new THREE.Float32BufferAttribute(labelled.map(() => (rng() < 0.25 ? 0.95 : 0.5)), 1));
    const atlas = labelAtlas();
    const labelMat = new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uAtlas: { value: atlas }, uCells: { value: LABELS.length } },
      vertexShader: LABEL_VERT,
      fragmentShader: LABEL_FRAG,
      ...additive,
    });
    const labels = new THREE.Points(labelGeo, labelMat);

    for (const o of [lines, points, labels]) {
      o.frustumCulled = false;
      this.scene.add(o);
    }
    this.disposables.push(lineGeo, lineMat, nodeGeo, nodeMat, labelGeo, labelMat, atlas);
  }

  update(time: number, pixelRatio: number, width: number, height: number) {
    this.uniforms.uTime.value = time;
    this.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(time, 0, 0.25) * (1 - THREE.MathUtils.smoothstep(time, FADE_START, FADE_END));
    this.uniforms.uPixelRatio.value = pixelRatio;
    this.uniforms.uResolution.value.set(width, height);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

/** The graph's render pass: draws over the image (no clear), after the reveal and before bloom. */
export function useIntroGraphPass() {
  const camera = useThree((s) => s.camera);
  const graph = useMemo(() => new IntroGraph(), []);
  const pass = useMemo(() => {
    const p = new OverlayPass(graph.scene, camera);
    p.clearPass.enabled = false;
    p.ignoreBackground = true;
    return p;
  }, [graph, camera]);
  useEffect(
    () => () => {
      pass.dispose();
      graph.dispose();
    },
    [pass, graph]
  );
  return { pass, graph };
}

export function IntroGraphDriver({ pass, graph }: { pass: RenderPass; graph: IntroGraph }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const reduce = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const buffer = useMemo(() => new THREE.Vector2(), []);

  useFrame(() => {
    if (!pass.enabled) return;
    if (reduce) {
      pass.enabled = false;
      return;
    }
    const time = intro.elapsed();
    if (time > 0 && !graph.built) graph.build(camera, size.width < 820);
    gl.getDrawingBufferSize(buffer);
    graph.update(time, gl.getPixelRatio(), buffer.x, buffer.y);
    if (time > FADE_END + 0.1) pass.enabled = false;
  });

  return null;
}
