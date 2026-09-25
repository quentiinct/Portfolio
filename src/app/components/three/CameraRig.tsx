"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { scrollStore } from "../scroll/scrollStore";
import { rocketMatrix, rocketQuaternion, sampleCamera } from "./cameraPath";
import { smoothstep } from "./config";
import { pointer, updatePointerRay } from "./pointer";

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const ROCKET_UP = new THREE.Vector3(0, 1, 0).applyQuaternion(rocketQuaternion);

/** Shared, damped chapter time — every animated object reads this one. */
export const cameraState = { t: 0, inside: 0 };

export default function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const smoothT = useRef<number | null>(null);
  const mouse = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const tmp = useRef({
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    up: new THREE.Vector3(),
    right: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    camUp: new THREE.Vector3(),
  });

  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastT = performance.now();
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouse.current.x = x;
      mouse.current.y = y;
      const now = performance.now();
      const dt = Math.max(8, now - lastT) / 1000;
      const v = Math.hypot(x - lastX, y - lastY) / 2 / dt;
      pointer.speed = Math.max(pointer.speed, Math.min(v, 6));
      lastX = x;
      lastY = y;
      lastT = now;
      pointer.ndc.set(x, -y);
      pointer.active = e.pointerType === "mouse";
    };
    const onLeave = () => {
      pointer.active = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const target = scrollStore.get().t;
    if (smoothT.current === null) smoothT.current = target;
    smoothT.current = THREE.MathUtils.damp(smoothT.current, target, 3.6, dt);
    const t = smoothT.current;
    cameraState.t = t;
    cameraState.inside = smoothstep(1.45, 1.6, t);

    const { pos, look, up, right, fwd, camUp } = tmp.current;
    sampleCamera(t, pos, look);
    pos.applyMatrix4(rocketMatrix);
    look.applyMatrix4(rocketMatrix);

    // Up vector: world-up in open space, ship-up once aboard.
    up.copy(WORLD_UP).lerp(ROCKET_UP, smoothstep(0.5, 1.2, t)).normalize();

    // Portrait screens: the text sits below the scene instead of beside it,
    // so frame the ship smaller and higher (clear of the hero text) and
    // swing the view toward the props aboard.
    const portrait = THREE.MathUtils.clamp((1.15 - camera.aspect) / 0.55, 0, 1);
    if (portrait > 0) {
      const ext = (1 - smoothstep(0.35, 0.9, t)) * portrait;
      if (ext > 0) {
        fwd.set(0, 4, 0).applyMatrix4(rocketMatrix);
        look.lerp(fwd, 0.85 * ext).addScaledVector(WORLD_UP, -17 * ext);
        fwd.subVectors(pos, look).multiplyScalar(0.55 * ext);
        pos.add(fwd);
      }
      const aboard = smoothstep(1.7, 2.0, t) * portrait;
      if (aboard > 0) {
        fwd.subVectors(look, pos).applyAxisAngle(up, -0.34 * aboard);
        look.addVectors(pos, fwd);
      }
    }

    // Mouse parallax + a slow idle drift so the scene never feels frozen.
    const m = mouse.current;
    m.sx = THREE.MathUtils.damp(m.sx, m.x, 2.5, dt);
    m.sy = THREE.MathUtils.damp(m.sy, m.y, 2.5, dt);
    fwd.subVectors(look, pos);
    const dist = fwd.length();
    fwd.normalize();
    right.crossVectors(fwd, up).normalize();
    camUp.crossVectors(right, fwd).normalize();

    const time = state.clock.elapsedTime;
    const outside = 1 - smoothstep(0.6, 1.1, t);
    const parallax = dist * (0.035 * outside + 0.05 * (1 - outside));
    look.addScaledVector(right, m.sx * parallax).addScaledVector(camUp, -m.sy * parallax * 0.6);
    pos
      .addScaledVector(right, Math.sin(time * 0.13) * 1.6 * outside + Math.sin(time * 0.37) * 0.015)
      .addScaledVector(camUp, Math.sin(time * 0.17) * 0.9 * outside + Math.sin(time * 0.29) * 0.012);

    camera.position.copy(pos);
    camera.up.copy(up);
    camera.lookAt(look);

    // Longer lens outside (less distortion on the ship), wider aboard.
    const fov = THREE.MathUtils.lerp(38, 62, smoothstep(1.1, 1.9, t));
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    camera.updateMatrixWorld();
    updatePointerRay(camera);
    pointer.speed *= Math.exp(-4 * dt);
  }, -1);

  return null;
}
