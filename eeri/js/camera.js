// EERI — the camera (ART_BRIEF §3.1, the Tropical Freeze half). "Gameplay
// stays on one plane; the camera may drift and reframe at authored
// moments, not freely."
//
// So this is not a follow function with a spring on it. It is a small
// director: a site declares SHOTS — zones of the room, each with its own
// dolly distance, height and lead — and the camera blends between them as
// you cross. A room whose lock is a three-tile bank pulls back when you
// reach it, because a lock you cannot see is not a lock; the stretch where
// an unmanned machine works its cycle pulls back too, because the whole
// point is that you read the cycle before you commit.
//
// On top of the shots sit two things the reference has and a spring does
// not: a **drift**, so the frame is never dead still, and a **punch** —
// a short dolly-in kick on heavy events, which is what weight looks like
// from behind a camera.

// v15.53: the default dolly came in from 34 to 31. Every room's authored
// shots are PULL-BACKS (37.5–45) — a lock you cannot see is not a lock —
// and with the default already at 34 there was no push-in anywhere in the
// game, so "the same room, walked end to end, produces three distinct
// compositions" (ART_TARGET rung 2) was never true: it produced one, and
// then a further one. The default IS the push-in now: ordinary running is
// the close framing, and crossing into a lock's shot is a visible move.
const DEFAULT = { z: 31, y: 2.6, lead: 1.6, floor: 5.8 };

// THE PHONE IS HELD UPRIGHT, and the lens does not know. The camera's FOV is
// VERTICAL (24°, a long lens, chosen for a 16:9 stage), so in a portrait
// window the picture keeps its height and loses its width: at z=31 a
// 390×844 phone sees about six units of level across, and a jump is 4.85.
// The gap you are about to cross is at the edge of the frame or past it.
// So the dolly answers the ASPECT: whatever the shot asks for, the camera
// never comes closer than shows MIN_W units of level across. In landscape
// this never fires (a 16:9 stage at z=31 already shows twenty-three); in
// portrait it is the whole composition. Owner's number — see VERSIONS
// v15.53 for the three framings it was chosen from.
const MIN_W = 10;

export class Camera {
  constructor(camera, def) {
    this.cam = camera;
    this.x = 0; this.y = 8; this.z = DEFAULT.z;
    // the framing we are easing toward, and the one we are showing
    this.f = { ...DEFAULT };
    this.shots = [];
    this.t = 0;
    this.punchT = 0; this.punchAmt = 0;
    this.setSite(def);
  }

  setSite(def) {
    this.shots = def?.shots || [];
  }

  // a heavy event: the dolly kicks in and settles. Never a rotation — a
  // rolling camera on a side-view platformer costs the player the horizon.
  punch(amount = 1) {
    this.punchAmt = Math.max(this.punchAmt, amount);
    this.punchT = 1;
  }

  // snap, for a cut between rooms — a slow pan across a rebuilt world is
  // a lie about geography
  cut(x, y) {
    this.x = x; this.y = y;
    this.z = this.f.z;
  }

  // mode: foot | mounting | riding | dismounting
  update(dt, focus, face, mode, levelW, aspect, fov) {
    this.t += dt;

    // which shot is in force — the last zone containing the focus wins, so
    // a site can lay a special framing over a general one
    let want = DEFAULT;
    for (const s of this.shots) {
      if (focus.x >= s.x0 && focus.x <= s.x1) want = { ...DEFAULT, ...s };
    }

    // the mode reframes on top of the room: climbing in is the best beat in
    // the game, so the camera leans in for it; riding pulls back, because
    // the machine is three times the kid and needs the room
    let z = want.z, yOff = want.y;
    if (mode === 'mounting') { z -= 4.5; yOff -= 0.35; }
    else if (mode === 'riding') { z += 2.6; yOff += 0.5; }

    // the punch: a short kick toward the subject, easing out
    if (this.punchT > 0) {
      this.punchT = Math.max(0, this.punchT - dt / 0.45);
      z -= this.punchAmt * 1.6 * this.punchT * this.punchT;
      if (this.punchT === 0) this.punchAmt = 0;
    }

    // the drift: slow, small, and on both axes so it never reads as a
    // wobble on one of them
    z += Math.sin(this.t * 0.23) * 0.5;
    // …and the portrait floor on the dolly (MIN_W above), applied after
    // every other opinion so a punch cannot dip under it either
    z = Math.max(z, MIN_W / (2 * Math.tan((fov * Math.PI) / 360) * aspect));
    yOff += Math.sin(this.t * 0.17 + 1.3) * 0.22;

    // ease the framing itself, so crossing into a shot is a move, not a cut.
    // NEVER DURING A JUMP (ART_TARGET rung 2: "Tropical Freeze is
    // disciplined about this and it is the difference between cinematic and
    // unplayable"). A shot boundary that falls mid-gap would otherwise dolly
    // while the player is judging a landing; the move waits for his feet.
    // `grounded` is the player's; a machine has none and never waits.
    // Capped at the length of a jump: a long fall (a pit, a teleport in a
    // test) is not a precision jump, and a camera that freezes for as long
    // as the ground is missing would hold the wrong framing for seconds.
    const airborne = mode === 'foot' && focus.grounded === false;
    this.airT = airborne ? (this.airT || 0) + dt : 0;
    if (!(airborne && this.airT < 0.7)) this.f.z += (z - this.f.z) * Math.min(1, 1.6 * dt);
    this.f.lead += (want.lead - this.f.lead) * Math.min(1, 2.2 * dt);

    // follow
    const tx = focus.x + face * this.f.lead;
    const ty = Math.max(focus.y + yOff, want.floor);
    this.x += (tx - this.x) * Math.min(1, 3.2 * dt);
    this.y += (ty - this.y) * Math.min(1, 2.6 * dt);

    // never show past the ends of the room
    const halfW = this.f.z * Math.tan((fov * Math.PI) / 360) * aspect;
    const cx = Math.max(halfW * 0.85, Math.min(levelW - halfW * 0.85, this.x));

    this.cam.position.set(cx, this.y, this.f.z);
    this.cam.lookAt(cx, this.y - 0.4, 0);
  }
}
