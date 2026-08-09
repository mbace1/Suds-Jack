// Flash Prince — the loop.
//
// Fixed 60Hz simulation, because every distance in this game is quoted in
// frames: a step is twenty-two of them and carries twelve pixels, a running
// jump clears three tiles, a sentry takes sixty-eight from seeing you to
// shooting. Let that float with the refresh rate and the contract the whole
// design rests on stops being true.
//
// The screen is a screen. No camera, no scrolling: you walk off the right edge
// and the next composition is simply there, which is how Another World, the
// first Prince of Persia and Flashback all did it, and which is why any one of
// their rooms can be remembered as a picture.

import { Screen, W, H } from './screen.js';
import { paletteAt, C } from './palette.js';
import { World, ROOM_W, ROOM_H, ROOMS } from './level.js';
import { paintBack, drawAir, drawFore, halo } from './scenery.js';
import { Hero } from './hero.js';
import { makeEnemy } from './enemy.js';
import { drawFigure, POSE } from './figure.js';
import { loadSheet, drawSprite, CONRAD_COLOURS } from './sprite.js';
import { Fx } from './fx.js';
import { Input } from './input.js';
import * as A from './audio.js';
import { BEATS } from './rooms.js';

const HERO_TITLE_POSE = POSE.alert;
const HERO_COL = {
  far: C.SUIT, body: C.SUIT_HI, legs: C.SUIT, arms: C.SUIT_HI,
  skin: C.SKIN, hair: C.HAIR, eye: null, gun: C.HAIR,
  blade: C.EDGE, edge: C.LUX, hilt: C.HAIR,
};

class Game {
  constructor() {
    this.scr = new Screen(document.getElementById('screen'));
    // The hero is blitted out of the SNES sheet, not drawn from the sixteen.
    // Telling the quantise pass to leave his fourteen colours alone is what
    // keeps him exact while the world around him still snaps to the room.
    this.scr.keepColours(CONRAD_COLOURS);
    loadSheet();
    this.input = new Input(this.scr);
    this.fx = new Fx();
    this.world = new World();
    this.hero = new Hero(60, 176);
    this.state = 'title';
    this.clock = 0;
    this.titleT = 0;
    this.best = Number(localStorage.getItem('flashPrinceBest') || 0);
    this.deaths = 0;
    this.reset();
    this.paint();
  }

  reset() {
    this.seenBeats = new Set();
    this.runFrames = 0;
    this.deaths = 0;
    this.beat = null;
    this.world.load(0);
    this.hero = new Hero(this.world.spawn?.x ?? 60, this.world.spawn?.y ?? 176);
    this.hero.health = 3;
    this.hero.hasGun = false;
    this.hero.hasSword = false;
    this.enterRoom(0, null, true);
    this.hero.go('wake');
  }

  // ── rooms ──────────────────────────────────────────────────────────
  enterRoom(i, from, keepHero = false) {
    const carry = keepHero ? null : {
      health: this.hero.health, hasGun: this.hero.hasGun, hasSword: this.hero.hasSword,
    };
    this.world.load(i);
    if (carry) {
      this.hero.health = carry.health;
      this.hero.hasGun = carry.hasGun;
      this.hero.hasSword = carry.hasSword;
    }
    this.enemies = this.world.spawns.map(s => makeEnemy(s.kind, s.x, s.y));
    this.fx.clear();
    this.scr.setPalette(paletteAt(this.world.room.t));
    A.droneTune(this.world.room.t);
    this.cut = 5;

    if (from === 'left') this.hero.x = 8;
    else if (from === 'right') this.hero.x = ROOM_W - 8;
    else if (this.world.spawn) { this.hero.x = this.world.spawn.x; this.hero.y = this.world.spawn.y; }

    // the checkpoint is the doorway you came in by, always
    this.checkpoint = {
      i, x: this.hero.x, y: this.hero.y, face: this.hero.face,
      health: this.hero.health, hasGun: this.hero.hasGun, hasSword: this.hero.hasSword,
    };

    const b = this.world.room.beat;
    if (b && !this.seenBeats?.has(b)) {
      this.seenBeats?.add(b);
      this.beat = { text: BEATS[b], t: 0 };
      A.sfx.beat();
    }
  }

  respawn() {
    const c = this.checkpoint;
    this.world.load(c.i);
    this.enemies = this.world.spawns.map(s => makeEnemy(s.kind, s.x, s.y));
    this.fx.clear();
    this.scr.setPalette(paletteAt(this.world.room.t));
    this.hero.reset(c.x, c.y);
    this.hero.face = c.face;
    this.hero.health = 3;
    this.hero.hasGun = c.hasGun;
    this.hero.hasSword = c.hasSword;
    this.state = 'play';
    this.cut = 5;
  }

  // ── things that happen to him ─────────────────────────────────────
  hurt(n, silent, fromX) {
    if (this.hero.dead || this.state !== 'play') return;
    if (this.hero.hurtT > 0) return;
    this.fx.flash = 3;
    if (!silent) A.sfx.hurt();
    this.hero.strike(n, fromX ?? this.hero.x - this.hero.face, this);
  }

  kill(cause) {
    if (this.hero.dead) return;
    this.hero.dead = true;
    this.hero.go('dead');
    this.hero.health = 0;
    this.deathT = 0;
    this.deaths++;
    this.cause = cause;
    this.fx.flash = 5;
    this.fx.shake = 6;
    this.fx.burst(this.hero.x, this.hero.y - 14, C.ALERT, cause === 'fall' ? 16 : 10);
    A.sfx.die();
    this.state = 'dying';
  }

  // two blades meeting: both parties give ground and nobody is hurt
  clash(a, b) {
    A.sfx.clang();
    this.fx.shake = Math.min(5, this.fx.shake + 2.2);
    const mx = (a.x + b.x) / 2;
    this.fx.burst(mx, Math.min(a.y, b.y) - 18, C.EDGE, 5, 1.6);
  }

  bumped() { A.sfx.bump(); this.fx.shake = Math.min(3, this.fx.shake + 1.4); }

  // Prince of Persia makes you CROUCH over a flask to drink it. It is a beat
  // of vulnerability in exchange for the heal, and it stops health being
  // something you collect by walking in a straight line.
  flaskUnder(hero, silent) {
    if (hero.health >= 3) return null;
    for (const p of this.world.pickups) {
      if (p.taken || p.kind !== 'cell') continue;
      if (Math.abs(p.x - hero.x) < 13 && Math.abs(p.y - hero.y) < 22) return p;
    }
    return null;
  }

  shoot(x, y, vx, vy, from, slow) {
    this.fx.shoot(x, y, vx, vy, from, slow);
    if (from === 'me') A.sfx.fire();
    else if (slow) A.sfx.orb();
    else A.sfx.enemyFire();
  }

  // ── one frame ─────────────────────────────────────────────────────
  step() {
    const inp = this.input;
    inp.poll();
    this.clock++;

    if (this.state === 'title') {
      this.titleT++;
      // on a phone there is nothing to press, so any finger anywhere counts
      if (inp.anyPress || inp.jumpPress || inp.dir || inp.pointers.size) {
        A.resume(); A.droneStart(); A.droneTune(0);
        this.reset();
        this.state = 'play';
      }
      inp.flush();
      return;
    }

    if (inp.pausePress && (this.state === 'play' || this.state === 'paused')) {
      this.state = this.state === 'paused' ? 'play' : 'paused';
    }
    if (this.state === 'paused') { inp.flush(); return; }

    if (this.state === 'won') {
      if (inp.anyPress) { this.reset(); this.state = 'play'; }
      inp.flush();
      return;
    }

    if (this.state === 'dying') {
      this.deathT++;
      this.hero.f++;
      this.fx.update();
      if (this.deathT > 78 || (this.deathT > 34 && inp.anyPress)) this.respawn();
      inp.flush();
      return;
    }

    this.runFrames++;
    if (this.beat) { this.beat.t++; if (this.beat.t > 230) this.beat = null; }
    if (this.cut > 0) this.cut--;

    const hero = this.hero, world = this.world;
    const before = hero.state;
    hero.update(world, inp, this);
    world.update(hero);
    this.fx.update();

    // ── the blade ────────────────────────────────────────────────────
    // One frame in the middle of the swing is the blow. Everything before it
    // is a wind-up you can be punished for and everything after is a recovery
    // — which is the only reason the parry means anything.
    if (hero.swingQueued) {
      hero.swingQueued = false;
      A.sfx.swing();
      const tip = hero.swordTip();
      for (const e of this.enemies) {
        if (e.dead || !e.cut) continue;
        if (Math.abs(e.x - tip.x) > e.w + 8 || Math.abs(e.y - hero.y) > 26) continue;
        const r = e.cut(this);
        if (r === 'parried') { this.clash(hero, e); hero.go('clang'); }
        else if (r === 'killed') A.sfx.kill();
        else if (r === 'hit') A.sfx.cut();
        break;
      }
    }
    if (hero.drinkQueued) {
      hero.drinkQueued = false;
      const f = this.flaskUnder(hero, true);
      if (f) { f.taken = true; hero.health = Math.min(3, hero.health + 1); A.sfx.pickup(); }
    }

    // the pistol going off
    if (hero.shotQueued) {
      hero.shotQueued = false;
      const m = hero.muzzle();
      this.shoot(m.x, m.y, hero.face * 5.2, 0, 'me');
      this.fx.shake = Math.min(4, this.fx.shake + 1.6);
    }

    // footfalls, landings, the sounds a body makes
    if (hero.state === 'run' && hero.f % 10 === 0) A.sfx.step();
    if (before !== hero.state) {
      if (hero.state === 'land') A.sfx.land();
      else if (hero.state === 'landHard') A.sfx.hard();
      else if (hero.state === 'hang') A.sfx.grab();
      else if (hero.state === 'pullUp') A.sfx.climb();
      else if (hero.state === 'gather' || hero.state === 'gatherRun') A.sfx.jump();
      else if (hero.state === 'step') A.sfx.step();
      else if (hero.state === 'inch') A.sfx.inch();
      else if (hero.state === 'bump') A.sfx.bump();
      else if (hero.state === 'stepUp') A.sfx.climb();
      else if (hero.state === 'climbDown') A.sfx.climb();
      else if (hero.state === 'swordOut') A.sfx.steel();
    }

    this.enemies.forEach(e => e.update(world, hero, this));
    const spotted = this.enemies.some(e => e.state === 'spot' && e.f === 1);
    if (spotted) A.sfx.alert();

    this.shots();
    this.hazards();
    this.pickups();
    this.edges();

    inp.flush();
  }

  shots() {
    const hero = this.hero;
    for (let i = this.fx.shots.length - 1; i >= 0; i--) {
      const s = this.fx.shots[i];
      s.px = s.x; s.py = s.y;
      s.x += s.vx; s.y += s.vy; s.life--;
      let gone = s.life <= 0 || s.x < -8 || s.x > ROOM_W + 8 || s.y < -8 || s.y > ROOM_H + 8;
      if (!gone && this.world.boxSolid(s.x - 1, s.y - 1, 3, 3)) {
        this.fx.burst(s.x, s.y, C.EDGE, 4, 1.2);
        gone = true;
      }
      if (!gone && s.from === 'me') {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (Math.abs(s.x - e.x) < e.w && s.y > e.y - e.h && s.y < e.y + 4) {
            e.strike(this);
            A.sfx[e.dead ? 'kill' : 'hit']();
            gone = true;
            break;
          }
        }
      } else if (!gone && !hero.dead && hero.hurtT <= 0) {
        const top = hero.y - hero.h;
        if (Math.abs(s.x - hero.x) < 6 && s.y > top && s.y < hero.y) {
          this.hurt(1, false, s.x);
          this.fx.burst(s.x, s.y, C.ALERT, 6, 1.4);
          gone = true;
        }
      }
      if (gone) this.fx.shots.splice(i, 1);
    }
  }

  hazards() {
    const h = this.hero;
    if (h.dead) return;
    const kind = this.world.lethal(h.x - 4, h.y - h.h, 8, h.h);
    if (kind) {
      if (kind === 'spike') A.sfx.spike();
      if (kind === 'slab') A.sfx.slab();
      this.kill(kind);
      return;
    }
    // and the floor giving way under him
    for (const [, l] of this.world.loose) {
      if (l.t === 1) A.sfx.crumble();
    }
    if (this.world.gateT === 1) A.sfx.gate();
  }

  pickups() {
    const h = this.hero;
    for (const p of this.world.pickups) {
      if (p.taken || p.kind === 'cell') continue;      // the flask needs a crouch
      if (Math.abs(p.x - h.x) > 12 || Math.abs(p.y - (h.y - 12)) > 20) continue;
      p.taken = true;
      A.sfx.pickup();
      if (p.kind === 'gun') {
        h.hasGun = true; this.checkpoint.hasGun = true;
        this.beat = { text: 'PISTOL  —  E ARMS IT, X FIRES', t: 0 };
      } else if (p.kind === 'sword') {
        h.hasSword = true; this.checkpoint.hasSword = true;
        A.sfx.steel();
        this.beat = { text: 'A BLADE  —  ↑ STRIKE  SHIFT PARRY  ← → SPACING', t: 0 };
      }
    }
    const d = this.world.door;
    if (d && Math.abs(d.x - h.x) < 12 && Math.abs(d.y - h.y) < 20) {
      A.sfx.door();
      this.state = 'won';
      const secs = this.runFrames / 60;
      if (!this.best || secs < this.best) { this.best = secs; localStorage.setItem('flashPrinceBest', String(secs)); }
    }
  }

  edges() {
    const h = this.hero;
    if (h.y > ROOM_H + 26) { this.kill('fall'); return; }
    if (h.x > ROOM_W - 4) {
      if (this.world.index < ROOMS.length - 1) this.enterRoom(this.world.index + 1, 'left');
      else h.x = ROOM_W - 4;
    } else if (h.x < 4) {
      if (this.world.index > 0) this.enterRoom(this.world.index - 1, 'right');
      else h.x = 4;
    }
  }

  // ── drawing ────────────────────────────────────────────────────────
  paint() {
    const scr = this.scr;
    if (this.state === 'title') { this.paintTitle(); scr.present(); return; }

    const sh = this.fx.shake;
    const sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;
    scr.clear(C.VOID);
    scr.ctx.save();
    scr.ctx.translate(Math.round(sx), Math.round(sy));

    scr.cached(`back:${this.world.index}`, () => paintBack(scr, this.world.room, this.world.index));
    drawAir(scr, this.world.room, this.clock);
    this.world.drawTiles(scr);
    this.world.drawTraps(scr);
    if (this.world.door) {
      const d = this.world.door;
      halo(scr, d.x, d.y - 16, 22 + Math.sin(this.clock * 0.06) * 3);
    }

    for (const e of this.enemies) e.draw(scr);

    const h = this.hero;
    const blink = h.hurtT > 0 && (h.hurtT >> 1) % 2 === 0;
    // A contact shadow. Without one he is a cut-out laid on the picture rather
    // than a man standing in it — and it is one flat ellipse, which is all a
    // sixteen-colour screen can afford and all the references use.
    if (!h.dead && this.world.boxSolid(h.x - 2, h.y + 1, 4, 3)) {
      const wdt = h.low ? 13 : 9;
      scr.poly([h.x - wdt, h.y - 1, h.x + wdt, h.y - 1, h.x + wdt - 3, h.y + 2, h.x - wdt + 3, h.y + 2], C.DARK);
    }
    if (!blink) {
      // Conrad's own frames where the sheet has them; the polygon figure for
      // the moves not mapped onto it yet.
      const sp = h.sprite();
      if (!sp || !drawSprite(scr, sp.anim, Math.floor(sp.f), h.x, h.y, h.face)) {
        drawFigure(scr, h.x, h.y, h.face, h.pose(), HERO_COL, {
          gun: h.weapon === 'gun' && !h.dead,
          sword: h.sworded && !h.dead,
        });
      }
    }

    this.fx.draw(scr);
    drawFore(scr, this.world.room, this.world.index);
    scr.ctx.restore();

    if (this.fx.flash > 0) scr.veil([0, 0, W, 0, W, H, 0, H], C.EDGE, 0.5);
    if (this.cut > 0) scr.veil([0, 0, W, 0, W, H, 0, H], C.VOID, this.cut / 6);

    this.hud();
    scr.present();
    // after present(), because the controls are drawn on the display canvas
    // rather than into the sixteen-colour picture
    if (this.state !== 'title') this.padZones();
  }

  hud() {
    const scr = this.scr, h = this.hero;
    // Health: three marks, small, top RIGHT — the arcade shell puts its way
    // home in the other corner. Another World had no HUD whatsoever; three
    // pixels of one is the whole concession.
    for (let i = 0; i < 3; i++) {
      const x = W - 25 + i * 7, y = 6;
      scr.poly([x, y, x + 4, y, x + 4, y + 7, x, y + 7], i < h.health ? C.EDGE : C.DARK);
    }
    // what is in his hands, if anything
    if (h.hasGun) {
      const c = h.weapon === 'gun' ? C.LUX2 : C.DARK;
      scr.poly([W - 44, 8, W - 35, 8, W - 35, 10, W - 44, 11], c);
      scr.poly([W - 43, 11, W - 40, 11, W - 41, 15, W - 44, 15], c);
    }
    if (h.hasSword) {
      const c = h.weapon === 'sword' ? C.LUX2 : C.DARK;
      scr.poly([W - 60, 14, W - 49, 6, W - 48, 7, W - 59, 15], c);
      scr.rect(W - 63, 14, 5, 2, c);
      scr.rect(W - 62, 16, 3, 2, c);
    }

    if (this.beat) {
      const a = Math.min(1, this.beat.t / 14) * Math.min(1, (230 - this.beat.t) / 30);
      const w = scr.textW(this.beat.text, 8);
      scr.ctx.globalAlpha = a;
      scr.rect(0, H - 32, W, 15, C.VOID);
      scr.text(this.beat.text, (W - w) / 2, H - 29, C.EDGE, 8);
      scr.ctx.globalAlpha = 1;
    }

    if (this.state === 'dying') {
      const a = Math.min(1, this.deathT / 24);
      scr.ctx.globalAlpha = a * 0.72;
      scr.rect(0, 0, W, H, C.VOID);
      scr.ctx.globalAlpha = a;
      this.centre('AGAIN', H / 2 - 10, C.EDGE, 14);
      this.centre(this.deathT > 34 ? 'PRESS ANYTHING' : '', H / 2 + 10, C.SOLID, 8);
      scr.ctx.globalAlpha = 1;
    }

    if (this.state === 'paused') {
      scr.veil([0, 0, W, 0, W, H, 0, H], C.VOID, 0.7);
      this.centre('PAUSED', H / 2 - 16, C.EDGE, 14);
      this.centre('← → WALK  (HOLD TO RUN)   ↑ JUMP / CLIMB   ↓ CROUCH', H / 2 + 4, C.SOLID, 7);
      this.centre('E  PISTOL      X  FIRE      ESC  BACK', H / 2 + 16, C.SOLID, 7);
    }

    if (this.state === 'won') {
      scr.veil([0, 0, W, 0, W, H, 0, H], C.VOID, 0.78);
      this.centre('OUT', H / 2 - 26, C.LUX2, 18);
      this.centre(`${this.fmt(this.runFrames / 60)}   ${this.deaths} DEATHS`, H / 2 + 2, C.EDGE, 9);
      if (this.best) this.centre(`BEST  ${this.fmt(this.best)}`, H / 2 + 16, C.SOLID, 8);
      this.centre('PRESS ANYTHING', H / 2 + 34, C.SOLID, 7);
    }

  }

  fmt(s) {
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  centre(str, y, ci, size) {
    if (!str) return;
    this.scr.text(str, (W - this.scr.textW(str, size)) / 2, y, ci, size);
  }

  // ── the controls ───────────────────────────────────────────────────
  // Laid out and drawn in DISPLAY pixels, not picture pixels. Two reasons: at
  // a 4x upscale a button drawn into the 320x192 buffer has letters four
  // pixels tall and a border that quantises to whatever colour is nearest in
  // the room's sixteen; and in portrait the pad is not over the picture at all,
  // so there is no picture space to put it in.
  //
  // The zones are computed every frame whether or not anything is drawn — a
  // tap has to land on a live zone the first time, before the game knows a
  // finger exists.
  padZones() {
    const scr = this.scr, band = scr.band;
    const zones = [];
    const add = (name, x, y, w, h) => zones.push({ name, x, y, w, h });

    if (band) {
      // PORTRAIT: a real panel under the picture. Sized off the band so it
      // fills whatever the phone gives it rather than assuming a screen.
      // u is bounded by the WIDTH as much as the height: sized off the height
      // alone, the right-hand cluster grew until it sat on top of the d-pad
      const u = Math.min(band.h / 3.1, band.w / 7.4);
      const cy = band.y + band.h * 0.5, cx = band.w * 0.24;
      add('up', cx - u / 2, cy - u * 1.55, u, u);
      add('down', cx - u / 2, cy + u * 0.55, u, u);
      add('left', cx - u * 1.6, cy - u / 2, u, u);
      add('right', cx + u * 0.6, cy - u / 2, u, u);
      const rx = band.w * 0.78;
      add('jump', rx - u * 0.1, cy - u * 0.8, u * 1.6, u * 1.6);
      add('fire', rx - u * 1.85, cy - u * 1.5, u * 1.3, u * 1.3);
      add('gunbtn', rx - u * 1.85, cy + u * 0.15, u * 1.3, u * 1.3);
      // CAREFUL lives with the d-pad, not with the buttons: it is a modifier
      // on a direction, and on a phone it is the only way to parry
      add('careful', cx - u * 1.6, cy + u * 1.75, u * 3.2, u * 0.95);
    } else {
      // LANDSCAPE: back over the picture, where a thumb already is — but
      // pushed hard into the corners and kept small. Anything bigger sits in
      // the middle of the composition, and the composition is the game.
      const pw = W * scr.scale, ph = H * scr.scale;
      const u = Math.min(ph / 6.2, pw / 14);
      const cy = scr.oy + ph - u * 1.6, cx = scr.ox + u * 1.75;
      add('up', cx - u / 2, cy - u * 1.5, u, u);
      add('down', cx - u / 2, cy + u * 0.5, u, u);
      add('left', cx - u * 1.55, cy - u / 2, u, u);
      add('right', cx + u * 0.55, cy - u / 2, u, u);
      const rx = scr.ox + pw - u * 1.7;
      add('jump', rx - u * 0.75, cy - u * 0.75, u * 1.5, u * 1.5);
      add('fire', rx - u * 2.45, cy - u * 1.45, u * 1.15, u * 1.15);
      add('gunbtn', rx - u * 2.45, cy + u * 0.2, u * 1.15, u * 1.15);
      add('careful', cx - u * 1.55, cy + u * 1.7, u * 3.1, u * 0.85);
    }
    this.input.setZones(zones);
    if (!(this.input.touch || this.input.coarse)) return;

    const d = scr.dctx;
    if (band) {                                   // the panel's own ground
      d.fillStyle = '#07080b';
      d.fillRect(band.x, band.y, band.w, band.h);
      d.fillStyle = 'rgba(180,200,210,.16)';
      d.fillRect(band.x, band.y, band.w, Math.max(1, band.h * 0.006));
    }
    const GLYPH = { up: '▲', down: '▼', left: '◀', right: '▶' };
    const WORD = { jump: 'JUMP', fire: 'FIRE', gunbtn: 'GUN', careful: 'CAREFUL' };
    for (const z of zones) {
      const on = this.input.zoneHeld(z.name);
      const r = Math.min(z.w, z.h) * 0.22;
      d.beginPath();
      if (d.roundRect) d.roundRect(z.x, z.y, z.w, z.h, r);
      else d.rect(z.x, z.y, z.w, z.h);
      // over the picture they have to stay quiet; on their own panel they can
      // be furniture
      d.fillStyle = on ? 'rgba(140,190,170,.34)' : band ? 'rgba(150,175,185,.10)' : 'rgba(150,175,185,.055)';
      d.fill();
      d.strokeStyle = on ? 'rgba(190,235,215,.85)' : band ? 'rgba(160,185,195,.34)' : 'rgba(160,185,195,.22)';
      d.lineWidth = Math.max(1, z.h * 0.035);
      d.stroke();
      const word = WORD[z.name];
      const size = Math.round(word ? Math.min(z.h * 0.44, z.w * 0.22) : z.h * 0.44);
      d.fillStyle = on ? '#dff6ea' : 'rgba(206,226,232,.78)';
      d.font = `${word ? 'bold ' : ''}${size}px "Courier New", ui-monospace, monospace`;
      d.textAlign = 'center';
      d.textBaseline = 'middle';
      d.fillText(word ?? GLYPH[z.name], z.x + z.w / 2, z.y + z.h / 2 + (word ? 0 : size * 0.06));
    }
    d.textAlign = 'left';
    d.textBaseline = 'alphabetic';
  }

  // The title is a screen of the game, not a menu over one: the sky he is
  // about to wake up under, the treeline he is about to walk into, and the pod
  // still coming down. Same sixteen colours, same flat masses.
  paintTitle() {
    const scr = this.scr;
    scr.setPalette(paletteAt(0));
    const t = this.titleT;
    scr.clear(C.VOID);
    // It is the first screen of the game with the title over it, drawn by the
    // code that draws the first screen of the game. A title card in some other
    // style would be the only thing in here that lied about what this is.
    scr.cached('title-back', () => {
      paintBack(scr, ROOMS[0], 0);
      scr.rect(0, 166, W, 4, C.SOLID);
    });

    // the pod, still coming down over the trees
    const k = (t % 300) / 300;
    const px = -34 + k * 430, py = 12 + k * 44;
    scr.rect(px - 34, py, 34, 2, C.LUX);
    scr.rect(px - 15, py - 1, 15, 4, C.EDGE);
    scr.poly([px, py - 3, px + 8, py + 1, px, py + 5], C.LUX2);

    // and the man it belongs to, standing in the clearing with his back to you
    drawFigure(scr, 96, 167, 1, HERO_TITLE_POSE, {
      far: C.VOID, body: C.VOID, legs: C.VOID, arms: C.VOID,
      skin: C.VOID, hair: C.VOID, eye: null,
    });
    drawFore(scr, ROOMS[0], 0);
    // the letterbox, which is where the words go and nowhere else
    scr.rect(0, 170, W, H - 170, C.VOID);

    const title = 'FLASH PRINCE';
    const tw = scr.textW(title, 26);
    scr.text(title, (W - tw) / 2 + 2, 46, C.VOID, 26);
    scr.text(title, (W - tw) / 2, 44, C.EDGE, 26);
    this.centre('FLASHBACK  ×  PRINCE OF PERSIA', 72, C.LUX, 8);
    if ((t >> 5) % 2) this.centre('PRESS ANYTHING', 100, C.LUX2, 9);
    this.centre('← → WALK · HOLD TO RUN · ↑ JUMP & CLIMB · ↓ CROUCH', 173, C.LUX, 7);
    this.centre(this.best ? `E PISTOL · X FIRE        BEST ${this.fmt(this.best)}` : 'E PISTOL · X FIRE', 183, C.LUX, 7);
  }
}

// ── the clock ────────────────────────────────────────────────────────
const game = new Game();
const STEP = 1000 / 60;
let acc = 0, last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  acc += Math.min(200, now - last);
  last = now;
  let n = 0;
  while (acc >= STEP && n++ < 5) { game.step(); acc -= STEP; }
  game.paint();
}
requestAnimationFrame(frame);

addEventListener('pointerdown', () => A.resume(), { once: true });
addEventListener('keydown', () => A.resume(), { once: true });

window.__fp = {
  game, hero: () => game.hero, world: () => game.world,
  debug: {
    room: i => { game.state = 'play'; game.enterRoom(i, 'left'); },
    give: () => { game.hero.hasGun = true; },
    state: () => ({ state: game.state, room: game.world.index, hero: game.hero.state, hp: game.hero.health }),
    pure: v => { game.scr.pure = v; },
  },
};
