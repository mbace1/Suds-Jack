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
// draw/renderStatic/decoded/destroy — so main.js's loop and rebuild call it
// without knowing which kind of post it is holding.

// Three frames for ten footage keys. Each key goes to the nearest of them
// rather than to a default, so no post shows a picture that contradicts its
// dateline while the rest of the set is drawn.
const FOR_KEY = {
  cathedral: 'cathedral', katajanokka: 'cathedral', suomenlinna: 'cathedral',
  katu: 'katu', esplanadi: 'katu', kamppi: 'katu', station: 'katu',
  mannerheim: 'mannerheim', harbour: 'mannerheim', gulf: 'mannerheim',
};
export const PHOTO_KEYS = [...new Set(Object.values(FOR_KEY))];
export const photoFor = (broll) => FOR_KEY[broll] || 'cathedral';

export class Photo {
  constructor(host, story, sector, seed = 0) {
    this.story = story;
    this.decoded = false;
    this.live = false;

    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'photo-wrap';

    const img = document.createElement('img');
    img.className = 'photo';
    img.alt = '';                       // decorative: the bulletin is the channel
    img.decoding = 'async';
    img.src = `img/${photoFor(story.broll)}.jpg`;
    // The pan is per post and always slightly different, so scrolling the feed
    // does not look like the same shot pushed in three times.
    img.style.animationDelay = `${-(seed * 3.7) % 24}s`;
    img.style.animationDirection = seed % 2 ? 'alternate-reverse' : 'alternate';

    const grade = document.createElement('div');   // phosphor + scanlines + decode
    grade.className = 'photo-grade';
    const sweep = document.createElement('div');   // the slow bright band
    sweep.className = 'photo-sweep';

    wrap.append(img, grade, sweep);
    host.appendChild(wrap);
    this.wrap = wrap;
  }

  goLive() { this.live = true; this.wrap.classList.add('live'); }
  goIdle() { this.live = false; this.wrap.classList.remove('live'); }

  // Nothing to integrate — the motion is CSS, which keeps running whether or
  // not the rAF loop is on this post, and costs no main-thread time.
  update() { this.sync(); }
  draw() {}
  renderStatic() { this.sync(); }

  sync() { this.wrap.classList.toggle('decoded', !!this.decoded); }

  destroy() { this.wrap.remove(); }
}
