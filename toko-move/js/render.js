// The board, drawn.
//
// House rules, all of them about restraint: flat fills only, no gradient, no
// shadow, no blur. A transit diagram is printed matter and printed matter has
// exactly two depths — paper and ink. Everything that looks like depth here is
// really just overlap order.

import { PAL, INK } from './palette.js?v=2';
import { BOARD } from './world.js?v=2';
import { drawShape, tracePath } from './shapes.js?v=2';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1; this.ox = 0; this.oy = 0;
    this.grain = null;
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    // letterbox: the board keeps its proportions whatever shape the window is
    this.scale = Math.min(w / BOARD.w, h / BOARD.h);
    this.ox = (w - BOARD.w * this.scale) / 2;
    this.oy = (h - BOARD.h * this.scale) / 2;
  }

  // Screen → board. Every hit test in the game goes through this, so a wrong
  // letterbox shows up as taps landing in the wrong place rather than silently.
  toBoard(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - this.ox) / this.scale,
      y: (clientY - r.top - this.oy) / this.scale,
    };
  }

  draw(game, view = {}) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = PAL.paper;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.ox, this.oy);
    ctx.scale(this.scale, this.scale);

    this.water(game.world);
    this.grainWash(ctx);

    for (const line of game.net.lines) this.line(line);
    if (view.drag) this.ghost(view.drag);
    for (const line of game.net.lines) for (const t of line.trains) this.train(t, line);
    for (const st of game.world.stations) this.station(st, view);

    ctx.restore();
  }

  water(world) {
    const ctx = this.ctx;
    for (const ring of world.rings) {
      ctx.beginPath();
      ctx.moveTo(ring[0].x, ring[0].y);
      for (let i = 1; i < ring.length; i++) ctx.lineTo(ring[i].x, ring[i].y);
      ctx.closePath();
      ctx.fillStyle = PAL.water;
      ctx.fill();
      ctx.strokeStyle = PAL.waterEdge;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // A tooth of paper texture, tiled. Built once — a per-pixel wash every frame
  // is the kind of cost that only shows up on somebody else's phone.
  grainWash(ctx) {
    if (!this.grain) {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const g = c.getContext('2d');
      g.fillStyle = PAL.grain;
      for (let i = 0; i < 420; i++) {
        g.fillRect(Math.random() * 96 | 0, Math.random() * 96 | 0, 1, 1);
      }
      this.grain = ctx.createPattern(c, 'repeat');
    }
    ctx.fillStyle = this.grain;
    ctx.fillRect(0, 0, BOARD.w, BOARD.h);
  }

  line(line) {
    const ctx = this.ctx;
    const colour = PAL.lines[line.colour];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colour;
    ctx.lineWidth = INK.line;
    for (const seg of line.segs) {
      ctx.beginPath();
      ctx.moveTo(seg.pts[0].x, seg.pts[0].y);
      for (let i = 1; i < seg.pts.length; i++) ctx.lineTo(seg.pts[i].x, seg.pts[i].y);
      ctx.stroke();
    }
    // the tunnel notches, on top of the line they belong to
    ctx.strokeStyle = PAL.paper;
    ctx.lineWidth = 2.4;
    for (const seg of line.segs) {
      for (const g of seg.gatesDraw || seg.gates) {
        const nx = -Math.sin(g.ang), ny = Math.cos(g.ang);
        ctx.beginPath();
        ctx.moveTo(g.x - nx * INK.line * 0.62, g.y - ny * INK.line * 0.62);
        ctx.lineTo(g.x + nx * INK.line * 0.62, g.y + ny * INK.line * 0.62);
        ctx.stroke();
      }
    }
  }

  ghost(drag) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = PAL.lines[drag.colour];
    ctx.lineWidth = INK.line;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([2, INK.line * 1.9]);
    ctx.beginPath();
    ctx.moveTo(drag.pts[0].x, drag.pts[0].y);
    for (let i = 1; i < drag.pts.length; i++) ctx.lineTo(drag.pts[i].x, drag.pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  train(train, line) {
    const ctx = this.ctx;
    const p = train.pos();
    const colour = PAL.lines[line.colour];
    const w = 18.5, unit = 24, gap = 3.8;
    const total = unit * (1 + train.cars) + gap * train.cars;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    let x = total / 2;
    for (let i = 0; i <= train.cars; i++) {
      roundRect(ctx, x - unit, -w / 2, unit, w, 4);
      // paper casing first: a train is the same colour as its own line, and
      // without a gap around it there is nothing to see it against
      ctx.strokeStyle = PAL.paper;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      x -= unit + gap;
    }
    // who is aboard, as pale pips along the roof — the only way to see a full
    // train from across the board
    ctx.rotate(-p.ang);
    const n = Math.min(train.load.length, 8);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 8.6;
      drawShape(ctx, train.load[i], off, -w / 2 - 8, 3.4, PAL.station, PAL.ink, 1.2);
    }
    ctx.restore();
  }

  station(st, view) {
    const ctx = this.ctx;
    const r = st.special ? INK.specialR : INK.stationR;

    // the crowding clock: a ring closing round the stop. It is drawn OUTSIDE
    // the shape so a full platform never obscures the shape you need to read.
    if (st.over > 0.001) {
      // a gauge needs its empty half drawn too, or a arc on its own reads as a
      // stray mark growing out of the stop rather than as something filling up
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(st.x, st.y, r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.rule;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(st.x, st.y, r + 8, -Math.PI / 2, -Math.PI / 2 + st.over * Math.PI * 2);
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    if (view.hover === st.id || view.anchor === st.id) {
      ctx.beginPath();
      ctx.arc(st.x, st.y, r + 11, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.ink;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    drawShape(ctx, st.kind, st.x, st.y, r, PAL.station, PAL.ink, INK.station);
    this.queue(st, r);
  }

  // The platform. Three to a row, growing away from the stop; past capacity it
  // simply keeps growing, which is the warning — a stop in trouble looks
  // physically bigger than its neighbours before the ring is anywhere near full.
  queue(st, r) {
    const ctx = this.ctx;
    const n = Math.min(st.waiting.length, 15);
    const cell = 12.5;
    for (let i = 0; i < n; i++) {
      const col = i % 3, row = (i / 3) | 0;
      const x = st.x + r + 13 + col * cell;   // clear of the crowding ring
      const y = st.y - r + row * cell + 3;
      // Every waiting shape is drawn the same. Filling the ones past capacity
      // was tried and a solid star reads as a DIFFERENT destination from a
      // hollow one — the queue getting longer and the gauge closing already say
      // it, and neither of them lies about what somebody wants.
      drawShape(ctx, st.waiting[i], x, y, 4.4, PAL.station, PAL.ink, 1.35);
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
