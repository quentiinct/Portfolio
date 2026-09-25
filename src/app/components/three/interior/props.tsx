"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { phys, std, glow } from "./materials";
import { useLib } from "./common";
import { labelTexture, makeCanvas, roundRect, toTexture, fontFamily } from "../textures";

// ═══════════════════════════════════════════════════════════════
// PROPS — small objects floating around the decks. Built from
// primitives with physically based materials (clearcoat ceramics,
// brushed metals, plastics) so they read as real objects.
// ═══════════════════════════════════════════════════════════════

function useMat<T extends THREE.Material>(make: () => T, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const m = useMemo(make, deps);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

// ─── Deck 01 · crew ───────────────────────────────────────────

export function Mug({ color = "#e9e3d8" }: { color?: string }) {
  const ceramic = useMat(() => phys({ color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }), [color]);
  const coffee = useMat(() => phys({ color: "#2a140a", roughness: 0.08, clearcoat: 1 }), []);
  const profile = useMemo(
    () =>
      [
        [0.0, 0.0],
        [0.041, 0.0],
        [0.045, 0.004],
        [0.047, 0.05],
        [0.048, 0.096],
        [0.047, 0.1],
        [0.044, 0.1],
        [0.043, 0.094],
        [0.041, 0.012],
        [0.0, 0.012],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
    []
  );
  return (
    <group position={[0, -0.05, 0]}>
      <mesh material={ceramic}>
        <latheGeometry args={[profile, 48]} />
      </mesh>
      <mesh material={ceramic} position={[0.047, 0.052, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.027, 0.0075, 12, 24, Math.PI]} />
      </mesh>
      <mesh material={coffee} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0425, 40]} />
      </mesh>
    </group>
  );
}

/** Wobbling liquid sphere (coffee or water) — how liquids behave in zero-g. */
export function LiquidBlob({ radius = 0.03, color = "#3a1d0d", glassy = false, seed = 0 }: { radius?: number; color?: string; glassy?: boolean; seed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMat(
    () =>
      glassy
        ? phys({ color, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.38, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.33 }, 1.6)
        : phys({ color, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 }, 1.1),
    [color, glassy]
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime * 2.2 + seed;
    ref.current?.scale.set(1 + Math.sin(t) * 0.07, 1 + Math.sin(t * 1.3 + 2) * 0.06, 1 + Math.cos(t * 0.9) * 0.07);
  });
  return (
    <mesh ref={ref} material={mat}>
      <sphereGeometry args={[radius, 32, 24]} />
    </mesh>
  );
}

export function Pen({ color = "#1f3f78" }: { color?: string }) {
  const lib = useLib();
  const body = useMat(() => std({ color, roughness: 0.25, metalness: 0.7 }, 0.7), [color]);
  return (
    <group>
      <mesh material={body}>
        <cylinderGeometry args={[0.0055, 0.0055, 0.13, 16]} />
      </mesh>
      <mesh material={lib.chrome} position={[0, -0.074, 0]}>
        <coneGeometry args={[0.0055, 0.018, 16]} />
      </mesh>
      <mesh material={lib.chrome} position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.012, 16]} />
      </mesh>
      <mesh material={lib.chrome} position={[0.0068, 0.045, 0]}>
        <boxGeometry args={[0.0018, 0.045, 0.0035]} />
      </mesh>
    </group>
  );
}

export function Notebook({ color = "#27303d" }: { color?: string }) {
  const lib = useLib();
  const cover = useMat(() => std({ color, roughness: 0.75, metalness: 0 }, 0.35), [color]);
  const band = useMat(() => std({ color: "#c2461b", roughness: 0.6 }, 0.3), []);
  return (
    <group>
      <RoundedBox args={[0.15, 0.2, 0.016]} radius={0.004} smoothness={3} material={cover} />
      <mesh material={lib.paper} position={[0.004, 0, 0]}>
        <boxGeometry args={[0.144, 0.192, 0.0125]} />
      </mesh>
      <mesh material={band} position={[0.05, 0, 0]}>
        <boxGeometry args={[0.006, 0.201, 0.0175]} />
      </mesh>
    </group>
  );
}

export function Headphones() {
  const lib = useLib();
  return (
    <group>
      <mesh material={lib.blackPlastic}>
        <torusGeometry args={[0.088, 0.008, 10, 40, Math.PI]} />
      </mesh>
      <mesh material={lib.greyPlastic} position={[0, 0.004, 0]}>
        <torusGeometry args={[0.083, 0.011, 8, 40, Math.PI]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[0.088 * s, -0.018, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={lib.blackPlastic}>
            <cylinderGeometry args={[0.042, 0.042, 0.028, 32]} />
          </mesh>
          <mesh material={lib.rubber} position={[0, -0.016 * s, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.03, 0.012, 12, 32]} />
          </mesh>
          <mesh material={lib.chrome} position={[0, 0.015 * s, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.002, 24]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Polaroid({ texture }: { texture: THREE.Texture }) {
  const lib = useLib();
  const photo = useMat(() => std({ map: texture, roughness: 0.45 }, 0.3), [texture]);
  return (
    <group>
      <RoundedBox args={[0.1, 0.122, 0.0025]} radius={0.001} smoothness={2} material={lib.paper} />
      <mesh material={photo} position={[0, 0.011, 0.0014]}>
        <planeGeometry args={[0.086, 0.086]} />
      </mesh>
    </group>
  );
}

export function Tablet({ draw }: { draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }) {
  const lib = useLib();
  const tex = useMemo(() => {
    const { canvas, ctx } = makeCanvas(512, 352);
    draw(ctx, 512, 352);
    return toTexture(canvas);
  }, [draw]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group>
      <RoundedBox args={[0.25, 0.175, 0.009]} radius={0.004} smoothness={3} material={lib.blackPlastic} />
      <mesh position={[0, 0, 0.0047]}>
        <planeGeometry args={[0.232, 0.158]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={[1.2, 1.2, 1.2]} />
      </mesh>
    </group>
  );
}

// ─── Deck 02 · security ───────────────────────────────────────

export function Padlock({ body = "#b8923e" }: { body?: string }) {
  const lib = useLib();
  const bodyMat = useMat(() => std({ color: body, roughness: 0.3, metalness: 1 }, 0.9), [body]);
  return (
    <group>
      <RoundedBox args={[0.07, 0.058, 0.028]} radius={0.008} smoothness={3} material={bodyMat} />
      <mesh material={lib.chrome} position={[0, 0.029, 0]}>
        <torusGeometry args={[0.022, 0.0055, 10, 24, Math.PI]} />
      </mesh>
      {[-0.022, 0.022].map((x) => (
        <mesh key={x} material={lib.chrome} position={[x, 0.024, 0]}>
          <cylinderGeometry args={[0.0055, 0.0055, 0.012, 12]} />
        </mesh>
      ))}
      <mesh material={lib.rubber} position={[0, -0.008, 0.0142]}>
        <circleGeometry args={[0.005, 16]} />
      </mesh>
      <mesh material={lib.rubber} position={[0, -0.016, 0.0142]}>
        <planeGeometry args={[0.003, 0.012]} />
      </mesh>
    </group>
  );
}

export function UsbKey({ color = "#b3202c" }: { color?: string }) {
  const lib = useLib();
  const shell = useMat(() => phys({ color, roughness: 0.3, clearcoat: 0.8 }), [color]);
  const led = useMat(() => glow("#35ff8a", 4), []);
  return (
    <group>
      <RoundedBox args={[0.055, 0.02, 0.009]} radius={0.003} smoothness={3} material={shell} />
      <mesh material={lib.chrome} position={[0.033, 0, 0]}>
        <boxGeometry args={[0.013, 0.012, 0.0045]} />
      </mesh>
      <mesh material={led} position={[-0.018, 0, 0.0047]}>
        <circleGeometry args={[0.0018, 12]} />
      </mesh>
    </group>
  );
}

export function Keycard() {
  const tex = useMemo(() => {
    const { canvas, ctx } = makeCanvas(512, 320);
    const g = ctx.createLinearGradient(0, 0, 512, 320);
    g.addColorStop(0, "#15181e");
    g.addColorStop(1, "#262b33");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = "#ff3348";
    ctx.fillRect(0, 238, 512, 22);
    ctx.fillStyle = "#c9a44c";
    roundRect(ctx, 40, 90, 78, 60, 10);
    ctx.fill();
    ctx.strokeStyle = "#8a6d2b";
    ctx.lineWidth = 3;
    ctx.strokeRect(58, 100, 42, 40);
    ctx.fillStyle = "#e8eaee";
    ctx.font = `700 34px ${fontFamily("mono")}`;
    ctx.fillText("ACCESS · LVL 5", 150, 118);
    ctx.font = `400 22px ${fontFamily("mono")}`;
    ctx.fillStyle = "#9aa3ae";
    ctx.fillText("SECURITY OPS / QC-01", 150, 152);
    return toTexture(canvas);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const face = useMat(() => phys({ map: tex, roughness: 0.3, clearcoat: 0.9 }), [tex]);
  return <RoundedBox args={[0.086, 0.054, 0.0018]} radius={0.0008} smoothness={2} material={face} />;
}

export function HexNut() {
  const lib = useLib();
  return (
    <group>
      <mesh material={lib.metal}>
        <cylinderGeometry args={[0.014, 0.014, 0.01, 6]} />
      </mesh>
      <mesh material={lib.darkMetal} position={[0, 0.0052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0065, 20]} />
      </mesh>
    </group>
  );
}

// ─── Deck 03 · engineering ────────────────────────────────────

export function Gear({ teeth = 12, radius = 0.06, color = "#9aa0a8" }: { teeth?: number; radius?: number; color?: string }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    const inner = radius * 0.82;
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (i / (teeth * 2)) * Math.PI * 2;
      const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? radius : inner;
      const p0 = [Math.cos(a0 + 0.04) * r, Math.sin(a0 + 0.04) * r];
      const p1 = [Math.cos(a1 - 0.04) * r, Math.sin(a1 - 0.04) * r];
      if (i === 0) s.moveTo(p0[0], p0[1]);
      else s.lineTo(p0[0], p0[1]);
      s.lineTo(p1[0], p1[1]);
    }
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, radius * 0.28, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: radius * 0.25, bevelEnabled: true, bevelSize: 0.0015, bevelThickness: 0.0015, bevelSegments: 1, curveSegments: 16 });
    g.center();
    return g;
  }, [teeth, radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  const mat = useMat(() => std({ color, roughness: 0.28, metalness: 1 }, 0.9), [color]);
  return <mesh geometry={geo} material={mat} />;
}

export function Wrench() {
  const lib = useLib();
  const geo = useMemo(() => {
    // Handle + open-jaw head, drawn counter-clockwise.
    const s = new THREE.Shape();
    const hr = 0.026;
    s.moveTo(-0.09, -0.009);
    s.lineTo(0.058, -0.009);
    s.absarc(0.08, 0, hr, -2.35, -0.3, false);
    s.lineTo(0.086, -0.006);
    s.lineTo(0.086, 0.006);
    s.lineTo(0.08 + hr * Math.cos(0.3), hr * Math.sin(0.3));
    s.absarc(0.08, 0, hr, 0.3, 2.35, false);
    s.lineTo(0.058, 0.009);
    s.lineTo(-0.09, 0.009);
    s.absarc(-0.09, 0, 0.009, Math.PI / 2, Math.PI * 1.5, false);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelSize: 0.0015, bevelThickness: 0.0015, bevelSegments: 2, curveSegments: 16 });
    g.center();
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={lib.chrome} />;
}

export function CodeCube({ label, color = "#4d9dff" }: { label: string; color?: string }) {
  const tex = useMemo(
    () => labelTexture(`cube-${label}`, [{ text: label, size: 150, weight: 800, color: "#f4f6f8" }], 320, 320, { bg: "#16191f" }),
    [label]
  );
  const face = useMat(() => phys({ map: tex, roughness: 0.35, clearcoat: 0.6 }), [tex]);
  const edge = useMat(() => glow(color, 2.4), [color]);
  return (
    <group>
      <RoundedBox args={[0.085, 0.085, 0.085]} radius={0.008} smoothness={3} material={face} />
      <mesh material={edge}>
        <boxGeometry args={[0.0875, 0.004, 0.0875]} />
      </mesh>
    </group>
  );
}

export function Laptop({ draw }: { draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }) {
  const lib = useLib();
  const tex = useMemo(() => {
    const { canvas, ctx } = makeCanvas(640, 400);
    draw(ctx, 640, 400);
    return toTexture(canvas);
  }, [draw]);
  useEffect(() => () => tex.dispose(), [tex]);
  const alu = useMat(() => std({ color: "#8f959e", roughness: 0.42, metalness: 1 }, 0.6), []);
  return (
    <group>
      <RoundedBox args={[0.32, 0.014, 0.22]} radius={0.005} smoothness={3} material={alu} />
      <mesh material={lib.blackPlastic} position={[0, 0.0072, -0.02]}>
        <boxGeometry args={[0.28, 0.001, 0.1]} />
      </mesh>
      <group position={[0, 0.006, -0.108]} rotation={[-0.35, 0, 0]}>
        <RoundedBox args={[0.32, 0.21, 0.007]} radius={0.004} smoothness={3} material={alu} position={[0, 0.105, 0]} />
        <mesh position={[0, 0.107, 0.0038]}>
          <planeGeometry args={[0.296, 0.185]} />
          <meshBasicMaterial map={tex} toneMapped={false} color={[1.25, 1.25, 1.25]} />
        </mesh>
      </group>
    </group>
  );
}

export function CircuitBoard() {
  const tex = useMemo(() => {
    const { canvas, ctx } = makeCanvas(512, 340);
    ctx.fillStyle = "#0d4a2c";
    ctx.fillRect(0, 0, 512, 340);
    ctx.strokeStyle = "#c9a44c";
    ctx.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const y = 20 + i * 12;
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(120 + (i % 5) * 20, y);
      ctx.lineTo(160 + (i % 5) * 20, y + 30);
      ctx.lineTo(500, y + 30);
      ctx.stroke();
      ctx.fillStyle = "#e3c56a";
      ctx.beginPath();
      ctx.arc(10, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(canvas);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const lib = useLib();
  const board = useMat(() => phys({ map: tex, roughness: 0.4, clearcoat: 0.7 }), [tex]);
  return (
    <group>
      <mesh material={board}>
        <boxGeometry args={[0.13, 0.086, 0.0022]} />
      </mesh>
      {[
        [-0.02, 0.01, 0.034, 0.034],
        [0.035, -0.015, 0.024, 0.016],
        [0.04, 0.022, 0.018, 0.018],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} material={lib.blackPlastic} position={[x, y, 0.003]}>
          <boxGeometry args={[w, h, 0.004]} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Deck 04 · comms ──────────────────────────────────────────

export function PaperPlane() {
  const lib = useLib();
  const geo = useMemo(() => {
    // Folded sheet: two wings, two keel halves.
    const v = [
      [0, 0, 0.14], [-0.075, 0.012, -0.08], [0, 0.004, -0.08],
      [0, 0, 0.14], [0, 0.004, -0.08], [0.075, 0.012, -0.08],
      [0, 0, 0.14], [0, 0.004, -0.08], [-0.002, -0.028, -0.08],
      [0, 0, 0.14], [0.002, -0.028, -0.08], [0, 0.004, -0.08],
    ].flat();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={lib.paper} />;
}

export function Envelope() {
  const lib = useLib();
  const seal = useMat(() => phys({ color: "#9e1b22", roughness: 0.3, clearcoat: 0.8 }), []);
  const flap = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.08, 0.05);
    s.lineTo(0.08, 0.05);
    s.lineTo(0, -0.01);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  useEffect(() => () => flap.dispose(), [flap]);
  return (
    <group>
      <mesh material={lib.paper}>
        <boxGeometry args={[0.16, 0.1, 0.003]} />
      </mesh>
      <mesh geometry={flap} material={lib.paper} position={[0, 0, -0.0018]} rotation={[0, Math.PI, 0]} />
      <mesh material={seal} position={[0, 0.005, -0.003]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.003, 20]} />
      </mesh>
    </group>
  );
}

export function Microphone() {
  const lib = useLib();
  return (
    <group>
      <mesh material={lib.darkMetal} position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.026, 24, 16]} />
      </mesh>
      <mesh material={lib.chrome} position={[0, 0.05, 0]}>
        <torusGeometry args={[0.026, 0.002, 8, 32]} />
      </mesh>
      <mesh material={lib.blackPlastic}>
        <cylinderGeometry args={[0.013, 0.016, 0.1, 20]} />
      </mesh>
    </group>
  );
}

export function SatelliteDish({ radius = 0.45 }: { radius?: number }) {
  const lib = useLib();
  const profile = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const r = (i / 24) * radius;
      pts.push(new THREE.Vector2(r, (r * r) / (radius * 2.2)));
    }
    return pts;
  }, [radius]);
  const dish = useMat(() => std({ color: "#d9dbde", roughness: 0.35, metalness: 0.3, side: THREE.DoubleSide }, 0.7), []);
  const feedY = radius * 0.55;
  return (
    <group>
      <mesh material={dish}>
        <latheGeometry args={[profile, 64]} />
      </mesh>
      <mesh material={lib.darkMetal} position={[0, feedY, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.08, 20]} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        const base = new THREE.Vector3(Math.cos(a) * radius * 0.85, (radius * radius * 0.72) / (radius * 2.2), Math.sin(a) * radius * 0.85);
        const top = new THREE.Vector3(0, feedY, 0);
        const mid = base.clone().add(top).multiplyScalar(0.5);
        const len = base.distanceTo(top);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(base).normalize());
        return (
          <mesh key={i} material={lib.metal} position={mid} quaternion={q}>
            <cylinderGeometry args={[0.006, 0.006, len, 8]} />
          </mesh>
        );
      })}
    </group>
  );
}
