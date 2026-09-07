// Life and machines beyond the cultivation crown.
//
// Each silhouette asks a different question. Grazers are harmless until the
// player chooses violence. Survey drones fire along the floor, so jumping is
// the clean answer and a shield reflection is the aggressive one. Wardens are
// armoured from the front until their rush hits a shield and exposes the core.

import { C } from './palette.js?v=52';

export class GlassGrazer {
  constructor(x, y, face = 1) {
    this.x = x; this.y = y; this.face = face;
    this.state = 'graze'; this.f = 0; this.health = 2;
    this.hitQueued = false; this.dropQueued = false;
  }

  get dead() { return this.state === 'dead'; }
  get hostile() { return !['graze', 'startle', 'dead'].includes(this.state); }
  go(state) { this.state = state; this.f = 0; }

  struck(fromX) {
    if (this.dead || this.state === 'hurt') return 'miss';
    this.face = fromX < this.x ? -1 : 1;
    this.health--;
    this.go(this.health <= 0 ? 'dead' : 'hurt');
    if (this.dead) this.dropQueued = true;
    return this.dead ? 'killed' : 'hit';
  }

  update(hero) {
    this.f++;
    if (this.dead) return;
    const gap = Math.abs(hero.x - this.x);
    if (this.state === 'graze') {
      if (gap < 35) { this.face = hero.x < this.x ? 1 : -1; this.go('startle'); }
      return;
    }
    if (this.state === 'startle') {
      this.x += this.face * 0.55;
      if (this.f >= 30) this.go('graze');
      return;
    }
    if (this.state === 'hurt') { if (this.f >= 22) this.go('warn'); return; }
    if (this.state === 'warn') {
      this.face = hero.x < this.x ? -1 : 1;
      if (this.f >= 34) this.go('leap');
      return;
    }
    if (this.state === 'leap') {
      this.x += this.face * 2.1;
      if (this.f === 8) this.hitQueued = true;
      if (this.f >= 17) this.go('recover');
      return;
    }
    if (this.state === 'recover' && this.f >= 46) this.go('warn');
  }

  draw(scr) {
    const x = this.x, y = this.y;
    if (this.dead) {
      scr.poly([x - 12, y - 2, x - 7, y - 8, x + 10, y - 7, x + 15, y - 2], C.DARK);
      scr.rect(x - 7, y - 6, 14, 3, C.NEAR);
      return;
    }
    const step = this.state === 'leap' ? -5 : ((this.f >> 3) & 1);
    const alarm = this.state === 'warn' && ((this.f >> 2) & 1);
    scr.poly([x - 14, y - 10 + step, x - 7, y - 20 + step, x + 10, y - 18 + step,
      x + 16, y - 9 + step, x + 8, y - 5 + step, x - 8, y - 5 + step], C.NEAR);
    scr.poly([x - 8, y - 17 + step, x, y - 28 + step, x + 7, y - 17 + step], C.LUX);
    scr.rect(x - 10, y - 6 + step, 3, 7 - step, C.SOLID);
    scr.rect(x + 8, y - 6 + step, 3, 7 - step, C.SOLID);
    scr.rect(x + this.face * 9, y - 15 + step, 2, 2, alarm ? C.ALERT : C.LUX2);
    if (alarm) scr.poly([x - 18, y, x, y - 3, x + 18, y], C.ALERT);
  }
}

export class SurveyDrone {
  constructor(x, y, face = -1) {
    this.x = x; this.y = y; this.face = face;
    this.state = 'scan'; this.f = 0; this.health = 2;
    this.shotQueued = false; this.dropQueued = false;
  }

  get dead() { return this.state === 'dead'; }
  go(state) { this.state = state; this.f = 0; }

  struck(fromX) {
    if (this.dead || this.state === 'hurt') return 'miss';
    this.face = fromX < this.x ? -1 : 1;
    this.health--;
    this.go(this.health <= 0 ? 'dead' : 'hurt');
    if (this.dead) this.dropQueued = true;
    return this.dead ? 'killed' : 'hit';
  }

  update(hero) {
    this.f++;
    if (this.dead) return;
    if (this.state === 'scan') {
      this.face = hero.x < this.x ? -1 : 1;
      if (Math.abs(hero.x - this.x) < 250 && this.f >= 38) this.go('warn');
      return;
    }
    if (this.state === 'fire' && this.f === 1) this.shotQueued = true;
    const duration = { warn: 50, fire: 5, cool: 72, hurt: 25 }[this.state];
    if (this.f < duration) return;
    if (this.state === 'warn') this.go('fire');
    else if (this.state === 'fire') this.go('cool');
    else this.go('scan');
  }

  bolt() {
    const x = this.x + this.face * 14;
    return { x, px: x, y: this.y - 9, vx: this.face * 3.35, life: 125,
      fromX: this.x, bio: true, low: true };
  }

  draw(scr) {
    const x = this.x, y = this.y - 45 + (this.dead ? 42 : Math.sin(this.f * 0.06) * 3);
    if (this.dead) {
      scr.rect(x - 11, y - 4, 22, 5, C.DARK);
      scr.rect(x - 5, y - 7, 10, 3, C.NEAR);
      return;
    }
    const warning = this.state === 'warn';
    scr.poly([x - 15, y, x - 7, y - 7, x + 8, y - 7, x + 15, y,
      x + 7, y + 6, x - 8, y + 6], C.NEAR);
    scr.poly([x - 9, y - 5, x, y - 12, x + 9, y - 5], C.EDGE);
    scr.rect(x - 18, y - 2, 6, 3, C.SOLID);
    scr.rect(x + 12, y - 2, 6, 3, C.SOLID);
    scr.disc(x + this.face * 5, y, warning ? 3 : 2,
      warning && ((this.f >> 2) & 1) ? C.ALERT : C.LUX2);
    if (warning) {
      const spread = 12 + Math.floor(this.f / 50 * 26);
      scr.rect(x - spread, this.y - 9, spread * 2, 1, C.ALERT);
    }
  }
}

export class RushWarden {
  constructor(x, y, face = -1) {
    this.x = x; this.y = y; this.face = face;
    this.state = 'guard'; this.f = 0; this.health = 3;
    this.hitQueued = false; this.dropQueued = false;
  }

  get dead() { return this.state === 'dead'; }
  get exposed() { return this.state === 'vent'; }
  go(state) { this.state = state; this.f = 0; }

  struck(fromX, force = false) {
    if (this.dead || this.state === 'hurt') return 'miss';
    const fromFront = (fromX - this.x) * this.face > 0;
    if (fromFront && !this.exposed && !force) return 'armored';
    this.health--;
    this.face = fromX < this.x ? -1 : 1;
    this.go(this.health <= 0 ? 'dead' : 'hurt');
    if (this.dead) this.dropQueued = true;
    return this.dead ? 'killed' : 'hit';
  }

  openCore() { if (!this.dead) this.go('vent'); }

  update(hero) {
    this.f++;
    if (this.dead) return;
    if (this.state === 'guard') {
      this.face = hero.x < this.x ? -1 : 1;
      if (Math.abs(hero.x - this.x) < 190 && this.f >= 34) this.go('warn');
      return;
    }
    if (this.state === 'warn') {
      this.face = hero.x < this.x ? -1 : 1;
      if (this.f >= 42) this.go('rush');
      return;
    }
    if (this.state === 'rush') {
      this.x += this.face * 2.45;
      if (this.f === 7) this.hitQueued = true;
      if (this.f >= 18) this.go('vent');
      return;
    }
    const duration = this.state === 'vent' ? 68 : 26;
    if (this.f >= duration) this.go('guard');
  }

  draw(scr) {
    const x = this.x, y = this.y;
    if (this.dead) {
      scr.rect(x - 15, y - 7, 30, 7, C.DARK);
      scr.rect(x - 9, y - 12, 18, 5, C.NEAR);
      return;
    }
    const rush = this.state === 'rush' ? 3 : 0;
    const warning = this.state === 'warn';
    scr.rect(x - 13, y - 31 + rush, 26, 27, C.NEAR);
    scr.poly([x - 16, y - 29 + rush, x + 16, y - 29 + rush, x + 11, y - 38 + rush,
      x - 10, y - 38 + rush], C.SOLID);
    scr.rect(x - 17, y - 24 + rush, 4, 19, C.DARK);
    scr.rect(x + 13, y - 24 + rush, 4, 19, C.DARK);
    scr.rect(x - 11, y - 4, 8, 4, C.SOLID);
    scr.rect(x + 3, y - 4, 8, 4, C.SOLID);
    const core = this.exposed ? C.LUX2 : warning && ((this.f >> 2) & 1) ? C.ALERT : C.DARK;
    scr.disc(x, y - 20 + rush, this.exposed ? 5 : 3, core);
    // The lit slab is always on the side facing the player: shoot around it,
    // or let the rush hit the shield and expose the centre.
    scr.rect(x + this.face * 11 - (this.face < 0 ? 5 : 0), y - 31 + rush, 5, 26, C.EDGE);
    if (warning) scr.poly([x, y - 2, x + this.face * 34, y, x + this.face * 52, y - 2], C.ALERT);
  }
}
