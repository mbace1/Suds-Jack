// juice.js — the arcade light on top of the jelly: every bullet a small
// comet, sparks where a shot lands, a flash and a ring where a gel dies.
//
// Owner, 2026-10-22: the graphics pass in order: jelly, then this, then the
// arena's light. The owner prefers colour over bloom, so there is no
// screen-wide bloom pass: each glow is drawn in world space, additively, in
// the colour of whatever made it, and stays inside its own small quad.
//
// Three instanced draws carry all of it, each a flat quad on the floor's
// plane with a fixed shape in its shader:
//   glows   — a round soft falloff: the halo round every bullet, the flash
//             of a kill
//   streaks — bright at the head, gone at the tail: every bullet's trail,
//             and the sparks thrown off a hit
//   rings   — a thin band: the ring a kill sends across the floor
// A per-instance fade is folded into the instance colour; with additive
// blending a darker colour is a fainter glow.
//
// Reads the world and its events, never writes them. Every number is
// TUNING.juice.
import * as THREE from 'three/webgpu';
import { uv, float, vec2, length, smoothstep, clamp, abs, pow } from 'three/tsl';
import { TUNING } from '../tuning.js?v=68';

const T = TUNING, J = T.juice;
const rand = (a, b) => a + Math.random() * (b - a);
const _white = new THREE.Color(0xffffff);

function quadMesh(cap, opacityNode) {
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);   // in the floor's plane; uv.x runs along +x
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  mat.opacityNode = opacityNode;
  const m = new THREE.InstancedMesh(geo, mat, cap);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.setColorAt(0, new THREE.Color());
  m.count = 0; m.frustumCulled = false; m.renderOrder = 2;
  return m;
}

export class Juice {
  constructor(scene) {
    const d = length(uv().sub(vec2(0.5, 0.5))).mul(2);   // 0 at the centre, 1 at the edge of the quad
    this.glows = quadMesh(J.glowCap, pow(clamp(float(1).sub(d), 0, 1), float(J.glowPow)));
    const across = clamp(float(1).sub(abs(uv().y.sub(0.5)).mul(2)), 0, 1);
    this.streaks = quadMesh(J.streakCap, pow(across, float(1.5)).mul(pow(uv().x, float(2))));
    this.rings = quadMesh(J.ringCap, smoothstep(float(0.72), float(0.86), d).mul(float(1).sub(smoothstep(float(0.9), float(1), d))));
    scene.add(this.glows, this.streaks, this.rings);
    this.sparks = [];   // { x, y, z, vx, vz, life, max, hex }
    this.flashes = [];  // { x, y, z, r, life, max, hex }
    this.waves = [];    // { x, z, r0, r1, life, max, hex }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this._c = new THREE.Color(); this._up = new THREE.Vector3(0, 1, 0);
  }

  onEvent(e, w) {
    if (e.type === 'hit') {
      // sparks spray back out of the body, away from its centre: thrown into
      // it, half of them were hidden by the jelly they came off
      const S = J.spark, hex = T.species[e.kind]?.color ?? 0xffffff, g = w?.gels.find((q) => q.id === e.id);
      const out = g ? Math.atan2(e.z - g.z, e.x - g.x) : Math.random() * Math.PI * 2;
      for (let i = 0; i < S.count && this.sparks.length < S.max; i++) {
        const a = out + (Math.random() * 2 - 1) * S.spread, sp = rand(...S.speed), life = rand(...S.life);
        this.sparks.push({ x: e.x, y: S.y, z: e.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, life, max: life, hex });
      }
    } else if (e.type === 'kill') {
      const F = J.flash, W = J.ring, size = e.boss ? W.boss : e.big ? W.big : W.small;
      if (this.flashes.length < F.max) this.flashes.push({ x: e.x, y: e.r * F.y, z: e.z, r: e.r * F.r, life: F.life, max: F.life, hex: e.color });
      if (this.waves.length < W.max) this.waves.push({ x: e.x, z: e.z, r0: e.r * W.from, r1: e.r * size, life: W.life, max: W.life, hex: e.color });
    } else if (e.type === 'dashBoom') {
      const W = J.ring;
      if (this.waves.length < W.max) this.waves.push({ x: e.x, z: e.z, r0: W.dashFrom, r1: W.dashTo, life: W.life, max: W.life, hex: T.hero.dashBoom.color });
    }
  }

  step(dt) {
    const S = J.spark;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
      const k = Math.max(0, 1 - S.drag * dt);
      s.vx *= k; s.vz *= k; s.x += s.vx * dt; s.z += s.vz * dt;
    }
    for (const list of [this.flashes, this.waves]) {
      for (let i = list.length - 1; i >= 0; i--) if ((list[i].life -= dt) <= 0) list.splice(i, 1);
    }
  }

  // one quad: centre (x, y, z), length along the heading (dx, dz), width
  _put(mesh, n, x, y, z, dx, dz, len, wid, hex, fade, white = 0) {
    this._q.setFromAxisAngle(this._up, Math.atan2(-dz, dx));
    this._m.compose(this._p.set(x, y, z), this._q, this._s.set(len, 1, wid));
    mesh.setMatrixAt(n, this._m);
    mesh.setColorAt(n, this._c.setHex(hex).lerp(_white, white).multiplyScalar(fade));
  }

  sync(w, alpha, bulletY) {
    const G = J.bullet;
    let ng = 0, ns = 0;
    // every bullet: a halo round it and a trail behind it. The gels' shots
    // glow harder than yours: they are the ones you have to read
    for (const bl of w.bullets) {
      if (ng >= J.glowCap || ns >= J.streakCap) break;
      const x = bl.px + (bl.x - bl.px) * alpha, z = bl.pz + (bl.z - bl.pz) * alpha;
      const P = bl.hero ? G.hero : G.gel, sp = Math.hypot(bl.vx, bl.vz) || 1;
      this._put(this.glows, ng++, x, bulletY, z, 1, 0, bl.r * P.halo, bl.r * P.halo, bl.color, P.haloAlpha, P.white);
      const len = Math.min(P.trailMax, sp * P.trail);
      if (len > 0.02) {
        const ux = bl.vx / sp, uz = bl.vz / sp;
        this._put(this.streaks, ns++, x - ux * len * 0.5, bulletY, z - uz * len * 0.5, ux, uz, len, bl.r * P.width, bl.color, P.trailAlpha, P.white);
      }
    }
    // sparks: a short bright streak along its own flight, fading with its life
    const S = J.spark;
    for (const s of this.sparks) {
      if (ns >= J.streakCap) break;
      const t = s.life / s.max, sp = Math.hypot(s.vx, s.vz) || 1;
      this._put(this.streaks, ns++, s.x, s.y, s.z, s.vx / sp, s.vz / sp, Math.max(0.05, sp * S.len), S.width, s.hex, S.alpha * t, S.white);
    }
    // a kill's flash: a hot disc that swells a little and is gone in a blink
    const F = J.flash;
    for (const f of this.flashes) {
      if (ng >= J.glowCap) break;
      const t = f.life / f.max, r = f.r * (1 + F.swell * (1 - t));
      this._put(this.glows, ng++, f.x, f.y, f.z, 1, 0, r * 2, r * 2, f.hex, F.alpha * t * t, F.white);
    }
    // a kill's ring: out across the floor fast, then slowing as it fades
    const W = J.ring;
    let nr = 0;
    for (const v of this.waves) {
      if (nr >= J.ringCap) break;
      const t = 1 - v.life / v.max, e = 1 - (1 - t) * (1 - t), r = v.r0 + (v.r1 - v.r0) * e;
      this._put(this.rings, nr++, v.x, W.y, v.z, 1, 0, r * 2, r * 2, v.hex, W.alpha * (1 - t), W.white);
    }
    for (const [m, n] of [[this.glows, ng], [this.streaks, ns], [this.rings, nr]]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  reset() { this.sparks.length = 0; this.flashes.length = 0; this.waves.length = 0; }
}
