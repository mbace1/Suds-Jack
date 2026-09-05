// EERI — LIGHT, and the reason it is a prop and not a system.
//
// The diorama is UNLIT. `layers.js` mounts every lane as a
// `MeshBasicMaterial` with a texture map, so no light in the scene touches
// a backdrop; the kid and the machines are the only things under the
// `DirectionalLight`. That is the fact that decides what "add light
// sources" can mean here, and it turns out to be good news: the two
// cheapest options are also the two that need no new art, which matters
// because the art lane is the queue everything else is waiting behind.
//
// **1 · MOOD** — a `MeshBasicMaterial`'s `.color` MULTIPLIES its map, and
// it is white by default. So tinting a lane costs one assignment and no
// draw call: warm toward the camera, cool into the distance, and a night
// world can be a night world without a single repainted PNG. This is the
// thing that stops "dusk" being a palette swap.
//
// **2 · LAMPS** — one radial-gradient quad, additively blended, sitting at
// a z BETWEEN two lanes. Occlusion comes for free from the layer order: a
// lamp behind the near lane is behind it. This is the oldest trick in 2D
// lighting and it is the right one here, because it gives a light an
// (x, y) — which is exactly what the editor needs in order to place one.
//
// What is deliberately NOT here: normal maps. They are the correct answer
// for a light that moves across a surface, and they cost a new authored
// map per lane before one pixel changes — and normal-maps-on-parallax is a
// known rough edge in engines that do it natively, so it is also the
// option that would cost the Godot port a week. Rim-from-alpha is the
// next step up and it comes after there are lights worth rimming.

import { mix } from './palette.js?v=57';

// ---- 1 · mood -----------------------------------------------------------
// Per world: what the lanes are multiplied by, from the far end of the
// diorama to the near end. `null` is daylight — the lane keeps its own
// colour, which is what worlds 1 and 2 were authored for.
//
// The ramp is read by DEPTH, not by lane name, so a lane added later gets
// the right tint without this table knowing it exists.
export const MOOD = {
  groundworks: null,
  pipeworks: { far: '#c8d4e4', near: '#fff6e6', amount: 0.5 },
  grove: { far: '#9fb8c9', near: '#fff2d8', amount: 0.7 },
  // The night shift is the whole reason this exists: far lanes go deep and
  // cold so that a work lamp has something to be brighter THAN.
  nightshift: { far: '#35507a', near: '#8f9fbe', amount: 1 },
};

// ---- 3 · THE CAST ------------------------------------------------------
//
// The mood above dims the WORLD. Doing that and nothing else makes the kid
// harder to find, not easier — he is a small mid-toned figure and the night
// ramp pulls the backdrop toward his own value rather than away from it.
// Two dials answer that, and they belong here beside the mood they answer:
//
//   rim    — the fresnel edge on the cast (`craft.js`'s `rimLight`). Its
//            COLOUR is the world's own key light: a warm yard, a cold
//            trench, a green-lit grove, a blue night. Strength is what the
//            backdrop's business demands, not a constant.
//   lamp   — an optional work lamp that FOLLOWS the cast. Only the night
//            shift gets one, and it is the honest reading of that world:
//            everyone on a night shift is carrying a light. It is the same
//            additive quad `buildLamp` already makes for a fixed lamp, so
//            it costs one more draw call and no new concept.
//
// `i: 0` means no follow lamp, which is every daylight world — the entry is
// still written out so the table reads as a set rather than a special case.
export const CAST_RIM = {
  groundworks: { color: '#fff3dc', strength: 0.22 },
  pipeworks:   { color: '#dceaff', strength: 0.34 },
  grove:       { color: '#e8ffd8', strength: 0.40 },
  // the big one. The depot is dark, blue and busy, and the rim is the only
  // thing on him that the backdrop cannot also be.
  nightshift:  { color: '#cfe2ff', strength: 0.72 },
};

export const CAST_LAMP = {
  groundworks: { i: 0 },
  pipeworks:   { i: 0 },
  grove:       { i: 0 },
  nightshift:  { i: 0.55, r: 5.4, colour: '#ffd9a0', y: 0.9 },
};

// z of the far and near lanes, so the ramp can be read off a position
// rather than hard-coded per lane.
const Z_FAR = -46, Z_NEAR = 3.4;

export function applyMood(world, meshes) {
  const m = MOOD[world];
  if (!m) return 0;
  let n = 0;
  for (const mesh of meshes) {
    if (!mesh.material || !('color' in mesh.material)) continue;
    const t = Math.min(1, Math.max(0, (mesh.position.z - Z_FAR) / (Z_NEAR - Z_FAR)));
    // Depth also DARKENS: a far lane at night is not merely bluer, it is
    // further from every lamp in the picture.
    const lit = mix(m.far, m.near, t);
    const dim = mix('#1a2230', lit, 0.35 + 0.65 * t);
    mesh.material.color.set(mix('#ffffff', dim, m.amount));
    n++;
  }
  return n;
}

// ---- 2 · lamps ----------------------------------------------------------
// One gradient texture for every lamp in the game, built once. It is a
// texture rather than a shader because a lamp has to work on the phone
// this build is judged on, and an additive quad is free there.
let LAMP_TEX = null;
function lampTexture(THREE) {
  if (LAMP_TEX) return LAMP_TEX;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const r = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  // Two stops in the middle, not one: a single linear falloff reads as a
  // flat disc with a hard rim, which is the tell of a fake light.
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.18, 'rgba(255,255,255,0.62)');
  r.addColorStop(0.52, 'rgba(255,255,255,0.16)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  LAMP_TEX = new THREE.CanvasTexture(cv);
  LAMP_TEX.colorSpace = THREE.SRGBColorSpace;
  return LAMP_TEX;
}

// A lamp is a quad, so it is one draw call and it cannot cast anything —
// which is the honest limit and also why it is affordable at six lamps a
// level on a phone.
export function buildLamp(THREE, { x, y, r = 6, colour = '#ffd9a0', i = 1, z = -1.2 }) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({
      map: lampTexture(THREE),
      color: colour,
      transparent: true,
      opacity: Math.min(1, i),
      blending: THREE.AdditiveBlending,
      depthWrite: false,          // never occlude what is behind it
      toneMapped: false,          // a light is not a surface
    }),
  );
  mesh.name = 'lamp';
  mesh.position.set(x, y, z);
  mesh.renderOrder = 1;
  return mesh;
}

// The flicker is opt-in and tiny. A work lamp that pulses like a candle is
// a campfire; one that barely moves is electric, which is what a worksite
// runs on. Frozen entirely under prefers-reduced-motion by the caller.
export function flicker(mesh, t, amount = 0.06) {
  if (!mesh.userData.i0) mesh.userData.i0 = mesh.material.opacity;
  const n = Math.sin(t * 7.3 + mesh.position.x) * 0.5 + Math.sin(t * 11.9) * 0.5;
  mesh.material.opacity = mesh.userData.i0 * (1 + n * amount);
}
