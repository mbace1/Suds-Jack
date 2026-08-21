// One gesture: drag.
//
// The awkward part of this genre is that a stop needs to answer two different
// drags — "extend the line that ends here" and "start a new line here" — and a
// stop cannot ask which you meant. The answer is the NUB: a small stub drawn
// just past every terminus. Grab the nub and you extend; grab the shape and you
// start something new. Two targets, no modes, nothing to explain.
//
// The line commits AS YOU DRAG rather than on release, so what you see forming
// is the real thing and not a preview that might be refused when you let go.
// Dragging back onto the stop behind the terminus pulls it off again, and one
// continuous drag back down a line deletes the whole thing.
//
// EVERY HIT RADIUS HERE IS A SCREEN MEASUREMENT. Fixed in board units they
// shrink with the window — the nub was 46px on a desktop and 17px on a phone,
// which meant a line could not be shortened or deleted by thumb at all.

import { legPoints } from './geometry.js?v=5';
import { TOUCH, sizeAt } from './palette.js?v=5';
import { nubs } from './lines.js?v=5';

export class LineDrawer {
  constructor(canvas, renderer, game, opts = {}) {
    this.canvas = canvas;
    this.r = renderer;
    this.game = game;
    this.onMessage = opts.onMessage || (() => {});
    this.onChange = opts.onChange || (() => {});
    this.drag = null;
    this.hover = null;

    this._down = e => this.down(e);
    this._move = e => this.move(e);
    this._up = e => this.up(e);
    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointermove', this._move);
    // capture on the window, or letting go past the edge of the board leaves a
    // drag running forever with nothing to end it
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._down);
    this.canvas.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
  }

  // board units per screen pixel
  get unit() { return 1 / (this.r.scale || 1); }
  get nubGap() { return TOUCH.nubGapPx * this.unit; }
  get nubHit() { return (TOUCH.nubHitPx / 2) * this.unit; }
  get stationHit() { return (TOUCH.stationHitPx / 2) * this.unit; }

  get sizes() { return sizeAt(this.r.scale || 1); }
  nubs() { return nubs(this.game.net, this.game.world, this.nubGap, this.sizes); }

  at(e) { return this.r.toBoard(e.clientX, e.clientY); }

  down(e) {
    if (this.game.state !== 'play') return;
    const p = this.at(e);

    // Nearest wins, rather than nub-first. On a phone the two hit zones overlap,
    // and taking the nub whenever it is merely in range would make it impossible
    // to start a NEW line from a stop that a line already ends at.
    let pick = null, best = Infinity;
    for (const n of this.nubs()) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < this.nubHit && d < best) { best = d; pick = n; }
    }
    const st = this.game.world.hitStation(p.x, p.y, this.stationHit);
    if (st && Math.hypot(st.x - p.x, st.y - p.y) < best) pick = null;

    if (pick) {
      this.drag = { mode: 'extend', line: pick.line, atHead: pick.atHead, colour: pick.line.colour, p };
      this.canvas.setPointerCapture?.(e.pointerId);
      return;
    }
    if (st) {
      this.drag = { mode: 'new', anchorId: st.id, colour: this.game.net.freeColour(), p };
      this.canvas.setPointerCapture?.(e.pointerId);
    }
  }

  move(e) {
    const p = this.at(e);
    const st = this.game.world.hitStation(p.x, p.y, this.stationHit);
    this.hover = st ? st.id : null;
    if (!this.drag) return;
    this.drag.p = p;
    if (!st) return;

    if (this.drag.mode === 'new') {
      if (st.id === this.drag.anchorId) return;
      if (!this.game.net.canOpenLine()) { this.fail('every line is already out there'); return; }
      const res = this.game.net.open(this.drag.anchorId, st.id);
      if (res.error) { this.fail(res.error); return; }
      this.drag = { mode: 'extend', line: res.line, atHead: false, colour: res.line.colour, p };
      this.onChange();
      return;
    }

    const line = this.drag.line;
    if (!this.game.net.lines.includes(line)) { this.drag = null; return; }
    const endId = this.drag.atHead ? line.head : line.tail;
    if (st.id === endId) return;

    // dragging back onto the stop behind the terminus pulls the terminus off —
    // the undo lives in the same gesture as the do, and carrying on down the
    // line peels the rest of it
    const behind = this.drag.atHead ? line.stations[1] : line.stations[line.stations.length - 2];
    if (st.id === behind && !line.loop) {
      const res = this.game.net.retract(line, this.drag.atHead);
      if (res.removed) this.drag = { mode: 'new', anchorId: st.id, colour: this.game.net.freeColour(), p };
      this.onChange();
      return;
    }

    const res = this.game.net.extend(line, st.id, this.drag.atHead);
    if (res.error) { this.fail(res.error); return; }
    this.onChange();
  }

  up() { this.drag = null; }

  fail(msg) {
    if (this._lastFail === msg && performance.now() - (this._failAt || 0) < 1200) return;
    this._lastFail = msg;
    this._failAt = performance.now();
    this.onMessage(msg);
  }

  // What the renderer draws as the dashed reach from the live end to the finger.
  view() {
    const out = { hover: this.hover, nubs: this.nubs(), nubR: TOUCH.nubDrawPx * this.unit };
    if (!this.drag) return out;
    const w = this.game.world;
    if (this.drag.mode === 'new') {
      const a = w.station(this.drag.anchorId);
      if (a) {
        out.anchor = a.id;
        out.drag = { colour: this.drag.colour, pts: legPoints(a, this.drag.p) };
      }
      return out;
    }
    const line = this.drag.line;
    if (!this.game.net.lines.includes(line)) return out;
    const end = w.station(this.drag.atHead ? line.head : line.tail);
    if (end) {
      out.anchor = end.id;
      out.drag = { colour: this.drag.colour, pts: legPoints(end, this.drag.p) };
    }
    return out;
  }
}
