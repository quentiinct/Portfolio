import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ceilingTexture, floorTextures, wallTextures } from "../textures";

// ═══════════════════════════════════════════════════════════════
// INTERIOR MATERIALS
//
// Aboard, surfaces must not be lit by the sun (there is no shadowing
// through the hull), so every interior material is patched to ignore
// directional lights. They get soft image-based lighting from a
// RoomEnvironment instead, plus the deck point lights.
// ═══════════════════════════════════════════════════════════════

const NO_SUN = THREE.ShaderChunk.lights_fragment_begin.replace(
  "getDirectionalLightInfo( directionalLight, directLight );",
  "getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= 0.0;"
);

let roomEnv: THREE.Texture | null = null;
const waitingForEnv = new Set<THREE.MeshStandardMaterial>();

export function getRoomEnv(gl: THREE.WebGLRenderer) {
  if (!roomEnv) {
    const pmrem = new THREE.PMREMGenerator(gl);
    roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    waitingForEnv.forEach((m) => {
      m.envMap = roomEnv;
      m.needsUpdate = true;
    });
    waitingForEnv.clear();
  }
  return roomEnv;
}

/** Make a lit material "interior": no sun, room reflections. */
export function interior<T extends THREE.MeshStandardMaterial>(mat: T, envIntensity = 0.45): T {
  const previous = mat.onBeforeCompile;
  const key = mat.customProgramCacheKey();
  mat.onBeforeCompile = (shader, renderer) => {
    previous.call(mat, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_begin>", NO_SUN);
  };
  mat.customProgramCacheKey = () => `interior|${key}`;
  if (roomEnv) mat.envMap = roomEnv;
  else waitingForEnv.add(mat);
  mat.envMapIntensity = envIntensity;
  return mat;
}

export function std(params: THREE.MeshStandardMaterialParameters, env = 0.45) {
  return interior(new THREE.MeshStandardMaterial(params), env);
}

export function phys(params: THREE.MeshPhysicalMaterialParameters, env = 0.6) {
  return interior(new THREE.MeshPhysicalMaterial(params), env);
}

/** Unlit glowing material (feeds the bloom pass). */
export function glow(color: THREE.ColorRepresentation, intensity = 3, opts: THREE.MeshBasicMaterialParameters = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false, ...opts });
}

type Library = ReturnType<typeof buildLibrary>;
let library: Library | null = null;

function buildLibrary() {
  const wall = wallTextures();
  const floor = floorTextures();
  floor.repeat.set(0.5, 0.5);
  (floor.userData.bump as THREE.Texture).repeat.set(0.5, 0.5);
  const ceiling = ceilingTexture();
  ceiling.repeat.set(0.6, 0.6);

  return {
    wall: std({ map: wall, bumpMap: wall.userData.bump as THREE.Texture, bumpScale: 2.2, roughness: 0.62, metalness: 0.08 }, 0.5),
    floor: std({ map: floor, bumpMap: floor.userData.bump as THREE.Texture, bumpScale: 2.5, roughness: 0.48, metalness: 0.55 }, 0.55),
    ceiling: std({ map: ceiling, roughness: 0.7, metalness: 0.35 }, 0.35),
    darkMetal: std({ color: "#2c3036", roughness: 0.42, metalness: 0.8 }, 0.6),
    metal: std({ color: "#a6abb2", roughness: 0.3, metalness: 1 }, 0.8),
    chrome: std({ color: "#d9dde2", roughness: 0.12, metalness: 1 }, 0.9),
    brass: std({ color: "#c49a4a", roughness: 0.28, metalness: 1 }, 0.8),
    rail: std({ color: "#e3ad12", roughness: 0.38, metalness: 0.15 }, 0.45),
    rubber: std({ color: "#15171a", roughness: 0.92, metalness: 0 }, 0.25),
    whitePlastic: phys({ color: "#e8e9eb", roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    greyPlastic: phys({ color: "#5c6169", roughness: 0.4, metalness: 0, clearcoat: 0.3 }),
    blackPlastic: phys({ color: "#1a1c20", roughness: 0.35, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    cableBlue: std({ color: "#2d4f86", roughness: 0.55, metalness: 0.05 }, 0.35),
    cableOrange: std({ color: "#c2571a", roughness: 0.5, metalness: 0.05 }, 0.35),
    insulation: std({ color: "#c9c6bd", roughness: 0.85, metalness: 0 }, 0.3),
    glass: phys({ color: "#ffffff", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, depthWrite: false }, 1.2),
    paper: std({ color: "#f1efe9", roughness: 0.8, metalness: 0, side: THREE.DoubleSide }, 0.4),
  };
}

/** Shared interior material library (created once, needs the room env first). */
export function materials(gl: THREE.WebGLRenderer) {
  getRoomEnv(gl);
  if (!library) library = buildLibrary();
  return library;
}
