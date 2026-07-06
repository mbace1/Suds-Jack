// ─────────────────────────────────────────────────────────────────────────────
// SKLTR movement logic — standalone extraction for animation prototyping.
//
// Zero dependencies (no three.js, no game imports). This mirrors skltr/js/
// player.js's update() semantics EXACTLY — same constants, same integration
// order, same terrain rules — so a pose/animation rig prototyped against this
// file will drop onto the real game without retiming.
//
// COORDINATES  +x right · -z forward (at yaw 0) · +y up. Units ≈ meters.
// TIME         dt is seconds per frame (the game clamps dt to 0.05 max).
//
// Quick start (browser or node ≥ 18):
//   import { MovementSim, demo } from './movement.js';
//   const sim = new MovementSim();
//   sim.update(1/60, { moveZ: 1, yaw: 0 });     // run forward one frame
//   console.log(sim.animState());
// Or from a shell:  node -e "import('./skltr/proto/movement.js').then(m => console.table(m.demo()))"
// ─────────────────────────────────────────────────────────────────────────────

// The exact gameplay tuning from player.js (BASE) — change these here to taste,
// but know the live game uses these values.
export const TUNING = {
  moveSpeed: 8.2,      // ground target speed, units/s
  sprintMul: 1.4,      // sprint multiplier (full-stick push on pad/touch)
  dashCD: 1.0,         // dash cooldown, starts when the dash ENDS
  dashSpeed: 30,       // ground dash speed
  airDashSpeed: 26,    // air dash speed (one per airtime)
  dashTime: 0.18,      // minimum dash burst, seconds
  dashHoldMax: 0.5,    // holding the dash control sustains it up to this total
  iframe: 0.34,        // invulnerability window from dash start (fixed, not extended)
  jumpV: 10.5,         // jump velocity (double jump uses the same)
  grav: 26,            // gravity, units/s²
  stepMax: 0.6,        // ledges taller than this act as walls; shorter are stepped up
  groundAccel: 13,     // velocity lerp rate on the ground
  airAccel: 4,         // velocity lerp rate airborne (air control)
  dashAccel: 1.5,      // velocity lerp rate during a dash (momentum carries)
};

// ── Input contract (everything optional, defaults to neutral) ────────────────
//   moveX  -1..1   strafe right positive       (camera-relative)
//   moveZ  -1..1   forward positive            (camera-relative)
//   yaw    rad     camera yaw — movement basis derives from THIS, never pitch
//   pitch  rad     camera pitch — only feeds animState().aimPitch for the rig
//   sprint bool    (game: Shift, or pushing a stick past 0.86)
//   dashHeld bool  sustains an active dash up to dashHoldMax
//
// heightAt(x, z) -> ground height. Pure function of position; the game feeds
// its terrain here. Use sampleHeightAt below for a testbed with a platform+ramp.
//
// drift {x, z} | null — constant world-space velocity folded into the movement
// target (the canyon-run forward push). Wall collision applies to it like any
// other movement.

export class MovementSim {
  constructor() { this.reset(); }

  reset() {
    this.x = 0; this.y = 0; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0;
    this.dashCD = 0; this.dashT = 0; this.iframe = 0;
    this.dashing = false; this.dashElapsed = 0;
    this.dashDirX = 0; this.dashDirZ = 0; this._dashGround = true;
    this.airDashUsed = false; this.airJumpUsed = false;
    this.groundY = 0;
    // one-frame event flags for animation triggers (read via animState)
    this._justJumped = false; this._justDoubleJumped = false;
    this._justDashed = false; this._justLanded = false;
  }

  grounded() { return this.y <= this.groundY + 0.02; }

  // ── traversal verbs — call these from your input edge events ───────────────
  // (the game maps: tap/Space = jump or doubleJump; swipe/Q = groundDash or airDash)
  jump() {
    if (!this.grounded()) return false;
    this.vy = TUNING.jumpV; this._justJumped = true; return true;
  }
  doubleJump() {                                   // exactly one per airtime
    if (this.grounded() || this.airJumpUsed) return false;
    this.vy = TUNING.jumpV; this.airJumpUsed = true; this._justDoubleJumped = true; return true;
  }
  _startDash(dirX, dirZ, ground) {
    this.dashing = true; this.dashElapsed = 0; this._dashGround = ground;
    this.dashDirX = dirX; this.dashDirZ = dirZ;
    this.dashT = TUNING.dashTime; this.iframe = TUNING.iframe;
    const sp = ground ? TUNING.dashSpeed : TUNING.airDashSpeed;
    this.vx = dirX * sp; this.vz = dirZ * sp;
    this._justDashed = true;
  }
  groundDash(dirX, dirZ) {                         // dir must be normalized
    if (!this.grounded() || this.dashCD > 0 || this.dashing) return false;
    this._startDash(dirX, dirZ, true); return true;
  }
  airDash(dirX, dirZ) {                            // one per airtime, kills fall speed
    if (this.grounded() || this.airDashUsed || this.dashing) return false;
    this.airDashUsed = true; this.vy = 0; this._startDash(dirX, dirZ, false); return true;
  }

  // ── per-frame step — mirrors player.js update() order exactly ──────────────
  update(dt, input = {}, heightAt = () => 0, drift = null) {
    this.dashCD = Math.max(0, this.dashCD - dt);
    this.dashT = Math.max(0, this.dashT - dt);
    this.iframe = Math.max(0, this.iframe - dt);

    // camera-relative ground movement — basis from yaw only (stays sane at any pitch)
    const yaw = input.yaw ?? this.yaw;
    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    const fwd = { x: -sy, z: -cy }, rgt = { x: cy, z: -sy };
    const mvX = input.moveX ?? 0, mvZ = input.moveZ ?? 0;
    const sprint = !!input.sprint && Math.hypot(mvX, mvZ) > 0.1;
    const spd = TUNING.moveSpeed * (sprint ? TUNING.sprintMul : 1);
    let dx = fwd.x * mvZ + rgt.x * mvX, dz = fwd.z * mvZ + rgt.z * mvX;
    const m = Math.hypot(dx, dz); if (m > 0.001) { dx /= m; dz /= m; }
    const tvx = dx * spd + (drift ? drift.x : 0), tvz = dz * spd + (drift ? drift.z : 0);
    const accel = this.dashT > 0 ? TUNING.dashAccel : (this.grounded() ? TUNING.groundAccel : TUNING.airAccel);
    this.vx += (tvx - this.vx) * Math.min(1, dt * accel);
    this.vz += (tvz - this.vz) * Math.min(1, dt * accel);

    // dash sustain — hold to extend up to dashHoldMax; i-frames stay the fixed
    // window from dash start; cooldown begins only when the dash ends
    if (this.dashing) {
      this.dashElapsed += dt;
      const active = this.dashElapsed < TUNING.dashTime || (!!input.dashHeld && this.dashElapsed < TUNING.dashHoldMax);
      if (active) {
        const sp = this._dashGround ? TUNING.dashSpeed : TUNING.airDashSpeed;
        this.vx = this.dashDirX * sp; this.vz = this.dashDirZ * sp;
        this.dashT = 0.06;                         // keeps "dashing" true while sustained
      } else { this.dashing = false; this.dashCD = TUNING.dashCD; }
    }

    const prevX = this.x, prevZ = this.z;
    const wasAirborne = !this.grounded();
    this.x += this.vx * dt; this.z += this.vz * dt;

    // gravity + terrain follow. Ledges taller than stepMax act as walls (position
    // reverts); shorter ones are climbed. Landing resets the air-dash/air-jump.
    this.vy -= TUNING.grav * dt; this.y += this.vy * dt;
    const ground = heightAt(this.x, this.z);
    if (ground - this.y > TUNING.stepMax && this.vy <= 0.1) {
      this.x = prevX; this.z = prevZ;
      const g = heightAt(this.x, this.z); this.groundY = g;
      if (this.y <= g) { this.y = g; this.vy = 0; this.airDashUsed = false; this.airJumpUsed = false; }
    } else {
      this.groundY = ground;
      if (this.y <= ground) { this.y = ground; this.vy = 0; this.airDashUsed = false; this.airJumpUsed = false; }
    }
    if (wasAirborne && this.grounded()) this._justLanded = true;

    this.yaw = yaw;
    this._pitch = input.pitch ?? 0;
  }

  // ── the animation contract ──────────────────────────────────────────────────
  // These are the exact signals the game feeds its character rig every frame
  // (see Bunny.update in skltr/js/shared.js). Event flags are consume-once.
  //
  // The live rig maps them like this, for reference:
  //   speed      → run-cycle rate + stride amplitude (runK = min(1, speed/4)),
  //                torso stride-roll, chest counter-twist, ear sway
  //   airborne   → split-leg jump pose, slight vertical stretch, ears stream back
  //   dashing    → lunge lean (~0.8 rad), legs trail, ears pinned hard back
  //   justLanded → squash-and-stretch impulse (scale y dips ~0.24, decays at 5/s)
  //   aimPitch   → arm shoulder/elbow brace angles + slight head tracking
  //   idle (speed<0.8 && !airborne) → breathing bob, weight shift, look-around,
  //                random single-ear twitches every 1.6–4.1s
  animState() {
    const s = {
      x: this.x, y: this.y, z: this.z,
      yaw: this.yaw, aimPitch: this._pitch ?? 0,
      speed: Math.hypot(this.vx, this.vz),
      vy: this.vy,
      airborne: !this.grounded(),
      dashing: this.dashT > 0,
      invulnerable: this.iframe > 0,
      dashCooldown: this.dashCD,
      justJumped: this._justJumped, justDoubleJumped: this._justDoubleJumped,
      justDashed: this._justDashed, justLanded: this._justLanded,
    };
    this._justJumped = this._justDoubleJumped = this._justDashed = this._justLanded = false;
    return s;
  }
}

// ── Enemy locomotion (the signals that drive the robot rigs) ─────────────────
// Ground chasers walk straight at the target; ranged units hold a keep-distance
// band; flyers orbit-approach at a hover height. The gait clock is what the
// animal-robot rigs animate from (leg phase, wheel roll, wing flap).
export class EnemyMovementSim {
  // kind: { speed, keep?, fly?, hoverY? }  — e.g. { speed: 5.2 } for the wolf,
  // { speed: 2.0, keep: 14 } for the tank turtle, { speed: 3.4, fly: true, hoverY: 3.6 }
  constructor(kind, x = 0, z = 0) {
    this.k = kind; this.x = x; this.z = z; this.y = kind.fly ? (kind.hoverY ?? 3.6) : 0;
    this.bob = Math.random() * 6;                  // general wobble clock
    this.gait = 0;                                 // distance-driven gait clock
    this._px = x; this._pz = z;
    this.vel = 0;                                  // actual speed this frame (drives anims)
  }
  update(dt, target, heightAt = () => 0) {
    this.bob += dt * 2;
    const dx = target.x - this.x, dz = target.z - this.z, dh = Math.hypot(dx, dz) || 1e-3;
    if (this.k.fly) {
      const want = 6, ang = Math.atan2(dz, dx);
      const tx = target.x - Math.cos(ang) * want, tz = target.z - Math.sin(ang) * want;
      this.x += (tx - this.x) * Math.min(1, dt * 0.8); this.z += (tz - this.z) * Math.min(1, dt * 0.8);
      this.y = (this.k.hoverY ?? 3.6) + Math.sin(this.bob) * 0.4;
    } else if (this.k.keep != null) {
      if (dh > this.k.keep) { this.x += dx / dh * this.k.speed * dt; this.z += dz / dh * this.k.speed * dt; }
      else if (dh < this.k.keep * 0.6) { this.x -= dx / dh * this.k.speed * dt; this.z -= dz / dh * this.k.speed * dt; }
    } else {
      this.x += dx / dh * this.k.speed * dt; this.z += dz / dh * this.k.speed * dt;
    }
    if (!this.k.fly) this.y = heightAt(this.x, this.z);
    this.vel = Math.hypot(this.x - this._px, this.z - this._pz) / Math.max(dt, 1e-4);
    this._px = this.x; this._pz = this.z;
    this.gait += dt * (2 + this.vel * 1.7);
    this.facing = Math.atan2(-dx, -dz);            // rigs face the target every frame
    return this;
  }
  // The live robot rigs animate from these, for reference:
  //   wolf legs   : hip.x = sin(gait*2.4 + pairPhase) * 0.7 * min(1, vel/4.5)
  //                 knee.x = max(0.08, -sin(gait*2.4 + pairPhase - 0.6)) * 0.85 * k
  //                 (diagonal pairs: legs 0&3 phase 0, legs 1&2 phase π)
  //   tank wheels : wheel.x -= vel * dt * 3.2
  //   wasp wings  : wing.z = ±(0.18 + sin(bob*12) * 0.5); rotor.y += dt * 30
  //   hover bob   : y += sin(bob) * 0.4 (flyers), bosses bob ±0.2
}

// ── Testbed terrain: flat ground + one 3-high platform + a walk-up ramp ───────
export function sampleHeightAt(x, z) {
  let h = 0;
  if (x >= 9 && x <= 24 && z >= -25 && z <= -9) h = Math.max(h, 3.0);          // platform
  if (x >= 13 && x <= 20 && z >= -9 && z <= -1) {                               // ramp up to it
    const t = Math.min(1, Math.max(0, (z - (-9)) / 8)); h = Math.max(h, 3.0 + (0 - 3.0) * t);
  }
  return h;
}

// ── Scripted demo: run forward, jump, double-jump, dash — returns sampled frames.
export function demo() {
  const sim = new MovementSim();
  const frames = [];
  const dt = 1 / 60;
  for (let f = 0; f < 240; f++) {
    const t = f * dt;
    if (f === 60) sim.jump();
    if (f === 75) sim.doubleJump();
    if (f === 150) sim.groundDash(0, -1);
    sim.update(dt, { moveZ: 1, yaw: 0, dashHeld: t > 2.5 && t < 2.9 }, sampleHeightAt);
    if (f % 15 === 0) {
      const a = sim.animState();
      frames.push({ t: +t.toFixed(2), z: +a.z.toFixed(2), y: +a.y.toFixed(2), speed: +a.speed.toFixed(1), air: a.airborne, dash: a.dashing });
    }
  }
  return frames;
}
