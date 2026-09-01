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

export function createAnimator({ onFrame, now = () => performance.now() }) {
  // uid → { prefix, clip, i, startedAt, mirror, back }
  const live = new Map();
  // Where each unit stood last time we looked. The move log records the
  // DESTINATION and combat.js has already moved the unit by the time we read
  // it, so the origin is not recoverable from state — we have to carry it.
  const lastPos = new Map();
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
      if (e.type === 'move') {
        const u = state.units.find(x => x.uid === e.uid);
        if (!u) continue;
        const from = lastPos.get(e.uid);
        const facing = from ? facingFor(e.x - from.x, e.y - from.y) : null;
        schedule(u, 'move', facing);
      } else if (e.type === 'attack') {
        const a = state.units.find(x => x.uid === e.attackerUid);
        const t = state.units.find(x => x.uid === e.targetUid);
        if (a && t) schedule(a, 'attack', facingFor(t.x - a.x, t.y - a.y));
        // Only a landed blow moves the target. A miss animating a flinch
        // would tell the player they were hit when the roll says they were
        // not — the telegraph/readability contract this game is built on.
        if (t && e.hit) schedule(t, e.killed ? 'death' : 'hit', a ? facingFor(a.x - t.x, a.y - t.y) : null);
      }
    }
    for (const u of state.units) lastPos.set(u.uid, { x: u.x, y: u.y });
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
      return { src: framePath(prefix, pose, back), mirror: a ? a.mirror : false };
    },
    // True while this unit is mid-death — render.js keeps drawing a unit at
    // hp 0 for exactly as long as this says so, otherwise the corpse is
    // filtered out of the draw list on the very frame the death clip starts
    // and the animation is never seen at all.
    isDying(unit) {
      const a = live.get(unit.uid);
      return !!(a && a.clip === 'death');
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
      cursor = 0;
    },
    // for tests / the debug hook
    _live: live,
  };
}
