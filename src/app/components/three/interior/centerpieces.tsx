"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useHolo, useLib } from "./common";
import { glow, std } from "./materials";
import { makeCanvas, toTexture } from "../textures";
import { mulberry32 } from "../config";

// ═══════════════════════════════════════════════════════════════
// CENTERPIECES — one hero element per deck: crew ID hologram,
// security shield, git history graph, deep-space transmitter.
// ═══════════════════════════════════════════════════════════════

const coneVertex = /* glsl */ `
varying float vH;
varying vec3 vN;
varying vec3 vV;
void main() {
  vH = uv.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalMatrix * normal;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;
const coneFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
varying float vH;
varying vec3 vN;
varying vec3 vV;
void main() {
  float facing = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
  float a = pow(clamp(1.0 - vH, 0.0, 1.0), 1.6) * (0.25 + 0.75 * facing) * 0.4 * (0.9 + 0.1 * sin(uTime * 23.0));
  gl_FragColor = vec4(uColor * a, a);
}
`;

/** Floor projector: dark metal puck, glowing ring and a volumetric light cone. */
export function Projector({ color, height = 1.3, topRadius = 0.42 }: { color: string; height?: number; topRadius?: number }) {
  const lib = useLib();
  const ring = useMemo(() => glow(color, 4), [color]);
  const cone = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coneVertex,
        fragmentShader: coneFragment,
        uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(2) }, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [color]
  );
  useEffect(() => () => {
    ring.dispose();
    cone.dispose();
  }, [ring, cone]);
  useFrame((s) => {
    cone.uniforms.uTime.value = s.clock.elapsedTime;
  });
  return (
    <group>
      <mesh material={lib.darkMetal} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.12, 48]} />
      </mesh>
      <mesh material={lib.metal} position={[0, 0.125, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.02, 48]} />
      </mesh>
      <mesh material={ring} position={[0, 0.137, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.17, 48]} />
      </mesh>
      <mesh material={cone} position={[0, 0.14 + height / 2, 0]}>
        <cylinderGeometry args={[topRadius, 0.14, height, 48, 1, true]} />
      </mesh>
    </group>
  );
}

// ─── Deck 01 · crew ID hologram ───────────────────────────────

const imgVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const imgFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
float h1(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  float slot = floor(uTime * 7.0);
  float glitch = step(0.93, h1(slot)) * (h1(floor(uv.y * 34.0) + slot) - 0.5) * 0.04;
  uv.x += glitch;
  vec3 c = texture2D(uMap, uv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float mask = smoothstep(0.035, 0.12, l);
  float scan = 0.7 + 0.3 * sin(vUv.y * 420.0 - uTime * 7.0);
  vec3 col = mix(uColor * (0.35 + l * 2.2), c * 1.4 + uColor * 0.2, 0.45) * scan;
  float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
  float a = mask * edge * (0.88 + 0.12 * sin(uTime * 31.0));
  gl_FragColor = vec4(col * a, a);
}
`;

export function MemojiHologram({ texture, color = "#5fd4ff" }: { texture: THREE.Texture; color?: string }) {
  const img = useRef<THREE.Group>(null);
  const holo = useHolo(color, 0.8, 120);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: imgVertex,
        fragmentShader: imgFragment,
        uniforms: { uMap: { value: texture }, uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [texture, color]
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const rings = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    mat.uniforms.uTime.value = t;
    if (img.current) {
      // Billboard around Y toward the camera, in the parent's frame.
      const parent = img.current.parent!;
      const camLocal = parent.worldToLocal(state.camera.position.clone());
      img.current.rotation.y = Math.atan2(camLocal.x - img.current.position.x, camLocal.z - img.current.position.z);
      img.current.position.y = 1.55 + Math.sin(t * 1.3) * 0.025;
    }
    if (rings.current) {
      rings.current.rotation.y = t * 0.5;
      rings.current.children.forEach((c, i) => {
        c.rotation.x = Math.PI / 2 + Math.sin(t * 0.7 + i) * 0.25;
      });
    }
  });

  return (
    <group>
      <Projector color={color} height={1.25} topRadius={0.62} />
      <group ref={img} position={[0, 1.55, 0]}>
        <mesh material={mat}>
          <planeGeometry args={[1.16, 0.87]} />
        </mesh>
      </group>
      <group ref={rings} position={[0, 1.55, 0]}>
        <mesh material={holo}>
          <torusGeometry args={[0.7, 0.005, 6, 96]} />
        </mesh>
        <mesh material={holo} scale={0.85}>
          <torusGeometry args={[0.7, 0.004, 6, 96]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Deck 02 · security shield ────────────────────────────────

function shieldShape(s = 1) {
  const p = new THREE.Shape();
  p.moveTo(0, 0.5 * s);
  p.bezierCurveTo(0.18 * s, 0.45 * s, 0.32 * s, 0.43 * s, 0.4 * s, 0.4 * s);
  p.lineTo(0.4 * s, 0.06 * s);
  p.bezierCurveTo(0.4 * s, -0.24 * s, 0.2 * s, -0.42 * s, 0, -0.53 * s);
  p.bezierCurveTo(-0.2 * s, -0.42 * s, -0.4 * s, -0.24 * s, -0.4 * s, 0.06 * s);
  p.lineTo(-0.4 * s, 0.4 * s);
  p.bezierCurveTo(-0.32 * s, 0.43 * s, -0.18 * s, 0.45 * s, 0, 0.5 * s);
  return p;
}

function lineFromPoints(points: THREE.Vector2[], z = 0) {
  return new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, p.y, z)));
}

export function HoloShield({ color = "#3dffb5", alert = "#ff3348" }: { color?: string; alert?: string }) {
  const group = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const holo = useHolo(color, 0.55, 90);
  const holoAlert = useHolo(alert, 0.9, 40);
  const { face, outline, inner, lockBody, lockArc, lineMat, arcLine } = useMemo(() => {
    const shape = shieldShape(0.72);
    const inner = lineFromPoints(shieldShape(0.6).getPoints(64));
    const outline = lineFromPoints(shape.getPoints(64));
    const lb = new THREE.Shape();
    lb.moveTo(-0.09, -0.12);
    lb.lineTo(0.09, -0.12);
    lb.lineTo(0.09, 0.02);
    lb.lineTo(-0.09, 0.02);
    lb.lineTo(-0.09, -0.12);
    const arc = new THREE.Path();
    arc.absarc(0, 0.02, 0.065, 0, Math.PI, false);
    const lockArc = lineFromPoints(arc.getPoints(24));
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3.5), toneMapped: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    return {
      face: new THREE.ShapeGeometry(shape, 24),
      outline,
      inner,
      lockBody: lineFromPoints(lb.getPoints(4)),
      lockArc,
      lineMat,
      // <line> clashes with the SVG element in JSX, so pass a ready-made object.
      arcLine: new THREE.Line(lockArc, lineMat),
    };
  }, [color]);
  useEffect(() => () => {
    [face, outline, inner, lockBody, lockArc].forEach((g) => g.dispose());
    lineMat.dispose();
  }, [face, outline, inner, lockBody, lockArc, lineMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      // Turn toward the viewer, with a slow sway.
      const parent = group.current.parent!;
      const cam = parent.worldToLocal(state.camera.position.clone());
      group.current.rotation.y = Math.atan2(cam.x, cam.z) + Math.sin(t * 0.35) * 0.45;
      group.current.position.y = 1.55 + Math.sin(t * 1.1) * 0.03;
    }
    if (rings.current) {
      rings.current.children.forEach((c, i) => {
        c.rotation.x = Math.PI / 2 + Math.sin(t * 0.5 + i * 2) * 0.35;
        c.rotation.z = t * (i % 2 ? -0.6 : 0.4);
      });
    }
  });

  return (
    <group>
      <Projector color={color} height={1.25} topRadius={0.55} />
      <group ref={group} position={[0, 1.55, 0]}>
        <mesh geometry={face} material={holo} />
        <lineLoop geometry={outline} material={lineMat} />
        <lineLoop geometry={inner} material={lineMat} />
        <lineLoop geometry={lockBody} material={lineMat} />
        <primitive object={arcLine} />
      </group>
      <group ref={rings} position={[0, 1.55, 0]}>
        <mesh material={holo}>
          <torusGeometry args={[0.62, 0.005, 6, 96]} />
        </mesh>
        <mesh material={holoAlert}>
          <torusGeometry args={[0.7, 0.003, 6, 96, Math.PI * 1.3]} />
        </mesh>
      </group>
    </group>
  );
}

/** Server rack with a procedural front and blinking status LEDs. */
export function ServerRack({ seed = 1 }: { seed?: number }) {
  const lib = useLib();
  const leds = useRef<THREE.InstancedMesh>(null);
  const { front, ledPos } = useMemo(() => {
    const rng = mulberry32(seed);
    const W = 256;
    const H = 860;
    const { canvas, ctx } = makeCanvas(W, H);
    ctx.fillStyle = "#0c0e12";
    ctx.fillRect(0, 0, W, H);
    const ledPos: [number, number][] = [];
    let y = 14;
    while (y < H - 40) {
      const units = rng() < 0.3 ? 2 : 1;
      const uh = 36 * units;
      ctx.fillStyle = rng() < 0.5 ? "#1d2127" : "#23282f";
      ctx.fillRect(10, y, W - 20, uh - 4);
      ctx.fillStyle = "#101216";
      for (let i = 0; i < 18; i++) ctx.fillRect(60 + i * 8, y + 6, 4, uh - 16);
      ctx.fillStyle = "#3a4048";
      ctx.fillRect(14, y + 4, 10, uh - 12);
      ctx.fillRect(W - 24, y + 4, 10, uh - 12);
      if (units === 2) {
        for (let d = 0; d < 4; d++) {
          ctx.fillStyle = "#2e343c";
          ctx.fillRect(40 + d * 42, y + uh / 2 + 2, 36, uh / 2 - 10);
        }
      }
      ledPos.push([W - 40, y + 10], [W - 52, y + 10]);
      if (rng() < 0.6) ledPos.push([W - 64, y + 10]);
      y += uh;
    }
    return { front: toTexture(canvas), ledPos: ledPos.map(([x, yy]) => [(x / W - 0.5) * 0.56, (0.5 - yy / H) * 1.9] as [number, number]) };
  }, [seed]);
  useEffect(() => () => front.dispose(), [front]);
  const frontMat = useMemo(() => std({ map: front, roughness: 0.5, metalness: 0.4 }, 0.4), [front]);
  useEffect(() => () => frontMat.dispose(), [frontMat]);
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => () => ledMat.dispose(), [ledMat]);

  const palette = useMemo(() => [new THREE.Color(0.2, 3.2, 0.9), new THREE.Color(3.2, 1.6, 0.2), new THREE.Color(0.3, 1.2, 3.4), new THREE.Color(3.5, 0.25, 0.3)], []);
  const state = useMemo(() => ledPos.map((_, i) => ({ c: i % 7 === 0 ? 3 : i % 3, rate: 0.5 + ((i * 37) % 11) / 3, phase: i * 1.7 })), [ledPos]);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const dark = useMemo(() => new THREE.Color(0.02, 0.02, 0.02), []);

  useEffect(() => {
    const mesh = leds.current;
    if (!mesh) return;
    ledPos.forEach(([x, y], i) => {
      tmp.position.set(x, y + 1.03, 0.402);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, palette[state[i].c]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [ledPos, palette, state, tmp]);

  const last = useRef(0);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const mesh = leds.current;
    if (!mesh || t - last.current < 0.08) return;
    last.current = t;
    state.forEach((l, i) => {
      const on = Math.sin(t * l.rate * 6 + l.phase) > -0.2 || l.c === 1;
      mesh.setColorAt(i, on ? palette[l.c] : dark);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <mesh material={lib.darkMetal} position={[0, 1.03, 0]}>
        <boxGeometry args={[0.62, 2.06, 0.8]} />
      </mesh>
      <mesh material={frontMat} position={[0, 1.03, 0.401]}>
        <planeGeometry args={[0.56, 1.9]} />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} material={lib.metal} position={[x, 1.03, 0.405]}>
          <boxGeometry args={[0.025, 2.0, 0.012]} />
        </mesh>
      ))}
      <instancedMesh ref={leds} args={[undefined, ledMat, ledPos.length]}>
        <boxGeometry args={[0.009, 0.006, 0.004]} />
      </instancedMesh>
    </group>
  );
}

/** Rotating red alert beacon on the ceiling. */
export function AlertBeacon({ color = "#ff2a3c" }: { color?: string }) {
  const beam = useRef<THREE.Group>(null);
  const lib = useLib();
  const dome = useMemo(() => glow(color, 3), [color]);
  const beamMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.9), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    [color]
  );
  useEffect(() => () => {
    dome.dispose();
    beamMat.dispose();
  }, [dome, beamMat]);
  useFrame((s) => {
    if (beam.current) beam.current.rotation.y = s.clock.elapsedTime * 2.4;
  });
  return (
    <group>
      <mesh material={lib.darkMetal} position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 24]} />
      </mesh>
      <mesh material={dome} position={[0, -0.09, 0]}>
        <sphereGeometry args={[0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <group ref={beam} position={[0, -0.09, 0]}>
        <mesh material={beamMat} position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.35, 1.4, 24, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Deck 03 · git history graph ──────────────────────────────

export function GitGraph({ color = "#4d9dff", branch = "#b18cff", wip = "#3dffb5" }: { color?: string; branch?: string; wip?: string }) {
  const group = useRef<THREE.Group>(null);
  const pulses = useRef<THREE.Group>(null);
  const holoMain = useHolo(color, 1, 120);
  const holoBranch = useHolo(branch, 1, 120);
  const holoWip = useHolo(wip, 1, 120);
  const { curves, nodes, nodeMat } = useMemo(() => {
    const main = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(0, 1.6, 0)]);
    const feat = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.25, 0),
      new THREE.Vector3(0.25, 0.45, 0.08),
      new THREE.Vector3(0.32, 0.75, 0.1),
      new THREE.Vector3(0.25, 1.05, 0.08),
      new THREE.Vector3(0, 1.25, 0),
    ]);
    const wipC = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.6, 0),
      new THREE.Vector3(-0.22, 0.8, -0.12),
      new THREE.Vector3(-0.3, 1.1, -0.18),
      new THREE.Vector3(-0.3, 1.45, -0.2),
    ]);
    const nodes: { p: THREE.Vector3; c: number }[] = [];
    for (let i = 0; i <= 8; i++) nodes.push({ p: main.getPoint(i / 8), c: 0 });
    for (let i = 1; i < 5; i++) nodes.push({ p: feat.getPoint(i / 5), c: 1 });
    for (let i = 1; i <= 4; i++) nodes.push({ p: wipC.getPoint(i / 4), c: 2 });
    return {
      curves: [
        { geo: new THREE.TubeGeometry(main, 64, 0.009, 8), curve: main, c: 0 },
        { geo: new THREE.TubeGeometry(feat, 64, 0.008, 8), curve: feat, c: 1 },
        { geo: new THREE.TubeGeometry(wipC, 64, 0.008, 8), curve: wipC, c: 2 },
      ],
      nodes,
      nodeMat: [glow(color, 3.5), glow(branch, 3.5), glow(wip, 3.5)],
    };
  }, [color, branch, wip]);
  useEffect(() => () => {
    curves.forEach((c) => c.geo.dispose());
    nodeMat.forEach((m) => m.dispose());
  }, [curves, nodeMat]);
  const mats = [holoMain, holoBranch, holoWip];

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) group.current.rotation.y = t * 0.25;
    pulses.current?.children.forEach((c, i) => {
      const cv = curves[i % 3].curve;
      const u = (t * (0.18 + i * 0.03) + i * 0.37) % 1;
      c.position.copy(cv.getPoint(u));
    });
  });

  return (
    <group>
      <group ref={group} position={[0, 0.85, 0]}>
        {curves.map((c, i) => (
          <mesh key={i} geometry={c.geo} material={mats[c.c]} />
        ))}
        {nodes.map((n, i) => (
          <mesh key={i} position={n.p} material={nodeMat[n.c]}>
            <sphereGeometry args={[0.028, 16, 12]} />
          </mesh>
        ))}
        <group ref={pulses}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} material={nodeMat[i % 3]}>
              <sphereGeometry args={[0.014, 10, 8]} />
            </mesh>
          ))}
        </group>
      </group>
      <Projector color={color} height={0.7} topRadius={0.45} />
    </group>
  );
}

// ─── Deck 04 · deep-space transmitter ─────────────────────────

export function Transmitter({ color = "#ff8a3d" }: { color?: string }) {
  const lib = useLib();
  const waves = useRef<THREE.Group>(null);
  const gyro = useRef<THREE.Group>(null);
  const core = useMemo(() => glow("#ffd2a8", 5), []);
  const shell = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, clearcoat: 1, emissive: new THREE.Color(color), emissiveIntensity: 0.6 }),
    [color]
  );
  const waveMats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })),
    [color]
  );
  useEffect(() => () => {
    core.dispose();
    shell.dispose();
    waveMats.forEach((m) => m.dispose());
  }, [core, shell, waveMats]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    waves.current?.children.forEach((c, i) => {
      const k = (t * 0.4 + i / 3) % 1;
      const s = 0.25 + k * 1.6;
      c.scale.set(s, s, s);
      waveMats[i].opacity = (1 - k) * (1 - k) * 0.6;
    });
    if (gyro.current) {
      gyro.current.children[0].rotation.x = t * 0.6;
      gyro.current.children[1].rotation.y = t * 0.45;
      gyro.current.position.y = Math.sin(t * 0.9) * 0.03;
    }
  });

  return (
    <group>
      <group ref={gyro}>
        <mesh material={lib.brass}>
          <torusGeometry args={[0.24, 0.012, 12, 64]} />
        </mesh>
        <mesh material={lib.chrome} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.01, 12, 64]} />
        </mesh>
        <mesh material={core}>
          <sphereGeometry args={[0.07, 32, 16]} />
        </mesh>
        <mesh material={shell}>
          <sphereGeometry args={[0.14, 48, 24]} />
        </mesh>
      </group>
      <group ref={waves} rotation={[Math.PI / 2, 0, 0]}>
        {waveMats.map((m, i) => (
          <mesh key={i} material={m}>
            <ringGeometry args={[0.49, 0.5, 96]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Wall console: desk + cabinet + monitors (screens passed as children). */
export function Console({ children, width = 1.0 }: { children?: ReactNode; width?: number }) {
  const lib = useLib();
  return (
    <group>
      <RoundedBox args={[width, 0.05, 0.48]} radius={0.015} smoothness={3} position={[0, 0.92, 0.25]} material={lib.darkMetal} />
      <mesh material={lib.greyPlastic} position={[0, 0.48, 0.12]}>
        <boxGeometry args={[width - 0.1, 0.84, 0.22]} />
      </mesh>
      <mesh material={lib.blackPlastic} position={[0, 0.957, 0.33]}>
        <boxGeometry args={[0.38, 0.016, 0.13]} />
      </mesh>
      {children}
    </group>
  );
}

export function Monitor({ children, w = 0.5, h = 0.31 }: { children?: ReactNode; w?: number; h?: number }) {
  const lib = useLib();
  return (
    <group>
      <RoundedBox args={[w + 0.03, h + 0.03, 0.025]} radius={0.008} smoothness={3} material={lib.blackPlastic} />
      <group position={[0, 0, 0.0135]}>{children}</group>
    </group>
  );
}
