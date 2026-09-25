import * as THREE from "three";

/**
 * Pointer ray in world space, refreshed every frame by the camera rig.
 * Floating props read it to get nudged when the cursor sweeps through them.
 */
export const pointer = {
  ndc: new THREE.Vector2(0, 0),
  ray: new THREE.Ray(),
  /** Cursor speed in screen widths per second (damped). */
  speed: 0,
  active: false,
};

const raycaster = new THREE.Raycaster();

export function updatePointerRay(camera: THREE.Camera) {
  raycaster.setFromCamera(pointer.ndc, camera);
  pointer.ray.copy(raycaster.ray);
}
