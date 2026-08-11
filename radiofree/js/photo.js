import { PixelScreen } from './screen.js?v=43';
import { drawPlate, PLATE_W, PLATE_H } from './plates.js?v=43';
import { brollList } from './wire.js?v=43';
// Radio Free Helsinki — the footage, as pictures.
//
// The plates used to be drawn in code at 144×276. These are Grok's finished
// frames, used AS IS, so two rules change and both are deliberate:
//
//   1. AGENTS.md hard rule #4 said "no image assets — every pixel is drawn in
//      code". The owner has overridden it for the footage. The rest of the app
//      is unchanged: the sign-off card, the decode graphics and Toko are still
//      drawn. Only the B-roll is now photographic.
//   2. The picture NEVER goes through a PixelScreen. Blitting an 784×1168
//      frame into a 144×276 canvas throws away precisely the density that
//      makes it worth using — the individual lit windows, the traffic, the
//      dither in the sky. So it is an <img> at its own resolution and the CRT
//      treatment goes over the top in CSS.
//
// This class deliberately mirrors Post's interface — goLive/goIdle/update/
// draw/renderStatic/destroy — so main.js's loop and rebuild call it
// without knowing which kind of post it is holding.

// Three frames for ten footage keys. Each key goes to the nearest of them
// rather than to a default, so no post shows a picture that contradicts its
// dateline while the rest of the set is drawn.
// Ten footage keys, six sources: three photographic frames and three drawn
// plates. The three that have photographs use them; the seven that would
// otherwise borrow one get a DRAWN plate in the nearest register instead, so
// every key has its own picture rather than a duplicate of somebody else's.
//
// The trade is deliberate and visible: a drawn plate is thinner than a
// photograph, but its motion is intrinsic — the tram actually closes on the
// camera, the traffic actually flows — where a photograph gets a Ken Burns
// push over a frozen moment. Richness against life, one each way.
const FOR_KEY = {
  cathedral:   { img: 'cathedral' },
  katu:        { img: 'katu' },
  mannerheim:  { img: 'mannerheim' },
  esplanadi:   { draw: 'esplanadi' },
  kamppi:      { draw: 'kamppi' },
  station:     { draw: 'station' },
  harbour:     { draw: 'harbour' },
  gulf:        { draw: 'gulf' },
  suomenlinna: { draw: 'suomenlinna' },
  katajanokka: { draw: 'katajanokka' },
};
export const PHOTO_KEYS = Object.keys(FOR_KEY);
export const sourceFor = (broll) => FOR_KEY[broll] || FOR_KEY.cathedral;

export class Photo {
  constructor(host, story, sector, seed = 0) {
    this.story = story;
    this.live = false;

    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'photo-wrap';

    // A story names one shot or several. Only ONE element is ever in the DOM —
    // an <img> or a canvas, swapped on `advance()` — because seventeen posts
    // each holding a photograph per shot is how a feed runs a phone out of
    // memory. The cost of the swap is a decode the browser has already cached.
    this.keys = brollList(story && story.broll);
    if (!this.keys.length) this.keys = ['cathedral'];
    this.idx = 0;
    this.seed = seed;
    this.t = seed * 1.9;
    this.d = 0;
    this.plate = null;
    this.el = null;

    const grade = document.createElement('div');   // phosphor + scanlines
    grade.className = 'photo-grade';
    const sweep = document.createElement('div');   // the slow bright band
    sweep.className = 'photo-sweep';

    wrap.append(grade, sweep);
    host.appendChild(wrap);
    this.wrap = wrap;
    this.grade = grade;
    this.mount(this.keys[0]);
  }

  // Put one footage key on screen. Drawn keys get the PixelScreen, photographed
  // ones the <img>; whichever was there before comes out.
  mount(key) {
    const src = sourceFor(key);
    this.plate = src.draw || null;
    let el;
    if (this.plate) {
      if (!this.scr) this.scr = new PixelScreen(null, PLATE_W, PLATE_H);
      el = this.scr.canvas;
      // `.drawn` is what stops `.media-slot canvas { width: auto }` from
      // letterboxing a full-frame plate — every drawn shot has to carry it.
      el.className = 'photo drawn';
      drawPlate(this.plate, this.scr, this.t, 0);
    } else {
      if (!this.imgEl) {
        this.imgEl = document.createElement('img');
        this.imgEl.className = 'photo';
        this.imgEl.alt = '';            // decorative: the bulletin is the channel
        this.imgEl.decoding = 'async';
      }
      el = this.imgEl;
      el.src = `img/${src.img}.jpg`;
    }
    // The pan is per post and always slightly different, so scrolling the feed
    // does not look like the same shot pushed in three times.
    el.style.animationDelay = `${-(this.seed * 3.7) % 24}s`;
    el.style.animationDirection = this.seed % 2 ? 'alternate-reverse' : 'alternate';
    if (this.el && this.el !== el) this.el.remove();
    if (el.parentNode !== this.wrap) this.wrap.insertBefore(el, this.grade);
    this.el = el;
  }

  // The edit cutting back to footage asks for the NEXT shot of this story. With
  // one key it is a no-op, which is why nothing else has to know the difference.
  advance() {
    if (this.keys.length < 2) return;
    this.idx = (this.idx + 1) % this.keys.length;
    this.mount(this.keys[this.idx]);
  }

  reset() { if (this.idx !== 0) { this.idx = 0; this.mount(this.keys[0]); } }

  goLive() { this.live = true; this.wrap.classList.add('live'); }
  goIdle() { this.live = false; this.wrap.classList.remove('live'); }

  // Nothing to integrate — the motion is CSS, which keeps running whether or
  // not the rAF loop is on this post, and costs no main-thread time.
  update(dt = 0.016) {
    this.sync();
    if (!this.plate) return;            // a photograph has nothing to repaint
    this.t += dt;
    this.d = 0;
    drawPlate(this.plate, this.scr, this.t, this.d);
  }
  draw() {}
  renderStatic() {
    this.sync();
    if (this.plate) drawPlate(this.plate, this.scr, this.t, 0);
  }

  sync() { /* nothing to sync since DECODE went */ }

  destroy() { if (this.scr) this.scr.destroy(); this.wrap.remove(); }
}
