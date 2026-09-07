// The animation layer — plays the cast frame sets on the board.
//
// Three facts about this game shape every decision in here:
//
//  1. **combat.js is pure and bare-node tested.** No animation hook goes in
//     it. Instead this reads `state.log`, the append-only event list combat.js
//     already writes ({type:'move', uid, x, y} / {type:'attack', attackerUid,
//     targetUid, hit, killed, ...}). That log carries the attacker's identity,
//     which a state DIFF cannot recover — a diff only sees the target's hp
//     drop, so it can animate the flinch but never the swing. Same "read
//     events out of the game rather than hooking into it" discipline eeri's
//     dev/FX pack uses, with a better source than polling.
//
//  2. **The game is event-driven — render() fires from onChange(), there is
//     no rAF loop anywhere.** A playing clip needs one, so this owns it. It
//     starts on the first scheduled clip and STOPS itself the moment nothing
//     is animating: a tactics game sits idle on the player's turn for minutes
//     at a time and a permanent rAF would burn a laptop battery to redraw an
//     identical frame.
//
//  3. **Only two of the fourteen characters have frames** (gunner, leopard —
//     the cast/ pilot). Everyone else has one static plate. So every lookup
//     here is allowed to return null, and the renderer keeps its existing
//     `unit.sprite` path for them. Adding a character is one line in CAST
//     once its frames land, not a change to any of this logic.

const CAST_DIR = 'art-src/sprites/cast/';

// Which unit ids have a real 7-pose x 2-facing frame set on disk. The value
// is the file prefix, kept separate from the unit id so a future unit can
// reuse another character's frames without being renamed.
export const CAST = {
  gunner: 'gunner',
  leopard: 'leopard',
};

// [pose, ms] pairs. `Infinity` holds that pose until something else is
// scheduled — which is what makes `idle` a resting state rather than a clip
// that ends, and what leaves a corpse lying in `death-down` rather than
// snapping back to standing.
const CLIPS = {
  idle: [['idle', Infinity]],
  move: [['move', 280], ['idle', Infinity]],
  attack: [['attack-windup', 170], ['attack-release', 260], ['idle', Infinity]],
  hit: [['hit', 300], ['idle', Infinity]],
  death: [['death-fall', 300], ['death-down', Infinity]],
};

export function framePath(prefix, pose, back) {
  return `${CAST_DIR}${prefix}-${pose}${back ? '-back' : ''}.png`;
}

// Feel timings. Deliberately short: this is a tactics game, and an animation
// the player has to WAIT through stops being feedback and becomes a toll on
// every single order. Long enough to read the motion, over before it is in
// the way.
const MOVE_MS_PER_TILE = 85, MOVE_MS_MIN = 130;
const KNOCK_MS = 190, FLASH_MS = 220, FLOAT_MS = 780;

const easeOut = t => 1 - (1 - t) * (1 - t);

// Facing, straight out of render.js's own isometric projection
// (x = (gx-gy)*W/2, y = (gx+gy)*H/2) rather than a hand-kept lookup table:
//
//   screen dx = dgx - dgy   → negative means the move reads LEFT  → mirror
//   screen dy = dgx + dgy   → negative means the move reads UP    → away → back
//
// That is the whole "2 drawn facings cover the board's 4 directions" claim in
// cast/README.md, expressed as the two signs it actually reduces to. The
// board is orthogonal (grid.js), so exactly one of dgx/dgy is ever non-zero
// and both signs are unambiguous.
export function facingFor(dgx, dgy) {
  return { mirror: (dgx - dgy) < 0, back: (dgx + dgy) < 0 };
}

// onEvent fires once per log entry, in order, as sync() reads it. Audio hangs
// off this rather than walking state.log itself: two independent cursors over
// the same list is two chances to double-fire or skip, and they would drift
// the moment one of them was reset and the other was not.
export function createAnimator({ onFrame, onEvent = null, now = () => performance.now() }) {
  // uid → { prefix, clip, i, startedAt, mirror, back }
  const live = new Map();
  // Where each unit stood last time we looked. The move log records the
  // DESTINATION and combat.js has already moved the unit by the time we read
  // it, so the origin is not recoverable from state — we have to carry it.
  const lastPos = new Map();
  // uid -> { fgx, fgy, dur, startedAt }: how far BEHIND its true tile a unit
  // is currently drawn, in fractional tiles. combat.js teleports a unit to its
  // destination the instant the order resolves; this carries the visual back
  // to where it started and lets it catch up, which is the whole difference
  // between a piece appearing somewhere else and a person walking there.
  //
  // Tile space, not screen space, on purpose: toScreen() is linear in
  // (gx, gy), so interpolating tiles and projecting once is identical to
  // interpolating screen positions — and it keeps this file free of layout.
  const tweens = new Map();
  const flashes = new Map();   // uid -> { startedAt, dur }
  const floats = [];           // { gx, gy, text, kind, startedAt, dur }
  let cursor = 0;       // how far through state.log we have read
  let raf = null;

  // units.json's `id` becomes `defId` on the live unit (combat.js makeUnit).
  const prefixFor = unit => (unit && CAST[unit.defId]) || null;

  function schedule(unit, clipName, facing) {
    const prefix = prefixFor(unit);
    if (!prefix) return; // no frame set — the static plate keeps drawing
    const prev = live.get(unit.uid);
    // A death outranks everything: a unit killed by the blow that also made
    // it flinch must not be left playing `hit` over its own corpse.
    if (prev && prev.clip === 'death' && clipName !== 'death') return;
    live.set(unit.uid, {
      prefix,
      clip: clipName,
      i: 0,
      startedAt: now(),
      mirror: facing ? facing.mirror : (prev ? prev.mirror : false),
      back: facing ? facing.back : (prev ? prev.back : false),
    });
    start();
  }

  // Start a unit drawn (fgx, fgy) tiles away from its true position and let
  // it close the gap. Both a walk and a knockback are the same motion with a
  // different origin and clock.
  function glideFrom(uid, fgx, fgy, dur) {
    if (!fgx && !fgy) return;
    tweens.set(uid, { fgx, fgy, dur, startedAt: now() });
    start();
  }

  // Reads whatever combat.js has appended since the last call and turns it
  // into clips. Called from the same onChange() that triggers a render, so
  // it never misses an entry and never replays one.
  function sync(state) {
    const log = state.log || [];
    // A fresh encounter resets the log — rewind rather than reading garbage
    // off the end of a shorter array.
    if (log.length < cursor) { cursor = 0; live.clear(); lastPos.clear(); }
    for (; cursor < log.length; cursor++) {
      const e = log[cursor];
      report(e, state);
      if (e.type === 'move') {
        const u = state.units.find(x => x.uid === e.uid);
        if (!u) continue;
        const from = lastPos.get(e.uid);
        const facing = from ? facingFor(e.x - from.x, e.y - from.y) : null;
        schedule(u, 'move', facing);
        if (from) glideFrom(e.uid, from.x - e.x, from.y - e.y,
          Math.max(MOVE_MS_MIN, (Math.abs(from.x - e.x) + Math.abs(from.y - e.y)) * MOVE_MS_PER_TILE));
      } else if (e.type === 'hazard') {
        // Hazard damage needs its own number or a unit quietly loses health
        // with nothing on screen accounting for it. The event carries the
        // tile, so this works for a burn the unit is standing in as well as
        // for a body that was shoved somewhere fatal.
        const u = state.units.find(x => x.uid === e.uid);
        if (u) {
          flashes.set(u.uid, { startedAt: now(), dur: FLASH_MS });
          if (e.killed) schedule(u, 'death', null);
        }
        floats.push({
          gx: e.x, gy: e.y,
          text: e.lethal ? e.name.toUpperCase() : String(e.damage),
          kind: e.killed ? 'kill' : 'dmg', startedAt: now(), dur: FLOAT_MS,
        });
        start();
      } else if (e.type === 'attack') {
        const a = state.units.find(x => x.uid === e.attackerUid);
        const t = state.units.find(x => x.uid === e.targetUid);
        if (a && t) schedule(a, 'attack', facingFor(t.x - a.x, t.y - a.y));
        // Only a landed blow moves the target. A miss animating a flinch
        // would tell the player they were hit when the roll says they were
        // not — the telegraph/readability contract this game is built on.
        if (t && e.hit) schedule(t, e.killed ? 'death' : 'hit', a ? facingFor(a.x - t.x, a.y - t.y) : null);
        if (t) {
          if (e.hit) {
            flashes.set(t.uid, { startedAt: now(), dur: FLASH_MS });
            // The momentum share is named in the floater rather than folded
            // silently into the total: a hit that suddenly reads 5 instead of
            // 4 with no reason on screen is exactly the unexplained number a
            // full-information game is not allowed to show.
            const text = e.bonus > 0 ? `${e.damage} (+${e.bonus})` : String(e.damage);
            floats.push({ gx: t.x, gy: t.y, text,
              kind: e.killed ? 'kill' : 'dmg', startedAt: now(), dur: FLOAT_MS });
            // A knockback has ALREADY moved the target by the time this event
            // is read, so the glide starts from where it was shoved from.
            if (e.knockback && e.knockback.moved) {
              glideFrom(t.uid, -e.knockback.dx * e.knockback.moved,
                -e.knockback.dy * e.knockback.moved, KNOCK_MS);
            }
          } else {
            floats.push({ gx: t.x, gy: t.y, text: 'MISS', kind: 'miss',
              startedAt: now(), dur: FLOAT_MS });
          }
          start();
        }
      }
    }
    for (const u of state.units) lastPos.set(u.uid, { x: u.x, y: u.y });
  }

  // Split out so the event walk above stays about animation. Called for every
  // entry, including the ones no clip cares about (pickup, enemy-turn).
  function report(e, state) {
    if (onEvent) { try { onEvent(e, state); } catch { /* sound is never fatal */ } }
  }

  // Advances every live clip and reports whether any is still running.
  function settle() {
    const t = now();
    let animating = false;
    for (const [uid, a] of live) {
      const steps = CLIPS[a.clip];
      let elapsed = t - a.startedAt;
      while (a.i < steps.length) {
        const dur = steps[a.i][1];
        if (!Number.isFinite(dur)) break;   // resting pose — hold it
        if (elapsed < dur) break;
        elapsed -= dur;
        a.i++;
        a.startedAt = t - elapsed;
      }
      if (a.i >= steps.length) { live.delete(uid); continue; }
      if (Number.isFinite(steps[a.i][1])) animating = true;
    }
    for (const [uid, tw] of tweens) {
      if (t - tw.startedAt >= tw.dur) tweens.delete(uid); else animating = true;
    }
    for (const [uid, fl] of flashes) {
      if (t - fl.startedAt >= fl.dur) flashes.delete(uid); else animating = true;
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      if (t - floats[i].startedAt >= floats[i].dur) floats.splice(i, 1); else animating = true;
    }
    return animating;
  }

  function tick() {
    raf = null;
    const animating = settle();
    onFrame();
    if (animating) start();
  }

  function start() {
    if (raf == null && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick);
  }

  return {
    sync,
    // What the renderer asks per unit. null = "no frame set, draw the static
    // plate you already had" — the path 12 of 14 characters take today.
    spriteFor(unit) {
      const prefix = prefixFor(unit);
      if (!prefix) return null;
      const a = live.get(unit.uid);
      const pose = a ? CLIPS[a.clip][a.i][0] : 'idle';
      const back = a ? a.back : false;
      return {
        src: framePath(prefix, pose, back),
        mirror: a ? a.mirror : false,
        // The character's IDLE frame, as the scale reference for every other
        // frame of the same character. Sizing each frame to a fixed on-board
        // height independently would divide out the pose: a deep attack
        // crouch is genuinely shorter than full extension, and normalising it
        // away scales the crouch back UP to standing height — erasing the
        // body-height rhythm that is most of what makes an attack read, and
        // making the character appear to swell and shrink between frames.
        // Measured on this cast: gunner's windup and release differ 36.7% in
        // ink height, so this is not a rounding concern.
        refSrc: framePath(prefix, 'idle', back),
      };
    },
    // True while this unit is mid-death — render.js keeps drawing a unit at
    // hp 0 for exactly as long as this says so, otherwise the corpse is
    // filtered out of the draw list on the very frame the death clip starts
    // and the animation is never seen at all.
    isDying(unit) {
      const a = live.get(unit.uid);
      return !!(a && a.clip === 'death');
    },
    // Fractional TILE offset to add to a unit's grid position before
    // projecting it. Zero once the tween has landed, which is most of the
    // time — a tactics board is still between orders.
    offsetFor(unit) {
      const tw = tweens.get(unit.uid);
      if (!tw) return null;
      const k = 1 - easeOut(Math.min(1, (now() - tw.startedAt) / tw.dur));
      return { gx: tw.fgx * k, gy: tw.fgy * k };
    },
    // 0..1, how hard this unit is flashing right now.
    flashFor(unit) {
      const fl = flashes.get(unit.uid);
      if (!fl) return 0;
      return 1 - Math.min(1, (now() - fl.startedAt) / fl.dur);
    },
    // Damage numbers and MISS, with their own rise/fade progress.
    floaters() {
      const t = now();
      return floats.map(f => ({ ...f, k: Math.min(1, (t - f.startedAt) / f.dur) }));
    },
    settle,
    // Full reset, not just "cancel the rAF" — a new encounter is a new log,
    // and leaving the cursor where the last one ended would skip that many
    // entries of the new one. (sync's own rewind only catches the case where
    // the new log is SHORTER than the cursor, which is not guaranteed.)
    stop() {
      if (raf != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      raf = null;
      live.clear();
      lastPos.clear();
      tweens.clear();
      flashes.clear();
      floats.length = 0;
      cursor = 0;
    },
    // for tests / the debug hook
    _live: live,
  };
}
