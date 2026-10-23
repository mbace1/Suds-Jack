// view.js — one fixed view of the whole arena, on any screen.
//
// The camera hangs over the driveway, tilted off straight-down toward the
// street so the garage door has a face. For a given screen shape it finds
// the closest distance at which every corner of the arena box is on screen,
// then shifts the image (an off-axis view offset, not a turn of the camera)
// so the arena sits centred — perspective makes the street end of the box
// bigger than the garage end, so centring the box's middle is not enough.
// Landscape-first, but a phone held upright still sees all of it.
//
// v18 (owner, 2026-10-23: keep the whole arena, trim the margins, and the
// orientation must be right):
//   - the margin is a few CSS px a side rather than 5% of the screen, so the
//     arena is as big as a whole-arena view can make it
//   - `turn` (quarter turns of the world, clockwise on screen) lets a run
//     whose phone was turned mid-run keep its arena the right way round: a
//     landscape arena on an upright phone is drawn lying along the screen's
//     long side, tilted toward the new bottom, rather than shrunk to a strip
//     across the middle (main.js picks the turn; 1.x picks the arena per run)
import * as THREE from 'three/webgpu';

const FILM = 1000;  // virtual film height for the view offset; only ratios matter
const STEPS = 40;   // bisection steps for the distance

const _corner = new THREE.Vector3();
const _back = new THREE.Vector3();
const _target = new THREE.Vector3();

function extent(camera, box) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    _corner.set(x, y, z).project(camera);
    x0 = Math.min(x0, _corner.x); x1 = Math.max(x1, _corner.x);
    y0 = Math.min(y0, _corner.y); y1 = Math.max(y1, _corner.y);
  }
  return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// the world direction (x, z) that is screen-down under a turn: the camera
// sits that way from the arena and looks back across it
export function screenDown(turn) {
  return turn === 1 ? [1, 0] : turn === 2 ? [0, -1] : turn === 3 ? [-1, 0] : [0, 1];
}

// screen axes (x right, y down) → world (x, z) under a turn
export function screenToWorld(turn, sx, sy) {
  return turn === 1 ? [sy, -sx] : turn === 2 ? [-sx, -sy] : turn === 3 ? [-sy, sx] : [sx, sy];
}

// `px` is the screen in CSS px, { w, h }, which C.margin is measured in
export function fitCamera(camera, box, aspect, C, turn = 0, px = { w: 1000 * aspect, h: 1000 }) {
  camera.fov = C.fov;
  camera.near = C.near;
  camera.far = C.far;
  camera.aspect = aspect;
  const tilt = THREE.MathUtils.degToRad(C.tiltDeg);
  const [dx, dz] = screenDown(turn);
  _back.set(dx * Math.sin(tilt), Math.cos(tilt), dz * Math.sin(tilt));   // from the target toward the camera
  box.getCenter(_target);
  const filmW = FILM * aspect;
  // the half-size, in NDC, of the window the arena must fill: the screen
  // less the margins
  const limX = 1 - (2 * C.margin.x) / px.w, limY = 1 - (2 * C.margin.y) / px.h;
  let ox = 0, oy = 0;

  const place = (distance) => {
    camera.position.copy(_target).addScaledVector(_back, distance);
    camera.lookAt(_target);
    camera.updateMatrixWorld();
    camera.setViewOffset(filmW, FILM, ox, oy, filmW, FILM); // also updates the projection
  };

  // the closest distance at which the arena's projected half-extents fit;
  // the view offset only slides the film, so it changes where the image is
  // and never its size, and the fit can be found before the centring
  let lo = C.searchMin, hi = C.searchMax;
  for (let i = 0; i < STEPS; i++) {
    const mid = (lo + hi) / 2;
    place(mid);
    const e = extent(camera, box);
    if ((e.x1 - e.x0) / 2 <= limX && (e.y1 - e.y0) / 2 <= limY) hi = mid; else lo = mid;
  }
  place(hi);
  // then move the film under the image, so the box's projected middle
  // lands on the screen's
  const e = extent(camera, box);
  ox = (e.cx * filmW) / 2; oy = -(e.cy * FILM) / 2;
  place(hi);
}
