// Stacking passive items — the heart of the RoR2-style build. Each item's `apply`
// mutates the running stat block by its stack count, so picking up duplicates stacks
// linearly (more damage, faster fire, more forks, …). Chests roll by rarity weight.

export const BASE_STATS = () => ({
  damage: 12,          // primary hit damage
  fireInterval: 0.30,  // seconds between primary shots (lower = faster)
  critChance: 0.05,
  critMult: 2,
  moveSpeed: 7.0,
  maxHp: 110,
  regen: 1.0,          // hp / sec
  forks: 0,            // extra primary projectiles, fanned
  pierce: 0,           // extra enemies a projectile passes through
  lifesteal: 0,        // hp healed per enemy hit
  goldMult: 1,
  pickupR: 2.2,
});

// id, name, rarity, one-line effect, apply(stats, n)
export const ITEMS = [
  // ── common ──
  { id: 'edge',   name: 'WHETSTONE',  rarity: 'common', desc: '+3 damage',          apply: (s, n) => s.damage += 3 * n },
  { id: 'tempo',  name: 'OVERCLOCK',  rarity: 'common', desc: '+attack speed',      apply: (s, n) => s.fireInterval /= (1 + 0.13 * n) },
  { id: 'treads', name: 'TREADS',     rarity: 'common', desc: '+move speed',        apply: (s, n) => s.moveSpeed += 0.7 * n },
  { id: 'cell',   name: 'REGEN CELL', rarity: 'common', desc: '+1.2 hp/s regen',     apply: (s, n) => s.regen += 1.2 * n },
  { id: 'lens',   name: 'FOCUS LENS', rarity: 'common', desc: '+7% crit',           apply: (s, n) => s.critChance += 0.07 * n },
  { id: 'coin',   name: 'LODESTONE',  rarity: 'common', desc: '+gold, +pickup',     apply: (s, n) => { s.goldMult += 0.25 * n; s.pickupR += 0.5 * n; } },
  // ── uncommon ──
  { id: 'fork',   name: 'SPLITTER',   rarity: 'uncommon', desc: '+1 projectile',    apply: (s, n) => s.forks += n },
  { id: 'leech',  name: 'LEECH',      rarity: 'uncommon', desc: 'heal 2 / hit',     apply: (s, n) => s.lifesteal += 2 * n },
  { id: 'plate',  name: 'CARAPACE',   rarity: 'uncommon', desc: '+35 max hp',       apply: (s, n) => s.maxHp += 35 * n },
  { id: 'crit2',  name: 'HAIRTRIGGER',rarity: 'uncommon', desc: '+crit & +dmg',     apply: (s, n) => { s.critChance += 0.05 * n; s.damage += 2 * n; } },
  // ── rare ──
  { id: 'pierce', name: 'RAILSPIKE',  rarity: 'rare', desc: 'pierce +2',            apply: (s, n) => s.pierce += 2 * n },
  { id: 'titan',  name: 'BULWARK',    rarity: 'rare', desc: '+70 hp, +2 regen',     apply: (s, n) => { s.maxHp += 70 * n; s.regen += 2 * n; } },
  { id: 'rage',   name: 'BERSERKER',  rarity: 'rare', desc: '+7 dmg, +atk spd',     apply: (s, n) => { s.damage += 7 * n; s.fireInterval /= (1 + 0.18 * n); } },
];

const BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const itemById = id => BY_ID[id];

const WEIGHTS = { common: 0.79, uncommon: 0.19, rare: 0.02 };
export function rollItem() {
  const r = Math.random();
  const rarity = r < WEIGHTS.rare ? 'rare' : r < WEIGHTS.rare + WEIGHTS.uncommon ? 'uncommon' : 'common';
  const pool = ITEMS.filter(i => i.rarity === rarity);
  return pool[(Math.random() * pool.length) | 0];
}

// Inventory → resolved stat block.
export function computeStats(inv) {
  const s = BASE_STATS();
  for (const [id, n] of inv) { const it = BY_ID[id]; if (it) it.apply(s, n); }
  s.fireInterval = Math.max(0.05, s.fireInterval);
  return s;
}
