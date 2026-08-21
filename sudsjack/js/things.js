// SUDS JACK — what comes up the tube.
//
// Two kinds, and they are opposites on purpose: a BUBBLE is cold, bright,
// round and blooms; GRIME is warm, dull, angular and never blooms. You should
// be able to tell them apart at the far end of the tube, at speed, without
// reading anything.
//
// One bubble at a time is LIT. That is Bomb Jack's rule carried over whole:
// there is always exactly one that matters more than the others, taking it
// raises the chain, and letting it get past you puts the chain back to one.
// The bubbles you can reach are rarely the lit one, which is what turns a
// collection game into a routing game.
//
// Grime STEPS TOWARD YOU as it rises — Tempest's flipper, minus the gun. It is
// the only reason moving is interesting: a hazard that came straight up its
// own lane could be dodged by standing still in the right place, which is not
// a game, it is a waiting room.

import * as THREE from 'three';
import { PAL } from './palette.js';

const CAP = 96;

export class Risers {
  constructor(scene, tube) {
    this.tube = tube;
    this.items = [];

    const bubbleGeo = new THREE.IcosahedronGeometry(0.8, 0);
    this.bubbles = new THREE.InstancedMesh(
      bubbleGeo,
      new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.95 }),
      CAP,
    );
    const grimeGeo = new THREE.OctahedronGeometry(0.86, 0);
    this.grime = new THREE.InstancedMesh(
      grimeGeo,
      new THREE.MeshBasicMaterial({ flatShading: true }),
      CAP,
    );
    for (const m of [this.bubbles, this.grime]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      m.frustumCulled = false;
      tube.group.add(m);
    }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
  }

  spawn(type, lane, speed, opts = {}) {
    if (this.items.length >= CAP * 2) return null;
    const it = {
      type, lane, depth: 1, speed,
      lit: !!opts.lit,
      spin: Math.random() * 6.28,
      // grime does not step on a clock — it steps on a countdown that gets
      // shorter as it gets closer, so the last stretch is the dangerous one
      stepIn: 0.9,
      dead: false,
    };
    this.items.push(it);
    return it;
  }

  get lit() { return this.items.find(i => i.lit && !i.dead) || null; }

  // Pick a new lit bubble when the old one is gone. Preferring the DEEPEST
  // one is not cosmetic: it is the one you have the most time to reach, so the
  // chain stays possible rather than becoming a coin flip.
  relight() {
    if (this.lit) return;
    let best = null;
    for (const i of this.items) {
      if (i.type !== 'bubble' || i.dead) continue;
      if (!best || i.depth > best.depth) best = i;
    }
    if (best) best.lit = true;
  }

  /**
   * @returns {{collected: object[], missed: object[], struck: object[], settled: object[]}}
   */
  update(dt, player) {
    const collected = [], missed = [], struck = [], settled = [];

    for (const it of this.items) {
      if (it.dead) continue;
      it.depth -= it.speed * dt;
      it.spin += dt * (it.type === 'bubble' ? 1.4 : 2.6);

      if (it.type === 'grime') {
        it.stepIn -= dt;
        if (it.stepIn <= 0) {
          // Step one lane toward the player. In a channel there is only one
          // way to go — no short way round, because there is no way round —
          // so grime coming at you from the far lip has to cross everything
          // in between and you can watch it do it.
          // It is stopped by a ridge the same way you are, and it cannot
          // jump. That is what makes the five-bay level a level rather than a
          // backdrop: each bay keeps its own problem, and moving to another
          // one is the play. Grime that cannot reach you sits in its bay and
          // waits, which is a threat you can see and route around.
          const d = player.lane - it.lane;
          const [lo, hi] = this.tube.bayRange(it.lane);
          if (Math.abs(d) > 0.5) {
            it.lane = Math.max(lo, Math.min(hi, this.tube.clampLane(it.lane + Math.sign(d))));
          }
          // ×13/20 of the original countdown: a lane is narrower now that
          // twenty span the channel, so the cadence quickens to keep grime's
          // WORLD speed — and the menace — what it was tuned to
          it.stepIn = 0.23 + it.depth * 0.59;
        }
      }

      // Reaching the player: same lane, same depth. The lane tolerance is
      // generous because the player slides between lanes and a hit that
      // depends on a hundredth of a lane is a hit nobody can see coming.
      const gap = Math.abs(it.lane - player.lane);
      // 0.62 lanes of the thirteen-lane channel, in twenty-lane units
      const near = gap < 0.95 && Math.abs(it.depth - player.depth) < 0.085;
      // Off the floor, grime goes under you. The jump is a way across a ridge
      // AND a dodge, which is what stops it being dead weight on the five
      // levels that have no ridges in them.
      const overIt = it.type === 'grime' && player.airborne;

      if (it.type === 'bubble') {
        if (near) { it.dead = true; collected.push(it); continue; }
        if (it.depth <= -0.02) { it.dead = true; missed.push(it); }
      } else {
        if (near && !overIt) { it.dead = true; struck.push(it); continue; }
        // Grime that gets past the mouth does NOT go over the edge any more —
        // it SETTLES. The aftermath is the point now: every dodge is a loan,
        // and what you did not deal with is still there, underfoot.
        if (it.depth <= -0.05) { it.dead = true; settled.push(it); }
      }
    }

    if (this.items.some(i => i.dead)) this.items = this.items.filter(i => !i.dead);
    this.relight();
    this._draw();
    return { collected, missed, struck, settled };
  }

  _draw() {
    let nb = 0, ng = 0;
    const p = new THREE.Vector3();
    for (const it of this.items) {
      this.tube.at(it.lane, Math.max(it.depth, 0), p);
      // No depth scaling. The channel is the same size all the way along and
      // the camera does the converging (see tube.js); scaling risers as well
      // would shrink them twice and the far end would swallow them.
      const scale = 1;
      this._e.set(it.spin, it.spin * 0.7, 0);
      this._q.setFromEuler(this._e);
      this._s.setScalar(scale * (it.type === 'bubble' && it.lit ? 1.35 : 1));
      this._m.compose(p, this._q, this._s);
      if (it.type === 'bubble') {
        this.bubbles.setMatrixAt(nb, this._m);
        const c = it.lit ? PAL.BUBBLE_LIT : PAL.BUBBLE;
        this.bubbles.setColorAt(nb, this._c.setRGB(c[0], c[1], c[2]));
        nb++;
      } else {
        this.grime.setMatrixAt(ng, this._m);
        // grime brightens as it closes, which is the only warning it gives
        this._c.setHex(it.depth < 0.3 ? PAL.GRIME_HOT : PAL.GRIME);
        this.grime.setColorAt(ng, this._c);
        ng++;
      }
    }
    this.bubbles.count = nb;
    this.grime.count = ng;
    this.bubbles.instanceMatrix.needsUpdate = true;
    this.grime.instanceMatrix.needsUpdate = true;
    if (this.bubbles.instanceColor) this.bubbles.instanceColor.needsUpdate = true;
    if (this.grime.instanceColor) this.grime.instanceColor.needsUpdate = true;
  }

  clear() {
    this.items.length = 0;
    this.bubbles.count = 0;
    this.grime.count = 0;
  }
}

// A pop: a ring that expands and fades where a bubble was taken. It is the
// only feedback that a collection HAPPENED at the place it happened — the
// score is up in the corner and nobody looks at the corner mid-run.
export class Pops {
  constructor(scene, tube) {
    this.tube = tube;
    this.live = [];
    this.geo = new THREE.RingGeometry(0.5, 0.62, 18);
    this.pool = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(
        this.geo,
        new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }),
      );
      m.visible = false;
      tube.group.add(m);
      this.pool.push(m);
    }
  }

  at(lane, depth, color) {
    const m = this.pool.find(x => !x.visible);
    if (!m) return;
    m.visible = true;
    m.material.color.setRGB(color[0], color[1], color[2]);
    this.tube.at(lane, Math.max(depth, 0), m.position);
    m.lookAt(0, 0, m.position.z + 10);
    this.live.push({ m, t: 0, base: 1 });
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.t += dt;
      const k = p.t / 0.42;
      if (k >= 1) { p.m.visible = false; this.live.splice(i, 1); continue; }
      p.m.scale.setScalar(p.base * (0.5 + k * 3.4));
      p.m.material.opacity = 1 - k;
    }
  }

  clear() {
    for (const p of this.live) p.m.visible = false;
    this.live.length = 0;
  }
}

// THE SCUM LINE. Grime that reaches the mouth settles here: a film on the rim,
// lane by lane, up to three layers deep. It is Tempest's spikes with the gun
// taken out, the same way grime is its flipper — what you did not deal with
// stays on the web and makes the web worse.
//
// Scum does three things, none of them a bullet: it is STICKY (riding through
// it is slow — jumping over it is not, which is what the float is for),
// it is BARREN (the director will not raise bubbles through a fouled lane, so
// neglect starves the chain), and past FLOOD_AT coverage the channel floods —
// a life, the chain, and a clean start. The only thing that takes it off is
// the dive: Suds Jack washes. That is the whole rebalance — the dive stops
// being a garnish and becomes the verb the game is named after.
export const SCUM_MAX = 3;      // layers a lane can hold
export const FLOOD_AT = 0.8;    // fouled fraction of lanes that floods
export const STICKY = 0.4;      // rim speed multiplier standing in it

export class Scum {
  constructor(scene, tube) {
    this.tube = tube;
    this.layers = new Array(tube.lanes).fill(0);

    // one flat pad per lane, lying on the floor at the mouth, darkening and
    // thickening as layers stack — matte and warm like everything that wants
    // you; scum has never bloomed in its life
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.06, 0.34, 2.4),
      new THREE.MeshBasicMaterial({ flatShading: true }),
      tube.lanes,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    tube.group.add(this.mesh);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
    this._p = new THREE.Vector3();
  }

  laneOf(lane) { return Math.max(0, Math.min(this.tube.lanes - 1, Math.round(lane))); }

  /** One more layer where this grime came to rest. */
  add(lane) {
    const l = this.laneOf(lane);
    this.layers[l] = Math.min(SCUM_MAX, this.layers[l] + 1);
    this._draw();
  }

  /** The dive's return leg wipes one layer. True if there was one to wipe. */
  scrub(lane) {
    const l = this.laneOf(lane);
    if (this.layers[l] <= 0) return false;
    this.layers[l]--;
    this._draw();
    return true;
  }

  at(lane) { return this.layers[this.laneOf(lane)]; }
  fouled() { return this.layers.reduce((n, l) => n + (l > 0 ? 1 : 0), 0); }
  clean() { return this.tube.lanes - this.fouled(); }
  coverage() { return this.fouled() / this.tube.lanes; }
  flooded() { return this.coverage() >= FLOOD_AT; }

  clear() {
    this.layers.fill(0);
    this._draw();
  }

  _draw() {
    let n = 0;
    for (let l = 0; l < this.layers.length; l++) {
      const k = this.layers[l];
      if (!k) continue;
      this.tube.at(l, 0.012, this._p);
      this._e.set(0, 0, this.tube.faceAngle(l));
      this._q.setFromEuler(this._e);
      // thicker as it stacks, never taller than it is wide: a film, not a wall
      this._s.set(1, 0.6 + k * 0.5, 1);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(n, this._m);
      this._c.setHex(k >= SCUM_MAX ? PAL.GRIME_DARK : PAL.GRIME);
      this.mesh.setColorAt(n, this._c);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
