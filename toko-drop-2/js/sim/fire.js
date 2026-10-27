// fire.js — every way a body puts bullets on the floor: 1.x's primitives
// (bullets-graze.md §5.1). "Aim" is the angle from (x, z) to the hero at the
// moment of firing. Bullets spawn at the body's centre; speed is the base
// gel bullet speed × speedMult (1.x never escalates bullet speed by wave).
import { TUNING } from '../tuning.js?v=50';

const B = TUNING.bullets;

// One gel bullet. opts: { color, src, speedMult, homing (turn rate, rad/s),
// radius, revenge, life }. Returns the bullet, or null when the pool is full.
export function emit(w, x, z, angle, opts = {}) {
  if (w.gelBullets >= B.maxGel) { w.refused++; return null; }
  const speed = B.gelSpeed * (opts.speedMult ?? 1);
  const b = {
    x, z, px: x, pz: z, vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, speed,
    r: opts.radius ?? B.gelRadius, life: opts.life ?? B.life, hero: false,
    color: opts.color ?? B.gelColor, src: opts.src ?? null, revenge: !!opts.revenge,
    homing: opts.homing ?? 0, grazed: false, dead: false,
  };
  w.bullets.push(b); w.gelBullets++;
  return b;
}

// Same, starting from a point but flying along a direction (dx, dz).
export function emitDir(w, x, z, dx, dz, opts) { return emit(w, x, z, Math.atan2(dz, dx), opts); }

export const aimAngle = (w, x, z) => Math.atan2(w.hero.z - z, w.hero.x - x);

// RING: n evenly spaced, the first at `base`.
export function ring(w, x, z, n, base, opts) { for (let i = 0; i < n; i++) emit(w, x, z, base + (i * Math.PI * 2) / n, opts); }

// FAN by SPAN: n shots, endpoints included, centred on base.
export function fanSpan(w, x, z, base, n, span, opts) {
  for (let j = 0; j < n; j++) emit(w, x, z, n > 1 ? base - span / 2 + (j * span) / (n - 1) : base, opts);
}

// FAN by STEP: n shots `step` apart, centred on base.
export function fanStep(w, x, z, base, n, step, opts) {
  for (let j = 0; j < n; j++) emit(w, x, z, base + (j - (n - 1) / 2) * step, opts);
}

// WALL: n parallel bullets on a line square to (dx, dz), `width` wide.
export function wall(w, x, z, dx, dz, n, width, opts) {
  const l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, px = -uz, pz = ux, a = Math.atan2(uz, ux);
  for (let s = 0; s < n; s++) {
    const t = n > 1 ? (s / (n - 1) - 0.5) * width : 0;
    emit(w, x + px * t, z + pz * t, a, opts);
  }
}

// CURTAIN: `slots` bullets `spacing` apart across a line through (x, z)
// along (lx, lz), all marching along (dx, dz); `gaps` is a set of slot
// indices left empty.
export function curtain(w, x, z, lx, lz, dx, dz, slots, spacing, gaps, opts) {
  const ll = Math.hypot(lx, lz) || 1, ux = lx / ll, uz = lz / ll, a = Math.atan2(dz, dx);
  for (let s = 0; s < slots; s++) {
    if (gaps && gaps.has(s)) continue;
    const t = (s - (slots - 1) / 2) * spacing;
    emit(w, x + ux * t, z + uz * t, a, opts);
  }
}

// A ballistic lob (not a pool bullet): flies from (x, z) to land at (tx, tz)
// after `flight` seconds, peaking at `height`; on landing it hurts the hero
// inside `splash` and may leave a hazard behind (opts.hazard {r, life}).
export function lob(w, x, z, tx, tz, flight, height, opts = {}) {
  w.lobs.push({ x, z, px: x, pz: z, y: 0.5, x0: x, z0: z, tx, tz, t: 0, flight, height,
    splash: opts.splash ?? 1.0, color: opts.color ?? B.gelColor, src: opts.src ?? null, hazard: opts.hazard ?? null, size: opts.size ?? 0.3 });
}

// A hazard on the floor: hurts the hero who stands in it (once per entry,
// mercy rules apply). opts: { r, life, src, color, kind }.
export function hazard(w, x, z, opts) {
  w.hazards.push({ x, z, r: opts.r, life: opts.life, max: opts.life, src: opts.src ?? null, color: opts.color ?? 0xaaee00, kind: opts.kind ?? 'pool' });
}
