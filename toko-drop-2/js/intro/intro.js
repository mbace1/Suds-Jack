// intro/intro.js — the start intro, played in the engine and handed straight
// to the run (owner, 2026-10-22):
//
//   the magenta Toko Midori Games lockup on black, face on the left, the words
//   on one line → MIDORI fades → the camera pushes in and "drop" appears under
//   Toko, lower case → in on the foot of the p, where a whitish drop gathers
//   and lets go → the camera follows it down and swings to looking straight
//   down as it lands → the blue grid runs out of the drop → it opens its eyes
//   → the camera pulls out to the game's own view, the HUD comes in, and the
//   run starts.
//
// Everything is a pure function of the intro's time `t` (frame(t)), so the
// live game, a skip to the end and the frame-by-frame capture of the review
// film all draw the same thing. The drop IS the hero: the same mesh, the same
// white satin gel, standing on the spawn point the run starts from.
//
// The face and the letters are the brand's own (master.js and wordmark.js,
// vendored here from toko/js/): the traced master face, and the logotype's
// drawn letterforms. "drop" needs a p the logotype never had; it is built
// here from the same parts as the logotype's d (a flat-sided bowl, one stem
// weight), mirrored, with the stem run down below the baseline.
import * as THREE from 'three/webgpu';
import { fillMaster, masterBounds } from './master.js?v=17';
import { GLYPHS, M } from './wordmark.js?v=17';
import { CUES } from './sfx.js?v=17';

export { CUES };

const MAGENTA = '#f0027f';            // TOKO.MAGENTA — the original colour
const U = 0.03;                       // world units per logotype unit (cap height 100 → 3)
const YTIP = 7.5;                     // the foot of the p, above the spawn point
const DESC = 28;                      // the p's descender, in logotype units
const XT = M.cap - M.x;               // top of a lowercase letter
const GL = {
  ...GLYPHS,
  p: { w: 56, s: [{ rr: [0, XT, 56, M.x, M.bowl] }, { r: [0, XT, M.stem, M.x + DESC] }], h: [{ rr: [M.stem, XT + M.stem, 16, 34, 2] }] },
};

// ── the layout, in logotype units (y down; line 1's cap box is 0..100) ──
const LINE2 = 106;                                     // "drop" stands one line below "Toko"
const LETTERS = [['d', 0], ['r', 62], ['o', 106], ['p', 168]];
const TIP = { x: 168 + M.stem / 2, y: LINE2 + M.cap + DESC };   // the foot of the p's stem
const FACE_H = 125, GAP = FACE_H * 0.14;
const wx = (gx) => (gx - TIP.x) * U;
const wy = (gy) => YTIP + (TIP.y - gy) * U;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (k) => k * k * (3 - 2 * k);
const inOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const outCubic = (k) => 1 - Math.pow(1 - k, 3);
const outBack = (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const lerp = (a, b, k) => a + (b - a) * k;

// ── drawing the letters ─────────────────────────────────────────────────
function rrect(c, x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  c.moveTo(x + k, y); c.lineTo(x + w - k, y); c.quadraticCurveTo(x + w, y, x + w, y + k);
  c.lineTo(x + w, y + h - k); c.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  c.lineTo(x + k, y + h); c.quadraticCurveTo(x, y + h, x, y + h - k);
  c.lineTo(x, y + k); c.quadraticCurveTo(x, y, x + k, y); c.closePath();
}
function shape(c, sh) {
  if (sh.r) c.rect(...sh.r);
  else if (sh.rr) rrect(c, ...sh.rr);
  else if (sh.p) { sh.p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
}
function textWidth(text) {
  let w = 0;
  for (const ch of text) w += ch === ' ' ? M.space : (GL[ch]?.w ?? 0) + M.track;
  return Math.max(0, w - M.track);
}
// solids union, then the counters are punched out of this canvas only
function drawText(c, text, x, y, k, color) {
  let cx = x;
  for (const ch of text) {
    if (ch === ' ') { cx += M.space * k; continue; }
    const g = GL[ch]; if (!g) continue;
    c.save(); c.translate(cx, y); c.scale(k, k);
    c.fillStyle = color; c.beginPath(); for (const sh of g.s) shape(c, sh); c.fill();
    if (g.h) { c.globalCompositeOperation = 'destination-out'; c.beginPath(); for (const sh of g.h) shape(c, sh); c.fill(); }
    c.restore();
    cx += (g.w + M.track) * k;
  }
}

// one element of the lockup: a canvas texture on a plane, anchored at (ax, ay)
// in logotype units, its box (x, y, w, h) in the same units
function element(box, anchor, px, paint) {
  const pad = 6, cv = document.createElement('canvas');
  cv.width = Math.ceil((box.w + pad * 2) * px); cv.height = Math.ceil((box.h + pad * 2) * px);
  const c = cv.getContext('2d');
  c.translate(pad * px, pad * px);
  paint(c, px);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshBasicNodeMaterial({ map: tex, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry((box.w + pad * 2) * U, (box.h + pad * 2) * U);
  // move the plane so the anchor is its origin: scaling and moving it then happen about the anchor
  geo.translate((box.x + box.w / 2 - anchor[0]) * U, -(box.y + box.h / 2 - anchor[1]) * U, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(wx(anchor[0]), wy(anchor[1]), 0);
  mesh.renderOrder = 10;
  return { mesh, mat, tex, home: mesh.position.clone() };
}

// ── the intro ───────────────────────────────────────────────────────────
export class Intro {
  // ctx: { scene, actors, ui, T, floor(), camera(), arena() }
  constructor(ctx) {
    this.c = ctx;
    this.cam = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    this.built = null;
    this._q0 = new THREE.Quaternion(); this._q1 = new THREE.Quaternion();
    this._v = new THREE.Vector3(); this._up = new THREE.Vector3(); this._tgt = new THREE.Vector3();
    this._black = new THREE.Color(0x000000); this._void = new THREE.Color(ctx.T.render.clearColor);
  }

  build() {
    if (this.built) return this.built;
    const group = new THREE.Group(), parts = {};
    const b = masterBounds(), FW = FACE_H * (b.w / b.h);
    // the face, open and at two stages of a blink (the brand's resting animation)
    const faceBox = { x: -(FW + GAP), y: 50 - FACE_H / 2, w: FW, h: FACE_H };
    // three cards, open / half / shut, so the blink is a swap of which one shows
    parts.faces = [1, 0.45, 0.08].map((sq) => element(faceBox, [faceBox.x + FW / 2, 50], 7, (c, px) => fillMaster(c, 0, 0, FW * px, { color: MAGENTA, squash: sq })));
    parts.face = parts.faces[0];
    // line 1: Toko · Midori · Games™, the logotype's own word spacing
    const toko = textWidth('Toko'), midori = textWidth('Midori'), games = textWidth('Games');
    const xMid = toko + M.space, xGames = xMid + midori + M.space;
    parts.toko = element({ x: 0, y: 0, w: toko, h: M.cap }, [toko / 2, 50], 8, (c, px) => drawText(c, 'Toko', 0, 0, px, MAGENTA));
    parts.midori = element({ x: xMid, y: 0, w: midori, h: M.cap }, [xMid + midori / 2, 50], 6, (c, px) => drawText(c, 'Midori', 0, 0, px, MAGENTA));
    const tmW = textWidth('TM') * 0.3, gamesW = games + 7 + tmW;
    parts.games = element({ x: xGames, y: 0, w: gamesW, h: M.cap }, [xGames + gamesW / 2, 50], 6, (c, px) => {
      drawText(c, 'Games', 0, 0, px, MAGENTA);
      drawText(c, 'TM', (games + 7) * px, 8 * px, px * 0.3, MAGENTA);
    });
    // line 2: d r o p, each its own card so it can pop in; the p is drawn
    // densest, because the camera ends up a few letters' height from its foot
    parts.letters = LETTERS.map(([ch, x], i) => {
      const w = GL[ch].w, h = M.cap + (ch === 'p' ? DESC : 0);
      return element({ x, y: LINE2, w, h }, [x + w / 2, LINE2 + M.cap], ch === 'p' ? 14 : 10, (c, px) => drawText(c, ch, 0, 0, px, MAGENTA));
    });
    for (const p of [...parts.faces, parts.toko, parts.midori, parts.games, ...parts.letters]) group.add(p.mesh);
    // the thread between the p and the drop as it lets go: the hero's own gel
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, -0.5, 0), this.c.actors.hero.mat);
    neck.visible = false; group.add(neck); parts.neck = neck;
    parts.extent = { x0: faceBox.x, x1: xGames + gamesW };
    this.built = { group, parts };
    return this.built;
  }

  begin() {
    const { group } = this.build();
    this.c.scene.add(group);
    this.active = true;
    this._hudEls = ['scorebox', 'clock', 'pausebtn'].map((id) => document.getElementById(id));
  }

  // the camera for each shot, for this screen's shape
  _shots() {
    const asp = this.c.aspect(), vf = THREE.MathUtils.degToRad(this.cam.fov), th = Math.tan(vf / 2), tw = th * asp;
    const P = this.built.parts, ex = P.extent;
    const halfW = ((ex.x1 - ex.x0) / 2) * U, cx = wx((ex.x0 + ex.x1) / 2), cy = wy(58);
    const dA = Math.max(halfW / 0.84 / tw, (FACE_H * U) / 2 / 0.5 / th);
    const dB = Math.max(1.85 / th, 1.0 / tw);           // ~3.7 units tall around the foot of the p
    // M: "Toko" over "drop", the game's name, held for a beat on the way in
    // (the face and the stack together, so a phone held upright keeps the face)
    const mx0 = ex.x0, mx1 = textWidth('Toko'), mw = ((mx1 - mx0) / 2) * U, mh = ((TIP.y + 12) / 2) * U;
    const dM = Math.max(mw / 0.8 / tw, mh / 0.66 / th);
    return { A: { x: cx, y: cy, d: dA }, M: { x: wx((mx0 + mx1) / 2), y: wy(TIP.y / 2 - 6), d: dM }, B: { x: 0, y: YTIP - 0.85, d: dB } };
  }

  frame(t, world) {
    const C = CUES, P = this.built.parts, T = this.c.T, cam = this.cam, floor = this.c.floor(), hv = this.c.actors.hero;
    cam.aspect = this.c.aspect(); cam.fov = 40;
    const sh = this._shots();

    // ── the lockup ──
    const fadeAll = 1 - seg(t, C.detach + 0.35, C.detach + 0.75);
    const kf = seg(t, C.logo, C.logo + 0.3), bl = t - C.blink;
    const shut = bl < 0 || bl > 0.2 ? 0 : bl < 0.05 || bl > 0.15 ? 1 : 2;
    P.faces.forEach((f, i) => {
      f.mesh.visible = i === shut && t < C.land;
      f.mesh.scale.setScalar(0.82 + 0.18 * outBack(kf));
      f.mat.opacity = seg(t, C.logo, C.logo + 0.14) * fadeAll;
    });
    [[P.toko, 0.08], [P.midori, 0.16], [P.games, 0.24]].forEach(([e, d]) => {
      const k = seg(t, C.logo + d, C.logo + d + 0.2);
      e.mat.opacity = k * fadeAll;
      e.mesh.position.y = e.home.y - (1 - outCubic(k)) * 0.35;
    });
    const mg = seg(t, C.midori, C.midori + 0.55);
    P.midori.mat.opacity *= 1 - mg;
    P.midori.mesh.position.y -= smooth(mg) * 0.25;
    P.letters.forEach((e, i) => {
      const k = seg(t, C.letters[i], C.letters[i] + 0.24);
      e.mesh.scale.setScalar(Math.max(0.001, outBack(k, 2.2)));
      e.mat.opacity = seg(t, C.letters[i], C.letters[i] + 0.06) * fadeAll;
    });
    for (const e of [P.toko, P.midori, P.games, ...P.letters]) e.mesh.visible = t < C.land;   // gone once it is down

    // ── the drop: the hero, hanging from the p, falling, landing ──
    const r = T.hero.radius, SYF = 1.3;                   // r: the body; SYF: its stretch as it falls
    const g = (2 * (YTIP - 2 * r * SYF)) / Math.pow(C.land - C.detach, 2);
    let rootY = 0, s = 1, sy = 1, show = t >= C.collect, dropC = r;
    if (t < C.detach) {
      s = 0.12 + 0.88 * outCubic(seg(t, C.collect, C.collect + 1.0));
      sy = 1 + 0.3 * smooth(seg(t, C.collect + 0.55, C.detach)) + 0.05 * Math.sin(t * 19) * (1 - seg(t, C.collect, C.detach));
      rootY = YTIP - 2 * r * s * sy;
      dropC = rootY + r * s * sy;
    } else if (t < C.land) {
      const tau = t - C.detach;
      sy = lerp(1.3, SYF, seg(tau, 0, 0.2));
      rootY = YTIP - 2 * r * sy - 0.5 * g * tau * tau;
      dropC = rootY + r * sy;
    } else {
      const tau = t - C.land;
      sy = 1 - 0.5 * Math.exp(-5.5 * tau) * Math.cos(13 * tau);
      // the eyes open with a little hop of the whole body
      const e = t - C.eyes;
      if (e > 0) sy += 0.12 * Math.exp(-7 * e) * Math.sin(20 * e);
      rootY = 0; dropC = r;
    }
    const q = 1 / Math.sqrt(Math.max(0.2, sy));
    hv.root.visible = show;
    hv.root.position.set(0, rootY, 0);
    hv.squash.scale.set(s * q, s * sy, s * q);
    hv.mat.opacity = T.heroLook.opacity;
    hv.mat.gel.stretch.value = 0;
    // the thread: from the foot of the p to the top of the drop, thinning to nothing as it lets go
    const nk = t < C.detach ? 1 : 1 - seg(t, C.detach, C.detach + 0.1);
    P.neck.visible = show && nk > 0.01 && t < C.land;
    if (P.neck.visible) {
      const top = rootY + 2 * r * s * sy, len = Math.max(0.02, YTIP - top + 0.04);
      P.neck.position.set(0, YTIP + 0.02, 0);
      P.neck.scale.set(0.11 * s * nk, len, 0.11 * s * nk);
    }
    // the eyes: shut until they open, then a blink a moment later
    const eo = t - C.eyes;
    hv.eyes.visible = eo > 0;
    hv.eyes.rotation.y = 0;                               // looking toward the bottom of the screen
    let open = outBack(seg(eo, 0, 0.22), 2.6);
    const bk = t - (C.eyes + 0.55);
    if (bk > 0 && bk < 0.14) open *= Math.abs(Math.cos((bk / 0.14) * Math.PI));
    hv.eyes.scale.set(1, Math.max(0.05, open), 1);

    // ── the floor: the void until the drop lands, then the grid runs out of it ──
    const A = this.c.arena(), Rmax = Math.hypot(A.hx, A.hz) + 1.5;
    const rk = seg(t, C.grid, C.grid + 1.7);
    floor.reveal.at.value.set(0, 0);
    floor.reveal.r.value = t < C.land ? 0 : 0.3 + Rmax * Math.pow(rk, 1.7);   // slow out of the drop, then away
    floor.reveal.front.value = t < C.land ? 0 : 1 - seg(t, C.grid + 1.45, C.grid + 1.85);
    const vk = seg(t, C.grid, C.grid + 1.0);
    floor.reveal.void.value.copy(this._black).lerp(this._void, vk);
    this.c.scene.background.copy(this._black).lerp(this._void, vk);
    const railK = seg(floor.reveal.r.value, Math.min(A.hx, A.hz) - 1, Rmax - 1);
    floor.border.material.opacity = railK;
    floor.border.visible = railK > 0.001;

    // ── the camera ──
    const game = this.c.camera();
    let pos = this._v, tgt = this._tgt, up = this._up, fov = 40, view = 0;
    if (t < C.collect) {
      // the lockup, a slow drift in; in to "Toko drop" while the letters pop,
      // a beat on the name, then on in to the foot of the p
      const hold = 1 - 0.03 * seg(t, 0, C.zoom);
      const z1 = inOut(seg(t, C.zoom, C.letters[3] - 0.1)), z2 = inOut(seg(t, C.letters[3] + 0.42, C.collect + 0.05));
      const drift = 1 - 0.05 * seg(t, C.letters[3] - 0.1, C.letters[3] + 0.42);
      const a = z2 > 0 ? sh.M : sh.A, bb = z2 > 0 ? sh.B : sh.M, z = z2 > 0 ? z2 : z1;
      const da = z2 > 0 ? sh.M.d * drift : sh.A.d * hold, db = z2 > 0 ? sh.B.d : sh.M.d * drift;
      const d = Math.exp(lerp(Math.log(da), Math.log(db), z));
      tgt.set(lerp(a.x, bb.x, smooth(z)), lerp(a.y, bb.y, smooth(z)), 0);
      pos.set(tgt.x, tgt.y, d); up.set(0, 1, 0);
    } else if (t < C.land + 0.35) {
      // hold on the drop while it gathers, then follow it down and swing over
      // until the camera looks straight down on where it lands
      const sw = Math.sin(seg(t, C.detach + 0.08, C.land + 0.35) * Math.PI / 2);
      const phi = (Math.PI / 2) * smooth(sw);
      const d = lerp(sh.B.d * (1 - 0.06 * seg(t, C.collect, C.detach)), 7.5, smooth(sw));
      // the drop keeps the place in the frame it let go from, until it is down
      const off = YTIP - r * SYF - sh.B.y;
      const ty = t < C.detach ? sh.B.y : Math.max(r, dropC - off);
      tgt.set(0, ty, 0);
      pos.set(0, ty + Math.sin(phi) * d, Math.cos(phi) * d);
      up.set(0, Math.cos(phi), -Math.sin(phi));
    } else if (t < C.eyes - 0.5) {
      // straight down, pulling up as the grid spreads
      const d = lerp(7.5, 24, inOut(seg(t, C.land + 0.3, C.eyes - 0.5)));
      tgt.set(0, r, 0); pos.set(0, r + d, 0.0001); up.set(0, 0, -1);
    } else if (t < C.eyes + 0.45) {
      // down and round to its face for the eyes
      const k = inOut(seg(t, C.eyes - 0.5, C.eyes - 0.02));
      const phi = lerp(Math.PI / 2, THREE.MathUtils.degToRad(34), k), d = lerp(24, 4.4, k);
      tgt.set(0, lerp(r, r * 1.05, k), 0);
      pos.set(0, tgt.y + Math.sin(phi) * d, Math.cos(phi) * d);
      up.set(0, Math.cos(phi), -Math.sin(phi));
    } else {
      // out to the game's own camera, offset and all
      const k = inOut(seg(t, C.eyes + 0.45, C.go));
      const phi = THREE.MathUtils.degToRad(34), d = 4.4;
      tgt.set(0, r * 1.05, 0);
      const p0 = new THREE.Vector3(0, tgt.y + Math.sin(phi) * d, Math.cos(phi) * d);
      cam.position.copy(p0); cam.up.set(0, Math.cos(phi), -Math.sin(phi)); cam.lookAt(tgt);
      this._q0.copy(cam.quaternion);
      this._q1.copy(game.quaternion);
      cam.position.lerpVectors(p0, this.c.cameraRest(), k);
      cam.quaternion.slerpQuaternions(this._q0, this._q1, k);
      fov = lerp(40, game.fov, k); view = k;
      cam.fov = fov; cam.near = 0.1; cam.far = game.far;
      this._view(game, view);
      return this._hud(t);
    }
    cam.position.copy(pos); cam.up.copy(up); cam.lookAt(tgt);
    cam.fov = fov; cam.near = 0.1; cam.far = 400;
    this._view(game, view);
    this._hud(t);
  }

  // blend the game camera's off-axis view offset in, k = 0..1
  _view(game, k) {
    const v = game.view;
    if (v && v.enabled && k > 0) this.cam.setViewOffset(v.fullWidth, v.fullHeight, v.offsetX * k, v.offsetY * k, v.width, v.height);
    else { this.cam.clearViewOffset(); }
    this.cam.updateProjectionMatrix();
  }

  // the HUD comes in piece by piece: score from the left, clock from the right, pause from the top
  _hud(t) {
    const C = CUES, ui = this.c.ui;
    const on = t >= C.hud[0];
    ui.setHud(on);
    if (!on) return;
    const [score, clock, pause] = this._hudEls;
    const k0 = outBack(seg(t, C.hud[0], C.hud[0] + 0.3)), k1 = outBack(seg(t, C.hud[2], C.hud[2] + 0.3)), k2 = outBack(seg(t, C.hud[3], C.hud[3] + 0.3));
    score.style.transform = `translateX(${(1 - k0) * -70}px)`; score.style.opacity = clamp(k0);
    clock.style.transform = `translateX(${(1 - k1) * 70}px)`; clock.style.opacity = clamp(k1);
    pause.style.transform = `translateX(-50%) translateY(${(1 - k2) * -48}px)`; pause.style.opacity = clamp(k2);
    const lives = document.getElementById('lives');
    if (lives) [...lives.children].forEach((d, i) => { const k = seg(t, C.hud[1] + i * 0.07, C.hud[1] + i * 0.07 + 0.16); d.style.transform = `scale(${outBack(k, 3)})`; });
  }

  // put everything back the way the game draws it
  finish() {
    if (!this.active) return;
    this.active = false;
    const { group, parts } = this.built, floor = this.c.floor(), T = this.c.T, hv = this.c.actors.hero;
    this.c.scene.remove(group);
    floor.reveal.r.value = 1e4; floor.reveal.front.value = 0;
    floor.reveal.void.value.set(T.render.clearColor);
    floor.border.material.opacity = 1; floor.border.visible = true;
    this.c.scene.background.set(T.render.clearColor);
    hv.eyes.visible = true; hv.eyes.scale.set(1, 1, 1); hv.squash.scale.set(1, 1, 1); hv.root.position.y = 0;
    for (const el of this._hudEls) { el.style.transform = ''; el.style.opacity = ''; }
    const lives = document.getElementById('lives');
    if (lives) for (const d of lives.children) d.style.transform = '';
    parts.neck.visible = false;
  }

  dispose() {
    if (!this.built) return;
    const { parts } = this.built;
    for (const e of [...parts.faces, parts.toko, parts.midori, parts.games, ...parts.letters]) { e.mesh.geometry.dispose(); e.mat.dispose(); e.tex.dispose(); }
    parts.neck.geometry.dispose();
    this.built = null;
  }
}
