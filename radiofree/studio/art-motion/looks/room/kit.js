// THE ROOM KIT: RFH 3D, the "room" subject (plan/3D-LOOKS.md, owner 6 Nov: "make other 3d than trucks").
// Cut First's register (a tilt-shift toy world, soft anime grade, low-poly, rounded, matte) moved indoors: a cut-away
// toy building whose open front shows a room with a desk, a live screen you can read, a window onto the world outside,
// papers, a wall board and a hanging lamp. The outside world (sky, clouds, a clearing of stumps, the forest round it) is
// the same toy world as looks/cars, so a room film can step out of the door and rise over the place at the end.
//
//   import { toyWorld, cabin } from '../../looks/room/kit.js';
//   const Wd = toyWorld({ W: 1080, H: 1920 });          // renderer, scene, camera, post, helpers, sky, lights
//   Wd.clearing({ ... }); Wd.forest({ ... });           // the place outside
//   const R = cabin(Wd, { screen: (g, w, h, t) => …, board: (g, w, h) => … });   // the room, at the origin
//
// Everything is drawn in code (no image files). The screen and the board are canvases the film paints.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Post } from '../../clay/welcome/lib/post.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
export const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3) };
export const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
export const C3 = (h) => new THREE.Color(h);
export const V = (a) => new THREE.Vector3(...a), lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

/** the toy world: renderer, scene, camera, post, materials, helpers, sky and clouds, lights (Cut First's grade) */
export function toyWorld({ W = 1080, H = 1920 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const FOG = C3('#aec4e8'); scene.fog = new THREE.Fog(FOG, 130, 420); scene.background = FOG.clone();
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.2, 900);
  const post = new Post(renderer, W, H);

  const paint = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
  const matte = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
  const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent = scene, cast = true, recv = true } = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
  const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (draw) draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { canvas: c, g }; return t; };
  const M = {
    ground: matte('#8bb35c', { roughness: 1 }), mud: matte('#b48b66', { roughness: 1 }), track: matte('#c9a982', { roughness: 1 }), wet: matte('#9c7756', { roughness: 0.8 }),
    bark: matte('#8a5d3c'), stump: matte('#e2c08e'), logEnd: matte('#f0d29c'), spruce: matte('#3f7a55'), spruce2: matte('#4f8c60'),
    birchTrunk: matte('#f4f0e6'), birchLeaf: matte('#f2c44c'), birchLeaf2: matte('#eaa13f'),
  };
  // the sky and the clouds, as looks/cars
  const skyTex = canvasTex(8, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2f64c0'); gr.addColorStop(0.3, '#447fd6'); gr.addColorStop(0.44, '#5e97e2'); gr.addColorStop(0.478, '#8fb8ee'); gr.addColorStop(0.495, '#c4d6f0'); gr.addColorStop(0.5, '#aec4e8'); gr.addColorStop(1, '#aec4e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const SKY = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })); SKY.renderOrder = -1; scene.add(SKY);
  const cloudTex = canvasTex(512, 256, (g, w) => { const r = rng(5);
    const B = []; for (let i = 0; i < 22; i++) { const x = 90 + r() * 330, rad = 22 + r() * 40; B.push([x, 168 - rad * 0.55 - Math.sin((x - 90) / 330 * Math.PI) * 55 - r() * 20, rad]); }
    g.save(); g.beginPath(); g.rect(0, 0, w, 176); g.clip();
    for (const [x, y, rad] of B) { g.fillStyle = 'rgba(178,184,226,0.96)'; g.beginPath(); g.arc(x, y + rad * 0.18, rad, 0, TAU); g.fill(); }
    for (const [x, y, rad] of B) { const gr = g.createRadialGradient(x - rad * 0.2, y - rad * 0.35, rad * 0.1, x, y - rad * 0.1, rad * 0.92);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(250,248,255,0.98)'); gr.addColorStop(1, 'rgba(232,230,250,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y - rad * 0.1, rad * 0.92, 0, TAU); g.fill(); }
    g.restore(); });
  const CLOUDS = [[-70, 50, -262, 120], [40, 66, -280, 150], [125, 46, -252, 100], [-10, 38, -244, 80], [-140, 62, -270, 110], [-200, 56, -150, 120], [200, 60, -160, 120]].map(([x, y, z, w]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false })); m.position.set(x, y, z); m.lookAt(0, y, 40); scene.add(m); return m; });
  // light: a warm key, a lavender sky fill, a cool hemisphere (Cut First's)
  const hemi = new THREE.HemisphereLight('#c3d6f6', '#8270a8', 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffdcae', 2.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#a493e0', 0.4); fill.position.set(30, 20, 40); scene.add(fill);
  /** the shadow frustum: centred on c, half-size e, the sun coming from dir */
  const shadowsAt = (c, e, dir = [-40, 26, -22]) => { const s = sun.shadow.camera; Object.assign(s, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 260 }); s.updateProjectionMatrix();
    sun.target.position.set(...c); sun.position.set(c[0] + dir[0], c[1] + dir[1], c[2] + dir[2]); };
  /** dusk 0 → 1: the sun, the sky, the clouds and the fog all warm and dim together */
  const fogA = C3('#aec4e8'), fogB = C3('#c39cc4');
  const dusk = (d) => { sun.intensity = lerp(2.3, 0.75, d); sun.color.copy(C3('#ffdcae')).lerp(C3('#ff8a6a'), d);
    hemi.intensity = lerp(1.05, 0.6, d); hemi.color.copy(C3('#c3d6f6')).lerp(C3('#9a8ccc'), d);
    SKY.material.color.copy(C3('#ffffff')).lerp(C3('#f0a8c0'), d * 0.8); CLOUDS.forEach((c) => c.material.color.copy(C3('#ffffff')).lerp(C3('#f4b0b8'), d));
    scene.environmentIntensity = lerp(0.55, 0.3, d); scene.fog.color.copy(fogA).lerp(fogB, d); };

  // the forest's two trees, shared with looks/cars
  const spruceGeo = mergeGeometries([0, 1, 2].map((i) => new THREE.ConeGeometry(2.1 - i * 0.55, 3.0, 7).translate(0, 1.8 + i * 1.7, 0)).concat([new THREE.CylinderGeometry(0.22, 0.28, 1.4, 6).translate(0, 0.7, 0)]).map((g) => g.toNonIndexed()));
  const birchTrunk = new THREE.CylinderGeometry(0.14, 0.2, 4.2, 6).translate(0, 2.1, 0), birchCrown = new THREE.IcosahedronGeometry(1.5, 0).translate(0, 4.6, 0);
  const inst = (geo, mat, list, k = 1) => { const m = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D();
    list.forEach(([x, z, s, r], i) => { o.position.set(x, 0, z); o.rotation.set(0, r, 0); o.scale.set(s, s * k, s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };

  /** the ground, and a cleared rectangle of mud with ruts, wet patches and hundreds of stumps; keep(x, z) → false skips a spot */
  function clearing({ x0, x1, z0, z1, n = 600, keep = () => true, seed = 7 }) {
    mesh(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2), M.ground, { cast: false });
    mesh(new THREE.PlaneGeometry(x1 - x0, z0 - z1).rotateX(-Math.PI / 2), M.mud, { pos: [(x0 + x1) / 2, 0.015, (z0 + z1) / 2], cast: false });
    const R = rng(seed + 12);
    for (let i = 0; i < 26; i++) { const x = lerp(x0, x1, R()), z = lerp(z1, z0, R()), a = R() * TAU, l = 10 + R() * 22; if (!keep(x, z)) continue;
      for (const o of [-0.9, 0.9]) mesh(new THREE.PlaneGeometry(0.5, l).rotateX(-Math.PI / 2).rotateY(a), M.track, { pos: [x + Math.cos(a) * o, 0.02, z - Math.sin(a) * o], cast: false }); }
    for (let i = 0; i < 18; i++) { const x = lerp(x0, x1, R()), z = lerp(z1, z0, R()); if (!keep(x, z)) continue;
      const p = mesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), M.wet, { pos: [x, 0.018, z], cast: false }); p.scale.set(2 + R() * 4, 1, 1 + R() * 2.5); }
    const S = [], Rs = rng(seed);
    for (let i = 0; i < n * 5 && S.length < n; i++) { const x = lerp(x0 + 2, x1 - 2, Rs()), z = lerp(z1 + 2, z0 - 2, Rs()); if (keep(x, z)) S.push([x, z, 0.65 + Rs() * 0.75, Rs() * TAU]); }
    const stumpGeo = new THREE.CylinderGeometry(0.42, 0.55, 0.55, 9).translate(0, 0.27, 0), capGeo = new THREE.CircleGeometry(0.4, 9).rotateX(-Math.PI / 2).translate(0, 0.552, 0);
    const o = new THREE.Object3D(), a = new THREE.InstancedMesh(stumpGeo, M.bark, S.length), b = new THREE.InstancedMesh(capGeo, M.stump, S.length);
    S.forEach(([x, z, s, r], i) => { o.position.set(x, 0, z); o.rotation.set(0, r, 0); o.scale.setScalar(s); o.updateMatrix(); a.setMatrixAt(i, o.matrix); b.setMatrixAt(i, o.matrix); });
    a.castShadow = true; a.receiveShadow = true; b.receiveShadow = true; scene.add(a, b);
    return S;
  }
  /** the forest round a cleared rectangle, with a ragged felling line */
  function forest({ x0, x1, z0, z1, keep = () => true, seed = 31, n = 2600, span = 420 }) {
    const R = rng(seed), spr = [], bir = [];
    for (let i = 0; i < n; i++) { const x = (R() - 0.5) * span, z = -230 + R() * 360, edge = 2 + R() * 3;
      if (z < z0 + edge && z > z1 - edge && x > x0 - edge && x < x1 + edge) continue; if (!keep(x, z)) continue;
      (R() < 0.72 ? spr : bir).push([x, z, 0.7 + R() * 0.75, R() * TAU]); }
    inst(spruceGeo, M.spruce, spr.filter((_, i) => i % 2)); inst(spruceGeo, M.spruce2, spr.filter((_, i) => !(i % 2)), 1.1);
    inst(birchTrunk, M.birchTrunk, bir); inst(birchCrown, M.birchLeaf, bir.filter((_, i) => i % 2)); inst(birchCrown, M.birchLeaf2, bir.filter((_, i) => !(i % 2)));
  }
  /** one tree that can fall: hinged at its stump, rotation about z (or any axis the film turns) */
  function fallingSpruce(x, z, s = 1.35) {
    const g = new THREE.Group(); scene.add(g); g.position.set(x, 0.5, z);
    mesh(spruceGeo, M.spruce2, { pos: [0, -0.5, 0], parent: g }).scale.setScalar(s);
    mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.55, 9), M.bark, { pos: [x, 0.27, z] });
    return g;
  }
  const puffTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(236,222,196,0.9)'); gr.addColorStop(1, 'rgba(236,222,196,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  /** a dust puff where something lands: n sprites, posed by puffs.at(t) */
  function puffs(x, z, n = 8, seed = 100, along = [-1, 0]) {
    const P = Array.from({ length: n }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); scene.add(s);
      const R = rng(seed + i); s.userData = { x: x + along[0] * (2 + i * 0.95), z: z + along[1] * (2 + i * 0.95) + (R() - 0.5) * 2.5, dx: (R() - 0.5) * 1.5, dz: (R() - 0.5) * 2 }; return s; });
    return { at(t, t0) { P.forEach((s, i) => { const k = (t - t0 - i * 0.03) / 1.6, u = s.userData;
      s.material.opacity = k > 0 && k < 1 ? 0.75 * Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k) : 0;
      s.position.set(u.x + u.dx * k * 3, 0.6 + k * 1.8, u.z + u.dz * k * 3); s.scale.setScalar(1.6 + k * 3.5); }); } };
  }

  return { renderer, scene, camera, post, W, H, paint, matte, mesh, rbox, canvasTex, M, SKY, CLOUDS, hemi, sun, fill, shadowsAt, dusk,
    spruceGeo, inst, clearing, forest, fallingSpruce, puffs };
}

/**
 * The cut-away cabin: a toy site office standing on skids, its front wall and roof taken off so the camera looks in.
 * Origin at the middle of the floor's front edge line; the back wall (with the window) faces −z, the open side +z.
 * opts.screen(g, w, h) and opts.board(g, w, h) paint the laptop screen and the wall board; R.screenTex.needsUpdate after.
 * Returns the anchors a film needs: where the screen is, the window, the lamp, and the groups to move.
 */
export function cabin(Wd, { w = 14, d = 7, h = 5.2, lift = 0.6, wall = '#e9ecef', trim = '#2f5d8c', floorC = '#c9a27a', screenW = 1024, screenH = 640 } = {}) {
  const { mesh, rbox, matte, paint, canvasTex, scene } = Wd;
  const G = new THREE.Group(); scene.add(G);
  const T = 0.32, x0 = -w / 2, x1 = w / 2, zb = -d, y0 = lift;          // the room is x0..x1, z from zb (back) to 0 (the open front)
  const Mw = matte(wall, { roughness: 0.75 }), Mt = paint(trim), Mf = matte(floorC, { roughness: 0.8 }), Mout = matte('#dfe4e8', { roughness: 0.7 });
  // the skids and the floor
  for (const x of [x0 + 1, x1 - 1]) mesh(rbox(0.6, lift, d + 0.4, 0.1), matte('#4a4b50'), { pos: [x, lift / 2, zb / 2], parent: G });
  mesh(rbox(w + 0.2, 0.3, d + 0.2, 0.08), Mt, { pos: [0, y0 - 0.15, zb / 2], parent: G });
  const planks = canvasTex(512, 256, (g, cw, ch) => { g.fillStyle = '#c9a27a'; g.fillRect(0, 0, cw, ch); const R = rng(3);
    for (let y = 0; y < ch; y += 32) { g.fillStyle = `rgba(120,80,40,${0.08 + R() * 0.1})`; g.fillRect(0, y, cw, 32); g.fillStyle = 'rgba(90,60,30,.35)'; g.fillRect(0, y, cw, 2); } });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(2, 2);
  mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), matte('#ffffff', { map: planks, roughness: 0.8 }), { pos: [0, y0 + 0.005, zb / 2], parent: G, cast: false });
  // the back wall, with the window: four pieces round the opening
  const win = { x0: -4.6, x1: 2.6, y0: y0 + 1.9, y1: y0 + 4.4 };
  const wallPiece = (ax0, ax1, ay0, ay1) => mesh(rbox(ax1 - ax0, ay1 - ay0, T, 0.05), Mw, { pos: [(ax0 + ax1) / 2, (ay0 + ay1) / 2, zb - T / 2], parent: G });
  wallPiece(x0, win.x0, y0, y0 + h); wallPiece(win.x1, x1, y0, y0 + h); wallPiece(win.x0, win.x1, y0, win.y0); wallPiece(win.x0, win.x1, win.y1, y0 + h);
  // the window frame and its cross bar
  const fr = 0.16, Mfr = paint('#f7f5ef');
  for (const [px, py, sw, sh] of [[win.x0, (win.y0 + win.y1) / 2, fr, win.y1 - win.y0], [win.x1, (win.y0 + win.y1) / 2, fr, win.y1 - win.y0], [(win.x0 + win.x1) / 2, win.y0, win.x1 - win.x0, fr], [(win.x0 + win.x1) / 2, win.y1, win.x1 - win.x0, fr], [(win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, fr * 0.6, win.y1 - win.y0]])
    mesh(rbox(sw, sh, T + 0.08, 0.04), Mfr, { pos: [px, py, zb - T / 2], parent: G });
  mesh(rbox(win.x1 - win.x0 + 0.6, 0.14, 0.6, 0.05), Mfr, { pos: [(win.x0 + win.x1) / 2, win.y0 - 0.05, zb + 0.18], parent: G });   // the sill
  // the side walls (full height at the back, cut away at the front edge so the room reads as a dollhouse)
  for (const [sx, s] of [[x0, -1], [x1, 1]]) {
    const sh = new THREE.Shape(); sh.moveTo(zb, 0); sh.lineTo(0, 0); sh.lineTo(0, h * 0.42); sh.lineTo(zb * 0.35, h); sh.lineTo(zb, h); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }).rotateY(-Math.PI / 2).translate(s < 0 ? T : 0, 0, 0);
    mesh(geo, Mw, { pos: [sx - (s < 0 ? T : 0), y0, 0], parent: G });
  }
  // the outside skin: a trim stripe along the back and a corrugated look on the outer face
  mesh(rbox(w + 0.1, 0.35, 0.06, 0.03), Mt, { pos: [0, y0 + 0.9, zb - T - 0.02], parent: G, cast: false });
  mesh(rbox(w + 0.5, 0.3, d + 0.5, 0.08), Mt, { pos: [0, y0 + h + 0.15, zb / 2 - 0.6], parent: G }).scale.set(1, 1, 0.22);   // a roof edge at the back only
  // the desk under the window, a chair pushed aside, the laptop, a mug, papers, a folder, a lamp
  const deskH = 1.55, deskZ = zb + 1.25, Mdesk = paint('#f1e6cf', { roughness: 0.4, clearcoat: 0.4 }), Mleg = matte('#3b3c41');
  mesh(rbox(7.4, 0.22, 2.2, 0.08), Mdesk, { pos: [-1.0, y0 + deskH, deskZ], parent: G });
  for (const [lx, lz] of [[-4.5, deskZ - 0.9], [2.5, deskZ - 0.9], [-4.5, deskZ + 0.9], [2.5, deskZ + 0.9]]) mesh(rbox(0.18, deskH, 0.18, 0.06), Mleg, { pos: [lx, y0 + deskH / 2, lz], parent: G });
  const chair = new THREE.Group(); G.add(chair); chair.position.set(3.6, y0, zb + 3.4); chair.rotation.y = -0.9;
  const Mch = paint('#d0453a'); mesh(rbox(1.3, 0.22, 1.3, 0.1), Mch, { pos: [0, 1.05, 0], parent: chair }); mesh(rbox(1.3, 1.4, 0.2, 0.1), Mch, { pos: [0, 1.85, -0.6], parent: chair });
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), Mleg, { pos: [0, 0.5, 0], parent: chair });
  for (let k = 0; k < 5; k++) mesh(rbox(0.7, 0.08, 0.12, 0.03), Mleg, { pos: [Math.cos(k * TAU / 5) * 0.32, 0.08, Math.sin(k * TAU / 5) * 0.32], rot: [0, -k * TAU / 5, 0], parent: chair });
  // the laptop: a base and a lid tilted back; the lid's face is the live screen
  const sW = 2.9, sH = sW * screenH / screenW, LAP = new THREE.Group(); G.add(LAP); LAP.position.set(-1.0, y0 + deskH + 0.11, deskZ + 0.15);
  const Mlap = paint('#3a3d45', { roughness: 0.35 });
  mesh(rbox(sW + 0.2, 0.12, 2.0, 0.05), Mlap, { pos: [0, 0.06, 0.25], parent: LAP });
  mesh(new THREE.PlaneGeometry(sW - 0.3, 1.2).rotateX(-Math.PI / 2), matte('#24262c'), { pos: [0, 0.125, 0.15], parent: LAP, cast: false });
  const LID = new THREE.Group(); LAP.add(LID); LID.position.set(0, 0.12, -0.72); LID.rotation.x = -0.16;
  mesh(rbox(sW + 0.2, sH + 0.2, 0.1, 0.05), Mlap, { pos: [0, sH / 2 + 0.1, -0.05], parent: LID });
  const screenTex = canvasTex(screenW, screenH); screenTex.anisotropy = 16;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const SCREEN = mesh(new THREE.PlaneGeometry(sW, sH), screenMat, { pos: [0, sH / 2 + 0.1, 0.006], parent: LID, cast: false, recv: false });
  const glow = new THREE.PointLight('#cfe0ff', 3, 6, 2); glow.position.set(0, sH / 2, 0.8); LID.add(glow);
  // the mug, a stack of papers, a folder, a pen pot
  const mug = new THREE.Group(); G.add(mug); mug.position.set(1.4, y0 + deskH + 0.11, deskZ + 0.3);
  mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.6, 16), paint('#f6f3ea'), { pos: [0, 0.3, 0], parent: mug });
  mesh(new THREE.TorusGeometry(0.17, 0.05, 8, 16), paint('#f6f3ea'), { pos: [0.3, 0.32, 0], rot: [0, 0, 0], parent: mug });
  mesh(new THREE.CircleGeometry(0.24, 16).rotateX(-Math.PI / 2), matte('#5a3b26'), { pos: [0, 0.55, 0], parent: mug, cast: false });
  const papers = canvasTex(256, 330, (g, cw, ch) => { g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#b8b2a6'; for (let y = 40; y < ch - 20; y += 24) g.fillRect(24, y, cw - 48 - (y % 72 === 40 ? 60 : 0), 6); });
  for (let k = 0; k < 4; k++) mesh(new THREE.PlaneGeometry(1.1, 1.42).rotateX(-Math.PI / 2), matte('#ffffff', { map: papers }), { pos: [-3.7 + k * 0.03, y0 + deskH + 0.12 + k * 0.012, deskZ + 0.2 - k * 0.02], rot: [0, 0.12 * (k - 1.5), 0], parent: G, cast: false });
  const FOLDER = mesh(rbox(1.3, 0.1, 1.7, 0.03), paint('#e7b736', { roughness: 0.5 }), { pos: [-3.5, y0 + deskH + 0.17, deskZ - 0.6], rot: [0, -0.25, 0], parent: G });
  // the wall board on the left wall: a site plan the film paints
  const boardTex = canvasTex(1024, 720); const BOARD = new THREE.Group(); G.add(BOARD); BOARD.position.set(x0 + 0.02, y0 + 2.9, zb + 2.6); BOARD.rotation.y = Math.PI / 2;
  mesh(rbox(3.6, 2.6, 0.12, 0.05), matte('#b98d5c'), { pos: [0, 0, 0], parent: BOARD });
  mesh(new THREE.PlaneGeometry(3.3, 2.3), matte('#ffffff', { map: boardTex, roughness: 0.9 }), { pos: [0, 0, 0.07], parent: BOARD, cast: false });
  // the hanging lamp over the desk: a warm cone and a bulb
  const LAMP = new THREE.Group(); G.add(LAMP); LAMP.position.set(-1.0, y0 + h - 0.1, deskZ + 0.4);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), Mleg, { pos: [0, -0.6, 0], parent: LAMP });
  mesh(new THREE.ConeGeometry(0.75, 0.6, 20, 1, true), paint('#2f5d8c', { side: THREE.DoubleSide }), { pos: [0, -1.4, 0], parent: LAMP });
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff2cf', emissive: '#ffd890', emissiveIntensity: 2.2 });
  mesh(new THREE.SphereGeometry(0.18, 12, 8), bulbMat, { pos: [0, -1.62, 0], parent: LAMP, cast: false });
  const lampL = new THREE.PointLight('#ffd3a0', 14, 12, 1.6); lampL.position.set(0, -1.9, 0); LAMP.add(lampL);
  // a sign on the outside of the side wall, readable from the clearing: the film paints it
  const signTex = canvasTex(900, 200);
  mesh(new THREE.PlaneGeometry(4.6, 1.02), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }), { pos: [x1 + 0.03, y0 + 3.4, zb + 1.5], rot: [0, Math.PI / 2, 0], parent: G, cast: false });

  const screenWorld = () => { const p = new THREE.Vector3(); SCREEN.getWorldPosition(p); return p; };
  return { G, x0, x1, zb, y0, h, win, deskZ, deskH, LAP, LID, SCREEN, screenTex, screenW, screenH, screenWorld, glow, boardTex, signTex, lampL, bulbMat, chair, mug, FOLDER };
}
