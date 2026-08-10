// The other man.
//
// The point of a committed move set is that both sides are on the same clock.
// A swordsman whose strike came out instantly would make the parry a reflex
// test; a swordsman who telegraphs for six frames and lands on one makes it a
// READING test, and that is the whole game. So he runs the hero's own move
// table — literally the same lengths, the same `hitAt`, the same `guarding`
// window — off the same rects, out of a differently-painted copy of the sheet
// (`ref/pop-foe.png`, the same eighteen colours permuted).
//
// His only advantage is that he does not have to think about it, and his only
// disadvantage is that his decisions are made once per move rather than once
// per frame. That is a fair fight at this scale.

import { drawSprite } from './sprite.js';

// The moves, and they are the hero's numbers because a duel with two different
// clocks in it is not a duel. `hitAt` is the ONE frame the edge is anywhere;
// `guarding` is the window either side of it in which an incoming blow is
// turned aside instead of landing.
const F = {
  guard:   { dur: 999, loop: true, anim: 'swordGuard', frames: 4, hold: 26 },
  advance: { dur: 20, anim: 'swordAdvance', frames: 4, dx: 0.5 },
  retreat: { dur: 22, anim: 'swordRetreat', frames: 4, dx: -0.45 },
  strike:  { dur: 30, anim: 'swordStrike', frames: 9, hitAt: 11, reach: 26 },
  parry:   { dur: 24, anim: 'swordParry', frames: 3, guarding: [3, 16] },
  clang:   { dur: 18, anim: 'swordGuard', frames: 2, dx: -0.4 },
  hurt:    { dur: 28, anim: 'hurt', frames: 10, sheet: 'body', dx: -1.0 },
  dead:    { dur: 999, anim: 'dead', frames: 11, sheet: 'body' },
};

// How close he wants to be. Inside `LUNGE` he can reach you; outside `NEAR` he
// closes. The band between them is where a duel actually happens.
const LUNGE = 32, NEAR = 46, CLOSE = 26;

export class Swordsman {
  // `range` is the stretch of floor he will not step off. He has no sense of
  // the level in him at all — he only knows where you are — so the bench tells
  // him where the ground ends rather than teaching him to look.
  constructor(x, y, face = -1, range = [182, 300]) {
    this.x = x; this.y = y; this.face = face; this.range = range;
    this.state = 'guard'; this.f = 0;
    this.health = 2;
    this.think = 40;              // frames until the next decision
    this.hitQueued = false;
  }

  get move() { return F[this.state]; }
  get dead() { return this.state === 'dead'; }

  go(state) { this.state = state; this.f = 0; }

  // Is his blade in the way right now? The parry window, and the same few
  // frames of the strike where the edge is up — a blow into a raised sword
  // rings off it.
  get guarding() {
    const m = this.move;
    return !!(m.guarding && this.f >= m.guarding[0] && this.f <= m.guarding[1]);
  }

  // where the point of his blade is on the frame it lands
  tip() { return { x: this.x + this.face * (this.move.reach ?? 26), y: this.y - 18 }; }

  struck(fromX) {
    if (this.dead) return 'miss';
    if (this.guarding) { this.go('clang'); return 'parried'; }
    if (this.state === 'hurt') return 'miss';       // one hit per stagger
    this.face = fromX < this.x ? -1 : 1;
    this.health--;
    this.go(this.health <= 0 ? 'dead' : 'hurt');
    return this.health <= 0 ? 'killed' : 'hit';
  }

  update(hero) {
    const m = this.move;
    this.f++;
    if (m.hitAt && this.f === m.hitAt) this.hitQueued = true;
    if (m.dx) this.x = Math.max(this.range[0], Math.min(this.range[1], this.x + m.dx * this.face));
    if (this.dead) return;

    const done = this.f >= m.dur;
    if (!done && this.state !== 'guard') return;    // committed, like everyone

    // He turns to face you, then decides. One decision per move, not per
    // frame — which is what makes him readable and what makes backing out of
    // his reach a real answer.
    const gap = Math.abs(hero.x - this.x);
    this.face = hero.x < this.x ? -1 : 1;
    if (this.state !== 'guard') { this.go('guard'); this.think = 14 + (this.f % 11); }
    if (--this.think > 0) return;

    if (gap > NEAR) this.go('advance');
    else if (gap < CLOSE) this.go('retreat');
    else if (hero.state === 'strike') this.go('parry');
    else this.go(gap <= LUNGE ? 'strike' : 'advance');
    this.think = 12 + (this.x | 0) % 13;
  }

  draw(scr) {
    const m = this.move;
    const i = Math.min(m.frames - 1, Math.floor(this.f / (m.dur === 999 ? (m.hold ?? 26) : m.dur / m.frames)));
    const k = m.loop ? i % m.frames : i;
    drawSprite(scr, m.anim, k, this.x, this.y, this.face, m.sheet ?? 'foe');
  }
}
