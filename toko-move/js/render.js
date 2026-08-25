// The board, drawn.
//
// House rules, all of them about restraint: flat fills only, no gradient, no
// shadow, no blur. A transit diagram is printed matter and printed matter has
// exactly two depths — paper and ink. Everything that looks like depth here is
// really just overlap order.

import { PAL, INK, sizeAt } from './palette.js?v=12';
import { BOARD } from './world.js?v=12';
import { CELL } from './roads.js?v=12';
import { drawShape, tracePath } from './shapes.js?v=12';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1; this.ox = 0; this.oy = 0;
    this.grain = null;
    // the board size is the MISSION's now, not a constant — a later layer at a
    // different scale wants a different rectangle
    this.bw = BOARD.w; this.bh = BOARD.h;
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
    this.scale = Math.min(w / this.bw, h / this.bh);
    this.ox = (w - this.bw * this.scale) / 2;
    this.oy = (h - this.bh * this.scale) / 2;
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
    if (game.world.w !== this.bw || game.world.h !== this.bh) {
      this.bw = game.world.w; this.bh = game.world.h;
      this.grain = null;
      this.resize();
    }
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = PAL.paper;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.ox, this.oy);
    ctx.scale(this.scale, this.scale);

    this.water(game.world);
    this.grainWash(ctx);

    // BOTH layers when the mission runs both, and the one you are not drawing
    // on goes quiet rather than away. Hiding it would make the switch a change
    // of board; dimming it keeps one city with two ways through it, which is
    // the whole claim of the mission type.
    const two = (game.layers?.length ?? 1) > 1;
    const dim = (on, draw) => {
      if (!two || on === game.layer) { draw(); return; }
      ctx.save();
      ctx.globalAlpha = 0.34;
      draw();
      ctx.restore();
    };

    if (game.roads) dim('roads', () => this.roads(game.roads, view));
    // Bus routes go on ABOVE the road slab and BELOW the metro: they are paint
    // on a street, and a metro line crossing one passes over it.
    if (game.bus) dim('bus', () => { for (const line of game.bus.lines) this.busRoute(line); });
    dim('metro', () => { for (const line of game.net.lines) this.line(line); });
    if (view.nubs) this.nubs(view.nubs, view.nubR);
    if (view.drag) this.ghost(view.drag);
    if (game.roads) dim('roads', () => this.cars(game.roads));
    if (game.bus) dim('bus', () => {
      for (const line of game.bus.lines) for (const b of line.trains) this.bus(b, line, game.bus);
    });
    if (game.layers?.includes('metro') ?? true) {
      dim('metro', () => { for (const line of game.net.lines) for (const t of line.trains) this.train(t, line); });
    }
    const sizes = sizeAt(this.scale);
    for (const st of game.world.stations) this.station(st, view, sizes);

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
    ctx.fillRect(0, 0, this.bw, this.bh);
  }

  // ── the car layer ─────────────────────────────────────────────────────
  // Road is drawn as GROUND, not as a line: a flat slab a square at a time,
  // with the seams left in. It has to read as something you laid rather than
  // something you routed, because that is the difference between this layer
  // and the one above it.
  roads(net, view) {
    const ctx = this.ctx;
    ctx.fillStyle = PAL.road;
    for (const k of net.cells) {
      const [cx, cy] = k.split(',').map(Number);
      ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    }
    // A bridge gets parapets, because a square of road out over the water is the
    // expensive one and should look like it. They run ALONG the traffic, which
    // is the whole point and was got wrong first: drawn on the top and bottom
    // edge whatever the direction, a bridge heading north-south came out as a
    // ladder of rungs across the road rather than a rail down each side of it.
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const k of net.spanned) {
      const [cx, cy] = k.split(',').map(Number);
      const x = cx * CELL, y = cy * CELL;
      const across = net.cells.has(`${cx - 1},${cy}`) || net.cells.has(`${cx + 1},${cy}`);
      const down = net.cells.has(`${cx},${cy - 1}`) || net.cells.has(`${cx},${cy + 1}`);
      // a lone span with nothing either side gets both, which is honest: it is
      // a stub of bridge and looks like one
      if (across || !down) { ctx.moveTo(x, y); ctx.lineTo(x + CELL, y); ctx.moveTo(x, y + CELL); ctx.lineTo(x + CELL, y + CELL); }
      if (down || !across) { ctx.moveTo(x, y); ctx.lineTo(x, y + CELL); ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL); }
    }
    ctx.stroke();
    // the seam between squares, so a wide road reads as several and not as a slab
    ctx.strokeStyle = PAL.roadSeam;
    ctx.lineWidth = 1;
    for (const k of net.cells) {
      const [cx, cy] = k.split(',').map(Number);
      ctx.strokeRect(cx * CELL + 0.5, cy * CELL + 0.5, CELL - 1, CELL - 1);
    }

    // …and the centre stripe, drawn along every join between two squares. This
    // is the whole difference between a laid slab and a STREET: the slab said
    // "some ground is grey", the stripe says "traffic goes this way", and it
    // costs one dashed line per neighbour rather than a second geometry.
    ctx.save();
    ctx.strokeStyle = PAL.roadLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    for (const k of net.cells) {
      const [cx, cy] = k.split(',').map(Number);
      const mx = cx * CELL + CELL / 2, my = cy * CELL + CELL / 2;
      // only forward, so a join is not stroked twice
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        if (!net.cells.has(`${cx + dx},${cy + dy}`)) continue;
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + dx * CELL, my + dy * CELL);
      }
    }
    ctx.stroke();
    ctx.restore();
    // where the finger is about to put one
    if (view.paint) {
      ctx.fillStyle = view.paint.erase ? PAL.warn : PAL.road;
      ctx.globalAlpha = 0.45;
      for (const k of view.paint.cells) {
        const [cx, cy] = k.split(',').map(Number);
        ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
      }
      ctx.globalAlpha = 1;
    }
  }

  cars(net) {
    const ctx = this.ctx;
    const w = Math.max(7, 9 / this.scale), l = Math.max(10, 13 / this.scale);
    for (const car of net.cars) {
      const p = net.posOf(car);
      // A load rides in a VAN: half again as long, with the cab cut off the
      // front by one line. It is the same vehicle in every other respect (see
      // `Car.van`) — the silhouette is there so you can find the load on a
      // street full of traffic without a label following it around.
      const len = car.van ? l * 1.5 : l;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang);
      roundRect(ctx, -len / 2, -w / 2, len, w, Math.min(3, w / 3));
      ctx.fillStyle = PAL.paper;
      ctx.fill();
      ctx.strokeStyle = car.van ? PAL.warn : PAL.ink;
      ctx.lineWidth = Math.max(1.2, (car.van ? 2 : 1.6) / this.scale);
      ctx.stroke();
      if (car.van) {
        const cab = len / 2 - l * 0.42;
        ctx.beginPath();
        ctx.moveTo(cab, -w / 2);
        ctx.lineTo(cab, w / 2);
        ctx.stroke();
      }
      ctx.restore();
      // what it is carrying, so a car is not an anonymous dot
      drawShape(ctx, car.p.goal, p.x, p.y, Math.max(2.6, 3.4 / this.scale), PAL.ink, null, 0);
    }
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

  // ── the bus layer ─────────────────────────────────────────────────────
  // A bus route must not read as a metro line. It is the same object — a line
  // with stops and vehicles — so telling them apart is the renderer's whole
  // job here, and it is done the way the real things differ: a metro line is
  // its own right of way, drawn heavy and straight; a route is PAINT ON A
  // STREET, drawn thin, following every turn the road takes, with a pale
  // casing under it so it lifts off the slab it is lying on.
  busRoute(line) {
    const ctx = this.ctx;
    const colour = PAL.lines[line.colour];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const seg of line.segs) {
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(seg.pts[0].x, seg.pts[0].y);
        for (let i = 1; i < seg.pts.length; i++) ctx.lineTo(seg.pts[i].x, seg.pts[i].y);
      };
      // the casing first, so the route reads on grey road AND on pale ground
      ctx.setLineDash([]);
      ctx.strokeStyle = PAL.paper;
      ctx.lineWidth = INK.line * 0.78;
      path();
      ctx.stroke();

      // A leg whose street was lifted out from under it. Drawn as the break it
      // is — nothing runs on this route until you put the road back — because
      // a route that silently stops is a bug report rather than a decision.
      if (seg.road === false) {
        ctx.strokeStyle = PAL.warn;
        ctx.setLineDash([INK.line * 0.5, INK.line * 0.9]);
      } else {
        ctx.strokeStyle = colour;
        ctx.setLineDash([]);
      }
      ctx.lineWidth = INK.line * 0.46;
      path();
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  bus(bus, line, net) {
    const ctx = this.ctx;
    const p = bus.pos();
    const colour = PAL.lines[line.colour];
    const l = 27, w = 13;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    roundRect(ctx, -l / 2, -w / 2, l, w, 3.4);
    ctx.fillStyle = colour;
    ctx.fill();
    // AN OUTLINE, and it is not decoration. Filled in the route's own colour
    // and standing on that route, a bus read as a swelling of the line rather
    // than a vehicle on it — visible in a screenshot, invisible to every state
    // assertion. The ink edge is what separates the thing that moves from the
    // thing it moves along; it is the same trick the cars already use against
    // the road slab.
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // one pale band down the side: a window strip is what makes a long box a
    // bus rather than a lorry, and it is the only detail there is room for
    ctx.fillStyle = PAL.paper;
    ctx.fillRect(-l / 2 + 3.6, -w / 2 + 2.8, l - 10.2, 2.4);
    ctx.restore();
    // Stuck in traffic, said on the vehicle rather than only in the readout —
    // the whole point of putting buses on the car layer's streets is that you
    // can SEE why the route is slow. Ringed in paper and sitting ON the bus:
    // a bare dot floating above it read as a stray mark rather than a badge.
    if (net?.paceOf(bus) < 1) {
      ctx.beginPath();
      ctx.arc(p.x, p.y - w * 0.62, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = PAL.warn;
      ctx.fill();
      ctx.strokeStyle = PAL.paper;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  // The grab handle at each terminus. It was an invisible hotspot until
  // somebody asked how to delete a line — a gesture with nothing to aim at is a
  // gesture nobody finds. Drawn on top of the track, with a paper gap so it
  // reads as a separate thing to take hold of rather than a blob on the end.
  nubs(list, r) {
    const ctx = this.ctx;
    for (const n of list) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = PAL.paper;
      ctx.fill();
      ctx.strokeStyle = PAL.lines[n.line.colour];
      ctx.lineWidth = Math.max(2, r * 0.45);
      ctx.stroke();
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
      drawShape(ctx, train.load[i].goal, off, -w / 2 - 8, 3.4, PAL.station, PAL.ink, 1.2);
    }
    ctx.restore();
  }

  station(st, view, sizes) {
    const ctx = this.ctx;
    const r = st.special ? sizes.specialR : sizes.stationR;

    // the crowding clock: a ring closing round the stop. It is drawn OUTSIDE
    // the shape so a full platform never obscures the shape you need to read.
    if (st.over > 0.001) {
      // a gauge needs its empty half drawn too, or a arc on its own reads as a
      // stray mark growing out of the stop rather than as something filling up
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(st.x, st.y, r + 7, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.rule;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(st.x, st.y, r + 7, -Math.PI / 2, -Math.PI / 2 + st.over * Math.PI * 2);
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // A stop this drag CANNOT reach — the water is in the way and there is no
    // tunnel left for it. Marked while you are still on your way there, because
    // the alternative is what the game did until now: let you arrive, refuse
    // the move, and teach the rule at the cost of it (PLAYTEST.md §3.4).
    //
    // A dashed ring rather than a solid one, and the SILHOUETTE is untouched —
    // filling a shape to mean something was already tried and thrown away on
    // the stranded mark, because a filled square reads as a different
    // destination rather than as the same one in trouble.
    const barred = view.barred?.has(st.id);
    if (barred) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(st.x, st.y, r + 8, 0, Math.PI * 2);
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = PAL.warn;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    if (view.hover === st.id || view.anchor === st.id) {
      ctx.beginPath();
      ctx.arc(st.x, st.y, r + 11, 0, Math.PI * 2);
      ctx.strokeStyle = barred ? PAL.warn : PAL.ink;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    drawShape(ctx, st.kind, st.x, st.y, r, PAL.station, PAL.ink, INK.station);
    this.queue(st, r, sizes.pipR);

    // THE LOAD. One thing on the board is being followed, and on a board with
    // sixty pips on it a parcel drawn like a passenger is a parcel nobody can
    // find. A ring in the accent colour, outside the shape and outside the
    // crowding gauge, so it never hides either.
    if (st.waiting.some(p => p.parcel)) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(st.x, st.y, r + 15, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.warn;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  // The platform. Three to a row, growing away from the stop; past capacity it
  // simply keeps growing, which is the warning — a stop in trouble looks
  // physically bigger than its neighbours before the ring is anywhere near full.
  queue(st, r, pip) {
    const ctx = this.ctx;
    const n = Math.min(st.waiting.length, 15);
    const cell = pip * 2.85;
    for (let i = 0; i < n; i++) {
      const col = i % 3, row = (i / 3) | 0;
      const x = st.x + r + 13 + col * cell;   // clear of the crowding ring
      const y = st.y - r + row * cell + 3;
      // Capacity is NOT marked on the passenger: filling the ones past capacity
      // was tried and a solid star reads as a different destination from a
      // hollow one. Being unable to GET anywhere is marked, because nothing
      // else on the board says it — the shape is untouched and only the ink
      // goes pale, so what they want is still exactly legible.
      const p = st.waiting[i];
      drawShape(ctx, p.goal, x, y, pip,
        PAL.station, p.stranded ? PAL.stranded : PAL.ink, Math.max(1.1, pip * 0.3));
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
