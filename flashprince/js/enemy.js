// Three things that will kill you, and the one rule they share.
//
// A sentry does not shoot you the moment he sees you. He stops, he registers,
// he draws, he aims, and THEN he fires — the same commitment the player is
// under, running on the same clock. That is the whole duel in Flashback and the
// sword fights in Prince of Persia both: two actors locked into animations,
// each betting that theirs finishes first. Take the wind-up away and the game
// becomes a reflex test; leave it in and it becomes a reading test.
//
// So the numbers below are the design. SPOT 26 frames, DRAW 26, AIM 16: about
// a second and a sixth from being seen to being shot, which is one roll, or one
// drop off a ledge, or — if you already had the pistol out — one shot of your
// own with eleven frames to spare.

import { POSE as Q, sample, blend, drawFigure } from './figure.js';
import { C } from './palette.js';

const SPOT = 26, DRAW = 26, AIM = 16, RECOVER = 34;
const SIGHT = 168, SIGHT_NEAR = 22;

export class Sentry {
  constructor(x, y) {
    this.x = x; this.y = y; this.face = -1;
    this.state = 'patrol'; this.f = 0;
    this.hp = 2; this.dead = false; this.hurtT = 0;
    this.home = x; this.type = 'sentry';
    this.w = 11; this.h = 30;
  }

  sees(hero) {
    if (hero.dead) return false;
    const dx = hero.x - this.x;
    if (Math.sign(dx) !== this.face && Math.abs(dx) > SIGHT_NEAR) return false;
    if (Math.abs(dx) > SIGHT) return false;
    if (Math.abs(hero.y - this.y) > 34) return false;
    // lying flat under a shot is also lying flat under his eyeline
    if (hero.low && Math.abs(dx) > 96) return false;
    return true;
  }

  update(world, hero, game) {
    this.f++;
    if (this.hurtT > 0) this.hurtT--;
    if (this.dead) return;

    switch (this.state) {
      case 'patrol': {
        const step = 0.42 * this.face;
        const ahead = this.x + this.face * 9;
        const floor = world.boxSolid(ahead - 3, this.y + 1, 6, 4);
        const wall = world.boxSolid(ahead - 3, this.y - 26, 6, 24);
        if (!floor || wall || Math.abs(this.x - this.home) > 54) { this.face *= -1; this.f = 0; }
        else this.x += step;
        if (this.sees(hero)) this.go('spot');
        break;
      }
      case 'spot':
        if (this.f >= SPOT) this.go('draw');
        break;
      case 'draw':
        if (this.f >= DRAW) this.go('aim');
        break;
      case 'aim':
        if (this.f >= AIM) {
          game.shoot(this.x + this.face * 13, this.y - 20, this.face * 3.4, 0, 'them');
          this.go('recover');
        }
        break;
      case 'recover':
        if (this.f >= RECOVER) this.go(this.sees(hero) ? 'aim' : 'patrol');
        break;
      case 'hit':
        if (this.f >= 18) this.go('aim');
        break;
    }
    // touching one is not fatal — his gun is the threat, not his body
  }

  go(s) { this.state = s; this.f = 0; }

  strike(game) {
    if (this.dead) return;
    this.hp--;
    this.hurtT = 8;
    if (this.hp <= 0) { this.dead = true; this.f = 0; game.fx.burst(this.x, this.y - 16, C.ALERT, 12); }
    else this.go('hit');
  }

  pose() {
    if (this.dead) return sample([[Q.deadA, 12], [Q.deadB, 40]], this.f);
    switch (this.state) {
      case 'patrol': return sample([[Q.step1, 9], [Q.step2, 9], [Q.step3, 9], [Q.step2, 9]], this.f, true);
      case 'spot': return blend(Q.stand, Q.alert, Math.min(1, this.f / 8));
      case 'draw': return sample([[Q.draw1, 11], [Q.draw2, 10], [Q.aim, 5]], this.f);
      case 'aim': return Q.aim;
      case 'recover': return sample([[Q.recoil, 6], [Q.aim, 28]], this.f);
      case 'hit': return sample([[Q.hurt, 10], [Q.aim, 8]], this.f);
      default: return Q.stand;
    }
  }

  draw(scr) {
    // He has to be legible against his own wall, which is what the first pass
    // got wrong: a dark guard in a dark hall is not atmospheric, it is a cheap
    // death. So the armour takes SOLID — the same value as the stone he is
    // standing on — and the legs take the shadow under it, which leaves a
    // silhouette that separates whichever way the biome swings.
    const hot = this.hurtT > 0;
    const col = {
      far: C.DARK, body: hot ? C.EDGE : C.SOLID, legs: hot ? C.EDGE : C.DARK,
      arms: hot ? C.EDGE : C.SOLID, skin: C.EDGE, hair: C.VOID,
      eye: C.ALERT, gun: C.VOID,
    };
    drawFigure(scr, this.x, this.y, this.face, this.pose(), col, {
      gun: !this.dead && (this.state === 'aim' || this.state === 'recover' || this.state === 'hit'),
    });
    // the exclamation an Another World guard never needed, because his rifle
    // coming up WAS the tell. This is the same tell, one pixel louder.
    if (this.state === 'spot') {
      const b = this.f % 10 < 5;
      if (b) { scr.rect(this.x - 1, this.y - 44, 3, 6, C.ALERT); scr.rect(this.x - 1, this.y - 36, 3, 3, C.ALERT); }
    }
  }
}

// The jungle's own. It does not draw anything, it just arrives.
export class Beast {
  constructor(x, y) {
    this.x = x; this.y = y; this.face = -1;
    this.state = 'prowl'; this.f = 0;
    this.hp = 1; this.dead = false; this.hurtT = 0;
    this.home = x; this.type = 'beast';
    this.w = 22; this.h = 15; this.vy = 0;
  }

  update(world, hero, game) {
    this.f++;
    if (this.dead) return;
    const dx = hero.x - this.x;

    if (this.state === 'prowl') {
      this.x += 0.3 * this.face;
      if (Math.abs(this.x - this.home) > 40 || !world.boxSolid(this.x + this.face * 12, this.y + 1, 4, 4)) {
        this.face *= -1;
      }
      if (!hero.dead && Math.abs(dx) < 118 && Math.abs(hero.y - this.y) < 30) {
        this.face = Math.sign(dx) || 1;
        this.go('coil');
      }
    } else if (this.state === 'coil') {
      if (this.f > 22) { this.vy = -3.1; this.go('leap'); }
    } else if (this.state === 'leap') {
      this.vy += 0.19;
      this.y += this.vy;
      const nx = this.x + 2.5 * this.face;
      if (!world.boxSolid(nx - 10, this.y - 15, 20, 14)) this.x = nx;
      if (this.vy > 0 && world.boxSolid(this.x - 8, this.y + 1, 16, 3)) {
        this.y = Math.round(this.y / 16) * 16;
        this.vy = 0; this.go('land');
      }
    } else if (this.state === 'land') {
      if (this.f > 16) this.go('prowl');
    }

    if (!hero.dead && Math.abs(dx) < 15 && Math.abs(hero.y - this.y) < 26) game.hurt(1, false, this.x);
  }

  go(s) { this.state = s; this.f = 0; }

  strike(game) {
    this.hp--; this.hurtT = 8;
    if (this.hp <= 0) { this.dead = true; this.f = 0; game.fx.burst(this.x, this.y - 8, C.ALERT, 14); }
  }

  draw(scr) {
    if (this.dead && this.f > 26) return;
    const f = this.face, x = this.x, y = this.y;
    const crouch = this.state === 'coil' ? Math.min(6, this.f * 0.3) : 0;
    const air = this.state === 'leap' ? 3 : 0;
    const b = y - 12 + crouch;
    const hot = this.hurtT > 0 ? C.EDGE : C.VOID;
    const skin = this.dead ? C.DARK : hot === C.EDGE ? C.EDGE : C.SOLID;

    if (this.dead) {
      scr.poly([x - 12, y, x + 12, y, x + 9, y - 6, x - 10, y - 5], C.DARK);
      return;
    }
    // legs first, behind the mass
    for (const s of [-1, 1]) {
      const px = x + s * 8 * f;
      scr.limb(px, b + 2, px - f * (2 - air), y, 2.6, 1.8, C.DARK);
    }
    // the body: one flat mass with a hard back line
    scr.poly([
      x - f * 13, b + 3, x - f * 9, b - 6, x + f * 6, b - 8 - air,
      x + f * 13, b - 3, x + f * 14, b + 4, x - f * 9, b + 5,
    ], skin);
    // head, low and forward, with the one bright thing on it
    const hx = x + f * 16, hy = b - 5 - air;
    scr.poly([hx - f * 5, hy - 4, hx + f * 7, hy - 2, hx + f * 7, hy + 4, hx - f * 4, hy + 5], skin);
    scr.poly([hx + f * 3, hy + 2, hx + f * 8, hy + 1, hx + f * 7, hy + 5], C.DARK);
    scr.rect(hx + f * 2 - 1, hy - 2, 2, 2, C.LUX2);
    // tail
    scr.limb(x - f * 13, b, x - f * 24, b - 8 - Math.sin(this.f * 0.2) * 4, 2.4, 0.8, skin);
  }
}

// Whatever the machine under the temple keeps for security.
export class Drone {
  constructor(x, y) {
    this.x = x; this.y = y - 40; this.home = { x, y: y - 40 };
    this.face = -1; this.f = 0; this.state = 'idle';
    this.hp = 2; this.dead = false; this.hurtT = 0; this.type = 'drone';
    this.w = 16; this.h = 14; this.vy = 0;
  }

  update(world, hero, game) {
    this.f++;
    if (this.dead) { this.vy += 0.24; this.y += this.vy; return; }
    const dx = hero.x - this.x;
    this.face = Math.sign(dx) || this.face;
    this.x += Math.max(-0.55, Math.min(0.55, dx * 0.01));
    this.y = this.home.y + Math.sin(this.f * 0.03) * 12;
    if (!hero.dead && this.f % 108 === 0 && Math.abs(dx) < 190) {
      const d = Math.hypot(dx, (hero.y - 16) - this.y) || 1;
      game.shoot(this.x, this.y + 4, dx / d * 1.9, ((hero.y - 16) - this.y) / d * 1.9, 'them', true);
    }
  }

  strike(game) {
    this.hp--; this.hurtT = 8;
    if (this.hp <= 0) { this.dead = true; this.vy = -1.4; game.fx.burst(this.x, this.y, C.LUX, 16); }
  }

  draw(scr) {
    const x = this.x, y = this.y, hot = this.hurtT > 0;
    const body = this.dead ? C.DARK : hot ? C.EDGE : C.NEAR;
    scr.poly([x - 11, y, x - 5, y - 7, x + 5, y - 7, x + 11, y, x + 5, y + 6, x - 5, y + 6], body);
    scr.poly([x - 5, y - 7, x + 5, y - 7, x + 4, y - 10, x - 4, y - 10], C.DARK);
    if (!this.dead) {
      const p = (this.f % 108) > 84;
      scr.disc(x + this.face * 4, y, 3, p ? C.ALERT : C.LUX);
      scr.rect(x - 13, y - 1, 3, 3, C.DARK);
      scr.rect(x + 10, y - 1, 3, 3, C.DARK);
    }
  }
}

// ── the swordsman ────────────────────────────────────────────────────
// Prince of Persia's guard, and the reason its duels are a conversation. He
// runs the SAME stance the player does — advance, retreat, strike, parry —
// with the same wind-ups, so a fight is two people reading each other rather
// than two people mashing. He will not walk into your blade, he backs off when
// you press him, and he punishes a strike thrown from too far away.
//
// The whole difficulty knob is `think`: how long he stands in guard before he
// commits to something. Shorten it and he is a machine; this is deliberately
// long enough that you always get to move first if you are willing to.
const SWING = 12, SWING_END = 30, REACH = 27, GUARD_WIN = [4, 18];

export class Swordsman {
  constructor(x, y) {
    this.x = x; this.y = y; this.face = -1;
    this.state = 'patrol'; this.f = 0;
    this.hp = 3; this.dead = false; this.hurtT = 0;
    this.home = x; this.type = 'swordsman';
    this.w = 12; this.h = 30;
    this.think = 46;
  }

  get guarding() { return this.state === 'parry' && this.f >= GUARD_WIN[0] && this.f <= GUARD_WIN[1]; }
  go(s) { this.state = s; this.f = 0; }

  sees(hero) {
    if (hero.dead) return false;
    const dx = hero.x - this.x;
    if (Math.abs(dx) > 150 || Math.abs(hero.y - this.y) > 34) return false;
    return Math.sign(dx) === this.face || Math.abs(dx) < 26;
  }

  update(world, hero, game) {
    this.f++;
    if (this.hurtT > 0) this.hurtT--;
    if (this.dead) return;
    const dx = hero.x - this.x, gap = Math.abs(dx);

    if (this.state === 'patrol') {
      const ahead = this.x + this.face * 9;
      if (!world.boxSolid(ahead - 3, this.y + 1, 6, 4) || world.boxSolid(ahead - 3, this.y - 26, 6, 24)
        || Math.abs(this.x - this.home) > 50) this.face *= -1;
      else this.x += 0.38 * this.face;
      if (this.sees(hero)) { this.face = Math.sign(dx) || this.face; this.go('draw'); }
      return;
    }
    if (this.state === 'draw') { if (this.f >= 26) this.go('guard'); return; }
    if (this.state === 'struck') { if (this.f >= 22) this.go('guard'); return; }
    if (this.state === 'clang') { if (this.f >= 18) this.go('guard'); return; }

    if (this.state === 'advance') { this.x += 0.5 * this.face; if (this.f >= 20) this.go('guard'); return; }
    if (this.state === 'retreat') { this.x -= 0.48 * this.face; if (this.f >= 22) this.go('guard'); return; }
    if (this.state === 'parry') { if (this.f >= 24) this.go('guard'); return; }

    if (this.state === 'strike') {
      if (this.f === SWING) {
        // the blow lands on ONE frame, and the parry window is the answer to it
        if (!hero.dead && gap < REACH + 8 && Math.abs(hero.y - this.y) < 26) {
          if (hero.guarding) { game.clash(this, hero); this.go('clang'); return; }
          game.hurt(1, false, this.x);
        }
      }
      if (this.f >= SWING_END) this.go('guard');
      return;
    }

    // guard: the decision. Distance picks the weights — he closes when you are
    // out of reach and gives ground when you are inside it.
    this.face = Math.sign(dx) || this.face;
    if (this.f < this.think) return;
    this.f = 0;
    this.think = 34 + ((this.x * 7 + this.hp * 13) % 26);
    if (!this.sees(hero)) { this.go('patrol'); return; }
    if (gap > REACH + 14) { this.go('advance'); return; }
    if (gap < 16) { this.go('retreat'); return; }
    // inside reach: mostly swing, sometimes read you instead
    const roll = (this.x * 31 + this.hp * 17 + this.think) % 100;
    this.go(roll < 58 ? 'strike' : roll < 80 ? 'parry' : roll < 92 ? 'advance' : 'retreat');
  }

  // the player's blade arriving
  cut(game) {
    if (this.dead) return 'miss';
    if (this.guarding) { this.go('clang'); return 'parried'; }
    this.hp--;
    this.hurtT = 9;
    if (this.hp <= 0) {
      this.dead = true; this.f = 0;
      game.fx.burst(this.x, this.y - 16, C.ALERT, 14);
      return 'killed';
    }
    this.go('struck');
    return 'hit';
  }

  strike(game) { this.cut(game); }         // a bullet works too

  pose() {
    if (this.dead) return sample([[Q.deadA, 12], [Q.deadB, 40]], this.f);
    switch (this.state) {
      case 'patrol': return sample([[Q.step1, 10], [Q.step2, 10], [Q.step3, 10], [Q.step2, 10]], this.f, true);
      case 'draw': return sample([[Q.draw1, 8], [Q.swordUp, 9], [Q.guardHi, 5], [Q.guard, 4]], this.f);
      case 'advance': return sample([[Q.advance, 11], [Q.guard, 9]], this.f);
      case 'retreat': return sample([[Q.retreat, 12], [Q.guard, 10]], this.f);
      case 'strike': return sample([[Q.strikeA, 8], [Q.strikeB, 10], [Q.strikeB, 6], [Q.guard, 9]], this.f);
      case 'parry': return sample([[Q.parry, 16], [Q.guard, 8]], this.f);
      case 'clang': return sample([[Q.clang, 10], [Q.guard, 8]], this.f);
      case 'struck': return sample([[Q.hurt, 10], [Q.guard, 12]], this.f);
      default: return sample([[Q.guard, 62], [Q.guardHi, 62]], this.f, true);
    }
  }

  draw(scr) {
    const hot = this.hurtT > 0;
    const col = {
      far: C.DARK, body: hot ? C.EDGE : C.SOLID, legs: hot ? C.EDGE : C.DARK,
      arms: hot ? C.EDGE : C.SOLID, skin: C.EDGE, hair: C.VOID,
      eye: C.ALERT, blade: C.EDGE, edge: C.LUX, hilt: C.VOID,
    };
    drawFigure(scr, this.x, this.y, this.face, this.pose(), col,
      { sword: !this.dead && this.state !== 'patrol' });
    if (this.state === 'draw' && this.f % 10 < 5) {
      scr.rect(this.x - 1, this.y - 44, 3, 6, C.ALERT);
      scr.rect(this.x - 1, this.y - 36, 3, 3, C.ALERT);
    }
  }
}

export function makeEnemy(kind, x, y) {
  if (kind === 'b') return new Beast(x, y);
  if (kind === 'd') return new Drone(x, y);
  if (kind === 's') return new Swordsman(x, y);
  return new Sentry(x, y);
}
