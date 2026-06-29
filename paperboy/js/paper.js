import { P } from './proj.js';
import { COL } from './palette.js';

const POOL    = 30;
const THROW_VS = -7.0;   // lateral speed toward the houses (left = −s)
const THROW_VF = 1.2;    // slight forward lead
export const DELIVER_S = -2.3;   // mailbox lane the paper resolves at

// A newspaper that sails flat to the left and lands at the mailbox line.
export class PaperPool {
  constructor() {
    this.items = Array.from({ length: POOL }, () => ({
      live: false, s: 0, f: 0, vs: 0, vf: 0, spin: 0, landed: false, resolved: false, _rest: 0,
    }));
  }
  throw_(s, f) {
    const p = this.items.find(it => !it.live);
    if (!p) return;
    p.live = true; p.landed = false; p.resolved = false; p._rest = 0;
    p.s = s; p.f = f; p.vs = THROW_VS; p.vf = THROW_VF; p.spin = Math.random() * 6;
  }
  update(dt) {
    for (const p of this.items) {
      if (!p.live) continue;
      if (!p.landed) {
        p.s += p.vs * dt; p.f += p.vf * dt; p.spin += dt * 12;
        if (p.s <= DELIVER_S) { p.s = DELIVER_S; p.landed = true; }
      } else {
        p._rest += dt;
        if (p._rest > 0.5) { p.live = false; }
      }
    }
  }
  freshLandings() {
    const out = [];
    for (const p of this.items) if (p.live && p.landed && !p.resolved) { p.resolved = true; out.push(p); }
    return out;
  }
  clear() { for (const p of this.items) { p.live = false; p._rest = 0; } }

  draw(ctx, scrollF) {
    for (const p of this.items) {
      if (!p.live) continue;
      const h = p.landed ? 0.45 : 0.7;
      const c = P(p.s, p.f, h, scrollF);
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(p.spin);
      ctx.fillStyle = COL.paper;
      ctx.fillRect(-5, -3, 10, 6);
      ctx.fillStyle = COL.bundleDark;
      ctx.fillRect(-5, -1, 10, 2);
      ctx.restore();
    }
  }
}
