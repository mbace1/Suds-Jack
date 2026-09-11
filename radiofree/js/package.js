// Radio Free Helsinki — the cut package.
//
// A post is an EDIT, not a picture: an ambient cutaway of the city, a cut to
// the studio where Toko reads it, and the story graphic that DECODE mutates.
// The three registers are deliberately different — a drawn city, a drawn face
// and a diagram do not look like each other — and that contrast is what makes a
// post read as something edited rather than a card with a caption.
//
// TWO THINGS THIS FILE USED TO DO ARE GONE, and both were the same mistake:
// hiding a problem in the presentation layer rather than fixing it.
//
//   1. It INJECTED A STYLESHEET at runtime — thirty-odd `!important` rules that
//      clamped the headline to two lines, set `.bulletin-line + .bulletin-line
//      { display: none }` (deleting the second paragraph of every bulletin —
//      the one EDITORIAL.md says carries the thing the first was arranged
//      around), and hid `.decode-btn`, `.tally` AND `.fiction`. The fiction
//      footer is the line that makes this feed safe to broadcast; a stylesheet
//      written from JavaScript is not the place to decide it is not shown.
//   2. It hard-disabled DECODE — `get decoded(){return false}` with a setter
//      that threw the value away — while the button that toggles it still
//      shipped. The graphic register became unreachable, which made `graphic.js`
//      dead code and the sign-off tally a count of something that could not
//      happen.
//
// Layout belongs in index.html. Register behaviour belongs here.

import { Anchor } from './anchor.js?v=62';
import { Graphic } from './graphic.js?v=62';
import { PixelScreen } from './screen.js?v=62';
import { drawAmbient, AMBIENT_KEYS } from './ambient.js?v=62';
import { preferredScenes } from './editorialmap.js?v=62';
import { enterScene, scenePulse, endScene } from './ambient-audio.js?v=62';

// THE EDIT. All three registers inside one cycle, and the cycle is shorter than
// a reader spends on a post — a package whose third shot arrives after twenty
// seconds is a package most people never see the third shot of.
const BEATS = [
  { shot: 'broll', len: 5.0 },
  { shot: 'anchor', len: 3.5 },
  { shot: 'graphic', len: 2.5 },
  { shot: 'broll', len: 4.0 },
];
const CUT_FLASH = 0.09;

// No two neighbouring posts open on the same city. The scene is chosen from the
// story's own editorial preferences first (`editorialmap.js`) and only falls
// back to the whole pool when that list is exhausted.
const RECENT_SCENES = [];
const RECENT_LIMIT = 2;
function chooseScene(story, seed) {
  const preferred = preferredScenes(story, AMBIENT_KEYS);
  const pool = preferred.length ? preferred : AMBIENT_KEYS;
  const fresh = pool.filter(scene => !RECENT_SCENES.includes(scene));
  const candidates = fresh.length ? fresh : pool;
  const scene = candidates[Math.floor(Math.abs(seed)) % candidates.length];
  RECENT_SCENES.push(scene);
  while (RECENT_SCENES.length > RECENT_LIMIT) RECENT_SCENES.shift();
  return scene;
}

class AmbientFootage {
  constructor(host, story, seed = 0) {
    this.story = story;
    this.seed = seed;
    this.t = seed * 1.37;
    this.live = false;
    this.decoded = false;
    this.scr = new PixelScreen(host, 128, 152);
    this.scr.canvas.className = 'photo ambient-cv';
    this.scene = chooseScene(story, seed);
    this.renderStatic();
  }
  sync() {}
  goLive() { this.live = true; enterScene(this.scene, 0.45); }
  goIdle() { this.live = false; endScene(); }
  update(dt) { if (this.live) this.t += dt; }
  paint(d) { drawAmbient(this.scene, this.scr, this.t, d, this.story, this.seed); }
  draw() { this.paint(this.decoded ? 1 : 0); }
  renderStatic() { this.paint(this.decoded ? 1 : 0); }
  destroy() { if (this.live) endScene(); this.scr.canvas.remove(); }
}

export class Package {
  constructor(host, story, sector, seed = 0) {
    this.story = story;
    this.sector = sector;
    this.seed = seed;
    this.live = false;
    this._decoded = false;
    // Both drawn shots are LAZY. Two canvases per post across eighteen posts is
    // a wall of backing stores on a phone; only the live post owns any.
    this.drawn = { anchor: null, graphic: null };

    host.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'pkg';
    const a = document.createElement('div'); a.className = 'pkg-shot on';
    const b = document.createElement('div'); b.className = 'pkg-shot';
    const g = document.createElement('div'); g.className = 'pkg-shot';
    const flash = document.createElement('div'); flash.className = 'pkg-cut';
    root.append(a, b, g, flash);
    host.appendChild(root);

    this.photo = new AmbientFootage(a, story, seed);
    this.root = root;
    this.flash = flash;
    this.layers = { broll: a, anchor: b, graphic: g };
    this.shot = 'broll';
    this.beat = 0;
    this.clock = 0;
    this.flashT = 0;
  }

  // DECODE cuts home to the graphic and HOLDS it. The beat clock stops while it
  // is up, because the plain reading is what the listener is there to read and
  // cutting away mid-sentence is the one thing this edit must not do.
  get decoded() { return this._decoded; }
  set decoded(v) {
    const on = !!v;
    this._decoded = on;
    this.photo.decoded = on;
    for (const k of ['anchor', 'graphic']) if (this.drawn[k]) this.drawn[k].decoded = on;
    if (on) {
      this.ensure('graphic').decoded = true;
      this.cutTo('graphic');
      this.beat = BEATS.findIndex(b => b.shot === 'graphic');
      this.clock = 0;
    }
  }

  get anchor() { return this.drawn && this.drawn.anchor; }
  get graphic() { return this.drawn && this.drawn.graphic; }

  ensure(kind) {
    if (this.drawn[kind]) return this.drawn[kind];
    const Cls = kind === 'graphic' ? Graphic : Anchor;
    const sh = new Cls(this.layers[kind], this.story, this.sector, this.seed);
    sh.decoded = this._decoded;
    if (this.live) sh.goLive();
    sh.paint();
    this.drawn[kind] = sh;
    return sh;
  }

  release() {
    for (const k of ['anchor', 'graphic']) {
      if (!this.drawn[k]) continue;
      this.drawn[k].destroy();
      this.drawn[k] = null;
      this.layers[k].innerHTML = '';
    }
  }

  show(shot, immediate = false) {
    this.shot = shot;
    for (const [k, el] of Object.entries(this.layers)) {
      if (immediate) el.style.transition = 'none';
      el.classList.toggle('on', k === shot);
    }
    if (immediate) {
      // flush the style before handing transitions back, or the post opens on a
      // fade-in instead of already being on its first shot
      void this.root.offsetWidth;
      for (const el of Object.values(this.layers)) el.style.transition = '';
    }
  }

  cutTo(shot) {
    if (shot === this.shot) return;
    if (shot !== 'broll') this.ensure(shot);
    this.show(shot);
    this.flashT = CUT_FLASH;
  }

  goLive() {
    this.live = true;
    this.root.classList.add('live');
    this.photo.goLive();
    this.clock = 0;
    // A post you decoded and scrolled back to opens on the shot you left it on.
    if (this._decoded) {
      this.beat = BEATS.findIndex(b => b.shot === 'graphic');
      this.ensure('graphic').decoded = true;
      this.show('graphic', true);
    } else {
      this.beat = 0;
      this.show('broll', true);
    }
    for (const k of ['anchor', 'graphic']) if (this.drawn[k]) this.drawn[k].goLive();
  }

  goIdle() {
    this.live = false;
    this.root.classList.remove('live');
    this.photo.goIdle();
    this.flashT = 0;
    this.flash.style.opacity = '0';
    this.show(this._decoded ? 'graphic' : 'broll', true);
    if (!this._decoded) this.release();
  }

  update(dt, mouth = 0) {
    this.photo.update(dt, mouth);
    for (const k of ['anchor', 'graphic']) if (this.drawn[k]) this.drawn[k].update(dt, mouth);

    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      this.flash.style.opacity = String((this.flashT / CUT_FLASH) * 0.34);
    }

    if (!this.live) return;
    if (this._decoded) return;            // the cut stops while the plain reading is up
    this.clock += dt;
    const b = BEATS[this.beat];
    if (this.clock >= b.len) {
      this.clock -= b.len;
      this.beat = (this.beat + 1) % BEATS.length;
      this.cutTo(BEATS[this.beat].shot);
      if (this.shot === 'broll') scenePulse(this.photo.scene);
    }
  }

  // Only the shot on screen costs a draw.
  draw() {
    if (this.shot === 'broll') { this.photo.draw(); return; }
    const sh = this.drawn[this.shot];
    if (sh) sh.draw();
  }

  renderStatic() { this.photo.renderStatic(); }

  destroy() {
    this.photo.destroy();
    this.release();
    this.root.remove();
  }
}
