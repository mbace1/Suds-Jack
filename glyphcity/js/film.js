// GLYPH CITY — the concept film. 12 s: a courier runs the main street of neo-Helsinki in the rain, the street's neon
// written into the grid as words, the billboard blinking the Toko face; the camera lifts off the street and the title
// types itself. Every frame is a pure function of t. film.html?w=1920&h=1080 (default), or ?w=1080&h=1920 for vertical.

import * as THREE from 'three';
import { Ascii } from './ascii.js';
import { buildCity, isoCamera, aim, STREET, RUNZ, INK, rng } from './city.js';

const Q = new URLSearchParams(location.search), W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080), FPS = 30, DUR = 12;
{ const f = new FontFace('GC Mono', 'url(fonts/DejaVuSansMono-Bold.ttf)'); document.fonts.add(await f.load()); }
await document.fonts.load("bold 16px 'IPAGothic'").catch(() => {});
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); document.body.appendChild(renderer.domElement);
const A = new Ascii(renderer, W, H, { cw: 10, ch: 18, scale: 0.5 });
const city = buildCity(7), cam = isoCamera(W / H);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const type = (s, t0, t, cps = 38) => s.slice(0, Math.max(0, Math.floor((t - t0) * cps)));
const cursor = (t) => (Math.floor(t * 3) % 2 ? '█' : ' ');

/** the HUD is glyphs too: typed into the same grid as the city */
function hud(t, quiet) {
  const l1 = type('> NEO-HELSINKI 2087 // KALLIO SECTOR // RAIN 94%', 0.3, t), l2 = type('> COURIER 07 EN ROUTE · PACKET 3/5 · CRED 1240', 1.5, t);
  A.put(3, 2, l1 + (l2 ? '' : cursor(t)), INK.cyan); if (l2) A.put(3, 3, l2 + cursor(t), INK.cyan);
  if (!quiet) { const s = Math.floor(t * 30) % 60; A.put(A.cols - 14, 2, `02:47:${String(s).padStart(2, '0')}`, INK.amber); A.put(A.cols - 14, 3, '▓▓▓▓▓▓▒░ 82%', INK.lime); }
}
function title(t) {
  const n = Math.floor((t - 9.0) * 12); if (n <= 0) return;
  const T = 'GLYPH CITY', w = Math.min(A.cols - 8, 96), h = 10, c0 = Math.floor((A.cols - w) / 2), r0 = Math.floor(A.rows / 2) - 7;
  A.fill(c0 - 2, r0 - 1, w + 4, h + 6);                                                  // a dark plate under it, so no sign shows through
  A.stamp(c0, r0, w, h, (g, cw, chh) => {
    let fs = chh * 0.95; g.font = `bold ${fs}px 'GC Mono'`; const tw = g.measureText(T).width; if (tw > cw * 0.96) { fs *= cw * 0.96 / tw; g.font = `bold ${fs}px 'GC Mono'`; }
    const adv = g.measureText(T).width / T.length, x0 = (cw - adv * T.length) / 2; g.textBaseline = 'middle';
    for (let i = 0; i < Math.min(n, T.length); i++) g.fillText(T[i], x0 + i * adv, chh * 0.52);
  }, INK.magenta, ' ░▒▓█', 4);
  const sub = type('A CYBERPUNK CITY DRAWN ENTIRELY IN TEXT', 10.0, t, 44), by = type('TOKO MIDORI GAMES · GAME CONCEPT', 10.9, t, 44);
  A.put(Math.floor((A.cols - 39) / 2), r0 + h + 1, sub, INK.cyan); A.put(Math.floor((A.cols - 32) / 2), r0 + h + 3, by, INK.white);
}
const KANA = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';
const runX = (t) => -64 + 8.8 * t - (t > 4.6 ? Math.min(t - 4.6, 1.1) * 8.8 : 0);     // he stops at the terminal for a beat
/** the game beat: at the terminal, a prompt; he jacks in and the grid round him decodes — kana ripple out and settle */
function jack(t, cell) {
  const [c, r] = cell, k = (t - 4.75) / 0.9;
  if (t > 4.4 && t < 4.95) A.put(c + 3, r - 7, '[E] JACK IN', INK.amber);
  if (k > 0 && k < 1) { const R = 2 + k * 26, R2 = 2 + k * 22, g = rng(Math.floor(t * 30));
    for (let a = 0; a < 140; a++) { const th = a / 140 * Math.PI * 2, rr = lerp(R2, R, g());
      A.put(Math.round(c + Math.cos(th) * rr * 1.8), Math.round(r - 3 + Math.sin(th) * rr), KANA[(g() * KANA.length) | 0], k < 0.5 ? INK.cyan : INK.lime); } }
  if (t > 5.2 && t < 7.2) A.put(c + 4, r - 9 - Math.floor((t - 5.2) * 3), '+240 CRED  PACKET 4/5', INK.lime);
}
function trail(t) {                                                                    // where he was: a smear of dots in his colour
  for (let i = 1; i <= 6; i++) { const tt = t - i * 0.06; if (tt < 0) continue; const [c, r] = A.cell(new THREE.Vector3(runX(tt), 5, RUNZ), cam);
    A.put(c - 1, r, i < 3 ? '=' : '·', i < 3 ? INK.magenta : '#7a2a66'); A.put(c - 1, r + 2, '·', '#7a2a66'); }
}
function draw(t) {
  const x = runX(t), k = ease((t - 7.2) / 3.4), run = t > 4.6 && t < 5.7 ? 0 : 1;
  city.update(t); city.pose(x, RUNZ, t, run, 0);
  aim(cam, new THREE.Vector3(lerp(x + 5, x + 24, k), lerp(5, 36, k), lerp(RUNZ - 1, -16, k)), lerp(50, 250, k));
  city.scene.updateMatrixWorld(true);
  A.clear(); city.write(A, cam, t); if (run && t < 7.6) trail(t);
  if (t < 7.8) { const [c, r] = A.cell(new THREE.Vector3(x, 14, RUNZ), cam); A.put(c - 1, r - 1, '07', INK.magenta); A.put(c, r, '▼', INK.magenta); }   /* the player marker */ jack(t, A.cell(new THREE.Vector3(x, 6, RUNZ), cam)); hud(t, t > 9); title(t);
  A.render(city.scene, cam, { raw: Q.has('raw'), time: t, fade: clamp(t / 0.5) * clamp((DUR - t) / 0.45), rain: 0.2 });
}
window.__film = { fps: FPS, frames: DUR * FPS, events: { end: DUR }, report: {},
  frame(i, q = 0.92) { draw(i / FPS); return renderer.domElement.toDataURL('image/jpeg', q); },
  still(t) { draw(t); return renderer.domElement.toDataURL('image/png'); } };
window.__ready = true;
