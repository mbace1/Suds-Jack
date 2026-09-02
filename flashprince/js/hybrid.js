// The cultivation keeper.
//
// This is a living encounter, not a reskinned sentry. It reads the one tool
// that can be used without hurting it: the raised shield. Hold that signal
// while facing the keeper and it answers in kind. Fire first and the same
// organism becomes a compact boss, telegraphing slow spores that can be
// reflected back. Either outcome opens the route, but the world remembers it.

import { C } from './palette.js?v=52';

const COMMUNE = 84;
const STATE = {
  observe: 999,
  answer: 999,
  allied: 999,
  warn: 48,
  fire: 7,
  recover: 52,
  hurt: 22,
  dead: 999,
};

export class HybridKeeper {
  constructor(x, y, outcome = null) {
    this.x = x; this.y = y; this.face = -1;
    this.state = outcome === 'allied' ? 'allied' : outcome === 'slain' ? 'dead' : 'observe';
    this.f = 0;
    this.health = outcome === 'slain' ? 0 : 3;
    this.bond = outcome === 'allied' ? COMMUNE : 0;
    this.giftQueued = false;
    this.shotQueued = false;
  }

  get dead() { return this.state === 'dead'; }
  get allied() { return this.state === 'allied'; }
  get hostile() { return ['warn', 'fire', 'recover', 'hurt'].includes(this.state); }
  get resolved() { return this.dead || this.allied; }
  get bondRatio() { return Math.min(1, this.bond / COMMUNE); }

  go(state) { this.state = state; this.f = 0; }

  struck(fromX) {
    if (this.dead) return 'miss';
    this.face = fromX < this.x ? -1 : 1;
    // Trust can be broken. The keeper is beautiful and approachable, but it
    // is not a passive prop waiting to be shot.
    if (this.allied || this.state === 'observe' || this.state === 'answer') this.bond = 0;
    if (this.state === 'hurt') return 'miss';
    this.health--;
    this.go(this.health <= 0 ? 'dead' : 'hurt');
    return this.dead ? 'killed' : 'hit';
  }

  update(hero) {
    this.f++;
    if (this.resolved) return;
    this.face = hero.x < this.x ? -1 : 1;
    const gap = Math.abs(hero.x - this.x);

    if (this.state === 'observe' || this.state === 'answer') {
      const facing = (this.x - hero.x) * hero.face > 0;
      const signalling = gap >= 28 && gap <= 96 && facing && hero.shielding;
      if (signalling) {
        this.bond++;
        if (this.state !== 'answer') this.go('answer');
        if (this.bond >= COMMUNE) {
          this.bond = COMMUNE;
          this.go('allied');
          this.giftQueued = true;
        }
      } else {
        this.bond = Math.max(0, this.bond - 0.2);
        if (this.state === 'answer' && this.bond === 0) this.go('observe');
      }
      return;
    }

    if (this.state === 'fire' && this.f === 1) this.shotQueued = true;
    if (this.f < STATE[this.state]) return;
    if (this.state === 'hurt' || this.state === 'recover') this.go('warn');
    else if (this.state === 'warn') this.go('fire');
    else if (this.state === 'fire') this.go('recover');
  }

  spore() {
    const x = this.x + this.face * 18;
    return { x, px: x, y: this.y - 23, vx: this.face * 2.9, life: 145, fromX: this.x, bio: true };
  }

  draw(scr) {
    const x = this.x, y = this.y;
    const breathe = this.dead ? 0 : [0, 1, 2, 1][(this.f >> 4) & 3];
    const sway = this.dead ? 0 : [-1, 0, 1, 0][(this.f >> 5) & 3];
    const warm = this.allied || this.state === 'answer';
    const warning = this.state === 'warn';
    const core = this.dead ? C.DARK : warning && ((this.f >> 2) & 1) ? C.ALERT : warm ? C.LUX2 : C.LUX;

    if (this.dead) {
      // A closed seed pod, not a corpse.
      scr.poly([x - 18, y - 3, x - 8, y - 15, x + 10, y - 14, x + 19, y - 3], C.DARK);
      scr.poly([x - 11, y - 5, x, y - 19, x + 12, y - 5, x, y - 9], C.SOLID);
      scr.rect(x - 5, y - 5, 10, 2, C.NEAR);
      return;
    }

    // Six separate silhouettes make this usable layered art: root-feet, long
    // robe body, paired arms, collar fins, head and luminous crown.
    scr.poly([x - 13, y, x - 7, y - 31, x + 5, y - 35, x + 14, y, x + 5, y - 4, x - 5, y - 3], C.NEAR);
    scr.poly([x - 8, y - 5, x - 4, y - 33, x + 2, y - 34, x + 7, y - 5], C.LUX);
    scr.limb(x - 4, y - 30, x - 23 * this.face, y - 19 + sway, 5, 2, C.NEAR);
    scr.limb(x + 3, y - 29, x + 19 * this.face, y - 17 - sway, 5, 2, C.EDGE);
    scr.poly([x - 4, y - 32, x - 19, y - 45 - breathe, x - 2, y - 41], C.EDGE);
    scr.poly([x + 4, y - 32, x + 18, y - 47 + breathe, x + 2, y - 41], C.LUX);
    scr.disc(x, y - 48 - breathe, 8, C.LUX);
    scr.poly([x - 6, y - 51 - breathe, x, y - 61 - breathe, x + 7, y - 50 - breathe], C.LUX2);
    scr.rect(x - 3, y - 50 - breathe, 2, 1, C.VOID);
    scr.rect(x + 3, y - 50 - breathe, 2, 1, C.VOID);
    scr.disc(x, y - 38, 3 + (warm ? 1 : 0), core);

    if (this.state === 'answer') {
      const r = 17 + Math.floor(this.bondRatio * 11);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + this.f * 0.025;
        scr.rect(x + Math.cos(a) * r, y - 38 + Math.sin(a) * r, 2, 2, i & 1 ? C.LUX : C.LUX2);
      }
    }
    if (warning) {
      const r = 8 + Math.floor(this.f / STATE.warn * 19);
      scr.disc(x + this.face * 14, y - 24, r, C.ALERT, 0.16);
      scr.disc(x + this.face * 14, y - 24, 2 + ((this.f >> 2) & 1), C.LUX2);
    }
  }
}

export const HYBRID_COMMUNE_FRAMES = COMMUNE;
