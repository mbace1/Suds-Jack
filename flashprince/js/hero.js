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

  // THE CAREFUL STEP. Shift, and the most useful button in Prince of Persia.
  // Five pixels instead of twelve, and it costs more frames to travel less
  // ground — which is exactly the trade you want when the ground runs out in
  // nine pixels and the drop is three storeys. Nothing else in the move set
  // lets you place a foot.
  inch: { dur: 26, open: 26, dx: [0, 0.15, 0.35, 0.4, 0.3, 0.15, 0.05], clip: [[Q.inch1, 9], [Q.inch2, 9], [Q.inch3, 8]] },
  // and the look over the edge you get for free at the end of one
  peer: { dur: 999, loop: true, open: 0, clip: [[Q.peer, 70], [Q.inch3, 70]] },

  // Stepping UP onto something a foot high. Prince of Persia does not make you
  // hang off a knee-high block, and neither does this: one tile gets a step,
  // a storey gets the whole grab-and-mantle.
  stepUp: { dur: 30, open: 30, rise: 16, clip: [[Q.stepUpA, 9], [Q.stepUpB, 11], [Q.stepUpC, 6], [Q.stand, 4]] },

  // Lowering yourself over an edge ON PURPOSE, which is a different act from
  // walking off one — and the move that makes a long descent survivable.
  climbDown: { dur: 34, open: 34, clip: [[Q.kneel, 10], [Q.reachDn, 12], [Q.lower, 12]] },

  // Running into a wall at speed. It is not a wall you bounce off; it is a
  // wall that stops you and takes a moment back off you for the mistake.
  bump: { dur: 24, open: 24, dx: [-0.8, -0.55, -0.3, -0.1, 0, 0], clip: [[Q.bumpA, 11], [Q.bumpB, 8], [Q.stand, 5]] },

  drink: { dur: 46, open: 46, low: true, drinkAt: 22, clip: [[Q.drinkA, 8], [Q.drinkB, 26], [Q.drinkA, 12]] },

  run: { dur: 999, loop: true, open: 0, speed: 1.62, clip: [[Q.run1, 5], [Q.run2, 5], [Q.run3, 5], [Q.run4, 5]] },
  skid: { dur: 17, open: 13, dx: [1.4, 1.1, 0.8, 0.5, 0.25, 0.1], clip: [[Q.skid, 12], [Q.stand, 5]] },
  // Turning WHILE running: he plants, pivots and goes back the other way in
  // one move instead of skidding to a halt and then turning on the spot.
  // Twenty-two frames against thirty-four, and it keeps you alive in a duel.
  runTurn: { dur: 22, open: 22, flipAt: 12, dx: [1.1, 0.7, 0.35, 0.1, 0, 0], runOut: true, clip: [[Q.skid, 8], [Q.turnB, 7], [Q.step1, 7]] },

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

  // ── the sword ──────────────────────────────────────────────────────
  // Prince of Persia's other half. Once it is out you are in a STANCE, not
  // walking: forward advances, back retreats, up strikes, Shift parries, down
  // puts it away. Nothing in the stance is fast, and both of you are on the
  // same clock — which is the whole reason its duels are a conversation
  // rather than a mash.
  swordOut: { dur: 26, open: 26, clip: [[Q.draw1, 8], [Q.swordUp, 9], [Q.guardHi, 5], [Q.guard, 4]] },
  sheathe: { dur: 22, open: 22, clip: [[Q.guard, 5], [Q.swordUp, 9], [Q.stand, 8]] },
  guard: { dur: 999, loop: true, open: 0, clip: [[Q.guard, 62], [Q.guardHi, 62]] },
  advance: { dur: 20, open: 20, dx: [0.5, 0.8, 0.7, 0.4, 0.1], clip: [[Q.advance, 11], [Q.guard, 9]] },
  retreat: { dur: 22, open: 22, dx: [-0.5, -0.75, -0.6, -0.3, -0.1], clip: [[Q.retreat, 12], [Q.guard, 10]] },
  // 6 frames of wind-up before the edge is anywhere, which is the window a
  // parry has to live in
  strike: { dur: 30, open: 26, hitAt: 11, reach: 26, clip: [[Q.strikeA, 6], [Q.strikeB, 9], [Q.strikeB, 6], [Q.guard, 9]] },
  parry: { dur: 24, open: 20, guarding: [3, 16], clip: [[Q.parry, 16], [Q.guard, 8]] },
  clang: { dur: 18, open: 18, dx: [-0.4, -0.25, -0.1, 0], clip: [[Q.clang, 10], [Q.guard, 8]] },

  hurt: { dur: 22, open: 22, dx: [-0.9, -0.7, -0.4, -0.2, 0, 0, 0], clip: [[Q.hurt, 10], [Q.stand, 12]] },
  dead: { dur: 999, open: 999, clip: [[Q.deadA, 10], [Q.deadB, 30]] },
};

// which moves have the blade out, for drawing and for the guard test
const ARMED_SWORD = new Set(['guard', 'advance', 'retreat', 'strike', 'parry', 'clang', 'swordOut', 'sheathe']);

export class Hero {
  constructor(x, y) {
    this.reset(x, y);
    this.health = 3;
    this.hasGun = false;
    this.hasSword = false;
  }

  reset(x, y) {
    this.x = x; this.y = y;              // y is the FLOOR under his feet
    this.face = 1;
    this.vx = 0; this.vy = 0;
    this.state = 'stand'; this.f = 0;
    this.fallFrom = y;
    this.weapon = 'none';                // 'none' | 'gun' | 'sword'
    this.hurtT = 0;
    this.struckAt = 0;
    this.dead = false;
    this.shotQueued = false;
    this.landedHard = 0;
    // Prince of Persia forgives a jump pressed a few frames early — it has to,
    // because the move you are in the middle of is 22 frames long and you
    // cannot see when it opens. Without this, a jump asked for at frame 20 of
    // a step is silently thrown away and the game reads as unresponsive when
    // it is only committed.
    this.jumpBuf = 0;
    this.dropLock = 0;
  }

  get move() { return M[this.state]; }
  get armed() { return this.weapon !== 'none'; }
  get sworded() { return ARMED_SWORD.has(this.state); }
  // the parry window: a few frames, in the middle of the move, and not a
  // toggle you can hold — that is the whole reason it is a decision
  get guarding() {
    const g = this.move.guarding;
    return !!g && this.f >= g[0] && this.f <= g[1];
  }
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
    if (this.jumpBuf > 0) this.jumpBuf--;
    // 26 frames — just longer than a step, which is the longest you can ever
    // be locked out. Shorter and a jump asked for one frame after a step
    // begins is still thrown away, which is the exact complaint.
    if (input.jumpPress) this.jumpBuf = 26;
    const m = this.move;
    this.f++;

    if (this.state === 'dead') return;

    if (m.flipAt && this.f === m.flipAt) this.face *= -1;
    if (m.shootAt && this.f === m.shootAt) this.shotQueued = true;
    if (m.hitAt && this.f === m.hitAt) this.swingQueued = true;
    if (m.drinkAt && this.f === m.drinkAt) this.drinkQueued = true;

    const scripted = m.hang || this.state === 'stepUp' || this.state === 'climbDown';

    // scripted horizontal carry
    if (m.dx) {
      const k = Math.min(m.dx.length - 1, Math.floor((this.f - 1) / m.dur * m.dx.length));
      this.tryX(world, m.dx[k] * this.face);
    } else if (m.speed) {
      const r = this.tryX(world, m.speed * this.face);
      // Running into a wall is its own move. Skidding to a halt in front of it
      // pretended he had seen it coming; he had not.
      if (r.hit && this.state === 'run') { this.go('bump'); game.bumped?.(this); return; }
      if (r.hit) { this.go('skid'); return; }
    }

    if (m.air) this.airFrame(world, input, game);
    else if (!scripted) this.stickToFloor(world);

    const done = this.f >= m.dur;
    const canAct = this.f >= (m.open ?? m.dur);

    if (scripted) this.scripted(world, input, done);
    else if (m.air) { /* handled above */ }
    else if (canAct) this.act(world, input, game, done);
    else if (done) this.go('stand');
  }

  // where the point of the blade is on the frame it lands
  swordTip() {
    return { x: this.x + this.face * (this.move.reach ?? 26), y: this.y - 18 };
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

  // Moves that drive their own y. Kept out of the physics entirely: they are
  // choreography, and choreography that negotiates with gravity reads as a
  // bug in both.
  scripted(world, input, done) {
    if (this.state === 'stepUp') {
      const t = Math.min(1, Math.max(0, (this.f - 6) / 18));
      if (this.f === 1) this.stepFrom = this.y;
      this.y = this.stepFrom - 16 * (t * t * (3 - 2 * t));
      if (this.f > 8) this.x += 0.55 * this.face;
      if (done) { this.y = this.stepTarget ?? this.y; this.go('stand'); }
      return;
    }
    if (this.state === 'climbDown') {
      // he kneels, gets his hands on the lip, and lets his weight down —
      // ending exactly where a grab from the air would have put him
      const L = this.climbTo;
      if (this.f === 1) { this.downFrom = this.y; this.face = L ? L.face : -this.face; }
      const t = Math.min(1, Math.max(0, (this.f - 14) / 20));
      const target = (L ? L.y : this.downFrom) + 26;
      this.y = this.downFrom + (target - this.downFrom) * (t * t);
      if (L && this.f === 14) this.x = L.x;
      if (done) {
        this.y = target;
        this.ledgeY = L ? L.y : this.y - 26;
        // He climbed down on purpose; the button that did it is still held.
        // Without this he lets go on the very next frame and drops into the
        // thing he was carefully avoiding — down has to be pressed AGAIN.
        this.dropLock = 16;
        this.go('hang');
      }
      return;
    }
    this.hangFrame(world, input, done);
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
    if (this.dropLock > 0) { this.dropLock--; return; }
    if (input.up) { this.go('pullUp'); return; }
    if (input.down || input.dir === -this.face) {
      this.vx = 0; this.vy = 0.4; this.fallFrom = this.y;
      this.go('fall');
    }
  }

  // ── what a free frame does with the stick ──────────────────────────
  act(world, input, game, done) {
    const s = this.state;

    if (s === 'wake') { if (done) this.go('stand'); return; }
    if (s === 'hurt' && done) { this.go(this.rest()); return; }
    if (s === 'bump' && done) { this.go(this.rest()); return; }

    // ── the sword stance ─────────────────────────────────────────────
    // Once the blade is out he is not walking any more. Forward advances,
    // back retreats, up strikes, Shift parries, down puts it away — Prince of
    // Persia's grammar exactly, and every one of them is committed.
    if (ARMED_SWORD.has(s)) {
      if (s === 'swordOut' && done) { this.go('guard'); return; }
      if (s === 'sheathe' && done) { this.weapon = 'none'; this.go('stand'); return; }
      const settled = s === 'guard' || done;
      if (!settled) return;
      if (input.down) { this.go('sheathe'); return; }
      if (this.jumpBuf > 0) { this.jumpBuf = 0; this.go('strike'); return; }
      if (input.carefulPress || input.careful) { this.go('parry'); return; }
      if (input.dir === this.face) { this.go('advance'); return; }
      if (input.dir === -this.face) { this.go('retreat'); return; }
      if (s !== 'guard') this.go('guard');
      return;
    }

    // ── the weapons ──────────────────────────────────────────────────
    // One button cycles what is in his hands: nothing → pistol → sword →
    // nothing, skipping whatever he has not found. One button because the
    // touch panel has one, and a control you cannot reach on a phone is a
    // control half the players do not have.
    if (input.gunPress && !this.low && (s === 'stand' || s === 'standArmed')) {
      const next = this.nextWeapon();
      if (next !== this.weapon) {
        if (next === 'gun') { this.weapon = 'gun'; this.go('drawGun'); return; }
        if (next === 'sword') { this.weapon = 'sword'; this.go('swordOut'); return; }
        this.weapon = 'none'; this.go('holster'); return;
      }
    }
    if (s === 'drawGun' && done) { this.go('standArmed'); return; }
    if (s === 'holster' && done) { this.go('stand'); return; }
    if ((s === 'fire' || s === 'fireLow') && done) { this.go(s === 'fire' ? 'standArmed' : 'crouchArmed'); return; }
    if (this.weapon === 'gun' && input.firePress
        && (s === 'standArmed' || s === 'crouchArmed' || s === 'fire' || s === 'fireLow')) {
      this.go(s === 'crouchArmed' || s === 'fireLow' ? 'fireLow' : 'fire');
      return;
    }

    // ── crouching, and the flask ─────────────────────────────────────
    if (s === 'crouch' && done) { this.go(this.weapon === 'gun' ? 'crouchArmed' : 'crouchIdle'); return; }
    if (s === 'drink' && done) { this.go('crouchIdle'); return; }
    if (s === 'crouchIdle' || s === 'crouchArmed') {
      if (game.flaskUnder && game.flaskUnder(this)) { this.go('drink'); return; }
      if (input.up && this.clear(world, this.x, this.y, HERO_H)) { this.go('standUp'); return; }
      if (input.dir === this.face) { this.go('roll'); return; }
      if (input.dir === -this.face) { this.face *= -1; this.go('crouch', 8); return; }
      return;
    }
    if (s === 'standUp' && done) { this.go(this.rest()); return; }
    if (s === 'roll' && done) { this.go(this.weapon === 'gun' ? 'crouchArmed' : 'crouchIdle'); return; }

    if ((s === 'land' || s === 'landHard') && (done || (s === 'land' && input.dir))) {
      if (input.dir === this.face) { this.go('step'); return; }
      this.go(this.rest());
      return;
    }

    if (s === 'stepUp' && done) { this.go('stand'); return; }
    if (s === 'peer') {
      if (!input.careful) { this.go('stand'); return; }
      if (input.dir === this.face) { this.go('inch'); return; }
      if (input.dir === -this.face) { this.go('turn'); return; }
      if (input.down) { this.tryClimbDown(world); return; }
      return;
    }

    // ── standing, stepping, running ──────────────────────────────────
    const idle = s === 'stand' || s === 'standArmed';
    const settled = idle || ((s === 'step' || s === 'inch' || s === 'skid'
      || s === 'turn' || s === 'runTurn') && done);
    if (settled) {
      if (s === 'runTurn' && done && input.dir === this.face) { this.go('run'); return; }
      if (input.down) { if (!this.tryClimbDown(world)) this.go('crouch'); return; }
      if (this.jumpBuf > 0) {
        this.jumpBuf = 0;
    this.dropLock = 0;
        // a knee-high block is stepped onto, not hung off — PoP does not make
        // you dangle from something you could walk up
        const up = world.stepUpAhead(this.x, this.y, this.face);
        if (up != null && input.dir === this.face) { this.stepTarget = up; this.go('stepUp'); return; }
        this.jump(world, input, false);
        return;
      }
      if (input.dir === -this.face) { this.go('turn'); return; }
      if (input.dir === this.face) {
        if (input.careful) { this.go('inch'); return; }
        // hold to run — unless the way ahead is a wall, in which case running
        // at it only produces the bump you just had. He shuffles instead.
        const wall = world.boxSolid(this.x + this.face * 11 - 3, this.y - 26, 6, 24);
        if (!wall && (s === 'step' || s === 'inch') && done && input.dirHeld > 16) { this.go('run'); return; }
        this.go('step'); return;
      }
      if (input.careful && idle) { this.go('peer'); return; }
      if (!done && !idle) return;
      this.go(this.rest());
      return;
    }

    if (s === 'run') {
      if (this.jumpBuf > 0) { this.jumpBuf = 0; this.jump(world, input, true); return; }
      if (input.down) { this.go('roll'); return; }
      // turning at speed is its own move, and it is worth knowing about
      if (input.dir === -this.face) { this.go('runTurn'); return; }
      if (input.dir === 0) { this.go('skid'); return; }
      return;
    }

    if (s === 'gather' && done) { this.launch(0.95, -3.2); return; }
    if (s === 'gatherRun' && done) { this.launch(1.86, -3.05); return; }
  }

  // what he settles back into when a move runs out
  rest() { return this.weapon === 'gun' ? 'standArmed' : this.weapon === 'sword' ? 'guard' : 'stand'; }

  nextWeapon() {
    const order = ['none', 'gun', 'sword'];
    const has = w => w === 'none' || (w === 'gun' && this.hasGun) || (w === 'sword' && this.hasSword);
    let i = order.indexOf(this.weapon);
    for (let k = 0; k < 3; k++) {
      i = (i + 1) % 3;
      if (has(order[i])) return order[i];
    }
    return 'none';
  }

  // Down at a lip: he kneels, turns, and lets himself over it rather than
  // stepping into the air. Twenty-six pixels of descent for free, and the
  // difference between a two-storey drop and a survivable one.
  tryClimbDown(world) {
    const lip = world.lipAhead(this.x, this.y, this.face);
    if (!lip) return false;
    this.ledgeY = lip.y;
    this.climbTo = lip;
    this.go('climbDown');
    return true;
  }

  jump(world, input, running) {
    if (this.weapon === 'gun') this.weapon = 'none';   // `armed` is derived now
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
