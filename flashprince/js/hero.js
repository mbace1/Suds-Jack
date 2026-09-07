// The man, and the rule that every move he starts he finishes.
//
// This is the difference between a cinematic platformer and a platformer. In
// Mario the character is a dot with a velocity and the animation is a costume
// over it; in Another World, Flashback and Prince of Persia the ANIMATION is
// the character — a step is twenty-two frames long, it carries you twelve
// pixels whether you like it or not, and until it is over the stick is not
// connected to anything. Every good thing about how these games feel comes out
// of that one decision, and so does every bad death, which is the point.
//
// So: no free acceleration anywhere. Grounded moves are scripted, jumps are
// ballistic from a scripted launch, and input is read only in the window a move
// declares open.

import { POSE as Q, sample } from './figure.js';

export const HERO_W = 10, HERO_H = 30, CROUCH_H = 16;
const G = 0.19, TERMINAL = 6.4;

// What a fall costs, measured from where the feet left the floor. A storey here
// is three tiles — 48px — so this is Prince of Persia's ladder exactly: one
// storey is free, two hurt, three kill you.
const FALL_HURT = 58, FALL_KILL = 110;

// A move: how long, what it plays, how fast it carries him, and what it becomes.
// `open` is the frame from which the next input is allowed to interrupt — a
// move with open === dur cannot be cancelled at all, which most of them are.
const M = {
  // He does not begin standing. Every one of these games opens on a man on the
  // floor who has to get up first, and it costs ninety-six frames on purpose.
  wake: { dur: 108, open: 108, clip: [[Q.deadB, 30], [Q.deadA, 22], [Q.sprawl, 20], [Q.crouch, 16], [Q.standUp, 12], [Q.stand, 8]] },

  stand: { dur: 999, loop: true, open: 0, clip: [[Q.breathe, 46], [Q.stand, 54]] },
  standArmed: { dur: 999, loop: true, open: 0, clip: [[Q.aim, 60], [Q.aim, 60]] },

  turn: { dur: 18, open: 18, flipAt: 10, clip: [[Q.turnA, 6], [Q.turnB, 7], [Q.stand, 5]] },

  step: { dur: 22, open: 22, dx: [0, 0.2, 0.7, 1.0, 1.0, 0.8, 0.4, 0.1], clip: [[Q.step1, 7], [Q.step2, 8], [Q.step3, 7]] },

  run: { dur: 999, loop: true, open: 0, speed: 1.62, clip: [[Q.run1, 5], [Q.run2, 5], [Q.run3, 5], [Q.run4, 5]] },
  skid: { dur: 17, open: 13, dx: [1.4, 1.1, 0.8, 0.5, 0.25, 0.1], clip: [[Q.skid, 12], [Q.stand, 5]] },

  crouch: { dur: 9, open: 9, low: true, clip: [[Q.crouch, 9]] },
  crouchIdle: { dur: 999, loop: true, open: 0, low: true, clip: [[Q.crouch, 60], [Q.crouchLo, 60]] },
  standUp: { dur: 12, open: 12, clip: [[Q.crouch, 5], [Q.standUp, 7]] },
  // the roll — Conrad's, and the only thing that will take you under a shot
  roll: { dur: 28, open: 24, low: true, dx: [0.6, 1.7, 2.1, 2.1, 1.8, 1.2, 0.6], clip: [[Q.tuck, 5], [Q.tuck, 16], [Q.crouch, 7]] },

  // jumps: a scripted gather, then physics
  gather: { dur: 7, open: 7, clip: [[Q.gather, 7]] },
  gatherRun: { dur: 3, open: 3, speed: 1.0, clip: [[Q.gather, 3]] },
  air: { dur: 999, air: true, open: 0, clip: [[Q.launch, 6], [Q.rise, 8], [Q.apex, 10], [Q.descend, 40]] },
  fall: { dur: 999, air: true, open: 0, clip: [[Q.descend, 8], [Q.descend, 40]] },
  land: { dur: 11, open: 8, clip: [[Q.land, 6], [Q.stand, 5]] },
  landHard: { dur: 26, open: 26, clip: [[Q.sprawl, 14], [Q.land, 7], [Q.stand, 5]] },

  // the ledge. Grabbing is free, getting up is expensive — that asymmetry is
  // what makes a rooftop in these games feel like a decision.
  hang: { dur: 999, loop: true, open: 0, hang: true, clip: [[Q.hang, 70], [Q.hangSwing, 70]] },
  pullUp: { dur: 40, open: 40, hang: true, clip: [[Q.hang, 4], [Q.pullUp, 14], [Q.mantle, 13], [Q.standUp, 9]] },

  // the pistol
  drawGun: { dur: 21, open: 21, clip: [[Q.draw1, 8], [Q.draw2, 8], [Q.aim, 5]] },
  holster: { dur: 16, open: 16, clip: [[Q.aim, 5], [Q.draw2, 6], [Q.stand, 5]] },
  fire: { dur: 15, open: 12, shootAt: 2, clip: [[Q.recoil, 5], [Q.aim, 10]] },
  fireLow: { dur: 15, open: 12, low: true, shootAt: 2, clip: [[Q.aimLow, 15]] },
  crouchArmed: { dur: 999, loop: true, open: 0, low: true, clip: [[Q.aimLow, 60], [Q.aimLow, 60]] },

  hurt: { dur: 22, open: 22, dx: [-0.9, -0.7, -0.4, -0.2, 0, 0, 0], clip: [[Q.hurt, 10], [Q.stand, 12]] },
  dead: { dur: 999, open: 999, clip: [[Q.deadA, 10], [Q.deadB, 30]] },
};

export class Hero {
  constructor(x, y) {
    this.reset(x, y);
    this.health = 3;
    this.armed = false;
    this.hasGun = false;
  }

  reset(x, y) {
    this.x = x; this.y = y;              // y is the FLOOR under his feet
    this.face = 1;
    this.vx = 0; this.vy = 0;
    this.state = 'stand'; this.f = 0;
    this.fallFrom = y;
    this.armed = false;
    this.hurtT = 0;
    this.dead = false;
    this.shotQueued = false;
    this.landedHard = 0;
  }

  get move() { return M[this.state]; }
  get low() { return !!this.move.low; }
  get h() { return this.low ? CROUCH_H : HERO_H; }
  get cx() { return this.x; }
  get cy() { return this.y - this.h / 2; }

  go(state, f = 0) { this.state = state; this.f = f; }

  // ── collision, in whole pixels because the world is a grid ─────────
  clear(world, x, y, h) {
    const half = HERO_W / 2 - 1;
    return !world.boxSolid(x - half, y - h + 1, half * 2, h - 1);
  }

  // Whole pixels first, then whatever fraction is left — a move that carries
  // 1.62px a frame must carry 1.62, not two. Getting this wrong scales every
  // distance in the game by the rounding error, which is how a three-tile gap
  // quietly becomes a five-tile one.
  tryX(world, dx) {
    const step = Math.sign(dx);
    const n = Math.floor(Math.abs(dx));
    let moved = 0;
    for (let i = 0; i < n; i++) {
      if (!this.clear(world, this.x + step, this.y, this.h)) return { moved, hit: true };
      this.x += step; moved += step;
    }
    const rem = (Math.abs(dx) - n) * step;
    if (rem && this.clear(world, this.x + rem, this.y, this.h)) { this.x += rem; moved += rem; }
    return { moved, hit: false };
  }

  tryY(world, dy) {
    const step = Math.sign(dy);
    const n = Math.floor(Math.abs(dy));
    for (let i = 0; i < n; i++) {
      if (!this.clear(world, this.x, this.y + step, this.h)) return true;
      this.y += step;
    }
    const rem = (Math.abs(dy) - n) * step;
    if (rem) {
      if (!this.clear(world, this.x, this.y + rem, this.h)) return true;
      this.y += rem;
    }
    return false;
  }

  grounded(world) { return !this.clear(world, this.x, this.y + 1, this.h); }

  // ── the frame ──────────────────────────────────────────────────────
  update(world, input, game) {
    if (this.hurtT > 0) this.hurtT--;
    const m = this.move;
    this.f++;

    if (this.state === 'dead') return;

    if (m.flipAt && this.f === m.flipAt) this.face *= -1;
    if (m.shootAt && this.f === m.shootAt) this.shotQueued = true;

    // scripted horizontal carry
    if (m.dx) {
      const k = Math.min(m.dx.length - 1, Math.floor((this.f - 1) / m.dur * m.dx.length));
      this.tryX(world, m.dx[k] * this.face);
    } else if (m.speed) {
      const r = this.tryX(world, m.speed * this.face);
      if (r.hit && this.state === 'run') { this.go('skid'); return; }
    }

    if (m.air) this.airFrame(world, input, game);
    else if (!m.hang) this.stickToFloor(world);

    const done = this.f >= m.dur;
    const canAct = this.f >= (m.open ?? m.dur);

    if (m.hang) this.hangFrame(world, input, done);
    else if (m.air) { /* handled above */ }
    else if (canAct) this.act(world, input, game, done);
    else if (done) this.go('stand');
  }

  // walking off the edge of the world, and the floor coming up to meet him
  stickToFloor(world) {
    if (this.grounded(world)) { this.fallFrom = this.y; return; }
    if (this.state === 'run' || this.state === 'skid' || this.state === 'roll') {
      this.vx = (this.state === 'run' ? 1.5 : 0.8) * this.face;
      this.vy = 0;
      this.fallFrom = this.y;
      this.go('fall');
    } else {
      // Flashback's rule: step off a ledge and you catch it rather than fall
      const ledge = world.ledgeBehind(this.x, this.y, this.face);
      if (ledge) this.grab(ledge);
      else { this.vx = 0; this.vy = 0; this.fallFrom = this.y; this.go('fall'); }
    }
  }

  airFrame(world, input, game) {
    this.vy = Math.min(TERMINAL, this.vy + G);
    const r = this.tryX(world, this.vx);
    if (r.hit) this.vx = 0;

    // reaching for a ledge on the way past it. Holding toward or up arms the
    // grab; letting go of everything means you meant to drop, and you do.
    if (this.vy > -1.4 && (input.up || input.dir === this.face)) {
      const ledge = world.ledgeAhead(this.x, this.y, this.face, this.vy);
      if (ledge) { this.grab(ledge); return; }
    }

    const upward = this.vy < 0;
    const blocked = this.tryY(world, this.vy);
    if (blocked) {
      if (upward) { this.vy = 0.2; }
      else {
        const drop = this.y - this.fallFrom;
        this.vx = 0; this.vy = 0;
        if (drop > FALL_KILL) { game.kill('fall'); return; }
        if (drop > FALL_HURT) { this.go('landHard'); game.hurt(1, true); }
        else this.go('land');
      }
    }
  }

  grab(ledge) {
    this.x = ledge.x;
    this.y = ledge.y + 26;         // hands on the lip, feet 26px under it
    this.face = ledge.face;
    this.vx = this.vy = 0;
    this.ledgeY = ledge.y;
    this.go('hang');
  }

  hangFrame(world, input, done) {
    if (this.state === 'pullUp') {
      // the mantle: he rises the 26 pixels his own arms are long, then steps on
      const t = Math.min(1, Math.max(0, (this.f - 6) / 26));
      this.y = this.ledgeY + 26 - 26 * t;
      this.x += (this.f > 22 ? 0.42 : 0.12) * this.face;
      if (done) { this.y = this.ledgeY; this.go('stand'); }
      return;
    }
    if (input.up) { this.go('pullUp'); return; }
    if (input.down || input.dir === -this.face) {
      this.vx = 0; this.vy = 0.4; this.fallFrom = this.y;
      this.go('fall');
    }
  }

  // ── what a free frame does with the stick ──────────────────────────
  act(world, input, game, done) {
    const s = this.state;
    const armed = this.armed;

    if (s === 'wake') { if (done) this.go('stand'); return; }
    // dying and being hit trump everything
    if (s === 'hurt' && done) { this.go(armed ? 'standArmed' : 'stand'); return; }

    // gun handling, which is deliberately slow both ways
    if (input.gunPress && !this.low && this.hasGun && (s === 'stand' || s === 'standArmed')) {
      this.go(armed ? 'holster' : 'drawGun');
      this.armed = !armed;
      return;
    }
    if (s === 'drawGun' && done) { this.go('standArmed'); return; }
    if (s === 'holster' && done) { this.go('stand'); return; }
    if ((s === 'fire' || s === 'fireLow') && done) { this.go(s === 'fire' ? 'standArmed' : 'crouchArmed'); return; }

    if (armed && input.firePress && (s === 'standArmed' || s === 'crouchArmed' || s === 'fire' || s === 'fireLow')) {
      this.go(s === 'crouchArmed' || s === 'fireLow' ? 'fireLow' : 'fire');
      return;
    }

    // crouching
    if (s === 'crouch' && done) { this.go(armed ? 'crouchArmed' : 'crouchIdle'); return; }
    if (s === 'crouchIdle' || s === 'crouchArmed') {
      if (input.up && this.clear(world, this.x, this.y, HERO_H)) { this.go('standUp'); return; }
      if (input.dir === this.face) { this.go('roll'); return; }
      if (input.dir === -this.face) { this.face *= -1; this.go('crouch', 8); return; }
      return;
    }
    if (s === 'standUp' && done) { this.go(armed ? 'standArmed' : 'stand'); return; }
    if (s === 'roll' && done) { this.go(armed ? 'crouchArmed' : 'crouchIdle'); return; }

    // landing
    if ((s === 'land' || s === 'landHard') && (done || (s === 'land' && input.dir))) {
      if (input.dir === this.face) { this.go('step'); return; }
      this.go(armed ? 'standArmed' : 'stand');
      return;
    }

    // standing / stepping / running
    const idle = s === 'stand' || s === 'standArmed';
    if (idle || (s === 'step' && done) || (s === 'skid' && done) || (s === 'turn' && done)) {
      if (input.down) { this.go('crouch'); return; }
      if (input.jumpPress) { this.jump(world, input, false); return; }
      if (input.dir === -this.face) { this.go('turn'); return; }
      if (input.dir === this.face) {
        // tap = one step, hold = a step and then the run out of it. Flashback's
        // rule, and the reason a ledge edge is survivable at all.
        if (s === 'step' && done && input.dirHeld > 16) { this.go('run'); return; }
        this.go('step'); return;
      }
      if (!done && !idle) return;
      this.go(armed ? 'standArmed' : 'stand');
      return;
    }

    if (s === 'run') {
      if (this.armed) { this.armed = false; }
      if (input.jumpPress) { this.jump(world, input, true); return; }
      if (input.down) { this.go('roll'); return; }
      if (input.dir !== this.face) { this.go('skid'); return; }
      return;
    }

    // The two jumps, and the numbers the whole level design is measured off.
    // Standing: rises 27px, so his hands (26 above his feet) reach a lip 53
    // above the floor — a storey is 48, which is why a storey is climbable at
    // all. Running: 3.7 tiles of carry, so a three-tile gap goes and a
    // four-tile gap does not.
    if (s === 'gather' && done) { this.launch(0.95, -3.2); return; }
    if (s === 'gatherRun' && done) { this.launch(1.86, -3.05); return; }
  }

  jump(world, input, running) {
    if (this.armed) this.armed = false;
    if (running) { this.go('gatherRun'); this.jumpDir = input.dir || this.face; return; }
    this.jumpDir = input.dir === this.face ? this.face : 0;
    this.go('gather');
  }

  launch(fwd, up) {
    this.vx = this.jumpDir ? fwd * this.jumpDir : 0;
    this.vy = up;
    this.fallFrom = this.y;
    this.go('air');
  }

  strike(dmg, fromX, game) {
    if (this.hurtT > 0 || this.dead) return false;
    this.health -= dmg;
    this.hurtT = 70;
    if (this.health <= 0) { game.kill('shot'); return true; }
    this.face = fromX < this.x ? -1 : 1;
    this.go('hurt');
    return true;
  }

  pose() {
    const m = this.move;
    return sample(m.clip, this.f, !!m.loop);
  }

  // where a bolt leaves the barrel
  muzzle() { return { x: this.x + this.face * 13, y: this.y - (this.low ? 11 : 20) }; }
}
