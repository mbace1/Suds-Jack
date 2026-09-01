// Lines, the trains on them, and the one piece of cleverness in the game:
// how a passenger decides whether to get on.
//
// There is no pathfinding per passenger and there must not be — thirty stops
// and three hundred people would re-solve the same graph three hundred times a
// second. Instead the NETWORK is solved once whenever it changes: for every
// shape, a breadth-first sweep out from every stop of that shape gives each
// stop a hop count. After that a passenger's whole decision is a comparison of
// two numbers, which is also why the behaviour is legible — somebody boards if
// the next stop is closer to their shape than this one, and gets off when it
// is not. Riding past your transfer is impossible by construction.

import { legPoints, measure, polyLength, crossings, waterGates, chordNormal, offsetPoints, posOn } from './geometry.js?v=14';
import { PAL, INK } from './palette.js?v=14';

export const TRAIN_SPEED = 108;      // board units per second
export const CAR_CAPACITY = 6;
const DWELL_BASE = 0.32;
const DWELL_PER = 0.055;

let trainSeq = 0;

export class Train {
  constructor(line) {
    this.id = trainSeq++;
    this.line = line;
    this.segIdx = 0;
    this.p = 0;            // 0…1 from the seg's `a` end, whichever way we face
    this.dir = 1;
    this.cars = 0;         // extra carriages behind the locomotive
    this.load = [];        // goal shapes riding
    this.dwell = 0;
  }

  get capacity() { return CAR_CAPACITY * (1 + this.cars); }

  // Which stop this train reaches next. Boarding is decided entirely against
  // this, which is what makes direction matter without anybody reasoning about
  // direction.
  nextStopId() {
    const L = this.line;
    if (!L.segCount()) return null;
    const [a, b] = L.segStations(this.segIdx);
    return this.dir > 0 ? b : a;
  }

  // Move, and report the index of the stop just reached (or -1 for none).
  move(dt, speed) {
    const L = this.line;
    if (!L.segCount()) return -1;
    if (this.dwell > 0) { this.dwell -= dt; return -1; }

    const seg = L.segs[this.segIdx];
    const len = Math.max(1, seg.len);
    this.p += (this.dir * speed * dt) / len;

    const n = L.stations.length;
    if (this.dir > 0 && this.p >= 1) {
      const arrived = L.loop ? (this.segIdx + 1) % n : this.segIdx + 1;
      if (!L.loop && arrived >= n - 1) { this.dir = -1; this.segIdx = n - 2; this.p = 1; }
      else { this.segIdx = L.loop ? (this.segIdx + 1) % L.segCount() : arrived; this.p = 0; }
      return arrived;
    }
    if (this.dir < 0 && this.p <= 0) {
      const arrived = this.segIdx;
      if (arrived <= 0) { this.dir = 1; this.segIdx = 0; this.p = 0; }
      else { this.segIdx = arrived - 1; this.p = 1; }
      return arrived;
    }
    return -1;
  }

  hold(exchanged) { this.dwell = DWELL_BASE + Math.min(0.5, exchanged * DWELL_PER); }

  pos() {
    const L = this.line;
    if (!L.segCount()) {
      const s = L.world.station(L.stations[0]);
      return { x: s.x, y: s.y, ang: 0 };
    }
    const seg = L.segs[this.segIdx];
    if (!seg) {                       // never expected; never worth a crash
      const s = L.world.station(L.stations[0]);
      return { x: s.x, y: s.y, ang: 0 };
    }
    return posOn(seg.pts, seg.cum, this.p * seg.len);
  }
}

export class Line {
  // `router` is the one hook that lets a bus route be a line. A metro leg is a
  // straight run with one bend (`legPoints`); a bus leg has to follow the
  // street, which is a polyline the road grid works out. Everything downstream
  // — dwell, boarding, the offset when two lines share a leg, `Train.move` —
  // only ever asks a seg for `pts`/`cum`/`len`, so handing it a different
  // polyline is the whole of the difference.
  constructor(id, colour, world, router = null) {
    this.id = id;
    this.colour = colour;
    this.world = world;
    this.router = router;
    this.net = null;               // set by the Network that opened it
    this.stations = [];
    this.loop = false;
    this.segs = [];
    this.trains = [];
  }

  // A leg whose street has been lifted out from under it. The seg stays (the
  // indices are the line's topology and dropping one would shuffle every stop
  // after it) but it is marked, drawn as broken, and the vehicles hold.
  get broken() { return this.segs.some(s => s.road === false); }

  segCount() {
    const n = this.stations.length;
    if (n < 2) return 0;
    return this.loop ? n : n - 1;
  }

  segStations(i) {
    const n = this.stations.length;
    return [this.stations[i], this.stations[(i + 1) % n]];
  }

  has(id) { return this.stations.includes(id); }
  get head() { return this.stations[0]; }
  get tail() { return this.stations[this.stations.length - 1]; }
  isEnd(id) { return !this.loop && (this.head === id || this.tail === id); }

  // Geometry is rebuilt wholesale rather than patched. It is a handful of legs
  // and it happens only when the player changes something, and a patched cache
  // that disagrees with the topology is the bug that never reproduces.
  rebuild() {
    this.segs = [];
    for (let i = 0; i < this.segCount(); i++) {
      const [aId, bId] = this.segStations(i);
      const a = this.world.station(aId), b = this.world.station(bId);
      if (!a || !b) continue;
      const routed = this.router ? this.router(a, b) : null;
      const pts = routed ?? legPoints(a, b);
      this.segs.push({
        a: aId, b: bId, raw: pts, pts,
        // null on a line with no router — this leg is not ABOUT a street.
        // false means it wanted one and there is none.
        road: this.router ? routed !== null : null,
        cum: measure(pts), len: polyLength(pts),
        cross: crossings(pts, this.world.rings),
        gates: waterGates(pts, this.world.rings),
        shift: 0,
      });
    }

    // A line that gets shorter has to bring its trains back with it. Pulling a
    // stop off while a train was out on that last leg left the train pointing
    // at a leg that no longer existed, and the very next frame read `pts` off
    // undefined and took the whole renderer down. It survived every gate
    // because the tests retract lines that are standing still.
    const last = this.segCount() - 1;
    for (const t of this.trains) {
      if (t.segIdx > last) {
        t.segIdx = Math.max(0, last);
        t.p = 1;          // set down at the new terminus…
        t.dir = -1;       // …facing back down what is left of the line
      }
    }
  }

  tunnels() { return this.segs.reduce((n, s) => n + s.cross, 0); }

  // ── where the vehicles are, as one number ─────────────────────────────
  // Distance along the line from its head end, which is the only frame in
  // which "are these two on top of each other" is answerable. `segIdx` + `p`
  // cannot be compared across segs of different lengths.
  length() { return this.segs.reduce((n, s) => n + s.len, 0); }

  alongOf(train) {
    let d = 0;
    for (let i = 0; i < train.segIdx; i++) d += this.segs[i]?.len ?? 0;
    return d + (this.segs[train.segIdx]?.len ?? 0) * train.p;
  }

  placeAlong(train, d) {
    let rest = Math.max(0, d);
    for (let i = 0; i < this.segs.length; i++) {
      const len = this.segs[i].len || 1;
      if (rest <= len || i === this.segs.length - 1) {
        train.segIdx = i;
        train.p = Math.max(0, Math.min(1, rest / len));
        return;
      }
      rest -= len;
    }
  }

  // Put a NEWLY ADDED vehicle in the biggest gap between the ones already out.
  //
  // Every vehicle was constructed at seg 0, p 0, dir 1 — so a second train on a
  // line rode inside the first one forever, and only the dwell (which differs
  // only if they exchange different numbers of passengers) could ever pull
  // them apart. It measured as a flat line: fourteen buses on one route carried
  // the same as three, because thirteen of them were standing in the first
  // one's shadow with nothing left to pick up. The bug is the metro layer's
  // too, and always was — it is just cheaper to see when the vehicles are slow.
  spaceIn(train) {
    const L = this.length();
    if (!L || this.trains.length <= 1) return;
    const others = this.trains.filter(t => t !== train).map(t => this.alongOf(t)).sort((a, b) => a - b);
    if (!others.length) return;
    let best = 0, widest = -1;
    // a line has two ends and they count as edges of the first and last gap; a
    // loop has none, so the gap from the last one round to the first is real
    const marks = this.loop ? others : [0, ...others, L];
    for (let i = 0; i < marks.length - 1; i++) {
      const gap = marks[i + 1] - marks[i];
      if (gap > widest) { widest = gap; best = marks[i] + gap / 2; }
    }
    if (this.loop) {
      const wrap = L - others[others.length - 1] + others[0];
      if (wrap > widest) { widest = wrap; best = (others[others.length - 1] + wrap / 2) % L; }
    }
    this.placeAlong(train, best);
  }
}

// Seven, because that is how many line colours the palette can keep apart.
// A cap that is not tied to the thing that actually limits it drifts.
export const MAX_LINES = PAL.lines.length;

// Where every terminus stub sits, in board units. Lives here rather than in
// input.js because it is a fact about the network's shape, and BOTH the
// renderer and the input layer need it — a renderer reaching into the input
// layer to find out where to draw would be backwards.
//
// `gap` is passed in rather than fixed, because how far the nub stands off the
// stop is a screen measurement (see TOUCH in palette.js) and this file has no
// business knowing the zoom.
export function nubs(net, world, gap, sizes = INK) {
  const out = [];
  for (const line of net.lines) {
    if (line.loop || line.stations.length < 2) continue;
    for (const atHead of [true, false]) {
      const endId = atHead ? line.head : line.tail;
      const end = world.station(endId);
      const seg = atHead ? line.segs[0] : line.segs[line.segs.length - 1];
      if (!end || !seg) continue;
      const pts = seg.pts;
      const [a, b] = atHead ? [pts[1], pts[0]] : [pts[pts.length - 2], pts[pts.length - 1]];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const r = (end.special ? sizes.specialR : sizes.stationR) + gap;
      out.push({ line, atHead, x: end.x + (dx / len) * r, y: end.y + (dy / len) * r });
    }
  }
  return out;
}

export class Network {
  // `layer` is the name a passenger's booking is checked against — see
  // `Passenger.layer`. It is a field rather than a hard-coded 'metro' because
  // the bus network is this class with a router on its lines.
  layer = 'metro';

  constructor(world, resources = {}) {
    this.world = world;
    this.lines = [];
    this.maxLines = resources.lines ?? 3;
    this.spareTrains = resources.trains ?? 3;
    this.ownedTunnels = resources.tunnels ?? 2;
    this.hops = new Map();     // shape → Map(stationId → hop count)
    this.seq = 0;
  }

  get usedColours() { return new Set(this.lines.map(l => l.colour)); }

  freeColour() {
    const used = this.usedColours;
    for (let i = 0; i < PAL.lines.length; i++) if (!used.has(i)) return i;
    return 0;
  }

  canOpenLine() { return this.lines.length < this.maxLines; }

  tunnelsUsed() { return this.lines.reduce((n, l) => n + l.tunnels(), 0); }
  tunnelsLeft() { return this.ownedTunnels - this.tunnelsUsed(); }

  // Would this leg be refused, and why — WITHOUT drawing it. PLAYTEST.md §3.4:
  // the tunnel rule was only ever met by being refused after the attempt, which
  // teaches the rule at the cost of the move. A drag can ask this about the
  // stop under the finger before it gets there, and the board can mark it.
  //
  // Non-mutating on purpose. `extend()` builds the line, measures it and rolls
  // back on failure, which is fine when a person committed to the move and
  // wrong sixty times a second.
  wouldCost(fromId, toId) {
    const a = this.world.station(fromId), b = this.world.station(toId);
    if (!a || !b) return { cross: 0, refused: null };
    const cross = crossings(legPoints(a, b), this.world.rings);
    return {
      cross,
      refused: cross > this.tunnelsLeft() ? 'needs a tunnel' : null,
    };
  }

  lineAt(id) { return this.lines.find(l => l.id === id); }

  // Every line that ends at this stop — the ones a drag from here would extend.
  endsAt(stationId) { return this.lines.filter(l => l.isEnd(stationId)); }
  linesAt(stationId) { return this.lines.filter(l => l.has(stationId)); }

  // Subclasses hand back a differently-wired Line; everything else about
  // opening one is the same.
  makeLine() { return new Line(this.seq++, this.freeColour(), this.world); }

  open(aId, bId) {
    if (!this.canOpenLine()) return { error: 'no line left' };
    const line = this.makeLine();
    line.net = this;
    line.stations = [aId, bId];
    line.rebuild();
    const bad = this.refuse(line, true);
    if (bad) return { error: bad };
    this.lines.push(line);
    // through `addTrain`, not a bare `new Train`, or a bus route opens with a
    // train on it — same object, six seats instead of eight
    this.addTrain(line);
    this.rebuild();
    return { line };
  }

  // Adding to an end. A drag onto the line's OTHER end closes the loop, which
  // is the only way a loop is ever made — there is no separate control for it.
  extend(line, stationId, atHead) {
    if (line.has(stationId)) {
      const other = atHead ? line.tail : line.head;
      if (stationId === other && line.stations.length >= 3 && !line.loop) {
        line.loop = true;
        line.rebuild();
        const bad = this.refuse(line);
        if (bad) { line.loop = false; line.rebuild(); return { error: bad }; }
        this.rebuild();
        return { line };
      }
      return { error: 'already on this line' };
    }
    const before = line.stations.slice();
    if (atHead) line.stations.unshift(stationId); else line.stations.push(stationId);
    line.rebuild();
    const bad = this.refuse(line);
    if (bad) {
      line.stations = before; line.rebuild();
      return { error: bad };
    }
    this.rebuild();
    return { line };
  }

  overTunnel() { return this.tunnelsUsed() > this.ownedTunnels; }

  // Why this line cannot stand as drawn, or null. ONE place, because `open`
  // and `extend` and closing a loop all roll back on the same answer — and
  // because the bus network's reason is a different reason entirely (no
  // street), not a different number of tunnels.
  //
  // `pending` says the line is not in `this.lines` yet, so its own cost has to
  // be added rather than already counted.
  refuse(line, pending = false) {
    const used = this.tunnelsUsed() + (pending ? line.tunnels() : 0);
    return used > this.ownedTunnels ? 'needs a tunnel' : null;
  }

  // Pulling an end back in. A line reduced below two stops stops existing and
  // hands back its colour and its trains — tearing up a bad line has to be as
  // cheap as drawing one or you stop experimenting.
  retract(line, atHead) {
    if (line.loop) { line.loop = false; line.rebuild(); this.rebuild(); return { line }; }
    if (atHead) line.stations.shift(); else line.stations.pop();
    if (line.stations.length < 2) return this.remove(line);
    line.rebuild();
    this.rebuild();
    return { line };
  }

  remove(line) {
    const i = this.lines.indexOf(line);
    if (i < 0) return { removed: false };
    this.spareTrains += line.trains.length;
    this.lines.splice(i, 1);
    this.rebuild();
    return { removed: true };
  }

  addTrain(line) {
    if (this.spareTrains <= 0) return false;
    this.spareTrains--;
    const t = new Train(line);
    line.trains.push(t);
    line.spaceIn(t);
    return true;
  }

  addCarriage(line) {
    if (!line.trains.length) return false;
    // onto the shortest train, so carriages spread instead of stacking on one
    const t = line.trains.reduce((a, b) => (b.cars < a.cars ? b : a));
    t.cars++;
    return true;
  }

  // ── the solve ─────────────────────────────────────────────────────────
  rebuild() {
    for (const l of this.lines) l.rebuild();
    this.layout();
    this.solve();
  }

  // Two lines down the same leg must not be drawn on top of each other. Each
  // leg's users are pushed sideways off the CHORD normal — using the chord and
  // not each piece's own normal keeps the offset copy the same shape, so the
  // bends stay parallel instead of splaying.
  layout() {
    const share = new Map();
    for (const l of this.lines) {
      for (const s of l.segs) {
        const key = s.a < s.b ? `${s.a}:${s.b}` : `${s.b}:${s.a}`;
        if (!share.has(key)) share.set(key, []);
        share.get(key).push({ line: l, seg: s });
      }
    }
    for (const users of share.values()) {
      users.sort((p, q) => p.line.id - q.line.id);
      const n = users.length;
      users.forEach(({ seg }, i) => {
        seg.shift = (i - (n - 1) / 2) * INK.lineGap;
        if (!seg.shift) {
          seg.pts = seg.raw;
          seg.gatesDraw = seg.gates;
        } else {
          const nrm = chordNormal(seg.raw[0], seg.raw[seg.raw.length - 1]);
          seg.pts = offsetPoints(seg.raw, nrm, seg.shift);
          // the notches ride along with the line they mark, or a shared leg
          // leaves its tunnel marks stranded over open water
          seg.gatesDraw = seg.gates.map(g => ({
            x: g.x + nrm.x * seg.shift, y: g.y + nrm.y * seg.shift, ang: g.ang,
          }));
        }
        seg.cum = measure(seg.pts);
        seg.len = polyLength(seg.pts);
      });
    }
  }

  // Which stops are one hop apart on some line.
  adjacency() {
    const adj = new Map();
    const link = (a, b) => {
      if (!adj.has(a)) adj.set(a, new Set());
      adj.get(a).add(b);
    };
    for (const l of this.lines) {
      for (let i = 0; i < l.segCount(); i++) {
        const [a, b] = l.segStations(i);
        link(a, b); link(b, a);
      }
    }
    return adj;
  }

  solve() {
    const adj = this.adjacency();
    this.hops = new Map();
    for (const shape of this.world.shapesPresent()) {
      const d = new Map();
      const queue = [];
      for (const s of this.world.stations) if (s.kind === shape) { d.set(s.id, 0); queue.push(s.id); }
      for (let i = 0; i < queue.length; i++) {
        const cur = queue[i], base = d.get(cur);
        for (const nb of adj.get(cur) || []) {
          if (!d.has(nb)) { d.set(nb, base + 1); queue.push(nb); }
        }
      }
      this.hops.set(shape, d);
    }
  }

  // Hops from a stop to the nearest stop of `shape`; Infinity when there is no
  // route at all, which is how a passenger decides to just keep waiting.
  hopsFrom(stationId, shape) {
    const d = this.hops.get(shape);
    if (!d) return Infinity;
    const v = d.get(stationId);
    return v === undefined ? Infinity : v;
  }
}
