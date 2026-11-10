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
// vendored here from toko/js/): the traced master face, and — v130 (owner,
// 2026-11-09: "the text in the beginning logo is a bit wrong, please use this
// instead") — the OWNER'S words, traced from their original (wordmark.js
// LOGO). v131 (owner: "The Toko Midori Games text should still be horizontal
// like before, then camera moves to Toko to show Drop"): set on ONE line as
// the film always had it, each word standing the same height (the brand's
// one-line setting, wordmark.js drawWord), no ™ (the original has none); and
// "drop" is made of the owner's own letters — Midori's d, r and o, and a p
// that is the d turned over (a geometric face's p is its d, half a turn round).
import * as THREE from 'three/webgpu';
import { fillMaster, masterBounds } from './master.js?v=138';
import { LOGO } from './wordmark.js?v=138';
import { CUES } from './sfx.js?v=138';

export { CUES };

const MAGENTA = '#f0027f';            // TOKO.MAGENTA — the original colour
const U = 0.03;                       // world units per logotype unit (Toko stands 100 → 3)
const YTIP = 7.5;                     // the foot of the p, above the spawn point

// ── the layout, in logotype units (y down; line 1's cap box is 0..100) ──
// line 1: Toko · Midori · Games, each word's ink 100 units tall on one baseline, a word space of `GAPW` between
const WD = LOGO.words, GAPW = 46;
const SC = Object.fromEntries(Object.keys(WD).map((n) => [n, 100 / WD[n].h]));       // a word's units a source pixel
const WW = Object.fromEntries(Object.keys(WD).map((n) => [n, WD[n].w * SC[n]]));     // its width in units
const XW = { Toko: 0, Midori: WW.Toko + GAPW, Games: WW.Toko + GAPW + WW.Midori + GAPW };
const FACE_H = 125, GAP = FACE_H * 0.14;
// line 2: "drop", from Midori's letters ([x0, x1] in Midori's source px) at Midori's size and fit, one line below
// "Toko"; the p is the d half a turn round, dropped so its bowl stands on the x-height and its stem runs below
const LINE2 = 106;
const MID = { d: [343, 514.5], r: [741.2, 870.6], o: [545.3, 708.9], fit: 31, base: 266.1, xh: 47.9, ink: 267.6 };
const DROP = (() => {
  let x = 0;
  return [['d', MID.d, false], ['r', MID.r, false], ['o', MID.o, false], ['p', MID.d, true]].map(([ch, src, turn]) => {
    const w = src[1] - src[0], h = WD.Midori.h, dy = turn ? MID.xh - (h - MID.ink) : 0;
    const L = { ch, src, turn, w, h, x, dy };
    x += w + MID.fit;
    return L;
  });
})();
const SM = SC.Midori, P_ = DROP[3], STEM = (460.8 + 514.5) / 2 - MID.d[0];      // the d's stem, its middle in the letter
const TIP = { x: (P_.x + (P_.w - STEM)) * SM, y: LINE2 + (P_.dy + P_.h) * SM };   // the foot of the p's stem
const BASE2 = LINE2 + MID.base * SM;                                               // line 2's baseline
const wx = (gx) => (gx - TIP.x) * U;
const wy = (gy) => YTIP + (TIP.y - gy) * U;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (k) => k * k * (3 - 2 * k);
const inOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const outCubic = (k) => 1 - Math.pow(1 - k, 3);
const outBack = (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const lerp = (a, b, k) => a + (b - a) * k;

// ── drawing the letters: the owner's traced outlines (holes are other loops of the path: evenodd) ──
const PATHS = {};
const pathOf = (n) => (PATHS[n] ||= new Path2D(WD[n].d));
function word(c, n, px) {
  c.save(); c.scale(px * SC[n], px * SC[n]);
  c.fillStyle = MAGENTA; c.fill(pathOf(n), 'evenodd');
  c.restore();
}
// one of Midori's letters on its own: clipped out of the word, half a turn round for the p
function letter(c, L, px) {
  c.save(); c.scale(px * SM, px * SM);
  if (L.turn) { c.translate(L.w, L.h); c.scale(-1, -1); }
  c.beginPath(); c.rect(0, 0, L.w, L.h); c.clip();
  c.translate(-L.src[0], 0);
  c.fillStyle = MAGENTA; c.fill(pathOf('Midori'), 'evenodd');
  c.restore();
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
    // line 1: Toko · Midori · Games, the owner's words, each its own card (they come in one after another, one goes)
    const card = (n, px) => element({ x: XW[n], y: 0, w: WW[n], h: 100 }, [XW[n] + WW[n] / 2, 50], px, (c, k) => word(c, n, k));
    parts.toko = card('Toko', 8); parts.midori = card('Midori', 6); parts.games = card('Games', 6);
    // line 2: d r o p, each its own card so it can pop in; the p is drawn densest, because the camera ends up a
    // few letters' height from its foot
    parts.letters = DROP.map((L) => {
      const bx = { x: L.x * SM, y: LINE2 + L.dy * SM, w: L.w * SM, h: L.h * SM };
      return element(bx, [bx.x + bx.w / 2, BASE2], L.turn ? 14 : 10, (c, px) => letter(c, L, px));
    });
    for (const p of [...parts.faces, parts.toko, parts.midori, parts.games, ...parts.letters]) group.add(p.mesh);
    // the thread between the p and the drop as it lets go: the hero's own gel
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, -0.5, 0), this.c.actors.hero.mat);
    neck.visible = false; group.add(neck); parts.neck = neck;
    parts.extent = { x0: faceBox.x, x1: XW.Games + WW.Games };
    this.built = { group, parts };
    return this.built;
  }

  // v131: the lockup's cards drawn and sent to the GPU while the title is up (main.js, once its warm-up is done),
  // so the film's first second does not stop to paint ten canvases and upload them
  prepare(renderer) {
    const { parts } = this.build();
    for (const e of [...parts.faces, parts.toko, parts.midori, parts.games, ...parts.letters]) renderer.initTexture?.(e.tex);
  }

  begin() {
    const { group } = this.build();
    this.c.scene.add(group);
    this.active = true;
    this._hudEls = ['scorebox', 'clock', 'pausebtn'].map((id) => document.getElementById(id));
    // v125 (the state audit): what the floor and the scene were before the film, so finish() puts back THIS
    // world's look — a CONTINUE or a FROM WORLD run plays the film over a later world's floor (the driveway's
    // summer haze and no rail), and finish() used to put world 1's dark and rail on it for the rest of the world
    const floor = this.c.floor(), set = this.c.scenery?.();
    this._was = { void: floor.reveal.void.value.clone(), bg: this.c.scene.background.clone(), border: floor.border.visible, set: set ? set.group.visible : true };
    this._void.copy(this._was.void);
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
    const mx0 = ex.x0, mx1 = WW.Toko, mw = ((mx1 - mx0) / 2) * U, mh = ((TIP.y + 12) / 2) * U;
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
    // the floor the film reveals is the one built (a later world's is bigger than world 1's arena: v125)
    const fa = floor.arena?.max, A = fa ? { hx: fa.x, hz: fa.z } : this.c.arena(), Rmax = Math.hypot(A.hx, A.hz) + 1.5;
    const rk = seg(t, C.grid, C.grid + 1.7);
    floor.reveal.at.value.set(0, 0);
    floor.reveal.r.value = t < C.land ? 0 : 0.3 + Rmax * Math.pow(rk, 1.7);   // slow out of the drop, then away
    floor.reveal.front.value = t < C.land ? 0 : 1 - seg(t, C.grid + 1.45, C.grid + 1.85);
    const vk = seg(t, C.grid, C.grid + 1.0);
    floor.reveal.void.value.copy(this._black).lerp(this._void, vk);
    this.c.scene.background.copy(this._black).lerp(this._void, vk);
    const railK = seg(floor.reveal.r.value, Math.min(A.hx, A.hz) - 1, Rmax - 1);
    floor.border.material.opacity = railK;
    floor.border.visible = (this._was?.border ?? true) && railK > 0.001;   // a floor with no rail (the driveway's, the sewer's) gets none
    // v101 (owner: "The world one environment is now shown in the intro animations and it shouldn't be"): the
    // world's set — world 1's loops of neon (v123; its grid running on past the rail and its lit bollards before) — waits in the void with the
    // floor, and comes in as the grid reaches the rail; it stood along the bottom of the logo and the drop
    const set = this.c.scenery?.(), posts = this.c.actors.posts, shown = railK > 0.5;
    // v131 (owner, 2026-11-09: "It lagged through the intro and also it showed world 2 environment art when it
    // started"): a later world's things that stand on its floor — the driveway's bollards and its beach ball — wait
    // with the set (they stood under the logo and beside the falling drop). v133: what the world will show is compiled
    // before the film starts, while it holds on black (main.js warmFilm) — v131 compiled it here, on the film's first
    // frame, and the film's own next frames built most of it anyway
    if (set) set.group.visible = shown;
    for (const v of [...(posts?.views ?? []), ...(posts?.extras ?? [])]) v.visible = v.visible && shown;
    // and the floor is the void until the drop lands: it is not drawn till then (a phone paid for every pixel of it)
    floor.group.visible = t >= C.land - 0.05;

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
    const W = this._was ?? {};
    floor.reveal.r.value = 1e4; floor.reveal.front.value = 0;
    if (W.void) floor.reveal.void.value.copy(W.void); else floor.reveal.void.value.set(T.render.clearColor);
    floor.border.material.opacity = 1; floor.border.visible = W.border ?? true;
    const set = this.c.scenery?.(); if (set) set.group.visible = W.set ?? true;
    floor.group.visible = true;   // v131: drawn again (the film kept it back until the drop landed)
    if (W.bg) this.c.scene.background.copy(W.bg); else this.c.scene.background.set(T.render.clearColor);
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
