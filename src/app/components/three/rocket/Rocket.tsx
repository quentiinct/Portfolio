"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BODY_BOTTOM,
  BODY_TOP,
  DECK_FLOORS,
  DOOR,
  DOOR_CENTER_Y,
  FIN_ANGLES,
  HULL_R,
  NOSE_TIP,
  WALL_A,
  WINDOWS,
  WINDOW_R,
  WINDOW_Y,
  deg,
  noseRadius,
  polar,
  smoothstep,
} from "../config";
import { createFinMaterial, createHullMaterial } from "./hullMaterial";
import { doorTexture, hazardTexture, labelTexture } from "../textures";
import { cameraState } from "../CameraRig";
import RcsPuffs from "./RcsPuffs";

// ═══════════════════════════════════════════════════════════════
// ROCKET — exterior of the ship: steel hull (lathe), heat shield,
// flaps, engines, portholes, animated airlock, nav lights, decals.
// ═══════════════════════════════════════════════════════════════

function hullGeometry() {
  const pts: THREE.Vector2[] = [];
  pts.push(new THREE.Vector2(HULL_R - 0.3, BODY_BOTTOM - 0.05));
  pts.push(new THREE.Vector2(HULL_R - 0.06, BODY_BOTTOM - 0.01));
  pts.push(new THREE.Vector2(HULL_R, BODY_BOTTOM + 0.1));
  for (let y = BODY_BOTTOM + 0.5; y < BODY_TOP; y += 0.5) pts.push(new THREE.Vector2(HULL_R, y));
  const L = NOSE_TIP - BODY_TOP;
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const u = L * (1 - Math.pow(1 - s, 1.7));
    pts.push(new THREE.Vector2(Math.max(noseRadius(u), 0.0005), BODY_TOP + u));
  }
  return new THREE.LatheGeometry(pts, 160);
}

function bellGeometry(throat: number, exit: number, length: number) {
  const pts: THREE.Vector2[] = [];
  pts.push(new THREE.Vector2(throat * 1.5, 0.55));
  pts.push(new THREE.Vector2(throat * 1.25, 0.25));
  pts.push(new THREE.Vector2(throat, 0));
  const N = 28;
  for (let i = 1; i <= N; i++) {
    const s = i / N;
    pts.push(new THREE.Vector2(throat + (exit - throat) * Math.pow(Math.sin((s * Math.PI) / 2), 0.85), -s * length));
  }
  // Reverse so normals face outward (profile must go bottom → top).
  pts.reverse();
  const geo = new THREE.LatheGeometry(pts, 48);
  // Heat tint gradient baked into vertex colours.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const bronze = new THREE.Color("#8a6a45");
  const violet = new THREE.Color("#4d4a6a");
  const dark = new THREE.Color("#2c2d31");
  for (let i = 0; i < pos.count; i++) {
    const s = Math.min(1, Math.max(0, -pos.getY(i) / length));
    if (s < 0.35) c.copy(bronze).lerp(violet, s / 0.35);
    else c.copy(violet).lerp(dark, (s - 0.35) / 0.65);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

function finGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.05, 0);
  shape.lineTo(2.2, 0.35);
  shape.quadraticCurveTo(3.25, 0.55, 3.3, 1.4);
  shape.lineTo(3.3, 5.6);
  shape.quadraticCurveTo(3.25, 6.6, 2.4, 7.1);
  shape.lineTo(-0.05, 9.2);
  shape.lineTo(-0.05, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, 0, -0.1);
  geo.computeVertexNormals();
  return geo;
}

/** Two stainless aft fins. */
function Fins() {
  const { geometry, material } = useMemo(() => ({ geometry: finGeometry(), material: createFinMaterial() }), []);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  return (
    <>
      {FIN_ANGLES.map((angle) => (
        <group key={angle} position={polar(angle, HULL_R - 0.02, BODY_BOTTOM + 0.6)} rotation={[0, angle - Math.PI / 2, 0]}>
          <mesh geometry={geometry} material={material} />
        </group>
      ))}
    </>
  );
}

function Engines() {
  const glowRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const { sea, vac, bellMat, plate, plateMat, skirtMat, glowColor } = useMemo(
    () => ({
      sea: bellGeometry(0.34, 0.66, 1.7),
      vac: bellGeometry(0.4, 1.12, 2.5),
      bellMat: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.85, roughness: 0.38, side: THREE.DoubleSide, envMapIntensity: 1.1 }),
      plate: new THREE.CircleGeometry(HULL_R - 0.05, 96),
      plateMat: new THREE.MeshStandardMaterial({ color: "#1d1f23", metalness: 0.6, roughness: 0.65 }),
      skirtMat: new THREE.MeshStandardMaterial({ color: "#2a2c30", metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide }),
      glowColor: new THREE.Color(0.4, 0.62, 1.0).multiplyScalar(2.4),
    }),
    []
  );
  useEffect(() => () => {
    [sea, vac, plate].forEach((g) => g.dispose());
    [bellMat, plateMat, skirtMat].forEach((m) => m.dispose());
  }, [sea, vac, plate, bellMat, plateMat, skirtMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    glowRefs.current.forEach((m, i) => {
      if (m) m.opacity = 0.55 + 0.25 * Math.sin(t * 9 + i * 1.7) * Math.sin(t * 3.1 + i);
    });
  });

  const engines = [
    ...[0, 120, 240].map((a) => ({ a: deg(a + 30), r: 0.95, geo: sea, exit: 0.66, len: 1.7 })),
    ...[60, 180, 300].map((a) => ({ a: deg(a + 30), r: 3.0, geo: vac, exit: 1.12, len: 2.5 })),
  ];

  return (
    <group position={[0, BODY_BOTTOM - 0.05, 0]}>
      <mesh geometry={plate} material={plateMat} rotation={[Math.PI / 2, 0, 0]} />
      {engines.map((e, i) => (
        <group key={i} position={polar(e.a, e.r, -0.55)}>
          <mesh geometry={e.geo} material={bellMat} />
          <mesh position={[0, 0.42, 0]} material={skirtMat}>
            <cylinderGeometry args={[0.5, 0.62, 0.9, 20, 1, true]} />
          </mesh>
          <mesh position={[0, -0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.36, 24]} />
            <meshBasicMaterial
              ref={(m) => {
                glowRefs.current[i] = m;
              }}
              color={glowColor}
              toneMapped={false}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Windows() {
  const { frameGeo, glassGeo, frameMat, glassMat } = useMemo(
    () => ({
      frameGeo: new THREE.TorusGeometry(WINDOW_R + 0.045, 0.04, 12, 48),
      glassGeo: new THREE.CircleGeometry(WINDOW_R + 0.01, 40),
      frameMat: new THREE.MeshStandardMaterial({ color: "#2b2e33", metalness: 0.8, roughness: 0.35 }),
      glassMat: new THREE.MeshPhysicalMaterial({
        color: "#0b0f14",
        metalness: 0,
        roughness: 0.03,
        transparent: true,
        opacity: 0.45,
        envMapIntensity: 2.2,
        clearcoat: 1,
        depthWrite: false,
        emissive: new THREE.Color("#ffb877"),
      }),
    }),
    []
  );
  useEffect(() => () => {
    frameGeo.dispose();
    glassGeo.dispose();
    frameMat.dispose();
    glassMat.dispose();
  }, [frameGeo, glassGeo, frameMat, glassMat]);

  // Warm cabin glow seen from afar, fading out as we get close enough to see inside.
  useFrame(() => {
    glassMat.emissiveIntensity = 1.3 * (1 - smoothstep(0.35, 0.95, cameraState.t));
  });

  return (
    <>
      {WINDOWS.map((w, i) => {
        const y = DECK_FLOORS[w.deck] + WINDOW_Y;
        return (
          <group key={i} rotation={[0, w.angle, 0]}>
            <mesh geometry={frameGeo} material={frameMat} position={[0, y, HULL_R + 0.005]} />
            <mesh geometry={glassGeo} material={glassMat} position={[0, y, HULL_R - 0.05]} />
          </group>
        );
      })}
    </>
  );
}

/** Airlock: sliding curved door + frame tunnel + status light. */
function Airlock() {
  const leaf = useRef<THREE.Group>(null);
  const lightMat = useRef<THREE.MeshBasicMaterial>(null);
  const halfAngle = (DOOR.width / 2 + 0.05) / HULL_R;
  const { leafGeo, leafInnerGeo, leafMat, innerMat, frameMat, hazardMat } = useMemo(() => {
    const tex = doorTexture();
    const hz = hazardTexture().clone();
    hz.wrapS = hz.wrapT = THREE.RepeatWrapping;
    hz.repeat.set(1, 1);
    hz.needsUpdate = true;
    return {
      leafGeo: new THREE.CylinderGeometry(HULL_R + 0.035, HULL_R + 0.035, DOOR.height + 0.1, 20, 1, true, -halfAngle, halfAngle * 2),
      leafInnerGeo: new THREE.CylinderGeometry(HULL_R - 0.03, HULL_R - 0.03, DOOR.height + 0.1, 20, 1, true, -halfAngle, halfAngle * 2),
      leafMat: new THREE.MeshStandardMaterial({ map: tex, metalness: 0.55, roughness: 0.42, envMapIntensity: 1.0 }),
      innerMat: new THREE.MeshStandardMaterial({ color: "#8d9298", metalness: 0.4, roughness: 0.5, side: THREE.BackSide }),
      frameMat: new THREE.MeshStandardMaterial({ color: "#3a3e44", metalness: 0.75, roughness: 0.4 }),
      hazardMat: new THREE.MeshStandardMaterial({ map: hz, metalness: 0.2, roughness: 0.6 }),
    };
  }, [halfAngle]);

  const colors = useMemo(() => ({ open: new THREE.Color(0.2, 1.0, 0.45), closed: new THREE.Color(1.0, 0.18, 0.12) }), []);

  useFrame((state) => {
    const t = cameraState.t;
    // Opens as we approach, closes behind us once aboard.
    const open = smoothstep(0.8, 1.2, t) * (1 - smoothstep(1.75, 2.1, t));
    if (leaf.current) leaf.current.rotation.y = DOOR.angle + open * (halfAngle * 2 + 0.03);
    if (lightMat.current) {
      const blink = 0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 6);
      const isOpen = open > 0.05;
      lightMat.current.color.copy(isOpen ? colors.open : colors.closed).multiplyScalar(3.2 * (isOpen ? 1 : blink));
    }
  });

  const w = DOOR.width;
  const h = DOOR.height;
  const tf = 0.08;
  const depth = WALL_A - 0.05;
  const zc = (depth + HULL_R + 0.1) / 2;
  const len = HULL_R + 0.1 - depth;

  return (
    <>
      <group ref={leaf} rotation={[0, DOOR.angle, 0]}>
        <mesh geometry={leafGeo} material={leafMat} position={[0, DOOR_CENTER_Y, 0]} />
        <mesh geometry={leafInnerGeo} material={innerMat} position={[0, DOOR_CENTER_Y, 0]} />
      </group>
      <group rotation={[0, DOOR.angle, 0]}>
        {/* tunnel between hull and interior wall */}
        <mesh material={frameMat} position={[-(w / 2 + tf / 2), DOOR_CENTER_Y, zc]}>
          <boxGeometry args={[tf, h + tf * 2, len]} />
        </mesh>
        <mesh material={frameMat} position={[w / 2 + tf / 2, DOOR_CENTER_Y, zc]}>
          <boxGeometry args={[tf, h + tf * 2, len]} />
        </mesh>
        <mesh material={frameMat} position={[0, DOOR_CENTER_Y + h / 2 + tf / 2, zc]}>
          <boxGeometry args={[w + tf * 2, tf, len]} />
        </mesh>
        <mesh material={frameMat} position={[0, DOOR_CENTER_Y - h / 2 - tf / 2, zc]}>
          <boxGeometry args={[w + tf * 2, tf, len]} />
        </mesh>
        {/* status light */}
        <mesh position={[0, DOOR_CENTER_Y + h / 2 + 0.38, HULL_R + 0.06]}>
          <boxGeometry args={[0.34, 0.07, 0.05]} />
          <meshBasicMaterial ref={lightMat} toneMapped={false} />
        </mesh>
      </group>
      {/* hazard stripes wrapped on the hull above and below the opening */}
      <HullDecal texture={hazardMat.map!} angle={DOOR.angle} y={DOOR_CENTER_Y + h / 2 + 0.16} width={w + 0.55} height={0.11} r={HULL_R + 0.008} />
      <HullDecal texture={hazardMat.map!} angle={DOOR.angle} y={DOOR_CENTER_Y - h / 2 - 0.16} width={w + 0.55} height={0.11} r={HULL_R + 0.008} />
    </>
  );
}

/** Curved decal wrapped on the hull. */
function HullDecal({ texture, angle, y, width, height, r = HULL_R + 0.006, opacity = 1 }: { texture: THREE.Texture; angle: number; y: number; width: number; height: number; r?: number; opacity?: number }) {
  const half = width / 2 / r;
  return (
    <mesh position={[0, y, 0]} rotation={[0, angle, 0]} renderOrder={2}>
      <cylinderGeometry args={[r, r, height, 24, 1, true, -half, half * 2]} />
      <meshStandardMaterial map={texture} transparent opacity={opacity} metalness={0.2} roughness={0.55} polygonOffset polygonOffsetFactor={-2} depthWrite={false} />
    </mesh>
  );
}

function Decals() {
  const name = useMemo(
    () =>
      labelTexture(
        "hull-name",
        [{ text: "QC-01", size: 250, weight: 800, color: "#15171b", spacing: 24, font: "display" }],
        1400,
        380,
        { stencil: true }
      ),
    []
  );
  const crew = useMemo(
    () =>
      labelTexture(
        "hull-crew",
        [
          { text: "CREW ACCESS", size: 54, weight: 800, color: "#15171b", spacing: 6, font: "display" },
          { text: "DECK 01 · AIRLOCK", size: 40, weight: 600, color: "#2a2d33", spacing: 4 },
        ],
        700,
        200,
        { stencil: true }
      ),
    []
  );
  return (
    <>
      <group rotation={[0, 0, 0]}>
        <mesh position={[0, -7.5, 0]} rotation={[0, deg(52), 0]} renderOrder={2}>
          <cylinderGeometry args={[HULL_R + 0.006, HULL_R + 0.006, 2.1, 32, 1, true, -0.9, 1.8]} />
          <meshStandardMaterial map={name} transparent metalness={0.3} roughness={0.5} polygonOffset polygonOffsetFactor={-2} depthWrite={false} />
        </mesh>
      </group>
      <HullDecal texture={crew} angle={DOOR.angle} y={DOOR_CENTER_Y + DOOR.height / 2 + 0.72} width={1.4} height={0.4} />
    </>
  );
}

function NavLights() {
  const refs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const lights = useMemo(
    () => [
      { pos: polar(deg(-60), HULL_R + 0.08, 14.2), color: new THREE.Color(1, 0.08, 0.06), mode: "steady" },
      { pos: polar(deg(95), HULL_R + 0.08, 14.2), color: new THREE.Color(0.1, 1, 0.3), mode: "steady" },
      { pos: new THREE.Vector3(0, NOSE_TIP + 0.12, 0), color: new THREE.Color(1, 1, 1), mode: "strobe" },
      { pos: polar(deg(30), HULL_R + 0.08, BODY_BOTTOM + 1.2), color: new THREE.Color(1, 1, 1), mode: "strobe2" },
      { pos: polar(deg(200), HULL_R + 0.08, BODY_BOTTOM + 1.2), color: new THREE.Color(1, 0.2, 0.1), mode: "beacon" },
    ],
    []
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    lights.forEach((l, i) => {
      const m = refs.current[i];
      if (!m) return;
      let k = 1;
      const ph = t % 1.6;
      if (l.mode === "strobe") k = ph < 0.06 || (ph > 0.18 && ph < 0.24) ? 1 : 0.02;
      if (l.mode === "strobe2") k = (t + 0.8) % 1.6 < 0.06 ? 1 : 0.02;
      if (l.mode === "beacon") k = 0.15 + 0.85 * Math.pow(Math.max(0, Math.sin(t * 3)), 6);
      m.color.copy(l.color).multiplyScalar(k * (l.mode === "steady" ? 4 : 14));
    });
  });
  return (
    <>
      {lights.map((l, i) => (
        <mesh key={i} position={l.pos}>
          <sphereGeometry args={[0.07, 12, 8]} />
          <meshBasicMaterial
            ref={(m) => {
              refs.current[i] = m;
            }}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

function Details() {
  const { metal, dark } = useMemo(
    () => ({
      metal: new THREE.MeshStandardMaterial({ color: "#9aa0a7", metalness: 0.9, roughness: 0.32, envMapIntensity: 1.2 }),
      dark: new THREE.MeshStandardMaterial({ color: "#26292e", metalness: 0.7, roughness: 0.45 }),
    }),
    []
  );
  useEffect(() => () => {
    metal.dispose();
    dark.dispose();
  }, [metal, dark]);

  const racewayAngle = deg(120);
  const rcs = [deg(60), deg(150), deg(-30)];
  return (
    <>
      {/* Raceway (cable tray) running along the body */}
      <group rotation={[0, racewayAngle, 0]}>
        <mesh material={metal} position={[0, (BODY_BOTTOM + BODY_TOP) / 2 - 1, HULL_R + 0.1]}>
          <boxGeometry args={[0.3, BODY_TOP - BODY_BOTTOM - 4, 0.2]} />
        </mesh>
        {Array.from({ length: 18 }, (_, i) => (
          <mesh key={i} material={dark} position={[0, BODY_BOTTOM + 3 + i * 2, HULL_R + 0.21]}>
            <boxGeometry args={[0.34, 0.06, 0.03]} />
          </mesh>
        ))}
      </group>
      {/* RCS thruster pods near the nose */}
      {rcs.map((a, i) => (
        <group key={i} rotation={[0, a, 0]} position={[0, BODY_TOP + 1.2, 0]}>
          <mesh material={dark} position={[0, 0, noseRadius(1.2) - 0.02]}>
            <boxGeometry args={[0.5, 0.36, 0.22]} />
          </mesh>
          <mesh material={metal} position={[0.12, 0, noseRadius(1.2) + 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.16, 12, 1, true]} />
          </mesh>
          <mesh material={metal} position={[-0.12, 0, noseRadius(1.2) + 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.16, 12, 1, true]} />
          </mesh>
        </group>
      ))}
      {/* Antennas */}
      <group rotation={[0, deg(80), 0]}>
        <mesh material={metal} position={[0, BODY_TOP - 0.6, HULL_R + 0.35]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        </mesh>
        <mesh material={metal} position={[0, BODY_TOP - 0.2, HULL_R + 0.35]} rotation={[Math.PI / 2.4, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.02, 0.12, 20, 1, true]} />
        </mesh>
      </group>
      <group rotation={[0, deg(170), 0]}>
        <mesh material={metal} position={[0, 2, HULL_R + 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.6, 6]} />
        </mesh>
      </group>
    </>
  );
}

export default function Rocket() {
  const { hullGeo, hullMat } = useMemo(() => ({ hullGeo: hullGeometry(), hullMat: createHullMaterial() }), []);
  useEffect(() => () => {
    hullGeo.dispose();
    hullMat.dispose();
  }, [hullGeo, hullMat]);

  return (
    <group>
      <mesh geometry={hullGeo} material={hullMat} />
      <Fins />
      <Engines />
      <Windows />
      <Airlock />
      <Decals />
      <NavLights />
      <Details />
      <RcsPuffs />
    </group>
  );
}
