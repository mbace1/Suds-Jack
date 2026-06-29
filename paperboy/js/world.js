import { P, box, poly } from './proj.js';
import { COL } from './palette.js';
import { DELIVER_S } from './paper.js';

const AHEAD = 34, BEHIND = 6;
const HOUSE_GAP = 4.2;
const HOUSE_S0 = -6.6, HOUSE_S1 = -3.9;          // house footprint lanes
const WALK_S0 = -2.2, WALK_S1 = 0.7;             // sidewalk
const ROAD_S0 = 1.1,  ROAD_S1 = 5.5;             // road
const FENCE_S = 0.85;

// ── small colour helpers ──────────────────────────────────────────────────────
function hx(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function mix(a, b, t) { const A = hx(a), B = hx(b), m = i => Math.round(A[i] + (B[i] - A[i]) * t); return `rgb(${m(0)},${m(1)},${m(2)})`; }

export class World {
  constructor() { this.reset(0); }

  reset(scrollF) {
    this.houses = []; this.cars = []; this.props = []; this.fences = []; this.pickups = [];
    this.missedEvents = 0; this.difficulty = 1;
    this._fHouse = scrollF + 6;
    this._fCar   = scrollF + 10;
    this._fProp  = scrollF + 4;
    this._fPick  = scrollF + 14;
    this._fFence = scrollF - BEHIND;
  }
  setDifficulty(d) { this.difficulty = d; }

  // ── generation ──────────────────────────────────────────────────────────────
  update(dt, scrollF, t) {
    while (this._fHouse < scrollF + AHEAD) {
      this._fHouse += HOUSE_GAP;
      const sub = Math.random() < 0.55;
      this.houses.push({
        f: this._fHouse, s0: HOUSE_S0, s1: HOUSE_S1, f0: this._fHouse - 1.1, f1: this._fHouse + 1.1,
        sub, delivered: false, smashed: false, missed: false, flash: 0,
        base: sub ? { front: COL.subFront, side: COL.subSide, top: COL.subTop, rl: COL.subRoofL, rr: COL.subRoofR }
                  : { front: COL.nsFront, side: COL.nsSide, top: COL.nsTop, rl: COL.nsRoofL, rr: COL.nsRoofR },
      });
      // a bush or two on the lawn beside it
      if (Math.random() < 0.7) this.props.push({ kind: 'bush', s: -7.2 + Math.random() * 0.8, f: this._fHouse + (Math.random() * 2 - 1), collide: false });
      if (Math.random() < 0.25) this.props.push({ kind: 'sign', s: -3.0, f: this._fHouse + 1.6, collide: false });
    }
    // fence pickets (continuous) along the sidewalk edge
    while (this._fFence < scrollF + AHEAD) {
      this._fFence += 0.5;
      this.fences.push({ kind: 'fence', s: FENCE_S, f: this._fFence });
    }
    // sidewalk obstacles
    while (this._fProp < scrollF + AHEAD) {
      this._fProp += 6 + Math.random() * 6;
      const r = Math.random();
      if (r < 0.4) this.props.push({ kind: 'hydrant', s: -1.6, f: this._fProp, collide: true });
      else if (r < 0.8) this.props.push({ kind: 'trash', s: -1.0 + Math.random() * 1.2, f: this._fProp, collide: true });
    }
    // cars on the road
    while (this._fCar < scrollF + AHEAD) {
      this._fCar += (7 - this.difficulty * 0.7) * (0.7 + Math.random());
      const lane = 1.7 + Math.random() * 3.4;
      const dir = Math.random() < 0.7 ? -1 : 1;             // mostly oncoming
      this.cars.push({ s: lane, f: this._fCar + (dir < 0 ? 14 : 0), vf: dir * (3 + this.difficulty * 0.7), w: 1.3, len: 2.4, alive: true });
    }
    // paper bundles on the sidewalk
    while (this._fPick < scrollF + AHEAD) {
      this._fPick += 22 + Math.random() * 16;
      this.pickups.push({ s: -1.4 + Math.random() * 1.6, f: this._fPick, taken: false });
    }

    // move cars + flashes
    for (const c of this.cars) c.f += c.vf * dt;
    for (const h of this.houses) {
      if (h.flash > 0) h.flash = Math.max(0, h.flash - dt * 2);
      if (h.sub && !h.delivered && !h.missed && h.f < scrollF - 1) { h.missed = true; this.missedEvents++; }
    }

    // cull behind
    const cull = scrollF - BEHIND;
    this.houses = this.houses.filter(h => h.f > cull - 2);
    this.props  = this.props.filter(p => p.f > cull - 2);
    this.fences = this.fences.filter(p => p.f > cull - 1);
    this.pickups = this.pickups.filter(p => !p.taken && p.f > cull - 2);
    this.cars   = this.cars.filter(c => c.f > cull - 4 && c.f < scrollF + AHEAD + 16);
  }

  // ── interactions ──────────────────────────────────────────────────────────────
  resolvePaper(p) {
    let best = null, bd = 1e9;
    for (const h of this.houses) {
      const d = Math.abs(h.f - p.f);
      if (d < 1.5 && d < bd) { bd = d; best = h; }
    }
    if (!best) return { result: 'miss' };
    if (best.sub && !best.delivered) {
      best.delivered = true; best.flash = 1;
      best.base = { front: COL.delivered, side: mix(COL.delivered, '#000000', 0.18), top: '#c8ffe6', rl: COL.subRoofL, rr: COL.subRoofR };
      return { result: 'deliver', points: 250, f: best.f };
    }
    if (!best.sub && !best.smashed) { best.smashed = true; best.flash = 1; return { result: 'smash', points: 100, f: best.f }; }
    return { result: 'miss' };
  }
  hazardHit(s, f) {
    for (const c of this.cars) if (Math.abs(c.s - s) < 0.9 && Math.abs(c.f - f) < 1.3) return c;
    for (const p of this.props) if (p.collide && Math.abs(p.s - s) < 0.7 && Math.abs(p.f - f) < 0.7) return p;
    return null;
  }
  pickupHit(s, f) {
    for (const p of this.pickups) if (!p.taken && Math.abs(p.s - s) < 0.8 && Math.abs(p.f - f) < 0.9) { p.taken = true; return p; }
    return null;
  }

  // ── drawing ──────────────────────────────────────────────────────────────────
  draw(ctx, scrollF, player, papers) {
    this._drawGround(ctx, scrollF);
    this.drawPickups(ctx, scrollF);
    // build a painter-sorted list of everything that stands up off the ground
    const list = [];
    for (const h of this.houses) list.push({ y: P(h.s1, h.f, 0, scrollF).y, d: () => this._house(ctx, h, scrollF) });
    for (const p of this.props)  list.push({ y: P(p.s, p.f, 0, scrollF).y, d: () => this._prop(ctx, p, scrollF) });
    for (const fseg of this.fences) list.push({ y: P(fseg.s, fseg.f, 0, scrollF).y, d: () => this._fence(ctx, fseg, scrollF) });
    for (const c of this.cars)   list.push({ y: P(c.s, c.f, 0, scrollF).y, d: () => this._car(ctx, c, scrollF) });
    list.push({ y: P(player.s, player.f, 0, scrollF).y, d: () => player.draw(ctx, scrollF) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.d();
    papers.draw(ctx, scrollF);
  }

  _drawGround(ctx, scrollF) {
    const fN = scrollF - BEHIND, fF = scrollF + AHEAD;
    // mowed-lawn stripes across the whole field
    for (let fk = Math.floor(fN); fk < fF; fk += 2) {
      poly(ctx, [P(-13, fk, 0, scrollF), P(11, fk, 0, scrollF), P(11, fk + 2, 0, scrollF), P(-13, fk + 2, 0, scrollF)],
        (Math.floor(fk / 2) % 2 === 0) ? COL.grass1 : COL.grass2);
    }
    // sidewalk
    poly(ctx, [P(WALK_S0, fN, 0, scrollF), P(WALK_S1, fN, 0, scrollF), P(WALK_S1, fF, 0, scrollF), P(WALK_S0, fF, 0, scrollF)], COL.walk);
    // road + curbs + centre dashes
    poly(ctx, [P(ROAD_S0, fN, 0, scrollF), P(ROAD_S1, fN, 0, scrollF), P(ROAD_S1, fF, 0, scrollF), P(ROAD_S0, fF, 0, scrollF)], COL.road);
    poly(ctx, [P(ROAD_S0 - 0.18, fN, 0, scrollF), P(ROAD_S0, fN, 0, scrollF), P(ROAD_S0, fF, 0, scrollF), P(ROAD_S0 - 0.18, fF, 0, scrollF)], COL.curb);
    poly(ctx, [P(ROAD_S1, fN, 0, scrollF), P(ROAD_S1 + 0.18, fN, 0, scrollF), P(ROAD_S1 + 0.18, fF, 0, scrollF), P(ROAD_S1, fF, 0, scrollF)], COL.curb);
    for (let fk = Math.floor(fN); fk < fF; fk += 2)
      poly(ctx, [P(3.25, fk, 0, scrollF), P(3.45, fk, 0, scrollF), P(3.45, fk + 1, 0, scrollF), P(3.25, fk + 1, 0, scrollF)], COL.roadLine);
  }

  _house(ctx, h, scrollF) {
    const fl = h.flash;
    const c = {
      front: fl > 0 ? mix(h.base.front, '#ffffff', fl * 0.7) : h.base.front,
      side:  fl > 0 ? mix(h.base.side, '#ffffff', fl * 0.7) : h.base.side,
      top:   fl > 0 ? mix(h.base.top, '#ffffff', fl * 0.7) : h.base.top,
    };
    box(ctx, h.s0, h.s1, h.f0, h.f1, 0, 1.4, scrollF, c);
    // roof
    const sm = (h.s0 + h.s1) / 2;
    const rF = P(sm, h.f0, 2.15, scrollF), rB = P(sm, h.f1, 2.15, scrollF);
    const eFL = P(h.s0, h.f0, 1.4, scrollF), eBL = P(h.s0, h.f1, 1.4, scrollF);
    const eFR = P(h.s1, h.f0, 1.4, scrollF), eBR = P(h.s1, h.f1, 1.4, scrollF);
    poly(ctx, [eFR, eBR, rB, rF], h.base.rr);
    poly(ctx, [eFL, eBL, rB, rF], h.base.rl);
    poly(ctx, [eFL, eFR, rF], h.base.rl);                       // front gable
    // door + windows on the front (f0) face
    poly(ctx, [P(sm - 0.45, h.f0, 0.95, scrollF), P(sm + 0.45, h.f0, 0.95, scrollF), P(sm + 0.45, h.f0, 0, scrollF), P(sm - 0.45, h.f0, 0, scrollF)], COL.door);
    const win = h.sub ? COL.winLit : COL.winDark;
    for (const ws of [h.s0 + 0.55, h.s1 - 0.55]) {
      if (Math.abs(ws - sm) < 0.5) continue;
      poly(ctx, [P(ws - 0.28, h.f0, 1.15, scrollF), P(ws + 0.28, h.f0, 1.15, scrollF), P(ws + 0.28, h.f0, 0.6, scrollF), P(ws - 0.28, h.f0, 0.6, scrollF)], win);
    }
    // curbside mailbox at the delivery lane
    this._mailbox(ctx, h, scrollF);
  }

  _mailbox(ctx, h, scrollF) {
    const ms = DELIVER_S;
    // post
    poly(ctx, [P(ms - 0.05, h.f, 0.55, scrollF), P(ms + 0.05, h.f, 0.55, scrollF), P(ms + 0.05, h.f, 0, scrollF), P(ms - 0.05, h.f, 0, scrollF)], COL.mailPost);
    // box body
    box(ctx, ms - 0.2, ms + 0.2, h.f - 0.28, h.f + 0.28, 0.55, 0.9, scrollF,
      { front: h.sub ? COL.mailbox : COL.mailDark, side: COL.mailDark, top: COL.mailbox });
    // flag (up = wants a paper)
    if (h.sub && !h.delivered) {
      const fy = 0.7;
      poly(ctx, [P(ms + 0.2, h.f, fy + 0.22, scrollF), P(ms + 0.34, h.f, fy + 0.22, scrollF), P(ms + 0.34, h.f, fy, scrollF), P(ms + 0.2, h.f, fy, scrollF)], COL.flag);
    }
  }

  _car(ctx, c, scrollF) {
    const half = c.len / 2;
    box(ctx, c.s - c.w / 2, c.s + c.w / 2, c.f - half, c.f + half, 0, 0.55, scrollF, { front: COL.carBody, side: COL.carSide, top: COL.carTop });
    box(ctx, c.s - c.w / 2 + 0.18, c.s + c.w / 2 - 0.18, c.f - half + 0.5, c.f + half - 0.5, 0.55, 0.95, scrollF, { front: COL.carWin, side: COL.carWin, top: COL.carTop });
  }

  _fence(ctx, fseg, scrollF) {
    // a single picket with a connecting rail
    poly(ctx, [P(fseg.s - 0.04, fseg.f, 0.5, scrollF), P(fseg.s + 0.04, fseg.f, 0.5, scrollF), P(fseg.s + 0.04, fseg.f, 0, scrollF), P(fseg.s - 0.04, fseg.f, 0, scrollF)], COL.fence);
    poly(ctx, [P(fseg.s - 0.04, fseg.f, 0.34, scrollF), P(fseg.s - 0.04, fseg.f + 0.5, 0.34, scrollF), P(fseg.s - 0.04, fseg.f + 0.5, 0.24, scrollF), P(fseg.s - 0.04, fseg.f, 0.24, scrollF)], COL.fenceShade);
  }

  _prop(ctx, p, scrollF) {
    if (p.kind === 'bush') {
      const b = P(p.s, p.f, 0, scrollF);
      ctx.fillStyle = COL.bush; ctx.beginPath(); ctx.ellipse(b.x, b.y - 8, 14, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COL.bushHi; ctx.beginPath(); ctx.ellipse(b.x - 3, b.y - 11, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'hydrant') {
      box(ctx, p.s - 0.16, p.s + 0.16, p.f - 0.16, p.f + 0.16, 0, 0.5, scrollF, { front: COL.signInk, side: mix(COL.signInk, '#000', 0.2), top: '#ff8a7a' });
    } else if (p.kind === 'trash') {
      box(ctx, p.s - 0.22, p.s + 0.22, p.f - 0.22, p.f + 0.22, 0, 0.6, scrollF, { front: COL.trash, side: COL.trashSide, top: COL.trashTop });
    } else if (p.kind === 'sign') {
      poly(ctx, [P(p.s - 0.03, p.f, 0.7, scrollF), P(p.s + 0.03, p.f, 0.7, scrollF), P(p.s + 0.03, p.f, 0, scrollF), P(p.s - 0.03, p.f, 0, scrollF)], COL.signPost);
      box(ctx, p.s - 0.5, p.s + 0.5, p.f - 0.05, p.f + 0.05, 0.7, 1.15, scrollF, { front: COL.sign, side: COL.sign, top: COL.sign });
      const a = P(p.s - 0.4, p.f, 1.0, scrollF), b = P(p.s + 0.4, p.f, 0.85, scrollF);
      ctx.strokeStyle = COL.signInk; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }

  drawPickups(ctx, scrollF) {
    for (const p of this.pickups) {
      if (p.taken) continue;
      const b = P(p.s, p.f, 0.2, scrollF);
      ctx.fillStyle = COL.bundle; ctx.fillRect(b.x - 8, b.y - 8, 16, 12);
      ctx.fillStyle = COL.bundleDark; ctx.fillRect(b.x - 8, b.y - 2, 16, 3);
    }
  }
}
