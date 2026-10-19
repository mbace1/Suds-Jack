// driveway.js — the place: a double driveway at night, built from TUNING.
//
// M0 is the blank stage: slab with its expansion joints, side and street
// curbs, lawns, the house front with the garage door, the flood over the door
// and the one warm light it throws. M1 turns this into the PS1 world.
//
// Materials are TSL node materials only — one definition that compiles to
// WGSL on WebGPU and GLSL on the WebGL 2 fallback, never painted twice.
import * as THREE from 'three/webgpu';
import { Fn, positionWorld, uv, vec2, float, abs, fract, min, fwidth, smoothstep, mix, color } from 'three/tsl';

// 1 inside a line of width `w` centred on distance 0, antialiased by the
// screen-space rate of change of `d` so it stays crisp at any zoom.
const line = (d, w) => {
  const aa = fwidth(d);
  return float(1).sub(smoothstep(float(w / 2).sub(aa), float(w / 2).add(aa), d));
};

// Distance from `x` to the nearest multiple of `period`, in the same units.
const toGrid = (x, period) => abs(fract(x.div(period).add(0.5)).sub(0.5)).mul(period);

function slabMaterial(T) {
  const { width, depth, panelX, panelZ, jointWidth } = T.driveway.slab;
  const m = new THREE.MeshLambertNodeMaterial();
  m.colorNode = Fn(() => {
    // joints measured from the slab's garage-side corner, so the pour lines up
    const p = positionWorld.xz.sub(vec2(-width / 2, -depth / 2));
    const d = min(toGrid(p.x, panelX), toGrid(p.y, panelZ));
    return mix(color(T.colors.slab), color(T.colors.joint), line(d, jointWidth));
  })();
  return m;
}

function doorMaterial(T) {
  const { height, panels, grooveWidth } = T.driveway.door;
  const m = new THREE.MeshLambertNodeMaterial();
  m.colorNode = Fn(() => {
    const d = toGrid(uv().y.mul(height), height / panels); // metres to the nearest panel seam
    return mix(color(T.colors.door), color(T.colors.doorGroove), line(d, grooveWidth));
  })();
  return m;
}

const lambert = (hex) => new THREE.MeshLambertNodeMaterial({ color: hex });
const DECAL_LIFT = 0.005; // keeps a flat panel off the surface behind it (z-fighting); not a tuning value

export function buildDriveway(T) {
  const D = T.driveway, C = T.colors;
  const halfW = D.slab.width / 2, halfD = D.slab.depth / 2;
  const garageZ = -halfD;                                  // the garage face
  const streetZ = halfD + D.curb.width;                    // street side of the street curb
  const group = new THREE.Group();
  group.name = 'driveway';

  const add = (geometry, material, x, y, z, name) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  const ground = (w, d, material, x, y, z, name) => {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    return add(g, material, x, y, z, name);
  };
  const block = (w, h, d, material, x, y, z, name) => add(new THREE.BoxGeometry(w, h, d), material, x, y + h / 2, z, name);

  // the slab, the canvas for the night's painting
  ground(D.slab.width, D.slab.depth, slabMaterial(T), 0, 0, 0, 'slab');

  // curbs: the two sides, and the street curb running the whole frontage
  const curb = lambert(C.curb);
  for (const s of [-1, 1]) {
    block(D.curb.width, D.curb.height, D.slab.depth, curb, s * (halfW + D.curb.width / 2), 0, 0, s < 0 ? 'curb-left' : 'curb-right');
  }
  block(D.house.reach * 2, D.curb.height, D.curb.width, curb, 0, 0, halfD + D.curb.width / 2, 'curb-street');

  // lawns beyond the side curbs, house front to street curb
  const lawn = lambert(C.lawn);
  const lawnW = D.lawn.reach - halfW - D.curb.width;
  for (const s of [-1, 1]) {
    ground(lawnW, D.slab.depth, lawn, s * (halfW + D.curb.width + lawnW / 2), D.lawn.y, 0, s < 0 ? 'lawn-left' : 'lawn-right');
  }

  // the street
  ground(D.house.reach * 2, D.street.reach, lambert(C.street), 0, 0, streetZ + D.street.reach / 2, 'street');

  // the house front: wall, roof, garage door, and the flood over the door
  block(D.house.reach * 2, D.house.wallHeight, D.house.wallDepth, lambert(C.wall), 0, 0, garageZ - D.house.wallDepth / 2, 'wall');
  block(D.house.reach * 2, D.house.roofRise, D.house.roofDepth, lambert(C.roof), 0, D.house.wallHeight,
    garageZ - D.house.roofDepth / 2, 'roof');
  add(new THREE.PlaneGeometry(D.door.width, D.door.height), doorMaterial(T), 0, D.door.height / 2, garageZ + DECAL_LIFT, 'door');
  const floodZ = garageZ + D.flood.depth / 2;
  add(new THREE.BoxGeometry(D.flood.width, D.flood.height, D.flood.depth),
    new THREE.MeshBasicNodeMaterial({ color: C.flood }), 0, D.flood.y, floodZ, 'flood');

  // the one warm light, and the moon fill
  const L = T.light.flood;
  const spot = new THREE.SpotLight(L.color, L.intensity, 0, THREE.MathUtils.degToRad(L.angleDeg), L.penumbra, L.decay);
  spot.position.set(0, D.flood.y - D.flood.height, floodZ + D.flood.depth / 2);
  spot.target.position.set(0, 0, L.targetZ);
  spot.name = 'flood-light';
  group.add(spot, spot.target);
  const M = T.light.moon;
  group.add(new THREE.HemisphereLight(M.sky, M.ground, M.intensity));

  // What the view must always hold: slab, curbs, a strip of lawn either side
  // where spawns rustle, a strip of street, and the door with its light.
  const arena = new THREE.Box3(
    new THREE.Vector3(-(halfW + D.curb.width + D.lawn.margin), 0, garageZ),
    new THREE.Vector3(halfW + D.curb.width + D.lawn.margin, D.house.wallHeight, streetZ + D.street.margin),
  );

  return { group, arena, poolCentre: spot.target.position.clone() };
}
