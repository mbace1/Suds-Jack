// The board: water, stops, and the people standing on them.
//
// No geography. The map is generated per seed and means nothing — which is the
// genre's actual claim, that a network is interesting on its own terms without
// a city underneath it. The water is the only fixed obstacle, and it exists so
// that SOME connections cost more than others; a board with no river is a board
// where every line is equally good and there is nothing to plan around.

import { makeRng } from './rng.js?v=1';
import { COMMON, SPECIAL, isSpecial } from './shapes.js?v=1';
import { inWater, dist } from './geometry.js?v=1';

export const BOARD = { w: 860, h: 600 };

// Capacity is six everywhere, and the clock that runs once you are over it is
// long enough to be a warning rather than a verdict — you are meant to see the
// ring filling and have time to do something about it.
export const STATION_CAP = 6;
export const OVERCROWD_TIME = 45;

const MARGIN = 52;
const MIN_GAP = 88;
export const MAX_STATIONS = 26;

export class Station {
  constructor(id, kind, x, y) {
    this.id = id;
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.waiting = [];          // goal shapes, oldest first
    this.capacity = STATION_CAP;
    this.over = 0;              // 0…1; at 1 the run ends
    this.special = isSpecial(kind);
  }
  get crowded() { return this.waiting.length > this.capacity; }
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.rings = makeWater(this.rng);
    this.stations = [];
    this.nextId = 0;
    this.time = 0;
    this.nextStationAt = 12;
    this.passengerDebt = 0;

    // open on the three common shapes, spread out, so the first line the player
    // draws always has somewhere sensible to go
    for (const kind of COMMON) this.spawnStation(kind);
  }

  station(id) { return this.stations.find(s => s.id === id); }

  shapesPresent() {
    const set = new Set();
    for (const s of this.stations) set.add(s.kind);
    return [...set];
  }

  // Rejection sampling: off the water, off the edges, and not on top of a stop
  // that is already there. Sixty tries then give up for this cycle — a board
  // that is genuinely full should stop growing rather than pile stops up.
  freeSpot() {
    for (let i = 0; i < 60; i++) {
      const x = this.rng.range(MARGIN, BOARD.w - MARGIN);
      const y = this.rng.range(MARGIN, BOARD.h - MARGIN);
      if (inWater(x, y, this.rings)) continue;
      let ok = true;
      for (const s of this.stations) if (dist(s, { x, y }) < MIN_GAP) { ok = false; break; }
      if (ok) return { x, y };
    }
    return null;
  }

  spawnStation(kind = null) {
    if (this.stations.length >= MAX_STATIONS) return null;
    const spot = this.freeSpot();
    if (!spot) return null;
    if (!kind) kind = this.rollKind();
    const st = new Station(this.nextId++, kind, spot.x, spot.y);
    this.stations.push(st);
    return st;
  }

  // Specials stay out of the first minute. They are the shapes everybody wants,
  // so one arriving before there is a network to reach it is just a stop that
  // drowns on its own.
  rollKind() {
    const special = this.time > 55 && this.rng.next() < 0.2;
    return special ? this.rng.pick(SPECIAL) : this.rng.weight([['circle', 5], ['triangle', 3], ['square', 3]]);
  }

  // People per second, climbing across the run. This is the difficulty curve —
  // there is no other one. Nothing gets faster or meaner, there is just more.
  spawnRate() {
    return 0.45 + Math.min(1.9, this.time / 210);
  }

  // A stop's pull. A special shape is wanted far more often than its share of
  // the board, which is what turns one star station into the thing the whole
  // network has to be bent around.
  goalFor(from) {
    const present = this.shapesPresent().filter(k => k !== from.kind);
    if (!present.length) return null;
    return this.rng.weight(present.map(k => [k, isSpecial(k) ? 6 : 1]));
  }

  step(dt) {
    this.time += dt;

    if (this.time >= this.nextStationAt) {
      this.spawnStation();
      this.nextStationAt = this.time + this.rng.range(13, 19);
    }

    // fractional arrivals are banked, so a low early rate still produces whole
    // people at the right average instead of rounding down to none
    this.passengerDebt += this.spawnRate() * dt;
    while (this.passengerDebt >= 1) {
      this.passengerDebt -= 1;
      this.addPassenger();
    }

    for (const s of this.stations) {
      if (s.crowded) s.over = Math.min(1, s.over + dt / OVERCROWD_TIME);
      else s.over = Math.max(0, s.over - dt / (OVERCROWD_TIME * 0.5));
    }
  }

  addPassenger() {
    if (this.stations.length < 2) return;
    const from = this.rng.weight(this.stations.map(s => [s, s.special ? 2.4 : 1]));
    const goal = this.goalFor(from);
    if (goal) from.waiting.push(goal);
  }

  // The station whose ring is fullest, for the HUD to point at.
  worstStation() {
    let worst = null;
    for (const s of this.stations) if (!worst || s.over > worst.over) worst = s;
    return worst;
  }

  doomed() { return this.stations.some(s => s.over >= 1); }

  hitStation(x, y, r = 26) {
    let best = null, bd = r;
    for (const s of this.stations) {
      const d = dist(s, { x, y });
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
}

// ── water ───────────────────────────────────────────────────────────────
// One river always, and half the time a second one running the other way, so
// some boards are split in two and some in three. The ring runs well past the
// edges of the board so it closes off-screen and never shows a seam.

function makeWater(rng) {
  const rings = [makeRiver(rng, rng.next() < 0.5)];
  if (rng.next() < 0.5) rings.push(makeRiver(rng, rng.next() < 0.5, true));
  return rings;
}

function makeRiver(rng, vertical, thin = false) {
  const along = vertical ? BOARD.h : BOARD.w;
  const across = vertical ? BOARD.w : BOARD.h;
  const base = rng.range(across * 0.3, across * 0.7);
  const width = thin ? rng.range(38, 52) : rng.range(52, 78);
  const wob = rng.range(40, 95);
  const phase = rng.range(0, Math.PI * 2);
  const turns = rng.range(1.1, 2.0);

  const centre = [];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = -80 + t * (along + 160);
    const b = base + Math.sin(phase + t * Math.PI * turns) * wob;
    centre.push(vertical ? { x: b, y: a } : { x: a, y: b });
  }

  const left = [], right = [];
  for (let i = 0; i < centre.length; i++) {
    const p = centre[i];
    const q = centre[Math.min(i + 1, centre.length - 1)];
    const o = centre[Math.max(i - 1, 0)];
    const dx = q.x - o.x, dy = q.y - o.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    left.push({ x: p.x + nx * width / 2, y: p.y + ny * width / 2 });
    right.push({ x: p.x - nx * width / 2, y: p.y - ny * width / 2 });
  }
  return [...left, ...right.reverse()];
}
