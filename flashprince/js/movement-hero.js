// Flash Prince — movement-lab locomotion prototype.
//
// This deliberately sits beside hero.js rather than replacing it yet. The lab
// uses the real Hero collision, ledge, fall and jump machinery, but this class
// replaces the locomotion timing model so we can prove the feel before the
// campaign inherits it.
//
// The contract is no longer "input is ignored until open". Every finite move
// has three phases:
//   anticipate — the body is preparing force
//   commit      — physics must finish what was started
//   transition  — the body still finishes, but the next intent may be accepted
// Buffered input is consumed only when a physically valid transition begins.

import { Hero, HERO_H, CROUCH_H } from './hero.js';
import { POSE as Q, sample } from './figure.js';

const phase = (dur, anticipate, transition, extra = {}) => ({
  dur, anticipate, commit: transition - anticipate, transition, ...extra,
});

// Root-motion curves are per-frame samples. The important difference from a
// flat speed is that feet can plant, push and settle while distance stays exact.
const FLOW = {
  stand: { dur: 999, loop: true, transition: 0, clip: [[Q.breathe, 46], [Q.stand, 54]] },

  step: phase(22, 4, 16, {
    root: [0.05,0.10,0.18,0.28,0.44,0.62,0.82,0.98,1.08,1.10,1.05,0.96,0.84,0.70,0.56,0.42,0.32,0.24,0.18,0.12,0.08,0.04],
    clip: [[Q.step1, 7], [Q.step2, 8], [Q.step3, 7]],
  }),

  // A run does not appear from nowhere. Six frames of forward weight transfer
  // bridge the careful step into the first full running contact.
  runStart: phase(8, 2, 6, {
    root: [0.45,0.72,1.02,1.28,1.48,1.58,1.62,1.62],
    clip: [[Q.step3, 2], [Q.run2, 2], [Q.run1, 4]],
  }),

  run: { dur: 999, loop: true, transition: 0, speed: 1.62,
    clip: [[Q.run1, 5], [Q.run2, 5], [Q.run3, 5], [Q.run4, 5]] },

  // Stop is intentionally longer than the old skid. A human at speed spends
  // distance killing that speed; releasing the stick is not a brake button.
  runStop: phase(20, 0, 12, {
    root: [1.52,1.44,1.34,1.23,1.10,0.96,0.82,0.69,0.57,0.46,0.36,0.28,0.21,0.15,0.10,0.06,0.03,0.01,0,0],
    clip: [[Q.skid, 10], [Q.turnA, 4], [Q.stand, 6]],
  }),

  // Reversal is stop → planted pivot → acceleration. The facing flip happens
  // at the planted middle frame, never while the body is still travelling.
  pivot: phase(15, 3, 11, {
    flipAt: 8,
    root: [0.22,0.16,0.10,0.05,0,0,0,0,0,0.04,0.12,0.24,0.42,0.62,0.84],
    rootSigned: true,
    clip: [[Q.skid, 4], [Q.turnA, 4], [Q.turnB, 4], [Q.run2, 3]],
  }),

  gather: phase(7, 2, 7, { clip: [[Q.gather, 7]] }),
  gatherRun: phase(4, 1, 4, { root: [1.25,1.42,1.55,1.62], clip: [[Q.run2, 1], [Q.gather, 3]] }),
  air: { dur: 999, air: true, transition: 0, clip: [[Q.launch, 6], [Q.rise, 8], [Q.apex, 10], [Q.descend, 40]] },
  fall: { dur: 999, air: true, transition: 0, clip: [[Q.descend, 8], [Q.descend, 40]] },
  land: phase(12, 4, 8, { clip: [[Q.land, 6], [Q.stand, 6]] }),
  landHard: phase(26, 8, 23, { clip: [[Q.sprawl, 14], [Q.land, 7], [Q.stand, 5]] }),

  hang: { dur: 999, loop: true, hang: true, transition: 0, clip: [[Q.hang, 70], [Q.hangSwing, 70]] },
  pullUp: phase(40, 8, 34, { hang: true, clip: [[Q.hang, 4], [Q.pullUp, 14], [Q.mantle, 13], [Q.standUp, 9]] }),

  crouch: phase(9, 3, 8, { low: true, clip: [[Q.crouch, 9]] }),
  crouchIdle: { dur: 999, loop: true, low: true, transition: 0, clip: [[Q.crouch, 60], [Q.crouchLo, 60]] },
  roll: phase(28, 5, 22, { low: true,
    root: [0.4,0.7,1.1,1.55,1.9,2.1,2.2,2.2,2.15,2.05,1.9,1.7,1.5,1.3,1.1,0.9,0.75,0.6,0.48,0.38,0.30,0.22,0.16,0.11,0.07,0.04,0.02,0],
    clip: [[Q.tuck, 5], [Q.tuck, 16], [Q.crouch, 7]] }),
  standUp: phase(12, 4, 10, { clip: [[Q.crouch, 5], [Q.standUp, 7]] }),

  dead: { dur: 999, transition: 999, clip: [[Q.deadA, 10], [Q.deadB, 30]] },
};

export class MovementHero extends Hero {
  get move() { return FLOW[this.state] || super.move; }

  go(state, f = 0) {
    super.go(state, f);
    this.enterFace = this.face;
  }

  buffered(input, key) { return !!input[key + 'Press'] || (input.buffer?.[key] ?? 0) > 0; }
  take(input, key) { if (input.consume) input.consume(key); }

  update(world, input, game) {
    if (this.hurtT > 0) this.hurtT--;
    const m = this.move;
    this.f++;
    if (this.state === 'dead') return;

    if (m.flipAt && this.f === m.flipAt) this.face *= -1;

    // Authored root motion first. Pivot root is signed against the facing at
    // entry so the body brakes before the flip and accelerates after it.
    if (m.root) {
      const k = Math.min(m.root.length - 1, this.f - 1);
      const basis = m.rootSigned ? (this.f < (m.flipAt || 999) ? this.enterFace : this.face) : this.face;
      this.tryX(world, m.root[k] * basis);
    } else if (m.speed) {
      const r = this.tryX(world, m.speed * this.face);
      if (r.hit && this.state === 'run') { this.go('runStop'); return; }
    }

    if (m.air) this.airFrame(world, input, game);
    else if (!m.hang) this.stickToFloor(world);

    const done = this.f >= m.dur;
    const canTransition = this.f >= (m.transition ?? m.dur);

    if (m.hang) { this.hangFrame(world, input, done); return; }
    if (m.air) return;
    if (canTransition) this.flow(world, input, game, done);
  }

  stickToFloor(world) {
    if (this.grounded(world)) { this.fallFrom = this.y; return; }
    if (['run','runStart','runStop','pivot','roll'].includes(this.state)) {
      const speed = this.state === 'run' ? 1.5 : this.state === 'runStart' ? 1.2 : 0.8;
      this.vx = speed * this.face;
      this.vy = 0;
      this.fallFrom = this.y;
      this.go('fall');
      return;
    }
    super.stickToFloor(world);
  }

  flow(world, input, game, done) {
    const s = this.state;

    if (s === 'stand') {
      if (input.down) { this.go('crouch'); return; }
      if (this.buffered(input, 'jump')) { this.take(input, 'jump'); this.jump(world, input, false); return; }
      if (input.dir === -this.face) { this.go('pivot'); return; }
      if (input.dir === this.face) { this.go('step'); return; }
      return;
    }

    if (s === 'step') {
      if (this.buffered(input, 'jump')) { this.take(input, 'jump'); this.jump(world, input, false); return; }
      if (input.dir === -this.face) { this.go('pivot'); return; }
      if (done) {
        if (input.dir === this.face && input.dirHeld > 13) this.go('runStart');
        else if (input.dir === this.face) this.go('step');
        else this.go('stand');
      }
      return;
    }

    if (s === 'runStart') {
      if (this.buffered(input, 'jump')) { this.take(input, 'jump'); this.jump(world, input, true); return; }
      if (input.dir === -this.face) { this.go('runStop'); return; }
      if (!input.dir) { this.go('runStop'); return; }
      if (done) this.go('run');
      return;
    }

    if (s === 'run') {
      if (this.armed) this.armed = false;
      if (this.buffered(input, 'jump')) { this.take(input, 'jump'); this.jump(world, input, true); return; }
      if (input.down) { this.go('roll'); return; }
      if (input.dir === -this.face) { this.go('runStop'); this.wantReverse = true; return; }
      if (!input.dir) { this.go('runStop'); this.wantReverse = false; return; }
      return;
    }

    if (s === 'runStop') {
      // Reversal requested during braking is remembered by held direction; the
      // pivot starts only after enough speed has physically bled away.
      if (input.dir === -this.face) this.wantReverse = true;
      if (this.buffered(input, 'jump') && this.f >= 15) {
        this.take(input, 'jump'); this.jump(world, input, false); return;
      }
      if (done) {
        if (this.wantReverse || input.dir === -this.face) { this.wantReverse = false; this.go('pivot'); }
        else if (input.dir === this.face) this.go('runStart');
        else this.go('stand');
      }
      return;
    }

    if (s === 'pivot') {
      if (done) {
        if (input.dir === this.face) this.go('runStart');
        else this.go('stand');
      }
      return;
    }

    if (s === 'land') {
      if (this.buffered(input, 'jump') && this.f >= 9) { this.take(input, 'jump'); this.jump(world, input, false); return; }
      if (done) {
        if (input.dir === this.face) this.go('step');
        else if (input.dir === -this.face) this.go('pivot');
        else this.go('stand');
      }
      return;
    }

    if (s === 'landHard') { if (done) this.go('stand'); return; }
    if (s === 'gather' && done) { this.launch(0.95, -3.2); return; }
    if (s === 'gatherRun' && done) { this.launch(1.86, -3.05); return; }

    if (s === 'crouch' && done) { this.go('crouchIdle'); return; }
    if (s === 'crouchIdle') {
      if (input.up && this.clear(world, this.x, this.y, HERO_H)) { this.go('standUp'); return; }
      if (input.dir === this.face) { this.go('roll'); return; }
      if (input.dir === -this.face) { this.face *= -1; return; }
      return;
    }
    if (s === 'roll' && done) { this.go('crouchIdle'); return; }
    if (s === 'standUp' && done) { this.go('stand'); return; }
  }

  jump(world, input, running) {
    if (this.armed) this.armed = false;
    if (running) { this.go('gatherRun'); this.jumpDir = input.dir || this.face; return; }
    this.jumpDir = input.dir === this.face ? this.face : 0;
    this.go('gather');
  }

  pose() { return sample(this.move.clip, this.f, !!this.move.loop); }
}
