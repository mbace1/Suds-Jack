// Flash Prince.
//
// The world came back. For eighteen versions this was one flat floor and one
// man, which is what it took to get every frame of him measured, mapped and
// anchored — and that work is why the rooms can have him back: he is the same
// blitted figure on a tile grid now instead of on a bench.
//
// He is never drawn. Every state he can reach here maps onto a row of the SNES
// sheet (see sprite.js), so what you are looking at is always Conrad's own
// pixels — and if the sheet has not arrived yet the stage shows nothing rather
// than falling back to something that is not him.
//
// Two modes. FREE drives him with the controls, which is the only way to judge
// whether a move reads at the speed it actually plays. GALLERY steps through
// the animations one at a time, looping, with its name and frame count on
// screen, which is the only way to judge a cycle on its own.

import { Screen, W, H } from './screen.js';
import { paletteAt, C } from './palette.js?v=52';
import { Hero } from './hero.js?v=54';
import { World, ROOMS, ROOM_H } from './level.js?v=55';
import { paintBack, drawAir, drawFore, drawFloodWater, halo } from './scenery.js?v=54';
import { Post } from './bench.js';
import { Swordsman } from './foe.js?v=51';
import { Sentry, advanceBolt, drawBolt } from './sentry.js?v=55';
import { Input } from './input.js?v=54';
import { Sound } from './sound.js';
import { Editor, BRUSHES } from './editor.js';
import { setOn, isOn, droneTune } from './audio.js';
import { loadSheet, drawSprite, ready, ANIM, frameCount, CHARACTER_COLOURS } from './sprite.js?v=54';

const FLOOR = 144;                 // the ground line, in picture pixels
// The gallery keeps one flat palette, cool and quiet, so a cycle reads. The
// GAME does not — every room sits at its own place on the palette line and
// the jungle turns into Egypt without ever announcing it.
const PAL = paletteAt(1.15);

// The gallery's running order — roughly the order a man does them in.
const REEL = [
  ['stand', 'STANDING'],
  ['step', 'WALK · first step'],
  ['stepB', 'WALK · second step'],
  ['run', 'RUN — twenty frames'],
  ['legacyRun', 'V18 RUN — legacy character'],
  ['runStart', 'RUN · winding up'],
  ['skid', 'RUN · coming to a halt'],
  ['turn', 'TURNING ROUND'],
  ['crouch', 'CROUCHING'],
  ['crouchLow', 'CROUCHED'],
  ['rise', 'STANDING UP'],
  ['roll', 'THE ROLL'],
  ['hurt', 'TAKING A HIT'],
  ['shocked', 'SHOCKED'],
  ['gather', 'JUMP · gather'],
  ['airUp', 'JUMP · drive'],
  ['land', 'JUMP · landing'],
  ['gatherRun', 'RUNNING JUMP · gather'],
  ['airRun', 'RUNNING JUMP · flight'],
  ['fall', 'FALLING'],
  ['landHard', 'LANDING HARD'],
  ['hang', 'HANGING'],
  ['mantle', 'PULLING UP'],
  ['lower', 'CLIMBING DOWN'],
  ['wake', 'GETTING UP'],
  ['dead', 'DEAD'],
  ['drawGun', 'PISTOL · drawing'],
  ['aim', 'PISTOL · aimed'],
  ['fire', 'PISTOL · the shot'],
  ['crouchDraw', 'PISTOL · going down'],
  ['crouchAim', 'PISTOL · aimed, crouched'],
  ['crouchFire', 'PISTOL · the shot, crouched'],
];

class Stage {
  constructor() {
    this.scr = new Screen(document.getElementById('screen'));
    // He is blitted, not drawn from the sixteen, so the quantise pass is told
    // to leave his own fourteen colours alone.
    this.scr.keepColours(CHARACTER_COLOURS);
    this.scr.setPalette(PAL);
    loadSheet();
    this.input = new Input(this.scr);
    this.world = new World();
    this.hero = new Hero(48, FLOOR);
    // The pistol is his — Conrad's own frames, same build as everything else.
    // The sword is HOLSTERED: it is off the other sheet and it is the one thing
    // here that changes what he looks like mid-move.
    this.hero.hasGun = true;
    // The sword is IN. It reads as the same man now, the grammar has been in
    // hero.js since the beginning, and there is finally something to swing it
    // at — a post, so the reach and the one frame the edge lands on are things
    // you can feel rather than take on trust.
    this.hero.hasSword = false;
    // The bench's post survives as a room fixture: any room that wants one puts
    // it where it likes. Rooms that do not, do not get one.
    this.post = null;
    this.foes = [];
    this.sentries = [];
    this.bolts = [];
    this.snd = new Sound();
    this.ed = new Editor(this.scr);
    const requestedRoom = location.hash === '#flooded-city'
      ? ROOMS.findIndex(room => room.scene === 'floodedHub') : 0;
    this.enterRoom(Math.max(0, requestedRoom));
    this.hero.go('wake');
    this.mode = 'select';
    this.characterChoice = 0;
    this.reel = 0;
    this.t = 0;
    this.clock = 0;
    this.hint = 420;              // the control line fades out of the way
    this.flash = 0;
    this.tracer = null;
    this.tapes = 0;
    this.lootFlash = 0;
  }

  // ── the editor ─────────────────────────────────────────────────────
  // Its own tick, because none of the game's rules apply while you are laying
  // tiles: nothing falls, nothing thinks, and the clock is only there to blink
  // the cursor.
  editing(inp) {
    const ed = this.ed;
    if (inp.point) {
      const p = this.scr.toPicture(inp.point.x, inp.point.y);
      const tx = Math.floor(p.x / 16), ty = Math.floor(p.y / 16);
      if (tx >= 0 && tx < 20 && ty >= 0 && ty < 12) ed.cursor = { tx, ty };
      // The strip along the bottom is the palette: a click down there picks a
      // brush rather than painting one.
      if (inp.pointPress && p.y > H - 12) {
        const i = Math.floor(p.x / (W / BRUSHES.length));
        if (i >= 0 && i < BRUSHES.length) { ed.brush = i; return; }
      }
    }
    if (inp.pointPress) ed.painting = inp.pointButton === 2 ? -1 : 1;
    if (inp.pointRelease) ed.painting = 0;
    // the keyboard does the same job, for laying a floor without a mouse
    if (inp.dir && inp.dirHeld === 1) ed.cursor.tx = Math.max(0, Math.min(19, ed.cursor.tx + inp.dir));
    if (inp.up) ed.cursor.ty = Math.max(0, ed.cursor.ty - 1);
    if (inp.down) ed.cursor.ty = Math.min(11, ed.cursor.ty + 1);
    if (inp.jumpPress) ed.set(ed.cursor.tx, ed.cursor.ty, BRUSHES[ed.brush].ch);
    if (inp.firePress) ed.brush = (ed.brush + 1) % BRUSHES.length;
    if (inp.gunPress) ed.dump();
    if (inp.hitPress) ed.revert(this.world);
    if (inp.carefulPress) { ed.commit(this.world); this.mode = 'free'; this.enterRoom(this.world.index); return; }
    ed.paintAt(ed.cursor.tx, ed.cursor.ty);
  }

  // Walking into a room is the only load there is. The palette comes with it,
  // the drone retunes to it, and whoever lives here is stood up where the map
  // said. Enemies other than the swordsman are not built yet, so their markers
  // are read and skipped rather than silently dropped.
  enterRoom(i, from = null) {
    this.world.load(i, from === 'right' ? -1 : 1, this.ed.mapFor(i));
    const w = this.world;
    this.scr.setPalette(paletteAt(w.room.t));
    droneTune(w.room.t);
    this.foes = w.spawns.filter(s => s.kind === 's')
      .map(s => new Swordsman(s.x, s.y, -1, [10, W - 10]));
    this.sentries = w.spawns.filter(s => s.kind === 'g')
      .map(s => new Sentry(s.x, s.y, -1));
    this.bolts = [];
    this.unbuilt = w.spawns.filter(s => !['s', 'g'].includes(s.kind)).length;
    this.post = null;
    const h = this.hero;
    if (from === 'left') { h.x = 6; h.face = 1; }
    else if (from === 'right') { h.x = W - 6; h.face = -1; }
    else if (w.spawn) { h.x = w.spawn.x; h.y = w.spawn.y; h.face = 1; }
    if (from) h.y = this.groundUnder(h.x, h.y);
    h.vx = 0; h.vy = 0;
    if (from) h.go(h.rest());
    this.snd.wasFoe = null;
  }

  // Coming in from the side, he arrives at whatever height the floor is at.
  groundUnder(x, y) {
    for (let ty = Math.floor(y / 16); ty < 12; ty++) {
      if (this.world.solidTile(Math.floor(x / 16), ty)) return ty * 16;
    }
    return y;
  }

  // ── the frame ──────────────────────────────────────────────────────
  step() {
    this.clock++;
    const inp = this.input;
    inp.poll();
    try { this.tick(inp); } finally { inp.flush(); }
  }

  // Everything that reads input goes in here, and `step` clears the one-shot
  // presses afterwards WHATEVER happens. Leaving that out is what made the
  // controls feel broken: jumpPress, firePress, gunPress and carefulPress are
  // edges that are supposed to last exactly one frame, and unflushed they latch
  // on for good — so he jumps at every opening he gets, the sword draws and
  // sheathes itself, and one press of the mode button flips the mode sixty
  // times a second.
  tick(inp) {
    // WebAudio needs a gesture, so the first press of anything is the cue.
    if (inp.anyPress || inp.dir) this.snd.wake();
    if (inp.mutePress) setOn(!isOn());

    // Start/escape always returns to the character menu. The default is the
    // complete Conrad set; the immutable v18 runner remains selectable here.
    if (inp.pausePress && this.mode !== 'select') {
      this.characterChoice = this.hero.character === 'classic' ? 1
        : this.hero.character === 'legacy' ? 2 : 0;
      this.mode = 'select';
      return;
    }

    if (this.mode === 'select') {
      if (inp.dir && inp.dirHeld === 1) {
        this.characterChoice = (this.characterChoice + inp.dir + 3) % 3;
      }
      if (inp.jumpPress || inp.firePress) {
        this.hero.character = ['conrad', 'classic', 'legacy'][this.characterChoice];
        const spawn = this.world.spawn ?? { x: 48, y: this.groundUnder(48, FLOOR) };
        this.hero.reset(spawn.x, spawn.y);
        this.hero.health = 3;
        this.hero.go('wake');
        this.mode = 'free';
      }
      return;
    }

    // Its own button now: FIRE belongs to the pistol, and a button that both
    // shoots and changes what the whole screen is doing is not a button.
    // Three modes on one button: play it, look at one animation, build a room.
    if (inp.modePress) {
      this.mode = this.mode === 'free' ? 'gallery' : this.mode === 'gallery' ? 'edit' : 'free';
      this.t = 0;
      if (this.mode === 'edit') this.ed.begin(this.world);
      if (this.mode === 'free') this.enterRoom(this.world.index);
    }

    if (this.mode === 'edit') { this.editing(inp); return; }

    if (this.mode === 'gallery') {
      if (inp.dir && inp.dirHeld === 1) {
        this.reel = (this.reel + inp.dir + REEL.length) % REEL.length;
        this.t = 0;
      }
      if (inp.jumpPress) this.paused = !this.paused;
      if (!this.paused) this.t++;
      return;
    }

    const h = this.hero;
    if (this.hint > 0) this.hint--;
    if (inp.hitPress) h.strike(0, h.x - h.face * 10, this, inp.careful ? 'shock' : 'hit');
    this.world.update(h);
    h.update(this.world, inp, this);
    if (this.lootFlash > 0) this.lootFlash--;

    // A screen is a composition with a hard cut either side of it: walk off the
    // edge and the next one is simply THERE. No scrolling, no camera.
    if (h.x < 2 && this.world.index > 0) { this.enterRoom(this.world.index - 1, 'right'); return; }
    if (h.x > W - 2 && this.world.index < ROOMS.length - 1) { this.enterRoom(this.world.index + 1, 'left'); return; }
    h.x = Math.max(2, Math.min(W - 2, h.x));
    if (h.y > ROOM_H + 10) this.kill();

    // What the room can do to you. `lethal` is spikes up, a slab coming down,
    // a lit field — it does not care which, and neither does he.
    if (!h.dead && h.hurtT <= 0 && this.world.lethal(h.x - 4, h.y - (h.low ? 16 : 30), 8, h.low ? 16 : 30)) {
      h.strike(1, h.x, this);
    }
    this.picking(h);

    if (this.flash > 0) this.flash--;
    if (this.tracer && --this.tracer.t <= 0) this.tracer = null;
    if (h.shotQueued) { h.shotQueued = false; this.flash = 3; this.snd.shot(); this.shoot(h); }
    if (this.post) this.post.update();

    for (const foe of this.foes) {
      foe.update(h);
      if (foe.hitQueued) {
        foe.hitQueued = false;
        const t = foe.tip();
        if (this.reached(foe.x, t.x, h.x)) {
          const front = (foe.x - h.x) * h.face > 0;
          if (h.shielding && front) {
            h.shield = Math.max(0, h.shield - 18);
            h.shieldFlash = 8;
            foe.go('clang');
            this.snd.woodHit();
          } else if (!h.guarding) h.strike(1, foe.x, this);
        }
      }
    }
    for (const sentry of this.sentries) {
      sentry.update(h);
      if (sentry.shotQueued) {
        sentry.shotQueued = false;
        this.bolts.push(sentry.bolt());
        this.snd.shot();
      }
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      const result = advanceBolt(bolt, h);
      if (!result) continue;
      this.bolts.splice(i, 1);
      if (result === 'shield') {
        h.shield = Math.max(0, h.shield - 22);
        h.shieldFlash = 9;
        this.snd.woodHit();
      } else if (result === 'hit') h.strike(1, bolt.fromX, this, 'shock');
    }
    // The edge lands on ONE frame in the middle of the swing. That is the whole
    // design of the sword.
    if (h.swingQueued) {
      h.swingQueued = false;
      const e = h.swordTip();
      if (this.post && this.reached(h.x, e.x, this.post.x)) { this.post.hit(this.post.x, h.face); this.snd.woodHit(); }
      for (const foe of this.foes) {
        if (!foe.dead && this.reached(h.x, e.x, foe.x) && foe.struck(h.x) === 'parried') h.go('clang');
      }
    }
    this.snd.frame(h, this.foes.find(f => !f.dead) ?? this.foes[0]);
  }

  // What is lying on the floor of this room. A weapon is picked up by walking
  // over it; a flask has to be crouched over, which is PoP's rule and the only
  // reason a health pickup is ever a decision.
  picking(h) {
    for (const p of this.world.pickups) {
      if (p.taken) continue;
      if (Math.abs(p.x - h.x) > 9 || Math.abs(p.y - h.y) > 20) continue;
      if (p.kind === 'gun') { p.taken = true; h.hasGun = true; }
      else if (p.kind === 'sword') { p.taken = true; h.hasSword = true; }
      else if (p.kind === 'cell' && h.low) { p.taken = true; h.health = Math.min(3, h.health + 1); }
      else if (p.kind === 'tape' && h.low) {
        p.taken = true;
        this.tapes++;
        this.lootFlash = 210;
      }
    }
  }

  // A blade sweeps a SPAN, from the man to the point — being at the tip is not
  // the test, being anywhere along it is. Checking the tip alone let a strike
  // pass straight through someone standing chest to chest.
  reached(from, tip, x, pad = 5) {
    return x >= Math.min(from, tip) - pad && x <= Math.max(from, tip) + pad;
  }

  shoot(h) {
    const targets = [];
    for (const foe of this.foes) if (!foe.dead) targets.push({ x: foe.x, enemy: foe });
    for (const sentry of this.sentries) if (!sentry.dead) targets.push({ x: sentry.x, enemy: sentry });
    if (this.post) targets.push({ x: this.post.x, foe: null });
    const ahead = targets
      .filter(t => (t.x - h.x) * h.face > 0 && Math.abs(t.x - h.x) < 200)
      .sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    const m = h.muzzle();
    this.tracer = { x1: m.x, y: m.y, x2: ahead?.x ?? m.x + h.face * 190, t: 4 };
    if (!ahead) return;
    if (ahead.enemy) ahead.enemy.struck(h.x);
    else this.post.hit(ahead.x, h.face);
  }

  // the hero asks the game for these; on a floor with nothing on it they are
  // all no-ops
  kill() {
    const spawn = this.world.spawn ?? { x: 48, y: FLOOR };
    this.hero.reset(spawn.x, spawn.y);
    this.hero.health = 3;
    this.hero.go('wake');
    this.bolts = [];
  }
  hurt() {}

  // ── drawing ────────────────────────────────────────────────────────
  paint() {
    const scr = this.scr;
    if (this.mode === 'select') {
      this.scr.setPalette(PAL);
      this.backdrop(scr);
      this.characterSelect(scr);
      scr.present();
      this.padZones();
      return;
    }
    if (this.mode === 'gallery') { this.scr.setPalette(PAL); this.backdrop(scr); this.gallery(scr); }
    else if (this.mode === 'edit') { this.editor(scr); scr.present(); this.padZones(); return; }
    else this.free(scr);

    this.chrome(scr);
    scr.present();
    this.padZones();
  }

  characterSelect(scr) {
    scr.rect(0, FLOOR, W, H - FLOOR, C.SOLID);
    scr.rect(0, FLOOR, W, 1, C.EDGE);
    const frame = Math.floor(this.clock / 4) % 20;
    drawSprite(scr, 'run', frame, 58, FLOOR, 1);
    drawSprite(scr, 'run', frame, 160, FLOOR, 1, 'classicBody');
    drawSprite(scr, 'legacyRun', frame, 262, FLOOR, 1);
    this.centre(scr, 'CHOOSE CHARACTER', 22, C.LUX);
    this.centre(scr, 'FLASH PRINCE       COURIER       V18 RUN', 42, C.EDGE, 6);
    this.centre(scr, 'DEFAULT          FULL SET        ARCHIVE', 52, C.DARK, 6);
    const x = [58, 160, 262][this.characterChoice];
    scr.rect(x - 29, FLOOR + 8, 58, 2, C.LUX);
    this.centre(scr, '◀ ▶  CHOOSE       JUMP / FIRE  START', H - 10, C.DARK, 6);
  }

  // Flat bands and a hard horizon — the least backdrop that still gives him a
  // floor to stand on and a value to read against.
  // The gallery's backdrop: flat bands and a hard horizon, the least there is
  // that still gives him a floor and a value to read against.
  backdrop(scr) {
    scr.clear(C.SKY_HI);
    scr.rect(0, 44, W, 40, C.SKY_LO);
    scr.rect(0, 84, W, 34, C.FAR);
    scr.rect(0, 118, W, H - 118, C.MID);
  }

  free(scr) {
    const w = this.world;
    scr.clear(C.VOID);
    // The static half of a room is painted once and blitted after that. The
    // KEY has to carry the palette as well as the index, or walking back into
    // a room you have already seen serves you the last biome's colours.
    scr.cached(`back:${w.index}`, () => paintBack(scr, w.room, w.index));
    drawAir(scr, w.room, this.clock);
    w.drawTiles(scr);
    w.drawTraps(scr);
    if (w.door) halo(scr, w.door.x, w.door.y - 16, 22 + Math.sin(this.clock * 0.06) * 3);

    for (const p of w.pickups) {
      if (p.taken) continue;
      const lift = Math.sin(this.clock * 0.08 + p.x) * 1.5;
      scr.rect(p.x - 3, p.y - 6 + lift, 6, 5, C.LUX);
      scr.rect(p.x - 1, p.y - 5 + lift, 2, 3, C.LUX2);
    }

    if (this.post) this.post.draw(scr, C);
    for (const foe of this.foes) foe.draw(scr);
    for (const sentry of this.sentries) sentry.draw(scr);
    for (const bolt of this.bolts) drawBolt(scr, bolt);

    const h = this.hero;
    // A contact shadow. Without one he is a cut-out laid on the picture rather
    // than a man standing in it — one flat ellipse, all a sixteen-colour screen
    // can afford and all the references use.
    if (!h.dead && w.boxSolid(h.x - 2, h.y + 1, 4, 3)) {
      const wd = h.low ? 13 : 9;
      scr.poly([h.x - wd, h.y - 1, h.x + wd, h.y - 1, h.x + wd - 3, h.y + 2, h.x - wd + 3, h.y + 2], C.DARK);
    }
    const blink = h.hurtT > 0 && (h.hurtT >> 1) % 2 === 0;
    const sp = h.sprite();
    const variant = h.character === 'classic' || h.character === 'legacy' ? 'classicBody' : undefined;
    if (sp && !blink) drawSprite(scr, sp.anim, Math.floor(sp.f), h.x, sp.lipY ?? h.y, h.face, variant);
    if (h.shielding || h.shieldFlash > 0) {
      const x = Math.round(h.x + h.face * 17);
      const pulse = h.shieldFlash > 0 ? 2 : (this.clock >> 2) % 2;
      scr.rect(x, h.y - 31, 1 + pulse, 26, C.LUX);
      scr.rect(x - h.face * 2, h.y - 27, 1, 18, C.EDGE);
      for (let y = h.y - 28; y < h.y - 7; y += 7) scr.rect(x - 1, y, 3, 2, C.LUX2);
    }
    if (this.tracer) {
      const a = Math.min(this.tracer.x1, this.tracer.x2);
      const b = Math.max(this.tracer.x1, this.tracer.x2);
      scr.rect(a, this.tracer.y, Math.max(1, b - a), 1, this.tracer.t > 2 ? C.LUX2 : C.LUX);
    }
    if (this.flash > 0) {
      const m = h.muzzle();
      scr.rect(m.x - 1, m.y - 1, 3, 2, C.LUX2);
      scr.rect(m.x + h.face * 2, m.y, 3, 1, C.LUX);
    }
    drawFloodWater(scr, w.room, this.clock, h);
    drawFore(scr, w.room, w.index);
    if (!ready()) this.centre(scr, 'LOADING THE SHEET', 96, C.LUX);
  }

  // The room as a grid of characters, which is what it is. No biome art here
  // on purpose — you are laying out a SHAPE, and dressing it while you build
  // it is how a level ends up designed around its own decoration.
  editor(scr) {
    const ed = this.ed;
    scr.clear(C.VOID);
    for (let ty = 0; ty < 12; ty++) {
      for (let tx = 0; tx < 20; tx++) {
        const ch = ed.at(tx, ty);
        const x = tx * 16, y = ty * 16;
        if (ch !== ' ') {
          const solid = '#~^'.includes(ch);
          scr.rect(x, y, 16, 16, solid ? C.SOLID : C.FAR);
          scr.rect(x, y, 16, 1, C.EDGE);
          if (!solid) scr.text(ch, x + 6, y + 5, C.LUX, 6);
        }
        // a dot at every corner, so an empty room still reads as a grid
        scr.rect(x, y, 1, 1, C.DARK);
      }
    }
    const { tx, ty } = ed.cursor;
    const on = (this.clock >> 3) & 1;
    scr.rect(tx * 16, ty * 16, 16, 1, on ? C.LUX : C.LUX2);
    scr.rect(tx * 16, ty * 16 + 15, 16, 1, on ? C.LUX : C.LUX2);
    scr.rect(tx * 16, ty * 16, 1, 16, on ? C.LUX : C.LUX2);
    scr.rect(tx * 16 + 15, ty * 16, 1, 16, on ? C.LUX : C.LUX2);

    // the brush strip
    const bw = W / BRUSHES.length;
    for (let i = 0; i < BRUSHES.length; i++) {
      const x = Math.round(i * bw);
      scr.rect(x, H - 12, Math.ceil(bw) - 1, 11, i === ed.brush ? C.LUX2 : C.MID);
      const ch = BRUSHES[i].ch;
      scr.text(ch === ' ' ? '.' : ch, x + 5, H - 9, i === ed.brush ? C.VOID : C.EDGE, 6);
    }
    scr.text(`ROOM ${ed.index}  ${BRUSHES[ed.brush].name}`, 4, 4, C.LUX, 6);
    scr.text('SHIFT TEST   E DUMP   H REVERT   X BRUSH   RMB ERASE', 4, H - 20, C.DARK, 6);
  }

  gallery(scr) {
    const [name, label] = REEL[this.reel];
    const a = ANIM[name];
    const n = frameCount(name);
    const hold = a.hold ?? 4;
    const i = Math.floor(this.t / hold);
    const frame = a.loop ? i % n : Math.min(i, n - 1);
    if (!a.loop && i >= n + 8) this.t = 0;      // a beat, then round again

    // the ledge moves anchor on the LIP, not the floor, so the gallery has to
    // give them a lip to anchor to or they hang in the air
    const y = a.ledge ? FLOOR - 46 : FLOOR;
    if (!a.ledge) {
      scr.rect(0, FLOOR, W, H - FLOOR, C.SOLID);
      scr.rect(0, FLOOR, W, 1, C.EDGE);
      scr.poly([W / 2 - 9, FLOOR - 1, W / 2 + 9, FLOOR - 1, W / 2 + 6, FLOOR + 2, W / 2 - 6, FLOOR + 2], C.DARK);
    } else {
      // the lip these three hang from, so there is something to hang from
      scr.rect(0, y, W / 2 - 6, H - y, C.SOLID);
      scr.rect(0, y, W / 2 - 6, 1, C.EDGE);
    }
    drawSprite(scr, name, frame, W / 2, y, 1);

    this.centre(scr, label, 22, C.LUX);
    this.centre(scr, `${frame + 1} / ${n}${this.paused ? '  ·  HELD' : ''}`, 34, C.EDGE);
    this.centre(scr, `${this.reel + 1} of ${REEL.length}`, FLOOR + 14, C.DARK);
  }

  // Two rows of marks, top right: his and the other man's. A duel with no
  // count in it is a sparring session — you need to be able to see that the
  // last exchange cost you something.
  marks(scr) {
    const row = (n, max, y, col) => {
      for (let i = 0; i < max; i++) {
        scr.rect(W - 8 - i * 5, y, 3, 5, i < n ? col : C.DARK);
      }
    };
    row(this.hero.health, 3, 4, C.LUX);
    if (this.hero.weapon === 'gun') {
      const n = Math.ceil(this.hero.shield / 20);
      for (let i = 0; i < 5; i++) scr.rect(6 + i * 4, 13, 3, 2, i < n ? C.LUX : C.DARK);
    }
    // whoever is still on his feet in this room, if anyone
    const live = this.foes.find(f => !f.dead);
    const machine = this.sentries.find(s => !s.dead);
    if (live) row(live.health, 2, 12, C.EDGE);
    else if (machine) row(machine.health, 2, 12, C.ALERT);
  }

  chrome(scr) {
    this.marks(scr);
    const s = 6;
    if (this.mode === 'gallery') {
      this.centre(scr, '◀ ▶  ANIMATION      JUMP  HOLD      REEL  BACK', H - 10, C.DARK, s);
      return;
    }
    const h = this.hero;
    // clear of the arcade's HOME button, which sits in the top-left corner
    scr.text(h.state.toUpperCase(), 6, 30, C.EDGE, 8);
    const sp = h.sprite();
    if (sp) scr.text(`${sp.anim}`, 6, 40, C.DARK, s);
    if (this.hint > 0) {
      this.centre(scr, '◀ ▶  WALK, HOLD TO RUN   ▲  JUMP / PULL UP   ▼  CROUCH / CLIMB DOWN', H - 18, C.DARK, s);
      this.centre(scr, 'E  PISTOL OUT      X  FIRE      SHIFT  SHIELD / CAREFUL', H - 10, C.DARK, s);
      this.centre(scr, 'H  TAKE A HIT      M  SOUND      G  ANIMATION GALLERY', H - 2, C.DARK, s);
    }
    if (this.lootFlash > 0) {
      const title = this.world.room.tapeTitle ?? 'ARCHIVE TAPE';
      scr.rect(67, 8, 186, 18, C.DARK);
      this.centre(scr, `ARCHIVE ${String(this.tapes).padStart(2, '0')} · ${title}`, 14, C.LUX, 6);
    } else if (this.tapes > 0) {
      scr.text(`VHS ${String(this.tapes).padStart(2, '0')}`, W - 48, 22, C.LUX, 6);
    }
  }

  centre(scr, str, y, ci, size = 8) {
    scr.text(str, Math.round((W - scr.textW(str, size)) / 2), y, ci, size);
  }

  // ── the touch pad ──────────────────────────────────────────────────
  // Portrait gives it a real panel under the picture; landscape puts it back
  // over the corners. Only on a touchscreen — a mouse does not need a d-pad
  // drawn for it. Same rules as before, minus the buttons for weapons this
  // stage does not have.
  padZones() {
    const scr = this.scr, band = scr.band;
    const zones = [];
    const add = (name, x, y, w, h) => zones.push({ name, x, y, w, h });

    if (band) {
      const u = Math.min(band.h / 3.1, band.w / 7.4);
      const cy = band.y + band.h * 0.5, cx = band.w * 0.24;
      add('up', cx - u / 2, cy - u * 1.55, u, u);
      add('down', cx - u / 2, cy + u * 0.55, u, u);
      add('left', cx - u * 1.6, cy - u / 2, u, u);
      add('right', cx + u * 0.6, cy - u / 2, u, u);
      const rx = band.w * 0.78;
      add('jump', rx - u * 0.1, cy - u * 0.8, u * 1.6, u * 1.6);
      add('fire', rx - u * 1.9, cy - u * 1.5, u * 1.3, u * 1.3);
      add('gunbtn', rx - u * 1.9, cy + u * 0.15, u * 1.3, u * 1.3);
      add('mode', band.w - u * 1.35, band.y + u * 0.15, u * 1.2, u * 0.8);
      add('menu', band.w - u * 2.75, band.y + u * 0.15, u * 1.2, u * 0.8);
      add('careful', cx - u * 1.6, cy + u * 1.75, u * 3.2, u * 0.95);
    } else {
      const pw = W * scr.scale, ph = H * scr.scale;
      const u = Math.min(ph / 6.2, pw / 14);
      const cy = scr.oy + ph - u * 1.6, cx = scr.ox + u * 1.75;
      add('up', cx - u / 2, cy - u * 1.5, u, u);
      add('down', cx - u / 2, cy + u * 0.5, u, u);
      add('left', cx - u * 1.55, cy - u / 2, u, u);
      add('right', cx + u * 0.55, cy - u / 2, u, u);
      const rx = scr.ox + pw - u * 1.7;
      add('jump', rx - u * 0.75, cy - u * 0.75, u * 1.5, u * 1.5);
      add('fire', rx - u * 2.5, cy - u * 1.45, u * 1.15, u * 1.15);
      add('gunbtn', rx - u * 2.5, cy + u * 0.2, u * 1.15, u * 1.15);
      add('mode', scr.ox + pw - u * 1.4, scr.oy + u * 0.2, u * 1.2, u * 0.8);
      add('menu', scr.ox + pw - u * 2.8, scr.oy + u * 0.2, u * 1.2, u * 0.8);
      add('careful', cx - u * 1.55, cy + u * 1.7, u * 3.1, u * 0.85);
    }
    this.input.setZones(zones);
    if (!(this.input.touch || this.input.coarse)) return;

    const d = scr.dctx;
    if (band) {
      d.fillStyle = '#07080b';
      d.fillRect(band.x, band.y, band.w, band.h);
      d.fillStyle = 'rgba(180,200,210,.16)';
      d.fillRect(band.x, band.y, band.w, Math.max(1, band.h * 0.006));
    }
    const GLYPH = { up: '▲', down: '▼', left: '◀', right: '▶' };
    const WORD = { jump: 'JUMP', fire: 'FIRE', gunbtn: 'GUN', mode: 'REEL', menu: 'MENU',
      careful: this.hero.weapon === 'gun' ? 'SHIELD' : 'CAREFUL' };
    for (const z of zones) {
      const on = this.input.zoneHeld(z.name);
      const r = Math.min(z.w, z.h) * 0.22;
      d.beginPath();
      if (d.roundRect) d.roundRect(z.x, z.y, z.w, z.h, r);
      else d.rect(z.x, z.y, z.w, z.h);
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
}

const stage = new Stage();
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(64, now - last);
  last = now;
  while (acc >= 16.667) { stage.step(); acc -= 16.667; }
  stage.paint();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__fp = {
  stage,
  hero: () => stage.hero,
  debug: {
    state: s => stage.hero.go(s),
    hit: (kind = 'hit') => stage.hero.strike(0, stage.hero.x - stage.hero.face * 10, stage, kind),
    gallery: i => { stage.mode = 'gallery'; stage.reel = i ?? 0; stage.t = 0; },
    free: () => { stage.mode = 'free'; },
    reel: REEL,
  },
};
