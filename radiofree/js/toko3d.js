// Radio Free Helsinki — Toko in three dimensions.
//
// WHAT HE IS MADE OF, and why nothing else. The only original art of Toko is
// his FACE, and since 2026-09-24 the repository holds the owner's master of it
// (`toko/master/`, "this is the exact original face shape"), traced to exact
// outlines in `toko/js/master.js` — 99.7% pixel overlap with the original.
// Every body he has worn (a magenta bust, a teal gel, a dark hood with
// magenta hands) was drawn by an assistant, and none of it is his. So the 3D
// Toko is the master made physical, the way the brand already uses the face
// on a disc: a BADGE, a lacquered enamel pin — the disc domed like a mask, and
// the four traced shapes EXTRUDED from their own outlines, bevelled, and bent
// onto the dome. Not a re-drawing: the same points.
//
// He acts only the way the mark does — the eyes squash (a blink) about the
// foot of each arch, the smile breathes about the top of the mouth (the
// master has no pupils, so nothing is added for "open") — and the whole badge
// turns, nods, tilts and pops.
//
// three.js (r167, vendored, MIT) is loaded LAZILY, only by the film export,
// exactly like mediabunny: never on the feed, never precached.

import { MASTER, SHAPES, masterBounds, pivots, fillMaster, BADGE_INK } from '../../toko/js/master.js';
import { TOKO, WAYS } from '../../toko/js/palette.js';

const VENDOR = '../vendor/three.module.min.js';
const FOV = 24, CAM_Z = 5.8;
// half the height the camera sees at the badge: a disc of radius 1 fills 1 / HALF of the canvas half
export const HALF = Math.tan((FOV / 2) * Math.PI / 180) * CAM_Z;

// the dome of the mask: thickest at the centre, easing to the rim
// FLAT, like an enamel pin's face: a domed face meant bending the extruded
// shapes onto it, and bending a long sliver triangle creases it — hairlines
// across the smile. The rim still rolls over.
const T0 = 0.05, DOME = 0;
const surfaceZ = (r) => T0 + DOME * (1 - Math.min(1, r * r));

let loading = null;
export function loadThree() {
  if (!loading) loading = import(VENDOR);
  return loading;
}

/** Build the badge. Resolves { canvas, render(pose), dispose() }. */
export async function makeToko3D(size = 640, opts = {}) {
  // The colours are the IDENTITY, not the master file's: the owner's guideline
  // sheet makes Toko black and magenta, and the yellow of the master is one of
  // the nine carriers the mark rides on one at a time (STICKER.YELLOW). The
  // badge wears SIGN — paper on magenta. A caller may hand it one carrier.
  const GROUND = opts.ground || WAYS.SIGN.ground, INK = opts.ink || WAYS.SIGN.ink;
  const THREE = await loadThree();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral, not ACES: ACES rolls a saturated magenta toward maroon, and
  // #F0027F is a brand colour, not a suggestion. The gate-less check is the
  // flat of the enamel measuring back within reach of it in a render.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 30);
  camera.position.set(0, 0, CAM_Z);

  // ── light: a studio. Softboxes in the environment for the lacquer to hold,
  // a key that throws the strokes' shadows onto the enamel, and two rims
  // behind the edge that take the shot's colour ──
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(studio(THREE), 0.02).texture;
  const key = new THREE.DirectionalLight(0xfff4ea, 3.2);
  key.position.set(-2.2, 2.8, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -1.4;
  key.shadow.camera.right = key.shadow.camera.top = 1.4;
  key.shadow.camera.near = 1; key.shadow.camera.far = 12;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; key.shadow.radius = 6;
  key.shadow.intensity = 0.7;
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0x331122, 1.6));
  const rimL = new THREE.PointLight(0x33ffcc, 9, 6, 1.6), rimR = rimL.clone();
  rimL.position.set(-1.9, 1.2, -0.6); rimR.position.set(1.9, -0.4, -0.6);
  scene.add(rimL, rimR);

  // ── the disc ──
  const badge = new THREE.Group();
  scene.add(badge);
  const discGeo = lathe(THREE);
  // a colour may carry a mood, so the enamel can change per frame: one baked
  // texture per colour, made on first use and kept
  const grounds = new Map();
  const groundTex = (c) => { if (!grounds.has(c)) grounds.set(c, bakedGround(THREE, c)); return grounds.get(c); };
  const discMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: groundTex(GROUND), roughness: 0.34, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.1,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.receiveShadow = true; disc.castShadow = true;
  badge.add(disc);

  // ── the face, as tubes ──
  const inkMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(INK), roughness: 0.26, clearcoat: 0.7, clearcoatRoughness: 0.15,
    emissive: new THREE.Color(INK), emissiveIntensity: 0.06,
  });
  const face = new THREE.Group();
  badge.add(face);

  // the four traced shapes, extruded once; posing is a transform on each
  const pv = pivots(), toB = badgeMap();
  const meshes = {};
  for (const k of SHAPES) {
    const pts = [];
    const p = MASTER[k];
    for (let i = 0; i < p.length; i += 2) pts.push(new THREE.Vector2(...toB(p[i], p[i + 1])));
    const shape = new THREE.Shape(pts);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.035, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.016, bevelSegments: 5, curveSegments: 4,
    });
    g.translate(0, 0, T0 - 0.012);           // seated on the enamel
    // the pivot the face acts about, so a blink or a grin is a scale on the mesh
    const [px, py] = toB(...pv[k]);
    g.translate(-px, -py, 0);
    const m = new THREE.Mesh(g, inkMat);
    m.position.set(px, py, 0);
    m.castShadow = true;
    face.add(m);
    meshes[k] = m;
  }
  function pose(squash, grin) {
    meshes.eyeL.scale.set(1, squash, 1); meshes.eyeR.scale.set(1, squash, 1);
    meshes.mouthOuter.scale.set(grin, grin, 1); meshes.mouthInner.scale.set(grin, grin, 1);
  }

  const rim = new THREE.Color();
  const posed = pose;
  function render(pose = {}) {
    const squash = Math.max(0.06, pose.squash ?? 1), grin = pose.grin ?? 1;
    posed(squash, grin);
    badge.rotation.set(pose.pitch || 0, pose.yaw || 0, pose.roll || 0, 'YXZ');
    const s = pose.pop || 1;
    badge.scale.set(s, s, s);
    const tex = groundTex(pose.ground || GROUND);
    if (discMat.map !== tex) { discMat.map = tex; discMat.needsUpdate = true; }
    rim.set(pose.key || '#33ffcc');
    rimL.color.copy(rim); rimR.color.copy(rim);
    rimL.intensity = rimR.intensity = pose.hot ? 12 : 9;
    renderer.render(scene, camera);
    return canvas;
  }

  function dispose() {
    for (const m of face.children) m.geometry.dispose();
    discGeo.dispose(); for (const t of grounds.values()) t.dispose(); discMat.dispose(); inkMat.dispose();
    scene.environment.dispose(); pm.dispose(); renderer.dispose();
  }
  return { canvas, render, dispose, half: HALF, THREE };
}

// master units → the badge's plane: the master's FRAME centred on the disc,
// scaled so the ink spans BADGE_INK radii — the same placement as the 2D badge
function badgeMap() {
  const b = masterBounds(), s = BADGE_INK / b.w, c = MASTER.size / 2;
  return (x, y) => [(x - c) * s, -(y - c) * s];
}

// the disc: a domed face, a rounded rim, a flat back — lathed, turned to face
// the camera, with planar UVs so the baked ground lines up with the face
function lathe(THREE) {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const r = 0.93 * i / 24; pts.push(new THREE.Vector2(r, surfaceZ(r))); }
  const zr = surfaceZ(0.93), back = -0.09;
  for (let i = 1; i <= 12; i++) {                        // the rim rolls over the edge
    const a = (i / 12) * Math.PI;
    pts.push(new THREE.Vector2(0.93 + 0.07 * Math.sin(a), (zr + back) / 2 + ((zr - back) / 2) * Math.cos(a)));
  }
  pts.push(new THREE.Vector2(0.0001, back));
  const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p.x, p.y)), 128);
  g.rotateX(Math.PI / 2);                                // (x, y, z) → (x, −z, y): height → +z, toward the camera
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 2 + 0.5, pos.getY(i) / 2 + 0.5);
  return g;
}

// The enamel's colour, with the occlusion baked in: the ground, a little
// darker in the crease round every shape and toward the rim — drawn with the
// traced master itself, so the shadow is the face's shadow and nothing else's.
function bakedGround(THREE, ground) {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = ground; g.fillRect(0, 0, S, S);
  const rg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5);
  rg.addColorStop(0, 'rgba(50,0,20,0)'); rg.addColorStop(1, 'rgba(50,0,20,0.22)');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  // the disc spans the canvas; the ink sits where badgeMap puts it
  const b = masterBounds(), k = (S / 2) * BADGE_INK / b.w, cc = MASTER.size / 2;
  g.filter = 'blur(9px)';
  fillMaster(g, S / 2 + (b.x - cc) * k, S / 2 + (b.y - cc) * k, b.w * k, { color: 'rgba(50,0,20,0.30)' });
  g.filter = 'none';
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// a small studio for the lacquer to reflect: dark walls, two softboxes, a floor bounce
function studio(THREE) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x0a0a10, side: THREE.BackSide })));
  const box = (w, h, x, y, z, c, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  box(4, 2.5, -4, 4, 5, 0xffffff, 3.2);     // the key softbox
  box(3, 1.2, 4.5, 1, 4, 0xffffff, 1.4);    // a fill strip
  box(8, 1.2, 0, -5, 3, 0x552233, 1.0);     // the desk's bounce
  return s;
}

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
