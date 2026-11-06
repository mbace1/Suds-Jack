// WE ARE AWARE (RFH, Google · Muhos emails), v1 stills, 6–7 Nov. The first film in the ROOM kit (looks/room/kit.js;
// plan/3D-LOOKS.md, owner 6 Nov: "make other 3d than trucks"): Cut First's toy world and grade, moved indoors.
// A cut-away site office stands on the Muhos clearing; through its window, the last three spruces.
//   1 · outside, 3/4 high: the open-fronted cabin among the stumps, a lamp on, the laptop glowing      "emails"
//   2 · on the laptop: an email from LVV slides in and opens (sender and subject only; the body is bars) "assessment"
//   3 · closer: the reply types itself in Finnish, the documented words only; ":(" lands on the pop    "aware :("
//   4 · over the laptop, through the window: the three last trees come down one after another         "first"
//   5 · out of the room and up over the whole clearing at dusk, the cabin's lamp the only warm light    "cut anyway"
// No people; the sender is never named; Google in plain type, no logo. 1080×1920, 30 fps. film.html?lang=en

import * as THREE from 'three';
import * as CAP from '../../pipeline/text/captions.js';
import { toyWorld, cabin, clamp, lerp, smooth, ease, V, lerp3, TAU } from '../../looks/room/kit.js';

const W = 1080, H = 1920, FPS = 30;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['Anton-400', 'Anton-400.woff'], ['NotoSansJP-800', 'NotoSansJP-800.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, fam === 'Inter' ? { weight: '100 900' } : {}); document.fonts.add(await f.load()); }

const Wd = toyWorld({ W, H }), { scene, camera, post, renderer } = Wd;
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

// ------------------------------------------------------------------ copy and beats
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.4], ['s3', 8.8], ['s4', 13.2], ['s5', 17.6], ['end', 22.4]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.5 }), T = P.T, DUR = T.end, UI = P.ui;
const capAware = P.captions.find((c) => c.id === 'aware'), POP = capAware.words.find((w) => w.pop).t;   // ":(" lands here

// ------------------------------------------------------------------ the place: the clearing round the cabin, the forest beyond
const FALL = [[-4.0, -13.5, 1], [0.6, -16.5, -1], [-2.0, -20.0, 1]];   // the three last spruces behind the window: x, z, which way they fall
Wd.clearing({ x0: -95, x1: 95, z0: 40, z1: -110, n: 700, seed: 7,
  keep: (x, z) => !(x > -10 && x < 10 && z > -10 && z < 3) && !FALL.some(([fx, fz]) => Math.hypot(x - fx, z - fz) < 3) && !(Math.abs(x - 2) < 4 && z > 3 && z < 40) });
Wd.forest({ x0: -95, x1: 95, z0: 40, z1: -110, seed: 31 });
// a log pile on the right, what the clearing became
{ const logGeo = new THREE.CylinderGeometry(0.42, 0.42, 7, 10).rotateZ(Math.PI / 2), endGeo = new THREE.CircleGeometry(0.39, 10).rotateY(Math.PI / 2);
  for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) { const z = -14 + (i - (3 - row) / 2) * 0.86, y = 0.42 + row * 0.74, x = 16;
    Wd.mesh(logGeo, Wd.M.bark, { pos: [x, y, z] }); Wd.mesh(endGeo, Wd.M.logEnd, { pos: [x + 3.51, y, z], cast: false }); Wd.mesh(endGeo, Wd.M.logEnd, { pos: [x - 3.51, y, z], rot: [0, Math.PI, 0], cast: false }); } }
const TREES = FALL.map(([x, z], i) => Wd.fallingSpruce(x, z, 1.25 + i * 0.08));
const DUST = FALL.map(([x, z, s], i) => Wd.puffs(x, z, 8, 100 + i * 20, [-s, 0]));

// ------------------------------------------------------------------ the room
const R = cabin(Wd, { w: 14, d: 7, h: 5.2 });
R.G.position.set(0, 0, 0);
const SW = R.screenW, SH = R.screenH, sg = R.screenTex.userData.g;

// the sign outside and the board inside
{ const g = R.signTex.userData.g; g.fillStyle = '#2f5d8c'; g.fillRect(0, 0, 900, 200); g.fillStyle = '#f6f3ea'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '120px Anton-400'; g.fillText(UI.sign, 450, 106); R.signTex.needsUpdate = true; }
{ const g = R.boardTex.userData.g, w = 1024, h = 720; g.fillStyle = '#f6f1e2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2b2a28'; g.font = '800 54px Inter'; g.textAlign = 'left'; g.fillText(UI.board, 50, 86);
  g.strokeStyle = '#3f7a55'; g.lineWidth = 10; g.fillStyle = 'rgba(180,139,102,.45)';
  g.beginPath(); g.moveTo(120, 220); g.lineTo(640, 170); g.lineTo(900, 300); g.lineTo(860, 620); g.lineTo(300, 650); g.lineTo(150, 470); g.closePath(); g.fill(); g.stroke();
  for (const [x, y] of [[300, 300], [520, 420], [720, 360], [600, 560]]) { g.fillStyle = '#d0453a'; g.beginPath(); g.arc(x, y, 22, 0, TAU); g.fill(); }
  R.boardTex.needsUpdate = true; }

// ------------------------------------------------------------------ the screen: an email client, painted every frame
const INK = '#1f2328', MUTE = '#9aa1ab', BAR = '#e3e6ea', ACC = '#2f5d8c', HI = '#fff3c4';
const rr = (x, y, w, h, r, fill) => { sg.fillStyle = fill; sg.beginPath(); sg.roundRect(x, y, w, h, r); sg.fill(); };
const bars = (x, y, n, w, gap = 30, seed = 1) => { for (let i = 0; i < n; i++) rr(x, y + i * gap, w * (0.62 + 0.38 * Math.abs(Math.sin(seed * 7 + i * 2.3))), 12, 6, BAR); };
const fitText = (txt, fs, maxW, weight = 800) => { sg.font = `${weight} ${fs}px Inter`; while (sg.measureText(txt).width > maxW && fs > 18) { fs -= 2; sg.font = `${weight} ${fs}px Inter`; } return fs; };
function chrome(title) {
  sg.fillStyle = '#f7f8fa'; sg.fillRect(0, 0, SW, SH);
  sg.fillStyle = ACC; sg.fillRect(0, 0, SW, 70);
  sg.fillStyle = '#ffffff'; sg.font = '800 36px Inter'; sg.textAlign = 'left'; sg.textBaseline = 'middle'; sg.fillText(title, 36, 37);
  for (let k = 0; k < 3; k++) { sg.fillStyle = 'rgba(255,255,255,.45)'; sg.beginPath(); sg.arc(SW - 50 - k * 34, 36, 10, 0, TAU); sg.fill(); }
}
/** type `txt` from time a to b: how much of it is on screen at t */
const typed = (txt, t, a, b) => txt.slice(0, Math.round(txt.length * clamp((t - a) / (b - a))));
const EV = { lvvIn: T.s2 + 0.45, lvvOpen: T.s2 + 2.0, type1: T.s3 + 0.35, frown: POP, type2: POP + 0.35, sendT: T.s4 - 0.55,
  fall0: T.s4 + 0.55, fall1: T.s4 + 1.35, fall2: T.s4 + 2.15, rise: T.s5 + 1.2 };
const LAND = 0.95;                                       // a tree's fall, from the first lean to the ground
function paintScreen(t) {
  sg.save();
  if (t < EV.lvvOpen) {
    chrome(UI.inbox);
    const k = ease.out((t - EV.lvvIn) / 0.4), slide = t >= EV.lvvIn ? 1 : 0;
    const y0 = 100 + 150 * (slide ? k : 0);
    for (let i = 0; i < 3; i++) { const y = y0 + i * 150; rr(30, y, SW - 60, 128, 14, '#ffffff'); sg.fillStyle = '#d9dde3'; sg.beginPath(); sg.arc(90, y + 64, 34, 0, TAU); sg.fill(); bars(150, y + 38, 2, 560, 40, i + 3); }
    if (slide) { const y = 100 - 150 * (1 - k); rr(30, y, SW - 60, 128, 14, HI); sg.strokeStyle = '#e7b736'; sg.lineWidth = 4; sg.beginPath(); sg.roundRect(30, y, SW - 60, 128, 14); sg.stroke();
      sg.fillStyle = ACC; sg.beginPath(); sg.arc(90, y + 64, 34, 0, TAU); sg.fill(); sg.fillStyle = '#fff'; sg.font = '800 26px Inter'; sg.textAlign = 'center'; sg.fillText('LVV', 90, y + 65);
      sg.textAlign = 'left'; sg.fillStyle = INK; fitText(UI.lvvFrom, 40, SW - 220); sg.fillText(UI.lvvFrom, 150, y + 44);
      sg.fillStyle = '#5a6270'; sg.font = '700 34px Inter'; sg.fillText(UI.lvvSubj, 150, y + 92);
      const b = Math.min(1, (t - EV.lvvIn) / 0.25); sg.fillStyle = `rgba(208,69,58,${b})`; sg.beginPath(); sg.arc(SW - 70, y + 64, 14, 0, TAU); sg.fill(); }
  } else if (t < T.s3) {
    chrome(UI.lvvSubj);
    sg.fillStyle = ACC; sg.beginPath(); sg.arc(86, 140, 40, 0, TAU); sg.fill(); sg.fillStyle = '#fff'; sg.font = '800 28px Inter'; sg.textAlign = 'center'; sg.fillText('LVV', 86, 141);
    sg.textAlign = 'left'; sg.fillStyle = INK; fitText(UI.lvvFrom, 42, SW - 200); sg.fillText(UI.lvvFrom, 150, 122);
    sg.fillStyle = '#5a6270'; sg.font = '700 34px Inter'; sg.fillText(UI.lvvSubj, 150, 170);
    sg.fillStyle = '#e3e6ea'; sg.fillRect(36, 214, SW - 72, 3);
    bars(40, 254, 9, SW - 120, 36, 11);                                    // the body: its wording is not known, so it is bars
  } else {
    chrome(UI.replySubj);
    sg.textAlign = 'left'; sg.fillStyle = '#5a6270'; sg.font = '700 30px Inter'; sg.fillText(UI.replyTo, 40, 112); sg.fillText(UI.replyFrom, 40, 152);
    sg.fillStyle = '#e3e6ea'; sg.fillRect(36, 180, SW - 72, 3);
    // the reply: line one types up to the frown, which lands on the caption's pop; line two follows
    const l1 = UI.reply1, cut = l1.lastIndexOf(':(');
    const head = typed(l1.slice(0, cut), t, EV.type1, EV.frown - 0.12), frown = t >= EV.frown;
    sg.fillStyle = INK; const fs1 = fitText(l1, 64, SW - 90); sg.fillText(head, 40, 262);
    if (frown) { const k = (t - EV.frown) / 0.45, s = 1 + 0.6 * Math.exp(-k * 5) * Math.cos(k * 14), x = 40 + sg.measureText(l1.slice(0, cut)).width;
      sg.save(); sg.translate(x + 30, 262); sg.scale(s, s); sg.fillStyle = '#d0453a'; sg.font = `800 ${fs1}px Inter`; sg.fillText(':(', -30, 0); sg.restore(); }
    const l2 = typed(UI.reply2, t, EV.type2, EV.type2 + 1.6);
    sg.fillStyle = INK; sg.font = '700 44px Inter';
    const words = l2.split(' '); let line = '', y = 350;                    // wrap line two
    for (const w of words) { const test = line ? line + ' ' + w : w; if (sg.measureText(test).width > SW - 90 && line) { sg.fillText(line, 40, y); line = w; y += 58; } else line = test; }
    sg.fillText(line, 40, y);
    const blink = Math.floor(t * 2.4) % 2 === 0 && t < EV.sendT;
    if (blink) { const cx = 40 + sg.measureText(line).width + 6; sg.fillStyle = ACC; sg.fillRect(cx, y - 38, 5, 46); }
    // send, then sent
    const sent = t >= EV.sendT, pk = clamp((t - EV.sendT) / 0.18);
    rr(SW - 230, SH - 110, 190, 74, 37, sent ? '#3f7a55' : ACC);
    sg.fillStyle = '#fff'; sg.font = '800 34px Inter'; sg.textAlign = 'center'; sg.fillText(sent ? UI.sent + ' ✓' : UI.send, SW - 135, SH - 72 + (pk > 0 && pk < 1 ? 3 : 0));
  }
  sg.restore(); R.screenTex.needsUpdate = true;
}

// ------------------------------------------------------------------ the world over time
const DUSK = (t) => t < T.s4 ? 0 : t < T.s5 ? lerp(0, 0.3, (t - T.s4) / (T.s5 - T.s4)) : lerp(0.3, 1, smooth((t - T.s5 - 0.8) / (T.end - T.s5 - 1.4)));
function setWorld(t) {
  const d = DUSK(t); Wd.dusk(d);
  R.lampL.intensity = lerp(10, 26, d); R.bulbMat.emissiveIntensity = lerp(2.0, 4.0, d); R.glow.intensity = lerp(3, 9, d);
  // the three last trees: each leans, then gravity; a little rebound; dust where the crown lands
  [EV.fall0, EV.fall1, EV.fall2].forEach((t0, i) => { const k = clamp((t - t0) / LAND), s = FALL[i][2];
    const bounce = t > t0 + LAND ? Math.exp(-6 * (t - t0 - LAND)) * Math.sin((t - t0 - LAND) * 18) * 0.05 : 0;
    TREES[i].rotation.z = s * ((Math.PI / 2 - 0.06) * k * k * k + bounce); DUST[i].at(t, t0 + LAND); });
  paintScreen(t);
}

// ------------------------------------------------------------------ the five shots
const S = R.screenWorld();                               // the screen's centre in the world
const SHOT = [
  { t0: () => T.s1, wide: false, band: 0.62, focus: () => V([-1, 3, -5]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([13, 10.5, 25], [10.5, 8.6, 19.5], k)), at: V(lerp3([-1.2, 3.4, -5.5], [-1.2, 3.3, -5.5], k)), fov: 38 }; } },
  { t0: () => T.s2, wide: false, band: 0.9, focus: () => S,
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([S.x + 0.5, S.y + 2.4, S.z + 11.5], [S.x + 0.3, S.y + 1.6, S.z + 10.0], k)), at: V(lerp3([S.x, S.y - 0.35, S.z], [S.x, S.y - 0.3, S.z], k)), fov: 32 }; } },
  { t0: () => T.s3, wide: false, band: 0.9, focus: () => S,
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([S.x + 0.2, S.y + 1.2, S.z + 9.4], [S.x, S.y + 0.9, S.z + 8.4], k)), at: V(lerp3([S.x, S.y - 0.25, S.z], [S.x, S.y - 0.2, S.z], k)), fov: 32 }; } },
  { t0: () => T.s4, wide: false, band: 0.95, focus: () => V([-1.5, 4, -15]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([-0.6, 6.4, 3.2], [-0.8, 6.0, 1.8], k)), at: V(lerp3([-1.2, 3.6, -16], [-1.2, 3.7, -16], k)), fov: 42 }; } },
  { t0: () => T.s5, wide: true, band: 0.55, focus: (t) => V(lerp3([-1, 3, -5], [-1, 0, -12], smooth((t - T.s5 - 1.2) / 2.5))),
    cam(lt, d) { const k = ease.io((lt - 0.9) / (d - 1.1)); return { pos: V(lerp3([4, 7.5, 16], [16, 42, 48], k)), at: V(lerp3([-1.2, 3.2, -5], [-2, 0, -18], k)), fov: lerp(36, 40, k) }; } },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end;

/** a tag, bottom left: dark ink on bone, clear of the right-hand rail (as Cut First) */
function tag(g, text, a) {
  if (a <= 0 || !text) return;
  g.save(); g.globalAlpha = a; g.font = '800 30px Inter';
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(30 * maxW / w)}px Inter`; w = g.measureText(text).width; }
  const x = 110, y = 1520; g.fillStyle = 'rgba(236,230,214,.94)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.fillStyle = '#1e1c1a'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 32); g.restore();
}

const tmp = new THREE.Vector3();
function frame(t, captions = true) {
  setWorld(t);
  const i = shotAt(t), Sh = SHOT[i], t0 = Sh.t0(), d = SHOT_END(i) - t0;
  if (Sh.wide) Wd.shadowsAt([-2, 0, -12], 90, [-30, 40, -40]); else Wd.shadowsAt([-1, 0, -6], 22, [-26, 34, -30]);
  const L = Sh.cam(t - t0, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  tmp.copy(Sh.focus(t)).project(camera); const cy = clamp((tmp.y + 1) / 2, 0.15, 0.85);
  const dk = DUSK(t);
  post.render(scene, camera, { focus: 60, aperture: 0, maxBlur: 26, tilt: 10, tiltCenter: cy, tiltBand: Sh.band,
    threshold: 0.95, knee: 0.45, bloomA: 0.4, bloomB: 0.35, exposure: lerp(1.04, 1.0, dk), vignette: 0.3, grain: 0.022, seed: Math.floor(t * 24),
    sat: 1.16, contrast: 1.06, toe: 0.0, lift: [0.012, 0.008, 0.034], gain: [1.03, 1.0, 0.97] });
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.drawImage(renderer.domElement, 0, 0);
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  tag(g2d, UI.tag1, tg(T.s1 + 1.2, T.s2 - 0.1));
  tag(g2d, UI.tag2, tg(T.s2 + 1.6, T.s3 - 0.1));
  tag(g2d, UI.tag3, tg(T.s3 + 0.5, T.s4 - 0.1));
  tag(g2d, UI.tag4, tg(T.s4 + 1.2, T.s5 - 0.1));
  tag(g2d, UI.tag5, tg(T.s5 + 1.4, T.end + 1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
frame(0, false); frame(T.s4 + 1, false);   // warm-up (shaders, both shadow frusta) before the busy measure
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
