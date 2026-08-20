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

import { legPoints, measure, polyLength, crossings, waterGates, chordNormal, offsetPoints, posOn } from './geometry.js?v=2';
import { PAL, INK } from './palette.js?v=2';

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
    return posOn(seg.pts, seg.cum, this.p * seg.len);
  }
}

export class Line {
  constructor(id, colour, world) {
    this.id = id;
    this.colour = colour;
    this.world = world;
    this.stations = [];
    this.loop = false;
    this.segs = [];
    this.trains = [];
  }

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
      const pts = legPoints(a, b);
      this.segs.push({
        a: aId, b: bId, raw: pts, pts,
        cum: measure(pts), len: polyLength(pts),
        cross: crossings(pts, this.world.rings),
        gates: waterGates(pts, this.world.rings),
        shift: 0,
      });
    }
  }

  tunnels() { return this.segs.reduce((n, s) => n + s.cross, 0); }
}

export class Network {
  constructor(world) {
    this.world = world;
    this.lines = [];
    this.maxLines = 3;
    this.spareTrains = 3;
    this.ownedTunnels = 2;
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

  lineAt(id) { return this.lines.find(l => l.id === id); }

  // Every line that ends at this stop — the ones a drag from here would extend.
  endsAt(stationId) { return this.lines.filter(l => l.isEnd(stationId)); }
  linesAt(stationId) { return this.lines.filter(l => l.has(stationId)); }

  open(aId, bId) {
    if (!this.canOpenLine()) return { error: 'no line left' };
    const line = new Line(this.seq++, this.freeColour(), this.world);
    line.stations = [aId, bId];
    line.rebuild();
    if (line.tunnels() > this.tunnelsLeft()) return { error: 'needs a tunnel' };
    this.lines.push(line);
    if (this.spareTrains > 0) { this.spareTrains--; line.trains.push(new Train(line)); }
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
        if (this.overTunnel()) { line.loop = false; line.rebuild(); return { error: 'needs a tunnel' }; }
        this.rebuild();
        return { line };
      }
      return { error: 'already on this line' };
    }
    const before = line.stations.slice();
    if (atHead) line.stations.unshift(stationId); else line.stations.push(stationId);
    line.rebuild();
    if (this.overTunnel()) {
      line.stations = before; line.rebuild();
      return { error: 'needs a tunnel' };
    }
    this.rebuild();
    return { line };
  }

  overTunnel() { return this.tunnelsUsed() > this.ownedTunnels; }

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
    line.trains.push(new Train(line));
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
