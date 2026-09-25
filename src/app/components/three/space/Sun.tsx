"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SUN_DIR, PLANET_CENTER } from "./Planet";

// Key light (the sun), a faint blue planet bounce, and a visible sun
// disc with glare that stays at "infinity" like the stars.

const glareVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const glareFragment = /* glsl */ `
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float core = smoothstep(0.035, 0.028, r) * 30.0;
  float glow = exp(-r * 7.0) * 1.6 + exp(-r * 22.0) * 5.0;
  float streak = exp(-abs(p.y) * 180.0) * exp(-abs(p.x) * 2.2) * 2.2;
  float fade = smoothstep(1.0, 0.6, r);
  vec3 col = vec3(1.0, 0.93, 0.82) * (core + glow) * fade + vec3(0.55, 0.72, 1.0) * streak;
  gl_FragColor = vec4(col, 1.0);
}
`;

export default function Sun() {
  const camera = useThree((s) => s.camera);
  const glare = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.DirectionalLight>(null);
  const bounceDir = useMemo(() => PLANET_CENTER.clone().normalize(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glareVertex,
        fragmentShader: glareFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    if (light.current) {
      light.current.target.position.set(0, 0, 0);
      light.current.target.updateMatrixWorld();
    }
  }, []);

  useFrame(() => {
    if (glare.current) {
      glare.current.position.copy(camera.position).addScaledVector(SUN_DIR, 1500);
      glare.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <>
      <directionalLight ref={light} position={SUN_DIR.clone().multiplyScalar(120)} color="#fff1df" intensity={3.4} />
      <directionalLight position={bounceDir.clone().multiplyScalar(120)} color="#5d86d6" intensity={0.35} />
      <mesh ref={glare} material={material} frustumCulled={false} renderOrder={-5}>
        <planeGeometry args={[560, 560]} />
      </mesh>
    </>
  );
}
