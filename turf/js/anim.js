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

import { REST_YAW } from './standee.js?v=2';

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


// ── POSTURE: the motion that does not need a frame ─────────────────
//
// Owner, 2026-09-06: "can the TURF asset pipeline just make a standing
// cardboard character, that is then just moved to animate, while only the
// art frame changes when it's an already approved concept like 'attack with
// knife'... similar to Paper Mario, with movement more on the physical
// object and much less frames of animation."
//
// It can, and the repo had already proved both halves of it:
//
//   * ART_REQUEST §2.2 MEASURED which rows a generator can actually deliver.
//     IDLE and MOVE come back usable; ATTACK/HIT/DIE fail on every sheet
//     tested, for two independent reasons (motion FX keyed against a flat
//     background is an unsolvable conflict, and the frame pitch on those
//     rows is not uniform so a fixed-cell slice cannot extract them).
//   * spritecheck.py's standing lesson is that no similarity metric
//     separates a pose change from a camera change — a regenerated attack
//     pair passed every IoU check and was still wrong.
//   * So the seven-pose contract asked art for exactly the frames that
//     cannot be produced, and the result is on disk: TWO of fourteen
//     operators have a frame set. The other twelve are single plates that
//     slide across the board like stickers.
//   * slaykallio/js/puppet.js already ships the alternative — a flat cutout,
//     mirrored by negative scale, that TOPPLES about its feet on an axis
//     tilted into the scene when it dies, precisely because a cutout tipping
//     in the picture plane reads as a sprite rotating while one tipping into
//     the scene reads as a thing that was standing there.
//
// So the motion lives here now, as a transform, and the art contract drops
// to a standing plate. A frame swap is still honoured wherever frames exist
// (spriteFor is untouched) — it is an upgrade for an approved pose, not the
// price of admission for having a character move at all.
//
// Every value is in the units the renderer wants: `hop` and `lean` in board
// pixels and radians about the FEET, `squash` as a signed stretch, `tip`
// 0..1 for the topple. A unit doing nothing returns `IDLE_POSTURE`, which is
// not quite zero — a board of perfectly still cutouts reads as a paused game.
// yaw/pitch are the CARD's own angles (standee.js), not screen rotations:
// yaw turns it about its vertical axis and shows its cut edge, pitch takes
// it over onto the floor. `lean` survives as a small picture-plane tilt for
// the swing, because a body leaning into a blow really does tilt.
const IDLE_POSTURE = { hop: 0, yaw: REST_YAW, pitch: 0, lean: 0, squash: 0, dir: 1 };

// Deliberately small. This is a tactics board, not a platformer: the motion
// has to say "that one moved" and then get out of the way of the numbers
// the player is actually reading.
const HOP_H = 3.2;        // board px at the top of a stride
const LEAN_MAX = 0.10;    // radians, leaning into travel
const LUNGE = 2.6;        // board px thrown toward the target on a swing
const RECOIL = 2.2;       // board px thrown away from a hit
const BREATH_H = 0.5;     // idle bob, barely there and never zero
const TURN_YAW = 1.30;    // radians the card sweeps through mid-turn
// 70 degrees, not 90. A card taken all the way flat foreshortens to nothing
// and reads as a smear; stopping short leaves a body on the floor that is
// still legibly a body, and the extrusion showing as its top face does the
// rest of the work.
const FALL_PITCH = 1.22;

// Progress through the CURRENT step of a clip, 0..1. Takes the clock rather
// than reading one, so it stays as testable in bare node as the rest of this
// file — every timing in the suite is driven off an injected `now`.
function clipProgress(a, t) {
  const steps = CLIPS[a.clip];
  const dur = steps[a.i][1];
  if (!Number.isFinite(dur)) return 1;
  return Math.min(1, Math.max(0, (t - a.startedAt) / dur));
}

// The whole motion vocabulary, in one function, keyed off the clip the unit
// is already playing. Nothing new is tracked: `sync` has always known when a
// unit walked, swung, was hit or died — that knowledge simply had nowhere to
// go except a filename.
export function postureFor(a, tw, t) {
  const p = { ...IDLE_POSTURE };
  // Which way this motion reads on screen. render.js's projection puts +x to
  // the lower right and +y to the lower left, so the sign of (dgx - dgy) is
  // the same left/right the mirror is chosen from — one rule, two uses.
  const dir = a && a.mirror ? -1 : 1;
  p.dir = dir;

  // TRAVEL. The tween is the authority on whether a unit is between tiles,
  // because a knockback moves a unit with no clip at all. Two strides per
  // tile crossed, an arc that never quite leaves the ground.
  if (tw) {
    const k = Math.min(1, Math.max(0, (t - tw.startedAt) / tw.dur));
    const strides = Math.max(1, Math.round(Math.hypot(tw.fgx, tw.fgy) * 2));
    p.hop = Math.abs(Math.sin(k * Math.PI * strides)) * HOP_H;
    // Squash at each footfall — the arc's own low points, so the two cannot
    // drift out of phase the way two independent clocks would.
    const land = Math.max(0, -Math.cos(k * Math.PI * 2 * strides));
    p.squash = land * 0.07;
    // THE TURN, and this is the standee's signature move. A card does not
    // mirror-flip; it swings round its own vertical axis and goes briefly
    // edge-on. So a unit setting off sweeps its yaw through TURN_YAW and
    // settles back to its resting angle — the same motion Paper Mario uses
    // whenever a character changes which way it is looking.
    p.yaw = dir * (REST_YAW + Math.sin(Math.min(1, k * 2.2) * Math.PI) * (TURN_YAW - REST_YAW));
    p.lean = dir * LEAN_MAX * 0.5 * Math.sin(Math.min(1, k * 3) * Math.PI / 2);
  } else {
    p.yaw = dir * REST_YAW;
  }

  if (!a) return p;
  const k = clipProgress(a, t);
  const pose = CLIPS[a.clip][a.i][0];

  // THE SWING. A lunge out and back, with the body leaning past its feet at
  // full extension — which is the whole reason a windup and a release read
  // as one motion rather than two pictures.
  if (pose === 'attack-windup') {
    p.lean = -dir * LEAN_MAX * 0.9 * k;
    p.hop += 0.6 * k;
    // Turning square-on to wind up, so the swing reads as being thrown at
    // something rather than performed side-on to the camera.
    p.yaw = dir * (REST_YAW + 0.34 * k);
  } else if (pose === 'attack-release') {
    const punch = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
    p.lean = dir * LEAN_MAX * 1.6 * punch;
    p.lunge = dir * LUNGE * punch;
    p.squash = 0.05 * punch;
    p.yaw = dir * (REST_YAW + 0.34 * (1 - punch));
  }
  // TAKING ONE. Thrown back and tipped away from the blow, snapping upright.
  else if (pose === 'hit') {
    const g = 1 - k;
    p.lean = -dir * LEAN_MAX * 1.3 * g;
    p.lunge = -dir * RECOIL * g;
    p.squash = -0.06 * g;
  }
  // THE TOPPLE, straight out of slaykallio/js/puppet.js and for its reason:
  // a cutout that tips in the PICTURE plane reads as a sprite being rotated,
  // and one that tips INTO the scene reads as a thing that was standing
  // there. render.js does the second by pairing the rotation with a vertical
  // squash, so the figure shortens as it goes over.
  else if (pose === 'death-fall') {
    // Over it goes, accelerating the way something toppling actually does —
    // slow off the balance point, fast into the floor.
    p.pitch = FALL_PITCH * (k * k);
    p.hop = Math.sin(k * Math.PI) * 1.4;
    // Squaring up as it falls: a card going over shows its face to the
    // camera, which is both what reads best and what a falling standee does.
    p.yaw = dir * REST_YAW * (1 - k);
  } else if (pose === 'death-down') { p.pitch = FALL_PITCH; p.yaw = dir * 0.12; }
  // Nothing is ever perfectly still. A board of frozen cutouts reads as a
  // paused game, and this is the cheapest possible answer to that: half a
  // pixel, on a slow clock offset per unit so the squad does not breathe in
  // unison like a chorus line.
  return p;
}

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
// Stable per-unit phase for the idle breath. A uid, not an index: a unit's
// rhythm must not change because somebody died earlier in the array.
function hashUid(uid) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
  return Math.abs(h);
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
    // The transform to draw this unit under — see postureFor's header. Idle
    // gets a breath here rather than inside postureFor because the phase is
    // per-unit and postureFor is deliberately pure.
    postureFor(unit) {
      const p = postureFor(live.get(unit.uid), tweens.get(unit.uid), now());
      if (!live.has(unit.uid) && !tweens.has(unit.uid)) {
        const phase = (hashUid(unit.uid) % 1000) / 1000 * Math.PI * 2;
        p.hop = (Math.sin(now() / 1400 + phase) * 0.5 + 0.5) * BREATH_H;
      }
      return p;
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
