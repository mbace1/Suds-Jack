// THE SEAT.
//
// Pulled out of main.js and made pure — no DOM, no three.js, no clock — because
// twice now a leap has been built, gated green, and then turned out to be
// invisible for a reason that was the CAMERA rather than the thing itself:
//
//   v5, the crevasses. A 4.6 m slot 26 m ahead on a 17° slope is not visible
//   from a chase seat. A windward ridge was built to announce one, measured
//   three ways and cut, because a ridge across the fall line has a crest and a
//   crest is somewhere you balance. The slot was never the problem.
//
//   v7, the trench. The snowpack is conserving, gated and real, and you almost
//   never see it, because it is a record of where you HAVE been and the seat
//   looks where you are going.
//
// So the camera is the thing under test now, and a seat you can assert in bare
// node is the only way to say anything about it that is not a screenshot.
// `Rig.update` is the whole decision; main.js copies the answer onto a real
// PerspectiveCamera and does nothing else.

// v7's numbers, kept exactly. Everything this module adds is a term ON TOP that
// is zero at rest, so a rider on the packed line with no drop ahead and no
// glance over the shoulder sits precisely where v7 put them — which `core.mjs`
// asserts, because a camera pass that quietly re-frames the ordinary case is a
// camera pass nobody can review.
export const SEAT = {
  dist: 6.2, distSpeed: 0.11,
  height: 2.3, heightSpeed: 0.035,
  ahead: 5.0, aheadSpeed: 0.12,
  fov: 60, fovGain: 16, fovSpan: 28,
  clear: 1.4,                 // never closer than this to the ground
  headLag: 2.6, seatLag: 5.5, // the exp-lerp rates v7 used
  roll: 0.05,

  // --- the glance over the shoulder -----------------------------------------
  // Held, not toggled, and it costs you the view ahead for as long as you hold
  // it — which is the honest price of looking at your own line and the reason
  // it is a verb rather than a mode.
  // THE HEIGHT IS THE WHOLE THING, and 3.4 m was not nearly enough. Looking
  // back means looking at ground that is UPHILL of you, and on a 17° slope that
  // ground climbs away as fast as you back off from it: from 7 m downhill of the
  // rider, 3.4 m up, the seat is about a metre over the snow and the frame is a
  // wall of it — no horizon, no line, no trench. To hold a groove 15 m behind at
  // a 20° depression the arithmetic wants (0.30·15 + tan20°·22) ≈ 12 m over the
  // rider, so the glance is a drone shot and there is no version of it that is
  // not. Same lesson the crevasse taught one screen down: on a slope, seeing
  // what is behind you is a question about altitude.
  backLag: 2.6,
  backDist: 9,                // downhill of the rider, so the line runs away from you
  backHeight: 12,             // and well above, because a groove is read from above
  backAim: 17,                // and the aim reaches back up the hill to find it

  // --- the medium ------------------------------------------------------------
  // Deep snow throws a plume, and v6 aimed that plume UP so it would stop being
  // thrown at the lens. Up is still in frame from a seat that sits above and
  // behind, so the seat backs off as the board buries itself.
  //
  // Swept against the plume's share of the frame, same S-turn in the run-out at
  // sink 0.58: 0/0 reads 2.58%, 1.1/0.45 reads 1.84%, 2.2/0.9 reads 1.41% and
  // 3.5/1.6 reads 1.00%. Monotone, and 2.2/0.9 is the knee — past it the seat
  // keeps retreating for very little. The honest reading of that number is only
  // that the plume is pulled back rather than removed; backing a camera off
  // shrinks everything in the frame, the plume included, and whether the run is
  // more READABLE for it is not something a pixel count can say.
  powderDist: 2.2, powderHeight: 0.9, powderRef: 0.45,

  // --- the ground falling away: BUILT, MEASURED FOUR WAYS AND CUT -----------
  // v5 tried to make a crevasse visible with geometry (a windward ridge) and cut
  // it because a ridge across the fall line has a crest you can balance on. v8
  // tried to make one visible with the camera. It cannot be done from this seat,
  // and the numbers are worth more than another attempt would be:
  //
  //   Detecting the hole is solved. Sag below a chord from 6 m to 42 m ahead
  //   separates cleanly — ordinary ground never exceeds 1.73 m anywhere on the
  //   mountain, the slot reads 3.21 m at 24 m out and 4.19 at 12.
  //
  //   Beyond about 20 m the interior is OCCLUDED: 3.3 m of ground stands in the
  //   sightline. No aim helps; there is a hill in the way.
  //
  //   Inside about 16 m it is unoccluded but OUT OF FRAME — at 16 m back and
  //   5 m up, 38 of 78 points of the interior are clear of the ground and none
  //   of them is in the picture, because the seat looks at the horizon and the
  //   hole is steeply below. Aiming the camera AT the sag recovered 2 of 78.
  //
  //   Swept against seat height, it takes 8 m above the surface to see 21 of 78
  //   from 24 m back, and 12 m to see 44. That is not a chase camera.
  //
  // So the honest answer to a question open since v5 is that a 4 m slot on a
  // 17° slope cannot be shown from behind the rider — not by shaping the ground
  // and not by moving the seat. What is left is a genuinely different camera (a
  // drone seat 8-12 m up while a hole is near, which the sag measure above is
  // exactly the trigger for) or a tell that is not visual at all. Both are the
  // owner's call, so neither is here, and nothing detects a hole any more
  // because a detector with no user is dead code.
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Rig {
  constructor() {
    this.hx = 0; this.hy = 0; this.hz = -1;       // smoothed heading
    this.px = 0; this.py = 0; this.pz = 0;        // smoothed seat
    this.lx = 0; this.ly = 0; this.lz = 0;        // look point
    this.fov = SEAT.fov;
    this.roll = 0;
    this.back = 0;                                // 0 riding, 1 looking back
    this.first = true;
  }

  update(s, t, inp, dt) {
    // heading: where the rider is actually going, or where the board points
    // when they are too slow for that to mean anything
    let tx, ty, tz;
    if (s.speed > 1.5) {
      const l = Math.hypot(s.vx, s.vy * 0.4, s.vz) || 1;
      tx = s.vx / l; ty = (s.vy * 0.4) / l; tz = s.vz / l;
    } else {
      tx = Math.sin(s.yaw); ty = 0; tz = -Math.cos(s.yaw);
    }
    const hk = this.first ? 1 : 1 - Math.exp(-dt * SEAT.headLag);
    this.hx += (tx - this.hx) * hk; this.hy += (ty - this.hy) * hk; this.hz += (tz - this.hz) * hk;
    const hl = Math.hypot(this.hx, this.hy, this.hz) || 1;
    this.hx /= hl; this.hy /= hl; this.hz /= hl;

    const bk = this.first ? 1 : 1 - Math.exp(-dt * SEAT.backLag);
    this.back += ((inp && inp.back ? 1 : 0) - this.back) * bk;

    const powK = clamp((s.sink || 0) / SEAT.powderRef, 0, 1);
    const sp = s.speed;

    // the seat, riding
    let dist = SEAT.dist + sp * SEAT.distSpeed + powK * SEAT.powderDist;
    let height = SEAT.height + sp * SEAT.heightSpeed + powK * SEAT.powderHeight;
    // and the seat, glancing back: AHEAD of the rider, looking up the hill
    const b = this.back;
    dist = dist * (1 - b) + (SEAT.backDist + sp * SEAT.distSpeed) * b;
    height = height * (1 - b) + (SEAT.backHeight + sp * SEAT.heightSpeed) * b;
    // `sign` is the whole glance: the seat crosses to the other side of the
    // rider and the aim crosses with it, so nothing else in here needs to know.
    const sign = 1 - 2 * b;

    let px = s.x - this.hx * dist * sign;
    let pz = s.z - this.hz * dist * sign;
    let py = s.y + height + this.hy * -dist * 0.4 * (1 - b);
    const floor = t.height(px, pz) + SEAT.clear;
    if (py < floor) py = floor;

    if (this.first) { this.px = px; this.py = py; this.pz = pz; }
    else {
      const k = 1 - Math.exp(-dt * SEAT.seatLag);
      this.px += (px - this.px) * k; this.py += (py - this.py) * k; this.pz += (pz - this.pz) * k;
    }

    const fwdAim = SEAT.ahead + sp * SEAT.aheadSpeed;
    // riding, the aim runs ahead; glancing, it runs back up the hill to where
    // the groove is, and `aim` carries the blend so there is one expression
    const aim = fwdAim * (1 - b) + SEAT.backAim * b;
    this.lx = s.x + this.hx * aim * sign;
    this.lz = s.z + this.hz * aim * sign;
    this.ly = (s.y + 1.0) * (1 - b) + t.height(s.x - this.hx * SEAT.backAim, s.z - this.hz * SEAT.backAim) * b
      + this.hy * fwdAim * (1 - b);

    this.fov += ((SEAT.fov + Math.min(1, sp / SEAT.fovSpan) * SEAT.fovGain) - this.fov)
      * (this.first ? 1 : Math.min(1, dt * 4));
    this.roll = -(s.edge || 0) * SEAT.roll * (1 - b);
    this.first = false;
    return this;
  }

  // Can this seat actually SEE that point — in frame, and with nothing in the
  // way? Both halves are needed and the second is the one that matters.
  //
  // A frustum test alone says yes to a crevasse floor from any seat, because a
  // 4 m hole 25 m ahead is nine degrees below the horizon and the frame is
  // sixty degrees tall. It was never out of frame. What hides a slot is its own
  // NEAR LIP: from a shallow angle the ground you are standing on is in the way,
  // and that is why raising the seat is the thing that works — it steepens the
  // look until the sightline clears the lip. Written as a frustum test this
  // check passed with the drop response switched off, which is a check proving
  // nothing. Marching the ray is the question v5 was actually asking.
  sees(t, x, y, z) {
    const fx = this.lx - this.px, fy = this.ly - this.py, fz = this.lz - this.pz;
    const fl = Math.hypot(fx, fy, fz) || 1;
    const dx = x - this.px, dy = y - this.py, dz = z - this.pz;
    const dl = Math.hypot(dx, dy, dz) || 1;
    const ahead = (dx * fx + dy * fy + dz * fz) / (fl * dl);
    if (ahead <= 0) return false;
    const pitchLook = Math.asin(fy / fl), pitchPt = Math.asin(dy / dl);
    if (Math.abs(pitchPt - pitchLook) > (this.fov * Math.PI / 180) / 2) return false;
    // and the sightline has to clear the ground between here and there
    const STEP = 0.8;
    for (let d = STEP; d < dl - STEP; d += STEP) {
      const u = d / dl;
      if (t.height(this.px + dx * u, this.pz + dz * u) > this.py + dy * u + 0.05) return false;
    }
    return true;
  }
}
