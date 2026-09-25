"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BODY_TOP, deg, mulberry32, noseRadius, polar } from "../config";

// Short bursts of cold gas from the attitude-control thrusters.

const MAX = 320;
const LIFE = 1.6;

const vertex = /* glsl */ `
attribute vec3 aVel;
attribute float aBirth;
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  float age = uTime - aBirth;
  float life = ${LIFE.toFixed(2)} * (0.7 + 0.5 * aSeed);
  float k = clamp(age / life, 0.0, 1.0);
  vec3 p = position + aVel * (age - 0.35 * age * k);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float alive = step(0.0, age) * step(age, life);
  vAlpha = alive * (1.0 - k) * (1.0 - k) * smoothstep(0.0, 0.05, age);
  gl_PointSize = alive * (60.0 + 260.0 * k) * uPixelRatio / -mv.z;
}
`;

const fragment = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = exp(-dot(c, c) * 10.0) * vAlpha * 0.32;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
}
`;

export default function RcsPuffs() {
  const dpr = useThree((s) => s.viewport.dpr);
  const next = useRef(2.5);
  const cursor = useRef(0);
  const rng = useMemo(() => mulberry32(99), []);

  const nozzles = useMemo(
    () =>
      [deg(60), deg(150), deg(-30)].flatMap((a) => {
        const r = noseRadius(1.2) + 0.2;
        const out = polar(a, 1, 0).normalize();
        const side = polar(a + Math.PI / 2, 1, 0).normalize();
        return [-0.12, 0.12].map((s) => ({ pos: polar(a, r, BODY_TOP + 1.2).addScaledVector(side, s), dir: out }));
      }),
    []
  );

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    geometry.setAttribute("aVel", new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    geometry.setAttribute("aBirth", new THREE.BufferAttribute(new Float32Array(MAX).fill(-100), 1));
    const seeds = mulberry32(5);
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(MAX).map(() => seeds()), 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    material.uniforms.uTime.value = time;
    material.uniforms.uPixelRatio.value = dpr;
    if (time < next.current) return;
    next.current = time + 2.8 + rng() * 4;

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const vel = geometry.attributes.aVel as THREE.BufferAttribute;
    const birth = geometry.attributes.aBirth as THREE.BufferAttribute;
    const n = nozzles[Math.floor(rng() * nozzles.length)];
    const pair = nozzles.filter((z) => z.dir.equals(n.dir));
    for (const nz of pair) {
      for (let i = 0; i < 32; i++) {
        const idx = cursor.current;
        cursor.current = (cursor.current + 1) % MAX;
        pos.setXYZ(idx, nz.pos.x, nz.pos.y, nz.pos.z);
        const speed = 3 + rng() * 4;
        vel.setXYZ(
          idx,
          nz.dir.x * speed + (rng() - 0.5) * 1.6,
          nz.dir.y * speed + (rng() - 0.5) * 1.6,
          nz.dir.z * speed + (rng() - 0.5) * 1.6
        );
        birth.setX(idx, time + rng() * 0.25);
      }
    }
    pos.needsUpdate = true;
    vel.needsUpdate = true;
    birth.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
