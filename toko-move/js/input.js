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

import { legPoints } from './geometry.js?v=9';
import { TOUCH, sizeAt } from './palette.js?v=9';
import { nubs } from './lines.js?v=9';

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

  // Which stops this drag CANNOT reach from where it is. Answered before the
  // finger gets there, so the board can say so in advance instead of the game
  // refusing the move after it is made (PLAYTEST.md §3.4).
  barred() {
    if (!this.drag) return null;
    const from = this.drag.mode === 'new'
      ? this.drag.anchorId
      : (this.drag.atHead ? this.drag.line?.head : this.drag.line?.tail);
    if (from == null) return null;
    const out = new Set();
    for (const st of this.game.world.stations) {
      if (st.id === from) continue;
      if (this.game.net.wouldCost(from, st.id).refused) out.add(st.id);
    }
    return out.size ? out : null;
  }

  // What the renderer draws as the dashed reach from the live end to the finger.
  view() {
    const out = { hover: this.hover, nubs: this.nubs(), nubR: TOUCH.nubDrawPx * this.unit,
                  barred: this.barred() };
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

// ── the car layer ───────────────────────────────────────────────────────
// One gesture again, and the verb is decided by the first STEP, not the first
// touch. Deciding it on the touch was tried and it makes extending a road
// impossible: your second drag naturally begins at the end of the first, so it
// read as "erase" and lifted everything you had just laid.
//
//   drag off bare ground        → lay road
//   drag along road you have    → lift it
//   drag from road onto bare    → carry it on
//
// A tap that never moves does nothing at all, so a misplaced finger cannot cost
// you a square. No mode button, nothing to explain.
//
// You lay ground and nothing else here — no car is ever assigned. That is the
// whole difference between this layer and the one above it.

export class RoadDrawer {
  constructor(canvas, renderer, game, opts = {}) {
    this.canvas = canvas;
    this.r = renderer;
    this.game = game;
    this.onMessage = opts.onMessage || (() => {});
    this.onChange = opts.onChange || (() => {});
    this.paint = null;
    this.hover = null;

    this._down = e => this.down(e);
    this._move = e => this.move(e);
    this._up = e => this.up(e);
    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._down);
    this.canvas.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
  }

  get net() { return this.game.roads; }

  cellAt(e) {
    const p = this.r.toBoard(e.clientX, e.clientY);
    return this.net.cellOf(p);
  }

  down(e) {
    if (this.game.state !== 'play' || !this.net) return;
    const { cx, cy } = this.cellAt(e);
    const onRoad = this.net.cells.has(`${cx},${cy}`);
    // starting on bare ground can only mean one thing; starting on road waits
    // to see which way you go
    this.paint = { erase: onRoad ? null : false, cells: new Set(), last: { cx, cy } };
    this.canvas.setPointerCapture?.(e.pointerId);
    if (!onRoad) this.apply(cx, cy);
  }

  move(e) {
    if (!this.net) return;
    const { cx, cy } = this.cellAt(e);
    this.hover = `${cx},${cy}`;
    if (!this.paint) return;
    const last = this.paint.last;
    if (last.cx === cx && last.cy === cy) return;

    // the first step off the starting square is what decides it
    if (this.paint.erase === null) {
      this.paint.erase = this.net.cells.has(`${cx},${cy}`);
      if (this.paint.erase) this.apply(last.cx, last.cy);   // lift the one you began on too
    }

    // fill the gap between samples, or a quick drag lays a dotted line
    const steps = Math.abs(cx - last.cx) + Math.abs(cy - last.cy);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.apply(Math.round(last.cx + (cx - last.cx) * t), Math.round(last.cy + (cy - last.cy) * t));
    }
    this.paint.last = { cx, cy };
  }

  apply(cx, cy) {
    const net = this.net;
    const before = net.cells.size;
    if (this.paint.erase) net.erase(cx, cy);
    else if (!net.build(cx, cy) && net.left() <= 0) this.fail('no road left — lift some from somewhere else');
    if (net.cells.size !== before) this.onChange();
    this.paint.cells.add(`${cx},${cy}`);
  }

  up() { this.paint = null; }

  fail(msg) {
    if (this._lastFail === msg && performance.now() - (this._failAt || 0) < 1200) return;
    this._lastFail = msg;
    this._failAt = performance.now();
    this.onMessage(msg);
  }

  view() {
    return { hover: null, paint: this.paint ? { erase: !!this.paint.erase, cells: [...this.paint.cells] } : null };
  }
}
