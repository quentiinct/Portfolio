"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { materials } from "./materials";
import { makeCanvas, toTexture } from "../textures";
import { mulberry32 } from "../config";
import { pointer } from "../pointer";

export function useLib() {
  const gl = useThree((s) => s.gl);
  return materials(gl);
}

/** True when the object and all its ancestors are visible (i.e. its deck is shown). */
function isShown(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

// ─── Zero-gravity float ───────────────────────────────────────
// Slow drift on three axes + a lazy tumble around a random axis.

export function Floating({
  position,
  children,
  seed = 1,
  amp = 0.05,
  speed = 0.45,
  spin = 0.22,
  scale = 1,
  face,
}: {
  position: [number, number, number];
  children: ReactNode;
  seed?: number;
  amp?: number;
  speed?: number;
  spin?: number;
  scale?: number;
  /** Keep the object's +Z turned toward this point (screens, photos) with a gentle sway instead of a tumble. */
  face?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  const { axis, q0, qs, sway, phys } = useMemo(() => {
    const rng = mulberry32(seed * 97 + 13);
    return {
      axis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
      q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 6.28, rng() * 6.28, rng() * 6.28)),
      qs: new THREE.Quaternion(),
      sway: new THREE.Euler(),
      // Cursor nudges: velocity + extra spin, damped by cabin air and a soft tether home.
      phys: {
        offset: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        spinAxis: new THREE.Vector3(0, 1, 0),
        spinVel: 0,
        spinAngle: 0,
        wp: new THREE.Vector3(),
        cp: new THREE.Vector3(),
        push: new THREE.Vector3(),
        pq: new THREE.Quaternion(),
        extra: new THREE.Quaternion(),
      },
    };
  }, [seed]);
  const yaw = face ? Math.atan2(face[0] - position[0], face[2] - position[2]) : 0;

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime + seed * 7.3;

    if (pointer.active && pointer.speed > 0.05 && isShown(g)) {
      g.getWorldPosition(phys.wp);
      const reach = 0.16 + 0.1 * scale;
      const d = pointer.ray.distanceToPoint(phys.wp);
      if (d < reach) {
        pointer.ray.closestPointToPoint(phys.wp, phys.cp);
        phys.push.subVectors(phys.wp, phys.cp);
        if (phys.push.lengthSq() < 1e-8) phys.push.set(0, 1, 0);
        phys.push.normalize();
        g.parent!.getWorldQuaternion(phys.pq).invert();
        phys.push.applyQuaternion(phys.pq);
        const k = (1 - d / reach) * Math.min(pointer.speed, 2.2);
        phys.vel.addScaledVector(phys.push, k * 9 * dt);
        if (phys.vel.length() > 1.1) phys.vel.setLength(1.1);
        phys.spinAxis.set(phys.push.z, 0.35, -phys.push.x).normalize();
        phys.spinVel = Math.min(phys.spinVel + k * 14 * dt, 5);
      }
    }
    phys.offset.addScaledVector(phys.vel, dt);
    phys.vel.multiplyScalar(Math.exp(-0.9 * dt));
    phys.offset.multiplyScalar(Math.exp(-0.3 * dt));
    phys.spinAngle += phys.spinVel * dt;
    phys.spinVel *= Math.exp(-0.7 * dt);
    if (face) phys.spinAngle *= Math.exp(-0.8 * dt);

    g.position.set(
      position[0] + Math.sin(t * speed * 0.9) * amp + phys.offset.x,
      position[1] + Math.sin(t * speed * 1.13 + 1.7) * amp * 1.3 + phys.offset.y,
      position[2] + Math.cos(t * speed * 0.71) * amp + phys.offset.z
    );
    if (face) {
      sway.set(Math.sin(t * 0.31) * 0.14, yaw + Math.sin(t * 0.23) * 0.28, Math.sin(t * 0.27) * 0.1);
      g.quaternion.setFromEuler(sway);
    } else {
      qs.setFromAxisAngle(axis, t * spin);
      g.quaternion.copy(q0).premultiply(qs);
    }
    if (phys.spinAngle !== 0) {
      phys.extra.setFromAxisAngle(phys.spinAxis, phys.spinAngle);
      g.quaternion.premultiply(phys.extra);
    }
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      {children}
    </group>
  );
}

// ─── Hologram shader ──────────────────────────────────────────

const holoVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  vN = normalMatrix * normal;
  vP = position;
  gl_Position = projectionMatrix * mv;
}
`;

const holoFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uOpacity;
uniform float uScan;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  float fres = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.2);
  float scan = 0.6 + 0.4 * sin(vP.y * uScan - uTime * 4.0);
  float sweep = smoothstep(0.92, 1.0, fract(vP.y * 0.9 - uTime * 0.35));
  float flick = 0.92 + 0.08 * sin(uTime * 41.0) * sin(uTime * 17.0);
  float a = (0.12 + fres * 1.1 + sweep * 0.6) * scan * flick * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
}
`;

export function makeHoloMaterial(color: THREE.ColorRepresentation, opacity = 1, scan = 60) {
  return new THREE.ShaderMaterial({
    vertexShader: holoVertex,
    fragmentShader: holoFragment,
    uniforms: {
      uColor: { value: new THREE.Color(color).multiplyScalar(2.2) },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uScan: { value: scan },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/** Creates a hologram material and advances its clock. */
export function useHolo(color: THREE.ColorRepresentation, opacity = 1, scan = 60) {
  const mat = useMemo(() => makeHoloMaterial(color, opacity, scan), [color, opacity, scan]);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return mat;
}

// ─── Animated canvas screen ───────────────────────────────────

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => void;

export function useCanvasTexture(draw: DrawFn, w = 512, h = 320, fps = 8, isActive: () => boolean = () => true) {
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);
  const { ctx, texture } = useMemo(() => {
    const { canvas, ctx } = makeCanvas(w, h);
    return { ctx, texture: toTexture(canvas, { anisotropy: 4 }) };
  }, [w, h]);
  const last = useRef(-1);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (last.current >= 0 && (t - last.current < 1 / fps || !isActive())) return;
    last.current = t;
    drawRef.current(ctx, w, h, t);
    texture.needsUpdate = true;
  });
  return texture;
}

export function Screen({
  width,
  height,
  draw,
  res = 512,
  fps = 8,
  intensity = 1.35,
  isActive,
}: {
  width: number;
  height: number;
  draw: DrawFn;
  res?: number;
  fps?: number;
  intensity?: number;
  isActive?: () => boolean;
}) {
  const h = Math.round((res * height) / width);
  const texture = useCanvasTexture(draw, res, h, fps, isActive);
  const color = useMemo(() => new THREE.Color(intensity, intensity, intensity), [intensity]);
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} color={color} toneMapped={false} />
    </mesh>
  );
}
