// Kindling — what the creature does when you are not doing anything.
//
// Slice 1 of the Betterment lane (kindling/BETTERMENT_DESIGN.md): the room
// should feel like a small place living rather than a diagram waiting for input.
//
// The hard rule this is written against is the one that keeps the app honest:
// SCREEN TIME EARNS NOTHING. Nothing in here touches state.js, pays a kindling,
// moves the streak or raises the fire — it cannot, because it is never given
// anything to call. It is a creature walking about in a room, and that is all.
//
// The second rule is that the creature never becomes a chore: it does not get
// hungry, lonely or sad because you were away. Its behaviours are about the
// ROOM (the fire, the shelf, the window, the woodpile), never about needing you.
// The one thing that is about you — saying hello — is something you may do, that
// it answers, and that pays nothing either.

// where things are, in room coordinates
export const SPOT = { hearth: 97, home: 124, pile: 166, shelf: 180, window: 200 };

const WALK = 11;            // px per second — an amble, not a commute
const HOME_FACE = -1;       // the fire is to the left of everywhere it stands

// Each behaviour is a little script. `when` decides whether it is available at
// all, so the room's own state chooses what happens: it sits close to the coals
// on a dim day, inspects the shelf only once there is something on it, and can
// only forget what it was doing with a stick if there are sticks.
const BEHAVIOURS = [
  {
    id: 'warm',
    when: ({ warmth }) => warmth < 0.45,
    steps: [{ go: SPOT.hearth }, { pose: 'sit', face: -1, secs: 9 }, { go: SPOT.home }],
  },
  {
    id: 'shelf',
    when: ({ found }) => found > 0,
    steps: [{ go: SPOT.shelf }, { pose: 'sit', face: 1, look: 1, secs: 5 }, { go: SPOT.home }],
  },
  {
    id: 'window',
    when: ({ warmth }) => warmth > 0.3,
    steps: [{ go: SPOT.window }, { pose: 'sit', face: 1, look: 1, secs: 7 }, { go: SPOT.home }],
  },
  {
    // carries a stick toward the woodpile and immediately forgets why
    id: 'stick',
    when: ({ fuel }) => fuel > 0,
    steps: [{ go: SPOT.pile }, { pose: 'sit', face: 1, secs: 2 },
      { pose: 'stretch', secs: 1.2 }, { go: SPOT.home }],
  },
  {
    id: 'stretch',
    when: () => true,
    steps: [{ pose: 'stretch', secs: 1.6 }],
  },
  {
    id: 'settle',
    when: () => true,
    steps: [{ pose: 'sit', face: -1, secs: 6 }],
  },
];

// how long it sits still between ideas — long, because a creature that is always
// doing something is a screensaver
const GAP = [7, 16];

export function makeIdle(read) {
  let x = SPOT.home, face = HOME_FACE, pose = 'sit', look = 0;
  let script = null, step = 0, left = 0, wait = GAP[0];
  let held = null;                    // an outside pose (a hop, a hello) wins

  const pick = () => {
    const open = BEHAVIOURS.filter(b => b.when(read()));
    return open[Math.floor(Math.random() * open.length)] ?? null;
  };

  const stop = () => { script = null; step = 0; left = 0; };

  return {
    get x() { return x; },
    get face() { return face; },
    get pose() { return held?.pose ?? pose; },
    get look() { return held ? 0 : look; },
    get busy() { return !!script; },
    get behaviour() { return script?.id ?? null; },

    // the room takes the creature back: a kept task, an errand, a new day
    interrupt(nextPose = 'sit') {
      stop();
      pose = nextPose;
      look = 0;
      wait = 3;
    },

    // it goes out; when it comes back it is standing at home again
    leave() { stop(); x = SPOT.home; face = HOME_FACE; pose = 'sit'; look = 0; wait = 2; },

    // You said hello. It turns to you, and that is the whole transaction: no
    // kindling, no counter, no cooldown to game. Being able to do something
    // that pays nothing is the point of it.
    hello(secs = 2.4) {
      stop();
      face = 1;
      look = 0.6;
      held = { pose: 'perk', until: secs };
    },

    update(dt, { asleep = false, still = false } = {}) {
      // prefers-reduced-motion: the creature stays where it is and does not
      // wander. A room that keeps moving for someone who asked it not to is not
      // "alive", it is a page ignoring a preference — and it is exactly what the
      // gate caught the first time this went in.
      if (still && !held) {
        stop();
        x = SPOT.home;
        face = HOME_FACE;
        look = 0;
        pose = asleep ? 'doze' : 'sit';
        return;
      }
      if (held) {
        held.until -= dt;
        if (held.until <= 0) { held = null; look = 0; face = HOME_FACE; }
        return;
      }
      // nothing done today: it dozes by the coals rather than pottering about,
      // which is the room saying "whenever you are ready", not "do something"
      if (asleep) {
        stop();
        pose = 'doze';
        if (x > SPOT.hearth + 2) { x = Math.max(SPOT.hearth, x - WALK * dt); pose = 'walk'; face = -1; }
        return;
      }
      if (pose === 'doze') pose = 'sit';

      if (!script) {
        wait -= dt;
        if (wait > 0) return;
        script = pick();
        step = 0;
        left = 0;
        if (!script) { wait = GAP[0]; return; }
      }

      const now = script.steps[step];
      if (!now) {                              // done: home, facing the fire
        stop();
        face = HOME_FACE;
        look = 0;
        pose = 'sit';
        wait = GAP[0] + Math.random() * (GAP[1] - GAP[0]);
        return;
      }

      if (now.go != null) {
        const d = now.go - x;
        if (Math.abs(d) < 1) { x = now.go; step += 1; return; }
        face = d < 0 ? -1 : 1;
        pose = 'walk';
        look = 0;
        x += Math.sign(d) * Math.min(Math.abs(d), WALK * dt);
        return;
      }

      if (left <= 0) {
        left = now.secs ?? 1;
        pose = now.pose ?? 'sit';
        if (now.face != null) face = now.face;
        look = now.look ?? 0;
      }
      left -= dt;
      if (left <= 0) { step += 1; left = 0; }
    },
  };
}

// what it says back, which is never about how you are doing
export const HELLO = [
  'It looks up at you for a moment.',
  'It blinks, slowly, and goes back to the fire.',
  'It shuffles a little closer.',
  'Ears up. Then down again.',
  'It seems glad enough that you are here.',
  'A small sound, somewhere between a chirp and a yawn.',
];
