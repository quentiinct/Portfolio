"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32, smoothstep } from "../config";
import { cameraState } from "../CameraRig";

// Fine particles wrapped in a box around the camera: they give a sense
// of speed and depth while flying toward the ship (outside only).

const BOX = 60;

const vertex = /* glsl */ `
attribute float aSeed;
uniform vec3 uCam;
uniform float uPixelRatio;
uniform float uOpacity;
varying float vA;
void main() {
  vec3 rel = mod(position - uCam, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)};
  vec3 world = uCam + rel;
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = length(rel);
  vA = uOpacity * smoothstep(${(BOX / 2).toFixed(1)}, ${(BOX / 5).toFixed(1)}, d) * smoothstep(0.8, 4.0, d) * (0.4 + 0.6 * aSeed);
  gl_PointSize = (1.2 + aSeed * 2.4) * uPixelRatio * 18.0 / -mv.z;
}
`;
const fragment = /* glsl */ `
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = exp(-dot(c, c) * 16.0) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * a, a);
}
`;

export default function SpaceDust({ count = 1400 }: { count?: number }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const camera = useThree((s) => s.camera);
  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(12);
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([rng() * BOX, rng() * BOX, rng() * BOX], i * 3);
      seeds[i] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uCam: { value: new THREE.Vector3() }, uPixelRatio: { value: 1 }, uOpacity: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, [count]);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(() => {
    material.uniforms.uCam.value.copy(camera.position);
    material.uniforms.uPixelRatio.value = dpr;
    material.uniforms.uOpacity.value = 1 - smoothstep(0.95, 1.35, cameraState.t);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
