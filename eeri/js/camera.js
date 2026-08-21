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

const DEFAULT = { z: 34, y: 2.6, lead: 1.6, floor: 5.8 };

// HOW BIG EERI IS ON THE SCREEN, as one number over the whole director.
//
// Measured rather than judged: at the authored dollies he stood 80px of 720 on
// site 1 and 70px on site 10 — **1/9 to 1/10 of screen height**. Mario 3 and
// Yoshi's Crafted World, the 80/20 references PHASING §0.1 names, keep the
// hero at roughly 1/7. Everything this project has added lately — the enemy
// models, their tells, the craft materials, the detail maps — was sitting
// below the size at which any of it can be read, so this multiplies work
// already done rather than adding more.
//
// It is a MULTIPLIER, not a new default, and that is the whole point: a site
// declares SHOTS and the machine stretches deliberately pull back, so setting
// one closer number would flatten the director into a follow camera. Scaling
// preserves every authored relationship — a shot that pulls back still pulls
// back, by the same proportion.
//
// Applied at the very end, after the mode reframe, the punch and the drift, so
// those keep their proportional weight too. 0.78 puts site 1 at ~1/7 and the
// pulled-back machine sites at ~1/8, which is the right way round.
const ZOOM = 0.78;

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

  // the zoom, exposed so the gate can assert the framing rather than eyeball it
  static get ZOOM() { return ZOOM; }

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
    // wobble on one of them.
    //
    // `freeze` is a DEV-ONLY switch and it exists because this drift, which is
    // exactly right for play, makes the game impossible to A/B by screenshot:
    // the frame is never dead still, so any two captures differ in ~99% of
    // their pixels and every difference count measures the drift rather than
    // the change. Six comparisons in one session were lost to it before it was
    // named. Nothing in the game sets this; the look harnesses do.
    if (!this.freeze) {
      z += Math.sin(this.t * 0.23) * 0.5;
      yOff += Math.sin(this.t * 0.17 + 1.3) * 0.22;
    }

    // ease the framing itself, so crossing into a shot is a move, not a cut.
    // FROZEN MEANS SETTLED, not merely un-drifting. The first cut of `freeze`
    // stopped the sine and left the follow easing running, and at the ~3 fps
    // this renders at in a sandbox the easing needs many seconds of wall clock
    // to converge — so two captures "with the camera frozen" were still at two
    // different framings. A freeze that has to be waited out is not a freeze.
    const k = this.freeze ? 1 : 0;
    this.f.z += (z * ZOOM - this.f.z) * (k || Math.min(1, 1.6 * dt));
    this.f.lead += (want.lead - this.f.lead) * (k || Math.min(1, 2.2 * dt));

    // follow
    const tx = focus.x + face * this.f.lead;
    const ty = Math.max(focus.y + yOff, want.floor);
    this.x += (tx - this.x) * (k || Math.min(1, 3.2 * dt));
    this.y += (ty - this.y) * (k || Math.min(1, 2.6 * dt));

    // never show past the ends of the room
    const halfW = this.f.z * Math.tan((fov * Math.PI) / 360) * aspect;
    const cx = Math.max(halfW * 0.85, Math.min(levelW - halfW * 0.85, this.x));

    this.cam.position.set(cx, this.y, this.f.z);
    this.cam.lookAt(cx, this.y - 0.4, 0);
  }
}
