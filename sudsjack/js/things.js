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
   * @returns {{collected: object[], missed: object[], struck: object[]}}
   */
  update(dt, player) {
    const collected = [], missed = [], struck = [];

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
          const d = player.lane - it.lane;
          if (Math.abs(d) > 0.5) it.lane = this.tube.clampLane(it.lane + Math.sign(d));
          it.stepIn = 0.35 + it.depth * 0.9;
        }
      }

      // Reaching the player: same lane, same depth. The lane tolerance is
      // generous because the player slides between lanes and a hit that
      // depends on a hundredth of a lane is a hit nobody can see coming.
      const gap = Math.abs(it.lane - player.lane);
      const near = gap < 0.62 && Math.abs(it.depth - player.depth) < 0.085;

      if (it.type === 'bubble') {
        if (near) { it.dead = true; collected.push(it); continue; }
        if (it.depth <= -0.02) { it.dead = true; missed.push(it); }
      } else {
        if (near) { it.dead = true; struck.push(it); continue; }
        // grime that gets past the mouth just goes over the edge; the danger
        // was the arrival, not the aftermath
        if (it.depth <= -0.05) it.dead = true;
      }
    }

    if (this.items.some(i => i.dead)) this.items = this.items.filter(i => !i.dead);
    this.relight();
    this._draw();
    return { collected, missed, struck };
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
