// bosskit.js — what the worlds' own bosses share (v45: CURB KING, MAW,
// BLISTER, KETTLE, PIKE, BERG, ANGLER): their rage. Each fights one way until
// its health falls to `rage.at` of its whole, then — once, only ever up, a
// boss's only — it rages: the banner (`phase`, as OMEGA's act change and the
// TWIN PRISMS' rage are), a shake, and from then on its harder pattern.
// g.s.enraged is what the boss aura reads (render/looks/bossaura.js).
export function rage(w, g, S) {
  const s = g.s;
  if (s.enraged || !g.isBoss || g.hp > g.maxHp * S.rage.at) return !!s.enraged;
  s.enraged = true;
  w.events.push({ type: 'phase', id: g.id, kind: g.kind, phase: 2, x: g.x, z: g.z, label: S.rage.label, dur: S.rage.banner, shake: S.rage.shake });
  w.events.push({ type: 'shake', amount: S.rage.shake, id: g.id, kind: g.kind, x: g.x, z: g.z });
  return true;
}

export const range = (w, [a, b]) => a + w.rng.next() * (b - a);

// the hero's direction from (x, z), and how far
export function toHero(w, x, z) {
  const dx = w.hero.x - x, dz = w.hero.z - z, d = Math.hypot(dx, dz) || 1e-6;
  return { ux: dx / d, uz: dz / d, d };
}

// a point kept `m` inside the walls
export const inside = (w, x, z, m) => ({ x: Math.max(-w.hx + m, Math.min(w.hx - m, x)), z: Math.max(-w.hz + m, Math.min(w.hz - m, z)) });
