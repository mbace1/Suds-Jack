// EERI — the kid (ART_BRIEF §3.7). Toy-figure proportions (~2.5 heads),
// machine-yellow hard hat as the silhouette key, expression in pose and
// timing, not face.
//
// The visual is an ASSET behind the seam: buildKidModel() is the code-built
// placeholder, and a live eeri_vN.glb replaces it by exposing the same
// contracted nodes (hipL hipR armL armR body head — see assets/README.md).
// Kid poses whatever it is handed; it never knows which side of the seam
// the model came from.

import * as THREE from 'three';
import { PAL } from './palette.js?v=16';

const FACE_TURN = 0.42 * Math.PI; // 3/4 view: forward ±x, tipped toward camera

export function buildKidModel() {
  const root = new THREE.Group(); // origin at the feet, facing +x
  const nodes = {};
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };

  // legs: pivot groups at the hip so the run swings from the right joint
  for (const [name, dz] of [['hipL', 0.11], ['hipR', -0.11]]) {
    const hip = new THREE.Group(); hip.name = name;
    hip.position.set(0, 0.56, dz);
    box(hip, 0.17, 0.42, 0.19, PAL.PANTS, 0, -0.24, 0);
    // machine-yellow wellies: the one bright note on him, and what keeps a
    // navy-and-olive kid readable against brown dirt at gameplay distance
    box(hip, 0.2, 0.16, 0.24, PAL.BOOT, 0.03, -0.49, 0);
    box(hip, 0.21, 0.05, 0.25, PAL.BOOT_DK, 0.03, -0.55, 0);   // sole
    root.add(hip); nodes[name] = hip;
  }

  // body: the navy dino tee from the photograph
  const body = new THREE.Group(); body.name = 'body'; body.position.y = 0.56;
  box(body, 0.4, 0.5, 0.3, PAL.TEE, 0, 0.25, 0);
  box(body, 0.42, 0.08, 0.32, PAL.TEE, 0, 0.05, 0);     // hem, a touch wider
  // the dino print: a body, a tail and a row of back plates. Tiny, but it is
  // HIS shirt — and at 32 px it still reads as a green shape on navy, which
  // is the only job a print has at that size.
  // he faces +x, so the print goes on the +x FACE — put it on +z and it
  // sits on his ribs where the camera never looks
  box(body, 0.02, 0.14, 0.13, PAL.DINO, 0.205, 0.26, 0);      // body
  box(body, 0.02, 0.05, 0.09, PAL.DINO, 0.205, 0.20, -0.11);  // tail
  box(body, 0.02, 0.08, 0.07, PAL.DINO, 0.205, 0.34, 0.10);   // head
  box(body, 0.02, 0.05, 0.03, PAL.DINO, 0.205, 0.16, 0.06);   // leg
  for (const pz of [-0.03, 0.02]) {                            // back plates
    box(body, 0.02, 0.04, 0.03, PAL.DINO, 0.205, 0.35, pz);
  }
  root.add(body); nodes.body = body;

  // Arms: pivot at the shoulder, children of the body so the lean carries
  // them — and each one has an ELBOW. A child runs with its arms bent; a
  // straight arm swinging from the shoulder is a soldier's march, and it was
  // the single thing most obviously wrong with the run. The sleeve stays on
  // the shoulder and the forearm and hand hang off `elbowL`/`elbowR`, so the
  // bend is one angle rather than a redrawn limb.
  for (const [name, elbow, dz] of [['armL', 'elbowL', 0.24], ['armR', 'elbowR', -0.24]]) {
    const sh = new THREE.Group(); sh.name = name;
    sh.position.set(0, 0.44, dz);
    // A SHORT sleeve — a cap at the shoulder, then bare skin down to the
    // elbow. Running the navy the full length of the upper arm put a navy
    // limb against a navy torso, so the arm vanished and the forearm read as
    // a plank floating at the waist.
    box(sh, 0.13, 0.10, 0.13, PAL.TEE, 0, -0.05, 0);    // sleeve cap
    box(sh, 0.115, 0.13, 0.115, PAL.SKIN, 0, -0.15, 0); // bare upper arm
    const el = new THREE.Group(); el.name = elbow;
    el.position.set(0, -0.21, 0);                      // the joint, at the cuff
    box(el, 0.115, 0.2, 0.115, PAL.SKIN, 0, -0.09, 0); // bare forearm
    box(el, 0.12, 0.1, 0.12, PAL.SKIN, 0, -0.23, 0);   // hand
    sh.add(el); nodes[elbow] = el;
    body.add(sh); nodes[name] = sh;
  }

  // head + THE CAP: the silhouette key (ART_BRIEF §3.7). The hard hat is
  // gone — this is the owner's kid, so it is his olive dinosaur cap: a
  // rounded crown, a forward brim, and three soft spikes down the middle.
  // The spikes ARE the silhouette; nothing else here survives 32 px.
  const head = new THREE.Group(); head.name = 'head'; head.position.y = 1.12;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), M(PAL.SKIN));
  skull.position.y = 0.22; head.add(skull);
  // hair showing under the cap at the back and sides
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.295, 12, 8, 0, Math.PI * 2, 0, 1.1), M(PAL.HAIR));
  hair.position.y = 0.2; hair.rotation.z = 0.12; head.add(hair);
  for (const dz of [0.11, -0.11]) { // dot eyes on the +x face
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), M(PAL.INK));
    eye.position.set(0.26, 0.24, dz); head.add(eye);
  }
  box(head, 0.05, 0.015, 0.09, PAL.INK, 0.28, 0.12, 0);   // the line mouth

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.315, 12, 8, 0, Math.PI * 2, 0, 1.3), M(PAL.CAP));
  cap.position.y = 0.27; head.add(cap);
  // The peak rides on the cap's lower edge, NOT at eye height — at 0.30 it
  // cut straight across the eyes and read as one heavy eyebrow.
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.035, 12, 1, false, -0.85, 1.7), M(PAL.CAP_DK));
  brim.position.set(0.19, 0.375, 0);
  brim.rotation.z = -0.12;          // tipped down at the front, as a peak sits
  head.add(brim);
  // three spikes along the crown, front to back, tallest in the middle
  // Four soft spikes running front-to-back along the crown. They are the
  // silhouette key, so they are DELIBERATELY oversized — at 32 px the cap is
  // six pixels tall and a subtle spike is no spike at all.
  // Four SOFT spikes front-to-back along the crown — fabric, not a mohawk.
  // Rounded (a squashed sphere, never a cone) and oversized on purpose: they
  // are the silhouette key, and at 32 px the whole cap is six pixels tall.
  const spikes = [[0.20, 0.085], [0.07, 0.115], [-0.07, 0.105], [-0.20, 0.075]];
  for (const [sx, h] of spikes) {
    const t = sx / 0.315;
    const domeY = 0.30 + Math.sqrt(Math.max(0, 1 - t * t)) * 0.315;
    const sp = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), M(PAL.SPIKE));
    sp.scale.set(0.085, h * 1.5, 0.075);      // taller than wide: a soft nub
    sp.position.set(sx, domeY + h * 0.55, 0);
    sp.rotation.z = -Math.asin(Math.min(1, Math.max(-1, t))) * 0.6;
    head.add(sp);
  }
  root.add(head); nodes.head = head;

  return { root, nodes };
}

// A Meshy auto-rigged Eeri is a SKINNED mesh driven by named clips, not a
// tree of nodes the game rotates. This is the whole of the difference, and it
// stays here so `main.js` never learns which kind it got — it keeps calling
// `pose(state, t, speed)` either way. That is the asset seam's entire point.
//
// Two things the mixer path has to get right:
//  - CROSSFADE, never a hard switch. The clips are separate takes and cutting
//    between them pops; 0.15 s covers it and still feels responsive.
//  - The rig is modelled facing +Z (Meshy's requirement) and the game's world
//    faces +x, so the whole thing carries a −90° yaw offset that the
//    code-built kid does not.
const CLIP_FOR = { idle: 'idle', run: 'run', air: 'jump', ride: 'ride', climb: 'climb' };

// FACING, and the trap in it. A rotation of θ about Y sends +z to
// (sin θ, 0, cos θ). The Meshy rig is modelled facing +Z, and the game's
// own `FACE_TURN` is 0.42π ≈ 75.6° — which already sends +z to
// (0.97, 0, 0.25): screen-right, tipped a little toward the camera, which
// is exactly the 3/4 view the placeholder is posed for. So a skinned rig
// needs NO extra yaw at rest; the -90 degrees it used to carry was added on
// top and swung him round to face the camera, which is what he did while
// running. The same -90 left him backwards in the cab, because riding zeroes
// the turn and he was then facing +z on the nose. One cause, two symptoms.
const SKIN_YAW = 0;

// riding, the machine owns the facing and the turn goes to zero -- so a
// +z-forward rig needs the +z->+x quarter turn put back by hand
const SKIN_RIDE_YAW = Math.PI / 2;

class ClipDriver {
  constructor(group, asset) {
    this.mixer = new THREE.AnimationMixer(asset.root);
    this.actions = {};
    for (const [name, clip] of Object.entries(asset.clips)) {
      const a = this.mixer.clipAction(clip);
      a.enabled = true; a.setEffectiveWeight(0);
      this.actions[name] = a;
    }
    this.current = null;
    this.last = 0;
  }
  play(state, t, speed) {
    const want = this.actions[CLIP_FOR[state]] ? CLIP_FOR[state] : 'idle';
    if (want !== this.current) {
      const next = this.actions[want];
      if (next) {
        next.reset().setEffectiveWeight(1).play();
        if (this.current && this.actions[this.current]) {
          this.actions[this.current].crossFadeTo(next, 0.15, false);
        }
        this.current = want;
      }
    }
    // the run reads faster when he moves faster — the one place the game's
    // own numbers still drive the animation
    const a = this.actions[this.current];
    if (a) a.setEffectiveTimeScale(this.current === 'run' ? 0.6 + Math.min(1.4, speed / 5) : 1);
    const dt = Math.min(0.1, Math.max(0, t - this.last));
    this.last = t;
    this.mixer.update(dt);
  }
}

export class Kid {
  constructor(asset) {
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.n = asset.nodes;

    if (asset.skinned) {
      this.clips = new ClipDriver(this.group, asset);
      asset.root.rotation.y = SKIN_YAW;
    }
    // remember rest offsets so a GLB with its own base positions poses right
    this.baseBodyY = this.n.body ? this.n.body.position.y : 0;

    // blob shadow — the landing aid (no shadow maps anywhere)
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;

    this.face = 1;
    this.turn = FACE_TURN;
  }

  setFace(f) { if (f) this.face = f; }

  // state: 'idle' | 'run' | 'air' | 'ride' | 'climb'
  //
  // SIGN: a limb hangs along −y, so rotation.z = θ swings its tip to
  // x = +sin(θ) — POSITIVE IS FORWARD, for arms and legs alike. The ride,
  // air and climb poses were authored with the arms negative, which drove
  // the machine with his hands behind his back and climbed the step
  // reaching backwards over his own shoulder. Check a new pose by where the
  // tip lands, not by whether the number looks right.
  pose(state, t, speed = 0) {
    // the turn is animated, not mirrored — a 3D cast's free win.
    // riding, the pose is local to the seat and the machine owns the facing.
    const target = state === 'ride' ? (this.clips ? SKIN_RIDE_YAW : 0)
      : this.face > 0 ? FACE_TURN : Math.PI - FACE_TURN;
    this.turn += (target - this.turn) * 0.18;
    this.group.rotation.y = this.turn;

    // a skinned rig is driven by clips; the facing above still applies
    if (this.clips) return this.clips.play(state, t, speed);

    const n = this.n;
    const lerp = (o, k, v) => { o.rotation.z += (v - o.rotation.z) * k; };
    if (state === 'run') {
      const ph = t * 11;
      const sw = 0.55 + 0.45 * Math.min(1, speed / 6);
      n.hipL.rotation.z = Math.sin(ph) * sw;
      n.hipR.rotation.z = Math.sin(ph + Math.PI) * sw;
      // ARMS COUNTER THE LEGS: each arm is half a cycle out of phase with the
      // hip on its own side, so the leg that is forward has the arm on that
      // side driving back. That is what a run is; swing them together and you
      // get a toy soldier.
      n.armL.rotation.z = Math.sin(ph + Math.PI) * sw * 0.8;
      n.armR.rotation.z = Math.sin(ph) * sw * 0.8;
      // The elbows stay BENT the whole way round and pump a little — a child
      // runs with their forearms up, and the bend is what stops the swing
      // reading as a march. It never straightens: the pump rides on top of a
      // deep held bend rather than opening and closing.
      n.elbowL.rotation.z = 1.15 + Math.sin(ph + Math.PI) * 0.34;
      n.elbowR.rotation.z = 1.15 + Math.sin(ph) * 0.34;
      lerp(n.body, 0.2, -0.22);                 // the run leans forward
      n.body.position.y = this.baseBodyY + Math.abs(Math.sin(ph)) * 0.04;
      lerp(n.head, 0.2, 0.1);
    } else if (state === 'air') {
      lerp(n.hipL, 0.15, 0.8); lerp(n.hipR, 0.15, -0.5);
      lerp(n.armL, 0.15, 1.0); lerp(n.armR, 0.15, 0.75);
      lerp(n.elbowL, 0.15, 1.3); lerp(n.elbowR, 0.15, 1.5);
      lerp(n.body, 0.15, -0.1); lerp(n.head, 0.15, 0);
    } else if (state === 'ride') {
      // seated: legs forward, hands to the levers, all business. The shoulder
      // barely moves and the ELBOW does the reaching, which is how anyone
      // actually holds a set of controls.
      lerp(n.hipL, 0.25, 1.35); lerp(n.hipR, 0.25, 1.2);
      lerp(n.armL, 0.25, 0.15); lerp(n.armR, 0.25, 0.1);
      lerp(n.elbowL, 0.25, 1.15); lerp(n.elbowR, 0.25, 1.05);
      lerp(n.body, 0.25, 0.06); lerp(n.head, 0.25, -0.06);
      n.body.position.y = this.baseBodyY;
    } else if (state === 'climb') {
      lerp(n.hipL, 0.3, 1.0); lerp(n.hipR, 0.3, 0.2);
      lerp(n.armL, 0.3, 2.2); lerp(n.armR, 0.3, 1.8);
      lerp(n.elbowL, 0.3, 0.5); lerp(n.elbowR, 0.3, 0.75);
      lerp(n.body, 0.3, -0.15);
    } else { // idle: a kid's idle — breath, small sway, never frozen
      lerp(n.hipL, 0.1, 0); lerp(n.hipR, 0.1, 0);
      lerp(n.armL, 0.1, Math.sin(t * 1.7) * 0.06);
      lerp(n.armR, 0.1, -Math.sin(t * 1.7) * 0.06);
      // even at rest the arms are not planks — a small bend, breathing
      lerp(n.elbowL, 0.1, 0.22 + Math.sin(t * 1.7) * 0.05);
      lerp(n.elbowR, 0.1, 0.22 - Math.sin(t * 1.7) * 0.05);
      lerp(n.body, 0.1, 0);
      n.body.scale.y = 1 + Math.sin(t * 2.1) * 0.015;
      n.body.position.y = this.baseBodyY;
      lerp(n.head, 0.1, Math.sin(t * 0.9) * 0.04);
    }
  }
}

// ---- the platforming body (Mario grammar: snappy, committed) -------------

const RUN = 6.2, ACC = 42, ACC_AIR = 20, FRIC = 34;
const GRAV = 30, FALL_X = 1.35, JUMP_V = 12.6;
// A stomp bounces you 80% of a jump: enough to feel like a reward and to
// chain along a row of them, never enough to reach somewhere a jump cannot,
// so no level's reach budget is quietly broken by an enemy standing there.
const BOUNCE_V = JUMP_V * 0.8;
const COYOTE = 0.09, BUFFER = 0.12;
// THE CLIMB (DESIGN §2). Slower than the run, both ways, so a ladder reads
// as a decision rather than a lift.
const CLIMB_V = 3.6;
// THE GIZMOS (DESIGN §2). A belt carries you while you stand on it — a drift,
// not a change of speed, so you keep full control and only your ground
// disagrees with you. A tarp throws you about twice as high as a jump.
const BELT = 2.6, TARP_V = 17.5;
// WADING (DESIGN world 2). Shallow water is a floor that slows you — the
// belt's idea turned down instead of sideways. 0.55 is chosen so a wade
// still feels like running rather than like being stuck: at RUN it is 3.4
// tiles/s, which is above the excavator's 3.4 only by rounding, so the
// slowest thing on foot is still about as quick as the machinery.
// It does NOT touch the jump: DESIGN §4.1 says every jump is proved with a
// full tile of slack, and a jump that got shorter in water would break that
// silently for every room the prover has already passed.
const WADE = 0.55;

export class Player {
  constructor(level, spawn, kid) {
    this.level = level;
    this.kid = kid;
    this.x = spawn.x; this.y = spawn.y;
    this.vx = 0; this.vy = 0;
    this.hw = 0.3; this.h = 1.5;
    this.groundedT = 0; this.jumpBufT = 0;
    this.grounded = false;
    this.squash = 0;
    this.t = 0;
    this.mercyT = 0;
    this.climbing = false;
    this.cutJump = false;
    // the hoist under his feet, if any — kept across frames so RIDING can be
    // told from LANDING (see the platform pass in update)
    this.carrier = null;
    // one-frame events for the noise to hang off
    this.justJumped = false; this.justLanded = false;
  }

  // Bounced off something he landed on. Higher than a step, lower than a
  // full jump, and it does NOT need the ground — that is the whole appeal:
  // a chain of small machines is a staircase.
  bounce() {
    this.vy = BOUNCE_V;
    this.cutJump = false;             // the game gave him this one
    this.squash = 0.1;
    this.jumpBufT = 0;
    this.justStomped = true;
  }

  // knocked back by a hazard: the cost is never death (ART_BRIEF hazards)
  struck(fromX) {
    if (this.mercyT > 0) return false;
    this.mercyT = 1.3;
    this.vx = (this.x < fromX ? -1 : 1) * 7.5;
    this.vy = 7;
    return true;
  }

  box() { return { x: this.x, y: this.y, hw: this.hw, h: this.h }; }

  update(dt, input) {
    this.t += dt;
    this.justJumped = false; this.justLanded = false; this.justStomped = false;
    this.justBounced = false;
    this.mercyT = Math.max(0, this.mercyT - dt);
    const wasGrounded = this.grounded;
    const ax = input.axis();

    // ---- THE CLIMB ------------------------------------------------------
    // A ladder is a place where gravity is off and up/down is a speed. You
    // get ON by pressing up or down while standing at one, and OFF three
    // ways — jumping, walking off, or topping out.
    const onRungs = this.level.climbable(this.x, this.y);
    if (!onRungs) this.climbing = false;
    else if (input.down.up || input.down.down) this.climbing = true;
    if (this.climbing && this.mercyT <= 0) {
      // a jump lets go, and it is a real jump: a ladder is never a trap
      if (input.take('jump')) {
        this.climbing = false;
        this.vy = JUMP_V * 0.85;
        this.jumpBufT = 0; this.groundedT = 0;
        this.justJumped = true;
        this.cutJump = true;
      } else {
        const up = (input.down.up ? 1 : 0) - (input.down.down ? 1 : 0);
        // STEPPING OFF is not a special move: hold a direction with no
        // up/down and the ladder lets go, which is what puts him on the deck
        // he has just climbed to. Without it, the top of a ladder is a place
        // you can only leave by jumping — a trap with rungs.
        if (up === 0 && ax !== 0) {
          this.climbing = false;
        } else {
          // drain the up EDGE while it is being held as a climb, or the
          // stale press is read as a jump the moment he steps off the top —
          // the same double-consume trap the mount already pays for
          input.take('up');
          this.vy = up * CLIMB_V;
          this.vx = 0;
          const mid = Math.floor(this.x) + 0.5;   // climb straight
          this.x += (mid - this.x) * Math.min(1, 12 * dt);
          const top = this.level.climbTop(this.x, this.y);
          this.y = this.level.moveY(this.box(), this.vy * dt).y;
          // top out with the feet ON the deck, never a rung above it
          if (top !== null && this.y > top) { this.y = top; this.vy = 0; }
          this.grounded = this.level.grounded(this.box());
          this.groundedT = this.grounded ? COYOTE : 0;
          this.updateVisual();
          return;
        }
      }
    }

    // horizontal: accelerate hard, stop hard — tap = a step, hold = a run
    const acc = this.grounded ? ACC : ACC_AIR;
    // …and wading caps the RUN, not the acceleration: you get up to speed as
    // sharply as ever and simply cannot go as fast, which reads as heavy
    // water rather than as sluggish controls.
    const top = (this.grounded && this.level.waterAt(this.x, this.y)) ? RUN * WADE : RUN;
    if (ax !== 0) {
      this.vx += ax * acc * dt;
      this.vx = Math.max(-top, Math.min(top, this.vx));
      this.kid.setFace(ax);
    } else if (this.grounded) {
      const s = Math.sign(this.vx);
      this.vx -= s * FRIC * dt;
      if (Math.sign(this.vx) !== s) this.vx = 0;
    }

    // jump: buffered + coyote, variable height on release
    if (input.take('jump') || input.take('up')) this.jumpBufT = BUFFER;
    else this.jumpBufT -= dt;
    if (this.jumpBufT > 0 && this.groundedT > 0) {
      this.vy = JUMP_V; this.jumpBufT = 0; this.groundedT = 0;
      this.justJumped = true;
      this.cutJump = true;            // his jump, so his to cut short
    }
    if (this.cutJump && !input.down.jump && !input.down.up && this.vy > 4) this.vy = 4;

    this.vy -= GRAV * (this.vy < 0 ? FALL_X : 1) * dt;
    this.vy = Math.max(this.vy, -22);

    const mx = this.level.moveX(this.box(), this.vx * dt);
    this.x = mx.x; if (mx.hit) this.vx = 0;
    const wasAt = this.y;                       // …for the platform pass
    const my = this.level.moveY(this.box(), this.vy * dt);
    this.y = my.y;
    if (my.hit) {
      // a tarp answers a landing with a bigger one, and it is checked BEFORE
      // the landing is zeroed, because the bounce IS the landing
      if (my.grounded && this.level.tarpAt(this.x, my.y) && this.vy < -1) {
        this.vy = TARP_V;
        this.cutJump = false;         // …and this one
        this.squash = 0.14;
        this.justBounced = true;
      } else {
        if (my.grounded && this.vy < -9) this.squash = 0.12; // hard landing
        this.vy = 0;
      }
    }
    this.grounded = my.grounded || this.level.grounded(this.box());

    // ---- THE PLATFORM PASS -------------------------------------------
    // The one place in this game where the floor is not a tile. It runs
    // AFTER the tile pass, so a tile always wins: standing on solid ground
    // is never overridden by a hoist passing underneath.
    //
    // Two ways to be on one, and they are genuinely different questions:
    //
    //   LANDING — falling, and the feet crossed the deck between last frame
    //   and this one. Tested as a crossing rather than as an overlap, or a
    //   fast fall tunnels straight through a platform one tile thick.
    //
    //   RIDING — already carried, still over it, not jumping. This is what
    //   a rising hoist needs: it comes UP into the feet, so the crossing
    //   test above can never fire, and without this branch the player sinks
    //   through a lift that is travelling towards them.
    //
    // `carrier` is kept across frames because that is the only way to tell
    // the two apart.
    let onDeck = null;
    for (const h of this.level.platforms) {
      if (!h.overlaps(this.x, this.hw)) continue;
      const top = h.top;
      const landing = this.vy <= 0 && wasAt >= top - 0.02 && this.y <= top + 0.02;
      const riding = this.carrier === h && this.vy <= 0.01 && Math.abs(this.y - top) < 0.7;
      if (landing || riding) { onDeck = h; break; }
    }
    if (onDeck) {
      this.y = onDeck.top;
      this.vy = 0;
      this.grounded = true;
    }
    this.carrier = onDeck;

    // the belt: it moves the FLOOR, so it is applied after the move and does
    // not touch vx — you still run at your own speed, on ground that
    // disagrees with you
    if (this.grounded) {
      const belt = this.level.beltAt(this.x, this.y);
      if (belt) this.x = this.level.moveX(this.box(), belt * BELT * dt).x;
    }
    this.groundedT = this.grounded ? COYOTE : this.groundedT - dt;
    if (this.grounded && !wasGrounded) this.justLanded = true;

    // fell in the pit (its floor is dressing, not ground): back to the near side
    // …and the level says where he comes back, not a number left here by a
    // debugging session. `x = 43` is a LEVEL 2 coordinate — it sits at that
    // room's third ladder — so every fall in every level landed there,
    // skipping checkpoints and sometimes whole sections. `fallRespawn` was
    // written for exactly this and was simply never called.
    if (this.y < 0.9) {
      const r = this.level.fallRespawn(this.x);
      this.x = r.x; this.y = r.y; this.vx = 0; this.vy = 0;
    }

    this.updateVisual();
  }

  updateVisual() {
    const k = this.kid;
    k.group.position.set(this.x, this.y, 0);
    this.squash = Math.max(0, this.squash - 0.016);
    k.group.scale.y = this.squash > 0 ? 0.86 : 1;
    // mercy flicker — the one place the kid is allowed to disappear
    k.group.visible = this.mercyT <= 0 || Math.floor(this.mercyT * 18) % 2 === 0;
    const state = this.climbing ? 'climb'
      : !this.grounded ? 'air'
      : Math.abs(this.vx) > 0.4 ? 'run' : 'idle';
    k.pose(state, this.t, Math.abs(this.vx));
    const gy = this.level.groundTop(this.x, this.y + 0.1);
    k.shadow.position.set(this.x, gy + 0.02, 0);
    const drop = Math.max(0, this.y - gy);
    k.shadow.scale.setScalar(Math.max(0.35, 1 - drop * 0.12));
    k.shadow.material.opacity = Math.max(0.08, 0.28 - drop * 0.03);
    k.shadow.visible = gy > -3;
  }
}
