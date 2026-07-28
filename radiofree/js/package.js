// Radio Free Helsinki — the multi-scene bulletin.
//
// A post is a cut package, not a picture: footage, a cut to the studio where
// Toko reads it, then back out to footage. The three registers are deliberately
// different — a photographed plate and a drawn studio do not look like each
// other — and that contrast is what makes a post read as something edited
// rather than as a card with a caption.
//
// It composes the two shot classes rather than reimplementing either. `Photo`
// is the B-roll (Grok's frames, CSS ken-burns, no main-thread cost) and
// `Anchor` is the studio (a live canvas driven by the reader's mouth
// amplitude). Both already mirror the same interface, so this one does too and
// main.js still does not know which kind of post it is holding.
//
// DECODE cuts home to the ANCHOR and holds there. That is the rule the codec
// posts already follow — decode goes to the one shot that decodes — and here
// it means the plain reading arrives from a person rather than from a caption.
//
// THE STUDIO CANVAS IS LAZY, and that is not an optimisation, it is the
// difference between working and not: seventeen 360×640 backing stores is
// ~63 MB of canvas memory on a phone that is also holding seventeen full-res
// photographs. Only the live post owns one; going idle releases it, and the
// footage — which is what an idle post should be showing anyway — costs an
// <img> that was already there.

import { Photo } from './photo.js?v=25';
import { Anchor } from './anchor.js?v=25';

// The beat. Footage leads because the story is about somewhere; the studio
// gets the longest single hold because that is where the words are.
const BEATS = [
  { shot: 'broll', len: 4.2 },
  { shot: 'anchor', len: 7.0 },
  { shot: 'broll', len: 5.4 },
];
const CUT_FLASH = 0.16;

export class Package {
  constructor(host, story, sector, seed = 0) {
    this.story = story;
    this.sector = sector;
    this.seed = seed;
    this.live = false;
    this._decoded = false;
    this.anchor = null;

    host.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'pkg';

    const a = document.createElement('div');
    a.className = 'pkg-shot on';
    const b = document.createElement('div');
    b.className = 'pkg-shot';
    const flash = document.createElement('div');
    flash.className = 'pkg-cut';

    root.append(a, b, flash);
    host.appendChild(root);

    this.photo = new Photo(a, story, sector, seed);
    this.root = root;
    this.flash = flash;
    this.layers = { broll: a, anchor: b };

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
    if (this._decoded && this.live) {
      this.ensureAnchor();
      this.cutTo('anchor');
    }
    if (this.anchor) { this.anchor.decoded = this._decoded; this.anchor.paint(); }
  }

  ensureAnchor() {
    if (this.anchor) return this.anchor;
    this.anchor = new Anchor(this.layers.anchor, this.story, this.sector, this.seed);
    this.anchor.decoded = this._decoded;
    // it is created mid-package, so it has to be told the post is on air —
    // the anchor only reads aloud while it is live
    if (this.live) this.anchor.goLive();
    this.anchor.paint();
    return this.anchor;
  }

  releaseAnchor() {
    if (!this.anchor) return;
    this.anchor.destroy();
    this.anchor = null;
    this.layers.anchor.innerHTML = '';
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
    if (shot === 'anchor') this.ensureAnchor();
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
    if (this._decoded) { this.ensureAnchor(); this.show('anchor', true); }
    else this.show('broll', true);
    if (this.anchor) this.anchor.goLive();
  }

  goIdle() {
    this.live = false;
    this.root.classList.remove('live');
    this.photo.goIdle();
    this.flashT = 0;
    this.flash.style.opacity = '0';
    this.show('broll', true);
    this.releaseAnchor();
  }

  update(dt, mouth = 0) {
    this.photo.update(dt, mouth);
    if (this.anchor) this.anchor.update(dt, mouth);

    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      this.flash.style.opacity = String((this.flashT / CUT_FLASH) * 0.55);
    }

    // decode holds the studio — the cut stops while the plain reading is up
    if (!this.live || this._decoded) return;
    this.clock += dt;
    const b = BEATS[this.beat];
    if (this.clock >= b.len) {
      this.clock -= b.len;
      this.beat = (this.beat + 1) % BEATS.length;
      this.cutTo(BEATS[this.beat].shot);
    }
  }

  // Only the studio costs a draw, and only while it is the shot on screen —
  // the footage is an <img> whose motion is CSS and keeps running either way.
  draw() { if (this.shot === 'anchor' && this.anchor) this.anchor.draw(); }

  renderStatic() { this.photo.renderStatic(); }

  destroy() {
    this.photo.destroy();
    this.releaseAnchor();
    this.root.remove();
  }
}
