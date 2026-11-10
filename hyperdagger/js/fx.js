import * as THREE from 'three';
import { Particles, KIND } from './fx-particles.js?v=1';
import { FloorFluid } from './fx-fluid.js?v=1';

/**
 * v61 (HD-022) THE LOOK. What a fight looks like, declared by the season.
 *
 * main.js says WHAT HAPPENED (a kill here, a nail struck there, a jump); this
 * module says what that looks like, and the answer is the season's: `fx.style`
 * in seasons.js picks a recipe book — `fire` (EMBER: sparks that bounce, smoke
 * lit from below), `water` (INCA: droplets, rings, gold dust) or `road` (HAUL:
 * fireballs and smoke swept back at road speed) — and the season's own colours
 * fill it in. A season with no `fx` gets nothing, which is VOID, the control.
 *
 * NOTHING HERE TOUCHES THE GAME. No rule reads a particle; the dice are this
 * module's own (`rnd`), so a seeded run plays the same with the look on or off.
 */

const { SPARK, EMBER, SMOKE, DROP, FLASH, RING, STREAK, MOTE } = KIND;

// the look's own dice: visuals must never move the run's rng or Math.random
let _s = 0x9e3779b9;
function rnd() { _s ^= _s << 13; _s ^= _s >>> 17; _s ^= _s << 5; return ((_s >>> 0) / 4294967296); }
const rr = (a, b) => a + (b - a) * rnd();
const sgn = () => rnd() - 0.5;

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _cam = new THREE.Vector3();
const ZERO = [0, 0, 0];

const G = 17;   // what falls, falls at the sparks' gravity

export class Look {
  /** @param {THREE.Scene} scene  @param {number} R  the disc's radius */
  constructor(scene, R = 26) {
    this.P = new Particles(scene);
    this.fluid = new FloorFluid(R);
    this.R = R;
    this.floor = null;          // the floor shader's uniforms (bindFloor)
    this.lights = [0, 1, 2, 3].map(() => ({ x: 0, z: 0, r: 1, k: 0, life: 0, max: 1, rgb: [0, 0, 0] }));
    this.pools = [];            // where fire is lying, for the embers it gives off
    this._stepAcc = 0;
    this.def = null;            // the season's fx declaration
    this.style = null;
    this.on = true;             // the pause menu's switch
    this.tier = 0;
    this.inherit = new THREE.Vector3();   // the frame's carried velocity (the road)
    this._camPrev = new THREE.Vector3();
    this._camVel = new THREE.Vector3();
    this._hasCam = false;
    this.counts = { kill: 0, hit: 0, muzzle: 0, trail: 0, jump: 0, land: 0, dash: 0, gem: 0, shock: 0, crest: 0, clink: 0, struck: 0 };
    this._trailAcc = 0;
  }

  get active() { return this.on && !!this.def; }

  /** The floor shader's uniforms: the field and the four event lights live there. */
  bindFloor(uniforms) {
    this.floor = uniforms;
    uniforms.uFluidK.value = this.fluid.floorK;
  }

  /** A season's look. `fog` is the scene's, so smoke melts into the same distance. */
  setSeason(def, fog, floorY = 0, disc = true) {
    this.def = def ?? null;
    this.style = def?.style ?? null;
    this.disc = disc;
    this.pools.length = 0;
    for (const l of this.lights) l.life = 0;
    // the liquid, if this season has a floor to hold one
    const fl = disc && this.on ? def?.fluid : null;
    this.fluid.setEnabled(this.tier < 4);
    this.fluid.setMode(fl?.kind ?? null, fl ?? {});
    if (this.floor && fl) {
      this.floor.uFluidA.value.setRGB(...(fl.a ?? [1, 1, 1]));
      this.floor.uFluidB.value.setRGB(...(fl.b ?? [0, 0, 0]));
      this.fluid.floorK.y = fl.strength ?? 1;
    }
    const u = this.P.uniforms;
    u.uFloor.value = floorY;
    if (fog) { u.uFogCol.value.setRGB(...fog.color); u.uFogRange.value.set(fog.near, fog.far * 1.6); }
    u.uGlow.value.setRGB(...(def?.glow ?? ZERO));
    u.uWind.value.set(...(def?.wind ?? ZERO));
    this.P.setVisible(this.active);
    this.P.clear();
    this._seedAmbient();
  }

  setOn(on) {
    if (this.on === !!on) return;
    this.on = !!on;
    this.P.setVisible(this.active);
    this._seedAmbient();
    const fl = this.disc && this.on ? this.def?.fluid : null;
    this.fluid.setMode(fl?.kind ?? null, fl ?? {});
  }

  /** Perf tiers: 0 is everything, 4 is a third of the bursts and no ambient. */
  setTier(t) {
    if (this.tier === t && this._tiered) return;
    this._tiered = true;
    this.tier = t;
    this.P.budget = [1, 0.8, 0.6, 0.42, 0.28][t] ?? 0.28;
    this.P.setLimits([4096, 3072, 2048, 1280, 768][t] ?? 768, [2048, 1536, 1024, 640, 384][t] ?? 384);
    this.fluid.setEnabled(t < 4);   // the floor tier draws a plain floor
    this._seedAmbient();
  }

  _seedAmbient() {
    const a = this.def?.ambient;
    const P = this.P;
    if (!a || !this.active || this.tier >= 4) { P.ambient(0, () => {}); return; }
    const box = a.box ?? [44, 12, 44];
    P.uniforms.uBox.value.set(...box);
    const c = a.color, c2 = a.color2 ?? a.color;
    P.ambient(a.n, () => {
      const m = rnd() < (a.mix ?? 0.3) ? c2 : c;
      const k = rr(0.55, 1.25);
      P.emit(MOTE, sgn() * box[0], rnd() * box[1], sgn() * box[2],
        sgn() * (a.drift ?? 0.3), (a.rise ?? 0) * rr(0.5, 1.5), sgn() * (a.drift ?? 0.3),
        rr(5, 11), (a.size ?? 0.035) * rr(0.7, 1.5), m[0] * k, m[1] * k, m[2] * k,
        a.stretch ?? 0, a.twinkle ?? 0.6);
    });
  }

  clear() { this.P.clear(); this.fluid.reset(); this.pools.length = 0; for (const l of this.lights) l.life = 0; }

  /** Per frame: the clock, and how fast the camera is moving through the air. */
  update(dt, camera, renderer) {
    if (renderer && this.active) this.fluid.step(renderer, dt);
    if (this.floor) {
      this.floor.uFluid.value = this.fluid.texture;
      for (let i = 0; i < 4; i++) {
        const l = this.lights[i];
        if (l.life > 0) l.life -= dt;
        const k = l.life > 0 ? l.k * (l.life / l.max) : 0;
        this.floor.uLit.value[i].set(l.x, l.z, l.r, k);
        if (k > 0) this.floor.uLitCol.value[i].setRGB(l.rgb[0], l.rgb[1], l.rgb[2]);
      }
    }
    if (this.active) this._poolEmbers(dt);
    if (camera) {
      camera.getWorldPosition(_cam);
      if (this._hasCam && dt > 1e-4) {
        _v.copy(_cam).sub(this._camPrev).divideScalar(dt);
        if (_v.lengthSq() > 200 * 200) _v.set(0, 0, 0);     // a teleport is not a speed
        this._camVel.lerp(_v, Math.min(1, dt * 8));
      }
      this._camPrev.copy(_cam); this._hasCam = true;
      this.P.uniforms.uCamVel.value.copy(this._camVel);
    }
    // on the road everything rides the convoy: a spark thrown off a kill keeps
    // the speed you are doing, and only the smoke (which drags) is left behind
    const carry = this.def?.carry ?? 0;
    this.inherit.set(this._camVel.x * carry, 0, this._camVel.z * carry);
    this.P.update(dt);
  }

  setView(w, h) { this.P.uniforms.uView.value.set(w, h); }

  // ------------------------------------------------------------------ events

  /** A body died at `c`, struck along `dir`. `r` is its radius; heavy ones are louder. */
  kill(c, dir, r = 0.8, heavy = false) {
    if (!this.active) return;
    this.counts.kill++;
    const P = this.P, d = this.def, s = Math.max(0.6, r), iv = this.inherit;
    const f = d.flash ?? d.spark, a = d.spark, b = d.spark2 ?? d.spark;
    const big = heavy ? 1.8 : 1;
    this.light(c.x, c.z, 6.5 * s * big, f, 1.1, 0.3);
    this._spill(c, dir, s * big);
    P.emit(FLASH, c.x, c.y, c.z, iv.x, iv.y, iv.z, 0.12, 1.5 * s * big, f[0], f[1], f[2]);
    P.emit(FLASH, c.x, c.y, c.z, iv.x, iv.y, iv.z, 0.34, 2.8 * s * big, b[0] * 0.22, b[1] * 0.22, b[2] * 0.22);
    if (this.style === 'water') {
      const dr = d.drop, dr2 = d.drop2 ?? d.drop;
      for (let i = P.count(36 * big); i > 0; i--) {
        const m = rnd() < 0.3 ? dr2 : dr, an = rnd() * 6.2832, h = rr(0.8, 5.5);
        P.emit(DROP, c.x + sgn() * s, c.y + sgn() * s, c.z + sgn() * s,
          Math.cos(an) * h + dir.x * 2.5, rr(2.5, 9), Math.sin(an) * h + dir.z * 2.5,
          rr(1.2, 2.0), rr(0.035, 0.085), m[0], m[1], m[2], 15, 0);
      }
      for (let i = P.count(2 * big); i > 0; i--) {
        const m = d.smoke;
        P.emit(SMOKE, c.x + sgn() * s, c.y + sgn() * s * 0.6, c.z + sgn() * s, sgn() * 2.4, rr(0.3, 1.6), sgn() * 2.4,
          rr(0.45, 0.8), rr(0.16, 0.3) * s, m[0], m[1], m[2], 0.35, 1.0);
      }
      for (let i = P.count(9 * big); i > 0; i--)
        P.emit(EMBER, c.x + sgn() * s, c.y + sgn() * s, c.z + sgn() * s, sgn() * 4, rr(0.5, 3.5), sgn() * 4,
          rr(0.9, 1.8), rr(0.025, 0.045), a[0], a[1], a[2], -0.5, 0);
      return;
    }
    // fire and road: sparks that bounce, embers that hang, smoke lit from below
    const road = this.style === 'road';
    for (let i = P.count((road ? 30 : 34) * big); i > 0; i--) {
      const m = rnd() < 0.35 ? b : a, k = rr(0.7, 1.3);
      _n.set(sgn(), sgn(), sgn()).normalize().multiplyScalar(rr(2.5, 11));
      P.emit(SPARK, c.x + sgn() * s * 0.6, c.y + sgn() * s * 0.6, c.z + sgn() * s * 0.6,
        _n.x + dir.x * rr(1, 6) + iv.x, _n.y + rr(0.5, 3.5) + iv.y, _n.z + dir.z * rr(1, 6) + iv.z,
        rr(0.45, 1.25), rr(0.028, 0.065), m[0] * k, m[1] * k, m[2] * k, 17, 0.42);
    }
    for (let i = P.count(11 * big); i > 0; i--) {
      const k = rr(0.6, 1.2);
      P.emit(EMBER, c.x + sgn() * s, c.y + sgn() * s, c.z + sgn() * s, sgn() * 5 + iv.x, rr(0, 3) + iv.y, sgn() * 5 + iv.z,
        rr(1.1, 2.6), rr(0.022, 0.04), a[0] * k, a[1] * k, a[2] * k, rr(0.4, 1.3), 0);
    }
    const sm = d.smoke;
    for (let i = P.count((road ? 9 : 6) * big); i > 0; i--)
      P.emit(SMOKE, c.x + sgn() * s * 0.8, c.y + sgn() * s * 0.5, c.z + sgn() * s * 0.8,
        sgn() * 2.6 + dir.x * 1.5 + iv.x * 0.6, rr(0.2, 1.8), sgn() * 2.6 + dir.z * 1.5 + iv.z * 0.6,
        rr(0.8, road ? 1.3 : 1.7), rr(0.32, 0.62) * s, sm[0], sm[1], sm[2], rr(0.5, 1.0), road ? 1.6 : 1.1);
    if (road) for (let i = P.count(7 * big); i > 0; i--) {
      _n.set(sgn(), sgn() * 0.6 + 0.2, sgn()).normalize().multiplyScalar(rr(14, 30));
      P.emit(STREAK, c.x, c.y, c.z, _n.x + iv.x, _n.y, _n.z + iv.z, rr(0.12, 0.22), 0.03, f[0], f[1], f[2], 0.05);
    }
    if (c.y < 5 && !road) P.emit(RING, c.x, 0.04, c.z, 0, 0, 0, 0.36, 2.3 * s * big, b[0], b[1], b[2]);
  }

  /** A projectile struck a body at `p`, travelling along `dir`. */
  hit(p, dir, lethal = false) {
    if (!this.active) return;
    this.counts.hit++;
    const P = this.P, d = this.def, iv = this.inherit, a = d.spark, f = d.flash ?? d.spark;
    P.emit(FLASH, p.x, p.y, p.z, iv.x, iv.y, iv.z, 0.07, lethal ? 0.7 : 0.42, f[0], f[1], f[2]);
    // a wound drips: a little of the body reaches the floor under it
    const fk = d.fluid?.kind;
    if (fk === 'magma') this.fluid.splat(p.x + sgn() * 0.5, p.z + sgn() * 0.5, 0.3, 0.55, Math.sqrt(2 * Math.max(p.y, 0) / G));
    else if (fk === 'water') this.fluid.splat(p.x + sgn() * 0.6, p.z + sgn() * 0.6, 0.5, -0.12, Math.sqrt(2 * Math.max(p.y, 0) / G));
    if (this.style === 'water') {
      const dr = d.drop;
      for (let i = P.count(6); i > 0; i--)
        P.emit(DROP, p.x, p.y, p.z, -dir.x * rr(1, 4) + sgn() * 3, rr(1, 5), -dir.z * rr(1, 4) + sgn() * 3,
          rr(0.7, 1.2), rr(0.03, 0.06), dr[0], dr[1], dr[2], 15, 0);
      for (let i = P.count(3); i > 0; i--)
        P.emit(EMBER, p.x, p.y, p.z, sgn() * 3, rr(0, 2), sgn() * 3, rr(0.4, 0.9), 0.03, a[0], a[1], a[2], -0.4, 0);
      return;
    }
    for (let i = P.count(7); i > 0; i--) {
      // back off the surface, in a cone about the way the nail came
      const k = rr(0.7, 1.3);
      P.emit(SPARK, p.x, p.y, p.z, -dir.x * rr(2, 8) + sgn() * 5 + iv.x, rr(0.5, 5) + iv.y, -dir.z * rr(2, 8) + sgn() * 5 + iv.z,
        rr(0.22, 0.6), rr(0.022, 0.045), a[0] * k, a[1] * k, a[2] * k, 17, 0.4);
    }
  }

  /** A projectile struck rock, a slab or the heap: sparks and a breath of dust. */
  clink(p) {
    if (!this.active) return;
    this.counts.clink++;
    const P = this.P, d = this.def, a = d.spark, sm = d.dust ?? d.smoke;
    for (let i = P.count(5); i > 0; i--)
      P.emit(SPARK, p.x, p.y, p.z, sgn() * 6, rr(0.5, 5), sgn() * 6, rr(0.2, 0.5), rr(0.02, 0.04), a[0], a[1], a[2], 17, 0.4);
    if (sm) P.emit(SMOKE, p.x, p.y, p.z, sgn(), 0.4, sgn(), 0.5, 0.16, sm[0], sm[1], sm[2], 0.3, 1.5);
  }

  /** A shot left the hand at `p` along `dir`. `launch` is a missile leaving. */
  muzzle(p, dir, launch = false) {
    if (!this.active) return;
    this.counts.muzzle++;
    const P = this.P, d = this.def, f = d.flash ?? d.spark, a = d.spark;
    P.emit(FLASH, p.x, p.y, p.z, dir.x * 2, dir.y * 2, dir.z * 2, launch ? 0.1 : 0.045, launch ? 0.5 : 0.13, f[0], f[1], f[2]);
    this.light(p.x + dir.x * 1.5, p.z + dir.z * 1.5, launch ? 5 : 3.2, f, launch ? 0.7 : 0.28, 0.07, 3);   // the shot lights the floor ahead of the hand
    if (launch) {
      const sm = d.smoke;
      for (let i = P.count(4); i > 0; i--)
        P.emit(SMOKE, p.x, p.y, p.z, -dir.x * rr(1, 3) + sgn(), sgn(), -dir.z * rr(1, 3) + sgn(), rr(0.4, 0.8), 0.14, sm[0], sm[1], sm[2], 0.4, 2.2);
    } else if (rnd() < 0.5 * P.budget) {
      P.emit(SPARK, p.x, p.y, p.z, dir.x * rr(8, 16) + sgn() * 3, dir.y * rr(8, 16) + rr(0, 2), dir.z * rr(8, 16) + sgn() * 3,
        rr(0.12, 0.3), 0.022, a[0], a[1], a[2], 12, 0.3);
    }
  }

  /**
   * The projectiles in flight this frame. A nail leaves hot pixels, a shard a
   * glint, a missile a flame and the smoke that makes it a missile.
   */
  trails(active, dt) {
    if (!this.active || !active.length) return;
    const P = this.P, d = this.def, t = d.trail;
    if (!t) return;
    this._trailAcc += dt;
    const step = t.every ?? 0.016;
    if (this._trailAcc < step) return;
    this._trailAcc = 0;
    const c = t.color ?? d.spark, sm = d.smoke, chance = (t.chance ?? 1) * P.budget;
    for (let i = 0; i < active.length; i++) {
      if (rnd() > chance) continue;
      const m = active[i].m.position, v = active[i].vel;
      this.counts.trail++;
      if (t.kind === 'missile') {
        P.emit(FLASH, m.x, m.y, m.z, v.x * 0.9, v.y * 0.9, v.z * 0.9, 0.05, 0.16, c[0], c[1], c[2]);
        P.emit(SMOKE, m.x - v.x * 0.012, m.y - v.y * 0.012, m.z - v.z * 0.012, v.x * 0.12 + sgn() * 0.6, v.y * 0.12 + sgn() * 0.6, v.z * 0.12 + sgn() * 0.6,
          rr(0.5, 0.9), rr(0.07, 0.11), sm[0], sm[1], sm[2], 0.25, 3.2);
      } else {
        P.emit(EMBER, m.x, m.y, m.z, v.x * 0.08 + sgn() * 0.5, v.y * 0.08 + sgn() * 0.5, v.z * 0.08 + sgn() * 0.5,
          rr(0.12, 0.28), t.size ?? 0.026, c[0], c[1], c[2], 0, 0);
      }
    }
  }

  /** The feet left the floor at (x, y, z). */
  jump(x, y, z) { if (this.active) { this.counts.jump++; this._feet(x, y, z, 0.6); } }
  /** …and came back to it, `speed` units a second downward. */
  land(x, y, z, speed = 6) { if (this.active) { this.counts.land++; this._feet(x, y, z, Math.min(2, 0.5 + speed / 9)); } }

  _feet(x, y, z, k) {
    const P = this.P, d = this.def;
    if (d.fluid?.kind === 'water' && y < 0.3) this.fluid.splat(x, z, 0.9 + 0.5 * k, -0.22 * k);
    if (this.style === 'water') {
      const dr = d.drop;
      for (let i = P.count(9 * k); i > 0; i--) {
        const an = rnd() * 6.2832, h = rr(1, 3.2) * k;
        P.emit(DROP, x, y + 0.1, z, Math.cos(an) * h, rr(1.5, 4.5) * k, Math.sin(an) * h, 1.2, rr(0.03, 0.06), dr[0], dr[1], dr[2], 15, 0);
      }
      return;
    }
    const sm = d.dust ?? d.smoke, a = d.spark, iv = this.inherit;
    for (let i = P.count(6 * k); i > 0; i--) {
      const an = rnd() * 6.2832, h = rr(1.2, 3) * k;
      P.emit(SMOKE, x + Math.cos(an) * 0.3, y + 0.12, z + Math.sin(an) * 0.3, Math.cos(an) * h + iv.x * 0.5, rr(0.1, 0.6), Math.sin(an) * h + iv.z * 0.5,
        rr(0.4, 0.75), rr(0.12, 0.22), sm[0], sm[1], sm[2], 0.15, 1.6);
    }
    if (this.style === 'road' || k > 1.1) for (let i = P.count(5 * k); i > 0; i--) {
      const an = rnd() * 6.2832;
      P.emit(SPARK, x, y + 0.05, z, Math.cos(an) * rr(2, 6) + iv.x, rr(1, 3.5), Math.sin(an) * rr(2, 6) + iv.z, rr(0.2, 0.5), 0.025, a[0], a[1], a[2], 17, 0.35);
    }
  }

  /** A dash from `p` along (dx, dz): lines of light left standing in the air. */
  dash(p, dx, dz) {
    if (!this.active) return;
    this.counts.dash++;
    const P = this.P, d = this.def, c = d.streak ?? d.spark;
    for (let i = P.count(16); i > 0; i--) {
      const ox = sgn() * 2.4, oy = rr(0.2, 2.4), oz = sgn() * 2.4;
      P.emit(STREAK, p.x + ox + dx * rr(0, 3), p.y + oy, p.z + oz + dz * rr(0, 3), -dx * rr(5, 12), 0, -dz * rr(5, 12),
        rr(0.14, 0.3), rr(0.012, 0.022), c[0] * 0.6, c[1] * 0.6, c[2] * 0.6, 0.09);
    }
  }

  /** A gem went into the hand. `n` of them at once is a level. */
  gem(p, level = false) {
    if (!this.active) return;
    this.counts.gem++;
    const P = this.P, d = this.def, g = d.gem ?? [2.6, 0.2, 0.2];
    for (let i = P.count(level ? 44 : 5); i > 0; i--) {
      const an = rnd() * 6.2832, h = level ? rr(1.5, 6) : rr(0.5, 2);
      P.emit(EMBER, p.x + Math.cos(an) * 0.3, p.y + rr(-0.6, 0.2), p.z + Math.sin(an) * 0.3, Math.cos(an) * h, rr(0.5, level ? 5 : 2), Math.sin(an) * h,
        rr(0.35, level ? 1.4 : 0.7), rr(0.02, 0.04), g[0], g[1], g[2], level ? 1.6 : 0.6, 0);
    }
    if (level) {
      P.emit(RING, p.x, Math.max(0.04, p.y - 1.5), p.z, 0, 0, 0, 0.5, 4.5, g[0], g[1], g[2]);
      P.emit(FLASH, p.x, p.y, p.z, 0, 0, 0, 0.2, 2.2, g[0], g[1], g[2]);
    }
  }

  /** A heavy blow on the floor at `p`: rings, and the dust they push. */
  shock(p, k = 1) {
    if (!this.active) return;
    this.counts.shock++;
    const P = this.P, d = this.def, b = d.spark2 ?? d.spark, sm = d.dust ?? d.smoke, water = this.style === 'water';
    const c = water ? d.drop : b;
    this.light(p.x, p.z, 11 * k, d.flash ?? d.spark, 0.9, 0.4);
    if (d.fluid?.kind === 'water') this.fluid.splat(p.x, p.z, 2.6 * k, -0.9 * k);
    P.emit(RING, p.x, 0.05, p.z, 0, 0, 0, 0.5, 6 * k, c[0], c[1], c[2]);
    P.emit(RING, p.x, 0.05, p.z, 0, 0, 0, 0.75, 8.5 * k, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 0, 0, rnd(), 0.1);
    for (let i = P.count(18 * k); i > 0; i--) {
      const an = rnd() * 6.2832, h = rr(4, 9) * k;
      if (water) P.emit(DROP, p.x + Math.cos(an), 0.15, p.z + Math.sin(an), Math.cos(an) * h * 0.6, rr(3, 8), Math.sin(an) * h * 0.6, 1.5, rr(0.04, 0.08), c[0], c[1], c[2], 15, 0);
      else P.emit(SMOKE, p.x + Math.cos(an) * 0.6, 0.2, p.z + Math.sin(an) * 0.6, Math.cos(an) * h, rr(0.2, 1), Math.sin(an) * h, rr(0.6, 1.1), rr(0.2, 0.4), sm[0], sm[1], sm[2], 0.3, 1.5);
    }
  }

  /** The player was struck: the hit, in the season's colour, close to the eye. */
  struck(p) {
    if (!this.active) return;
    this.counts.struck++;
    const P = this.P, g = this.def.gem ?? [2.6, 0.2, 0.2];
    for (let i = P.count(22); i > 0; i--)
      P.emit(SPARK, p.x + sgn(), p.y + sgn() * 0.8, p.z + sgn(), sgn() * 9, rr(0, 6), sgn() * 9, rr(0.3, 0.8), rr(0.025, 0.05), g[0], g[1], g[2], 14, 0.4);
  }

  /** A telegraph column at `p` for `delay` seconds: motes climbing the beam. */
  telegraph(p, rgb, delay) {
    if (!this.active) return;
    const P = this.P;
    for (let i = P.count(10); i > 0; i--)
      P.emit(EMBER, p.x + sgn() * 0.5, rr(0.1, 1.2), p.z + sgn() * 0.5, 0, 0, 0, Math.max(0.3, delay) * rr(0.7, 1.1), 0.03,
        rgb[0] * 0.5, rgb[1] * 0.5, rgb[2] * 0.5, rr(2, 5), 0, rnd(), rnd() * delay * 0.4);
  }

  /**
   * INCA's crest, each frame: spray thrown forward off the lip and mist left
   * behind it. (dirX, dirZ) is the wave's travel, `head` where the crest is
   * along it, `R` the disc.
   */
  crest(dirX, dirZ, head, height, R, dt) {
    if (!this.active || this.style !== 'water') return;
    const P = this.P, d = this.def, dr = d.drop, sm = d.smoke;
    let n = P.count(dt * 150);
    while (n-- > 0) {
      const across = sgn() * 2 * R;
      const x = dirX * head - dirZ * across, z = dirZ * head + dirX * across;
      if (x * x + z * z > R * R) continue;
      this.counts.crest++;
      if (rnd() < 0.72) P.emit(DROP, x, height * rr(0.7, 1.05), z, dirX * rr(1.5, 5) + sgn() * 1.5, rr(1, 4.2), dirZ * rr(1.5, 5) + sgn() * 1.5,
        1.1, rr(0.03, 0.065), dr[0], dr[1], dr[2], 15, 0);
      else P.emit(SMOKE, x, height * 0.9, z, dirX * 1.2 + sgn(), rr(0.2, 0.8), dirZ * 1.2 + sgn(), rr(0.5, 0.8), rr(0.12, 0.22), sm[0], sm[1], sm[2], 0.25, 1.0);
    }
  }

  /** One free particle for callers with their own idea (orbs, thorns). */
  puff(p, rgb, n = 6, speed = 3, life = 0.5) {
    if (!this.active) return;
    const P = this.P;
    for (let i = P.count(n); i > 0; i--)
      P.emit(EMBER, p.x, p.y, p.z, sgn() * speed * 2, sgn() * speed * 2, sgn() * speed * 2, life * rr(0.6, 1.2), 0.03, rgb[0], rgb[1], rgb[2], 0.3, 0);
  }

  // ------------------------------------------------------------- the floor

  /** Light the floor round (x, z) for `life` seconds. Four at once; a new one
   *  takes the dimmest slot. `from` reserves the last slot for the muzzle. */
  light(x, z, r, rgb, k = 1, life = 0.25, slot = -1) {
    if (!this.active || !this.disc) return;
    let l = slot >= 0 ? this.lights[slot] : null;
    if (!l) {
      let best = 1e9;
      for (let i = 0; i < 3; i++) { const q = this.lights[i]; const v = q.life > 0 ? q.k * q.life / q.max : 0; if (v < best) { best = v; l = q; } }
    }
    l.x = x; l.z = z; l.r = r; l.k = k; l.life = life; l.max = life; l.rgb = rgb;
  }

  /** What a body was full of reaches the floor under where it died. */
  _spill(c, dir, s) {
    const d = this.def, fk = d.fluid?.kind;
    if (!fk || !this.disc) return;
    const fall = Math.sqrt(2 * Math.max(c.y, 0) / G);
    if (fk === 'magma') {
      // the pool, and a throw of it along the shot
      const m = d.fluid.spill ?? 1;
      this.fluid.splat(c.x, c.z, 0.75 * s, 2.4 * s * m, fall);
      for (let i = 1; i <= 3; i++)
        this.fluid.splat(c.x + dir.x * i * 0.75 * s + sgn() * 0.5, c.z + dir.z * i * 0.75 * s + sgn() * 0.5, 0.42 * s, 0.9 * s * m / i, fall + i * 0.05);
      for (let i = 0; i < 4; i++)
        this.fluid.splat(c.x + sgn() * 3.2 * s, c.z + sgn() * 3.2 * s, 0.22, 0.45 * m, fall + rr(0.05, 0.3));
      if (this.pools.length >= 10) this.pools.shift();
      this.pools.push({ x: c.x, z: c.z, r: 1.1 * s, t: 0, at: fall });
    } else {
      this.fluid.splat(c.x, c.z, 1.5 * s, -0.75 * s, fall);
      for (let i = 0; i < 6; i++)
        this.fluid.splat(c.x + sgn() * 4 * s, c.z + sgn() * 4 * s, 0.5, -0.16, fall + rr(0.1, 0.7));
    }
  }

  /** Fire lying on the floor gives off embers for as long as it is hot. */
  _poolEmbers(dt) {
    const a = this.def.spark;
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const p = this.pools[i];
      p.t += dt;
      const hot = 1 - (p.t - p.at) / 7;
      if (hot <= 0) { this.pools.splice(i, 1); continue; }
      if (p.t < p.at) continue;
      if (rnd() < dt * 9 * hot * this.P.budget) {
        const an = rnd() * 6.2832, r = Math.sqrt(rnd()) * p.r, k = rr(0.5, 1.1) * hot;
        this.P.emit(EMBER, p.x + Math.cos(an) * r, 0.06, p.z + Math.sin(an) * r, sgn() * 0.5, rr(0.2, 0.9), sgn() * 0.5,
          rr(0.9, 2.2), rr(0.02, 0.035), a[0] * k, a[1] * k, a[2] * k, rr(0.5, 1.4), 0);
      }
    }
  }

  /** Something small met the surface at (x, z): a cube landing, a nail going in. */
  drop(x, z, k = 1) {
    if (!this.active || !this.disc) return;
    if (this.def.fluid?.kind === 'water') this.fluid.splat(x, z, 0.45 + 0.25 * k, -0.1 * k);
  }

  /** The feet on the ground, moving `dist` units this frame: a wake of small rings. */
  walk(x, z, dist) {
    if (!this.active || !this.disc || this.def.fluid?.kind !== 'water') return;
    this._stepAcc += dist;
    if (this._stepAcc > 1.5) { this._stepAcc = 0; this.fluid.splat(x, z, 0.6, -0.13); }
  }

  /** INCA's crest for the field: where it is, how wide, and whether it is up. */
  wave(dirX, dirZ, head, width, on) { this.fluid.setWave(dirX, dirZ, head, width, on && this.active && this.disc ? 1 : 0); }

  getState() {
    return { on: this.on, active: this.active, style: this.style, tier: this.tier, counts: { ...this.counts },
      particles: this.P.stats(), fluid: this.fluid.getState(), pools: this.pools.length,
      lights: this.lights.filter(l => l.life > 0).length };
  }
}
