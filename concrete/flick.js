// Adapted from preserved Tiny Hawk v6 FlickIt. Release-to-pop is intentional.
const LOAD_Y = 0.42;         // how far down counts as loaded (crouched)
const POP_Y = -0.2;          // must cross above this to count as a pop
const POP_SPEED = 3.0;       // stick units/sec of upward travel to pop
const RELEASE_Y = 0.15;      // springing/releasing toward centre also pops
const RELEASE_SPEED = 1.8;   // deliberately forgiving for touch + real pads
const SHUV_SPEED = 3.4;      // sideways speed that turns a load into a shuvit
// A real thumb flick crosses the stick in 50–80 ms, so ~14 units/s is a hard
// one and a lazy one lands near 5. Set too low and every pop maxes out and the
// analog gesture stops meaning anything.
const FULL_SPEED = 14.0;
const GESTURE_COOL = 0.12;   // one gesture, one action
// Re-arming an airborne trick: the stick must come back inside this radius, or
// slow to this fraction of the pop threshold. Holding the stick out at full
// deflection must NOT keep firing.
const REARM_MAG = 0.45;
const REARM_SPEED = 0.35;

export const SCHEMES = ['skate', 'thps'];

// ── The flick-it gesture ───────────────────────────────────────────────────
// Skate's actual primitive is two-phase: LOAD the stick down (the skater
// crouches), then FLICK it out. That is what makes it feel like Skate rather
// than like a jump button, and it is why the pop has to cross *above* centre —
// a gamepad stick springing back to neutral on its own must not count as a
// flick, or every crouch would fire an ollie on release.
export class FlickIt {
  constructor() { this.reset(); }

  reset() {
    this.loaded = false;
    this.depth = 0;
    this.px = 0; this.py = 0;
    this.cool = 0;
    this.armed = true;     // one gesture, one trick — see the airborne branch
    this.primed = false;   // visual: crouching
  }

  // x, y in stick units (y positive = down). Returns an action or null.
  sample(x, y, dt, airborne) {
    const vx = (x - this.px) / Math.max(dt, 1 / 240);
    const vy = (y - this.py) / Math.max(dt, 1 / 240);
    this.px = x; this.py = y;

    const cooling = this.cool > 0;
    if (cooling) this.cool -= dt;

    // RE-ARMING RUNS EVEN WHILE COOLING. The return stroke of a flick lands
    // inside the cooldown window, so gating it behind the cooldown leaves the
    // gesture permanently disarmed and the second flick of a left-right pair
    // never fires.
    if (airborne && !this.armed) {
      if (Math.hypot(x, y) < REARM_MAG
          || Math.hypot(vx, vy) < POP_SPEED * REARM_SPEED) this.armed = true;
    }
    if (cooling) return null;

    let act = null;

    if (airborne) {
      // Once you are off the ground there is nothing left to load against, so
      // any committed flick is a trick — but it has to be ONE trick per
      // gesture. The stick has to come back toward centre (or stop moving)
      // before it can fire again, otherwise holding a flick out registers a
      // fresh trick every time the cooldown lapses.
      const speed = Math.hypot(vx, vy);
      const mag = Math.hypot(x, y);
      if (this.armed && speed >= POP_SPEED && mag > 0.35) {
        act = { dir: dominant(vx, vy), power: power(speed, 1) };
        this.armed = false;
      }
    } else if (!this.loaded) {
      if (y > LOAD_Y) { this.loaded = true; this.depth = y; }
    } else {
      this.depth = Math.max(this.depth, y);
      if (y < POP_Y && vy <= -POP_SPEED) {
        // Popped. WHERE the stick ended up picks the flip, not the velocity
        // ratio — a flick to up-left is a kickflip even though its upward
        // component is the larger one.
        act = {
          dir: Math.abs(x) > 0.4 ? (x < 0 ? 'left' : 'right') : 'up',
          power: power(Math.hypot(vx, vy), this.depth),
          pop: true,
        };
      } else if (y < RELEASE_Y && vy <= -RELEASE_SPEED) {
        // A physical stick springs to centre and a touchscreen thumb lifts.
        // Both are legitimate releases of a loaded ollie. Requiring the input
        // to cross above centre made quick pops vanish on phones and made real
        // pads feel broken unless the player exaggerated every gesture.
        act = { dir: 'up', power: power(Math.hypot(vx, vy), this.depth), pop: true };
      } else if (Math.abs(vx) >= SHUV_SPEED && Math.abs(vx) > Math.abs(vy) * 1.5 && y > 0.15) {
        // Genuinely sideways, not the sideways part of a diagonal pop.
        act = { dir: 'down', power: power(Math.abs(vx), this.depth), pop: true };
      } else if (y < LOAD_Y * 0.35 && vy > -POP_SPEED) {
        // Eased back out without committing. The speed guard matters: without
        // it, a flick fast enough to cross neutral in one frame un-loads on the
        // way past and the pop never fires.
        this.loaded = false;
      }
    }

    if (act) { this.loaded = false; this.depth = 0; this.cool = GESTURE_COOL; }
    this.primed = this.loaded;
    return act;
  }

  // Touchend can happen between animation frames. Preserve a loaded pop when
  // the thumb lifts instead of resetting the gesture before it is observed.
  release(airborne) {
    if (airborne || !this.loaded || this.cool > 0) return null;
    const act = { dir: 'up', power: power(POP_SPEED, this.depth), pop: true };
    this.loaded = false;
    this.depth = 0;
    this.cool = GESTURE_COOL;
    this.primed = false;
    return act;
  }
}

const power = (speed, depth) =>
  Math.max(0.35, Math.min(speed / FULL_SPEED, 1)) * (0.62 + 0.38 * Math.min(depth, 1));

function dominant(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}


