// THE STUDIO — the shared room for the Toko set, films 2–4 (plan/films/27-toko-ai-dev-set.md). Toko Midori Games:
// a small room, a plank floor, a desk with his laptop (the badge sticker on its lid), his thermos and his phone from
// One More Loop, a desk lamp, and a window onto the same park at dusk, where the same drones pass. Built once here so
// the three films read as one set. Puppet scale, cm: Toko stands 46; floor y = 0; he sits facing +z at the desk.
//   buildStudio(scene, C, { hour }) → { DESK, SEAT, LAPTOP, THERMOS, PHONE, lights, setHour(name, k), drones(t, paths), parkCan }

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lumpy, sausage, ball, lathe, mesh as mesh0, rng } from '../welcome/lib/sculpt.js';
import { canvas, tex } from '../welcome/lib/city.js';
import { drawMasterBadge } from '../welcome/lib/master.js';

const TAU = Math.PI * 2, MAG = '#f0027f';
const V = (a) => new THREE.Vector3(...a);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;

export const SEAT = 13;                       // the chair's seat
export const DESK = { y: 21.6, z0: 6.5, z1: 34, x0: -34, x1: 34 };   // the desk top, in front of him

/** the park through the window: dusk sky, the far treeline, the lamp post and the bench he sat on in film 1 */
function paintPark(hour) {
  const c = canvas(1024, 768), g = c.getContext('2d'), r = rng(77);
  const SK = {
    dusk: [[0, '#1a2050'], [0.45, '#3b3f7a'], [0.62, '#8a6a92'], [0.74, '#e08a5e'], [0.84, '#f6b86e']],
    night: [[0, '#04060f'], [0.6, '#0b1228'], [0.84, '#1a2448']],
    day: [[0, '#7fa3d8'], [0.6, '#b9cbe6'], [0.84, '#e8e2d2']],
  }[hour] || [];
  const gr = g.createLinearGradient(0, 0, 0, 640); for (const [k, col] of SK) gr.addColorStop(k, col);
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 768);
  // far treeline: a cut-card silhouette, spruces and birches
  const far = hour === 'day' ? '#4a5a52' : hour === 'night' ? '#070a14' : '#2a2840';
  g.fillStyle = far; g.beginPath(); g.moveTo(0, 768);
  for (let x = 0; x <= 1024; x += 8) { const sp = r() < 0.4, h = sp ? 150 + r() * 120 : 90 + r() * 50; g.lineTo(x, 560 - h * 0.6); if (sp) g.lineTo(x + 4, 560 - h * 0.6 - 50 - r() * 30); }
  g.lineTo(1024, 768); g.fill();
  // nearer birches, yellow crowns caught by the low sun
  for (let i = 0; i < 5; i++) { const x = 90 + i * 200 + r() * 40, top = 420 + r() * 60;   // birches: crowns kept low, so the window frame does not cut them into drips
    g.fillStyle = hour === 'night' ? '#2a2a30' : '#e9e4d8'; g.fillRect(x, top, 9, 768 - top);
    for (let j = 0; j < 6; j++) { g.fillStyle = hour === 'night' ? '#14161c' : (r() < 0.25 ? '#c9772e' : '#d9a93a'); g.beginPath(); g.arc(x + (r() - 0.5) * 90, top + (r() - 0.5) * 70, 26 + r() * 22, 0, TAU); g.fill(); } }
  // the grass and the gravel path
  g.fillStyle = hour === 'night' ? '#0d120c' : '#3e4a2c'; g.fillRect(0, 610, 1024, 160);
  g.fillStyle = hour === 'night' ? '#26242a' : '#a89c88'; g.fillRect(0, 668, 1024, 34);
  // the lamp post and the bench from film 1
  g.fillStyle = '#1e2a26'; g.fillRect(612, 380, 8, 290); g.beginPath(); g.arc(616, 380, 16, Math.PI, 0); g.fill();
  if (hour !== 'day') { const lg = g.createRadialGradient(616, 392, 2, 616, 392, 60); lg.addColorStop(0, 'rgba(255,214,150,1)'); lg.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = lg; g.fillRect(540, 330, 160, 140); }
  g.fillStyle = '#5a3e26'; g.fillRect(660, 628, 150, 9); g.fillRect(660, 606, 150, 7); g.fillStyle = '#23262a'; g.fillRect(668, 630, 6, 34); g.fillRect(796, 630, 6, 34);
  return c;
}

/** a drone, the same build as film 1's: dark, four arms, a red blink. Ambient; nobody's */
export function drone(scene, C, seed) {
  const g = new THREE.Group(), r = rng(seed); scene.add(g);
  const body = C('#2c2f34', { rough: 0.55, thumb: 0.02, thumbCell: 1.2, specks: 0.15 }), arm = C('#1f2125', { rough: 0.5, thumb: 0.015 });
  const rotorM = new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.6, transparent: true, opacity: 0.35, depthWrite: false });
  mesh0(lumpy(new RoundedBoxGeometry(5.6, 1.6, 7.2, 3, 0.7), 0.08, 0.6, seed), body, { parent: g });
  const rotors = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const tip = [sx * 6.4, 0.6, sz * 6.4];
    mesh0(lumpy(sausage([[sx * 1.6, 0, sz * 2], tip], [0.55, 0.4], { steps: 10 }), 0.02, 1, seed + 2 + sx + sz * 3), arm, { parent: g });
    rotors.push(mesh0(new THREE.CylinderGeometry(3.6, 3.6, 0.12, 24), rotorM, { pos: [tip[0], 1.9, tip[2]], parent: g, cast: false })); }
  const led = mesh0(ball(0.55, 1, 1, 1, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.25, 0.2) }), { pos: [0, -0.8, -3.4], parent: g, cast: false });
  g.userData = { rotors, led, ph: r() * 3 }; g.scale.setScalar(0.9);
  return g;
}

export function buildStudio(scene, C) {
  const mesh = (gm, m, o = {}) => mesh0(gm, m, { parent: scene, ...o });
  const M = {
    floor: C('#8a6644', { tool: 1.2, thumbCell: 2.4, mottle: 0.14, noBoil: true }), floorB: C('#7a583a', { tool: 1.2, thumbCell: 2.4, mottle: 0.14, noBoil: true }),
    wall: C('#d9cdb8', { thumbCell: 3.0, thumb: 0.03, mottle: 0.1, specks: 0.25, noBoil: true }), skirting: C('#b8a990', { tool: 0.8 }),
    frame: C('#e8e0d0', { tool: 0.9, thumbCell: 1.6 }), sill: C('#c9bea8', { tool: 0.9 }),
    desk: C('#a5774a', { tool: 1.3, thumbCell: 2.0, mottle: 0.16 }), deskLeg: C('#5a4030', { tool: 1.0 }),
    chair: C('#2f3a44', { rough: 0.6, tool: 0.8 }),
    laptop: C('#b9bcc2', { rough: 0.38, thumb: 0.014, thumbCell: 1.4, specks: 0.1, clearcoat: 0.4, clearcoatRough: 0.3 }), keys: C('#2a2c30', { rough: 0.5, thumb: 0.01 }),
    thermos: C('#c94a2a', { rough: 0.22, thumb: 0.012, thumbCell: 1.4, specks: 0.08, clearcoat: 1, clearcoatRough: 0.12 }), cap: C('#2a2a2c', { rough: 0.4 }),
    phone: C(MAG, { rough: 0.42, thumb: 0.014, thumbCell: 1.2, clearcoat: 0.5, clearcoatRough: 0.25 }),
    lampArm: C('#23262a', { rough: 0.45, thumb: 0.015 }), lampHead: C('#e8b23a', { rough: 0.35, clearcoat: 0.6 }),
    plant: C('#4f6a3a', { thumbCell: 1.1, thumb: 0.05, mottle: 0.2 }), pot: C('#b5653a', { tool: 0.8 }),
    paper: C('#f2ece0', { thumb: 0.01, rough: 0.8 }),
  };
  // the floor: planks
  for (let i = 0; i < 14; i++) mesh(lumpy(new RoundedBoxGeometry(14, 1, 220, 2, 0.4), 0.05, 0.4, 900 + i), i % 2 ? M.floor : M.floorB, { pos: [-98 + i * 14.1, -0.5, 40], cast: false });
  // the back wall behind him, with the window
  const WZ = -26, WIN = { x0: -38, x1: 14, y0: 30, y1: 86 };
  const wallPart = (x0, x1, y0, y1) => mesh(lumpy(new RoundedBoxGeometry(x1 - x0, y1 - y0, 3, 2, 0.6), 0.1, 0.3, 910 + x0 + y0), M.wall, { pos: [(x0 + x1) / 2, (y0 + y1) / 2, WZ], cast: false });
  wallPart(-160, WIN.x0, 0, 160); wallPart(WIN.x1, 160, 0, 160); wallPart(WIN.x0, WIN.x1, 0, WIN.y0); wallPart(WIN.x0, WIN.x1, WIN.y1, 160);
  mesh(lumpy(new RoundedBoxGeometry(320, 5, 1.6, 2, 0.5), 0.04, 0.5, 915), M.skirting, { pos: [0, 2.5, WZ + 2.2], cast: false });
  // the window frame: a cross of mullions, a sill
  const fr = (w, h, x, y) => mesh(lumpy(new RoundedBoxGeometry(w, h, 2.4, 2, 0.5), 0.04, 0.6, 920 + x + y), M.frame, { pos: [x, y, WZ + 0.6] });
  fr(WIN.x1 - WIN.x0 + 4, 2.4, (WIN.x0 + WIN.x1) / 2, WIN.y1); fr(WIN.x1 - WIN.x0 + 4, 2.4, (WIN.x0 + WIN.x1) / 2, WIN.y0);
  fr(2.4, WIN.y1 - WIN.y0, WIN.x0, (WIN.y0 + WIN.y1) / 2); fr(2.4, WIN.y1 - WIN.y0, WIN.x1, (WIN.y0 + WIN.y1) / 2);
  fr(1.6, WIN.y1 - WIN.y0, (WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2); fr(WIN.x1 - WIN.x0, 1.6, (WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2 + 6);
  mesh(lumpy(new RoundedBoxGeometry(WIN.x1 - WIN.x0 + 10, 1.6, 7, 2, 0.5), 0.04, 0.5, 930), M.sill, { pos: [(WIN.x0 + WIN.x1) / 2, WIN.y0 - 1.2, WZ + 3] });
  // a little plant on the sill
  mesh(lumpy(lathe([[0, 0], [2.4, 0], [3.0, 4.2], [0, 4.4]], 20), 0.04, 0.6, 931), M.pot, { pos: [WIN.x1 - 8, WIN.y0, WZ + 3] });
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mesh(lumpy(ball(1.6, 0.6, 1.6, 0.4, 12), 0.08, 0.6, 932 + i), M.plant, { pos: [WIN.x1 - 8 + Math.cos(a) * 1.2, WIN.y0 + 6 + (i % 2) * 1.5, WZ + 3 + Math.sin(a) * 1.2], rot: [Math.sin(a) * 0.5, a, Math.cos(a) * 0.5] }); }
  // the park beyond the glass: a painted card, lit by itself (the hour sets its paint)
  const parkCan = canvas(1024, 768), parkTex = tex(parkCan), park = mesh(new THREE.PlaneGeometry(150, 112), new THREE.MeshBasicMaterial({ map: parkTex, fog: false }), { pos: [(WIN.x0 + WIN.x1) / 2, 62, -88], cast: false, recv: false });
  const paint = (hour) => { const p = paintPark(hour); parkCan.getContext('2d').drawImage(p, 0, 0); parkTex.needsUpdate = true; };
  paint('dusk');

  // the desk: a thick top on four legs
  const DW = DESK.x1 - DESK.x0, DD = DESK.z1 - DESK.z0;
  mesh(lumpy(new RoundedBoxGeometry(DW, 2.2, DD, 3, 0.8), 0.05, 0.4, 940), M.desk, { pos: [0, DESK.y - 1.1, (DESK.z0 + DESK.z1) / 2] });
  for (const [x, z] of [[DESK.x0 + 2, DESK.z0 + 2], [DESK.x1 - 2, DESK.z0 + 2], [DESK.x0 + 2, DESK.z1 - 2], [DESK.x1 - 2, DESK.z1 - 2]])
    mesh(lumpy(new RoundedBoxGeometry(2.2, DESK.y - 2.2, 2.2, 2, 0.6), 0.03, 0.6, 941 + x + z), M.deskLeg, { pos: [x, (DESK.y - 2.2) / 2, z] });
  // his chair: a seat and a low back behind him
  mesh(lumpy(new RoundedBoxGeometry(14, 1.6, 12, 3, 0.7), 0.05, 0.5, 950), M.chair, { pos: [0, SEAT - 1, -1] });
  mesh(lumpy(new RoundedBoxGeometry(13, 10, 1.6, 3, 0.7), 0.05, 0.5, 951), M.chair, { pos: [0, SEAT + 7, -8.5], rot: [-0.12, 0, 0] });
  mesh(lumpy(lathe([[0, 0], [1.0, 0], [1.0, SEAT - 2], [0, SEAT - 2]], 14), 0.02, 1, 952), M.lampArm, { pos: [0, 0, -1] });
  mesh(lumpy(lathe([[0, 0], [7, 0], [6.4, 0.9], [0, 1.2]], 24), 0.03, 1, 953), M.lampArm, { pos: [0, 0, -1] });

  // the laptop: base on the desk in front of him, the lid up and facing him (its back, with the badge sticker, to camera)
  const LAPTOP = new THREE.Group(); scene.add(LAPTOP); LAPTOP.position.set(0, DESK.y, 15);
  mesh0(lumpy(new RoundedBoxGeometry(15, 0.9, 10, 3, 0.4), 0.02, 1, 960), M.laptop, { pos: [0, 0.45, 0], parent: LAPTOP });
  mesh0(new RoundedBoxGeometry(13, 0.2, 5.2, 2, 0.1), M.keys, { pos: [0, 0.95, -1.4], parent: LAPTOP, cast: false });
  const LID = new THREE.Group(); LID.position.set(0, 0.9, 4.8); LID.rotation.x = 0.18; LAPTOP.add(LID);   // hinge at the far edge, leaning back
  mesh0(lumpy(new RoundedBoxGeometry(15, 9.6, 0.6, 3, 0.35), 0.02, 1, 961), M.laptop, { pos: [0, 4.8, 0], parent: LID });
  // the screen (faces him, −z) and the sticker on the back (faces camera, +z)
  const SW = 512, SH = 320, scrCan = canvas(SW, SH), scrTex = tex(scrCan);
  const SCREEN = mesh0(new THREE.PlaneGeometry(13.4, 8.4), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }), { pos: [0, 4.8, -0.32], rot: [0, Math.PI, 0], parent: LID, cast: false });
  const stCan = canvas(256, 256), sg = stCan.getContext('2d'); drawMasterBadge(sg, 128, 128, 110, { ground: MAG, ink: '#fff8f0' });
  mesh0(new THREE.CircleGeometry(2.2, 40), new THREE.MeshStandardMaterial({ map: tex(stCan), roughness: 0.4, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }), { pos: [0, 5.2, 0.32], parent: LID, cast: false });
  // the thermos (film 1's) and the phone face down, the desk lamp, a sheet of paper
  const THERMOS = new THREE.Group(); scene.add(THERMOS); THERMOS.position.set(-22, DESK.y, 24);
  mesh0(lumpy(lathe([[0, 0], [2.1, 0], [2.3, 0.6], [2.3, 10.6], [1.9, 11.4], [0, 11.4]], 28), 0.02, 1, 962), M.thermos, { parent: THERMOS });
  mesh0(lumpy(lathe([[0, 0], [2.2, 0], [2.3, 2.6], [0, 2.8]], 28), 0.02, 1, 963), M.cap, { pos: [0, 11.3, 0], parent: THERMOS });
  const PHONE = mesh(lumpy(new RoundedBoxGeometry(4.8, 0.7, 9.2, 3, 0.35), 0.02, 1, 964), M.phone, { pos: [-14, DESK.y + 0.35, 26], rot: [0, 0.4, 0] });
  mesh(lumpy(new RoundedBoxGeometry(9, 0.15, 12, 2, 0.05), 0.01, 1, 965), M.paper, { pos: [-24, DESK.y + 0.1, 12], rot: [0, -0.2, 0], cast: false });
  const LAMP = new THREE.Group(); scene.add(LAMP); LAMP.position.set(-28, DESK.y, 30);
  mesh0(lumpy(lathe([[0, 0], [4, 0], [3.6, 1], [0, 1.2]], 24), 0.02, 1, 966), M.lampArm, { parent: LAMP });
  mesh0(lumpy(sausage([[0, 1, 0], [1, 14, -2], [6, 20, -4]], [0.6, 0.55, 0.5], { steps: 20 }), 0.02, 1, 967), M.lampArm, { parent: LAMP });
  mesh0(lumpy(lathe([[0, 0], [1.4, 0.2], [3.6, 4.4], [0, 4.8]], 24).rotateX(Math.PI * 0.62), 0.02, 1, 968), M.lampHead, { pos: [7, 19.5, -4.6], parent: LAMP });
  const bulb = mesh0(ball(1.1, 1, 1, 1, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 1.8) }), { pos: [8.4, 17.6, -3.0], parent: LAMP, cast: false });

  // light: the warm desk lamp, the cool window, the laptop's glow on him, a hemisphere fill
  const hemi = new THREE.HemisphereLight('#c8c4d8', '#5a4430', 0.55); scene.add(hemi);
  const lampLight = new THREE.SpotLight('#ffcf8a', 900, 160, 0.9, 0.6, 1.6); lampLight.position.set(-20, DESK.y + 18, 26); lampLight.target.position.set(4, DESK.y, 16);
  lampLight.castShadow = true; lampLight.shadow.mapSize.set(2048, 2048); lampLight.shadow.bias = -0.0015; scene.add(lampLight, lampLight.target);
  const winLight = new THREE.DirectionalLight('#f2a874', 1.6); winLight.position.set(-30, 90, -160); winLight.target.position.set(0, 20, 10);
  winLight.castShadow = true; winLight.shadow.mapSize.set(2048, 2048); Object.assign(winLight.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 400 }); winLight.shadow.bias = -0.0004; winLight.shadow.normalBias = 0.04;
  scene.add(winLight, winLight.target);
  const fill = new THREE.DirectionalLight('#b8c6ff', 0.5); fill.position.set(120, 80, 160); scene.add(fill);
  const screenLight = new THREE.PointLight('#cfe0ff', 60, 50, 2); screenLight.position.set(0, DESK.y + 6, 10); scene.add(screenLight);

  const DRONES = [drone(scene, C, 611), drone(scene, C, 612)];
  /** drones outside the window: paths [[x0,y0,z0],[x1,y1,z1], t0, t1] per drone (null = gone) */
  function drones(t, paths = []) {
    DRONES.forEach((d, i) => { const p = paths[i]; if (!p) { d.visible = false; return; }
      const k = (t - p[2]) / (p[3] - p[2]); if (k < 0 || k > 1) { d.visible = false; return; }
      d.visible = true; d.position.set(lerp(p[0][0], p[1][0], k), lerp(p[0][1], p[1][1], k) + Math.sin(t * 1.3 + i) * 0.8, lerp(p[0][2], p[1][2], k));
      d.rotation.set(0.08, Math.atan2(p[1][0] - p[0][0], p[1][2] - p[0][2]), Math.sin(t * 0.9 + i) * 0.04);
      for (const r of d.userData.rotors) r.rotation.y = t * 40 + i;
      d.userData.led.visible = ((t + d.userData.ph) % 1.1) < 0.14; });
  }
  const HOURS = {
    dusk: { hemi: ['#c8c4d8', '#5a4430', 0.55], win: ['#f2a874', 1.6], lamp: 900, grade: { exposure: 1.12, lift: [0.012, 0.01, 0.016], gain: [1.04, 1.0, 0.97], sat: 1.05 } },
    night: { hemi: ['#4a5884', '#1a1410', 0.35], win: ['#7f96d8', 0.5], lamp: 1100, grade: { exposure: 1.25, lift: [0.008, 0.008, 0.016], gain: [1.0, 1.0, 1.04], sat: 1.0 } },
    day: { hemi: ['#e6eaf2', '#7a6248', 0.8], win: ['#fff0dc', 2.2], lamp: 300, grade: { exposure: 1.08, lift: [0.01, 0.01, 0.01], gain: [1.02, 1.0, 0.99], sat: 1.04 } },
  };
  let curHour = 'dusk';
  function setHour(name) {
    const h = HOURS[name]; if (name !== curHour) { paint(name); curHour = name; }
    hemi.color.set(h.hemi[0]); hemi.groundColor.set(h.hemi[1]); hemi.intensity = h.hemi[2];
    winLight.color.set(h.win[0]); winLight.intensity = h.win[1]; lampLight.intensity = h.lamp;
    return h.grade;
  }
  return { M, DESK, SEAT, LAPTOP, LID, SCREEN, scrCan, scrTex, THERMOS, PHONE, LAMP, bulb, WIN, WZ, hemi, lampLight, winLight, fill, screenLight, drones, setHour };
}
