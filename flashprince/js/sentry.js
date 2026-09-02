// The flooded hub's old security machine.
//
// It is not a second animated person. Its readable parts are mechanical states:
// a quiet lens, a tracking sweep, a long warning charge, one fast bolt, then a
// cooling pause. The warning is deliberately much longer than the shot so the
// answer is a decision — crouch under it, raise the pistol shield, or shoot the
// machine before it fires.

import { C } from './palette.js?v=52';

const STATE = {
  idle: 70,
  track: 34,
  warn: 42,
  fire: 6,
  cool: 64,
  hurt: 22,
  dead: 999,
};

export class Sentry {
  constructor(x, y, face = -1) {
    this.x = x; this.y = y; this.face = face;
    this.state = 'idle'; this.f = 0; this.health = 2;
    this.shotQueued = false;
  }

  get dead() { return this.state === 'dead'; }
  go(state) { this.state = state; this.f = 0; }

  update(hero) {
    this.f++;
    if (this.dead) return;
    this.face = hero.x < this.x ? -1 : 1;
    const gap = Math.abs(hero.x - this.x);

    if (this.state === 'idle') {
      if (gap < 245 && this.f > 18) this.go('track');
      return;
    }
    if (this.state === 'fire' && this.f === 1) this.shotQueued = true;
    if (this.f < STATE[this.state]) return;
    if (this.state === 'track') this.go('warn');
    else if (this.state === 'warn') this.go('fire');
    else if (this.state === 'fire') this.go('cool');
    else if (this.state === 'cool' || this.state === 'hurt') this.go(gap < 245 ? 'track' : 'idle');
  }

  muzzle() { return { x: this.x + this.face * 17, y: this.y - 22 }; }

  bolt() {
    const m = this.muzzle();
    return { x: m.x, px: m.x, y: m.y, vx: this.face * 3.8, life: 110, fromX: this.x };
  }

  struck(fromX) {
    if (this.dead || this.state === 'hurt') return 'miss';
    this.face = fromX < this.x ? -1 : 1;
    this.health--;
    this.go(this.health <= 0 ? 'dead' : 'hurt');
    return this.dead ? 'killed' : 'hit';
  }

  draw(scr) {
    const dead = this.dead;
    const bob = dead ? 0 : ((this.f >> 4) & 1);
    const x = this.x, y = this.y;
    // Heavy rail-service base and a narrow swivelling head.
    scr.rect(x - 10, y - 7, 20, 7, dead ? C.DARK : C.NEAR);
    scr.rect(x - 7, y - 10, 14, 4, C.SOLID);
    scr.rect(x - 2, y - 26 + bob, 4, 17, C.SOLID);
    scr.rect(x - 8, y - 31 + bob, 16, 8, dead ? C.DARK : C.NEAR);
    scr.rect(this.face > 0 ? x + 6 : x - 17, y - 29 + bob, 11, 3, C.SOLID);
    const warning = this.state === 'warn';
    const hot = this.state === 'fire' || (warning && ((this.f >> 2) & 1));
    scr.disc(x + this.face * 5, y - 27 + bob, hot ? 3 : 2, dead ? C.DARK : hot ? C.LUX2 : C.LUX);
    if (warning) {
      const m = this.muzzle();
      const length = 20 + Math.floor(this.f / STATE.warn * 50);
      scr.rect(this.face > 0 ? m.x : m.x - length, m.y, length, 1, C.ALERT);
    }
    // A small service light keeps it visually tied to the hub machinery.
    if (!dead) scr.rect(x - 1, y - 5, 3, 2, this.state === 'cool' ? C.EDGE : C.LUX);
  }
}

const crossed = (a, b, x) => x >= Math.min(a, b) && x <= Math.max(a, b);

// Move one hostile bolt and resolve it against the two meaningful silhouettes:
// the shield plane first, then the body. A high bolt passes over a crouch.
export function advanceBolt(bolt, hero) {
  bolt.px = bolt.x;
  bolt.x += bolt.vx;
  bolt.life--;

  if (bolt.friendly) return bolt.life <= 0 || bolt.x < -8 || bolt.x > 328 ? 'spent' : null;

  const fromFront = (bolt.px - hero.x) * hero.face > 0;
  const shieldX = hero.x + hero.face * 17;
  if (hero.shielding && fromFront && crossed(bolt.px, bolt.x, shieldX)
      && bolt.y >= hero.y - 34 && bolt.y <= hero.y - 2) {
    // The first eight frames are a deliberate deflect. Holding it later still
    // blocks, but costs more energy and cannot return the shot.
    return hero.f <= 8 ? 'reflect' : 'shield';
  }

  if (crossed(bolt.px, bolt.x, hero.x)
      && bolt.y >= hero.y - hero.h && bolt.y <= hero.y) return 'hit';
  return bolt.life <= 0 || bolt.x < -8 || bolt.x > 328 ? 'spent' : null;
}

export function drawBolt(scr, bolt) {
  const x = Math.min(bolt.x, bolt.x - bolt.vx * 3);
  scr.rect(x, bolt.y - 1, Math.abs(bolt.vx * 3) + 2, 2, bolt.bio ? C.LUX : C.ALERT);
  scr.rect(bolt.x - 1, bolt.y - 1, 3, 2, C.LUX2);
}
