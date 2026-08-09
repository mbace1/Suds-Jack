// Flash Prince — the animation stage.
//
// The levels are gone. No rooms, no scenery, no traps, no sentries, no duel:
// one flat floor, one man, and every frame he has. What is left on screen is
// exactly the thing being worked on, which is the point of stripping it.
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
import { paletteAt, C } from './palette.js';
import { Hero } from './hero.js';
import { Bench } from './bench.js';
import { Input } from './input.js';
import { loadSheet, drawSprite, ready, ANIM, CONRAD_COLOURS } from './sprite.js';

const FLOOR = 144;                 // the ground line, in picture pixels
const PAL = paletteAt(1.15);       // one palette, cool and quiet, so he reads

// The gallery's running order — roughly the order a man does them in.
const REEL = [
  ['stand', 'STANDING'],
  ['step', 'WALK · first step'],
  ['stepB', 'WALK · second step'],
  ['run', 'RUN — twenty frames'],
  ['skid', 'PULLING UP'],
  ['drawGun', 'DRAWING THE PISTOL'],
  ['crouch', 'CROUCHING'],
  ['crouchLow', 'CROUCHED'],
  ['rise', 'STANDING UP'],
  ['roll', 'THE ROLL'],
  ['gather', 'JUMP · gather'],
  ['airUp', 'JUMP · drive'],
  ['land', 'JUMP · landing'],
  ['gatherRun', 'RUNNING JUMP · gather'],
  ['airRun', 'RUNNING JUMP · flight'],
  ['fall', 'FALLING'],
  ['hang', 'HANGING'],
  ['mantle', 'PULLING UP'],
  ['lower', 'CLIMBING DOWN'],
  ['wake', 'GETTING UP'],
  ['dead', 'DEAD'],
  // the sword, off the Prince of Persia sheet
  ['swordDraw', 'SWORD · drawing'],
  ['swordGuard', 'SWORD · en garde'],
  ['swordAdvance', 'SWORD · advance'],
  ['swordLunge', 'SWORD · the lunge'],
  ['swordStrike', 'SWORD · overhead'],
  ['swordParry', 'SWORD · parry'],
];

class Stage {
  constructor() {
    this.scr = new Screen(document.getElementById('screen'));
    // He is blitted, not drawn from the sixteen, so the quantise pass is told
    // to leave his own fourteen colours alone.
    this.scr.keepColours(CONRAD_COLOURS);
    this.scr.setPalette(PAL);
    loadSheet();
    this.input = new Input(this.scr);
    this.world = new Bench();
    this.hero = new Hero(48, FLOOR);
    this.hero.hasSword = true;          // the bench carries one, so it can be seen
    this.hero.go('wake');
    this.mode = 'free';
    this.reel = 0;
    this.t = 0;
    this.clock = 0;
    this.hint = 420;              // the control line fades out of the way
  }

  // ── the frame ──────────────────────────────────────────────────────
  step() {
    this.clock++;
    const inp = this.input;
    inp.poll();

    // one button swaps the two modes, and it is the same button on the pad
    if (inp.firePress) {
      this.mode = this.mode === 'free' ? 'gallery' : 'free';
      this.t = 0;
      if (this.mode === 'free') { this.hero.reset(48, FLOOR); this.hero.go('stand'); }
    }

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
    h.update(this.world, inp, this);
    // the bench is a strip, not a room: walk off one end and you come back on
    // the other, and the gap drops you back onto the floor rather than into
    // nothing — falling forever is not an animation
    if (h.x < -14) h.x = W + 12;
    if (h.x > W + 14) h.x = -12;
    if (h.y > H + 10) { h.reset(48, FLOOR); h.go('land'); }
  }

  // the hero asks the game for these; on a floor with nothing on it they are
  // all no-ops
  kill() { this.hero.reset(48, FLOOR); this.hero.go('wake'); }
  hurt() {}

  // ── drawing ────────────────────────────────────────────────────────
  paint() {
    const scr = this.scr;
    this.backdrop(scr);

    if (this.mode === 'gallery') this.gallery(scr);
    else this.free(scr);

    this.chrome(scr);
    scr.present();
    this.padZones();
  }

  // Flat bands and a hard horizon — the least backdrop that still gives him a
  // floor to stand on and a value to read against.
  backdrop(scr) {
    scr.clear(C.SKY_HI);
    scr.rect(0, 44, W, 40, C.SKY_LO);
    scr.rect(0, 84, W, 34, C.FAR);
    scr.rect(0, 118, W, H - 118, C.MID);
  }

  free(scr) {
    this.world.draw(scr, C);
    const h = this.hero;
    if (this.world.boxSolid(h.x - 2, h.y + 1, 4, 3)) {
      scr.poly([h.x - 9, h.y - 1, h.x + 9, h.y - 1, h.x + 6, h.y + 2, h.x - 6, h.y + 2], C.DARK);
    }
    const sp = h.sprite();
    if (sp) drawSprite(scr, sp.anim, Math.floor(sp.f), h.x, sp.lipY ?? h.y, h.face);
    if (!ready()) this.centre(scr, 'LOADING THE SHEET', 96, C.LUX);
  }

  gallery(scr) {
    const [name, label] = REEL[this.reel];
    const a = ANIM[name];
    const hold = a.hold ?? 4;
    const i = Math.floor(this.t / hold);
    const frame = a.loop ? i % a.n : Math.min(i, a.n - 1);
    if (!a.loop && i >= a.n + 8) this.t = 0;      // a beat, then round again

    const y = a.lip ? FLOOR - 46 : FLOOR;
    if (!a.lip) {
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
    this.centre(scr, `${frame + 1} / ${a.n}${this.paused ? '  ·  HELD' : ''}`, 34, C.EDGE);
    this.centre(scr, `${this.reel + 1} of ${REEL.length}`, FLOOR + 14, C.DARK);
  }

  chrome(scr) {
    const s = 6;
    if (this.mode === 'gallery') {
      this.centre(scr, '◀ ▶  ANIMATION      JUMP  HOLD      FIRE  FREE', H - 10, C.DARK, s);
      return;
    }
    const h = this.hero;
    // clear of the arcade's HOME button, which sits in the top-left corner
    scr.text(h.state.toUpperCase(), 6, 30, C.EDGE, 8);
    const sp = h.sprite();
    if (sp) scr.text(`${sp.anim}`, 6, 40, C.DARK, s);
    if (this.hint > 0) {
      this.centre(scr, '◀ ▶  WALK, HOLD TO RUN   ▲  JUMP / PULL UP   ▼  CROUCH / CLIMB DOWN', H - 18, C.DARK, s);
      this.centre(scr, 'E  SWORD OUT  ·  ◀ ▶ ADVANCE / RETREAT  ·  ▲ STRIKE  ·  SHIFT PARRY', H - 10, C.DARK, s);
      this.centre(scr, 'FIRE  —  ANIMATION GALLERY', H - 2, C.DARK, s);
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
    const WORD = { jump: 'JUMP', fire: 'MODE', gunbtn: 'SWORD', careful: 'CAREFUL' };
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
    gallery: i => { stage.mode = 'gallery'; stage.reel = i ?? 0; stage.t = 0; },
    free: () => { stage.mode = 'free'; },
    reel: REEL,
  },
};
