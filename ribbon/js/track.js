import * as THREE from 'three';

// ── Shared look ───────────────────────────────────────────────────────────────
export const INK     = 0x141414;   // every outline / rail
export const ACCENT  = 0xff3b30;    // the one warm accent — hints, hearts, "react now"
export const GOOD    = 0x16b06a;    // a cleanly cleared obstacle
export const SHIELD  = 0x2b8cff;    // rewind / shield charges
export const WHITE_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff });
export const inkMat   = () => new THREE.LineBasicMaterial({ color: INK });

export const RIBBON_W = 3.4;        // playable width (x ∈ ±1.7)
const SPAWN_Z   = 62;               // how far ahead obstacles appear
const HIT_TIME  = 0.17;             // base timing window half-width, in seconds
const RUNG_SP   = 2.5;              // metres between scrolling rungs
const LENGTH    = 160;              // ribbon mesh length

// The four reactions, each a distinct vector glyph on the ribbon.
const TYPES = ['up', 'down', 'left', 'right'];
export const ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
export const LABEL = { up: 'JUMP', down: 'SLIDE', left: 'DODGE', right: 'DODGE' };

function outlined(parent, w, h, d, x, y, z, edgeMat) {
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate(x, y, z);
  parent.add(new THREE.Mesh(geo, WHITE_MAT));
  parent.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
}

class Obstacle {
  constructor(type) {
    this.type = type;
    this.group = new THREE.Group();
    this.judged = false; this.cleared = false; this.active = false;
    this.edge = new THREE.LineBasicMaterial({ color: INK });
    const m = this.edge;

    if (type === 'up') {            // low hurdle — JUMP over it
      outlined(this.group, RIBBON_W, 0.55, 0.28, 0, 0.28, 0, m);
    } else if (type === 'down') {   // overhead bar — SLIDE under it
      outlined(this.group, RIBBON_W, 0.34, 0.28, 0, 1.55, 0, m);
      outlined(this.group, 0.14, 1.55, 0.18, -RIBBON_W / 2 + 0.07, 0.77, 0, m);
      outlined(this.group, 0.14, 1.55, 0.18,  RIBBON_W / 2 - 0.07, 0.77, 0, m);
    } else if (type === 'left' || type === 'right') {  // wall on one side — dodge the other way
      const sx = type === 'left' ? 1 : -1;             // wall sits on the side you must leave
      outlined(this.group, RIBBON_W / 2 - 0.15, 1.5, 0.32, sx * (RIBBON_W / 4 + 0.05), 0.75, 0, m);
    }

    // accent chevron — always coloured, points the way to react
    const chev = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.4, 3),
      new THREE.MeshBasicMaterial({ color: ACCENT }));
    chev.position.set(0, 2.05, 0);
    if (type === 'down')  chev.rotation.z = Math.PI;
    if (type === 'left')  { chev.rotation.z = Math.PI / 2; chev.position.set(-RIBBON_W / 4, 0.75, 0); }
    if (type === 'right') { chev.rotation.z = -Math.PI / 2; chev.position.set(RIBBON_W / 4, 0.75, 0); }
    this.chev = chev; this.group.add(chev);
  }

  setActive(on) {
    if (on === this.active) return;
    this.active = on;
    this.edge.color.setHex(on ? ACCENT : INK);
  }
  judge(success) {
    this.judged = true; this.cleared = success;
    this.edge.color.setHex(success ? GOOD : ACCENT);
    if (!success) this.group.rotation.z = (Math.random() - 0.5) * 0.5;  // knocked askew
  }
}

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.obs = [];
    this.distToNext = 0;
    this.traveled = 0;

    // ── Ribbon: a faint grey strip with scrolling rungs + crisp black rails ──
    this.tex = this._makeRibbonTex();
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(RIBBON_W, LENGTH),
      new THREE.MeshBasicMaterial({ map: this.tex }));
    fill.rotation.x = -Math.PI / 2; fill.position.set(0, 0, 10 - LENGTH / 2);
    scene.add(fill);

    const railMat = new THREE.MeshBasicMaterial({ color: INK });
    const railGeo = new THREE.BoxGeometry(0.06, 0.06, LENGTH);
    for (const sx of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(sx * RIBBON_W / 2, 0.03, 10 - LENGTH / 2);
      scene.add(rail);
    }
  }

  _makeRibbonTex() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#f5f5f5'; g.fillRect(0, 0, 64, 64);          // pale surface
    g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, 64, 3);            // one rung per tile
    g.fillStyle = '#e6e6e6'; g.fillRect(30, 0, 4, 64);          // faint centre line
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, LENGTH / RUNG_SP);
    return tex;
  }

  reset() {
    for (const o of this.obs) this.scene.remove(o.group);
    this.obs = []; this.distToNext = 6; this.traveled = 0;
    this.tex.offset.y = 0;
  }

  _spawn() {
    const o = new Obstacle(TYPES[(Math.random() * TYPES.length) | 0]);
    o.z = -SPAWN_Z; o.group.position.z = o.z;
    this.scene.add(o.group); this.obs.push(o);
  }

  // Advance the world. ctx = { speed, gap, windowScale }. Returns auto-misses (passed unjudged).
  update(dt, ctx) {
    const d = ctx.speed * dt;
    this.traveled += d;
    this.tex.offset.y = this.traveled / RUNG_SP;

    this.distToNext -= d;
    if (this.distToNext <= 0) { this._spawn(); this.distToNext = ctx.gap + Math.random() * 2.5; }

    const halfZ = ctx.speed * HIT_TIME * ctx.windowScale;
    const misses = [];
    for (let i = this.obs.length - 1; i >= 0; i--) {
      const o = this.obs[i];
      o.z += d; o.group.position.z = o.z;
      if (!o.judged) o.setActive(Math.abs(o.z) <= halfZ * 1.25);
      if (!o.judged && o.z > halfZ) { o.judge(false); misses.push(o); }   // ran out of time
      if (o.z > 9) { this.scene.remove(o.group); this.obs.splice(i, 1); }
    }
    return misses;
  }

  // Player reacted. Returns 'clear' | 'wrong' | 'none' and judges the matched obstacle.
  tryAction(dir, ctx) {
    const halfZ = ctx.speed * HIT_TIME * ctx.windowScale;
    let best = null, bestD = Infinity;
    for (const o of this.obs) {
      if (o.judged) continue;
      if (o.z < -halfZ * 1.4 || o.z > halfZ) continue;     // outside the timing window
      const ad = Math.abs(o.z);
      if (ad < bestD) { bestD = ad; best = o; }
    }
    if (!best) return 'none';
    const ok = best.type === dir;
    best.judge(ok);
    return ok ? 'clear' : 'wrong';
  }
}
