import * as THREE from 'three';

/**
 * SHALE — dark layered rock, and crooked tilework on top of it.
 *
 * Owner's direction for season 1 (2026-09-05): the platforms are *tile work
 * that's crooked, or shale rock that's dark*. Both are the same object: a
 * stack of thin flat beds, each nudged and turned a little off the one
 * below, and on the top face a grid of tiles that do not quite agree with
 * each other. Everything is one merged BufferGeometry with vertex colours
 * (one draw per piece), unlit, so the only shading is the per-face tone the
 * voxel cubes use — the way everything native in this game is shaded.
 *
 * The COLLISION box stays the declared (w, h, d): the beds jitter INSIDE it,
 * so nothing you can see is anything you cannot stand on.
 */
const FACE_TONES = [0.74, 0.58, 1.0, 0.40, 0.86, 0.50]; // +x -x +y -y +z -z, the cube ladder

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

/** Build one box into the accumulators. `rgb` is the box's own base colour. */
function pushBox(acc, w, h, d, x, y, z, rx, ry, rz, rgb) {
  const g = new THREE.BoxGeometry(w, h, d);
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  const pos = g.getAttribute('position'), idx = g.getIndex();
  const base = acc.count;
  for (let i = 0; i < pos.count; i++) {
    acc.pos.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const t = FACE_TONES[(i / 4) | 0];
    acc.col.push(rgb[0] * t, rgb[1] * t, rgb[2] * t);
  }
  for (let i = 0; i < idx.count; i++) acc.idx.push(base + idx.getX(i));
  acc.count += pos.count;
  g.dispose();
}

/**
 * @param {Object} o
 * @param {number} o.w  @param {number} o.h  @param {number} o.d   the collision box
 * @param {number} [o.layer=0.22]     nominal bed thickness (each varies 0.5–1.6x)
 * @param {number} [o.jitter=0.12]    how far a bed may sit off the one below (units)
 * @param {number} [o.turn=0.06]      how far a bed may turn (radians)
 * @param {number} [o.tile=0.7]       tile size on the top face; 0 = no tiles
 * @param {number} [o.tileLift=0.05]  how far a tile may stand proud / sink
 * @param {number} [o.tileTilt=0.07]  how crooked a tile may sit (radians)
 * @param {number[]} [o.color]        base rgb of the rock (LINEAR — see below)
 * @param {number[]} [o.tileColor]    base rgb of the tiles
 * @param {number[]} [o.glow]         rgb the LOWER beds lean toward: the horizon on the rock's foot
 * @param {function} [o.draw]         rng, 0..1
 * @returns {THREE.BufferGeometry}    origin at the BASE centre (y = 0 is the floor)
 */
export function shaleGeometry(o) {
  const draw = o.draw ?? Math.random;
  const layerH = o.layer ?? 0.22, jitter = o.jitter ?? 0.12, turn = o.turn ?? 0.06;
  const tile = o.tile ?? 0.7, tileLift = o.tileLift ?? 0.05, tileTilt = o.tileTilt ?? 0.07;
  // LINEAR values — sRGB lifts the darks hard (0.05 linear is a mid grey on
  // screen), so dark rock lives under 0.03 and the tiles one step up.
  const rock = o.color ?? [0.024, 0.022, 0.026];      // dark shale: blue-black
  const tileC = o.tileColor ?? [0.036, 0.033, 0.031]; // tiles a step lighter and warmer
  const acc = { pos: [], col: [], idx: [], count: 0 };

  // The beds. Shale is NOT evenly bedded, so thickness varies; the bottom
  // one sits square so the stack is planted rather than floating.
  const beds = [];
  let y = 0;
  while (y < o.h - 1e-4) {
    let t = layerH * (0.5 + draw() * 1.1);
    if (y + t > o.h || o.h - (y + t) < layerH * 0.35) t = o.h - y;
    beds.push([y, t]); y += t;
  }
  beds.forEach(([y0, t], i) => {
    const k = i === 0 ? 0 : 1;
    const shrink = 1 - (0.03 + draw() * 0.12) * k;
    const jx = (draw() - 0.5) * 2 * jitter * k, jz = (draw() - 0.5) * 2 * jitter * k;
    const ry = (draw() - 0.5) * 2 * turn * k;
    const v = 0.75 + draw() * 0.5; // per-bed value variance — shale is banded
    let c = [rock[0] * v, rock[1] * v, rock[2] * v];
    if (o.glow) { // the foot of the stack catches the horizon: warm low, cold high
      const g = Math.max(0, 1 - y0 / Math.max(1, o.h)) * 0.55;
      c = [c[0] + (o.glow[0] - c[0]) * g, c[1] + (o.glow[1] - c[1]) * g, c[2] + (o.glow[2] - c[2]) * g];
    }
    pushBox(acc, o.w * shrink - 2 * jitter, t * 0.94, o.d * shrink - 2 * jitter,
      jx, y0 + t / 2, jz, 0, ry, 0, c);
  });

  // The tiles on top: a grid that does not agree with itself.
  if (tile > 0) {
    const nx = Math.max(1, Math.floor((o.w - 2 * jitter) / tile));
    const nz = Math.max(1, Math.floor((o.d - 2 * jitter) / tile));
    const tw = (o.w - 2 * jitter) / nx, td = (o.d - 2 * jitter) / nz;
    for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      if (draw() < 0.08) continue; // a missing tile now and then
      const x = -o.w / 2 + jitter + tw * (ix + 0.5), z = -o.d / 2 + jitter + td * (iz + 0.5);
      const lift = (draw() - 0.3) * tileLift;
      const v = 0.8 + draw() * 0.45;
      pushBox(acc, tw * 0.9, 0.06, td * 0.9, x, o.h + 0.03 + lift, z,
        (draw() - 0.5) * 2 * tileTilt, (draw() - 0.5) * 2 * tileTilt * 0.6, (draw() - 0.5) * 2 * tileTilt,
        [tileC[0] * v, tileC[1] * v, tileC[2] * v]);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(acc.col, 3));
  geo.setIndex(acc.idx);
  return geo;
}

/** The one material every shale piece shares: unlit, vertex-coloured. */
export function shaleMaterial() {
  return new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
}
