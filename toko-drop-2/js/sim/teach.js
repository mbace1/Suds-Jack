// teach.js — the first-time tags for the floor's told attacks (v115). Pure: reads the world, never writes it (the
// tags are the view's — render/hints.js draws them — and main.js keeps the counts in this browser).
//
// A giant's slam (sim/slam.js) and a sewer ram (sim/posts.js) are told every time — a ring on the floor at the
// slam's reach, a striped lane lit while the ram is about to come — but a first look at a ring on the floor says
// nothing about what it means. So, as DASH THROUGH! does for a gate (render/pickups.js), a line of text says it:
// STEP OUT! over a giant gathering with you in or near its ring, CLEAR THE LANE! over a ram's lane that warns with
// you in or near it. Each is LEARNED for good in this browser the first time you get out in time — in it while it
// warned, out of it when it came — or once it has been shown `cap` times (someone who keeps near it and never in it
// is not told for ever).
//
//   k       { slam, ram }  showings so far, `cap` = learned · `dirty` when one moved (main.js stores them)
//   update  this frame's tags: [{ kind: 'slam' | 'ram', x, y, z }]
import { TUNING } from '../tuning.js?v=127';
import { reach } from './slam.js?v=127';
import { inLane } from './posts.js?v=127';

const T = TUNING;

export function create(counts = {}) {
  const n = (v) => Math.max(0, Math.min(T.hints.cap, Math.floor(Number(v) || 0)));
  return { slam: n(counts.slam), ram: n(counts.ram), live: new Map(), dirty: false };
}

export const learned = (k, kind) => k[kind] >= T.hints.cap;

// one told thing, in its warning, this frame: the hero in it, or near it; a showing is counted once a warning
function look(k, key, kind, inIt, nearIt, show, out, seen) {
  seen.add(key);
  let r = k.live.get(key);
  if (!r) k.live.set(key, (r = { kind, shown: false, inside: false, out }));
  if (inIt) r.inside = true;
  if (show && nearIt && !r.shown && k[kind] < T.hints.cap) { r.shown = true; k[kind]++; k.dirty = true; }
  return r;
}

// `show`: the tags can be seen (main.js: the game is playing) — a warning that comes while they cannot is not counted
export function update(k, w, show = true) {
  const H = T.hints, tags = [], h = w?.hero;
  if (!k || !h) return tags;
  const seen = new Set();
  // a giant gathering: in its ring is where its slam would hit you now (its reach, + half the hero, as sim/slam.js)
  if (!learned(k, 'slam')) for (const g of w.gels ?? []) {
    const s = g.slam;
    if (!g.alive || s?.phase !== 'warn') continue;
    const R = reach(g) + T.hero.radius * 0.5, d = Math.hypot(h.x - s.x, h.z - s.z);
    // it came (back to idle, so it slammed) and you were out of it
    const out = () => g.alive && g.slam.phase === 'idle' && w.hero.alive && Math.hypot(w.hero.x - s.x, w.hero.z - s.z) >= R;
    const r = look(k, `s${g.id}`, 'slam', h.alive && d < R, h.alive && d < R + H.near, show, out, seen);
    if (r.shown) tags.push({ kind: 'slam', x: s.x, y: g.r * 3 + H.lift, z: s.z });
  }
  // a ram warning: in its lane is where its punch would take you (the hero's whole body in the lane)
  if (!learned(k, 'ram')) (w.posts ?? []).forEach((p, i) => {
    const m = p.ram;
    if (m?.stage !== 'warn') return;
    const hr = T.hero.radius, R = T.posts.worlds[w.world]?.rams;
    if (!R) return;
    const out = () => m.stage !== 'warn' && w.hero.alive && inLane(w, p, w.hero.x, w.hero.z, hr) < 0;
    const r = look(k, `r${i}`, 'ram', h.alive && inLane(w, p, h.x, h.z, hr) >= 0, h.alive && inLane(w, p, h.x, h.z, hr + H.near) >= 0, show, out, seen);
    // where it reads without hiding the hero standing in the lane (over its middle, it did): on the floor just past
    // the lane's end — and when the lane runs across the screen (a ram in an x wall: the camera looks along -z), off
    // to the side of it away from the hero too, as the line of text is far wider than the lane
    const end = m.side * (m.half - R.reach - H.past), off = m.zWalls ? 0 : (h.z > m.along ? -1 : 1) * (p.r + H.beside);
    if (r.shown) tags.push({ kind: 'ram', x: m.zWalls ? m.along : end, y: H.laneY, z: m.zWalls ? end : m.along + off });
  });
  // the warnings that ended since the last frame: one you were in and are out of now is learned
  for (const [key, r] of k.live) {
    if (seen.has(key)) continue;
    k.live.delete(key);
    if (r.inside && !learned(k, r.kind) && r.out()) { k[r.kind] = H.cap; k.dirty = true; }
  }
  return tags;
}
