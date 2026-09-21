// THE HANDS.
//
// The brief names Shredders, and what the air had was a timer: seconds aloft,
// yaw rounded to the nearest 180, and a grab button that set a flag, passed it
// to the landing event for a toast, and PAID NOTHING. It was a dead key. Nothing
// you did with your hands changed a number anywhere in the game.
//
// Two things make an air a trick rather than a wait. It has a NAME, which means
// the choice you made is legible — and a name needs a grab to have an identity,
// so `grab` is no longer a boolean. And it has an ATTITUDE you have to bring
// back, which is what makes holding one a commitment rather than a free bonus.
//
// Pure — no DOM, no three.js, no clock — so the gate reads every trick in bare
// node the way it reads the board and the snowpack.

// The two axes a real grab is named on: which edge the hand reaches over, and
// how far along the board it reaches. `lean` picks the edge because that is the
// edge you are already on; the trim keys pick nose or tail because weighting the
// nose is how you reach the nose. Neither is a new control — the whole table is
// made of inputs the board already has.
//
// `pay` is not flat, and the reason is reach: a hand between the bindings is a
// hand you can put down again, and one past them is a commitment. Nose and tail
// are worth more because they cost more to come back from, which is the same
// argument the game already makes about a dive and about deep snow.
export const GRABS = {
  indy:      { name: 'Indy',      edge: 'toe',  along: 'mid',  pay: 1.00 },
  melon:     { name: 'Melon',     edge: 'heel', along: 'mid',  pay: 1.00 },
  mute:      { name: 'Mute',      edge: 'toe',  along: 'nose', pay: 1.25 },
  nose:      { name: 'Nose',      edge: 'heel', along: 'nose', pay: 1.35 },
  stalefish: { name: 'Stalefish', edge: 'heel', along: 'tail', pay: 1.25 },
  tail:      { name: 'Tail',      edge: 'toe',  along: 'tail', pay: 1.35 },
};

// Which grab the hand finds, from what the rider is already holding at the
// moment it goes down. Chosen ONCE, when the grab starts: a grab you can change
// by moving the stick is a menu, not a grab.
// The edge has a DEADBAND and the neutral answer is Indy. Read as `lean > 0`
// a stick sitting at rest is a heel lean by arithmetic, so a straight air with
// nothing asked for came back a Melon - a name for a choice nobody made. Indy
// is the grab you get for not choosing, which is what it is everywhere else.
export const GRAB_EDGE = 0.25;

export function grabFor(lean, tuck, brake) {
  const toe = (lean || 0) > -GRAB_EDGE;
  if ((tuck || 0) > 0.5) return toe ? 'mute' : 'nose';
  if ((brake || 0) > 0.5) return toe ? 'tail' : 'stalefish';
  return toe ? 'indy' : 'melon';
}

export const SPIN_STEP = 180;          // yaw is called in halves, as it is spoken
const TAU = Math.PI * 2;

// How far the board is from level, given a pitch that may have gone all the way
// round. A COMPLETED flip is level — that is the whole reason the landing test
// can be one number: `cork` decays toward the nearest whole rotation rather than
// toward zero, so going round is a way of getting back, and stopping half way is
// the thing that hurts.
export function offAxis(cork) {
  const c = cork || 0;
  return Math.abs(c - Math.round(c / TAU) * TAU);
}
export function flipsIn(cork) {
  return Math.abs(Math.round((cork || 0) / TAU));
}

// What to call it. The order is the order it is spoken in — the axis, then the
// rotation, then the hand — so "Corked 540 Mute" reads the way a rider says it.
// A plain hop with nothing done in it gets no name at all, because calling a
// 0.4 s pop a trick is how a score stops meaning anything.
export function nameTrick({ air = 0, spin = 0, cork = 0, grab = null, held = 0 } = {}) {
  const spins = Math.round(Math.abs(spin) / Math.PI) * SPIN_STEP;
  const flips = flipsIn(cork);
  const parts = [];
  if (flips >= 1) parts.push(flips === 1 ? 'Flip' : `${flips}× Flip`);
  else if (spins >= SPIN_STEP && offAxis(cork) > 0.5) parts.push('Corked');
  if (spins >= SPIN_STEP) parts.push(String(spins));
  if (grab && held > 0.25) parts.push(GRABS[grab].name);
  if (!parts.length) return air > 0.9 ? 'Floater' : '';
  return parts.join(' ');
}

// What it is worth. Airtime still pays, because hanging up there is the thing
// every other part of the game is spent buying — but it is no longer the ONLY
// thing, which is the change. A grab pays for how long it was held rather than
// for having been pressed, so the decision is when to let go: hold it and the
// board does not come back to level on its own.
// The ORDER is the claim, and it is read off the air distribution rather than
// off how hard each one sounds. A 180 fits every air on the mountain and risks
// nothing, so it is the floor. A flip fits a MEDIAN air (0.60 s of commitment
// in a 0.75 s pop) but has a band in the middle of it where every landing is a
// fall. A 360 needs 0.83 s of yaw, which is the top TENTH of airs. So:
// 180 (202) < Flip (343) < 360 (372), and at 220 the flip paid 263 - a fraction
// over the free one. 300 is what puts it where the measurement says it goes.
export const PAY = { air: 40, spin: 0.9, flip: 300, grab: 95 };

export function scoreTrick({ air = 0, spin = 0, cork = 0, grab = null, held = 0 } = {}) {
  const spins = Math.round(Math.abs(spin) / Math.PI) * SPIN_STEP;
  return air * PAY.air
    + spins * PAY.spin
    + flipsIn(cork) * PAY.flip
    + (grab ? held * PAY.grab * GRABS[grab].pay : 0);
}
