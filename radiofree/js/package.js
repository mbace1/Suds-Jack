// Radio Free Helsinki — compact moving bulletin package.
// The picture owns the screen; copy is a lower third. The sequence alternates
// moving location footage and the animated studio instead of parking the only
// obvious motion at the end of a post.

import { Photo } from './photo.js?v=37';
import { Anchor } from './anchor.js?v=37';
import { Graphic } from './graphic.js?v=37';
import { Plate, isDrawn } from './plate.js?v=37';

// v47 presentation correction: keep the current RFH visual formula, but give
// the art substantially more room and remove DECODE/tally furniture from the
// visible broadcast. These overrides intentionally sit after index.html CSS.
if (!document.getElementById('rfh-v47-refine')) {
  const style = document.createElement('style');
  style.id = 'rfh-v47-refine';
  style.textContent = `
    .decode-btn,.decode-box,.tally{display:none!important}
    .post-caption{max-height:34%!important;padding:28px 12px calc(5% + env(safe-area-inset-bottom))!important;background:linear-gradient(to top,rgba(3,10,8,.96) 0%,rgba(3,10,8,.84) 58%,rgba(3,10,8,0) 100%)!important;overflow:hidden!important}
    .post-caption .head{font-size:15px!important;line-height:1.16!important;margin-bottom:4px!important;-webkit-line-clamp:2!important}
    .post-caption .tag{font-size:8px!important;margin-bottom:3px!important;letter-spacing:.14em!important}
    .post-caption .bulletin{font-size:11px!important;line-height:1.28!important;-webkit-line-clamp:2!important}
    .post-caption .bulletin-line + .bulletin-line{margin-top:0!important}
    .post-caption .fiction{display:none!important}
    .rail{top:auto!important;bottom:7%!important}
    .rail-btn{width:44px!important;min-height:44px!important}
  `;
  document.head.appendChild(style);
}

// Two studio appearances per loop makes the sequence visibly alive from the
// first seconds while preserving the photographic/drawn contrast.
const BEATS = [
  { shot: 'broll', len: 2.8 },
  { shot: 'anchor', len: 3.6 },
  { shot: 'broll', len: 2.6 },
  { shot: 'anchor', len: 3.2 },
];
const HOME = 'anchor';
const CUT_FLASH = 0.12;

export class Package {
  constructor(host, story, sector, seed = 0) {
    this.story = story;
    this.sector = sector;
    this.seed = seed;
    this.live = false;
    this._decoded = false;
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

    const Footage = isDrawn(story && story.broll) ? Plate : Photo;
    this.photo = new Footage(a, story, sector, seed);
    this.root = root;
    this.flash = flash;
    this.layers = { broll: a, anchor: b, graphic: g };
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

  get anchor() { return this.drawn && this.drawn.anchor; }

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
      this.flash.style.opacity = String((this.flashT / CUT_FLASH) * 0.48);
    }
    if (!this.live || this._decoded) return;
    this.clock += dt;
    const b = BEATS[this.beat];
    if (this.clock >= b.len) {
      this.clock -= b.len;
      this.beat = (this.beat + 1) % BEATS.length;
      this.cutTo(BEATS[this.beat].shot);
    }
  }

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
