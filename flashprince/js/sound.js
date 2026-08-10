// What the moves sound like.
//
// The kit itself is `audio.js` — one drone and one envelope per event, the
// Another World mix. This is the wiring, and it lives apart from the move
// table on purpose: a move is a length, a displacement and a clip, and the
// moment you start hanging sound cues off it you have two reasons to edit it.
//
// So nothing is announced. Every frame this looks at what the man is doing now
// against what he was doing last frame and fires on the CHANGE. A state machine
// already knows when something happened; it does not need to be told twice.

import { sfx, resume, droneStart } from './audio.js';

// state entered -> what it sounds like. Anything not named here is silent,
// which is most of them: a game that makes a noise for everything is a game
// you turn the sound off on.
const ON_ENTER = {
  step: 'step', inch: 'inch',
  windUp: 'step', skid: 'land',
  gather: 'jump', gatherRun: 'jump',
  land: 'land', landHard: 'hard',
  hang: 'grab', pullUp: 'climb', climbDown: 'climb',
  bump: 'bump', hurt: 'hurt', shocked: 'hurt', dead: 'die',
  drawGun: 'steel', holster: 'steel',
  swordOut: 'steel', sheathe: 'steel',
  strike: 'swing', clang: 'clang',
  roll: 'inch', crouch: 'inch', wake: 'beat',
};

// The run is a cycle, not a state change, so it gets its own timer: a footfall
// every twelve frames, which is the stride at 1.62px a frame.
const RUN_STEP = 12;

export class Sound {
  constructor() {
    this.was = null; this.wasFoe = null;
    this.t = 0; this.started = false;
  }

  // WebAudio will not start without a gesture, so the first press is the cue.
  // The drone comes up over three seconds from there and never stops.
  wake() {
    if (this.started) return;
    this.started = true;
    resume(); droneStart();
  }

  frame(hero, foe) {
    if (!this.started) return;
    const s = hero.state;
    if (s !== this.was) {
      const cue = ON_ENTER[s];
      if (cue && sfx[cue]) sfx[cue]();
      this.was = s;
      this.t = 0;
    }
    if (s === 'run' && ++this.t % RUN_STEP === 0) sfx.step();

    // The other man is quieter — he gets the two that matter, the wind-up you
    // are supposed to hear coming and the moment it lands on him.
    if (foe && foe.state !== this.wasFoe) {
      if (foe.state === 'strike') sfx.swing();
      else if (foe.state === 'hurt') sfx.cut();
      else if (foe.state === 'dead') sfx.kill();
      else if (foe.state === 'clang') sfx.clang();
      this.wasFoe = foe.state;
    }
  }

  shot() { if (this.started) sfx.fire(); }
  cut() { if (this.started) sfx.cut(); }
  woodHit() { if (this.started) sfx.bump(); }
}
