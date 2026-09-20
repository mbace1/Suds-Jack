// IMPACT — what a blow FEELS like, as data (MST_PARITY §2.7).
//
// Through v41 a hit was a white flash and a number. Both say a hit happened;
// neither says how hard. This is the spec for the difference, and it is a pure
// module on purpose — no DOM, no clock, no three.js, no canvas — so the gate
// asserts exact numbers in bare node the way `momentum.js` and `abilities.js`
// are asserted. `anim.js` (the only rAF loop) drives it and `camera.js` applies
// it; neither of them decides anything.
//
// **A TIER IS A SHARE, NOT A NUMBER.** Four damage to a four-HP grunt is a body
// hitting the ground; four to a twelve-HP operator is a scratch. Tiering on raw
// damage would rank those the same and would go stale the moment a weapon or a
// roster changes, so the tier is `damage / maxHp` — which is also the number the
// PLAYER is reading off the HP bar, so what they see and what they feel agree.
//
// **THE INVARIANT STILL HOLDS, AND IT CONSTRAINS THIS FILE.** The player must
// see every consequence before committing, so nothing here may cost information:
//
//  - The shake moves the board and the plate as ONE object (v33's rule), so
//    nothing on the board is displaced relative to anything else. The HUD is DOM
//    outside the stage and never moves at all, which is where the odds, the
//    incoming totals and the objective are read.
//  - The punch is a transient scale and NEVER touches the player's persisted
//    zoom (v34: the zoom is theirs). It returns to exactly 1.
//  - The freeze is a HITSTOP on the animator's clock, not a pause of the game:
//    no input is swallowed and no turn is delayed, the drawing just holds for a
//    beat. It is measured in tens of milliseconds because a hitstop you notice
//    as a pause is a bug.
//
// **Reduced motion takes all three to zero** and leaves the flash, the floater
// and the sound doing the whole job, which is what they did through v41.

// The tiers, coarsest first. `atLeast` is the share of the target's own maximum
// health this blow took. A kill is not a share — it is the end of a thing, and
// it outranks a scratch that happened to finish someone off.
export const TIERS = [
  { id: 'graze', atLeast: 0,    trauma: 0.16, punch: 0,     freeze: 0 },
  { id: 'solid', atLeast: 0.25, trauma: 0.32, punch: 0.010, freeze: 0 },
  { id: 'heavy', atLeast: 0.50, trauma: 0.50, punch: 0.020, freeze: 45 },
  { id: 'kill',  atLeast: null, trauma: 0.72, punch: 0.030, freeze: 110 },
];

export const KILL = TIERS[TIERS.length - 1];
export const NONE = { id: 'none', trauma: 0, punch: 0, freeze: 0 };

// A miss is not nothing — the swing happened — but it is the lightest thing on
// the table and must never be confused with a landed graze.
export const MISS = { id: 'miss', trauma: 0.07, punch: 0, freeze: 0 };

/**
 * The tier one blow earns. `damage` and `maxHp` are the target's own numbers.
 * A kill short-circuits: it is the loudest event in the game whatever it cost.
 */
export function tierFor({ hit = true, killed = false, damage = 0, maxHp = 0 } = {}) {
  if (killed) return KILL;
  if (!hit) return MISS;
  if (damage <= 0) return NONE;
  // An unknown maxHp must not silently promote every hit to the top tier, and
  // must not silently demote it either. Treat it as the middle of the table.
  const share = maxHp > 0 ? damage / maxHp : 0.25;
  let out = TIERS[0];
  for (const t of TIERS) {
    if (t.atLeast === null) continue;           // the kill row is not a share
    if (share >= t.atLeast) out = t;
  }
  return out;
}

// How long trauma takes to fall from full to nothing, in ms. Short: a shake
// still running when the next rival acts is a shake that has stopped meaning
// anything.
export const TRAUMA_MS = 520;
// How long a punch takes to spike and return.
export const PUNCH_MS = 220;
// The largest shake at trauma 1, in BOARD pixels — the same unit SPRITE_H (29)
// and TILE_W (32) are in, and camera.js multiplies by the live CSS scale when
// it composes the transform. That matters: the first cut wrote board pixels
// straight into a CSS transform and a KILL moved the board 1.6px, which at the
// default zoom is about half of one percent of a body and reads as nothing.
// Sizing against the tile is this project's own rule for everything else on
// the board, and it is what makes a hit land the same at any zoom.
export const SHAKE_PX = 9;

/**
 * Trauma is ACCUMULATED, not replaced, and then capped. Two rivals landing in
 * the same phase should feel worse than one, but a swarm must not be able to
 * shake the board apart — which is the failure the cap exists for, on a roster
 * that is weaker-but-numerous by design.
 */
export function addTrauma(current, tier) {
  return Math.min(1, current + (tier ? tier.trauma : 0));
}

/** Linear decay to zero. Takes ms since the last frame. */
export function decayTrauma(current, dtMs) {
  return Math.max(0, current - dtMs / TRAUMA_MS);
}

/**
 * The offset to draw the board at. **Quadratic in trauma**, which is the whole
 * reason trauma is stored rather than an amplitude: a linear shake makes every
 * small hit wobble the screen, while squaring it keeps a graze nearly still and
 * saves the movement for something that deserves it.
 *
 * Deterministic, never random: three incommensurate sines, so the same trauma
 * at the same time is the same offset and a gate can assert it. A shake built
 * out of `Math.random()` cannot be tested and cannot be reproduced from a bug
 * report.
 */
export function shakeAt(trauma, t) {
  if (trauma <= 0) return { x: 0, y: 0 };
  const a = trauma * trauma * SHAKE_PX;
  return {
    x: a * (Math.sin(t / 13.7) * 0.6 + Math.sin(t / 7.3) * 0.4),
    // Less vertical than horizontal: an iso board is wide and short, and
    // vertical movement reads as the ground itself heaving.
    y: a * 0.55 * (Math.sin(t / 9.1) * 0.7 + Math.sin(t / 17.9) * 0.3),
  };
}

/**
 * The zoom multiplier at `elapsed` ms into a punch. Spikes fast and eases back,
 * and **returns to exactly 1** — a punch that leaves a residue would quietly
 * become a change to the player's own zoom, which belongs to them.
 */
export function punchAt(amount, elapsed) {
  if (!amount || elapsed < 0 || elapsed >= PUNCH_MS) return 1;
  const k = elapsed / PUNCH_MS;
  // Out fast (the blow), back slow (the recovery): a symmetric curve reads as
  // a breath rather than as something being struck.
  const shape = k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82;
  return 1 + amount * shape * shape;
}

/**
 * The SFX layers one blow calls for, in the order they should be heard. The
 * kit itself lives in audio.js; this only says what a tier is worth, so a
 * bare-node gate can assert that a kill is louder than a graze without a
 * WebAudio context existing.
 *
 * `at` is a delay in ms. The impact is staggered behind the swing so the two
 * read as cause and effect rather than one cluttered noise — the rule v17's
 * sound pass already followed, kept here and made per-tier.
 */
export function layersFor(tier, { ranged = false, knocked = false } = {}) {
  const out = [{ voice: ranged ? 'ranged' : 'melee', at: 0 }];
  if (tier.id === 'miss') { out.push({ voice: 'miss', at: 40 }); return out; }
  if (tier.id === 'none') return out;
  out.push({ voice: tier.id === 'kill' ? 'down' : 'hit', at: 70 });
  // The body is the loudest thing in this mix (audio.js's own register note),
  // so only a real blow earns the second layer under it.
  if (tier.id === 'heavy' || tier.id === 'kill') out.push({ voice: 'thud', at: 95 });
  if (knocked) out.push({ voice: 'knock', at: 110 });
  return out;
}
