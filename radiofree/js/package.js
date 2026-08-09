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
// THE STUDIO CANVAS IS LAZY, and that is not an optimisation, it is the
// difference between working and not: seventeen 360×640 backing stores is
// ~63 MB of canvas memory on a phone that is also holding seventeen full-res
// photographs. Only the live post owns one; going idle releases it, and the
// footage — which is what an idle post should be showing anyway — costs an
// <img> that was already there.

import { Photo } from './photo.js?v=42';
import { Anchor } from './anchor.js?v=42';
import { Plate, isDrawn } from './plate.js?v=42';

// THE EDIT, and there is more than one of them now. Every post used to cut on
// the same four beats, so a feed of five bulletins was the same film five
// times. Each post picks a pattern off its own index — a long establishing
// hold, a fast intercut, or a studio-led read — and no two neighbours run the
// same one.
//
// The graphic beat went with DECODE: the panels existed to mutate under it.
const PATTERNS = [
  // ESTABLISH: hold the place, then the reporter, then back out to it
  [{ shot: 'broll', len: 6.5 }, { shot: 'anchor', len: 5.5 }, { shot: 'broll', len: 5.0 }],
  // INTERCUT: quick, restless, four cuts before it settles
  [{ shot: 'broll', len: 2.6 }, { shot: 'anchor', len: 2.4 }, { shot: 'broll', len: 2.2 },
   { shot: 'anchor', len: 3.4 }, { shot: 'broll', len: 5.0 }],
  // PIECE TO CAMERA: the reporter carries it and the place is punctuation
  [{ shot: 'anchor', len: 7.5 }, { shot: 'broll', len: 3.0 }, { shot: 'anchor', len: 5.0 },
   { shot: 'broll', len: 4.0 }],
];
const CUT_FLASH = 0.16;

export class Package {
  constructor(host, story, sector, seed = 0) {
    this.story = story;
    this.sector = sector;
    this.seed = seed;
    this.live = false;
    // Both drawn shots are LAZY, for the reason at the top of this file — and
    // Declared FIRST: `get anchor()` reads through it.
    this.drawn = { anchor: null };

    host.innerHTML = '';
    const root = document.createElement('div');
    // THE GRADE. Three of them, seeded off the post index, because a feed
    // where every night looks like the same night reads as one long shot with
    // captions changing over it. Cold is the default gulf blue; sodium is a
    // street-lit night; bleach is a hard, desaturated, high-contrast night that
    // suits industry and machinery.
    root.className = 'pkg grade-' + ['cold', 'sodium', 'bleach'][(seed + 1) % 3];

    const a = document.createElement('div');
    a.className = 'pkg-shot on';
    const b = document.createElement('div');
    b.className = 'pkg-shot';
    const flash = document.createElement('div');
    flash.className = 'pkg-cut';

    // THE CAMERA HUD. One overlay for every shot rather than furniture drawn
    // into each canvas: the photographs cannot draw any, and three
    // implementations of the same corner would have drifted apart by the second
    // week. It is diegetic — the post is a feed, and a feed has a camera on the
    // other end of it — so it stays in clean and vertical mode.
    const hud = document.createElement('div');
    hud.className = 'pkg-hud';
    hud.setAttribute('aria-hidden', 'true');
    const rec = document.createElement('span');
    rec.className = 'hud-rec';
    const tc = document.createElement('span');
    tc.className = 'hud-tc';
    const camTag = document.createElement('span');
    camTag.className = 'hud-cam';
    hud.append(rec, camTag, tc);
    this.hud = { root: hud, rec, tc, cam: camTag };
    this.clock = 0;

    root.append(a, b, flash, hud);
    host.appendChild(root);

    // the photograph is still the default: a post only gets a drawn plate
    // when no photographed frame matches its dateline
    const Footage = isDrawn(story && story.broll) ? Plate : Photo;
    this.photo = new Footage(a, story, sector, seed);
    this.root = root;
    this.flash = flash;
    this.layers = { broll: a, anchor: b };
    // which edit this post is cut on — seeded, so scrolling back finds it
    this.beats = PATTERNS[seed % PATTERNS.length];

    // A post always rests on its own footage, live or not, so scrolling the
    // feed shows real pictures rather than a wall of the same studio.
    this.shot = 'broll';
    this.beat = 0;
    this.clock = 0;
    this.flashT = 0;
    // The timecode starts where the post sits in the feed, so two posts on
    // screen are never on the same frame — a running clock that agrees
    // everywhere reads as a graphic, not as a camera.
    this.tc = 60 + seed * 137;
    this.paintHud();
  }

  // `anchor` stays readable as a property because the console reaches for it
  get anchor() { return this.drawn && this.drawn.anchor; }

  ensure(kind) {
    if (this.drawn[kind]) return this.drawn[kind];
    const sh = new Anchor(this.layers[kind], this.story, this.sector, this.seed);
    // created mid-package, so it has to be told the post is on air — the
    // anchor only reads aloud while it is live
    if (this.live) sh.goLive();
    sh.paint();
    this.drawn[kind] = sh;
    return sh;
  }

  release() {
    for (const k of ['anchor']) {
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

  // Which camera the edit is on. The numbers are the same every time a post
  // shows a shot, because a cut back to the studio is a cut back to the same
  // camera, and a HUD that renumbers itself is a HUD nobody believes.
  camOf(shot) {
    if (shot === 'anchor') return this.anchor && this.anchor.set === 'street' ? 'ENG 2' : 'CAM 1';
    return 'CAM 3';
  }

  paintHud() {
    const h = this.hud;
    if (!h) return;
    const f = Math.floor(this.tc * 25) % 25;
    const total = Math.floor(this.tc);
    const mm = String(Math.floor(total / 60) % 60).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    h.tc.textContent = `00:${mm}:${ss}:${String(f).padStart(2, '0')}`;
    h.cam.textContent = this.camOf(this.shot);
    h.rec.textContent = this.live ? 'REC' : 'STBY';
    h.root.classList.toggle('rolling', this.live);
  }

  cutTo(shot) {
    if (shot === this.shot) return;
    if (shot !== 'broll') this.ensure(shot);
    this.show(shot);
    this.flashT = CUT_FLASH;
    this.paintHud();
  }

  goLive() {
    this.live = true;
    this.root.classList.add('live');
    this.paintHud();
    this.photo.goLive();
    // Landing mid-package would make the edit look like it had been running
    // while you were somewhere else. Every post starts its own cut from shot 0.
    this.beat = 0;
    this.clock = 0;
    this.show(this.beats[0].shot, true);
    if (this.beats[0].shot !== 'broll') this.ensure(this.beats[0].shot);
    if (this.drawn.anchor) this.drawn.anchor.goLive();
  }

  goIdle() {
    this.live = false;
    this.root.classList.remove('live');
    this.paintHud();
    this.photo.goIdle();
    this.flashT = 0;
    this.flash.style.opacity = '0';
    this.show('broll', true);
    this.release();
  }

  update(dt, mouth = 0) {
    this.photo.update(dt, mouth);
    if (this.drawn.anchor) this.drawn.anchor.update(dt, mouth);

    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      this.flash.style.opacity = String((this.flashT / CUT_FLASH) * 0.55);
    }

    // the timecode only runs while the post is live: a feed that is not being
    // watched is not being recorded
    if (this.live) { this.tc += dt; this.paintHud(); }

    if (!this.live) return;
    this.clock += dt;
    const b = this.beats[this.beat];
    if (this.clock >= b.len) {
      this.clock -= b.len;
      this.beat = (this.beat + 1) % this.beats.length;
      this.cutTo(this.beats[this.beat].shot);
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
