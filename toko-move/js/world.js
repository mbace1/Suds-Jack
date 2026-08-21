// The board: water, stops, and the people standing on them.
//
// Every number this file used to hold now arrives in a spec from missions.js.
// The board is not the game's opinion any more, it is the mission's.
//
// ONE RULE when editing: the sequence of rng calls is the board. Insert a roll
// anywhere and every seed lays out differently from that point on, which
// silently rewrites boards that already exist. New behaviour that needs
// randomness takes its own stream (see `siteRng`) rather than borrowing this one.

import { makeRng } from './rng.js?v=7';
import { COMMON, SPECIAL, isSpecial } from './shapes.js?v=7';
import { inWater, dist } from './geometry.js?v=7';

// The default board, still exported because the renderer and the tests want a
// size before a mission is chosen. A mission may state its own.
export const BOARD = { w: 860, h: 600 };

export const STATION_CAP = 6;

// A waiting passenger is an OBJECT, not a bare shape. It has to carry state —
// how long it has stood there, and whether anything can reach where it is going
// — and the layers to come need it to carry more than that: a parcel has a
// weight and a deadline. The destination in particular has to survive being
// handed from one layer to the next, which is the thing OpenTTD's own manual
// records itself getting wrong ("cargo will jump on any vehicle that accepts
// them, even if it brings them back to where they came from").
export class Passenger {
  constructor(goal, born = 0) {
    this.goal = goal;
    this.born = born;
    this.stranded = false;    // set by the sim, which is the half that knows
  }
  waited(now) { return now - this.born; }
}

export class Station {
  constructor(id, kind, x, y) {
    this.id = id;
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.waiting = [];          // goal shapes, oldest first
    this.capacity = STATION_CAP;
    this.over = 0;              // 0…1; at 1 the mission's fail rule decides
    this.special = isSpecial(kind);
  }
  get crowded() { return this.waiting.length > this.capacity; }

  join(goal, now = 0) {
    const p = new Passenger(goal, now);
    this.waiting.push(p);
    return p;
  }
}

export class World {
  constructor(seed = 1, spec = {}) {
    const board = spec.board || {};
    const spawn = spec.spawn || {};
    this.seed = seed;
    this.w = board.w ?? BOARD.w;
    this.h = board.h ?? BOARD.h;
    this.maxStations = board.maxStations ?? 26;
    this.minGap = board.minGap ?? 88;
    this.margin = board.margin ?? 52;
    this.spawn = {
      base: spawn.base ?? 0.45,
      ramp: spawn.ramp ?? 210,
      cap: spawn.cap ?? 1.9,
      stationEvery: spawn.stationEvery ?? [13, 19],
      specialsAfter: spawn.specialsAfter ?? 55,
      specialChance: spawn.specialChance ?? 0.2,
      bursts: spawn.bursts ?? [],
    };
    // how long an over-capacity stop takes to run its gauge out; the mission's
    // fail rule decides what reaching the end of it means
    this.overcrowdTime = spec.fail?.overcrowd ?? 45;

    this.rng = makeRng(seed);
    this.rings = makeWater(this.rng, this.w, this.h);
    this.stations = [];
    this.nextId = 0;
    this.time = 0;
    this.nextStationAt = board.firstStation ?? 12;
    this.passengerDebt = 0;
    this.firedBursts = new Set();
    this.events = [];

    // A separate stream, so a mission with a crowd in it lays out exactly the
    // same board as one without. Borrowing `this.rng` here would shift every
    // roll after it and quietly change every seeded board that already exists.
    this.siteRng = makeRng((seed ^ 0x9e3779b9) >>> 0);
    this.site = this.spawn.bursts.length
      ? { x: this.siteRng.range(this.margin, this.w - this.margin),
          y: this.siteRng.range(this.margin, this.h - this.margin) }
      : null;

    for (const kind of COMMON) this.spawnStation(kind);
  }

  station(id) { return this.stations.find(s => s.id === id); }

  shapesPresent() {
    const set = new Set();
    for (const s of this.stations) set.add(s.kind);
    return [...set];
  }

  freeSpot() {
    for (let i = 0; i < 60; i++) {
      const x = this.rng.range(this.margin, this.w - this.margin);
      const y = this.rng.range(this.margin, this.h - this.margin);
      if (inWater(x, y, this.rings)) continue;
      let ok = true;
      for (const s of this.stations) if (dist(s, { x, y }) < this.minGap) { ok = false; break; }
      if (ok) return { x, y };
    }
    return null;
  }

  spawnStation(kind = null) {
    if (this.stations.length >= this.maxStations) return null;
    const spot = this.freeSpot();
    if (!spot) return null;
    if (!kind) kind = this.rollKind();
    const st = new Station(this.nextId++, kind, spot.x, spot.y);
    this.stations.push(st);
    return st;
  }

  // The `&&` short-circuits, so before `specialsAfter` no roll happens at all.
  // That is load-bearing: change it to an unconditional roll and every board
  // after the first minute lays out differently.
  rollKind() {
    const s = this.spawn;
    const special = this.time > s.specialsAfter && this.rng.next() < s.specialChance;
    return special ? this.rng.pick(SPECIAL) : this.rng.weight([['circle', 5], ['triangle', 3], ['square', 3]]);
  }

  spawnRate() {
    const s = this.spawn;
    return s.base + Math.min(s.cap, this.time / s.ramp);
  }

  goalFor(from) {
    const present = this.shapesPresent().filter(k => k !== from.kind);
    if (!present.length) return null;
    return this.rng.weight(present.map(k => [k, isSpecial(k) ? 6 : 1]));
  }

  step(dt) {
    this.time += dt;

    if (this.time >= this.nextStationAt) {
      this.spawnStation();
      this.nextStationAt = this.time + this.rng.range(...this.spawn.stationEvery);
    }

    this.fireBursts();

    this.passengerDebt += this.spawnRate() * dt;
    while (this.passengerDebt >= 1) {
      this.passengerDebt -= 1;
      this.addPassenger();
    }

    for (const s of this.stations) {
      if (s.crowded) s.over = Math.min(1, s.over + dt / this.overcrowdTime);
      else s.over = Math.max(0, s.over - dt / (this.overcrowdTime * 0.5));
    }
  }

  // A crowd that WALKS. It does not appear where the event was — it lands on
  // the handful of stops nearest to it, which is what makes the shape of the
  // network before the burst the thing that decides how the burst goes.
  fireBursts() {
    for (let i = 0; i < this.spawn.bursts.length; i++) {
      const b = this.spawn.bursts[i];
      if (this.firedBursts.has(i) || this.time < b.at) continue;
      this.firedBursts.add(i);
      const near = this.nearestStations(this.site, b.spread ?? 3);
      if (!near.length) continue;
      for (let n = 0; n < b.n; n++) {
        const from = near[n % near.length];
        const goal = this.goalFor(from);
        if (goal) from.join(goal, this.time);
      }
      if (b.label) this.events.push({ kind: 'burst', text: b.label });
    }
  }

  nearestStations(point, k) {
    if (!point) return [];
    return [...this.stations]
      .sort((a, b) => dist(a, point) - dist(b, point))
      .slice(0, Math.max(1, k));
  }

  addPassenger() {
    if (this.stations.length < 2) return;
    const from = this.rng.weight(this.stations.map(s => [s, s.special ? 2.4 : 1]));
    const goal = this.goalFor(from);
    if (goal) from.join(goal, this.time);
  }

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

function makeWater(rng, w, h) {
  const rings = [makeRiver(rng, rng.next() < 0.5, w, h)];
  if (rng.next() < 0.5) rings.push(makeRiver(rng, rng.next() < 0.5, w, h, true));
  return rings;
}

function makeRiver(rng, vertical, w, h, thin = false) {
  const along = vertical ? h : w;
  const across = vertical ? w : h;
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
