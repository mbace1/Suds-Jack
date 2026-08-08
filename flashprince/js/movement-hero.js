// Flash Prince — movement-lab locomotion prototype.
//
// This deliberately sits beside hero.js rather than replacing it yet. The lab
// uses the real Hero collision, ledge, fall and jump machinery, but this class
// replaces locomotion timing so we can prove the feel before the campaign
// inherits it.

import { Hero, HERO_H } from './hero.js';
import { POSE as Q, sample } from './figure.js';
import { R } from './movement-poses.js';

const phase = (dur, anticipate, transition, extra = {}) => ({
  dur, anticipate, commit: transition - anticipate, transition, ...extra,
});

const FLOW = {
  stand: { dur: 999, loop: true, transition: 0, clip: [[Q.breathe, 46], [Q.stand, 54]] },

  step: phase(22, 4, 16, {
    root: [0.05,0.10,0.18,0.28,0.44,0.62,0.82,0.98,1.08,1.10,1.05,0.96,0.84,0.70,0.56,0.42,0.32,0.24,0.18,0.12,0.08,0.04],
    clip: [[Q.step1, 7], [Q.step2, 8], [Q.step3, 7]],
  }),

  // Rotoscope 2.0: these are no longer recycled run/step keys. The torso loads,
  // the rear leg pushes, then the body crosses into the first running contact.
  runStart: phase(9, 2, 7, {
    root: [0.24,0.42,0.68,0.96,1.22,1.43,1.56,1.62,1.62],
    clip: [[R.startLoad, 3], [R.startPush, 3], [R.startFly, 2], [Q.run1, 1]],
  }),

  run: { dur: 999, loop: true, transition: 0, speed: 1.62,
    clip: [[Q.run1, 5], [Q.run2, 5], [Q.run3, 5], [Q.run4, 5]] },

  runStop: phase(20, 0, 12, {
    root: [1.52,1.44,1.34,1.23,1.10,0.96,0.82,0.69,0.57,0.46,0.36,0.28,0.21,0.15,0.10,0.06,0.03,0.01,0,0],
    clip: [[R.brakeReach, 5], [R.brakePlant, 7], [R.brakeSettle, 5], [Q.stand, 3]],
  }),

  pivot: phase(16, 3, 12, {
    flipAt: 9,
    root: [0.18,0.13,0.08,0.04,0,0,0,0,0,0.03,0.10,0.20,0.34,0.50,0.68,0.88],
    rootSigned: true,
    clip: [[R.pivotLoad, 5], [R.pivotPlant, 4], [R.pivotPush, 4], [R.startPush, 3]],
  }),

  gather: phase(7, 2, 7, { clip: [[Q.gather, 7]] }),
  gatherRun: phase(4, 1, 4, { root: [1.25,1.42,1.55,1.62], clip: [[R.startFly, 1], [Q.gather, 3]] }),
  air: { dur: 999, air: true, transition: 0, clip: [[Q.launch, 6], [Q.rise, 8], [Q.apex, 10], [Q.descend, 40]] },
  fall: { dur: 999, air: true, transition: 0, clip: [[Q.descend, 8], [Q.descend, 40]] },

  land: phase(13, 4, 9, { clip: [[R.landCatch, 5], [R.landRise, 5], [Q.stand, 3]] }),
  landHard: phase(28, 9, 24, { clip: [[Q.sprawl, 12], [R.landCatch, 7], [R.landRise, 6], [Q.stand, 3]] }),

  // A catch now has its own impact instead of snapping directly to a calm hang.
  ledgeCatch: phase(12, 0, 12, { hang: true, clip: [[R.catchHit, 4], [R.catchDrop, 5], [Q.hang, 3]] }),
  hang: { dur: 999, loop: true, hang: true, transition: 0, clip: [[Q.hang, 70], [Q.hangSwing, 70]] },
  pullUp: phase(42, 8, 36, { hang: true,
    clip: [[Q.hang, 4], [Q.pullUp, 13], [R.mantleKnee, 12], [R.mantleRise, 9], [Q.stand, 4]] }),

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

  // The inherited ledge finder remains authoritative; only the arrival state
  // changes. Hands still snap to the exact physical lip, then the catch impact
  // visibly spends twelve frames before the calm hanging loop begins.
  grab(ledge) {
    this.x = ledge.x;
    this.y = ledge.y + 26;
    this.face = ledge.face;
    this.vx = this.vy = 0;
    this.ledgeY = ledge.y;
    this.go('ledgeCatch');
  }

  hangFrame(world, input, done) {
    if (this.state === 'ledgeCatch') {
      // a tiny pendulum settle: hands stay fixed while feet/body drop under them.
      const t = Math.min(1, this.f / FLOW.ledgeCatch.dur);
      this.y = this.ledgeY + 26 + Math.sin(t * Math.PI) * 1.5;
      if (done) { this.y = this.ledgeY + 26; this.go('hang'); }
      return;
    }

    if (this.state === 'pullUp') {
      const t = Math.min(1, Math.max(0, (this.f - 6) / 29));
      this.y = this.ledgeY + 26 - 26 * t;
      this.x += (this.f > 23 ? 0.40 : 0.11) * this.face;
      if (done) { this.y = this.ledgeY; this.go('stand'); }
      return;
    }

    if (input.up) { this.go('pullUp'); return; }
    if (input.down || input.dir === -this.face) {
      this.vx = 0; this.vy = 0.4; this.fallFrom = this.y;
      this.go('fall');
    }
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
      if (input.dir === -this.face || !input.dir) { this.go('runStop'); return; }
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
      if (this.buffered(input, 'jump') && this.f >= 10) { this.take(input, 'jump'); this.jump(world, input, false); return; }
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
