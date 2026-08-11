// Radio Free Helsinki — drawn footage.
//
// The photographs are the default and stay the default: three real frames of
// Helsinki, and a post that has one uses it. But three frames served ten
// footage keys, so every key that was not the cathedral, the narrow street or
// the boulevard borrowed one of those — which put a night city street under a
// story about a summer beach. A picture that contradicts its own dateline is
// worse than no picture, and this app's whole argument is that the framing is
// never only in the words.
//
// So a post can name DRAWN footage instead. `plates.js` already holds full-
// frame 144×276 plates; this is the shot class that puts one on screen, with
// the same interface as Photo and Anchor so main.js still does not know which
// kind of post it is holding.
//
// 144×276 is 0.52 and a phone post is about 0.49, so `object-fit: cover` crops
// a few pixels off the sides and nothing else. That is the reason the plates
// are drawn at that size rather than at the panel's 128×152, which would have
// had to be cropped by a third or letterboxed.

import { PixelScreen } from './screen.js?v=43';
import { drawPlate, PLATE_W, PLATE_H } from './plates.js?v=43';
import { brollList } from './wire.js?v=43';

// OPT-IN, and named one at a time on purpose. `plates.js` can draw seven of
// the ten footage keys, so testing against PLATE_KEYS would have quietly moved
// five live posts off the owner's photographs and onto drawn art — which is
// the exact swap he pushed back on once already. A photograph wins wherever
// one exists. A key lands on this list only when there is no frame for it and
// the drawn plate is the picture the story is actually about.
const DRAWN = ['beach', 'moon', 'winterhall', 'packice', 'chase', 'approach',
  'cableship', 'swarm', 'switchyard', 'studiofloor', 'enginewire', 'boardroom'];
// A story naming several shots is classed by its FIRST one — the lead shot is
// the register the post is in, and `Photo` can draw the rest either way.
export const isDrawn = (broll) => DRAWN.includes(brollList(broll)[0]);

export class Plate {
  constructor(host, story, sector, seed = 0) {
    this.story = story || {};
    this.seed = seed;
    this.live = false;
    this.t = seed * 1.9;
    // one shot or several; the edit asks for the next one every time it cuts
    // back to footage, so a post about a place can be about three of them
    this.keys = brollList(this.story.broll);
    if (!this.keys.length) this.keys = ['esplanadi'];
    this.idx = 0;

    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'photo-wrap plate-wrap';

    // a detached buffer, drawn at the plate's own resolution and shown by the
    // same CSS the photographs use — so a cut between the two changes the
    // subject and not the apparent resolution of the broadcast
    this.scr = new PixelScreen(null, PLATE_W, PLATE_H);
    this.scr.canvas.className = 'photo drawn plate-cv';
    this.scr.canvas.setAttribute('aria-hidden', 'true');

    const grade = document.createElement('div');
    grade.className = 'photo-grade';
    const sweep = document.createElement('div');
    sweep.className = 'photo-sweep';

    wrap.append(this.scr.canvas, grade, sweep);
    host.appendChild(wrap);
    this.wrap = wrap;
  }


  goLive() { this.live = true; this.wrap.classList.add('live'); }
  goIdle() { this.live = false; this.wrap.classList.remove('live'); }

  update(dt) { this.t += dt; }

  draw() { this.paint(); }
  renderStatic() { this.paint(); }
  sync() { this.paint(); }

  advance() {
    if (this.keys.length < 2) return;
    this.idx = (this.idx + 1) % this.keys.length;
    this.paint();
  }

  reset() { this.idx = 0; }

  paint() { drawPlate(this.keys[this.idx], this.scr, this.t, 0); }

  destroy() { this.scr.destroy(); this.wrap.remove(); }
}
