// The car layer: roads and the cars that route themselves.
//
// WHY THIS IS NOT THE METRO LAYER WITH DIFFERENT ART. Mini Metro's constraint
// is FREQUENCY — stretching a line lowers how often a train calls anywhere on
// it — and you control the vehicles as well as the track. Mini Motorways'
// constraint is CAPACITY: nobody waits for a departure, cars take up room, and
// room runs out. And you control ONLY the infrastructure; cars pick their own
// way and you cannot tell them otherwise.
//
// So the verb here is *provide room*, not *route people*. If this layer let you
// assign vehicles it would be the metro layer wearing a hat, and two local
// layers that play the same are worse than one. (GENRE.md has the sources.)
//
// What it DOES share is everything about the people: a building is a Station, a
// trip is a Passenger with a destination shape, and "nobody can reach that" and
// "this platform is over capacity" are the same code as upstairs. That is the
// owner's "layers are near-clones differing by variables" made true rather than
// asserted.

export const CELL = 40;              // board units per grid square
export const CELL_CARS = 2;          // a square holds two ABREAST — see `roomIn`
const CAR_SPEED = 34;                // board units per second

const key = (cx, cy) => `${cx},${cy}`;
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class Car {
  constructor(passenger, from, path, to = null) {
    this.p = passenger;              // the same Passenger object the platform held
    this.from = from;                // station id it left
    this.to = to;                    // …and the one it is going to, which a parcel needs
    this.path = path;                // [cellKey, …]
    this.at = 0;                     // index of the cell it is standing in
    this.t = 0;                      // 0…1 across that cell
  }
  get cell() { return this.path[this.at]; }
  get next() { return this.path[this.at + 1] ?? null; }
  get arrived() { return this.at >= this.path.length - 1; }
}

export class RoadNet {
  constructor(world, resources = {}) {
    this.world = world;
    this.cols = Math.ceil(world.w / CELL);
    this.rows = Math.ceil(world.h / CELL);
    this.cells = new Set();          // road squares, by key
    this.budget = resources.road ?? 44;
    this.spareCars = resources.cars ?? 6;
    // Water was an absolute wall on the first cut, so anything across a river
    // could never be served and everybody there eventually gave up. The metro
    // layer buys its way over with tunnels; this one buys BRIDGES, which keeps
    // the river meaning the same thing on both layers: some ground is dearer.
    //
    // A bridge is a CROSSING, not a square, and the difference decided a whole
    // seed. Charging per square makes the price of a river its width — a
    // three-cell channel ate the entire allowance in one span, the next two L's
    // broke silently mid-water, and the board came apart into islands nothing
    // could route between (seed 80: six buildings, three deliveries, no car on
    // the road at all). So the charge is one per connected run of water, which
    // is also the rule the metro layer already plays by: a tunnel is a
    // crossing, however wide the river is under it.
    this.bridges = resources.bridge ?? 3;
    this.spanned = new Set();      // every wet square of road, for the drawing
    this.piers = 0;                // …counted as spans, which is what you pay
    this.cars = [];
    this.reach = new Map();          // shape → Map(cellKey → squares away)
    this.jammed = 0;
    this.rebuild();
  }

  // ── the grid ──────────────────────────────────────────────────────────
  cellOf(p) { return { cx: Math.floor(p.x / CELL), cy: Math.floor(p.y / CELL) }; }
  centre(k) {
    const [cx, cy] = k.split(',').map(Number);
    return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
  }
  onBoard(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows; }

  // Water is the one thing a road cannot be laid on, which is what makes some
  // ground dearer than other ground — the same job the river does upstairs.
  wet(cx, cy) {
    const c = this.centre(key(cx, cy));
    for (const ring of this.world.rings) if (pointInRing(c.x, c.y, ring)) return true;
    return false;
  }

  buildable(cx, cy) {
    if (!this.onBoard(cx, cy)) return false;
    if (!this.wet(cx, cy)) return true;
    // carrying an existing span further across is free; starting a new one costs
    if (this.touchesSpan(cx, cy)) return true;
    return this.bridgesLeft() > 0;
  }

  touchesSpan(cx, cy) {
    for (const [dx, dy] of NEIGHBOURS) if (this.spanned.has(key(cx + dx, cy + dy))) return true;
    return false;
  }

  bridgesLeft() { return this.bridges - this.piers; }

  // one pier per connected run of wet road, recounted from scratch so the
  // answer cannot depend on the order the squares were laid or lifted in
  countPiers() {
    const seen = new Set();
    let n = 0;
    for (const k of this.spanned) {
      if (seen.has(k)) continue;
      n++;
      const stack = [k];
      seen.add(k);
      while (stack.length) {
        const [cx, cy] = stack.pop().split(',').map(Number);
        for (const [dx, dy] of NEIGHBOURS) {
          const j = key(cx + dx, cy + dy);
          if (this.spanned.has(j) && !seen.has(j)) { seen.add(j); stack.push(j); }
        }
      }
    }
    this.piers = n;
  }

  used() { return this.cells.size; }
  left() { return this.budget - this.cells.size; }

  build(cx, cy) {
    if (!this.buildable(cx, cy)) return false;
    const k = key(cx, cy);
    if (this.cells.has(k)) return false;
    if (this.left() <= 0) return false;
    this.cells.add(k);
    if (this.wet(cx, cy)) { this.spanned.add(k); this.countPiers(); }
    this.rebuild();
    return true;
  }

  erase(cx, cy) {
    const k = key(cx, cy);
    if (!this.cells.has(k)) return false;
    this.cells.delete(k);
    if (this.spanned.delete(k)) this.countPiers();   // lifting a span gives it back
    // a car standing on ground that is no longer a road gives up and goes home
    for (let i = this.cars.length - 1; i >= 0; i--) {
      if (this.cars[i].path.includes(k)) this.strand(i);
    }
    this.rebuild();
    return true;
  }

  // put the passenger back where they were waiting and the car back in the pool
  strand(i) {
    const car = this.cars[i];
    const home = this.world.station(car.from);
    if (home) home.waiting.push(car.p);
    this.spareCars++;
    this.cars.splice(i, 1);
  }

  // ── which squares serve a building ────────────────────────────────────
  doorsOf(st) {
    const { cx, cy } = this.cellOf(st);
    const out = [];
    for (const [dx, dy] of NEIGHBOURS) {
      const k = key(cx + dx, cy + dy);
      if (this.cells.has(k)) out.push(k);
    }
    if (this.cells.has(key(cx, cy))) out.push(key(cx, cy));
    return out;
  }

  // ── the solve, exactly as upstairs ────────────────────────────────────
  // One sweep per shape, out from every building of that shape, so a car's
  // whole decision is a comparison of two numbers rather than a search.
  rebuild() {
    this.reach = new Map();
    for (const shape of this.world.shapesPresent()) {
      const d = new Map();
      const queue = [];
      for (const st of this.world.stations) {
        if (st.kind !== shape) continue;
        for (const k of this.doorsOf(st)) if (!d.has(k)) { d.set(k, 0); queue.push(k); }
      }
      for (let i = 0; i < queue.length; i++) {
        const cur = queue[i], base = d.get(cur);
        const [cx, cy] = cur.split(',').map(Number);
        for (const [dx, dy] of NEIGHBOURS) {
          const k = key(cx + dx, cy + dy);
          if (!this.cells.has(k) || d.has(k)) continue;
          d.set(k, base + 1);
          queue.push(k);
        }
      }
      this.reach.set(shape, d);
    }
  }

  // Squares from this building to the nearest one of `shape`. Infinity when no
  // road joins them — the same signal the metro layer's hop count gives, so the
  // stranded mark and the give-up rule work here untouched.
  hopsFrom(stationId, shape) {
    const st = this.world.station(stationId);
    const d = this.reach.get(shape);
    if (!st || !d) return Infinity;
    if (st.kind === shape) return 0;
    let best = Infinity;
    for (const k of this.doorsOf(st)) {
      const v = d.get(k);
      if (v !== undefined && v < best) best = v;
    }
    return best;
  }

  // the road a car should take: greedy downhill on the shape's own sweep, which
  // cannot loop because every step strictly decreases
  route(from, shape) {
    const d = this.reach.get(shape);
    if (!d) return null;
    let here = null, best = Infinity;
    for (const k of this.doorsOf(from)) {
      const v = d.get(k);
      if (v !== undefined && v < best) { best = v; here = k; }
    }
    if (!here) return null;
    const path = [here];
    let guard = 0;
    while (d.get(here) > 0 && guard++ < 4000) {
      const [cx, cy] = here.split(',').map(Number);
      let step = null, low = d.get(here);
      for (const [dx, dy] of NEIGHBOURS) {
        const k = key(cx + dx, cy + dy);
        const v = d.get(k);
        if (v !== undefined && v < low) { low = v; step = k; }
      }
      if (!step) return null;
      here = step;
      path.push(here);
    }
    return path;
  }

  // ── the tick ──────────────────────────────────────────────────────────
  step(dt, onDeliver) {
    this.dispatch();
    this.drive(dt, onDeliver);
  }

  // A building with somebody waiting and a road to where they are going puts a
  // car on it. Nothing is assigned by hand — that is the whole point.
  dispatch() {
    if (this.spareCars <= 0) return;
    for (const st of this.world.stations) {
      if (this.spareCars <= 0) break;
      for (let i = 0; i < st.waiting.length; i++) {
        const p = st.waiting[i];
        // A parcel names the layer for each leg. A car that picks up a crate
        // booked onto the metro has not helped; it has stolen it.
        if (p.layer && p.layer !== 'roads') continue;
        const path = this.route(st, p.goal);
        if (!path) continue;
        if (this.countIn(path[0]) >= CELL_CARS) break;   // the door is blocked
        st.waiting.splice(i, 1);
        this.cars.push(new Car(p, st.id, path, this.stationAt(path[path.length - 1], p.goal)));
        this.spareCars--;
        break;
      }
    }
  }

  // Whose door is this square? A car has to be able to say where it PUT
  // somebody, which is what a parcel changing layers depends on.
  stationAt(cell, shape) {
    for (const st of this.world.stations) {
      if (shape && st.kind !== shape) continue;
      if (this.doorsOf(st).includes(cell)) return st.id;
    }
    return null;
  }

  countIn(k) {
    let n = 0;
    for (const c of this.cars) if (c.cell === k) n++;
    return n;
  }

  // Can a car standing in `from` move into `into`?
  //
  // This is the second attempt and the first one was wrong in a way worth
  // recording. `CELL_CARS = 2` was written as "one each way, so nobody
  // deadlocks head-on" — but the code counted BOTH cars, so a one-square street
  // with two cars pointing east and two pointing west locked solid forever, and
  // the balance sweep came back with two seeds at 93% and 100% of every car
  // stopped. Halving the odds of a deadlock is not preventing one.
  //
  // So the lane is real now: cars coming the OTHER way are in the other lane
  // and do not block you. Only traffic going your way queues, which is what
  // makes room the constraint without making a street a one-way valve.
  roomIn(into, from) {
    let n = 0;
    for (const c of this.cars) {
      if (c.cell !== into) continue;
      if (c.next === from) continue;      // oncoming — the other lane
      n++;
    }
    return n < CELL_CARS;
  }

  drive(dt, onDeliver) {
    this.jammed = 0;

    // Move the car NEAREST its destination first. Order matters more than it
    // looks: a queue where the back moves first advances one car a tick, and a
    // queue where the front moves first advances the whole street. Same rule
    // either way — it is the reading order that differs.
    const order = this.cars.map((c, i) => i)
      .sort((a, b) => (this.cars[a].path.length - this.cars[a].at) - (this.cars[b].path.length - this.cars[b].at));

    const done = [];
    for (const i of order) {
      const car = this.cars[i];
      if (car.arrived) { done.push(i); continue; }
      // ROOM, not frequency: a square holds two abreast and a car that cannot
      // get into the next one simply stops. Jams are the failure this layer has.
      if (!this.roomIn(car.next, car.cell)) { this.jammed++; continue; }
      car.t += (CAR_SPEED * dt) / CELL;
      while (car.t >= 1 && !car.arrived) { car.t -= 1; car.at++; }
    }

    for (const i of done.sort((a, b) => b - a)) {
      const car = this.cars[i];
      this.cars.splice(i, 1);
      this.spareCars++;
      onDeliver?.(car);
    }
  }

  posOf(car) {
    const a = this.centre(car.cell);
    const n = car.next;
    if (!n) return { ...a, ang: 0 };
    const b = this.centre(n);
    return {
      x: a.x + (b.x - a.x) * car.t,
      y: a.y + (b.y - a.y) * car.t,
      ang: Math.atan2(b.y - a.y, b.x - a.x),
    };
  }
}

// local copy of the ring test so this file does not drag geometry's whole
// surface in for one predicate
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
