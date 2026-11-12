// GIVE WAY (RFH · Highway 9, the road base). Pitch B of plan/PITCHES-11-11.md, built in the night kit (clay/kit/night.js).
// The device is a BORROWED FORMAT in ONE unbroken shot: the car's sat-nav tells the story from the dashboard.
//   s1  a night drive on Highway 9; the sat-nav chimes: "In 300 meters, give way to fighter jets."
//   s2  the car brakes for the road block; a Hornet comes over the roof and lands on the road beyond it
//   s3  three flights cross the aurora: the Netherlands, France, Sweden (flying, not landing here)
//   s4  the sat-nav's list gets a fourth row: Finland's new F-35s, not taking part
//   s5  the Hornet comes back down the road and takes off over the car; "Recalculating. This road is a runway."
// Every fact sits on the sat-nav's own screen; copy.json holds every word and its source. No people, no markings.
import { THREE, mergeGeometries, W, H, TAU, DEG, Q, FPS, clamp, lerp, smooth, ease, rng, C3, V, hash2, fbm, canvasTex, std, lum, mesh, rbox, glowTex, glow,
  shadowed, castAll, uvOf, snowMaps, normalTex, canvasOf, makeSky, toScreen, shoot, spruceGeo, treeMat, plant, out, g2d } from '../kit/night.js';
import * as CAP from '../../pipeline/text/captions.js';

const LANG = Q.get('lang') || 'en', MAG = '#F0027F', AMBER = '#f2b83a';
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 5.0], ['s3', 10.0], ['s4', 13.9], ['s5', 17.4], ['end', 22.5]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const wordT = (id, w0) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.w.toLowerCase().startsWith(w0)) || c.words[0]).t; };

// ------------------------------------------------------------------ the clock: the car, and the jet that needs its road
const V0 = 27, ZSTOP = 17, EYE = 1.85, LANE = 1.8;
const EV = { alert: T.s1 + 0.9, brake: T.s1 + 2.8, stop: T.s2 + 2.4, strip: T.s1 + 2.3, pass1: T.s2 - 0.1, navEx: T.s2 + 1.35, pass2: T.s5 + 1.05 };   // the take-off waits for the F-35 line to clear: a jet under that caption would be read as one
const carV = (t) => V0 * (1 - smooth((t - EV.brake) / (EV.stop - EV.brake)));
const carZ = (t) => { if (t >= EV.stop) return ZSTOP; const d = EV.stop - EV.brake; if (t < EV.brake) return ZSTOP + V0 * (EV.brake - t) + V0 * d / 2;
  const u = (t - EV.brake) / d; return ZSTOP + V0 * d * ((1 - u) - (1 - u * u * u) + (1 - u * u * u * u) / 2); };
// the Hornet: over the car at pass1, down the glide to the road beyond the block, a short roll-out, round, and back for take-off over the car at pass2
const VJ = 62, GLIDE = Math.tan(3.4 * DEG), JY = 2.5, ZTD = -95, ROLL = 4.2, ZEND = ZTD - VJ * ROLL / 2, TKO = 5.6;
const ZP1 = carZ(EV.pass1); EV.touch = EV.pass1 + (ZP1 - ZTD) / VJ; EV.turn = EV.touch + ROLL; EV.roll2 = EV.pass2 - TKO;
const AT = 2 * (ZSTOP - ZEND) / (TKO * TKO), TROT = 3.9, ZLO = ZEND + AT * TROT * TROT / 2;
EV.recalc = EV.pass2 + 0.45; EV.runway = popT('runway'); EV.chime2 = P.captions.find((c) => c.id === 'landing').t0; EV.chime3 = T.s3 + 0.3; EV.chime4 = T.s4 + 0.3;
EV.nl = wordT('allies', 'netherlands'); EV.fr = wordT('allies', 'france'); EV.se = wordT('allies', 'sweden'); EV.fi = wordT('f35', 'finland');
EV.fl0 = T.s3 + 0.5; EV.fl1 = T.s3 + 1.35; EV.fl2 = T.s3 + 2.2; EV.jets = popT('giveway');
function jetAt(t) {   // → { x, y, z, yaw, pitch, roll, burn (0 mil power … 1 afterburner), on }
  if (t < EV.pass1 - 2.2) return { on: false };
  if (t < EV.touch) { const z = ZP1 - VJ * (t - EV.pass1); return { on: true, x: -0.3, y: JY + (z - ZTD) * GLIDE, z, yaw: Math.PI, pitch: 0.12, roll: 0.03 * Math.sin(t * 3.1), burn: 0.12 }; }
  if (t < EV.turn) { const u = (t - EV.touch) / ROLL, z = ZTD - VJ * ROLL * (u - u * u / 2), k = t - EV.touch; return { on: true, x: -0.3, y: JY + 0.1 * Math.exp(-k * 5) * Math.cos(k * 16), z, yaw: Math.PI, pitch: 0.12 * (1 - smooth(k / 0.7)), roll: 0, burn: 0.06 }; }
  if (t < EV.roll2) { const u = smooth((t - EV.turn) / 1.7); return { on: true, x: -0.3 + 2.2 * Math.sin(u * Math.PI), y: JY, z: ZEND, yaw: Math.PI * (1 + u), pitch: 0, roll: 0, burn: 0.05 + 0.1 * smooth((t - EV.roll2 + 0.8) / 0.8) }; }
  const k = t - EV.roll2, z = ZEND + AT * k * k / 2, up = smooth((k - TROT) / 0.6), climb = Math.max(0, z - ZLO);
  return { on: z < ZSTOP + 260, x: -0.3 + 1.5 * smooth((z + 60) / 70), y: JY + climb * Math.tan(10.5 * DEG) * smooth(climb / 30), z, yaw: 0, pitch: 0.21 * up, roll: 0, burn: smooth(k / 0.5) };
}

// ------------------------------------------------------------------ the world: Highway 9 at night
const S = new THREE.Scene(), FOGC = C3('#0f2141'); S.fog = new THREE.Fog(FOGC, 0.011, 8.0045); S.background = FOGC;
const MOONV = V([0.225, 0.208, -0.952]).normalize(), LIGHTV = V([0.42, 0.52, -0.74]).normalize();
const sky = makeSky(S, { top: '#030611', hor: '#0f2141', moon: MOONV.toArray(), moonCos: [0.99988, 0.99995], aurora: 0.42, auroraAz: -0.25, stars: 1700 });
S.add(new THREE.HemisphereLight('#3a5688', '#070a0e', 0.7));
const moon = new THREE.DirectionalLight('#9dbcff', 2.0); moon.target.position.set(0, 0, -270); moon.position.copy(moon.target.position).addScaledVector(LIGHTV, 600); S.add(moon, moon.target);
shadowed(moon, 4096, 10, 1500, { once: true, bias: -0.0006, normalBias: 0.3 }); Object.assign(moon.shadow.camera, { left: -210, right: 210, top: 470, bottom: -470 }); moon.shadow.camera.updateProjectionMatrix();
// the road: bare asphalt in the wheel tracks, packed snow toward the edges, banks, the cleared verge, the forest. Beyond the block it widens into the strip.
const RWz = (z) => 7.2 + 5.6 * smooth((-z - 26) / 22);
const gy = (x, z) => { const a = Math.abs(x), rw = RWz(z); return a < rw ? 0 : 0.55 * smooth((a - rw) / 1.2) * (1 - 0.6 * smooth((a - rw - 2.2) / 3)) + smooth((a - rw - 9) / 30) * (fbm(x / 30, z / 30, 3) - 0.3) * 3; };
{ const g = new THREE.PlaneGeometry(380, 900, 250, 450); g.rotateX(-Math.PI / 2); g.translate(0, 0, -280); const p = g.attributes.position, c = new Float32Array(p.count * 3), A = C3('#14171c'), B = C3('#a9b8d2'), X = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.abs(x), rw = RWz(z); p.setY(i, a < rw - 0.8 ? -0.35 : gy(x, z));
    const snow = a < rw ? clamp(smooth((a - (rw - 2.3)) / 1.7) + 0.5 * Math.exp(-((a / 0.5) ** 2)) + (fbm(x * 1.3, z / 14, 2) - 0.5) * 0.35 - 0.3 * (Math.exp(-(((a - 1.8) / 0.55) ** 2)) + Math.exp(-(((a - 3.6) / 0.5) ** 2))), 0.04, 1) : 1; X.copy(A).lerp(B, snow); c.set([X.r, X.g, X.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals(); const sm = snowMaps([95, 225]); sm.normalScale.set(0.28, 0.28); const m = new THREE.Mesh(g, std('#ffffff', { vertexColors: true, roughness: 0.9, ...sm })); m.userData.noCast = true; S.add(m); }
// the carriageway is its own surface, drawn in a texture: wheel tracks worn down to wet asphalt, packed snow between and beside them, the lines where they show
function surface(strip) { const CW = 512, CH = 1024, half = strip ? 12.8 : 7.2, col = canvasOf(CW, CH, () => {}), hgt = canvasOf(CW, CH, () => {}), rgh = canvasOf(CW, CH, () => {});
  const ic = col.getContext('2d').createImageData(CW, CH), ih = hgt.getContext('2d').createImageData(CW, CH), ir = rgh.getContext('2d').createImageData(CW, CH), A = C3('#15181d'), B = C3('#aebbd6'), G = (v) => Math.pow(v, 1 / 2.2) * 255;
  for (let y = 0; y < CH; y++) { const th = y / CH * TAU, c1 = 4 + 2.6 * Math.cos(th), c2 = 4 + 2.6 * Math.sin(th), zm = y / CH * 24;
    for (let x = 0; x < CW; x++) { const xm = (x / CW * 2 - 1) * half, a = Math.abs(xm), n = 0.5 * fbm(xm * 2.6 + 10, c1 * 1.3, 3) + 0.5 * fbm(xm * 2.6 + 41, c2 * 1.3, 3) - 0.5, fine = hash2(x, y) - 0.5;
      let s2;
      if (!strip) s2 = 0.2 + smooth((a - 4.7) / 1.8) + 0.34 * Math.exp(-((a / 0.5) ** 2)) + 0.3 * Math.exp(-(((a - 1.8) / 0.34) ** 2)) + 0.3 * smooth((a - 3.3) / 0.8) - 0.62 * (Math.exp(-(((a - 1.0) / 0.4) ** 2)) + Math.exp(-(((a - 2.6) / 0.4) ** 2)));
      else s2 = 0.1 + smooth((a - 10.4) / 1.9) + 0.22 * (0.5 + 0.5 * Math.sin(xm * 3.1 + n * 9));     // the strip is swept: bare, with the brush's streaks
      s2 = clamp(s2 + n * 0.75 + fine * 0.12);
      const line = !strip ? ((a < 0.085 && (zm % 12) < 3) || Math.abs(a - 5.6) < 0.07) : ((a < 0.2 && (zm % 12) < 4.5) || Math.abs(a - 9.6) < 0.12);
      const sn = smooth((s2 - 0.3) / 0.4), i = (y * CW + x) * 4, d = 1 + fine * 0.5;
      let r = lerp(A.r * d, B.r, sn), g = lerp(A.g * d, B.g, sn), b = lerp(A.b * d, B.b, sn); if (line && sn < 0.75) { const k = (1 - sn) * 0.75; r = lerp(r, 0.62, k); g = lerp(g, 0.64, k); b = lerp(b, 0.68, k); }
      ic.data[i] = G(r); ic.data[i + 1] = G(g); ic.data[i + 2] = G(b); ic.data[i + 3] = 255;
      const hv = clamp(sn * 0.8 + fine * 0.14 + 0.1) * 255; ih.data[i] = ih.data[i + 1] = ih.data[i + 2] = hv; ih.data[i + 3] = 255;
      const rv = lerp(0.36 + fine * 0.2, 0.95, sn) * 255; ir.data[i] = ir.data[i + 1] = ir.data[i + 2] = rv; ir.data[i + 3] = 255; } }
  col.getContext('2d').putImageData(ic, 0, 0); hgt.getContext('2d').putImageData(ih, 0, 0); rgh.getContext('2d').putImageData(ir, 0, 0);
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; return t; };
  const nm = normalTex(hgt, 2.4, [1, 1]); nm.anisotropy = 16;
  return std('#ffffff', { map: tex(col, true), normalMap: nm, normalScale: new THREE.Vector2(0.55, 0.55), roughnessMap: tex(rgh, false), roughness: 1 }); }
{ const rows = [170, -26, -30, -34, -38, -42, -46, -50, -730], pos = [], uv = [], idx = []; rows.forEach((z, i) => { const w = RWz(z); pos.push(-w, 0.004, z, w, 0.004, z); uv.push(0, -z / 24, 1, -z / 24); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const mk = (i0, i1, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx.slice(i0 * 6, i1 * 6)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.userData.noCast = true; S.add(m); };
  mk(0, 1, surface(false)); mk(1, rows.length - 1, surface(true)); }
{ const R = rng(31), sp = [], sp2 = []; for (let i = 0; i < 16000 && sp.length + sp2.length < 2400; i++) { const x = (R() - 0.5) * 350, z = 168 - R() * 890; if (Math.abs(x) < RWz(z) + 9.5 + fbm(z / 40, 3, 2) * 9) continue; (R() < 0.55 ? sp : sp2).push([x, z, 0.8 + R() * 0.9, R() * TAU, (R() - 0.5) * 0.08]); }
  const tm = treeMat(); plant(S, spruceGeo(5, 7), tm, sp, gy); plant(S, spruceGeo(8, 6), tm, sp2, gy); }
// snow stakes with reflectors along the open road
{ const poles = [], refl = []; for (let z = 155; z > -24; z -= 25) for (const sx of [-1, 1]) { poles.push(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5).translate(sx * 8.3, 1.0, z)); refl.push(new THREE.BoxGeometry(0.07, 0.16, 0.07).translate(sx * 8.3, 1.55, z)); }
  mesh(mergeGeometries(poles), std('#d8641e', { roughness: 0.7 }), { parent: S }); mesh(mergeGeometries(refl), lum(2.2, 1.9, 1.2), { parent: S }); }
// a post by the road: the speed limit, and the red plate of a national road
{ const G = new THREE.Group(); S.add(G); G.position.set(8.9, gy(8.9, 62), 62);
  const lim = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.fillStyle = '#c8201c'; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill(); g.fillStyle = '#f4c81e'; g.beginPath(); g.arc(128, 128, 98, 0, TAU); g.fill(); g.fillStyle = '#101010'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '128px "Anton-400"'; g.fillText('80', 128, 136); });
  const nine = canvasTex(256, 200, (g) => { g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 256, 200); g.fillStyle = '#c8201c'; g.beginPath(); g.roundRect(12, 12, 232, 176, 22); g.fill(); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '150px "Anton-400"'; g.fillText('9', 128, 108); });
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.3, 6), std('#8a8f98', { roughness: 0.5, metalness: 0.6 }), { pos: [0, 1.65, 0], parent: G });
  mesh(new THREE.CircleGeometry(0.42, 28), std('#ffffff', { map: lim, emissive: C3('#ffffff'), emissiveMap: lim, emissiveIntensity: 0.5, roughness: 0.5, transparent: true }), { pos: [0, 2.85, 0.04], parent: G });
  mesh(new THREE.PlaneGeometry(0.62, 0.48), std('#ffffff', { map: nine, emissive: C3('#ffffff'), emissiveMap: nine, emissiveIntensity: 0.5, roughness: 0.5 }), { pos: [0, 2.05, 0.04], parent: G }); }
// the road block: two boards, amber flashers, a sign in both languages
const FL = [], FLL = [];
{ const G = new THREE.Group(); S.add(G);
  const stripe = canvasTex(256, 32, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2f2ee' : '#c8201c'; g.fillRect(i * 32, 0, 32, 32); } });
  for (const [x, w] of [[-3.1, 5.4], [3.4, 4.8]]) { mesh(new THREE.BoxGeometry(w, 0.3, 0.05), std('#8c8c8c', { map: stripe, roughness: 0.6, emissive: C3('#ffffff'), emissiveMap: stripe, emissiveIntensity: 0.1 }), { pos: [x, 0.72, 0], parent: G });
    for (const sx of [-1, 1]) { const fx = x + sx * (w / 2 - 0.3); mesh(new THREE.BoxGeometry(0.07, 1.0, 0.5), std('#30333a'), { pos: [fx, 0.5, 0], parent: G });
      const mat = lum(9, 4.6, 0.6), bulb = mesh(new THREE.SphereGeometry(0.1, 10, 8), mat, { pos: [fx, 1.1, 0], parent: G }), gl = glow(G, [fx, 1.1, 0.05], 1.9, 1.0, 0.5, 0.08);
      FL.push({ mat, gl, pos: new THREE.Vector3(fx, 1.1, 0), ph: FL.length % 2 }); }
    const pl = new THREE.PointLight('#ff9a2a', 0, 18, 2); pl.position.set(x, 1.3, 0.6); G.add(pl); FLL.push(pl); }
  const sign = canvasTex(512, 300, (g) => { g.fillStyle = '#f2c81e'; g.fillRect(0, 0, 512, 300); g.strokeStyle = '#101010'; g.lineWidth = 12; g.strokeRect(10, 10, 492, 280); g.fillStyle = '#101010'; g.textAlign = 'center'; g.font = '92px "Anton-400"'; g.fillText('TIE SULJETTU', 256, 128); g.font = '74px "Anton-400"'; g.fillText('ROAD CLOSED', 256, 236); });
  mesh(new THREE.BoxGeometry(2.3, 1.35, 0.05), std('#7a7a7a', { map: sign, emissive: C3('#ffffff'), emissiveMap: sign, emissiveIntensity: 0.1, roughness: 0.6 }), { pos: [-1.75, 2.1, 0], parent: G }); mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), std('#30333a'), { pos: [-1.75, 1.1, -0.05], parent: G }); }
// the strip: portable edge lights that come on in a wave running away, a green threshold, red at the far end
const STRIP = (() => { const pts = [], col = [], base = [], at = [];
  const add = (x, z, r, g, b, t) => { pts.push(x, 0.35, z); base.push(r, g, b); col.push(0, 0, 0); at.push(t); };
  for (let z = -44; z > -650; z -= 30) for (const sx of [-1, 1]) add(sx * (RWz(z) - 0.9), z, 3.4, 3.0, 2.1, EV.strip + (-z - 44) / 600 * 1.5);
  for (let i = 0; i < 8; i++) add(-10.5 + i * 3, -38, 0.22, 2.1, 0.75, EV.strip - 0.12); for (let i = 0; i < 8; i++) add(-10.5 + i * 3, -656, 3.6, 0.3, 0.2, EV.strip + 1.6);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  for (const [size, att] of [[2.2, true], [6, false]]) { const m = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size, sizeAttenuation: att, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.frustumCulled = false; S.add(m); }
  return { set(t) { const c = g.attributes.color; for (let i = 0; i < at.length; i++) { const k = clamp((t - at[i]) / 0.12), f = k * (1 + 0.8 * Math.exp(-Math.max(0, t - at[i]) * 9)); c.setXYZ(i, base[i * 3] * f, base[i * 3 + 1] * f, base[i * 3 + 2] * f); } c.needsUpdate = true; } }; })();
// the road base's own kit beside the strip: tents, a truck with a beacon, two light masts
const BEACON = [];
{ const canvas = std('#2c3a2a', { roughness: 0.95 }), dark = std('#1a1e22', { roughness: 0.8 }), steel = std('#6a7078', { roughness: 0.5, metalness: 0.5 });
  const tent = (x, z, ry) => { const G = new THREE.Group(); S.add(G); G.position.set(x, gy(x, z), z); G.rotation.y = ry; const s = new THREE.Shape(); s.moveTo(-3, 0); s.lineTo(-3, 1.9); s.lineTo(0, 3.1); s.lineTo(3, 1.9); s.lineTo(3, 0); s.closePath();
    mesh(new THREE.ExtrudeGeometry(s, { depth: 9, bevelEnabled: false }).translate(0, 0, -4.5), canvas, { parent: G }); mesh(new THREE.PlaneGeometry(1.6, 1.9), lum(2.4, 1.5, 0.6), { pos: [0, 0.95, 4.52], parent: G }); glow(G, [0, 1.0, 4.9], 6, 0.75, 0.42, 0.14); };
  tent(19.5, -118, -0.5); tent(-20, -176, 0.6);
  { const G = new THREE.Group(); S.add(G); G.position.set(17.2, gy(17.2, -96), -96); G.rotation.y = 0.2; mesh(rbox(2.5, 2.3, 5.2, 0.15), canvas, { pos: [0, 2.0, -1.2], parent: G }); mesh(rbox(2.4, 1.9, 2.0, 0.2), canvas, { pos: [0, 1.8, 2.5], parent: G });
    for (const sx of [-1, 1]) for (const z of [-2.6, -0.6, 2.4]) mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 14), dark, { pos: [sx * 1.15, 0.55, z], rot: [0, 0, Math.PI / 2], parent: G });
    const mat = lum(8, 4, 0.5); mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10), mat, { pos: [0, 2.9, 2.5], parent: G }); const gl = glow(G, [0, 2.95, 2.5], 2.6, 1.0, 0.5, 0.08); BEACON.push({ mat, gl }); }
  for (const [x, z, tx] of [[16.5, -134, 6], [-16.8, -208, -6]]) { const y0 = gy(x, z); mesh(new THREE.CylinderGeometry(0.07, 0.1, 9, 6), steel, { pos: [x, y0 + 4.5, z], parent: S }); mesh(new THREE.BoxGeometry(1.2, 0.5, 0.2), lum(9, 9.5, 11), { pos: [x, y0 + 9, z], rot: [0, Math.atan2(tx - x, 20), 0], parent: S }); glow(S, [x, y0 + 9, z], 5.5, 0.75, 0.82, 1.0);
    if (x > 0) { const l = new THREE.SpotLight('#dfe8ff', 6000, 95, 0.95, 0.9, 2); l.position.set(x, y0 + 9, z); l.target.position.set(tx, 0, z + 12); S.add(l, l.target); } } }
castAll(S);

// ------------------------------------------------------------------ the Hornet (plain grey, no markings); nose toward +z
function hornet() {
  const G = new THREE.Group(), grey = std('#6f7782', { roughness: 0.55, metalness: 0.25 }), dark = std('#3a4048', { roughness: 0.6, metalness: 0.4 }), slime = lum(0.45, 1.05, 0.36), noz = lum(1, 1, 1), burn = [];
  mesh(new THREE.CapsuleGeometry(0.78, 10.5, 8, 18), grey, { rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.86], parent: G });
  mesh(new THREE.ConeGeometry(0.74, 3.6, 18), grey, { pos: [0, -0.02, 7.7], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.86], parent: G });
  mesh(new THREE.SphereGeometry(1, 18, 12), std('#0a0f18', { roughness: 0.06, metalness: 0.7, emissive: C3('#0c1422') }), { pos: [0, 0.62, 4.1], scale: [0.6, 0.52, 2.3], parent: G });
  const plan = (pts, t = 0.14) => { const s = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z))); pts.slice().reverse().forEach(([x, z]) => s.lineTo(-x, z)); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.rotateX(Math.PI / 2); return g; };
  mesh(plan([[0.5, 6.2], [1.35, 2.6], [1.55, 1.5], [5.75, -1.3], [5.75, -2.7], [1.2, -3.4]]), grey, { pos: [0, 0.2, 0], parent: G });
  mesh(plan([[0.9, -5.0], [3.4, -6.7], [3.4, -7.7], [0.9, -7.3]], 0.1), grey, { pos: [0, 0.05, 0], parent: G });
  for (const sx of [-1, 1]) { const s = new THREE.Shape(); [[-3.5, 0], [-5.5, 3.2], [-6.7, 3.2], [-6.3, 0]].forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y))); s.closePath(); const fin = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }); fin.rotateY(-Math.PI / 2);
    mesh(fin, grey, { pos: [sx * 0.95, 0.45, 0], rot: [0, 0, -sx * 0.36], parent: G }); mesh(new THREE.BoxGeometry(0.03, 0.9, 0.1), slime, { pos: [sx * 1.6, 2.3, -5.9], rot: [0, 0, -sx * 0.36], parent: G });
    mesh(rbox(0.85, 0.75, 3.4, 0.2), grey, { pos: [sx * 1.1, -0.42, 1.2], parent: G }); mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), std('#050608'), { pos: [sx * 1.1, -0.42, 2.92], parent: G });
    mesh(new THREE.CylinderGeometry(0.52, 0.46, 2.4, 16, 1, true), dark, { pos: [sx * 0.58, -0.08, -6.6], rot: [Math.PI / 2, 0, 0], parent: G }); mesh(new THREE.CircleGeometry(0.44, 20), noz, { pos: [sx * 0.58, -0.08, -7.2], rot: [0, Math.PI, 0], parent: G });
    burn.push(glow(G, [sx * 0.58, -0.08, -7.95], 1.5, 1.0, 0.5, 0.16));
    // the afterburner's flame: a long cone of light behind each nozzle
    const fl = mesh(new THREE.ConeGeometry(0.4, 6.5, 14, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), { pos: [sx * 0.58, -0.08, -10.9], rot: [-Math.PI / 2, 0, 0], parent: G }); burn.push(fl);
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.9, 8), std('#d8dce2', { roughness: 0.4 }), { pos: [sx * 5.9, 0.16, -1.6], rot: [Math.PI / 2, 0, 0], parent: G }); mesh(new THREE.ConeGeometry(0.09, 0.4, 8), std('#d8dce2'), { pos: [sx * 5.9, 0.16, 0.05], rot: [Math.PI / 2, 0, 0], parent: G });
    mesh(new THREE.SphereGeometry(0.07, 8, 6), sx < 0 ? lum(8, 0.3, 0.2) : lum(0.3, 8, 1.5), { pos: [sx * 5.78, 0.2, -1.3], parent: G }); glow(G, [sx * 5.78, 0.2, -1.2], 1.3, sx < 0 ? 1 : 0.08, sx < 0 ? 0.06 : 1, sx < 0 ? 0.05 : 0.3);
    mesh(new THREE.BoxGeometry(0.03, 0.12, 1.6), slime, { pos: [sx * 0.8, 0.25, 5.2], parent: G }); mesh(new THREE.BoxGeometry(1.4, 0.03, 0.12), slime, { pos: [sx * 4.9, 0.3, -2.0], parent: G });
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8), dark, { pos: [sx * 1.35, -1.25, -0.9], rot: [0, 0, sx * 0.2], parent: G }); mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 16), std('#101114', { roughness: 0.9 }), { pos: [sx * 1.55, -2.0, -0.9], rot: [0, 0, Math.PI / 2], parent: G }); }
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8), dark, { pos: [0, -1.5, 4.3], parent: G }); for (const sx of [-0.16, 0.16]) mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 14), std('#101114', { roughness: 0.9 }), { pos: [sx, -2.25, 4.3], rot: [0, 0, Math.PI / 2], parent: G });
  mesh(new THREE.SphereGeometry(0.11, 10, 8), lum(14, 14, 12.5), { pos: [0, -1.2, 4.42], parent: G }); const lampGlow = glow(G, [0, -1.2, 4.5], 7.5, 1.0, 0.98, 0.9);
  const strobe = lum(0, 0, 0), sg = glow(G, [0, 0.95, -1.0], 1.6, 0.9, 0.9, 1.0); mesh(new THREE.SphereGeometry(0.05, 8, 6), strobe, { pos: [0, 0.95, -1.0], parent: G });
  const land = new THREE.SpotLight('#fff6e0', 16000, 340, 0.3, 0.9, 2); land.position.set(0, -1.2, 4.6); land.target.position.set(0, -20, 90); G.add(land, land.target);
  const hot = new THREE.PointLight('#ff8a3a', 0, 90, 2); hot.position.set(0, -0.6, -16); G.add(hot);
  const bounce = new THREE.PointLight('#a9c2ff', 110, 26, 2); bounce.position.set(0, -6, 1); G.add(bounce);
  G.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } }); G.rotation.order = 'YXZ';
  Object.assign(G.userData, { noz, burn, lampGlow, strobe, sg, land, hot }); return G;
}
const J = hornet(); S.add(J);
const _jw = new THREE.Vector3(), _jd = new THREE.Vector3();
function poseJet(t, camPos) { const a = jetAt(t), u = J.userData; J.visible = !!a.on; if (!a.on) { u.land.intensity = 0; u.hot.intensity = 0; return a; }
  J.position.set(a.x, a.y, a.z); J.rotation.set(-a.pitch, a.yaw, a.roll); const b = a.burn;
  u.noz.color.setRGB(0.5 + 10 * b * b, 0.16 + 3.6 * b * b, 0.05 + 1.7 * b * b); u.hot.intensity = 1500 * b * b * b;
  u.burn.forEach((o) => { if (o.isSprite) { o.scale.setScalar(1.5 + 5 * b); o.material.opacity = 0.5 + 0.5 * b; } else { const f = b * b * (0.85 + 0.15 * Math.sin(t * 90 + o.position.x * 7)); o.material.color.setRGB(1.7 * f, 0.8 * f, 0.34 * f); o.scale.set(1, 0.5 + 0.6 * f, 1); } });
  const d = camPos ? Math.hypot(a.x - camPos.x, a.y - camPos.y, a.z - camPos.z) : 100, front = camPos ? clamp(((camPos.z - a.z) * Math.cos(a.yaw) / d - 0.1) * 3) : 0; u.lampGlow.scale.setScalar(Math.max(5, d * 0.035)); u.lampGlow.material.opacity = front; u.land.intensity = 6500;
  const st = (t * 1.15) % 1 < 0.07 ? 1 : 0; u.strobe.color.setRGB(12 * st, 12 * st, 12 * st); u.sg.material.opacity = st; return a; }
// three flights high over the road, crossing the aurora (flying, not landing here)
const FLIGHTS = (() => { const dart = mergeGeometries([new THREE.ConeGeometry(1.1, 15, 6).rotateX(Math.PI / 2), new THREE.BoxGeometry(11, 0.2, 4).translate(0, 0, -2.5), new THREE.BoxGeometry(4.6, 0.2, 2).translate(0, 0, -6.5)]), mat = new THREE.MeshBasicMaterial({ color: '#141a28', fog: false }), list = [];
  const trailT = canvasTex(8, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 256); });
  const mk = (t0, from, to, dur) => { const G = new THREE.Group(); S.add(G); const dir = V(to).sub(V(from)).normalize(), side = new THREE.Vector3(dir.z, 0, -dir.x).normalize(); G.lookAt(dir);
    for (const [o, b] of [[0, 0], [1, -1], [-1, -1]]) { const m = new THREE.Mesh(dart, mat); m.position.set(o * 28, 0, b * 34); G.add(m);
      const tr = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 420).rotateX(-Math.PI / 2).translate(0, 0, -218), new THREE.MeshBasicMaterial({ map: trailT, color: new THREE.Color(0.3, 0.36, 0.52), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); tr.position.copy(m.position); G.add(tr);
      const r = glow(G, [o * 28 + 5.5, 0, b * 34], 24, 1.0, 0.1, 0.08), g = glow(G, [o * 28 - 5.5, 0, b * 34], 24, 0.1, 1.0, 0.3), w = glow(G, [o * 28, 0.5, b * 34 - 7], 52, 1.0, 0.98, 0.9), h = glow(G, [o * 28, 0, b * 34 - 9], 30, 1.0, 0.5, 0.2);
      [r, g, w, h].forEach((sp) => { sp.material.fog = false; }); list.push({ w, ph: list.length * 0.37 }); }
    G.visible = false; return { G, t0, from: V(from), to: V(to), dur }; };
  const F = [mk(EV.fl0, [-430, 150, -900], [500, 190, -1100], 3.4), mk(EV.fl1, [640, 265, -1550], [-640, 235, -1350], 4.0), mk(EV.fl2, [150, 300, 200], [-70, 430, -2400], 5.0)];
  return { set(t) { for (const f of F) { const k = (t - f.t0) / f.dur; f.G.visible = k > -0.05 && k < 1.05; if (f.G.visible) f.G.position.copy(f.from).lerp(f.to, k); } for (const l of list) l.w.material.opacity = ((t * 1.3 + l.ph) % 1) < 0.08 ? 1 : 0.08; } }; })();

// ------------------------------------------------------------------ snow in the air: every flake a streak as long as it travels past the lens in one exposure
const SNOW = (() => { const n = 2600, pos = new Float32Array(n * 12), end = new Float32Array(n * 8), sd = new Float32Array(n * 4), idx = [], R = rng(3);
  for (let i = 0; i < n; i++) { const x = R(), y = R(), z = R(), s = R(); for (let k = 0; k < 4; k++) { pos.set([x, y, z], (i * 4 + k) * 3); end.set([k >> 1, (k & 1) * 2 - 1], (i * 4 + k) * 2); sd[i * 4 + k] = s; } idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 2)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1)); g.setIndex(idx);
  const U = { uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(30, 16, 64) }, uVel: { value: new THREE.Vector3(0.6, -1.1, 0.2) }, uShift: { value: new THREE.Vector3() }, uTime: { value: 0 }, uPx: { value: 2 / H }, uGust: { value: 0 },
    uHeadPos: { value: new THREE.Vector3() }, uHead: { value: 1 }, uLampPos: { value: new THREE.Vector3() }, uLampDir: { value: new THREE.Vector3(0, 0, -1) }, uLamp: { value: 0 },
    uGain: { value: 1 }, uAmb: { value: Number(Q.get('amb') || 1) }, uFl: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uFlA: { value: new THREE.Vector4() }, uHot: { value: new THREE.Vector4() } };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `uniform vec3 uCam, uBox, uVel, uShift; uniform float uTime, uPx, uGust; attribute vec2 aEnd; attribute float aSeed; varying vec3 vW; varying float vE, vA;
void main(){
  vec3 p = position * uBox + uVel * uTime * (0.7 + 0.6 * aSeed); p.x += sin(uTime * 0.9 + aSeed * 40.) * 0.25; p.z += uGust * (0.4 + aSeed);
  vec3 wp = uCam + mod(p - uCam, uBox) - uBox * vec3(0.5, 0.3, 0.86);
  vec4 a = viewMatrix * vec4(wp, 1.), b = viewMatrix * vec4(wp + uShift * (0.8 + 0.4 * aSeed), 1.);
  if (a.z > -2.7 || b.z > -2.7) { gl_Position = vec4(2., 2., 2., 1.); return; }
  vec4 ca = projectionMatrix * a, cb = projectionMatrix * b; vec2 na = ca.xy / ca.w, nb = cb.xy / cb.w, asp = vec2(${(W / H).toFixed(5)}, 1.);
  vec2 d = (nb - na) * asp; float len = length(d); vec2 dir = len > 1e-5 ? d / len : vec2(0., 1.), perp = vec2(-dir.y, dir.x);
  float hw = max((0.006 + 0.008 * aSeed) * projectionMatrix[1][1] / -a.z, uPx * 0.55);
  vec4 c = mix(ca, cb, aEnd.x); vec2 off = (perp * aEnd.y * hw + dir * (aEnd.x * 2. - 1.) * hw) / asp;
  c.xy += off * c.w; gl_Position = c; vW = wp; vE = aEnd.y; vA = inversesqrt(1. + len / (hw * 3.)) * exp(a.z / 30.);
}`,
    fragmentShader: `uniform vec3 uHeadPos, uLampPos, uLampDir, uFl[4]; uniform vec4 uFlA, uHot; uniform float uHead, uLamp, uGain, uAmb; varying vec3 vW; varying float vE, vA;
void main(){
  vec3 col = vec3(0.045, 0.058, 0.1) * uAmb;
  vec3 d = vW - uHeadPos; float dist = length(d), c = -d.z / dist;
  col += vec3(1.0, 0.92, 0.78) * uHead * smoothstep(0.80, 0.985, c) * 2.6 / (1. + dist * dist * 0.012);
  d = vW - uLampPos; dist = length(d); c = dot(d / dist, uLampDir);
  col += vec3(1.0, 0.98, 0.92) * uLamp * smoothstep(0.93, 0.995, c) * 9. / (1. + dist * dist * 0.004);
  for (int i = 0; i < 4; i++) { vec3 e = vW - uFl[i]; col += vec3(1.0, 0.5, 0.07) * uFlA[i] * 1.3 / (1. + dot(e, e) * 0.3); }
  vec3 h = vW - uHot.xyz; col += vec3(1.0, 0.45, 0.12) * uHot.w * 10. / (1. + dot(h, h) * 0.02);
  float a = (1. - vE * vE) * vA;
  gl_FragColor = vec4(min(col, vec3(2.4)) * a * uGain, 1.);
}` })); m.frustumCulled = false; m.renderOrder = 5; S.add(m); return { U, m }; })();

// ------------------------------------------------------------------ the car: its lights, and what the driver sees of it (dash, hood, wipers, the sat-nav)
const CAR = new THREE.Group(); S.add(CAR);
for (const sx of [-1, 1]) { const head = new THREE.SpotLight('#ffe9c4', 4400, 130, 0.17, 0.7, 2); head.position.set(sx * 0.6, -0.7, -2.9); head.target.position.set(sx * 2.3, -2.2, -22); CAR.add(head, head.target); }
const CAB = new THREE.Group(); CAR.add(CAB);
const NAV = new THREE.Group(); const navGlow = new THREE.PointLight('#5aa0ff', 0.09, 2.2, 2), hazard = new THREE.PointLight('#ff9a1a', 0, 1.6, 2);
{ const grainC = canvasOf(256, 256, (g) => { const im = g.createImageData(256, 256); for (let i = 0; i < 256 * 256; i++) { const v = 110 + hash2(i % 256, Math.floor(i / 256)) * 90; im.data.set([v, v, v, 255], i * 4); } g.putImageData(im, 0, 0); });
  const soft = std('#343844', { roughness: 0.82, normalMap: normalTex(grainC, 1.2, [14, 7]), normalScale: new THREE.Vector2(0.5, 0.5) }), trim = std('#0a0c10', { roughness: 0.5 }), rubber = std('#07080a', { roughness: 0.9 });
  mesh(rbox(2.0, 0.14, 1.0, 0.05), soft, { pos: [0, -0.345, -0.76], rot: [0.05, 0, 0], parent: CAB });                         // the dash top, rising to the screen
  mesh(rbox(2.0, 0.035, 0.07, 0.015), trim, { pos: [0, -0.247, -1.245], parent: CAB });                                        // the cowl's lip
  for (const x of [-0.42, 0, 0.42]) mesh(new THREE.BoxGeometry(0.3, 0.004, 0.05), trim, { pos: [x, -0.262, -1.12], rot: [0.05, 0, 0], parent: CAB });   // defrost vents
  for (const [x, a] of [[-0.3, 0.06], [0.34, 0.05]]) { mesh(new THREE.BoxGeometry(0.62, 0.012, 0.022), rubber, { pos: [x, -0.236, -1.275], rot: [0, 0, a], parent: CAB }); mesh(new THREE.BoxGeometry(0.4, 0.016, 0.016), trim, { pos: [x + 0.1, -0.245, -1.285], rot: [0, 0, a * 0.5], parent: CAB }); }
  // the hood, dusted with snow toward its edges
  const hoodC = canvasTex(512, 512, (g) => { const im = g.createImageData(512, 512); for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const e = Math.min(x, 511 - x) / 256, n = fbm(x / 34, y / 34, 4), sn = smooth((0.5 * n + 0.42 - e * 1.5 - y / 512 * 0.25) / 0.16), i = (y * 512 + x) * 4; im.data[i] = lerp(52, 208, sn); im.data[i + 1] = lerp(72, 220, sn); im.data[i + 2] = lerp(112, 240, sn); im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
  mesh(rbox(1.84, 0.1, 1.6, 0.045), std('#ffffff', { map: hoodC, roughness: 0.34, metalness: 0.45 }), { pos: [0, -0.5, -2.06], rot: [-0.012, 0, 0], parent: CAB });
  // the sat-nav on its stalk
  CAB.add(NAV); NAV.position.set(0, -0.176, -0.64); NAV.rotation.x = -0.26; NAV.scale.setScalar(0.965);
  mesh(rbox(0.306, 0.142, 0.02, 0.012), trim, { parent: NAV }); mesh(new THREE.PlaneGeometry(0.284, 0.12), lum(0.02, 0.035, 0.07), { pos: [0, 0, 0.0106], parent: NAV });
  mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.1, 10), trim, { pos: [0, -0.1, -0.03], rot: [0.5, 0, 0], parent: NAV }); mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.014, 20), trim, { pos: [0, -0.14, -0.055], rot: [0.26, 0, 0], parent: NAV });
  navGlow.position.set(0, -0.12, -0.5); hazard.position.set(-0.3, -0.2, -0.45); CAB.add(navGlow, hazard);
  CAB.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } }); }
const cam = new THREE.PerspectiveCamera(56, W / H, 0.12, 6000); CAR.add(cam);
const NAVC = [[-0.142, 0.06], [0.142, 0.06], [-0.142, -0.06], [0.142, -0.06]].map(([x, y]) => new THREE.Vector3(x, y, 0.011));

// ------------------------------------------------------------------ one moment of the film
const trauma = (t) => 1.0 * Math.exp(-(((t - EV.pass1 - 0.1) / 0.42) ** 2)) + 0.55 * Math.exp(-(((t - EV.touch) / 0.25) ** 2)) * 0.4 + 1.25 * Math.exp(-(((t - EV.pass2 - 0.05) / 0.5) ** 2));
const flash = (t, ph) => { const k = (t * 1.15 + ph * 0.5) % 1; return k < 0.42 ? smooth(k / 0.04) * (1 - smooth((k - 0.34) / 0.08)) : 0; };
const _cp = new THREE.Vector3(), _v = new THREE.Vector3();
function pose(t) {
  const v = carV(t), z = carZ(t), acc = (carV(t + 0.02) - carV(t - 0.02)) / 0.04, tr = trauma(t), sp = v / V0;
  const settle = t > EV.stop ? Math.exp(-(t - EV.stop) * 3.2) * Math.sin((t - EV.stop) * 9.5) * 0.006 : 0, dive = -acc * 0.0016 + settle;      // the nose dips under braking and rocks back as it stops
  const n1 = fbm(t * 7.1, 3.3, 2) - 0.5, n2 = fbm(t * 6.3, 9.1, 2) - 0.5, n3 = fbm(t * 23, 1.7, 2) - 0.5, n4 = fbm(t * 27, 5.2, 2) - 0.5;
  CAR.position.set(LANE + 0.05 * Math.sin(t * 0.7) * sp, EYE + n3 * 0.012 * sp + n4 * 0.03 * tr, z);
  CAR.rotation.set(-dive + n4 * 0.004 * sp + n3 * 0.012 * tr, n1 * 0.004 * sp + n4 * 0.008 * tr, n2 * 0.006 * sp + n3 * 0.014 * tr);
  cam.position.set(n1 * 0.004 * (sp + tr), n2 * 0.004 * (sp + tr), 0); cam.rotation.set(-0.033 + dive * 0.55 - n3 * 0.004 * tr, n2 * 0.002 * tr, 0);
  CAR.updateMatrixWorld(true); cam.getWorldPosition(_cp);
  const a = poseJet(t, _cp), u = SNOW.U; STRIP.set(t); FLIGHTS.set(t);
  FL.forEach((f, i) => { const k = flash(t, f.ph), near = clamp(1 - (z - ZSTOP) / 160); f.mat.color.setRGB(0.4 + 3.0 * k, 0.2 + 1.45 * k, 0.03 + 0.2 * k); f.gl.scale.setScalar(0.9 + 1.0 * k); f.gl.material.opacity = 0.3 + 0.5 * k; u.uFl.value[i].copy(f.pos); u.uFlA.value.setComponent(i, k * near); });
  FLL.forEach((pl, i) => { pl.intensity = 95 * (flash(t, 0) + flash(t, 1)); });
  BEACON.forEach((b) => { const k = Math.max(0, Math.sin(t * 5.2)) ** 6; b.mat.color.setRGB(1 + 10 * k, 0.5 + 5 * k, 0.1 + 0.6 * k); b.gl.scale.setScalar(1.5 + 3 * k); });
  { const [cr, cg, cb] = NAVCOL[navState(t)]; navGlow.color.setRGB(lerp(cr, 1, 0.35), lerp(cg, 1, 0.35), lerp(cb, 1, 0.35)); }
  hazard.visible = t > EV.stop + 0.3; hazard.intensity = t > EV.stop + 0.3 ? 0.16 * (((t - EV.stop - 0.3) * 1.5) % 1 < 0.5 ? 1 : 0) : 0;
  u.uCam.value.copy(_cp); u.uTime.value = t; u.uHeadPos.value.set(CAR.position.x, CAR.position.y - 0.7, z - 2.9); const gt = Math.max(0, t - EV.pass2 - 0.1), gustV = gt > 0 ? 84 * Math.exp(-gt * 1.4) : 0; u.uGust.value = 60 * (1 - Math.exp(-gt * 1.4));
  if (a.on) { J.updateMatrixWorld(true); u.uLampPos.value.copy(J.localToWorld(_jw.set(0, -1.2, 4.6))); u.uLampDir.value.copy(J.localToWorld(_jd.set(0, -20, 90))).sub(u.uLampPos.value).normalize(); u.uLamp.value = 1; J.localToWorld(_v.set(0, 0, -10)); u.uHot.value.set(_v.x, _v.y, _v.z, a.burn * a.burn); }
  else { u.uLamp.value = 0; u.uHot.value.w = 0; }
  sky.follow({ position: _cp }, t); return { v, z, a, gustV };
}

// ------------------------------------------------------------------ the sat-nav's screen (design space 780 × 330)
const FLAGS = { nl: (g, x, y, w, h) => { ['#ae1c28', '#ffffff', '#21468b'].forEach((c, i) => { g.fillStyle = c; g.fillRect(x, y + i * h / 3, w, h / 3 + 0.5); }); },
  fr: (g, x, y, w, h) => { ['#0055a4', '#ffffff', '#ef4135'].forEach((c, i) => { g.fillStyle = c; g.fillRect(x + i * w / 3, y, w / 3 + 0.5, h); }); },
  se: (g, x, y, w, h) => { g.fillStyle = '#006aa7'; g.fillRect(x, y, w, h); g.fillStyle = '#fecc00'; g.fillRect(x + w * 0.3, y, w * 0.14, h); g.fillRect(x, y + h * 0.41, w, h * 0.18); },
  fi: (g, x, y, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h); g.fillStyle = '#003580'; g.fillRect(x + w * 0.28, y, w * 0.17, h); g.fillRect(x, y + h * 0.36, w, h * 0.28); } };
const jetIcon = (g, x, y, s, a = 0) => { g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.beginPath(); g.moveTo(0, -13); g.lineTo(2.6, -4); g.lineTo(11, 3); g.lineTo(11, 6); g.lineTo(2.6, 4); g.lineTo(2.2, 9); g.lineTo(6, 12); g.lineTo(6, 13.5); g.lineTo(0, 12); g.lineTo(-6, 13.5); g.lineTo(-6, 12); g.lineTo(-2.2, 9); g.lineTo(-2.6, 4); g.lineTo(-11, 6); g.lineTo(-11, 3); g.lineTo(-2.6, -4); g.closePath(); g.fill(); g.restore(); };
function navState(t) { return t < EV.alert ? 0 : t < EV.navEx ? 1 : t < T.s3 ? 2 : t < EV.recalc ? 3 : t < EV.runway ? 4 : 5; }
const NAVCOL = [[0.28, 0.5, 1.0], [1.0, 0.1, 0.45], [1.0, 0.62, 0.16], [0.3, 0.6, 1.0], [0.55, 0.6, 0.75], [1.0, 0.62, 0.16]];
function navUI(g, t, R, st) {
  const { z } = st, ns = navState(t), since = t - [0, EV.alert, EV.navEx, T.s3, EV.recalc, EV.runway][ns], inK = ease.out(since / 0.28);
  g.save(); g.translate(R.x, R.y); g.scale(R.w / 780, R.h / 330);
  const [cr, cg, cb] = NAVCOL[ns], glowC = `rgba(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)},.5)`;
  g.shadowColor = glowC; g.shadowBlur = 46; g.fillStyle = '#0a1120'; g.beginPath(); g.roundRect(0, 0, 780, 330, 18); g.fill(); g.shadowBlur = 0;
  g.beginPath(); g.roundRect(0, 0, 780, 330, 18); g.clip();
  // ---- the map, left: the road ahead, the block coming closer, and past it a runway
  const MW = 214; g.fillStyle = '#0d1728'; g.fillRect(0, 0, MW, 330); g.strokeStyle = '#16233d'; g.lineWidth = 2; const sc = ((ZSTOP + 130 - z) * 2.2) % 60;
  for (let i = -1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 60 + sc - 40); g.lineTo(MW, i * 60 + sc + 10); g.stroke(); } for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(20 + i * 62, 0); g.lineTo(-10 + i * 62, 330); g.stroke(); }
  const cx = 107, carY = 262, mapY = (zw) => { const d = z - zw; return carY - Math.sign(d) * 240 * (1 - Math.exp(-Math.abs(d) / 90)); }, blockY = mapY(0), rwy = ns >= 2;
  g.strokeStyle = '#33528f'; g.lineWidth = 34; g.lineCap = 'butt'; g.beginPath(); g.moveTo(cx, 340); g.lineTo(cx, Math.max(-10, blockY)); g.stroke();
  if (ns >= 1 && blockY > -30) {   // beyond the block: the strip
    g.strokeStyle = rwy ? '#4a5568' : '#27344f'; g.lineWidth = 46; g.beginPath(); g.moveTo(cx, blockY - 4); g.lineTo(cx, -10); g.stroke();
    if (rwy) { g.strokeStyle = '#f4f6fa'; g.lineWidth = 3; g.setLineDash([12, 12]); g.beginPath(); g.moveTo(cx, blockY - 12); g.lineTo(cx, -10); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffe9a8'; for (let y = blockY - 14; y > -6; y -= 22) { g.beginPath(); g.arc(cx - 23, y, 2.6, 0, TAU); g.arc(cx + 23, y, 2.6, 0, TAU); g.fill(); } }
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#f2f2ee' : '#e0222a'; g.fillRect(cx - 33 + i * 11, blockY - 5, 11, 9); } }
  if (ns === 0 || (ns === 1 && since < 0.2)) { g.strokeStyle = '#59c8ff'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, carY - 6); g.lineTo(cx, 20); g.stroke(); }
  else if (ns >= 1 && ns < 4) { g.strokeStyle = MAG; g.lineWidth = 8; g.lineCap = 'round'; g.setLineDash([3, 15]); g.beginPath(); g.moveTo(cx, carY - 8); g.lineTo(cx, Math.max(8, blockY + 12)); g.stroke(); g.setLineDash([]); }
  // the Hornet on the map: down the strip, round, and back over the arrow
  { const a = jetAt(t); if (a.on && ns >= 1) { const jy = mapY(a.z); if (jy > -20 && jy < 350) { g.fillStyle = '#ffd98a'; jetIcon(g, cx + (a.x + 0.3) * 4, jy, 1.25, a.yaw - Math.PI); } } }
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx, carY - 17); g.lineTo(cx - 14, carY + 15); g.lineTo(cx, carY + 7); g.lineTo(cx + 14, carY + 15); g.closePath(); g.fill();
  g.strokeStyle = '#22314f'; g.lineWidth = 2; g.beginPath(); g.moveTo(MW, 0); g.lineTo(MW, 330); g.stroke();
  // ---- the panel, right
  const X0 = MW + 24, PW = 780 - X0 - 22; g.textBaseline = 'middle';
  const banner = (text, col, ink = '#ffffff', icon = null) => { g.save(); g.globalAlpha = inK; g.translate(0, (1 - inK) * -14); g.fillStyle = col; g.beginPath(); g.roundRect(X0, 20, PW, 70, 12); g.fill(); let tx = X0 + 22; if (icon) { g.save(); icon(X0 + 42, 55); g.restore(); tx = X0 + 82; } g.fillStyle = ink; g.font = '700 41px RobotoCondensed'; g.textAlign = 'left'; g.fillText(text, tx, 57); g.restore(); };
  const row = (text, y, col = '#dfe7fa', size = 35, wgt = 600) => { g.fillStyle = col; g.font = `${wgt} ${size}px RobotoCondensed`; g.textAlign = 'left'; g.fillText(text, X0 + 4, y); };
  const rowIn = (i) => clamp((since - 0.12 - i * 0.14) / 0.22);
  if (ns === 0) { banner(UI.navGo, '#1f4fb0', '#ffffff', (x, y) => { g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x, y + 17); g.lineTo(x, y - 15); g.moveTo(x - 13, y - 2); g.lineTo(x, y - 16); g.lineTo(x + 13, y - 2); g.stroke(); });
    row(UI.navGoSub, 148, '#8fa3cc', 32); g.fillStyle = '#5d6f96'; g.font = '600 30px RobotoCondensed'; g.textAlign = 'right'; g.fillText('21:47', 780 - 26, 292); }
  else if (ns === 1) { const pulse = 0.82 + 0.18 * Math.sin(since * 9); banner(UI.navClosed, `rgba(240,2,127,${pulse})`, '#ffffff', (x, y) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x + 21, y + 17); g.lineTo(x - 21, y + 17); g.closePath(); g.fill(); g.fillStyle = MAG; g.font = '800 30px RobotoCondensed'; g.textAlign = 'center'; g.fillText('!', x, y + 4); });
    g.globalAlpha = rowIn(0); row(UI.navReason, 150, '#ffffff', 40, 700); g.globalAlpha = rowIn(1); row(UI.navWhere, 214, '#8fa3cc', 31); g.globalAlpha = 1; }
  else if (ns === 2) { banner(UI.navEx, '#f2b83a', '#141414', (x, y) => { g.fillStyle = '#141414'; jetIcon(g, x, y, 1.55); });
    g.globalAlpha = rowIn(0); row(UI.navEx1, 150, '#ffffff', 36, 700); g.globalAlpha = rowIn(1); row(UI.navEx2, 208, '#dfe7fa', 33); g.globalAlpha = rowIn(2); row(UI.navWhere, 266, '#8fa3cc', 30); g.globalAlpha = 1; }
  else if (ns === 3) {   // the list: three allies in the air, then Finland's own
    g.globalAlpha = inK; g.fillStyle = '#8fa3cc'; g.font = '700 30px RobotoCondensed'; g.textAlign = 'left'; g.fillText(UI.navAlso, X0 + 4, 38); g.textAlign = 'right'; g.fillStyle = '#5d6f96'; g.font = '600 24px RobotoCondensed'; g.fillText(UI.navSrc, 780 - 24, 38); g.globalAlpha = 1;
    const rows = [['nl', UI.navNL, EV.nl], ['fr', UI.navFR, EV.fr], ['se', UI.navSE, EV.se], ['fi', UI.navFI, EV.fi]], f35 = t >= T.s4;
    rows.forEach(([fl, text, at], i) => { const k = ease.out((t - at) / 0.25); if (k <= 0) return; const y = 66 + i * 64, own = fl === 'fi', dim = f35 && !own ? 0.42 : 1;
      g.save(); g.globalAlpha = k * dim; g.translate((1 - k) * 26, 0); g.fillStyle = own ? 'rgba(240,2,127,.16)' : 'rgba(255,255,255,.055)'; g.beginPath(); g.roundRect(X0, y, PW, 56, 10); g.fill(); if (own) { g.strokeStyle = MAG; g.lineWidth = 2.5; g.stroke(); }
      g.save(); g.beginPath(); g.roundRect(X0 + 12, y + 12, 50, 32, 4); g.clip(); FLAGS[fl](g, X0 + 12, y + 12, 50, 32); g.restore(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(X0 + 12, y + 12, 50, 32, 4); g.stroke();
      g.fillStyle = '#ffffff'; g.font = '600 32px RobotoCondensed'; g.textAlign = 'left'; g.fillText(text, X0 + 76, y + 30);
      const chip = own ? UI.navNot : UI.navFlying; g.font = '700 23px RobotoCondensed'; const cw = g.measureText(chip).width + 22; g.fillStyle = own ? MAG : '#1f8f4e'; g.beginPath(); g.roundRect(X0 + PW - cw - 10, y + 12, cw, 32, 16); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(chip, X0 + PW - cw / 2 - 10, y + 29); g.restore(); }); }
  else if (ns === 4) { banner(UI.navRecalc, '#27344f', '#dfe7fa', (x, y) => { g.strokeStyle = '#dfe7fa'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, 16, since * 9, since * 9 + 4.4); g.stroke(); });
    g.globalAlpha = rowIn(0) * (0.6 + 0.4 * Math.sin(since * 14)); row(UI.navDelay, 150, '#8fa3cc', 34); g.globalAlpha = 1; }
  else { banner(UI.navRunway, '#f2b83a', '#141414', (x, y) => { g.fillStyle = '#141414'; jetIcon(g, x, y, 1.55); });
    g.globalAlpha = rowIn(0); row(UI.navDelay, 150, '#ffffff', 37, 700); g.globalAlpha = rowIn(1); row(UI.navUntil, 210, '#8fa3cc', 31); g.globalAlpha = 1; }
  // a flash across the screen when its message changes, and the glass over it
  if (ns > 0 && since < 0.22) { g.fillStyle = `rgba(255,255,255,${0.26 * (1 - since / 0.22)})`; g.fillRect(0, 0, 780, 330); }
  const gl = g.createLinearGradient(0, 0, 780, 330); gl.addColorStop(0, 'rgba(255,255,255,.07)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.16)'); g.fillStyle = gl; g.fillRect(0, 0, 780, 330);
  g.restore();
  g.save(); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.beginPath(); g.roundRect(R.x, R.y, R.w, R.h, 18 * R.w / 780); g.stroke(); g.restore();
}

// the windscreen: the veil of glare a bright lamp throws across the glass, and the wipers' arcs it shows up
const SMEAR = canvasOf(W / 2, H / 2, (g) => { const w = W / 2, h = H / 2; g.lineCap = 'round'; const R = rng(8); for (let i = 0; i < 150; i++) { const r = 120 + R() * 520, a0 = -2.5 + R() * 1.7; g.strokeStyle = `rgba(255,255,255,${0.02 + R() * 0.05})`; g.lineWidth = 1 + R() * 2.4; g.beginPath(); g.arc(w * 0.5 + (R() - 0.5) * 120, h * 0.71, r, a0, a0 + 0.2 + R() * 0.6); g.stroke(); } });
function glass(g, t, lampUV, lampK, GY) {
  g.save(); g.beginPath(); g.rect(0, 0, W, GY); g.clip();
  if (lampK > 0.02 && lampUV) { const x = lampUV[0] * W, y = (1 - lampUV[1]) * H, gr = g.createRadialGradient(x, y, 0, x, y, 900); gr.addColorStop(0, `rgba(255,250,235,${0.5 * lampK})`); gr.addColorStop(0.25, `rgba(220,232,255,${0.2 * lampK})`); gr.addColorStop(1, 'rgba(160,190,255,0)');
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, W, GY); g.globalAlpha = clamp(lampK * 1.6); g.drawImage(SMEAR, 0, 0, W, H); }
  g.restore();
}

// ------------------------------------------------------------------ the frame
const SH = 0.6 / FPS, _l = new THREE.Vector3();
function frame(t, captions = true, kForce = 0) {
  const st0 = pose(t), moving = st0.v > 0.4 || (st0.a.on && (t < EV.touch + 0.6 || t > EV.pass2 - 2.0)) || (t > EV.pass2 && t < EV.pass2 + 2.6);
  const close = st0.a.on && Math.hypot(st0.a.z - st0.z, st0.a.y - EYE) < 70 && ((t > EV.pass1 - 0.2 && t < EV.pass1 + 1.0) || (t > EV.pass2 - 1.1 && t < EV.pass2 + 0.2));
  const K = kForce || Number(Q.get('subs') || 0) || (close ? 16 : moving ? 6 : 3);
  // what the post needs to know about the brightest lamp in shot
  let rays = null, lampUV = null, lampK = 0;
  if (st0.a.on) { J.updateMatrixWorld(true); const facing = Math.cos(st0.a.yaw) > 0.5, p = J.localToWorld(_l.set(0, facing ? -1.2 : -0.08, facing ? 4.5 : -7.6)), s = toScreen(cam, p); cam.getWorldPosition(_cp);
    const d = p.distanceTo(_cp); if (s && s[0] > -200 && s[0] < W + 200 && s[1] > -300 && s[1] < H) { lampUV = uvOf(s); if (facing) { lampK = clamp(1.25 - d / 300) * smooth((t - (EV.pass2 - 2.4)) / 2.0); rays = { c: lampUV, k: 0.1 + 0.5 * lampK, r: 0.2 + 0.22 * lampK, cut: 3.2 }; } else rays = { c: lampUV, k: 0.3 * clamp(1.4 - d / 120), r: 0.2, cut: 3.5 }; } }
  if (t > EV.pass2 - 0.25) lampK = Math.max(lampK, 0) * clamp(1 - (t - EV.pass2 + 0.25) / 0.3);
  const u = SNOW.U;
  shoot(S, cam, { K, t, seed: Math.floor(t * 24), rays, grade: { exposure: 1.2, streak: 0.12 + 0.24 * lampK, streakThreshold: 6.5, bloomA: 0.5, bloomB: 0.4 },
    update(j) { const ts = t + ((j + 0.5) / K - 0.5) * SH, s = pose(ts); u.uGain.value = Math.sqrt(K); u.uShift.value.set(u.uVel.value.x, u.uVel.value.y, u.uVel.value.z + s.v + s.gustV).multiplyScalar(SH / K * (K > 1 ? 1.6 : 1)); } });
  const st = pose(t); cam.updateMatrixWorld(true);
  const g = g2d; g.setTransform(1, 0, 0, 1, 0, 0);
  // the jet's wash throws the road's snow at the glass
  const wash = Math.max(0, t - EV.pass2 - 0.15), wk = clamp(wash / 0.25) * Math.exp(-wash * 1.5); const cowl = toScreen(cam, CAB.localToWorld(_v.set(0, -0.23, -1.245))), GY = cowl ? cowl[1] : 1255;
  if (wk > 0.01) { g.save(); const gr = g.createLinearGradient(0, 400, 0, GY); gr.addColorStop(0, `rgba(190,205,235,${0.3 * wk})`); gr.addColorStop(1, `rgba(214,226,250,${0.85 * wk})`); g.fillStyle = gr; g.fillRect(0, 0, W, GY); g.restore(); }
  glass(g, t, lampUV, lampK, GY);
  // the sat-nav's screen, where its glass is in this frame
  NAV.updateMatrixWorld(true); const pc = NAVC.map((c) => toScreen(cam, NAV.localToWorld(_v.copy(c))));
  if (pc.every(Boolean)) { const R = { x: (pc[0][0] + pc[2][0]) / 2, y: (pc[0][1] + pc[1][1]) / 2 }; R.w = (pc[1][0] + pc[3][0]) / 2 - R.x; R.h = (pc[2][1] + pc[3][1]) / 2 - R.y; navUI(g, t, R, st); frame.R = R; }
  CAP.bug(g);
  if (captions) CAP.draw(g, P, t, { busy: BUSY || {} });
  return out;
}
let BUSY = null; frame(1.0, false, 1);
if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false, 1), 3);
const LOOKS = [{ name: '1-drive', t: 0.6 }, { name: '2-give-way', t: EV.jets + 0.5 }, { name: '3-over-the-roof', t: EV.pass1 + 0.42 }, { name: '4-landing', t: EV.chime2 + 1.6 }, { name: '5-allies', t: EV.se + 0.5 }, { name: '6-f35', t: popT('f35') + 0.5 }, { name: '7-take-off', t: EV.pass2 - 0.9 }, { name: '8-runway', t: EV.runway + 0.7 }];
const cues = ['alert', 'pass1', 'touch', 'stop', 'chime2', 's3', 'nl', 'fr', 'se', 'chime4', 'fi', 'pass2', 'recalc', 'runway'];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, cueNames: cues, v0: V0, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }), look: 'night kit · the dashboard', nav: frame.R || null },
  looks: LOOKS.map((l) => ({ name: l.name, t: +l.t.toFixed(2) })), look(i) { return frame(LOOKS[i].t).toDataURL('image/png'); },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
