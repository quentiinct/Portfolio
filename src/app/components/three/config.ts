import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
// ROCKET LAYOUT — shared by the hull, the interior and the camera.
//
// Units are metres. Everything is expressed in rocket-local space:
// the rocket axis is +Y, and an angle θ around it points toward
// (sin θ, 0, cos θ) — θ = 0 faces +Z. Three's Lathe/Cylinder
// geometries use the same convention, so the hull, the interior
// panels and the shaders all agree on where a window or a door is.
// ═══════════════════════════════════════════════════════════════

export const deg = (d: number) => (d * Math.PI) / 180;

// ─── Hull ─────────────────────────────────────────────────────
export const HULL_R = 4.5;
export const BODY_BOTTOM = -24;
export const BODY_TOP = 16;
export const NOSE_TIP = 28.5;

/** Angles of the two aft fins (kept away from the windows and the airlock). */
export const FIN_ANGLES = [deg(-15), deg(165)] as const;

// ─── Interior ─────────────────────────────────────────────────
export const SIDES = 24;
export const PANEL_ANGLE = (Math.PI * 2) / SIDES;
/** Distance from the axis to the flat interior wall panels. */
export const WALL_A = 4.15;
export const PANEL_W = 2 * WALL_A * Math.tan(PANEL_ANGLE / 2);
export const DECK_H = 3.9;
export const FLOOR_T = 0.3;
export const ROOM_H = DECK_H - FLOOR_T;
/** Floor height of each deck, top deck first (the camera descends). */
export const DECK_FLOORS = [11.4, 7.5, 3.6, -0.3] as const;
export const HOLE_R = 1.1;
export const EYE = 1.7;

// ─── Openings (must match between hull shader and interior) ───
export const DOOR = { deck: 0, angle: deg(15), width: 0.92, height: 2.1, bottom: 0.14 };
export const DOOR_CENTER_Y = DECK_FLOORS[0] + DOOR.bottom + DOOR.height / 2;

export const WINDOW_R = 0.3;
export const WINDOW_Y = 1.8;
export const WINDOWS: { deck: number; angle: number }[] = [];
DECK_FLOORS.forEach((_, deck) => {
  const angles = deck === 0 ? [45, 75, 105, 135] : [15, 45, 75, 105, 135];
  angles.forEach((a) => WINDOWS.push({ deck, angle: deg(a) }));
});

// ─── Palette per deck (shared with the HUD and the panels) ────
export { DECKS } from "../decks";

/** World orientation of the whole ship (slight tilt for a dynamic hero shot). */
export const ROCKET_POSITION = new THREE.Vector3(0, 0, 0);
export const ROCKET_ROTATION = new THREE.Euler(deg(4), deg(0), deg(-9), "XYZ");

// ─── Helpers ──────────────────────────────────────────────────
export function polar(angle: number, r: number, y: number, out = new THREE.Vector3()) {
  return out.set(Math.sin(angle) * r, y, Math.cos(angle) * r);
}

/** Deterministic PRNG — keeps procedural layouts stable across renders. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Nose profile: blunt ogive, radius at a distance u above the cylindrical body. */
export function noseRadius(u: number) {
  const L = NOSE_TIP - BODY_TOP;
  const s = Math.min(1, Math.max(0, u / L));
  return HULL_R * Math.pow(Math.max(0, 1 - Math.pow(s, 1.8)), 0.62);
}
