// EERI — manipulable world pieces (ART_BRIEF §5.1): the things a machine
// digs, lifts or breaks. 3D rather than cutouts, because they are moved and
// changed in play.
//
// Each piece ships all of its states as sibling nodes (state0/state1/…) and
// the game shows exactly one at a time. That is the whole contract, so a
// real GLB drops in behind the same seam as everything else — see
// assets/README.md. Below is the code-built placeholder.
//
// The rule the art brief states and this file obeys: draw the CHANGE. A
// half-dug bank is not a shorter bank — it has a fresh cut face and spill
// at its foot.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=3';

export function buildBankModel(rows = 3, width = 5) {
  const root = new THREE.Group();
  const nodes = {};
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };

  // one state per remaining height: state0 = untouched, and each later
  // state is a shorter bank with a cut face the bucket has left behind.
  // The face BANDS, same as the level's own section (js/level.js) — a flat
  // brown rectangle is a box, and this is supposed to be earth.
  for (let s = 0; s < rows; s++) {
    const h = rows - s;                       // tiles still standing
    const g = new THREE.Group(); g.name = `state${s}`;
    for (let r = 0; r < h; r++) {             // strata, darkening downward
      const t = h === 1 ? 1 : r / (h - 1);
      box(g, width, 1, 1.6, mix(PAL.EARTH[0], PAL.EARTH[2], 0.25 + t * 0.6),
        width / 2, r + 0.5, 0);
    }
    box(g, width, 0.16, 1.66, PAL.EARTH[2], width / 2, h - 0.08, 0);   // sunlit crown
    if (s === 0) {
      box(g, width, 0.14, 1.7, PAL.GREEN, width / 2, h - 0.02, 0);     // untouched: still turfed
    } else {
      // the cut face: raw, lighter, and it spills at the foot
      box(g, width, 0.1, 1.72, PAL.EARTH[3], width / 2, h - 0.05, 0);
      for (let i = 0; i < 5 + s * 3; i++) {
        const a = (i * 2.39) % 1, b = (i * 0.77) % 1;
        const r = 0.12 + b * 0.16;
        const sp = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M(mix(PAL.EARTH[1], PAL.EARTH[3], b)));
        sp.position.set(a * width, r * 0.8, (b - 0.5) * 1.3);
        sp.rotation.set(a * 6, b * 6, a * 3);
        g.add(sp);
      }
    }
    root.add(g); nodes[`state${s}`] = g;
  }
  return { root, nodes };
}

// ---- the girder: stacked → slung → seated as a span ----------------------
// State origins are the contract (assets/README.md): state0 sits on the
// ground under the stack centre, state1 hangs from `grip` at its origin,
// state2 is the span — centre of the walked row, top face at +1 (one tile
// deep, because it is stood on).

export function buildGirderModel(len = 9.8) {
  const root = new THREE.Group();
  const nodes = {};
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };

  // one girder shape for every state — chords, web posts, and the end
  // bolt-plates, in the level's own girder language
  const girder = (parent, y) => {
    box(parent, len, 0.24, 1.0, PAL.STEEL[1], 0, y + 0.88, 0);   // top chord
    box(parent, len, 0.24, 1.0, PAL.STEEL[1], 0, y + 0.12, 0);   // bottom chord
    for (let x = -len / 2 + 0.6; x < len / 2 - 0.2; x += 1.8) {
      box(parent, 0.16, 0.62, 0.8, PAL.STEEL[2], x, y + 0.5, 0); // web posts
    }
    for (const ex of [-len / 2 + 0.14, len / 2 - 0.14]) {         // end plates
      box(parent, 0.16, 1.0, 1.02, PAL.STEEL[0], ex, y + 0.5, 0);
    }
  };

  // state0 — STACKED: waiting on two timber trestles
  const s0 = new THREE.Group(); s0.name = 'state0';
  for (const dx of [-len * 0.3, len * 0.3]) {
    box(s0, 0.9, 0.5, 1.2, PAL.EARTH[0], dx, 0.25, 0);
  }
  girder(s0, 0.5);
  root.add(s0); nodes.state0 = s0;

  // state1 — SLUNG: hanging under the grip by two chains
  const s1 = new THREE.Group(); s1.name = 'state1';
  const grip = new THREE.Group(); grip.name = 'grip'; s1.add(grip); nodes.grip = grip;
  const drop = 1.6;                       // girder top rides this far under the bucket
  box(s1, 0.34, 0.16, 0.3, PAL.DARK, 0, -0.06, 0);               // the shackle
  for (const dx of [-len * 0.27, len * 0.27]) {
    // chain leg: grip (0,0) down to the top chord at (dx, -drop + 0.94)
    const ty = -drop + 0.94;
    const L = Math.hypot(dx, ty);
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, L, 6), M(PAL.DARK));
    ch.position.set(dx / 2, ty / 2, 0);
    ch.rotation.z = Math.atan2(-dx, ty);
    s1.add(ch);
  }
  girder(s1, -drop);
  root.add(s1); nodes.state1 = s1;

  // state2 — SEATED: the span, flat top exactly one tile up
  const s2 = new THREE.Group(); s2.name = 'state2';
  girder(s2, 0);
  root.add(s2); nodes.state2 = s2;

  return { root, nodes };
}

export class Girder {
  // def = the site's girder block: { stackX, gap: {c0, c1, cy}, seat, spanLen }
  constructor(scene, level, def, asset) {
    this.level = level; this.def = def;
    this.state = 0;                       // 0 stacked · 1 slung · 2 seated
    this.n = asset.nodes;
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.group.position.set(def.stackX, level.groundTop(def.stackX, 8), 0);
    this.sway = 0;
    this._v = new THREE.Vector3();
    scene.add(this.group);

    // how far the slung load hangs below the grip — measured off the asset,
    // so a live GLB with its own chain length keeps the ground-rest honest
    this.group.updateWorldMatrix(true, true);
    const bb = new THREE.Box3().setFromObject(this.n.state1);
    this.n.grip.getWorldPosition(this._v);
    this.dropDepth = this._v.y - bb.min.y;

    // dust thrown when the span lands — pooled, so the seat has weight
    this.spray = [];
    const geo = new THREE.DodecahedronGeometry(0.14, 0);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: PAL.EARTH[2] }));
      m.visible = false; m.life = 1;
      this.spray.push(m); scene.add(m);
    }
    this.show();
  }

  show() {
    for (let s = 0; s < 3; s++) this.n[`state${s}`].visible = (s === this.state);
  }

  // off the stack and onto the hook — the machine now carries it
  sling() {
    if (this.state !== 0) return false;
    this.state = 1; this.show();
    return true;
  }

  // lowered in at the lip: the span fills the MAP row, so the bridged gap
  // is a fact about the level — the same honesty as the dig
  seat() {
    if (this.state !== 1) return false;
    const g = this.def.gap;
    this.level.fillRow(g.c0, g.c1, g.cy);
    this.state = 2; this.show();
    this.group.rotation.z = 0;
    this.group.position.set((g.c0 + g.c1 + 1) / 2, g.cy, 0);
    // dust off both lips
    let n = 0;
    for (const p of this.spray) {
      if (p.life < 1 || n >= 8) continue;
      const lip = (n % 2 === 0) ? g.c0 : g.c1 + 1;
      n++;
      p.life = 0; p.visible = true;
      p.position.set(lip + (Math.random() - 0.5) * 1.2, g.cy + 1, (Math.random() - 0.5) * 1.2);
      p.vx = (lip < this.group.position.x ? -1 : 1) * (0.8 + Math.random() * 1.6);
      p.vy = 2.6 + Math.random() * 2.2;
    }
    return true;
  }

  update(dt, exc) {
    for (const p of this.spray) {
      if (p.life >= 1) { p.visible = false; continue; }
      p.life = Math.min(1, p.life + dt / 0.9);
      p.vy -= 26 * dt;
      p.position.x += p.vx * dt;
      p.position.y += p.vy * dt;
      p.rotation.x += dt * 7; p.rotation.z += dt * 5;
      if (p.life >= 1) p.visible = false;
    }
    if (this.state !== 1 || !exc) return;
    // slung: the grip rides the bucket, the load trails the drive. If the
    // bucket comes down too far the chains go slack and the load RESTS on
    // the ground — it never sinks into it. Over a gap there is no ground,
    // so it hangs free, which is exactly what lowering-in looks like.
    exc.bucketWorld(this._v);
    let y = this._v.y - 0.1;
    const gy = this.level.groundTop(this._v.x, Math.max(this._v.y, 5));
    if (gy > -3) y = Math.max(y, gy + this.dropDepth - 0.02);
    this.group.position.set(this._v.x, y, 0);
    this.sway += ((-exc.vx * 0.055) - this.sway) * Math.min(1, 3 * dt);
    this.group.rotation.z = this.sway;
  }
}

// ---- the brick wall: intact → cracked → rubble ---------------------------
// The third manipulable piece, and the ball's job. The brief's rule holds
// here more than anywhere: "rubble is a different silhouette from a wall.
// Draw the change, do not just erase." So the cracked state keeps its full
// height and loses its face, and the rubble state is a low heap that is
// nothing like a shorter wall.

export function buildWallModel(rows = 4, width = 5) {
  const root = new THREE.Group();
  const nodes = {};
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const BRICK = mix(PAL.EARTH[1], PAL.HAZARD, 0.32);
  const BRICK_DK = mix(BRICK, PAL.INK, 0.3);
  const MORTAR = mix(PAL.STEEL[3], PAL.EARTH[3], 0.4);

  // courses of brick, offset every other row — the one detail that says
  // "wall" instead of "block" at any distance
  const courses = (parent, h, skip = () => false) => {
    for (let r = 0; r < h; r++) {
      box(parent, width, 0.06, 1.62, MORTAR, width / 2, r + 0.97, 0);   // bed joint
      for (let b = 0; b < width * 2; b++) {
        if (skip(r, b)) continue;
        const off = (r % 2) * 0.25;
        const x = b * 0.5 + off;
        if (x > width - 0.1) continue;
        box(parent, 0.44, 0.86, 1.6, b % 3 === 1 ? BRICK_DK : BRICK, x + 0.25, r + 0.5, 0);
      }
    }
  };

  // state0 — INTACT
  const s0 = new THREE.Group(); s0.name = 'state0';
  courses(s0, rows);
  box(s0, width + 0.24, 0.22, 1.7, MORTAR, width / 2, rows - 0.05, 0);   // coping
  root.add(s0); nodes.state0 = s0;

  // state1 — CRACKED: full height, but the face is broken open and the top
  // course has started to go. It still blocks; it just tells you it will not
  // block for long.
  const s1 = new THREE.Group(); s1.name = 'state1';
  const gone = (r, b) => (r === rows - 1 && b > width) || (r === rows - 2 && b > width * 1.5)
    || (r === 1 && b === 3) || (r === 2 && b === 4);
  courses(s1, rows, gone);
  for (let i = 0; i < 7; i++) {                                          // fallen brick at the foot
    const a = (i * 2.39) % 1, b = (i * 0.77) % 1;
    const br = box(s1, 0.4, 0.24, 0.5, i % 2 ? BRICK_DK : BRICK, a * width, 0.12, (b - 0.5) * 1.2);
    br.rotation.z = (a - 0.5) * 0.9;
  }
  root.add(s1); nodes.state1 = s1;

  // state2 — RUBBLE: a low heap. A different silhouette, not a short wall.
  const s2 = new THREE.Group(); s2.name = 'state2';
  for (let i = 0; i < 26; i++) {
    const a = (i * 2.39) % 1, b = (i * 0.77) % 1, c = (i * 1.31) % 1;
    const h = 0.5 - Math.abs(a - 0.5) * 0.7;                             // heaped in the middle
    const br = box(s2, 0.38 + c * 0.16, 0.22, 0.46, i % 3 ? BRICK : BRICK_DK,
      a * width, 0.12 + b * h, (c - 0.5) * 1.3);
    br.rotation.set(0, c * 3, (a - 0.5) * 1.3);
  }
  box(s2, width, 0.16, 1.5, mix(BRICK_DK, PAL.INK, 0.35), width / 2, 0.06, 0);  // dust bed
  root.add(s2); nodes.state2 = s2;

  return { root, nodes };
}

export class Wall {
  // rect = { c0, c1, cy0, rows } in cells; the map is the collision
  constructor(scene, level, rect, asset) {
    this.level = level; this.rect = rect;
    this.hits = 0;
    this.n = asset.nodes;
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.group.position.set(rect.c0, rect.cy0, 0);
    scene.add(this.group);

    this.shake = 0;
    this.spray = [];
    const geo = new THREE.BoxGeometry(0.3, 0.18, 0.34);
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
        color: mix(PAL.EARTH[1], PAL.HAZARD, 0.32),
      }));
      m.visible = false; m.life = 1;
      this.spray.push(m); scene.add(m);
    }
    this.show();
  }

  get cracked() { return this.hits === 1; }
  get cleared() { return this.hits >= 2; }

  show() {
    for (let s = 0; s < 3; s++) {
      if (this.n[`state${s}`]) this.n[`state${s}`].visible = (s === Math.min(this.hits, 2));
    }
  }

  // one swing. The first lands and cracks it; the second brings it down and
  // takes the rows OUT OF THE MAP, so the way through is a fact about the
  // level and not about the picture — the same honesty as the dig.
  strike() {
    if (this.cleared) return false;
    this.hits++;
    if (this.cleared) {
      for (let r = 0; r < this.rect.rows; r++) {
        this.level.clearRow(this.rect.c0, this.rect.c1, this.rect.cy0 + r);
      }
    }
    this.shake = 1;
    let n = 0;
    for (const p of this.spray) {
      if (p.life < 1 || n >= (this.cleared ? 14 : 6)) continue;
      n++;
      p.life = 0; p.visible = true;
      p.position.set(
        this.rect.c0 + Math.random() * (this.rect.c1 - this.rect.c0 + 1),
        this.rect.cy0 + Math.random() * this.rect.rows,
        (Math.random() - 0.5) * 1.2,
      );
      p.vx = (Math.random() - 0.35) * 5;
      p.vy = 2.6 + Math.random() * 4;
    }
    return true;
  }

  update(dt) {
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt / 0.35);
      this.group.position.x = this.rect.c0 + Math.sin(this.shake * 46) * 0.09 * this.shake;
    }
    for (const p of this.spray) {
      if (p.life >= 1) { p.visible = false; continue; }
      p.life = Math.min(1, p.life + dt / 1.1);
      p.vy -= 26 * dt;
      p.position.x += p.vx * dt;
      p.position.y += p.vy * dt;
      p.rotation.x += dt * 9; p.rotation.z += dt * 6;
      if (p.life >= 1) p.visible = false;
    }
  }
}

export class Bank {
  // rect = { c0, c1, cy0, rows } in cells; the map is the collision
  constructor(scene, level, rect, asset) {
    this.level = level; this.rect = rect;
    this.dug = 0;
    this.n = asset.nodes;
    this.states = rect.rows;
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.group.position.set(rect.c0, rect.cy0, 0);
    scene.add(this.group);

    // dirt thrown by the bucket — pooled, so a dig has weight
    this.spray = [];
    const geo = new THREE.DodecahedronGeometry(0.16, 0);
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: PAL.EARTH[2] }));
      m.visible = false; m.life = 1;
      this.spray.push(m); scene.add(m);
    }
    this.show();
  }

  get remaining() { return this.rect.rows - this.dug; }
  get cleared() { return this.remaining <= 0; }

  show() {
    for (let s = 0; s < this.states; s++) {
      if (this.n[`state${s}`]) this.n[`state${s}`].visible = (s === this.dug);
    }
  }

  // one bucketful: the top row leaves the MAP, so the level really did change
  dig() {
    if (this.cleared) return false;
    const cy = this.rect.cy0 + this.remaining - 1;
    this.level.clearRow(this.rect.c0, this.rect.c1, cy);
    this.dug++;
    this.show();
    // throw dirt off the cut
    let n = 0;
    for (const p of this.spray) {
      if (p.life < 1 || n >= 6) continue;
      n++;
      p.life = 0; p.visible = true;
      p.position.set(this.rect.c0 + Math.random() * (this.rect.c1 - this.rect.c0 + 1), cy + 1, (Math.random() - 0.5) * 1.2);
      p.vx = -1.4 - Math.random() * 2.2;
      p.vy = 3.4 + Math.random() * 2.6;
    }
    return true;
  }

  update(dt) {
    for (const p of this.spray) {
      if (p.life >= 1) { p.visible = false; continue; }
      p.life = Math.min(1, p.life + dt / 0.9);
      p.vy -= 26 * dt;
      p.position.x += p.vx * dt;
      p.position.y += p.vy * dt;
      p.rotation.x += dt * 7; p.rotation.z += dt * 5;
      if (p.life >= 1) p.visible = false;
    }
  }
}
