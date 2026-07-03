// Lightweight cross-run meta-progression — a small, bounded set of permanent stat
// unlocks bought with shards earned per run. Deliberately NOT the old chest/gold/
// stacking-item/teleporter-stage loop (see CLAUDE.md) — just a shop on the title
// screen. Follows the same persisted-state pattern as modes.js.
const K_SHARDS = 'skltrShards', K_UNLOCKS = 'skltrUnlocks';
export let shards = parseInt(localStorage.getItem(K_SHARDS) || '0', 10) || 0;
let levels = JSON.parse(localStorage.getItem(K_UNLOCKS) || '{}');

export const UPGRADES = [
  { id: 'hp',        name: 'VITALITY',        desc: n => `+${12 * n} max HP`,                        maxLevel: 3, cost: lvl => 25 * (lvl + 1) },
  { id: 'dashcd',    name: 'SWIFT DASH',      desc: n => `-${(0.1 * n).toFixed(1)}s dash cooldown`,   maxLevel: 2, cost: lvl => 40 * (lvl + 1) },
  { id: 'firerate',  name: 'QUICK TRIGGER',   desc: n => `-${(0.01 * n).toFixed(2)}s fire interval`,  maxLevel: 2, cost: lvl => 35 * (lvl + 1) },
  { id: 'iframe',    name: 'EXTENDED IFRAME', desc: n => `+${(0.05 * n).toFixed(2)}s dash i-frames`,  maxLevel: 2, cost: lvl => 30 * (lvl + 1) },
  { id: 'headstart', name: 'HEAD START',      desc: () => 'start each run at Adrenaline tier 1',      maxLevel: 1, cost: () => 80 },
];

export function levelOf(id) { return levels[id] || 0; }
export function addShards(n) { shards += n; localStorage.setItem(K_SHARDS, String(shards)); }
export function canBuy(id) {
  const u = UPGRADES.find(u => u.id === id), lvl = levelOf(id);
  return !!u && lvl < u.maxLevel && shards >= u.cost(lvl);
}
export function buy(id) {
  if (!canBuy(id)) return false;
  const u = UPGRADES.find(u => u.id === id), lvl = levelOf(id);
  shards -= u.cost(lvl); levels[id] = lvl + 1;
  localStorage.setItem(K_SHARDS, String(shards)); localStorage.setItem(K_UNLOCKS, JSON.stringify(levels));
  return true;
}
export function resolvedStats() {
  const s = {};
  const hp = levelOf('hp'); if (hp) s.maxHp = 100 + hp * 12;
  const dc = levelOf('dashcd'); if (dc) s.dashCD = Math.max(0.8, 1.0 - dc * 0.1);
  const fr = levelOf('firerate'); if (fr) s.fireInterval = Math.max(0.09, 0.11 - fr * 0.01);
  const ifr = levelOf('iframe'); if (ifr) s.iframe = 0.34 + ifr * 0.05;
  if (levelOf('headstart')) s.startAdr = 1;
  return s;
}
