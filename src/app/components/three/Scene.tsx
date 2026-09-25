"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { Effect, EffectPass, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import CameraRig from "./CameraRig";
import Sky from "./space/Sky";
import Planet, { PLANET_CENTER, SUN_DIR } from "./space/Planet";
import Sun from "./space/Sun";
import Asteroids from "./space/Asteroids";
import SpaceDust from "./space/SpaceDust";
import ForegroundDust from "./space/ForegroundDust";
import Rocket from "./rocket/Rocket";
import Interior from "./interior/Interior";
import { RevealDriver, useRevealPass } from "./Reveal";
import { IntroGraphDriver, useIntroGraphPass } from "./IntroGraph";
import { getRoomEnv } from "./interior/materials";
import { ROCKET_POSITION, ROCKET_ROTATION } from "./config";
import { scrollStore } from "../scroll/scrollStore";

export type Quality = "high" | "low";

/** Reflections for the hull: the sun, the planet's blue bounce, a cool rim. */
function SpaceEnvironment() {
  const sun = SUN_DIR.clone().multiplyScalar(30);
  const planet = PLANET_CENTER.clone().normalize().multiplyScalar(30);
  return (
    <Environment resolution={256} frames={1} environmentIntensity={1}>
      {/* The sun itself is lit by the directional light; a tiny, very bright disc here reflected as wobbly streaks on the hull. */}
      <Lightformer form="circle" intensity={2.4} color="#ffe6c8" position={sun.toArray()} scale={22} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={2.2} color="#5f8fd9" position={planet.toArray()} scale={[90, 90, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.45} color="#9fb4ff" position={[-22, 14, -18]} scale={[14, 40, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.22} color="#ffffff" position={[0, 30, 0]} scale={[40, 40, 1]} target={[0, 0, 0]} />
      <Lightformer form="ring" intensity={0.6} color="#ffd9b0" position={[18, -6, 24]} scale={6} target={[0, 0, 0]} />
    </Environment>
  );
}

/** Replaces NaN / Inf pixels: bloom would otherwise smear a single bad pixel into black blocks. */
class SanitizeEffect extends Effect {
  constructor() {
    super(
      "SanitizeEffect",
      /* glsl */ `
      // Bit test instead of isnan(): some shader compilers (D3D via ANGLE) optimise isnan away.
      bool notFinite(float x) { return (floatBitsToUint(x) & 0x7F800000u) == 0x7F800000u; }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        bool bad = notFinite(inputColor.r) || notFinite(inputColor.g) || notFinite(inputColor.b) || notFinite(inputColor.a);
        outputColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : max(inputColor, vec4(0.0));
      }`
    );
  }
}

function Effects({ quality }: { quality: Quality }) {
  const camera = useThree((s) => s.camera);
  // A pass of its own (not merged with bloom) so bloom reads the cleaned buffer.
  const sanitize = useMemo(() => new EffectPass(camera, new SanitizeEffect()), [camera]);
  useEffect(() => () => sanitize.dispose(), [sanitize]);
  // Opening: the reveal, then the floating graph drawn over it, both before bloom so they glow.
  const reveal = useRevealPass();
  const graph = useIntroGraphPass();
  return (
    <>
      <EffectComposer multisampling={quality === "high" ? 4 : 0} frameBufferType={THREE.HalfFloatType}>
        <primitive object={sanitize} dispose={null} />
        <primitive object={reveal.pass} dispose={null} />
        <primitive object={graph.pass} dispose={null} />
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1.05} luminanceSmoothing={0.25} radius={0.72} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.28} darkness={0.62} />
      </EffectComposer>
      <RevealDriver pass={reveal.pass} effect={reveal.effect} />
      <IntroGraphDriver pass={graph.pass} graph={graph.graph} />
    </>
  );
}

/** Pre-compiles every shader (including hidden decks), then lifts the loader. */
function Ready() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let cancelled = false;
    getRoomEnv(gl);
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    // Compile against an offscreen target: the composer renders the scene into
    // a linear HalfFloat buffer, which selects different shader variants than
    // drawing straight to the screen would.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    const pending = gl.compileAsync(scene, camera);
    gl.setRenderTarget(previous);
    hidden.forEach((o) => (o.visible = false));
    pending
      .catch(() => undefined)
      .then(() => {
        target.dispose();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (!cancelled) scrollStore.setReady();
          })
        );
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);

  return null;
}

/**
 * Reduced motion: every ambient loop (tumbling rocks, floating props, twinkles,
 * idle camera drift) reads state.clock.elapsedTime, so slowing that clock calms
 * them all at once. Scroll-driven motion is untouched: the visitor drives it.
 */
function AmbientClock() {
  const reduce = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const time = useRef(0);
  useFrame((state, delta) => {
    if (!reduce) return;
    time.current += Math.min(delta, 0.1) * 0.15;
    state.clock.elapsedTime = time.current;
  }, -2);
  return null;
}

export default function Scene({ quality }: { quality: Quality }) {
  const hi = quality === "high";
  return (
    <>
      <AmbientClock />
      <CameraRig />
      <SpaceEnvironment />
      <Sky size={hi ? 2048 : 1024} />
      <Planet />
      <Sun />
      <Asteroids count={hi ? 190 : 90} quality={quality} />
      <SpaceDust count={hi ? 1400 : 700} />
      <ForegroundDust count={hi ? 1800 : 900} />
      <group position={ROCKET_POSITION} rotation={ROCKET_ROTATION}>
        <Rocket />
        <Interior />
      </group>
      <Effects quality={quality} />
      <Ready />
    </>
  );
}
