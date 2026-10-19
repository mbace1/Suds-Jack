// view.js — one fixed view of the whole arena, on any screen.
//
// The camera hangs over the driveway, tilted off straight-down toward the
// street so the garage door has a face. For a given screen shape it finds
// the closest distance at which every corner of the arena box is on screen,
// then shifts the image (an off-axis view offset, not a turn of the camera)
// so the arena sits centred — perspective makes the street end of the box
// bigger than the garage end, so centring the box's middle is not enough.
// Landscape-first, but a phone held upright still sees all of it.
import * as THREE from 'three/webgpu';

const FILM = 1000;  // virtual film height for the view offset; only ratios matter
const PASSES = 3;   // distance-then-centre rounds; the offset settles in two
const STEPS = 40;   // bisection steps per distance search

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
  return { worst: Math.max(-x0, x1, -y0, y1), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

export function fitCamera(camera, box, aspect, C) {
  camera.fov = C.fov;
  camera.near = C.near;
  camera.far = C.far;
  camera.aspect = aspect;
  const tilt = THREE.MathUtils.degToRad(C.tiltDeg);
  _back.set(0, Math.cos(tilt), Math.sin(tilt));   // from the target toward the camera
  box.getCenter(_target);
  const filmW = FILM * aspect;
  let ox = 0, oy = 0;

  const place = (distance) => {
    camera.position.copy(_target).addScaledVector(_back, distance);
    camera.lookAt(_target);
    camera.updateMatrixWorld();
    camera.setViewOffset(filmW, FILM, ox, oy, filmW, FILM); // also updates the projection
  };
  const limit = 1 - C.margin;
  const search = () => {
    let lo = C.searchMin, hi = C.searchMax;
    for (let i = 0; i < STEPS; i++) {
      const mid = (lo + hi) / 2;
      place(mid);
      if (extent(camera, box).worst <= limit) hi = mid; else lo = mid;
    }
    place(hi);
  };

  for (let pass = 0; pass < PASSES; pass++) {
    search();
    const e = extent(camera, box);
    ox += (e.cx * filmW) / 2;   // move the film under the image, so the box's
    oy -= (e.cy * FILM) / 2;    // projected middle lands on the screen's
  }
  search();
}
