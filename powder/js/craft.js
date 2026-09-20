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
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, SUN_DIR } from './palette.js?v=9';
import { models, numeralTexture, SHIP } from './models.js?v=9';

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
    gun:    Object.assign(new THREE.MeshStandardMaterial({ color: 0x3a3a44, metalness: 0.9, roughness: 0.42, envMap: env, envMapIntensity: 0.7 }), { name: 'GUNMETAL' }),
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

/**
 * Build one ship. Returns a Group with userData:
 *   flares[]  the two flame groups (scaled by N1 in vehicle.pose)
 *   fans[]    the two turbine faces (spun by N1)
 *   hull      the merged hull mesh (flashed white on a strike)
 *   nozzles[] local positions of the two exhaust exits, for the haze
 *   geos[]    merged geometries this ship owns, for dispose()
 *   mats[]    materials this ship owns, for dispose()
 */
export function buildCraft(env, accent, number, drive = 'front') {
  // a ship from the Blender pipeline, if one is registered for this chassis
  const model = models.ships[drive === 'front' ? 'nose' : 'aft'];
  if (model) return craftFromModel(model, env, accent, number, drive);

  const { M, acc } = materials(env, accent);
  const g = new THREE.Group();
  const hullMat = new THREE.MeshPhongMaterial({ map: panelTexture(accent), color: 0xffffff, specular: 0x554433, shininess: 28 });
  hullMat.name = 'HULL';
  const geos = [], mats = [hullMat];

  const add = (geometry, mat, cast = true) => {
    const m = new THREE.Mesh(geometry, mat);
    m.castShadow = cast; m.receiveShadow = false;
    g.add(m); geos.push(geometry);
    return m;
  };

  // Where the rockets are IS the chassis. Front: cans beside the nose, short,
  // exhaust trailing back along the flanks. Rear: cans slung aft, the plates'
  // silhouette. The physics applies the thrust at the same axle.
  const front = drive === 'front';
  const nz = front ? -3.6 : 2.2;                   // nacelle centre z
  const nx = front ? 1.15 : 1.3, ny = front ? -0.05 : -0.24;
  const nr = front ? 0.36 : 0.42, nl = front ? 2.6 : 3.2;
  const mouthZ = nz - nl / 2 - 0.08, bellZ = nz + nl / 2 + 0.22;

  // ---- hull: body, nose, belly plate, fin ----------------------------------
  const hull = add(merge([
    { g: geo('body', () => zCyl(0.92, 0.72, 6.2, 20)), pos: [0, 0, 0.5], scale: [1.15, 0.8, 1] },
    { g: geo('nose', () => zCone(0.92, 4.2, 20)), pos: [0, 0, -4.6], scale: [1.15, 0.8, 1] },
    { g: geo('plate', () => zCyl(1.7, 0.9, 3.6, 3)), pos: [0, -0.5, -0.9], rot: [0, 0, Math.PI], scale: [1, 0.11, 1.8] },
    { g: geo('fin', () => new THREE.BoxGeometry(0.12, 0.9, 1.2)), pos: [0, 0.76, 3.0], rot: [-0.34, 0, 0] },
  ]), hullMat);

  // ---- accent: the weathered band and the fin cap -------------------------
  add(merge([
    { g: geo('band', () => zCyl(0.9, 0.86, 1.7, 20)), pos: [0, 0, -0.5], scale: [1.15, 0.8, 1] },
    { g: geo('finCap', () => new THREE.BoxGeometry(0.14, 0.24, 1.2)), pos: [0, 1.15, 2.88], rot: [-0.34, 0, 0] },
  ]), acc);

  // ---- chrome: probe, cans, collars, struts, plumbing ---------------------
  const chromeParts = [
    { g: geo('probe', () => zCyl(0.06, 0.03, 2.4, 6)), pos: [0, 0, -7.8] },
  ];
  const gunParts = [];
  const nozzles = [];
  for (const side of [-1, 1]) {
    const sx = side * nx;
    chromeParts.push(
      { g: geo(front ? 'nacF' : 'nac', () => zCyl(nr, nr - 0.03, nl, 18)), pos: [sx, ny, nz] },
      { g: geo('collar', () => zCyl(nr + 0.12, nr + 0.08, 0.34, 18)), pos: [sx, ny, mouthZ + 0.12] },
      { g: geo('strut', () => new THREE.BoxGeometry(1.1, 0.16, 0.7)), pos: [side * (nx - 0.55), ny + 0.04, nz - 0.2] },
      // the manifolds: three runs from the hull flank over the can
      { g: pipe([side * 0.72, 0.32, nz - 0.5], [side * (nx - 0.15), ny + nr + 0.12, nz - 0.2], [sx, ny + nr + 0.02, nz + 0.7], 0.085) },
      { g: pipe([side * 0.80, -0.12, nz + 0.4], [side * (nx - 0.10), ny - nr - 0.06, nz + 0.2], [sx - side * 0.1, ny - nr - 0.02, nz + 1.0], 0.07) },
      { g: pipe([side * 0.60, 0.46, nz + 0.9], [side * (nx - 0.30), ny + nr + 0.16, nz + 1.15], [sx, ny + nr + 0.02, nz + 1.35], 0.06) },
    );
    gunParts.push(
      // the nozzle bell, open, the flame sitting inside it
      { g: geo('bell', () => zCyl(nr - 0.06, nr + 0.06, 0.5, 18, true)), pos: [sx, ny, bellZ] },
      // two dark bands round the can — the plates' black stripes
      { g: geo('ring', () => { const t = new THREE.TorusGeometry(1, 0.045, 8, 20); return t; }), pos: [sx, ny, nz - 0.55], scale: [nr + 0.01, nr + 0.01, 1] },
      { g: geo('ring'), pos: [sx, ny, nz + 0.65], scale: [nr + 0.01, nr + 0.01, 1] },
      // a pump block where the pipes meet the hull
      { g: geo('pump', () => new THREE.BoxGeometry(0.40, 0.32, 0.6)), pos: [side * 0.88, 0.14, nz + 0.15] },
    );
    nozzles.push(new THREE.Vector3(sx, ny, bellZ + 0.2));
    // the empties the pipeline contract names, so an export of the kit IS a
    // reference file (pipeline/README.md)
    const e = new THREE.Object3D(); e.name = side < 0 ? 'nozzle_L' : 'nozzle_R';
    e.position.set(sx, ny, bellZ + 0.2); g.add(e);
  }
  add(merge(chromeParts), M.chrome);
  add(merge(gunParts), M.gun);

  // ---- live parts: fans in the mouths, flames in the bells -----------------
  const fans = [], flares = [];
  for (const side of [-1, 1]) {
    const fan = new THREE.Mesh(geo('fanDisc', () => { const b = new THREE.CircleGeometry(1, 18); b.rotateY(Math.PI); return b; }), M.fan);
    fan.scale.setScalar(nr);
    fan.position.set(side * nx, ny, mouthZ);
    fan.castShadow = false; fan.name = side < 0 ? 'fan_L' : 'fan_R';
    g.add(fan); fans.push(fan);

    const flame = makeFlame(M);
    flame.name = 'flame';
    flame.position.set(side * nx, ny, bellZ - 0.1);
    g.add(flame); flares.push(flame);
    mats.push(flame.userData.core.material, flame.userData.sheath.material, flame.userData.glow.material);
  }

  // ---- canopy, and the roundels ------------------------------------------
  const canopy = add(geo('canopy', () => new THREE.SphereGeometry(0.52, 18, 10)), M.glass, false);
  canopy.name = 'canopy';
  canopy.scale.set(0.95, 0.68, 1.9); canopy.position.set(0, 0.46, -2.5);
  geos.pop();                                        // the canopy is a kit geometry, not this ship's

  const numMat = new THREE.MeshBasicMaterial({ map: numberTexture(number, accent), transparent: true });
  numMat.name = 'DECAL';
  mats.push(numMat);
  add(merge([
    { g: geo('decal', () => new THREE.PlaneGeometry(1.1, 1.1)), pos: [-0.98, 0.06, -0.5], rot: [0, -Math.PI / 2, 0] },
    { g: geo('decal'), pos: [0.98, 0.06, -0.5], rot: [0, Math.PI / 2, 0] },
  ]), numMat, false);

  hull.name = 'hull';
  g.traverse(o => { if (o.isMesh || o.isSprite) o.layers.set(1); });
  g.layers.set(1);           // the HD layer: drawn full-res over the PS2 world
  g.scale.setScalar(0.74);   // ~11 m long overall
  g.userData = { flares, fans, hull, nozzles, geos, mats };
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
  const fans = SHIP.fans.map(n => g.getObjectByName(n)).filter(Boolean);
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
  g.userData = { flares, fans, hull: hull || { material: hullMat }, nozzles, geos: [], mats, model: m.file };
  return g;
}

export function disposeCraft(g) {
  for (const geometry of g.userData.geos) geometry.dispose();
  for (const m of g.userData.mats) { if (m.map) m.map.dispose(); m.dispose(); }
}
