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
// v11, on the owner's direction ("formula-shaped"): the kit is a FORMULA CAR
// — see buildCraft. The rockets, fans, flames, chrome and the material
// contract are unchanged; the body around them is new, and the four hover
// pads the physics has always run on are finally VISIBLE, as pods on
// wishbones where the wheels would be.
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
    // v11: most of the formula kit's GUNMETAL is carbon — floor, wings, pods,
    // arms — so it is darker and less metallic than the old bands and bells
    // were: a glossy near-black that still catches the sky along its edges
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
// v11: the formula kit is LOFTED, not stacked out of primitives. A formula
// car is one continuous surface from the nose tip to the gearbox, and a row of
// cylinders and cones reads as a row of cylinders and cones however well it
// is lit. `loft` sweeps a ring of points along z; the rings are superellipses
// for bodywork and cambered airfoils for the wings.

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
 * A cambered airfoil ring, chord along +x from the leading edge at 0, 2k
 * points, counterclockwise. `aoa` pitches the trailing edge UP about the
 * leading edge, and a NEGATIVE camber is an inverted foil: a downforce wing.
 */
function airfoilRing(chord, th, camber, aoa, k = 8) {
  const yt = x => 5 * th * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  const yc = x => camber * 4 * x * (1 - x);
  const raw = [];
  for (let i = 0; i < k; i++) { const x = 0.5 * (1 + Math.cos(i / k * Math.PI)); raw.push([x, yc(x) + yt(x)]); }
  for (let i = 0; i < k; i++) { const x = 0.5 * (1 - Math.cos(i / k * Math.PI)); raw.push([x, yc(x) - yt(x)]); }
  const c = Math.cos(aoa), s = Math.sin(aoa);
  return raw.map(([x, y]) => [(x * c - y * s) * chord, (x * s + y * c) * chord]);
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

/**
 * A wing spanning x from -span to +span: an airfoil lofted along the span and
 * turned so the chord runs back along +z from the leading edge at `le`.
 * rotateY(-90deg) sends the loft axis to -x and the chord to +z, which keeps
 * the leading edge FORWARD — the other way round puts it at the back.
 */
function wing(chord, th, camber, aoa, span, le, y, k = 8) {
  const ring = airfoilRing(chord, th, camber, aoa, k);
  const g = loft([{ z: -span, pts: ring }, { z: span, pts: ring }]);
  g.rotateY(-Math.PI / 2);
  g.translate(0, y, le);
  return g;
}

const _up = new THREE.Vector3(0, 1, 0);
/** A round rod from a to b: suspension arms, pylons, stalks. */
function rod(a, b, r, n = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(r, r, A.distanceTo(B), n, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, B.clone().sub(A).normalize()));
  const m = A.add(B).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

/**
 * The livery, painted for the tub's loft UVs: u runs round the section from
 * the right flank (0) over the top (0.25) to the left (0.5) and under (0.75);
 * v runs from the nose tip (0) to the gearbox (1). Cream bodywork, the accent
 * down the spine and across the nose, a pinstripe along each flank, and a
 * dark underside — the formula car's oldest trick, one colour on top.
 */
function liveryTexture(accent) {
  const W = 512, H = 256, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const hex = v => '#' + new THREE.Color(v).getHexString();
  g.fillStyle = hex(PAL.hull); g.fillRect(0, 0, W, H);
  // the dark underside (u 0.62..0.88)
  g.fillStyle = '#26232c'; g.fillRect(W * 0.62, 0, W * 0.26, H);
  // the spine stripe, widening toward the cockpit
  g.fillStyle = hex(accent);
  g.beginPath();
  g.moveTo(W * 0.215, 0); g.lineTo(W * 0.285, 0);
  g.lineTo(W * 0.31, H * 0.42); g.lineTo(W * 0.30, H); g.lineTo(W * 0.20, H);
  g.lineTo(W * 0.19, H * 0.42); g.closePath(); g.fill();
  // the nose band
  g.fillRect(0, 0, W, H * 0.07);
  // flank pinstripes
  g.fillRect(W * 0.02, H * 0.1, W * 0.012, H * 0.9);
  g.fillRect(W * 0.468, H * 0.1, W * 0.012, H * 0.9);
  // panel lines and fasteners: the HD detail the PS2 world lacks
  g.strokeStyle = 'rgba(40,30,40,0.30)'; g.lineWidth = 1;
  for (const v of [0.18, 0.36, 0.52, 0.71, 0.86]) { g.beginPath(); g.moveTo(0, H * v); g.lineTo(W, H * v + 2); g.stroke(); }
  g.fillStyle = 'rgba(30,24,34,0.4)';
  for (let x = 6; x < W; x += 14) for (const v of [0.19, 0.53, 0.72]) g.fillRect(x, H * v + 4, 1.5, 1.5);
  // wear: chips at the leading edges, the plates' weathered livery
  g.fillStyle = 'rgba(' + [accent >> 16 & 255, accent >> 8 & 255, accent & 255].join(',') + ',0.35)';
  for (let i = 0; i < 18; i++) g.fillRect(Math.random() * W, Math.random() * H * 0.3, 3 + Math.random() * 10, 1 + Math.random() * 2);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The pods' ground glow: a soft radial pool, additive. */
let _padGlow = null;
function padGlowMaterial(M) {
  return _padGlow || (_padGlow = new THREE.MeshBasicMaterial({
    map: M.glowTex, color: new THREE.Color(0.7, 1.4, 1.35),
    transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
}

// The chassis numbers the physics uses, so the pods sit on the pads.
export const POD = {
  hw: 1.6, hl: 3.0,          // pad half-track, half-wheelbase (vehicle.js SPEC)
  r: 0.27, len: 0.95,        // pod capsule radius and straight length
  squash: 0.74,              // pods are flatter than they are wide
  clear: 0.07,               // m between the pod's belly and the sand it rides on
  pivotY: -0.25,             // where the wishbones meet the chassis
  travel: [-0.42, 0.22],     // how far a pod may droop / rise from the pivot, m
};

/**
 * Build one ship. Returns a Group with userData:
 *   flares[]   the two flame groups (scaled by N1 in vehicle.pose)
 *   fans[]     the two turbine faces (spun by N1)
 *   hull       the merged hull mesh (flashed white on a strike)
 *   nozzles[]  local positions of the two exhaust exits, for the haze
 *   corners[]  the four pod assemblies, posed onto the ground by vehicle.pose
 *   glow       the pods' ground glow, one instanced mesh
 *   geos[]     merged geometries this ship owns, for dispose()
 *   mats[]     materials this ship owns, for dispose()
 *
 * v11, on the owner's direction: FORMULA-SHAPED. A lofted monocoque from a
 * needle nose to the gearbox, a halo over an open cockpit, sidepods, a floor
 * and diffuser, a front wing, a rear wing on tall endplates — and four hover
 * pods on carbon wishbones where the wheels would be, exactly over the four
 * pads the physics runs on, so what holds the car up is what you can see.
 * The pods ride their own suspension (vehicle.pose puts each one on the sand
 * under its pad, so a loaded pod sinks and an unloaded one droops) and the
 * front pair steers. The rockets are still the chassis: NOSE cans ride the
 * flanks ahead of the sidepods and pull, AFT cans sit in the tail under the
 * rear wing and push, and the physics applies the thrust at the same axle.
 */
export function buildCraft(env, accent, number, drive = 'front') {
  // a ship from the Blender pipeline, if one is registered for this chassis
  const model = models.ships[drive === 'front' ? 'nose' : 'aft'];
  if (model) return craftFromModel(model, env, accent, number, drive);

  const { M, acc } = materials(env, accent);
  const g = new THREE.Group();
  const hullMat = new THREE.MeshPhongMaterial({ map: liveryTexture(accent), color: 0xffffff, specular: 0x665544, shininess: 34 });
  hullMat.name = 'HULL';
  const geos = [], mats = [hullMat];

  const add = (geometry, mat, cast = true, parent = g) => {
    const m = new THREE.Mesh(geometry, mat);
    m.castShadow = cast; m.receiveShadow = false;
    parent.add(m); geos.push(geometry);
    return m;
  };
  const front = drive === 'front';
  const R16 = bodyRing(16), R20 = bodyRing(20);

  // ---- the tub: nose tip to gearbox, one surface ---------------------------
  //  z       half-w  half-h   centre-y
  const TUB = [
    [-5.00, 0.09, 0.06, -0.33, 2.2],
    [-4.70, 0.15, 0.10, -0.26],
    [-4.00, 0.24, 0.15, -0.14],
    [-3.10, 0.30, 0.19, -0.05],
    [-2.20, 0.37, 0.24,  0.03],
    [-1.50, 0.42, 0.28,  0.06],
    [-0.40, 0.44, 0.30,  0.05],
    [ 0.30, 0.42, 0.33,  0.07],
    [ 1.20, 0.36, 0.28,  0.02],
    [ 2.20, 0.26, 0.21, -0.07],
    [ 3.00, 0.18, 0.16, -0.14],
    [ 3.45, 0.13, 0.11, -0.18, 2.2],
  ];
  const hull = add(geo('tub', () => loft(TUB.map(R20))), hullMat);

  // ---- bodywork: sidepods and engine cover, in the hull's livery -----------
  // v11: these were ACCENT, and from the chase seat they are most of what
  // you see of the car — so it read as a dark maroon lump against the sand.
  // The plates' cars are cream with the colour in the STRIPES; on the
  // livery's u-around mapping the spine stripe runs along the top of each
  // sidepod and the cover, which is where a racing stripe goes anyway.
  const SIDEPOD = [
    //  z     half-w half-h  y      x
    [-1.05, 0.26, 0.18, -0.18, 0.80],
    [-0.80, 0.33, 0.24, -0.16, 0.82],
    [ 0.40, 0.34, 0.25, -0.18, 0.82],
    [ 1.40, 0.24, 0.19, -0.25, 0.66],
    [ 2.35, 0.11, 0.11, -0.31, 0.47],
  ];
  const pod = side => loft(SIDEPOD.map(([z, w, h, y, x]) => ({ z, x: side * x, y, pts: superRing(w, h, 2.8, 16) })));
  const COVER = [
    [-0.05, 0.20, 0.09, 0.45],
    [ 0.35, 0.24, 0.20, 0.53],
    [ 1.20, 0.18, 0.15, 0.43],
    [ 2.20, 0.10, 0.10, 0.27],
    [ 3.05, 0.05, 0.05, 0.12],
  ];
  const FIN = [[0.9, 0.012, 0.04, 0.60, 2], [2.0, 0.012, 0.16, 0.56, 2], [3.25, 0.012, 0.22, 0.48, 2]];
  // endplates: a thin plate whose height changes along the chord
  const plate = (x, rows) => loft(rows.map(([z, h, y]) => ({ z, x, y, pts: superRing(0.014, h, 2.4, 8) })));
  add(merge([
    { g: geo('podR', () => pod(1)) },
    { g: geo('podL', () => pod(-1)) },
    { g: geo('cover', () => loft(COVER.map(R16))) },
  ]), hullMat);
  // ---- accent: fin, endplates, mirrors, helmet -----------------------------
  const accentParts = [
    { g: geo('fin', () => loft(FIN.map(bodyRing(8)))) },
    // front wing endplates
    { g: geo('fepR', () => plate(1.75, [[-4.98, 0.12, -0.46], [-4.40, 0.20, -0.40], [-3.95, 0.16, -0.40]])) },
    { g: geo('fepL', () => plate(-1.75, [[-4.98, 0.12, -0.46], [-4.40, 0.20, -0.40], [-3.95, 0.16, -0.40]])) },
    // rear wing endplates, tall
    { g: geo('repR', () => plate(1.09, [[3.30, 0.34, 0.30], [3.75, 0.55, 0.26], [4.18, 0.52, 0.29]])) },
    { g: geo('repL', () => plate(-1.09, [[3.30, 0.34, 0.30], [3.75, 0.55, 0.26], [4.18, 0.52, 0.29]])) },
    // mirrors, the helmet and the roll-hoop camera
    { g: geo('mirror', () => new THREE.SphereGeometry(1, 10, 6)), pos: [0.63, 0.40, -1.42], scale: [0.11, 0.05, 0.04] },
    { g: geo('mirror'), pos: [-0.63, 0.40, -1.42], scale: [0.11, 0.05, 0.04] },
    { g: geo('helmet', () => new THREE.SphereGeometry(1, 14, 10)), pos: [0, 0.43, -0.72], scale: [0.18, 0.19, 0.21] },
    { g: geo('tcam', () => new THREE.BoxGeometry(0.1, 0.06, 0.18)), pos: [0, 0.78, 0.30] },
  ];
  add(merge(accentParts), acc);

  // ---- carbon: floor, diffuser, wings ---------------------------------------
  const FLOOR = [[-2.40, 0.75], [-1.20, 0.95], [-0.60, 1.24], [2.20, 1.20], [2.90, 0.86], [3.40, 0.70]];
  const gunParts = [
    { g: geo('floor', () => loft(FLOOR.map(([z, w]) => ({ z, y: -0.50, pts: superRing(w, 0.025, 5, 12) })))) },
    // the diffuser ramps up out of the floor, split by strakes
    { g: geo('diff', () => loft([{ z: 2.70, y: -0.49, pts: superRing(0.74, 0.02, 5, 12) }, { z: 3.60, y: -0.28, pts: superRing(0.74, 0.02, 5, 12) }])) },
    ...[-0.5, 0, 0.5].map(x => ({ g: geo('strake', () => new THREE.BoxGeometry(0.02, 0.18, 0.9)), pos: [x, -0.4, 3.15], rot: [-0.22, 0, 0] })),
    // the front wing: a main plane on the floor line and a flap each side
    { g: geo('fwing', () => wing(0.62, 0.10, -0.035, 0.06, 1.74, -4.96, -0.52)) },
    { g: geo('fflapR', () => { const w = wing(0.36, 0.10, -0.04, 0.34, 0.72, -4.44, -0.44); w.translate(1.00, 0, 0); return w; }) },
    { g: geo('fflapL', () => { const w = wing(0.36, 0.10, -0.04, 0.34, 0.72, -4.44, -0.44); w.translate(-1.00, 0, 0); return w; }) },
    // the rear wing: main plane, a steep flap over it, and the beam wing
    { g: geo('rwing', () => wing(0.56, 0.11, -0.05, 0.10, 1.08, 3.40, 0.50)) },
    { g: geo('rflap', () => wing(0.32, 0.10, -0.05, 0.62, 1.08, 3.86, 0.62)) },
    { g: geo('beam', () => wing(0.30, 0.10, -0.04, 0.12, 0.55, 3.55, -0.06)) },
    // and the pillars that carry it off the gearbox
    { g: geo('pillar', () => rod([0, -0.1, 3.3], [0, 0.48, 3.62], 0.03)) },
  ];

  // ---- chrome: the halo, pylons, stalks — and the rockets ------------------
  const chromeParts = [
    { g: geo('halo', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.36, 0.30, -0.12), new THREE.Vector3(-0.31, 0.56, -0.45),
      new THREE.Vector3(0, 0.66, -0.74), new THREE.Vector3(0.31, 0.56, -0.45), new THREE.Vector3(0.36, 0.30, -0.12)]), 20, 0.035, 6, false)) },
    { g: geo('haloPost', () => rod([0, 0.66, -0.74], [0, 0.34, -1.30], 0.03)) },
    { g: geo('stalkR', () => rod([0.40, 0.33, -1.36], [0.56, 0.40, -1.42], 0.012, 4)) },
    { g: geo('stalkL', () => rod([-0.40, 0.33, -1.36], [-0.56, 0.40, -1.42], 0.012, 4)) },
  ];
  const intakeParts = [
    // the cockpit well and the visor
    { g: geo('well', () => new THREE.SphereGeometry(1, 16, 8)), pos: [0, 0.345, -0.78], scale: [0.29, 0.05, 0.56] },
    { g: geo('visor', () => new THREE.SphereGeometry(1, 12, 8)), pos: [0, 0.46, -0.86], scale: [0.14, 0.06, 0.09] },
    // the airbox mouth over the driver's head
    { g: geo('airbox', () => new THREE.SphereGeometry(1, 12, 8)), pos: [0, 0.60, -0.03], scale: [0.15, 0.12, 0.04] },
  ];

  // Where the rockets are IS the chassis. NOSE: two cans on pylons along the
  // flanks ahead of the sidepods, exhausting back over them — thrust at the
  // front axle. AFT: two cans in the tail beside the gearbox, under the rear
  // wing — thrust at the back. The physics applies it at the same axle.
  const nx = front ? 0.96 : 0.40, ny = front ? 0.08 : -0.10;
  const nr = front ? 0.165 : 0.18, nl = front ? 1.7 : 1.5;
  const nz = front ? -2.45 : 3.0;                       // can centre z
  const mouthZ = nz - nl / 2 - 0.04, bellZ = nz + nl / 2 + 0.18;
  const nozzles = [];
  for (const side of [-1, 1]) {
    const sx = side * nx;
    chromeParts.push(
      { g: geo(front ? 'canF' : 'canA', () => zCyl(nr, nr - 0.02, nl, 18)), pos: [sx, ny, nz] },
      // an OPEN ring: a capped collar sits in front of the turbine face and
      // hides it behind a chrome disc, which is what the first render showed
      { g: geo(front ? 'collarF' : 'collarA', () => zCyl(nr + 0.06, nr + 0.04, 0.22, 18, true)), pos: [sx, ny, mouthZ + 0.1] },
    );
    gunParts.push(
      { g: geo(front ? 'bellF' : 'bellA', () => zCyl(nr - 0.05, nr + 0.05, 0.36, 18, true)), pos: [sx, ny, bellZ] },
      { g: geo('ring', () => new THREE.TorusGeometry(1, 0.045, 8, 20)), pos: [sx, ny, nz - nl * 0.2], scale: [nr + 0.01, nr + 0.01, 1] },
      { g: geo('ring'), pos: [sx, ny, nz + nl * 0.25], scale: [nr + 0.01, nr + 0.01, 1] },
    );
    if (front) {
      // pylons from each can to the tub
      chromeParts.push(
        { g: geo(side > 0 ? 'pylR1' : 'pylL1', () => rod([side * 0.80, 0.10, -3.10], [side * 0.27, 0.00, -3.10], 0.035)) },
        { g: geo(side > 0 ? 'pylR2' : 'pylL2', () => rod([side * 0.80, 0.10, -2.00], [side * 0.36, 0.06, -2.00], 0.035)) },
      );
      // the sidepod mouth is only an intake on this chassis
      intakeParts.push({ g: geo('podMouth', () => new THREE.SphereGeometry(1, 12, 8)), pos: [side * 0.80, -0.18, -1.06], scale: [0.24, 0.16, 0.03] });
    } else {
      // the tail cans hang off the gearbox
      chromeParts.push({ g: geo(side > 0 ? 'hangR' : 'hangL', () => rod([side * 0.40, -0.10, 2.6], [side * 0.14, -0.12, 2.6], 0.03)) });
    }
    nozzles.push(new THREE.Vector3(sx, ny, bellZ + 0.18));
    // the empties the pipeline contract names, so an export of the kit IS a
    // reference file (pipeline/README.md)
    const e = new THREE.Object3D(); e.name = side < 0 ? 'nozzle_L' : 'nozzle_R';
    e.position.set(sx, ny, bellZ + 0.18); g.add(e);
  }
  add(merge(chromeParts), M.chrome);
  add(merge(gunParts), M.gun);
  add(merge(intakeParts), M.intake, false);

  // ---- live parts: fans, flames ---------------------------------------------
  // The turbine faces sit where the air goes in: the can mouths on the NOSE
  // chassis, the sidepod mouths on the AFT one (the sidepod IS its intake).
  const fans = [], flares = [];
  for (const side of [-1, 1]) {
    const fan = new THREE.Mesh(geo('fanDisc', () => { const b = new THREE.CircleGeometry(1, 18); b.rotateY(Math.PI); return b; }), M.fan);
    if (front) { fan.scale.setScalar(nr); fan.position.set(side * nx, ny, mouthZ); }
    else { fan.scale.set(0.22, 0.15, 1); fan.position.set(side * 0.80, -0.18, -1.07); }
    fan.castShadow = false; fan.name = side < 0 ? 'fan_L' : 'fan_R';
    g.add(fan); fans.push(fan);

    const flame = makeFlame(M);
    flame.name = 'flame';
    flame.position.set(side * nx, ny, bellZ - 0.1);
    flame.scale.setScalar(front ? 0.85 : 0.8);
    flame.userData.base = flame.scale.x;
    g.add(flame); flares.push(flame);
    mats.push(flame.userData.core.material, flame.userData.sheath.material, flame.userData.glow.material);
  }

  // ---- the pods: four corners on wishbones, posed by vehicle.pose ----------
  // Each corner is an ASSEMBLY pivoting where the arms meet the chassis, so a
  // pod travelling up and down swings on an arc the way a wheel does. The arms
  // and (at the back) the pod are one mesh; at the FRONT the pod is its own
  // mesh inside the assembly, because it also steers.
  const corners = [];
  const podGeo = geo('pod', () => {
    const b = new THREE.CapsuleGeometry(POD.r, POD.len, 4, 14);
    b.rotateX(Math.PI / 2); b.scale(1, POD.squash, 1);
    return b;
  });
  const skegGeo = geo('skeg', () => new THREE.BoxGeometry(0.03, 0.14, 0.9));
  for (const [i, [sx, sz]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].entries()) {
    const isFront = sz < 0;
    const inner = isFront ? 0.36 : 0.62;               // clear of the tub / the tail cans
    const L = POD.hw - inner;
    const asm = new THREE.Group();
    asm.position.set(sx * inner, POD.pivotY, sz * POD.hl);
    // arms in assembly space: a V above and a V below, meeting at the upright
    const ox = sx * L;
    const rods = [
      rod([0, 0.10, -0.36], [ox, 0.07, 0], 0.028), rod([0, 0.10, 0.30], [ox, 0.07, 0], 0.028),
      rod([0, -0.10, -0.40], [ox, -0.08, 0], 0.03), rod([0, -0.10, 0.34], [ox, -0.08, 0], 0.03),
      rod([sx * 0.1, 0.18, 0.02], [ox * 0.92, -0.08, 0], 0.022),          // the pushrod
    ];
    const armParts = rods.map(r => ({ g: r }));
    // at the back the pod is part of the arm mesh (it tilts a few degrees with
    // travel, like camber); at the front it is its own mesh, because it steers
    if (!isFront) armParts.push({ g: podGeo, pos: [ox, 0, 0] }, { g: skegGeo, pos: [ox + sx * 0.18, -0.02, 0] });
    add(merge(armParts), M.gun, true, asm);
    for (const r of rods) r.dispose();
    const holder = new THREE.Group();
    holder.position.set(ox, 0, 0);
    let podMesh = null;
    if (isFront) {
      podMesh = add(merge([{ g: podGeo }, { g: skegGeo, pos: [sx * 0.18, -0.02, 0] }]), M.gun, true, holder);
    }
    asm.add(holder);
    g.add(asm);
    corners.push({ asm, holder, pod: podMesh, side: sx, front: isFront, L, pad: i });
  }

  // the hover cushion's glow on the ground under each pod, one draw call
  const glow = new THREE.InstancedMesh(geo('glowQuad', () => { const b = new THREE.PlaneGeometry(1, 1); b.rotateX(-Math.PI / 2); return b; }), padGlowMaterial(M), 4);
  glow.frustumCulled = false; glow.castShadow = false;
  glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  g.add(glow);

  // ---- roundels: the nose, the engine cover, the rear wing ------------------
  const numMat = new THREE.MeshBasicMaterial({ map: numberTexture(number, accent), transparent: true });
  numMat.name = 'DECAL';
  mats.push(numMat);
  add(merge([
    { g: geo('decal', () => new THREE.PlaneGeometry(1, 1)), pos: [0, 0.105, -3.25], rot: [-Math.PI / 2, 0, 0], scale: [0.40, 0.40, 1] },
    { g: geo('decal'), pos: [0.205, 0.44, 1.05], rot: [0, Math.PI / 2, 0], scale: [0.30, 0.30, 1] },
    { g: geo('decal'), pos: [-0.205, 0.44, 1.05], rot: [0, -Math.PI / 2, 0], scale: [0.30, 0.30, 1] },
    { g: geo('decal'), pos: [0, 0.585, 3.63], rot: [-Math.PI / 2 + 0.1, 0, 0], scale: [0.46, 0.46, 1] },
  ]), numMat, false);

  hull.name = 'hull';
  g.traverse(o => { if (o.isMesh || o.isSprite) o.layers.set(1); });
  g.layers.set(1);           // the HD layer: drawn full-res over the PS2 world
  // and its shadow, after the traverse so it keeps its own layer
  const B = (pos, scale) => ({ g: ubox(), pos, scale });
  const cast = castProxy([
    B([0, 0.02, -0.75], [0.78, 0.55, 8.3]),                   // tub
    B([0.78, -0.2, 0.65], [0.6, 0.45, 3.3]), B([-0.78, -0.2, 0.65], [0.6, 0.45, 3.3]),
    B([0, 0.36, 1.4], [0.42, 0.42, 3.0]),                     // engine cover
    B([0, 0.55, 3.75], [2.2, 0.1, 0.8]),                      // rear wing
    B([1.09, 0.28, 3.75], [0.04, 0.55, 0.9]), B([-1.09, 0.28, 3.75], [0.04, 0.55, 0.9]),
    B([0, -0.42, -4.45], [3.5, 0.07, 0.9]),                   // front wing
    B([nx, ny, nz], [nr * 2, nr * 2, nl]), B([-nx, ny, nz], [nr * 2, nr * 2, nl]),   // the cans
    ...[[1, -1], [-1, -1], [1, 1], [-1, 1]].map(([sx, sz]) =>
      B([sx * POD.hw, -0.4, sz * POD.hl], [POD.r * 2, POD.r * 2 * POD.squash, POD.len])),
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
  const hullMat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0x554433, shininess: 28 });
  hullMat.name = 'HULL';
  const numMat = new THREE.MeshBasicMaterial({ map: numberTexture(number, accent), transparent: true });
  numMat.name = 'DECAL';
  const mats = [hullMat, numMat];
  let hull = null;
  g.traverse(o => {
    if (!o.isMesh) return;
    const src = o.material, name = src && src.name;
    switch (name) {
      case 'HULL':
        hullMat.map = src.map || panelTexture(accent);
        if (src.normalMap) hullMat.normalMap = src.normalMap;
        o.material = hullMat; hull = hull || o; break;
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
  g.userData = { flares, fans, hull: hull || { material: hullMat }, nozzles, geos, mats, model: m.file, cast };
  return g;
}

export function disposeCraft(g) {
  for (const geometry of g.userData.geos) geometry.dispose();
  for (const m of g.userData.mats) { if (m.map) m.map.dispose(); m.dispose(); }
}
