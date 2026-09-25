"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLSL_HASH, GLSL_SIMPLEX } from "../glsl";

// ═══════════════════════════════════════════════════════════════
// PLANET — procedural ocean world seen from orbit: continents, ice
// caps, drifting clouds, sun glint on the oceans, city lights on the
// night side and a thin scattering atmosphere on the limb.
// ═══════════════════════════════════════════════════════════════

/** Direction toward the sun (world space). */
export const SUN_DIR = new THREE.Vector3(0.919, 0.388, -0.066).normalize();

export const PLANET_CENTER = new THREE.Vector3(-930, -1470, -570);
export const PLANET_RADIUS = 1400;

const vertex = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vObj;
void main() {
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const surfaceFragment = /* glsl */ `
${GLSL_HASH}
${GLSL_SIMPLEX}
uniform vec3 uSunDir;
uniform float uTime;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vObj;

void main() {
  vec3 n = normalize(vNormalW);
  vec3 p = normalize(vObj);
  vec3 V = normalize(cameraPosition - vPosW);
  float NdL = dot(n, uSunDir);

  // Continents with domain warping.
  float warp = fbm(p * 1.7, 4);
  float h = fbm(p * 2.3 + warp * 0.85, 6);
  float land = smoothstep(0.035, 0.07, h);
  float detail = fbm(p * 11.0, 4);
  vec3 ocean = mix(vec3(0.003, 0.014, 0.05), vec3(0.008, 0.06, 0.11), smoothstep(-0.2, 0.05, h));
  vec3 landCol = mix(vec3(0.05, 0.075, 0.03), vec3(0.19, 0.15, 0.085), smoothstep(0.08, 0.34, h + detail * 0.12));
  landCol = mix(landCol, vec3(0.36, 0.32, 0.27), smoothstep(0.32, 0.55, h + detail * 0.08));
  vec3 surf = mix(ocean, landCol, land);
  float ice = smoothstep(0.8, 0.88, abs(p.y) + fbm(p * 6.0, 3) * 0.07);
  surf = mix(surf, vec3(0.75, 0.8, 0.86), ice);

  // Clouds (slowly drifting, swirled).
  vec3 cp = p + vec3(uTime * 0.0012, 0.0, uTime * 0.0006);
  float c = fbm(cp * 3.1 + fbm(cp * 1.4 + 5.0, 3) * 1.3, 6);
  float clouds = smoothstep(0.0, 0.45, c) * 0.93;

  float diff = max(NdL, 0.0);
  float terminator = smoothstep(-0.12, 0.25, NdL);

  vec3 col = surf * diff * 1.7;
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(n, H), 0.0), 140.0) * (1.0 - land) * (1.0 - clouds) * diff;
  col += vec3(1.0, 0.9, 0.76) * spec * 2.5;
  col = mix(col, vec3(0.9, 0.93, 0.97) * (diff * 1.45 + 0.004), clouds);

  // City lights on the night side.
  float night = smoothstep(0.02, -0.18, NdL);
  float cities = land * (1.0 - ice) * step(0.74, hash13(floor(p * 480.0))) * smoothstep(0.0, 0.25, fbm(p * 16.0, 3));
  col += vec3(1.0, 0.6, 0.26) * cities * night * (1.0 - clouds * 0.85) * 0.6;

  // Atmospheric in-scattering toward the limb.
  float fres = pow(1.0 - max(dot(n, V), 0.0), 2.6);
  vec3 sky = mix(vec3(1.0, 0.45, 0.2), vec3(0.28, 0.55, 1.0), smoothstep(-0.05, 0.3, NdL));
  col += sky * fres * terminator * 0.75;
  col = mix(col, col + vec3(0.02, 0.05, 0.1) * terminator, 0.6);

  gl_FragColor = vec4(col, 1.0);
}
`;

const atmosphereFragment = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uCenter;
uniform float uInner;
uniform float uOuter;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vObj;
void main() {
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 center = uCenter;
  // Closest approach of the view ray to the planet centre → altitude through the shell.
  vec3 toC = center - cameraPosition;
  vec3 dir = -V;
  float tc = dot(toC, dir);
  float dClosest = length(toC - dir * tc);
  float alt = clamp((dClosest - uInner) / (uOuter - uInner), 0.0, 1.0);
  float glow = pow(1.0 - alt, 3.5) * step(uInner * 0.985, dClosest);
  vec3 limbN = normalize(cameraPosition + dir * tc - center);
  float sun = dot(limbN, uSunDir);
  float lit = smoothstep(-0.25, 0.35, sun);
  vec3 col = mix(vec3(1.0, 0.42, 0.18), vec3(0.3, 0.58, 1.0), smoothstep(-0.05, 0.4, sun));
  gl_FragColor = vec4(col * glow * lit * 1.6, 1.0);
}
`;

export default function Planet() {
  const surfaceRef = useRef<THREE.Mesh>(null);

  const { surface, atmosphere } = useMemo(() => {
    const surface = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: surfaceFragment,
      uniforms: { uSunDir: { value: SUN_DIR }, uTime: { value: 0 } },
    });
    const atmosphere = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: atmosphereFragment,
      uniforms: {
        uSunDir: { value: SUN_DIR },
        uCenter: { value: PLANET_CENTER },
        uInner: { value: PLANET_RADIUS },
        uOuter: { value: PLANET_RADIUS * 1.035 },
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { surface, atmosphere };
  }, []);

  useEffect(() => () => {
    surface.dispose();
    atmosphere.dispose();
  }, [surface, atmosphere]);

  useFrame((state) => {
    surface.uniforms.uTime.value = state.clock.elapsedTime;
    if (surfaceRef.current) surfaceRef.current.rotation.y = state.clock.elapsedTime * 0.0015;
  });

  return (
    <group position={PLANET_CENTER}>
      <mesh ref={surfaceRef} material={surface} rotation={[0.35, 0, 0.2]}>
        <sphereGeometry args={[PLANET_RADIUS, 160, 120]} />
      </mesh>
      <mesh material={atmosphere}>
        <sphereGeometry args={[PLANET_RADIUS * 1.035, 128, 96]} />
      </mesh>
    </group>
  );
}
