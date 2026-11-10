// formation.js — bodies that come as one unit (v106; owner: "more unique patterns and synergies"). The
// director lays a formation out (sim/director/arcade.js sizeWave); this file runs it. Pure: no DOM, no clock,
// no Math.random — every draw was made when the wave was laid out.
//
// ESCORT  a GIANT's moons: mites riding an orbit round it, the same way round, evenly spaced. While a mite rides,
//         its own behaviour is not stepped: the core moves it toward its place on the orbit (so a knock, the
//         crowd and the walls still take it). It peels off, for good, when you come within `peel` of it, and
//         when the giant dies every mite still riding SCATTERS at you (the SIREN's surge, ×`scatter.mult`).
// PAIR    two bodies of one kind joined by a goo STRAND (`w.links`): a spring holds them `min`–`max` apart, so
//         a pair coming at you comes round both sides. The strand hurts to touch (the hero's centre within
//         `r` of it, between the bodies); a DASH through it cuts it, and so does either body's death.
//
//   g.form   { kind: 'escort', lead, slot, n, phase }      a rider (cleared when it peels off)
//   w.links  [{ id, a, b, kind, cut }]                      the strands, cut ones kept a step for the view
//   events   escortScatter { id } · strand { id, a, b } · strandCut { id, x, z, by: 'dash' | 'death' }
import { TUNING } from '../tuning.js?v=141';

const T = TUNING;
const byId = (w, id) => { for (const g of w.gels) if (g.id === id) return g; return null; };

// a rider's step, in place of its species' (world.js gelStep): true when the formation moved it
export function ride(w, g, dt, api) {
  const F = g.form;
  if (!F || F.kind !== 'escort') return false;
  const E = T.forms.escort, lead = byId(w, F.lead), h = w.hero;
  if (!lead || !lead.alive) { release(w, g, false); return false; }
  if (h.alive && Math.hypot(g.x - h.x, g.z - h.z) < E.peel) { release(w, g, false); return false; }
  const R = lead.r + E.gap + g.r, a = F.phase + (w.time * Math.PI * 2) / E.period + (F.slot / F.n) * Math.PI * 2;
  const tx = lead.x + Math.cos(a) * R, tz = lead.z + Math.sin(a) * R;
  let vx = (tx - g.x) * E.pull, vz = (tz - g.z) * E.pull;
  const v = Math.hypot(vx, vz), cap = E.maxSpeed;
  if (v > cap) { vx *= cap / v; vz *= cap / v; }
  g.vx = vx; g.vz = vz;
  // facing where it goes, for the looks that read it
  if (v > 0.05) { g.faceX = vx / v; g.faceZ = vz / v; }
  return true;
}

function release(w, g, scatter) {
  g.form = null;
  if (scatter) { const S = T.forms.escort.scatter; g.surgeT = S.time; g.surgeMult = S.mult; }
}

// a strand between two bodies (the director's linked pair: sim/director/arcade.js)
export function link(w, a, b, kind) {
  w.links ??= [];
  const L = { id: (w.linkSeq = (w.linkSeq ?? 0) + 1), a, b, kind, cut: false };
  w.links.push(L);
  w.events.push({ type: 'strand', id: L.id, a, b, kind });
  return L;
}

// a death: the riders of a giant that falls scatter at you, and a strand to the body snaps where it was tied
export function onDeath(w, g) {
  if (g.size === 5) for (const o of w.gels) if (o.alive && o.form?.kind === 'escort' && o.form.lead === g.id) {
    release(w, o, true);
    w.events.push({ type: 'escortScatter', id: o.id, x: o.x, z: o.z });
  }
  for (const L of w.links ?? []) if (!L.cut && (L.a === g.id || L.b === g.id)) cut(w, L, g, 'death');
}

// after the bodies have stepped: the strands' springs, then a dash through one cuts it
export function step(w, dt) {
  if (!w.links?.length) return;
  const P = T.forms.pair, h = w.hero;
  for (let i = w.links.length - 1; i >= 0; i--) {
    const L = w.links[i];
    if (L.cut) { if ((L.gone = (L.gone ?? 0) + dt) > P.keep) w.links.splice(i, 1); continue; }
    const a = byId(w, L.a), b = byId(w, L.b);
    if (!a?.alive || !b?.alive) { cut(w, L, a?.alive ? b ?? a : a ?? b, 'death'); continue; }
    if (a.state !== 'active' || b.state !== 'active') continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1e-6;
    const over = d > P.max ? d - P.max : d < P.min ? d - P.min : 0;
    if (over) {
      // each end takes half, at most `give` a step: a spring, not a rod
      const k = Math.max(-P.give, Math.min(P.give, over * 0.5 * Math.min(1, P.spring * dt)));
      a.x += (dx / d) * k; a.z += (dz / d) * k; b.x -= (dx / d) * k; b.z -= (dz / d) * k;
    }
    if (h.alive && h.dash > 0 && touches(L, a, b, h.x, h.z, T.hero.radius)) {
      const t = along(a, b, h.x, h.z);
      cut(w, L, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, 'dash');
    }
  }
}

function cut(w, L, at, by) {
  L.cut = true;
  w.events.push({ type: 'strandCut', id: L.id, x: at?.x ?? 0, z: at?.z ?? 0, by, kind: L.kind });
}

// where along the strand (0 at a, 1 at b) a point comes closest
function along(a, b, x, z) {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1e-9;
  return Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2));
}

// the strand against a circle at (x, z) of radius r: the part between the two bodies, not inside either
export function touches(L, a, b, x, z, r) {
  const t = along(a, b, x, z), d = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6;
  if (t * d < a.r || (1 - t) * d < b.r) return false;
  const px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t;
  return Math.hypot(x - px, z - pz) < T.forms.pair.r + r;
}

// the strands that stand, with their ends, for the hurt test, the bot and the view
export function strands(w) {
  const out = [];
  for (const L of w.links ?? []) {
    if (L.cut) continue;
    const a = byId(w, L.a), b = byId(w, L.b);
    if (a?.alive && b?.alive && a.state === 'active' && b.state === 'active') out.push({ L, a, b });
  }
  return out;
}
