// chart.js — a campaign room's PROGRESSION CHART (CAMPAIGN_PLAN.md), drawn
// from its level file before you play it: what arrives over the room's clock,
// stacked in two-second bins and coloured by gel (a boss outlined in gold),
// and over it what the room asks — its gates and orbs as ticks, a gauntlet's
// stages as seams, a quota's line, a floor's size as it moves, and the clock
// speeding up. And the ROUTE: the thirty rooms' difficulty as one line, each
// room a dot in the colour of the grade you have paid on it.
import { TUNING } from './tuning.js?v=32';
import { speciesOf, goalOf, modsOf } from './sim/challenge.js?v=32';
import { levelShape } from './sim/shape.js?v=32';

const T = TUNING;
export const GRADE_COLORS = { S: '#ffdd44', A: '#66ffcc', B: '#88ccff', C: '#bbbbdd', F: '#ff6655' };
const hex = (n) => `#${(n >>> 0).toString(16).padStart(6, '0')}`;

function canvas(w, h) {
  const c = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  c.style.width = `${w}px`; c.style.height = `${h}px`;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  return { c, g };
}

// the bins of one room: per two seconds, the bodies arriving, by species
export function roomBins(level, bin = 2) {
  const n = Math.max(1, Math.ceil(level.duration / bin)), bins = Array.from({ length: n }, () => []);
  for (const s of level.spawns) {
    const k = speciesOf(s.type);
    if (!k) continue;
    bins[Math.min(n - 1, Math.floor(s.t / bin))].push({ k, boss: !!s.boss, elite: !!s.elite });
  }
  return bins;
}

export function roomChart(level, { width = 220, height = 34 } = {}) {
  const { c, g } = canvas(width, height), D = level.duration, bins = roomBins(level), goal = goalOf({ level }), mods = modsOf({ level });
  const top = 3, base = height - 3, tall = base - top, x = (t) => (t / D) * width;
  const peak = Math.max(4, ...bins.map((b) => b.length));
  const bw = width / bins.length;
  g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, top, width, tall);
  // a moving floor: its area over the clock, as a pale band behind the bars
  if ((level.arena?.shapes ?? []).some((p) => p.orbit || p.pulse)) {
    const area = (t) => { const s = levelShape(level, false, t); let n = 0; const b = s.aabb(); for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) if (s.sdf(((i + 0.5) / 12 - 0.5) * 2 * b.halfX, ((j + 0.5) / 12 - 0.5) * 2 * b.halfZ) <= 0) n++; return n; };
    const a0 = Math.max(1, area(0));
    g.fillStyle = 'rgba(140,200,255,0.16)'; g.beginPath(); g.moveTo(0, base);
    for (let i = 0; i <= 40; i++) { const t = (i / 40) * D; g.lineTo(x(t), base - (area(t) / a0) * tall); }
    g.lineTo(width, base); g.closePath(); g.fill();
  }
  // escalation: the clock's steps
  if (mods.escalate) {
    g.strokeStyle = 'rgba(255,140,80,0.6)'; g.beginPath();
    for (let t = 0, k = 1; t < D; t += mods.escalate.every, k += mods.escalate.speed) { const y = base - Math.min(1, (k - 1) / 1) * tall * 0.9; g.moveTo(x(t), y); g.lineTo(x(Math.min(D, t + mods.escalate.every)), y); }
    g.stroke();
  }
  // the arrivals
  bins.forEach((b, i) => {
    let y = base;
    for (const s of b) {
      const h = tall / peak;
      g.fillStyle = hex(T.species[s.k]?.color ?? 0x888888);
      g.fillRect(i * bw + 1, y - h + 0.5, bw - 2, h - 1);
      if (s.boss || s.elite) { g.strokeStyle = s.boss ? '#ffdd44' : '#ff66cc'; g.lineWidth = 1; g.strokeRect(i * bw + 1.5, y - h + 1, bw - 3, h - 2); }
      y -= h;
    }
  });
  // what the room asks, over it
  const tick = (t, col) => { g.fillStyle = col; g.fillRect(x(t) - 1, top, 2, tall); };
  for (const q of level.gates ?? []) tick(q.t, 'rgba(120,255,170,0.9)');
  for (const o of goal.orbs ?? []) tick(o.t, 'rgba(255,200,70,0.9)');
  for (const s of goal.stages ?? []) if (s.at > 0) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x(s.at), top, 1, tall); }
  if (goal.type === 'quota') {
    // where the count can first be met: the arrival of the last body it needs
    const ts = level.spawns.map((s) => s.t).sort((a, b) => a - b), at = ts[Math.min(ts.length, goal.kills) - 1] ?? 0;
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.setLineDash([2, 2]); g.beginPath(); g.moveTo(x(at), top); g.lineTo(x(at), base); g.stroke(); g.setLineDash([]);
  }
  if (goal.type === 'hold') { g.fillStyle = 'rgba(68,255,204,0.5)'; g.fillRect(0, base - 2, x(goal.need), 2); }
  if (goal.type === 'protect') { g.fillStyle = '#ff3355'; g.beginPath(); g.arc(width - 6, top + 5, 3, 0, Math.PI * 2); g.fill(); }
  c.className = 'chart';
  return c;
}

// the route: the rooms' difficulty in play order, a dot per room in its grade's colour
export function routeChart(rooms, { width = 300, height = 46, focus = null } = {}) {
  const { c, g } = canvas(width, height), n = rooms.length, pad = 6;
  const x = (i) => pad + (i / Math.max(1, n - 1)) * (width - pad * 2), y = (d) => height - pad - ((d - 1) / 9) * (height - pad * 2);
  // the worlds behind it
  let w0 = 0;
  rooms.forEach((r, i) => { if (i === n - 1 || rooms[i + 1].world !== r.world) { g.fillStyle = `${r.rail}22`; g.fillRect(x(w0) - 3, 0, x(i) - x(w0) + 6, height); w0 = i + 1; } });
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5; g.beginPath();
  rooms.forEach((r, i) => (i ? g.lineTo(x(i), y(r.d)) : g.moveTo(x(i), y(r.d))));
  g.stroke();
  rooms.forEach((r, i) => {
    g.fillStyle = r.grade ? GRADE_COLORS[r.grade] : r.open ? '#ffffff' : '#555566';
    g.beginPath(); g.arc(x(i), y(r.d), r.id === focus ? 4.5 : 3, 0, Math.PI * 2); g.fill();
    if (r.id === focus) { g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.stroke(); }
  });
  c.className = 'route';
  return c;
}
