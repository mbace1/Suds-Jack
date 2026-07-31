// Radio Free Helsinki — the multi-scene bulletin.
//
// A post is a cut package, not a picture: footage, a cut to the studio where
// Toko reads it, then back out to footage. The three registers are deliberately
// different — a photographed plate and a drawn studio do not look like each
// other — and that contrast is what makes a post read as something edited
// rather than as a card with a caption.
//
// It composes the shot classes rather than reimplementing any of them. The
// B-roll is a PHOTOGRAPH where one exists (Grok's frames, CSS ken-burns, no
// main-thread cost) and a DRAWN PLATE otherwise — three photographs were
// serving ten footage keys, which put a night city street under a story about
// a summer beach. `Anchor` is the studio and `Graphic` is the story panel.
// All four mirror the same interface, so this one does too and main.js still
// does not know which kind of post it is holding.
//
// DECODE cuts home to the GRAPHIC and holds there — the rule the codec posts
// always followed, restored now that the graphic is on screen. The panels
// decode as hard as the words do: the truncated chart re-bases, the valuation
// tower goes hollow, the packed auditorium empties. Holding the studio instead
// showed a face while the picture that was doing the arguing stayed off air.
//
// THE STUDIO CANVAS IS LAZY, and that is not an optimisation, it is the
// difference between working and not: seventeen 360×640 backing stores is
// ~63 MB of canvas memory on a phone that is also holding seventeen full-res
// photographs. Only the live post owns one; going idle releases it, and the
// footage — which is what an idle post should be showing anyway — costs an
// <img> that was already there.

import { Photo } from './photo.js?v=34';
import { Anchor } from './anchor.js?v=34';
import { Graphic } from './graphic.js?v=34';
import { Plate, isDrawn } from './plate.js?v=34';

// The beat. Footage leads because the story is about somewhere; the studio
// gets the longest single hold because that is where the words are; the
// graphic comes after it, while what he just said is still in your ear, and
// then it goes back out to footage.
const BEATS = [
  { shot: 'broll', len: 4.0 },
  { shot: 'anchor', len: 6.5 },
  { shot: 'graphic', len: 5.0 },
  { shot: 'broll', len: 4.5 },
];
// The one shot that decodes. DECODE cuts home to it and holds — the words are
// only half of what a bulletin is doing, and this is the other half.
const HOME = 'graphic';
const CUT_FLASH = 0.16;

export class Package {
  constructor(host, story, sector, seed = 0) {
    this.story = story;
    this.sector = sector;
    this.seed = seed;
    this.live = false;
    this._decoded = false;
    // Both drawn shots are LAZY, for the reason at the top of this file — and
    // the graphic costs a second canvas on top of the studio's, so the same
    // rule has to hold for it or the saving is undone by the shot that came to
    // help. Declared FIRST: `get anchor()` reads through it.
    this.drawn = { anchor: null, graphic: null };

    host.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'pkg';

    const a = document.createElement('div');
    a.className = 'pkg-shot on';
    const b = document.createElement('div');
    b.className = 'pkg-shot';
    const g = document.createElement('div');
    g.className = 'pkg-shot';
    const flash = document.createElement('div');
    flash.className = 'pkg-cut';

    root.append(a, b, g, flash);
    host.appendChild(root);

    // the photograph is still the default: a post only gets a drawn plate
    // when no photographed frame matches its dateline
    const Footage = isDrawn(story && story.broll) ? Plate : Photo;
    this.photo = new Footage(a, story, sector, seed);
    this.root = root;
    this.flash = flash;
    this.layers = { broll: a, anchor: b, graphic: g };

    // A post always rests on its own footage, live or not, so scrolling the
    // feed shows real pictures rather than a wall of the same studio.
    this.shot = 'broll';
    this.beat = 0;
    this.clock = 0;
    this.flashT = 0;
  }

  get decoded() { return this._decoded; }
  set decoded(v) {
    this._decoded = !!v;
    this.photo.decoded = this._decoded;
    this.photo.sync();
    for (const k of ['anchor', 'graphic']) {
      const sh = this.drawn[k];
      if (sh) { sh.decoded = this._decoded; sh.paint(); }
    }
    if (this._decoded && this.live) this.cutTo(HOME);
  }

  // `anchor` stays readable as a property because the console reaches for it
  get anchor() { return this.drawn && this.drawn.anchor; }

  ensure(kind) {
    if (this.drawn[kind]) return this.drawn[kind];
    const Cls = kind === 'graphic' ? Graphic : Anchor;
    const sh = new Cls(this.layers[kind], this.story, this.sector, this.seed);
    sh.decoded = this._decoded;
    // created mid-package, so it has to be told the post is on air — the
    // anchor only reads aloud while it is live
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
      // flush the style before handing transitions back, or the post opens on
      // a fade-in instead of already being on its first shot
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
    // Landing mid-package would make the edit look like it had been running
    // while you were somewhere else. Every post starts its own cut from shot 0.
    this.beat = 0;
    this.clock = 0;
    if (this._decoded) { this.ensure(HOME); this.show(HOME, true); }
    else this.show('broll', true);
    for (const k of ['anchor', 'graphic']) if (this.drawn[k]) this.drawn[k].goLive();
  }

  goIdle() {
    this.live = false;
    this.root.classList.remove('live');
    this.photo.goIdle();
    this.flashT = 0;
    this.flash.style.opacity = '0';
    this.show('broll', true);
    this.release();
  }

  update(dt, mouth = 0) {
    this.photo.update(dt, mouth);
    for (const k of ['anchor', 'graphic']) {
      if (this.drawn[k]) this.drawn[k].update(dt, mouth);
    }

    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      this.flash.style.opacity = String((this.flashT / CUT_FLASH) * 0.55);
    }

    // decode holds the graphic — the cut stops while the plain reading is up
    if (!this.live || this._decoded) return;
    this.clock += dt;
    const b = BEATS[this.beat];
    if (this.clock >= b.len) {
      this.clock -= b.len;
      this.beat = (this.beat + 1) % BEATS.length;
      this.cutTo(BEATS[this.beat].shot);
    }
  }

  // Only the DRAWN shot on screen costs a draw — the footage is an <img> whose
  // motion is CSS and keeps running either way, and the shot that is not up
  // does not need a frame.
  draw() {
    if (this.shot === 'broll') { if (this.photo.draw) this.photo.draw(); return; }
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
