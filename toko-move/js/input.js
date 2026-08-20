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

import { legPoints } from './geometry.js?v=2';
import { INK } from './palette.js?v=2';

const NUB_GAP = 15;
const NUB_HIT = 19;
const STATION_HIT = 27;

// Where every terminus stub sits. Loops have no ends, so they have no nubs and
// cannot be extended — you unwrap the loop first, which is the honest cost of
// having closed it.
export function nubs(net, world) {
  const out = [];
  for (const line of net.lines) {
    if (line.loop || line.stations.length < 2) continue;
    for (const atHead of [true, false]) {
      const endId = atHead ? line.head : line.tail;
      const end = world.station(endId);
      const seg = atHead ? line.segs[0] : line.segs[line.segs.length - 1];
      if (!end || !seg) continue;
      // the stub points away along the last piece of track drawn into the stop
      const pts = seg.pts;
      const [a, b] = atHead ? [pts[1], pts[0]] : [pts[pts.length - 2], pts[pts.length - 1]];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const r = (end.special ? INK.specialR : INK.stationR) + NUB_GAP;
      out.push({ line, atHead, x: end.x + (dx / len) * r, y: end.y + (dy / len) * r });
    }
  }
  return out;
}

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

  at(e) { return this.r.toBoard(e.clientX, e.clientY); }

  down(e) {
    if (this.game.state !== 'play') return;
    const p = this.at(e);

    for (const n of nubs(this.game.net, this.game.world)) {
      if (Math.hypot(n.x - p.x, n.y - p.y) < NUB_HIT) {
        this.drag = { mode: 'extend', line: n.line, atHead: n.atHead, colour: n.line.colour, p };
        this.canvas.setPointerCapture?.(e.pointerId);
        return;
      }
    }

    const st = this.game.world.hitStation(p.x, p.y, STATION_HIT);
    if (st) {
      this.drag = { mode: 'new', anchorId: st.id, colour: this.game.net.freeColour(), p };
      this.canvas.setPointerCapture?.(e.pointerId);
    }
  }

  move(e) {
    const p = this.at(e);
    const st = this.game.world.hitStation(p.x, p.y, STATION_HIT);
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
    // the undo lives in the same gesture as the do
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

  up() {
    this.drag = null;
  }

  fail(msg) {
    if (this._lastFail === msg && performance.now() - (this._failAt || 0) < 1200) return;
    this._lastFail = msg;
    this._failAt = performance.now();
    this.onMessage(msg);
  }

  // What the renderer draws as the dashed reach from the live end to the finger.
  view() {
    const out = { hover: this.hover };
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
