import * as THREE from "three";
import { DECK_FLOORS, EYE, ROCKET_POSITION, ROCKET_ROTATION, deg, polar } from "./config";

// ═══════════════════════════════════════════════════════════════
// CAMERA PATH
//
// Keyframes are written in rocket-local cylindrical coordinates
// [angle°, radius, y] for both the camera position and its look-at
// target, keyed by chapter time t (see scrollStore). A centripetal
// Catmull-Rom spline goes through them so the flight stays smooth.
//
//   0 → 1   exterior: from the wide hero shot to the airlock
//   1 → 2   airlock opens, the camera boards deck 01
//   n → n+.55  reading time on a deck (slow drift)
//   n+.6 → n+1  descent through the floor hatch to the next deck
// ═══════════════════════════════════════════════════════════════

type Cyl = [angleDeg: number, r: number, y: number];
type Key = { t: number; pos: Cyl; look: Cyl };

const [F1, F2, F3, F4] = DECK_FLOORS;

const KEYS: Key[] = [
  // ── Exterior
  { t: 0.0, pos: [30, 92, 4], look: [-60, 17, 5] },
  { t: 0.3, pos: [26, 52, 9], look: [-52, 8, 9] },
  { t: 0.58, pos: [20, 24, 12.4], look: [-25, 2.5, 12.2] },
  { t: 0.84, pos: [16, 12.2, 13.0], look: [15, 4.5, 12.7] },
  { t: 1.0, pos: [15, 8.6, 13.0], look: [15, 4.5, 12.65] },
  // ── Boarding
  { t: 1.3, pos: [15, 6.2, 13.05], look: [15, 3.2, 12.95] },
  { t: 1.52, pos: [15, 4.5, 13.1], look: [195, 1.5, 13.0] },
  { t: 1.76, pos: [15, 2.1, 13.15], look: [150, 3.2, 13.0] },
  // ── Deck 01 · about
  { t: 2.0, pos: [250, 1.3, F1 + EYE], look: [95, 4, F1 + 1.45] },
  { t: 2.3, pos: [255, 1.15, F1 + EYE], look: [90, 4, F1 + 1.5] },
  { t: 2.55, pos: [262, 0.95, F1 + EYE], look: [82, 4, F1 + 1.5] },
  { t: 2.72, pos: [0, 0, F1 + 1.3], look: [120, 2.6, F1] },
  { t: 2.86, pos: [0, 0, F2 + 2.4], look: [150, 3, F2 + 0.8] },
  // ── Deck 02 · security
  { t: 3.0, pos: [320, 1.25, F2 + EYE], look: [165, 4, F2 + 1.45] },
  { t: 3.3, pos: [322, 1.15, F2 + EYE], look: [158, 4, F2 + 1.5] },
  { t: 3.55, pos: [326, 0.95, F2 + EYE], look: [150, 4, F2 + 1.5] },
  { t: 3.72, pos: [0, 0, F2 + 1.3], look: [110, 2.6, F2] },
  { t: 3.86, pos: [0, 0, F3 + 2.4], look: [60, 3, F3 + 0.8] },
  // ── Deck 03 · projects
  { t: 4.0, pos: [200, 1.3, F3 + EYE], look: [30, 4, F3 + 1.45] },
  { t: 4.3, pos: [205, 1.15, F3 + EYE], look: [24, 4, F3 + 1.5] },
  { t: 4.55, pos: [210, 0.95, F3 + EYE], look: [18, 4, F3 + 1.5] },
  { t: 4.72, pos: [0, 0, F3 + 1.3], look: [40, 2.6, F3] },
  { t: 4.86, pos: [0, 0, F4 + 2.4], look: [55, 3, F4 + 0.8] },
  // ── Deck 04 · contact
  { t: 5.0, pos: [240, 1.3, F4 + EYE], look: [62, 4, F4 + 1.45] },
  { t: 5.5, pos: [238, 1.05, F4 + EYE], look: [58, 4, F4 + 1.5] },
  { t: 6.0, pos: [234, 0.7, F4 + EYE + 0.05], look: [55, 4, F4 + 1.55] },
];

const toVec = ([a, r, y]: Cyl) => polar(deg(a), r, y);

const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => toVec(k.pos)), false, "centripetal");
const lookCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => toVec(k.look)), false, "centripetal");

function curveParam(t: number) {
  const n = KEYS.length;
  if (t <= KEYS[0].t) return 0;
  if (t >= KEYS[n - 1].t) return 1;
  let k = 0;
  while (k < n - 2 && t > KEYS[k + 1].t) k++;
  const s = (t - KEYS[k].t) / (KEYS[k + 1].t - KEYS[k].t);
  return (k + s) / (n - 1);
}

/** Camera position and target in rocket-local space for a chapter time. */
export function sampleCamera(t: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const u = curveParam(t);
  posCurve.getPoint(u, outPos);
  lookCurve.getPoint(u, outLook);
}

export const rocketQuaternion = new THREE.Quaternion().setFromEuler(ROCKET_ROTATION);
export const rocketMatrix = new THREE.Matrix4().compose(ROCKET_POSITION, rocketQuaternion, new THREE.Vector3(1, 1, 1));

/** Samples of the exterior flight path in world space (used to keep asteroids out of the way). */
export function exteriorPathSamples(count = 60) {
  const out: THREE.Vector3[] = [];
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  for (let i = 0; i <= count; i++) {
    sampleCamera((i / count) * 1.6, pos, look);
    out.push(pos.clone().applyMatrix4(rocketMatrix));
  }
  return out;
}
