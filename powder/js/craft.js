// The model shop. The racer the reference plates describe — long cream
// fuselage, one weathered accent band, CHROME cans, black intakes, a needle
// probe — built here as a kit and handed to vehicle.js, which only knows
// about the pieces that move: the flames, the fans, and the hull it flashes
// on a strike.
//
// v7, on the owner's direction ("a better 3d model shop with some chrome
// engine parts"). Three things changed:
//
//   CHROME     is now MeshStandard at metalness 1, and it reflects an actual
//              environment: a two-tone world — violet sky over white sand
//              with a hard horizon between and an over-white sun — rendered
//              once through PMREM. That is what the plates' nacelles show:
//              lilac on top, sand underneath, a bright bar where they meet.
//              Phong "chrome" was a grey cylinder with a highlight.
//   ENGINE BAY each nacelle carries a spinning turbine face in its mouth, a
//              nozzle bell at the back with the flame inside it, gunmetal
//              bands, and a run of plumbing back to the hull — the plates'
//              exposed manifolds.
//   MERGED     everything that does not move is merged per material, so a
//              ship is 14 draw calls, not the 39 the extra detail would have
//              cost (and not the 23 it was). The fans spin and the flames
//              scale, so they stay live meshes.
//
// v11 made the kit a formula car; v12, on the owner's direction ("more like
// the reference concept art than actual formula cars ... it's a rocket sled
// after all"), made it the plates' ROCKET SLED — see buildCraft. The
// rockets, fans, flames, chrome and the material contract carry through.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, SUN_DIR } from './palette.js?v=11';
import { models, numeralTexture, SHIP } from './models.js?v=11';

const _geo = {};
const geo = (k, make) => _geo[k] || (_geo[k] = make());

// ------------------------------------------------------------ environment
let ENV = null;
/**
 * Chrome needs something to reflect. Sky over sand with a hard horizon,
 * filtered once by PMREM. Kept deliberately simpler than the real sky: a
 * reflection is read at a glance, and two tones with a bright bar between
 * them is what the plates' nacelles actually show.
 */
export function makeEnvMap(renderer) {
  if (ENV) return ENV;
  const s = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const hex = v => '#' + new THREE.Color(v).getHexString();
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0.00, hex(PAL.zenith));
  grd.addColorStop(0.28, hex(PAL.skyHigh));
  grd.addColorStop(0.46, hex(PAL.skyMid));
  grd.addColorStop(0.495, hex(PAL.horizon));
  grd.addColorStop(0.505, hex(PAL.dune));       // the horizon: a hard line
  grd.addColorStop(0.62, hex(PAL.dune));
  grd.addColorStop(1.00, hex(PAL.duneDark));
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16),
    new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })));
  // over-white, so the chrome carries one hot highlight where the sun is
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 8),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 8.2, 6.8) }));
  sun.position.set(-SUN_DIR[0], -SUN_DIR[1], -SUN_DIR[2]).multiplyScalar(40);
  s.add(sun);
  const pm = new THREE.PMREMGenerator(renderer);
  ENV = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return ENV;
}

// ---------------------------------------------------------------- textures
function numberTexture(num, accent) {
  const sheet = numeralTexture(num);           // art/numerals.png, if present
  if (sheet) return sheet;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#' + new THREE.Color(PAL.hull).getHexString();
  g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#' + new THREE.Color(accent).getHexString();
  g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#1d1726';
  g.font = 'bold 88px monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(num), 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Panel lines and rivets, painted once: the HD detail the PS2 world lacks. */
function panelTexture(accentHex) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#' + new THREE.Color(PAL.hull).getHexString();
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(60,40,50,0.28)'; g.lineWidth = 1;
  for (let x = 18; x < 256; x += 36) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, 128); g.stroke(); }
  for (let y = 22; y < 128; y += 44) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + 3); g.stroke(); }
  g.fillStyle = 'rgba(40,30,40,0.35)';
  for (let x = 8; x < 256; x += 12) for (let y = 6; y < 128; y += 22) g.fillRect(x, y, 1.5, 1.5);
  // weathering: chipped edges in the accent, the plates' worn livery
  g.fillStyle = 'rgba(' + [accentHex >> 16 & 255, accentHex >> 8 & 255, accentHex & 255].join(',') + ',0.22)';
  for (let i = 0; i < 14; i++) g.fillRect(Math.random() * 256, Math.random() * 128, 4 + Math.random() * 14, 1 + Math.random() * 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,220,180,0.5)');
  grd.addColorStop(1, 'rgba(255,180,120,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

/**
 * Shock diamonds: the bright bands a supersonic exhaust stacks down its
 * length. Painted as a strip and scrolled along the flame core by N1, so
 * a spooling turbine visibly pushes them out of the bell.
 */
function diamondTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.30)'; g.fillRect(0, 0, 8, 128);
  for (let i = 0; i < 5; i++) {
    const y = 8 + i * 25;
    const grd = g.createLinearGradient(0, y - 7, 0, y + 7);
    grd.addColorStop(0, 'rgba(255,255,255,0.30)');
    grd.addColorStop(0.5, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0.30)');
    g.fillStyle = grd; g.fillRect(0, y - 7, 8, 14);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

/**
 * The flame's length fade, in alpha: solid at the bell, gone at the tip.
 * ConeGeometry puts v = 1 at the apex, so this runs bright→clear up v. It
 * is a separate map from the diamonds because the diamonds SCROLL and the
 * fade must not — an alphaMap has its own transform.
 */
function fadeTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 64, 0, 0);       // canvas y=64 is v=0
  grd.addColorStop(0.00, 'rgb(255,255,255)');
  grd.addColorStop(0.35, 'rgb(230,230,230)');
  grd.addColorStop(0.75, 'rgb(90,90,90)');
  grd.addColorStop(1.00, 'rgb(0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 8, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

/** The turbine face in the mouth of the can: hub, eleven blades, a dark disc. */
function fanTexture() {
  const N = 128, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const m = N / 2;
  g.fillStyle = '#0c0c10'; g.beginPath(); g.arc(m, m, m, 0, 7); g.fill();
  g.strokeStyle = '#9a9ca6'; g.lineWidth = 5; g.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2;
    g.beginPath();
    g.moveTo(m + Math.cos(a) * 14, m + Math.sin(a) * 14);
    g.quadraticCurveTo(m + Math.cos(a + 0.35) * 40, m + Math.sin(a + 0.35) * 40,
      m + Math.cos(a + 0.55) * 60, m + Math.sin(a + 0.55) * 60);
    g.stroke();
  }
  const hub = g.createRadialGradient(m - 4, m - 4, 1, m, m, 16);
  hub.addColorStop(0, '#f4f6fa'); hub.addColorStop(0.6, '#b8bcc6'); hub.addColorStop(1, '#50525a');
  g.fillStyle = hub; g.beginPath(); g.arc(m, m, 16, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --------------------------------------------------------------- materials
const _accMats = {};
function materials(env, accent) {
  // Named for the pipeline contract (see pipeline/README.md): a Blender ship
  // wears these same names, and craftFromModel swaps by them.
  const M = geo('mats', () => ({
    chrome: Object.assign(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.10, envMap: env, envMapIntensity: 1.15 }), { name: 'CHROME' }),
    // GUNMETAL is the engine bay, the bands on the cans and the keels: a
    // glossy near-black that still catches the sky along its edges
    gun:    Object.assign(new THREE.MeshStandardMaterial({ color: 0x2b2a33, metalness: 0.55, roughness: 0.34, envMap: env, envMapIntensity: 0.9 }), { name: 'GUNMETAL' }),
    glass:  Object.assign(new THREE.MeshPhongMaterial({ color: PAL.glass, specular: 0xffffff, shininess: 200, emissive: 0x4a5a8a, emissiveIntensity: 0.3, transparent: true, opacity: 0.92 }), { name: 'GLASS' }),
    intake: Object.assign(new THREE.MeshBasicMaterial({ color: PAL.intake }), { name: 'INTAKE' }),
    fan:    Object.assign(new THREE.MeshBasicMaterial({ map: fanTexture() }), { name: 'FAN' }),
    glowTex: glowTexture(),
    diamondTex: diamondTexture(),
    fadeTex: fadeTexture(),
  }));
  const acc = _accMats[accent] || (_accMats[accent] =
    Object.assign(new THREE.MeshPhongMaterial({ color: accent, specular: 0x332233, shininess: 22 }), { name: 'ACCENT' }));
  return { M, acc };
}

// -------------------------------------------------------------- the merge
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
/** parts: [{ g, pos:[x,y,z], rot:[x,y,z]?, scale:[x,y,z]? }] → one geometry */
function merge(parts) {
  const geos = parts.map(p => {
    const g = p.g.clone();
    _p.fromArray(p.pos || [0, 0, 0]);
    _q.setFromEuler(new THREE.Euler(...(p.rot || [0, 0, 0])));
    _s.fromArray(p.scale || [1, 1, 1]);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    // uv2 / tangents would break the merge; the kit geometries carry
    // position, normal and uv, and that is all the materials read
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
    return g;
  });
  const out = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  out.computeBoundingSphere();
  return out;
}

// ---- the shadow stand-in --------------------------------------------------
// v11. The ships live on the HD layer, and three draws a shadow map with the
// layers of the camera it is rendering for — so the pass that draws the sand
// never saw a ship and no ship ever threw a shadow on the ground. Each one
// now carries a few boxes on L_CAST: the PS2 pass draws them with no colour
// and no depth writes (so they are nowhere in the picture) and they cast.
// At the key's 0.37 m shadow texel, boxes are all the shape a shadow has.
export const L_CAST = 4;
const _castMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
_castMat.name = 'CAST';
function castProxy(parts) {
  const m = new THREE.Mesh(merge(parts), _castMat);
  m.castShadow = true; m.receiveShadow = false;
  m.layers.set(L_CAST);
  m.name = 'cast';
  return m;
}
const ubox = () => geo('ubox', () => new THREE.BoxGeometry(1, 1, 1));

const zCyl = (rt, rb, h, n, open) => { const b = new THREE.CylinderGeometry(rt, rb, h, n, 1, !!open); b.rotateX(-Math.PI / 2); return b; };
const zCone = (r, h, n) => { const b = new THREE.ConeGeometry(r, h, n); b.rotateX(-Math.PI / 2); return b; };

/** A pipe along three points: the plates' exposed manifolds. */
function pipe(a, b, c, r = 0.05) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(...a), new THREE.Vector3(...b), new THREE.Vector3(...c)]);
  return new THREE.TubeGeometry(curve, 10, r, 6, false);
}

/** A rocket flame: white core with shock diamonds, coloured sheath, glow. */
function makeFlame(M) {
  const g = new THREE.Group();
  const diamonds = M.diamondTex.clone();          // own offset, shared image
  diamonds.needsUpdate = true;
  const core = new THREE.Mesh(geo('flameCore', () => { const b = new THREE.ConeGeometry(0.16, 2.0, 10); b.rotateX(Math.PI / 2); return b; }),
    new THREE.MeshBasicMaterial({ map: diamonds, alphaMap: M.fadeTex, color: new THREE.Color(2.2, 2.1, 1.9), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  const sheath = new THREE.Mesh(geo('flameSheath', () => { const b = new THREE.ConeGeometry(0.34, 3.0, 10); b.rotateX(Math.PI / 2); return b; }),
    new THREE.MeshBasicMaterial({ alphaMap: M.fadeTex, color: new THREE.Color(1.6, 0.9, 0.45), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  // A SpriteMaterial with no map draws a SOLID QUAD — every ship came out
  // wearing a white box. The glow needs an actual radial falloff.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: M.glowTex, color: new THREE.Color(1.4, 0.8, 0.5),
    transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(2.2);
  core.position.z = 1.0; sheath.position.z = 1.5;
  g.add(core, sheath, glow);
  g.userData = { core, sheath, glow, diamonds };
  return g;
}

// ------------------------------------------------------------------ lofting
// The kit is LOFTED, not stacked out of primitives (v11): a fuselage is one
// continuous surface from the nose cone to the tail, and a row of cylinders
// and cones reads as a row of cylinders and cones however well it is lit.
// `loft` sweeps a ring of superellipse points along z.

/** A superellipse ring: n points, counterclockwise from +x seen from +z. */
function superRing(w, h, p, n) {
  const pts = [], e = 2 / p;
  for (let j = 0; j < n; j++) {
    const a = j / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    pts.push([w * Math.sign(c) * Math.pow(Math.abs(c), e), h * Math.sign(s) * Math.pow(Math.abs(s), e)]);
  }
  return pts;
}

/**
 * Sweep rings along z. sections: [{ z, pts, x?, y? }], z ascending, every
 * ring the same length and counterclockwise seen from +z. Indexed, with
 * position, normal and uv (u around the ring, v along z), capped at both
 * ends on their own vertices so the rim stays a hard edge.
 */
function loft(sections, { capStart = true, capEnd = true } = {}) {
  const n = sections[0].pts.length;
  const z0 = sections[0].z, z1 = sections[sections.length - 1].z;
  const pos = [], uv = [], idx = [];
  for (const s of sections) {
    const ox = s.x || 0, oy = s.y || 0;
    for (let j = 0; j <= n; j++) {
      const p = s.pts[j % n];
      pos.push(ox + p[0], oy + p[1], s.z);
      uv.push(j / n, (s.z - z0) / ((z1 - z0) || 1));
    }
  }
  const R = n + 1;
  for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < n; j++) {
    const a = i * R + j, b = a + 1, c = a + R, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const cap = (s, back) => {
    const ox = s.x || 0, oy = s.y || 0;
    let cx = 0, cy = 0;
    for (const p of s.pts) { cx += p[0]; cy += p[1]; }
    cx /= n; cy /= n;
    const base = pos.length / 3;
    pos.push(ox + cx, oy + cy, s.z); uv.push(0.5, 0.5);
    for (const p of s.pts) { pos.push(ox + p[0], oy + p[1], s.z); uv.push(0.5 + p[0] * 0.4, 0.5 + p[1] * 0.4); }
    for (let j = 0; j < n; j++) {
      const a = base + 1 + j, b = base + 1 + (j + 1) % n;
      if (back) idx.push(base, b, a); else idx.push(base, a, b);
    }
  };
  if (capStart) cap(sections[0], true);
  if (capEnd) cap(sections[sections.length - 1], false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A body section from a table row: [z, halfWidth, halfHeight, centreY, squareness]. */
// one argument only: it is handed to Array.map, which would pass the index as
// a second one
const bodyRing = n => row => ({ z: row[0], y: row[3], pts: superRing(row[1], row[2], row[4] ?? 2.6, n) });

/** A small seeded random, so every ship of one colour wears the same wear. */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// The fuselage, nose to tail. Shared by both chassis: what differs is where
// the cans hang off it. The BAY is where the hull pinches in behind the
// cockpit and the machinery shows — the plates' open engine bays.
//  z       half-w  half-h   centre-y  squareness
const FUSE = [
  [-4.20, 0.20, 0.16, -0.02, 2.0],
  [-3.80, 0.35, 0.28,  0.00],
  [-3.00, 0.54, 0.41,  0.03],
  [-2.00, 0.67, 0.50,  0.06],
  [-1.00, 0.74, 0.55,  0.08],
  [ 0.10, 0.76, 0.56,  0.08],
  [ 0.45, 0.71, 0.53,  0.08],
  [ 0.70, 0.48, 0.45,  0.10],      // into the bay
  [ 1.90, 0.48, 0.45,  0.10],
  [ 2.15, 0.68, 0.52,  0.08],      // the rear hub the cans hang from
  [ 2.90, 0.61, 0.45,  0.08],
  [ 3.50, 0.40, 0.30,  0.10],
  [ 3.85, 0.20, 0.16,  0.12, 2.0],
];
const FZ0 = FUSE[0][0], FZ1 = FUSE[FUSE.length - 1][0];
const vOf = z => (z - FZ0) / (FZ1 - FZ0);
const BAY = [0.62, 2.02];

/**
 * The livery, painted for the fuselage's loft UVs: u runs round the section
 * from the right flank (0) over the top (0.25) to the left (0.5) and under
 * (0.75); v runs nose (0) to tail (1). The plates' scheme: cream above, the
 * accent below with a RAGGED edge where the paint has flaked, rust breaking
 * through at the nose and round the bay, panel seams and rivets, and the
 * bay itself dark — so the pinch in the hull reads as a hole.
 */
function liveryTexture(accent) {
  const W = 1024, H = 1024, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const hex = v => '#' + new THREE.Color(v).getHexString();
  const R = rng(accent * 7 + 3);
  const rgba = (v, a) => 'rgba(' + [v >> 16 & 255, v >> 8 & 255, v & 255].join(',') + ',' + a + ')';
  // NB the canvas's x is u and its y is v, so the nose is at the TOP
  g.fillStyle = hex(PAL.hull); g.fillRect(0, 0, W, H);
  // the lower half in the accent, a hand's width ABOVE the equator on both
  // flanks (u 0.47 left, 1.03 right — the canvas wraps), so from the chase
  // seat it reads, with a flaked edge each side
  g.fillStyle = hex(accent);
  g.fillRect(W * 0.47, 0, W * 0.53, H);
  g.fillRect(0, 0, W * 0.03, H);
  for (const edge of [0.47, 1.03]) {
    for (let i = 0; i < 260; i++) {
      const y = R() * H, r = 3 + R() * 11;
      // paint INTO the cream (drips up) and cream INTO the paint (flakes)
      const up = R() < 0.62;
      g.fillStyle = up ? hex(accent) : hex(PAL.hull);
      const x = (W * edge + (edge < 0.7 ? -1 : 1) * (up ? R() * 26 : -R() * 22)) % W;
      g.beginPath(); g.ellipse(x, y, r, r * (0.3 + R() * 0.4), 0, 0, 7); g.fill();
    }
  }
  // flecks of the accent up the flanks
  g.fillStyle = hex(accent);
  for (let i = 0; i < 70; i++) {
    const x = (R() < 0.5 ? 0.04 + R() * 0.10 : 0.36 + R() * 0.10) * W;
    g.beginPath(); g.ellipse(x, R() * H, 2 + R() * 4, 1 + R() * 1.5, 0, 0, 7); g.fill();
  }
  // rust: orange-brown, clustered at the nose, round the bay lip, at the tail
  const rust = (v0, v1, n, big) => {
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = (v0 + R() * (v1 - v0)) * H, r = 1.5 + R() * big;
      g.fillStyle = R() < 0.5 ? 'rgba(150,72,36,0.85)' : 'rgba(112,52,30,0.75)';
      g.beginPath(); g.ellipse(x, y, r * (1 + R()), r * 0.55, 0, 0, 7); g.fill();
    }
  };
  rust(0.0, 0.10, 90, 7);
  rust(vOf(BAY[0]) - 0.05, vOf(BAY[0]), 40, 5);
  rust(vOf(BAY[1]), vOf(BAY[1]) + 0.05, 40, 5);
  rust(0.15, 0.9, 50, 3);
  // panel seams round the section, and one along each flank
  g.strokeStyle = 'rgba(52,38,42,0.42)'; g.lineWidth = 1.5;
  for (const z of [-3.4, -2.4, -0.2, 0.35, 2.4, 3.2]) {
    const y = vOf(z) * H;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + 3); g.stroke();
  }
  for (const u of [0.10, 0.40]) { g.beginPath(); g.moveTo(u * W, vOf(-3.6) * H); g.lineTo(u * W, H); g.stroke(); }
  g.fillStyle = 'rgba(40,30,36,0.5)';
  for (const z of [-2.4, -0.2, 2.4]) for (let x = 5; x < W; x += 16) g.fillRect(x, vOf(z) * H + 5, 2, 2);
  // the bay: dark, with a hard lip where the skin was cut back
  const b0 = vOf(BAY[0]) * H, b1 = vOf(BAY[1]) * H;
  g.fillStyle = '#17151b'; g.fillRect(0, b0, W, b1 - b0);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, b0 - 14, W, 14); g.fillRect(0, b1, W, 12);
  g.fillStyle = '#c9c3b3'; g.fillRect(0, b0 - 5, W, 5); g.fillRect(0, b1, W, 5);
  // the tail cone in bare metal, rubbed
  g.fillStyle = 'rgba(40,36,44,0.18)'; g.fillRect(0, vOf(3.55) * H, W, H);
  const t = new THREE.CanvasTexture(c);
  // canvas row 0 is the NOSE (v = 0), so no flip: flipped, the bay's dark
  // band landed a metre forward of the bay, over the cockpit's back
  t.flipY = false;
  t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The pads' ground glow: a soft radial pool, additive. */
let _padGlow = null;
function padGlowMaterial(M) {
  return _padGlow || (_padGlow = new THREE.MeshBasicMaterial({
    map: M.glowTex, color: new THREE.Color(0.7, 1.4, 1.35),
    transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
}

// The chassis numbers the physics uses. v12: nothing hangs down to the
// pads any more — the cushion is invisible, as it is on every plate — so
// all that is left of the v11 pods is where the glow sits under them.
export const POD = {
  hw: 1.6, hl: 3.0,          // pad half-track, half-wheelbase (vehicle.js SPEC)
  glowIn: 0.62,              // the glow pools pulled in toward the hull, x
  glowUp: 0.04,              // m over the sand
};

/** A lathe along +z from a profile of [z, r]: cans, cones, spinners. */
function lathe(profile, n = 24) {
  const g = new THREE.LatheGeometry(profile.map(([z, r]) => new THREE.Vector2(Math.max(r, 0.0001), z)), n);
  g.rotateX(Math.PI / 2);          // lathe axis +y → +z
  return g;
}

/**
 * Build one ship. Returns a Group with userData:
 *   flares[]   the flame groups (scaled by N1 in vehicle.pose)
 *   fans[]     the turbine faces (spun by N1)
 *   hull       the fuselage mesh (flashed white on a strike)
 *   nozzles[]  local positions of the exhaust exits, for the haze
 *   corners[]  one per pad: where its ground glow goes
 *   glow       the pads' ground glow, one instanced mesh
 *   geos[]     merged geometries this ship owns, for dispose()
 *   mats[]     materials this ship owns, for dispose()
 *
 * v12, on the owner's direction: "more like the reference concept art than
 * actual formula cars ... it's a rocket sled after all". So: the plates. A
 * long cream fuselage from a chrome nose cone, a bubble canopy, the hull
 * pinched open behind the cockpit on a bay full of machinery, and CHROME
 * CANS — big ones, the size of the cockpit, which is what every plate is
 * about. The formula kit's wings, halo, floor and the pods on wishbones are
 * gone; the hover cushion is invisible, as it is in every picture.
 *
 * The rockets are still the chassis. NOSE: two cans on stub pylons either
 * side of the nose, open fans in their mouths, pulling — twin tail fins at
 * the back. AFT: two cans hung off the rear hub, pushing, their bores facing
 * the chase camera with a spinner and the turbine in each — one dorsal fin.
 */
export function buildCraft(env, accent, number, drive = 'front') {
  // a ship from the Blender pipeline, if one is registered for this chassis
  const model = models.ships[drive === 'front' ? 'nose' : 'aft'];
  if (model) return craftFromModel(model, env, accent, number, drive);

  const { M, acc } = materials(env, accent);
  const g = new THREE.Group();
  const hullMat = new THREE.MeshPhongMaterial({ map: liveryTexture(accent), color: 0xffffff, specular: 0x776655, shininess: 38 });
  hullMat.name = 'HULL';
  // fins and pylons: the cream without the livery map (their UVs are not the
  // fuselage's), weathered by a darker specular
  const trimMat = new THREE.MeshPhongMaterial({ color: PAL.hull, specular: 0x554433, shininess: 26 });
  trimMat.name = 'HULL';
  const geos = [], mats = [hullMat, trimMat];

  const add = (geometry, mat, cast = true, parent = g) => {
    const m = new THREE.Mesh(geometry, mat);
    m.castShadow = cast; m.receiveShadow = false;
    parent.add(m); geos.push(geometry);
    return m;
  };
  const front = drive === 'front';

  // ---- the fuselage ---------------------------------------------------------
  const hull = add(geo('fuse', () => loft(FUSE.map(bodyRing(28)))), hullMat);

  // ---- the nose cone and probe, the canopy frame ---------------------------
  const chromeParts = [
    { g: geo('noseCone', () => lathe([[-4.95, 0], [-4.80, 0.05], [-4.55, 0.11], [-4.32, 0.15], [-4.17, 0.17], [-4.12, 0.165]])), pos: [0, -0.02, 0] },
    { g: geo('probe', () => zCyl(0.012, 0.02, 0.6, 6)), pos: [0, -0.02, -5.22] },
    { g: geo('canopyBar', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.56, -2.1), new THREE.Vector3(0, 0.88, -1.6),
      new THREE.Vector3(0, 0.95, -1.05), new THREE.Vector3(0, 0.82, -0.45), new THREE.Vector3(0, 0.62, -0.1)]), 16, 0.025, 5, false)) },
    { g: geo('canopyHoop', () => new THREE.TorusGeometry(1, 0.03, 5, 20, Math.PI)), pos: [0, 0.58, -1.62], scale: [0.39, 0.34, 1] },
  ];
  // the canopy: a bubble sitting down into the hull, dark cockpit under it
  const glass = add(geo('canopy', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)), M.glass, false);
  glass.position.set(0, 0.52, -1.1); glass.scale.set(0.41, 0.44, 1.02);
  const intakeParts = [
    { g: geo('cockpit', () => new THREE.SphereGeometry(1, 16, 8)), pos: [0, 0.54, -1.1], scale: [0.38, 0.12, 0.94] },
  ];
  const accentParts = [
    { g: geo('helmet', () => new THREE.SphereGeometry(1, 10, 8)), pos: [0, 0.74, -0.95], scale: [0.17, 0.18, 0.20] },
  ];

  // ---- the bay: machinery where the skin was cut back -----------------------
  const gunParts = [];
  for (const s of [-1, 1]) {
    // three cylinder blocks along each side, finned
    for (const [y, r, z0, z1] of [[0.26, 0.11, 0.72, 1.86], [0.02, 0.14, 0.80, 1.80], [-0.22, 0.10, 0.72, 1.70]]) {
      gunParts.push({ g: geo('bayCyl' + r, () => zCyl(r, r, 1, 12)), pos: [s * 0.52, y, (z0 + z1) / 2], scale: [1, 1, z1 - z0] });
      for (let z = z0 + 0.14; z < z1 - 0.05; z += 0.21) {
        gunParts.push({ g: geo('bayFin', () => new THREE.TorusGeometry(1, 0.22, 3, 10)), pos: [s * 0.52, y, z], scale: [r * 1.05, r * 1.05, 0.2] });
      }
    }
    // the plumbing, in chrome: headers out of the blocks into the cans
    chromeParts.push(
      { g: geo('pipeA' + s, () => pipe([s * 0.54, 0.30, 0.9], [s * 0.70, 0.46, 1.4], [s * 0.90, 0.34, 1.95], 0.04)) },
      { g: geo('pipeB' + s, () => pipe([s * 0.58, 0.05, 1.0], [s * 0.76, -0.06, 1.5], [s * 0.94, 0.04, 2.0], 0.045)) },
      { g: geo('pipeC' + s, () => pipe([s * 0.52, -0.20, 0.85], [s * 0.70, -0.32, 1.3], [s * 0.76, -0.26, 1.9], 0.035)) },
    );
  }
  // the blower standing up out of the top of the bay, and its stacks
  gunParts.push(
    { g: geo('blower', () => new THREE.BoxGeometry(0.40, 0.22, 0.70)), pos: [0, 0.66, 1.25] },
    { g: geo('blowerTop', () => zCyl(0.13, 0.13, 0.85, 12)), pos: [0, 0.83, 1.25] },
  );
  // short velocity stacks off the blower, dark: tall and chrome they read as a comb
  for (const s of [-1, 1]) for (const z of [1.0, 1.5]) {
    gunParts.push({ g: geo('stack', () => new THREE.CylinderGeometry(0.05, 0.06, 0.16, 10)), pos: [s * 0.13, 0.95, z] });
  }

  // ---- the cans -------------------------------------------------------------
  // Where the rockets are IS the chassis, and the physics applies the thrust
  // at the same axle. Each can is one lathe: a rounded cowl, the barrel, a
  // taper to the exit, a lip turned in.
  const nozzles = [], fans = [], flares = [];
  const cx = front ? 1.20 : 1.14, cy = front ? 0.00 : 0.06;
  const cr = front ? 0.50 : 0.56, cl = front ? 2.0 : 2.2;
  const cz = front ? -2.35 : 2.85;                        // can centre z
  const zF = cz - cl / 2, zB = cz + cl / 2;
  const canGeo = geo(front ? 'canF' : 'canA', () => front
    // NOSE: an open mouth at the front (the fan shows) and a bell at the back
    ? lathe([[zF - cz, cr * 0.86], [zF - cz + 0.02, cr * 1.02], [zF - cz + 0.14, cr], [zB - cz - 0.30, cr], [zB - cz - 0.05, cr * 0.86], [zB - cz, cr * 0.80]], 28)
    // AFT: a closed cowl rounding into the hub, the barrel, a WIDE bore at the back
    : lathe([[zF - cz - 0.05, 0.0], [zF - cz + 0.05, cr * 0.55], [zF - cz + 0.30, cr * 0.92], [zF - cz + 0.62, cr], [zB - cz - 0.25, cr], [zB - cz - 0.02, cr * 1.03], [zB - cz, cr * 0.96]], 28));
  // the bore: a dark tube just inside the lip, so the exit is a hole
  const boreGeo = geo(front ? 'boreF' : 'boreA', () => zCyl(cr * 0.9, cr * 0.9, 0.6, 24, true));
  for (const side of [-1, 1]) {
    const sx = side * cx;
    chromeParts.push({ g: canGeo, pos: [sx, cy, cz] });
    gunParts.push(
      // two dark bands round the barrel, as on the plates
      { g: geo('band', () => new THREE.TorusGeometry(1, 0.03, 6, 28)), pos: [sx, cy, cz - cl * 0.12], scale: [cr + 0.005, cr + 0.005, 1] },
      { g: geo('band'), pos: [sx, cy, cz + cl * 0.02], scale: [cr + 0.005, cr + 0.005, 1] },
    );
    intakeParts.push({ g: boreGeo, pos: [sx, cy, front ? zB - 0.32 : zB - 0.32] });
    if (front) {
      // a stub pylon out to the hull, in the trim, and a dark intake throat
      accentParts.push({ g: geo(side > 0 ? 'pylR' : 'pylL', () => loft([
        { z: -2.8, x: side * 0.72, y: -0.02, pts: superRing(0.50, 0.06, 3, 12) },
        { z: -2.0, x: side * 0.72, y: -0.02, pts: superRing(0.50, 0.08, 3, 12) },
        { z: -1.5, x: side * 0.62, y: 0.0, pts: superRing(0.22, 0.05, 3, 12) }])) });
      intakeParts.push({ g: geo('throatF', () => zCyl(cr * 0.9, cr * 0.9, 0.5, 24, true)), pos: [sx, cy, zF + 0.3] });
      // spinner in the mouth, chrome
      chromeParts.push({ g: geo('spinnerF', () => lathe([[-0.2, 0], [-0.12, 0.08], [0.02, 0.12], [0.1, 0.12]], 14)), pos: [sx, cy, zF + 0.16] });
    } else {
      // a spinner in the bore — the bullet in the hole on the plates
      chromeParts.push({ g: geo('spinnerA', () => lathe([[-0.1, 0.16], [0.1, 0.15], [0.3, 0.10], [0.45, 0.0]], 16)), pos: [sx, cy, zB - 0.35] });
    }
    // the turbine face: in the mouth on the NOSE cans, deep in the bore on the AFT
    const fan = new THREE.Mesh(geo('fanDisc', () => { const b = new THREE.CircleGeometry(1, 20); b.rotateY(Math.PI); return b; }), M.fan);
    fan.scale.setScalar(cr * 0.88);
    if (front) fan.position.set(sx, cy, zF + 0.28);
    else { fan.position.set(sx, cy, zB - 0.55); fan.rotation.y = Math.PI; }
    fan.castShadow = false; fan.name = side < 0 ? 'fan_L' : 'fan_R';
    g.add(fan); fans.push(fan);

    const flame = makeFlame(M);
    flame.name = 'flame';
    const fz = front ? zB - 0.1 : zB - 0.05;
    flame.position.set(sx, cy, fz);
    flame.scale.setScalar(front ? 1.2 : 1.3);
    flame.userData.base = flame.scale.x;
    g.add(flame); flares.push(flame);
    mats.push(flame.userData.core.material, flame.userData.sheath.material, flame.userData.glow.material);
    nozzles.push(new THREE.Vector3(sx, cy, zB + 0.1));
    // the empties the pipeline contract names, so an export of the kit IS a
    // reference file (pipeline/README.md)
    const e = new THREE.Object3D(); e.name = side < 0 ? 'nozzle_L' : 'nozzle_R';
    e.position.set(sx, cy, zB + 0.1); g.add(e);
  }
  // NOSE: a smaller pair at the tail — the plate "5" with cans fore and aft.
  // They are the sustainers: the thrust is still all at the front (the
  // physics has it there), these only burn, a short flame on the same N1.
  // Haze and wash stay keyed to the two main nozzles (userData.nozzles).
  if (front) for (const side of [-1, 1]) {
    const sr = 0.30, sl = 1.25, sz = 3.05, sx = side * 0.88, sy = 0.10;
    chromeParts.push({ g: geo('canS', () => lathe([[-sl / 2 - 0.05, 0], [-sl / 2 + 0.05, sr * 0.6], [-sl / 2 + 0.25, sr * 0.95], [-sl / 2 + 0.4, sr], [sl / 2 - 0.15, sr], [sl / 2, sr * 1.04]], 16)), pos: [sx, sy, sz] });
    gunParts.push({ g: geo('band'), pos: [sx, sy, sz + 0.1], scale: [sr + 0.005, sr + 0.005, 1] });
    intakeParts.push({ g: geo('boreS', () => zCyl(sr * 0.88, sr * 0.88, 0.5, 16, true)), pos: [sx, sy, sz + sl / 2 - 0.25] });
    chromeParts.push({ g: geo('spinnerS', () => lathe([[-0.1, 0.09], [0.08, 0.08], [0.24, 0.0]], 12)), pos: [sx, sy, sz + sl / 2 - 0.3] });
    const flame = makeFlame(M);
    flame.name = 'flame';
    flame.position.set(sx, sy, sz + sl / 2 - 0.05);
    flame.scale.setScalar(0.6);
    flame.userData.base = 0.6;
    g.add(flame); flares.push(flame);
    mats.push(flame.userData.core.material, flame.userData.sheath.material, flame.userData.glow.material);
  }
  // AFT: a strut from the hub to each can, low, so the can reads as hung
  if (!front) for (const s of [-1, 1]) {
    accentParts.push({ g: geo(s > 0 ? 'strutR' : 'strutL', () => loft([
      { z: 2.1, x: s * 0.80, y: -0.05, pts: superRing(0.30, 0.06, 3, 10) },
      { z: 3.3, x: s * 0.80, y: -0.05, pts: superRing(0.30, 0.06, 3, 10) }])) });
  }

  // ---- fins -----------------------------------------------------------------
  // a swept blade from a table of [z, half-thickness, height, root-y], and
  // turned out by `lean` about its root
  const fin = rows => loft(rows.map(([z, t, h, y]) => ({ z, y: y + h / 2, pts: superRing(t, h / 2, 2.2, 8) })));
  const trimParts = [];
  if (front) {
    // twin tail fins, canted out — short: at the chase seat they are the
    // whole back of the sled, and tall they read as a jet's
    for (const s of [-1, 1]) {
      const f = geo(s > 0 ? 'finR' : 'finL', () => {
        const b = fin([[2.75, 0.02, 0.08, 0.46], [3.25, 0.03, 0.42, 0.42], [3.72, 0.022, 0.58, 0.38], [3.92, 0.012, 0.54, 0.42]]);
        b.translate(0, -0.40, 0); b.rotateZ(-s * 0.32); b.translate(s * 0.30, 0.40, 0);
        return b;
      });
      trimParts.push({ g: f });
    }
  } else {
    // one dorsal fin, swept hard, rising out of the rear hub
    trimParts.push({ g: geo('finD', () => fin([[2.30, 0.02, 0.10, 0.50], [2.90, 0.04, 0.55, 0.48], [3.55, 0.03, 0.95, 0.40], [3.86, 0.015, 0.92, 0.44]])) });
    // a needle stabiliser out each side of the hub, as on the "7" plate
    for (const s of [-1, 1]) trimParts.push({ g: geo(s > 0 ? 'stabR' : 'stabL', () => loft([
      { z: 2.3, x: s * 0.62, y: 0.30, pts: superRing(0.06, 0.025, 2.4, 8) },
      { z: 3.2, x: s * 0.80, y: 0.36, pts: superRing(0.08, 0.025, 2.4, 8) },
      { z: 3.6, x: s * 0.84, y: 0.38, pts: superRing(0.03, 0.02, 2.4, 8) }])) });
  }
  // a chrome tail cone, the nose cone's twin
  chromeParts.push({ g: geo('tailCone', () => lathe([[3.80, 0.20], [3.95, 0.19], [4.15, 0.13], [4.35, 0.05], [4.45, 0]])), pos: [0, 0.12, 0] });
  // belly skids: two shallow keels, the only thing under the hull
  for (const s of [-1, 1]) gunParts.push({ g: geo('keel', () => loft([
    { z: -2.6, y: -0.42, pts: superRing(0.03, 0.02, 2.4, 8) },
    { z: -1.8, y: -0.50, pts: superRing(0.035, 0.05, 2.4, 8) },
    { z: 2.4, y: -0.49, pts: superRing(0.035, 0.05, 2.4, 8) },
    { z: 3.0, y: -0.40, pts: superRing(0.03, 0.02, 2.4, 8) }])), pos: [s * 0.34, 0, 0] });

  add(merge(chromeParts), M.chrome);
  add(merge(gunParts), M.gun);
  add(merge(intakeParts), M.intake, false);
  add(merge(accentParts), acc);
  add(merge(trimParts), trimMat);

  // the pads' glow: one pool on the sand under each, one draw call
  const corners = [0, 1, 2, 3].map(i => ({ pad: i }));
  const glow = new THREE.InstancedMesh(geo('glowQuad', () => { const b = new THREE.PlaneGeometry(1, 1); b.rotateX(-Math.PI / 2); return b; }), padGlowMaterial(M), 4);
  glow.frustumCulled = false; glow.castShadow = false;
  glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  g.add(glow);

  // ---- the number: a roundel each flank, and on the nose ---------------------
  const numMat = new THREE.MeshBasicMaterial({ map: numberTexture(number, accent), transparent: true });
  numMat.name = 'DECAL';
  mats.push(numMat);
  add(merge([
    { g: geo('decal', () => new THREE.PlaneGeometry(1, 1)), pos: [0.772, 0.16, -0.40], rot: [0, Math.PI / 2, 0], scale: [0.70, 0.70, 1] },
    { g: geo('decal'), pos: [-0.772, 0.16, -0.40], rot: [0, -Math.PI / 2, 0], scale: [0.70, 0.70, 1] },
    { g: geo('decal'), pos: [0, 0.49, -2.85], rot: [-Math.PI / 2 + 0.14, 0, 0], scale: [0.50, 0.50, 1] },
  ]), numMat, false);

  hull.name = 'hull';
  g.traverse(o => { if (o.isMesh || o.isSprite) o.layers.set(1); });
  g.layers.set(1);           // the HD layer: drawn full-res over the PS2 world
  // and its shadow, after the traverse so it keeps its own layer
  const B = (pos, scale) => ({ g: ubox(), pos, scale });
  const cast = castProxy([
    B([0, 0.08, -0.2], [1.4, 1.05, 7.6]),                    // fuselage
    B([0, 0.08, -4.3], [0.4, 0.3, 1.0]),                     // nose
    B([0, 0.72, -1.1], [0.6, 0.35, 1.7]),                    // canopy
    B([cx, cy, cz], [cr * 1.9, cr * 1.9, cl]), B([-cx, cy, cz], [cr * 1.9, cr * 1.9, cl]),   // the cans
    front ? B([0, 0.1, 3.05], [2.4, 0.6, 1.25]) : B([0, 0.85, 3.3], [0.08, 0.9, 1.3]),        // fins
  ]);
  g.add(cast); geos.push(cast.geometry);
  g.userData = { flares, fans, hull, nozzles, corners, glow, geos, mats, front, cast };
  return g;
}

/**
 * A ship from a loaded .glb, dressed in the game's materials. The model
 * supplies geometry, the HULL's own painted texture (and normal map, if
 * any), the FAN's texture if it has one, and the two nozzle empties; the
 * game supplies chrome that reflects THIS sky, the accent colour, the
 * numeral, the flames and the haze. Same userData contract as the kit, so
 * vehicle.pose() cannot tell them apart. Geometry is shared with the
 * registry and must not be disposed per ship, hence geos: [].
 */
export function craftFromModel(m, env, accent, number, drive) {
  const { M, acc } = materials(env, accent);
  const g = m.scene.clone(true);
  // ONE HULL material per source map: a ship can carry more than one HULL
  // mesh (the kit's reference export has the mapped fuselage AND unmapped
  // trim), and with a single shared material whichever mesh came last set
  // the map for all of them — the trim's panel texture over the livery.
  const hullMats = new Map();
  const hullFor = src => {
    const key = (src && src.map) || null;
    let hm = hullMats.get(key);
    if (!hm) {
      hm = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0x554433, shininess: 28 });
      hm.name = 'HULL';
      hm.map = key || panelTexture(accent);
      if (src && src.normalMap) hm.normalMap = src.normalMap;
      hullMats.set(key, hm);
    }
    return hm;
  };
  const numMat = new THREE.MeshBasicMaterial({ map: numberTexture(number, accent), transparent: true });
  numMat.name = 'DECAL';
  const mats = [numMat];
  let hull = null;
  g.traverse(o => {
    if (!o.isMesh) return;
    const src = o.material, name = src && src.name;
    switch (name) {
      case 'HULL':
        o.material = hullFor(src);
        // the strike flash goes on the painted hull, not a strip of trim
        if (!hull || (src.map && !hull.userData.mapped)) { hull = o; o.userData.mapped = !!src.map; }
        break;
      case 'ACCENT':   o.material = acc; break;
      case 'CHROME':   o.material = M.chrome; break;
      case 'GUNMETAL': o.material = M.gun; break;
      case 'GLASS':    o.material = M.glass; break;
      case 'INTAKE':   o.material = M.intake; break;
      case 'DECAL':    o.material = numMat; break;
      case 'FAN':      if (!src.map) o.material = M.fan; break;
      default: break;                            // left as authored
    }
    o.castShadow = name !== 'GLASS' && name !== 'DECAL';
    o.receiveShadow = false;
  });
  g.updateMatrixWorld(true);
  const geos = [];
  const fans = SHIP.fans.map(n => g.getObjectByName(n)).filter(Boolean);
  // A fan is SPUN (`fan.rotation.z` in vehicle.pose), and a rotation turns a
  // mesh about its own origin. Blender bakes each object's geometry wherever
  // it sits in the scene and leaves the origin at the world centre unless you
  // move it, so a turbine face exported the obvious way orbits the ship at the
  // radius of its own offset instead of spinning in place — two black discs
  // swinging out past the hull, which is exactly what the first authored pair
  // did. Re-centre it here rather than demanding the exporter get it right:
  // the geometry moves onto its own origin and the object moves out to meet
  // it, so the mesh does not move and the spin becomes a spin.
  for (const f of fans) {
    const geo = f.geometry.clone();              // never translate a shared one twice
    geo.computeBoundingBox();
    const c = geo.boundingBox.getCenter(new THREE.Vector3());
    if (c.lengthSq() > 1e-6) {
      geo.translate(-c.x, -c.y, -c.z);
      f.position.add(c.clone().applyQuaternion(f.quaternion).multiply(f.scale));
    }
    // ...and the turbine face is a TEXTURE, so the disc needs somewhere to put
    // it. A ring of verts built in Blender carries position and normal and no
    // uv at all, and a mapped material with no uv samples (0,0) for every
    // fragment — which is not a subtle fault, it is a solid black disc in the
    // mouth of each nacelle. The disc is flat and faces its own -z, so a
    // planar map off its bounding box is exactly right.
    if (!geo.attributes.uv) {
      const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
      geo.computeBoundingBox();
      const b = geo.boundingBox, w = b.max.x - b.min.x || 1, h = b.max.y - b.min.y || 1;
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) - b.min.x) / w;
        uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / h;
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    f.geometry = geo;
    geos.push(geo);
  }
  g.updateMatrixWorld(true);
  const nozzles = SHIP.empties.map(n => g.getObjectByName(n).getWorldPosition(new THREE.Vector3()));
  const flares = nozzles.map(p => {
    const f = makeFlame(M); f.name = 'flame';
    f.position.copy(p).z -= 0.3;                 // the flame starts inside the bell
    g.add(f);
    mats.push(f.userData.core.material, f.userData.sheath.material, f.userData.glow.material);
    return f;
  });
  g.traverse(o => { if (o.isMesh || o.isSprite) o.layers.set(1); });
  g.layers.set(1);
  // its shadow (see castProxy): the model's own box, a little narrower —
  // a Blender ship has no kit numbers to build boxes from
  const bb = new THREE.Box3().setFromObject(g), bs = bb.getSize(new THREE.Vector3()), bc = bb.getCenter(new THREE.Vector3());
  const cast = castProxy([{ g: ubox(), pos: bc.toArray(), scale: [bs.x * 0.8, bs.y * 0.7, bs.z * 0.95] }]);
  g.add(cast); geos.push(cast.geometry);
  mats.push(...hullMats.values());
  // the cushion's glow, as on the kit: an imported ship has no pods either,
  // and without this it had no contact cue at all (vehicle.posePods)
  const corners = [0, 1, 2, 3].map(i => ({ pad: i }));
  const glow = new THREE.InstancedMesh(geo('glowQuad', () => { const b = new THREE.PlaneGeometry(1, 1); b.rotateX(-Math.PI / 2); return b; }), padGlowMaterial(M), 4);
  glow.frustumCulled = false; glow.castShadow = false;
  glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  glow.layers.set(1);
  g.add(glow);
  g.userData = { flares, fans, hull: hull || { material: hullFor(null) }, nozzles, corners, glow, geos, mats, model: m.file, cast };
  return g;
}

export function disposeCraft(g) {
  for (const geometry of g.userData.geos) geometry.dispose();
  for (const m of g.userData.mats) { if (m.map) m.map.dispose(); m.dispose(); }
}
