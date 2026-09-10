// crowd.js — the swarm's spacing, in one place.
//
// v245 (owner: "fix the swarm clumping"; found by the LOOK pass, motion loops
// decoded to frames). Nine bodies pursuing one point ended as ONE body's
// width of overlapping gel: the engine's solver only ever answered overlap
// after the fact, and every frame the pursuit closed the gap it had just
// opened, so a school became a pile at exactly the range where reading which
// body is charging and which is circling matters.
//
// Three terms, in one pair walk:
//
//   RESOLVE  the old solver, byte-for-byte: two bodies inside CONTACT are
//            split apart by half the overlap each. Unchanged — the check
//            below pins it to the inline code it replaced.
//   COMFORT  a FOLLOWING DISTANCE. When two bodies are inside comfort ×
//            contact of each other, the one BEHIND (farther from the target,
//            and actually closing on it) is held back — pushed straight away
//            from the target at up to `push` u/s at contact, fading to
//            nothing at the comfort radius. A pursuer settles where that
//            push balances its own speed, so a slow body stands further off
//            the one ahead than a fast one does, and the pack arrives in
//            shells with air between them instead of compressing to contact.
//            The first cut pushed neighbours apart along the PAIR axis, and
//            that did nothing: side by side in a ring they only push each
//            other along the ring, never out of it, and the pile was the
//            same size to the centimetre. The check below is what said so.
//   SLIDE    the body behind flows round the body ahead: the pair's tangent,
//            signed toward the side the target already lies on. This is
//            what turns a queue into a fan — arrivals from one door spread
//            round the player instead of stacking on the line to it.
//
//   PAD      the contact distance itself, 0.25 → 0.6. This is the number
//            that moved the picture. A swarm that bites you ENDS packed on
//            you whatever the approach looked like; what decides whether
//            that pack reads as bodies or as one mass is the air between
//            them, and a body drawn at 1.05 × its radius with 0.25 of gap
//            is drawn touching. At 0.6 each body has half a body of floor
//            round it. Nine bodies still reach the player; four can bite at
//            once instead of five.
//
// A body that is not closing on the target (a holder at range, a turret, a
// boss circling) is never held back — it is not tailgating anyone — and a
// boss is never the body that yields. The hard resolve keeps its old even
// split, so nothing already balanced has moved. Numbers were chosen by a
// sweep at 60 and 30 fps (crowd-check.mjs pins that they agree).
//
// Everything is dt-scaled and rng-free. `anchored` bodies are never moved.
// Numbers live in TUNING.crowd; the defaults here are the ones it ships.

export const CROWD_DEFAULTS = { pad: 0.6, comfort: 1.5, push: 4.0, slide: 5.0, passes: 2 };

/**
 * @param enemies  bodies with {position:{x,z}, radius, alive, _affix, _velX, _velZ, _isBoss, _flopActive, _flopX0, _flopZ0}
 * @param dt       seconds this frame
 * @param halfX    arena half-extents (the clamp the old solver applied)
 * @param halfZ
 * @param target   {x, z} the point they are all going for — the SLIDE needs it; null disables the slide
 * @param cfg      TUNING.crowd
 */
export function resolveCrowd(enemies, dt, halfX, halfZ, target, cfg = CROWD_DEFAULTS) {
  const pad = cfg.pad ?? 0.25;
  const comfortK = Math.max(1, cfg.comfort ?? 1);
  const push = cfg.push ?? 0, slide = cfg.slide ?? 0;
  const passes = cfg.passes ?? 2;
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      if (!a.alive || a._affix === 'anchored') continue;
      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j];
        if (!b.alive || b._affix === 'anchored') continue;
        const dx = a.position.x - b.position.x;
        const dz = a.position.z - b.position.z;
        const d = Math.hypot(dx, dz);
        if (d <= 0.001) continue;
        const contact = a.radius + b.radius + pad;
        const comfort = contact * comfortK;
        if (d >= comfort) continue;
        const nx = dx / d, nz = dz / d;
        let ax = 0, az = 0, bx = 0, bz = 0;
        // RESOLVE — the old solver
        if (d < contact) {
          const over = (contact - d) * 0.5;
          ax += nx * over; az += nz * over; bx -= nx * over; bz -= nz * over;
        }
        // COMFORT and SLIDE — once per frame, in the first pass, dt-scaled,
        // and only when there is a target to be behind on
        if (pass === 0 && comfort > contact && target && (push > 0 || slide > 0)) {
          const k = 1 - Math.max(0, d - contact) / (comfort - contact);   // 1 at contact → 0 at comfort
          const da = Math.hypot(a.position.x - target.x, a.position.z - target.z);
          const db = Math.hypot(b.position.x - target.x, b.position.z - target.z);
          const back = da > db ? a : b;
          const gd = back === a ? da : db;
          if (!back._isBoss && gd > 1e-6) {
            const gx = (target.x - back.position.x) / gd, gz = (target.z - back.position.z) / gd;   // toward the target
            const closing = (back._velX ?? 0) * gx + (back._velZ ?? 0) * gz;                       // u/s along it
            if (closing > 0.5) {
              // the following distance: hold the tailgater off the body ahead
              const h = k * push * dt;
              let tx = -nz, tz = nx;                                   // the pair's tangent…
              if (tx * gx + tz * gz < 0) { tx = -tx; tz = -tz; }       // …toward the target's side
              const m = k * slide * dt;
              if (back === a) { ax += -gx * h + tx * m; az += -gz * h + tz * m; }
              else            { bx += -gx * h + tx * m; bz += -gz * h + tz * m; }
            }
          }
        }
        if (ax || az) {
          a.position.x += ax; a.position.z += az;
          if (a._flopActive) { a._flopX0 += ax; a._flopZ0 += az; }   // keep the tumble in step with the nudge
          a.position.x = Math.max(-halfX + a.radius, Math.min(halfX - a.radius, a.position.x));
          a.position.z = Math.max(-halfZ + a.radius, Math.min(halfZ - a.radius, a.position.z));
        }
        if (bx || bz) {
          b.position.x += bx; b.position.z += bz;
          if (b._flopActive) { b._flopX0 += bx; b._flopZ0 += bz; }
          b.position.x = Math.max(-halfX + b.radius, Math.min(halfX - b.radius, b.position.x));
          b.position.z = Math.max(-halfZ + b.radius, Math.min(halfZ - b.radius, b.position.z));
        }
      }
    }
  }
}
