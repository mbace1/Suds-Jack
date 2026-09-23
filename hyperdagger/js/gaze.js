import * as THREE from 'three';

/**
 * THE GAZE LOCK — season 3's hand (owner, 2026-09-23): *no need for shoot, but
 * if you look at enemies close enough it deploys homing missiles, with
 * slightly longer look meaning faster, more targeted missiles.*
 *
 * So the aim IS the trigger. Every frame the lock asks which living enemy,
 * inside `range`, sits nearest the centre of the view inside a small `cone`.
 * Holding the look on one body builds `lockT`; its fraction of `full` is `k`,
 * and every missile launched reads `k` at the moment it leaves: a glance
 * sends a slow missile that turns lazily (it can miss), a held look sends a
 * fast one that turns hard (it will not). Switching targets starts the lock
 * again — the reward is for LOOKING AT something, not for sweeping past it.
 *
 * A look that slips off for a moment keeps its target for `grace` seconds
 * (a thumb on glass is not a tripod) but the lock does not grow while it is
 * off. Pure: it reads the camera and the enemy list and returns launches;
 * main.js turns a launch into a dagger with a target.
 */
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();

export class GazeLock {
  constructor() {
    this.cfg = null;
    this.reset();
  }

  setConfig(cfg) { this.cfg = cfg ?? null; this.reset(); }

  reset() {
    this.target = null;
    this.lockT = 0;
    this.lost = 0;
    this.cool = 0;
    this.launched = 0;
  }

  /** 0 → 1: how far the current look is toward a full lock. */
  get k() {
    const c = this.cfg;
    return c && this.target ? Math.min(1, this.lockT / c.full) : 0;
  }

  /** The launch profile at a given k — exported for the gate, so the claim
   *  "longer look = faster, more targeted" is a number it can read. */
  profile(k) {
    const c = this.cfg, lerp = (r) => r[0] + (r[1] - r[0]) * k;
    return { speed: lerp(c.speed), turn: lerp(c.turn), every: lerp(c.every) };
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} eye     camera position
   * @param {THREE.Vector3} fwd     camera forward, unit
   * @param {Array} enemies         the live enemy list (e.center(v), e.alive)
   * @returns {Array<{target, speed, turn, k}>} missiles to launch this frame
   */
  update(dt, eye, fwd, enemies) {
    const c = this.cfg;
    const out = [];
    if (!c) return out;
    // who is under the look right now
    let best = null, bestDot = Math.cos(c.cone);
    for (const e of enemies) {
      if (!e.alive) continue;
      e.center(_c);
      _d.copy(_c).sub(eye);
      const dist = _d.length();
      if (dist > c.range || dist < 0.8) continue;
      const dot = _d.divideScalar(dist).dot(fwd);
      if (dot > bestDot) { bestDot = dot; best = e; }
    }
    if (best && best === this.target) {
      this.lost = 0;
      this.lockT += dt;
    } else if (best) {
      // a new body under the look: the lock starts over
      this.target = best; this.lockT = 0; this.lost = 0;
      this.cool = Math.min(this.cool, c.dwell);
    } else if (this.target) {
      this.lost += dt;
      if (this.lost > c.grace || !this.target.alive) { this.target = null; this.lockT = 0; }
    }
    if (this.target && !this.target.alive) { this.target = null; this.lockT = 0; }

    this.cool -= dt;
    if (this.target && this.lost === 0 && this.lockT >= c.dwell && this.cool <= 0) {
      const k = this.k, p = this.profile(k);
      out.push({ target: this.target, speed: p.speed, turn: p.turn, k });
      this.cool = p.every;
      this.launched++;
    }
    return out;
  }
}
