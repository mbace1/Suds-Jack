// EERI — the small robots, and the small hazards.
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ CROSS-LANE EDIT, DECLARED. This file belongs to DESIGN/LEVEL (see    │
// │ CLAUDE.md's lanes table). It was edited by the ART lane on           │
// │ 2026-08-19, with the owner's explicit go-ahead, to add ONE thing:    │
// │ the asset seam. Every enemy in this game had a finished, rigged,     │
// │ contract-checked 3D model sitting in assets/3d — and this file never │
// │ imported assets.js, so not one of them could ever be loaded.         │
// │ `art-src/tools/audit-assets.mjs` counts them: 18 unreachable files.  │
// │                                                                      │
// │ NOTHING ABOUT THE BEHAVIOUR WAS TOUCHED. The clock, the states, the  │
// │ speeds, the telegraph timings, the stomp rules and buildRobot() are  │
// │ byte-for-byte what they were. The only change is that a robot now    │
// │ ASKS for a model first and draws its own when there is not one —     │
// │ which is the same seam js/main.js already uses for Eeri, the         │
// │ excavator, the crane, the flag and the checkpoint.                   │
// │                                                                      │
// │ If Design/Level wants this reverted, deleting `adoptModel` and the   │
// │ `asset` argument restores the previous behaviour exactly; the code   │
// │ path it falls back to is the one that was always here.               │
// └──────────────────────────────────────────────────────────────────────┘
//
// The house rule is the one the game already lives by: EVERYTHING
// TELEGRAPHS, and nothing kills. A robot is not a chaser — it patrols a
// declared span of floor (js/parts.js refuses to place one across a hole),
// it notices you, it winds up, and only then does it lunge. The cost is the
// Yoshi rule: a hit takes the RIDE, not the run.
//
// The clock is flashprince's sentry, compressed: patrol → notice → wind →
// lunge → recover, one state string and one accumulator, so the animation
// and the danger read off the same number and cannot disagree.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=51';
import { craftMat, craftBox, outlineShell } from './craft.js?v=51';
import { CLOCK } from './parts.js?v=51';
import { getModel } from './assets.js?v=51';

// The telegraph clock is DESIGN §4.1's, and it lives in parts.js so the room
// prover can hold it to the 1.0s floor — these three were all under it.
const { notice: NOTICE, wind: WIND, lunge: LUNGE, recover: RECOVER } = CLOCK.skitter;
const SEE = 5.2, WALK = 1.5, LUNGE_SPEED = 6.4;

// THREE KINDS (DESIGN §3), and the split is the point of having more than
// one — each asks the player to read a different thing:
//
//   hopper   a TIMING test — a fixed 1.35 s rhythm, and the crouch is the tell
//   roller   a SPACING test — it trundles its span and never reacts. Too flat
//            to stomp: landing on one bounces you off without killing it,
//            which is the game saying "this one you jump"
//   skitter  a PROVOCATION test — the original: patrol, notice, wind, lunge
//   bucket   a PROXIMITY test — an abandoned digger bucket asleep on the
//            floor. It does not patrol and it cannot be provoked from
//            across the room: it wakes when you LAND near it, lifts its
//            head for half a second, chases for two, then gives up and
//            settles. The answer is always to go round or to wait, never
//            to outrun it — a pursuer that never stops is a different
//            game, and not this one (DESIGN §4.1).
const HOP_CYCLE = CLOCK.hopper.cycle, HOP_RISE = CLOCK.hopper.rise, HOP_CROUCH = CLOCK.hopper.crouch;
const ROLL_SPEED = CLOCK.roller.speed;
const BKT = CLOCK.bucket;

// Every surface here goes through craftMat + craftBox — painted balsa, the
// same material the machines wear (§3.3, ART_TARGET §0.05). A prop built
// with a bare material is flat paint in a crafted world, and that is the
// exact failure craft.js exists to make impossible.

// ---- THE ASSET SEAM (added by the Art lane — see the banner above) -------
//
// Which catalogue entry each KIND wears. The game's kinds and the manifest's
// names are deliberately not the same words: `skitter` is the behaviour and
// `boltbot` is the thing wearing it, and `roller` the enemy is `rollerbot`
// because `roller` in the catalogue is the rideable road roller.
const MODEL_FOR = { skitter: 'boltbot', hopper: 'hopper', bucket: 'bucket', roller: 'rollerbot' };

// A 3/4 turn, the same constant js/kid.js uses and for the same reason: these
// rigs are modelled facing +z and the game drives facing along ±x.
const FACE_TURN = 0.42 * Math.PI;

// The eye tell's radius in TILES — a world measurement, deliberately, because
// the thing it hangs off is not in world units (see adoptModel).
const TELL_R = 0.075;

// Which clip each game STATE reads as. The states are the design's and are not
// negotiable here; this is only a costume, so anything unmapped falls back to
// idle and a rig with no idle falls back to its first clip.
const CLIP_FOR = {
  patrol: 'walk', roll: 'walk', lunge: 'run', wake: 'wake', hop: 'hop',
  crouch: 'idle', notice: 'idle', wind: 'idle', recover: 'idle', sleep: 'idle',
};

// ONE LOAD PER ROBOT, not one per kind, and it is not an oversight: a skinned
// mesh cannot be safely cloned without SkeletonUtils, which is not in vendor/,
// and two robots sharing one skeleton animate as a single puppet. getModel
// builds a fresh graph each call and the browser serves the bytes from cache,
// so the cost is a parse, not a download.
//
// Returns null for "draw your own", which is every failure mode: no entry, not
// live, a missing contracted node, a decode error, or no network. Art is the
// one thing in this game allowed to be absent.
export async function loadRobotAsset(kind) {
  const name = MODEL_FOR[kind];
  if (!name) return null;
  try {
    const a = await getModel(name, () => null);
    return a?.root ? a : null;
  } catch { return null; }
}

// Dress a robot in a loaded model, returning the same `{ group, eye, legs }`
// buildRobot() returns so nothing downstream can tell the difference.
function adoptModel(asset, kind) {
  const outer = new THREE.Group();
  const turn = new THREE.Group();
  // a node rig was cut with its yaw already declared in slice.mjs and comes
  // out facing +x; only the skinned rigs need bringing round from +z
  turn.rotation.y = asset.skinned ? FACE_TURN : 0;
  turn.add(asset.root);
  outer.add(turn);

  let eye = null;
  const legs = [];

  if (asset.skinned) {
    // The three skinned enemies are ONE mesh called `char1` with the eye
    // painted into the texture — there is nothing to brighten. DESIGN §3 is
    // explicit that the telegraph IS the enemy design, and an enemy with
    // nothing to brighten cannot be read, so the tell is added: a small lamp
    // parented to the `Head` bone, which is where the eye already looks like
    // it is. MeshBasicMaterial because a tell must not be dimmed by the scene.
    let head = null;
    asset.root.traverse((o) => { if (!head && /^head/i.test(o.name || '')) head = o; });
    eye = new THREE.Mesh(
      new THREE.SphereGeometry(TELL_R, 8, 6),
      new THREE.MeshBasicMaterial({ color: PAL.HAZARD }),
    );
    eye.name = 'tell';
    // The tell does NOT get the silhouette line. Everything else on the enemy
    // is outlined so it separates from the scenery; the one part whose whole
    // job is to be a bright signal would only be dulled by a dark ring around
    // it. `__outline` is what outlineShell skips, so claiming it here is how
    // a mesh opts out.
    eye.userData.__outline = true;
    // A BONE IS NOT IN WORLD UNITS, and this one is not close. Meshy rigs its
    // skeletons at roughly 1/90 scale, so the `Head` bone's world scale here
    // is 0.011 — parent a 0.075-radius sphere to it and the tell comes out
    // **0.002 tiles across**, which is not small, it is absent. Every one of
    // the three skinned enemies shipped its telegraph invisible and no gate
    // could see it: the model loads, the contract holds, the clip plays, and
    // the one thing DESIGN §3 calls the enemy design is simply not on screen.
    // So the bone's scale is divided back out — both from the sphere and from
    // the offset, which is in the same local units and was putting the tell
    // a millimetre inside the head rather than on its face.
    if (head) {
      head.updateWorldMatrix(true, false);
      const s = new THREE.Vector3();
      head.getWorldScale(s);
      const k = s.x > 1e-6 ? 1 / s.x : 1;
      eye.scale.setScalar(k);
      eye.position.set(0, 0.02 * k, 0.10 * k);
      head.add(eye);
    } else { eye.position.set(0.16, 0.62, 0.14); outer.add(eye); }
  } else {
    // A cut node may be a GROUP wrapping `<name>_mesh` rather than a mesh —
    // rollerbot was cut before slice.mjs grew `flatten`, so `eye` is a group
    // and `eye.material` is undefined. The checkpoint's lamp threw on exactly
    // this. Resolve to the first real mesh underneath.
    const meshOf = (n) => {
      if (!n) return null;
      if (n.isMesh) return n;
      let m = null; n.traverse((o) => { if (!m && o.isMesh) m = o; });
      return m;
    };
    eye = meshOf(asset.nodes?.eye);
    // AND IT NEEDS ITS OWN MATERIAL. slice.mjs gives every node of a model one
    // SHARED material, so brightening the eye would brighten the whole robot.
    if (eye) eye.material = eye.material.clone();
    // `legs` is what the walk cycle SPINS, so `squash` is deliberately not in
    // it — that node is the stomp response's, and a spinning squash node is a
    // robot whose whole body rotates when it walks.
    for (const n of ['wheels', 'drum']) {
      const m = asset.nodes?.[n];
      if (m) legs.push(m);
    }
  }

  // AND IT NEEDS AN EDGE, for the reason v15.28 measured rather than guessed:
  // flipped live, these read as brown blobs at gameplay scale. The mesh is a
  // mid-brown against pipe stacks and timber of the same value, where the
  // code box it replaced was the cast's orange — so the better art was the
  // worse picture, which is the only kind of art regression worth catching.
  // Same remedy the kid got in v15.25 and the same one that note names: a
  // back-face shell in INK, built from the model so it follows the pose and
  // the bones for free. Applied AFTER the eye is parented on purpose — the
  // tell is meant to be the one thing on the enemy that is not outlined.
  outlineShell(asset.root);

  // Last line of defence: the telegraph code sets `eye.material.color` every
  // frame and must never be handed something without one.
  if (!eye?.material?.color) return null;

  const out = { group: outer, eye, legs };
  if (asset.skinned && asset.clips) {
    out.mixer = new THREE.AnimationMixer(asset.root);
    out.actions = {};
    for (const [name, clip] of Object.entries(asset.clips)) {
      out.actions[name] = out.mixer.clipAction(clip);
    }
    out.firstClip = Object.keys(out.actions)[0] || null;
  }
  return out;
}

function buildRobot(kind) {
  const g = new THREE.Group();
  const M = (c) => craftMat(c, 'balsa');
  const box = (w, h, d, c, x, y, z) => {
    const m = craftBox(w, h, d, M(c));
    m.position.set(x, y, z); g.add(m); return m;
  };
  const legs = [];
  let eye;

  if (kind === 'bucket') {
    // A DIGGER BUCKET, and the silhouette has to say "this is machinery
    // that fell off a machine" from across the screen: a wide steel scoop
    // with teeth along its lip, sitting low. Asleep it reads as debris,
    // which is the point — the tell is the head lifting, not the shape.
    box(0.86, 0.42, 0.66, PAL.STEEL[1], 0, 0.21, 0);          // the scoop
    box(0.9, 0.12, 0.7, PAL.STEEL[2], 0, 0.44, 0);            // the lip
    for (const tx of [-0.3, -0.1, 0.1, 0.3]) {                // teeth
      box(0.1, 0.16, 0.12, PAL.STEEL[3], tx, 0.52, 0.3);
    }
    box(0.3, 0.26, 0.34, PAL.MACHINE_DK, 0.1, 0.6, 0);        // the head
    // two stubby feet, so it can be seen to move rather than slide
    for (const lx of [-0.24, 0.24]) legs.push(box(0.16, 0.18, 0.2, PAL.STEEL[2], lx, 0.09, 0));
    eye = box(0.1, 0.1, 0.06, PAL.HAZARD, 0.24, 0.63, 0.16);
  } else if (kind === 'roller') {
    // a mini road roller: WIDE and LOW, and the silhouette is the drum. It
    // has to read as "you cannot land on this" from across the screen.
    box(0.9, 0.26, 0.56, PAL.MACHINE_DK, 0, 0.4, 0);                // deck
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.62, 12), M(PAL.STEEL[2]));
    drum.rotation.x = Math.PI / 2; drum.position.set(0, 0.28, 0);
    g.add(drum); legs.push(drum);
    box(0.24, 0.2, 0.4, PAL.DARK, -0.34, 0.5, 0);                   // the cab
    eye = box(0.14, 0.12, 0.1, PAL.HAZARD, 0.4, 0.44, 0);
  } else if (kind === 'hopper') {
    // a jackhammer on legs: TALL and narrow, the mass up top, so the crouch
    // before a hop is legible at any size
    box(0.34, 0.5, 0.34, PAL.MACHINE_DK, 0, 0.62, 0);               // body
    box(0.44, 0.12, 0.44, mix(PAL.MACHINE, PAL.INK, 0.2), 0, 0.92, 0);  // collar
    box(0.16, 0.42, 0.16, PAL.STEEL[2], 0, 0.2, 0);                 // the pick
    eye = box(0.13, 0.13, 0.1, PAL.HAZARD, 0.19, 0.74, 0);
    for (const dz of [0.16, -0.16]) legs.push(box(0.09, 0.3, 0.09, PAL.DARK, 0, 0.2, dz));
  } else {
    // squat, wide, one exaggerated feature: the eye. Machine yellow says it
    // belongs to the worksite; hazard red says this one is not yours.
    box(0.62, 0.42, 0.5, PAL.MACHINE_DK, 0, 0.34, 0);          // body
    box(0.66, 0.1, 0.54, PAL.DARK, 0, 0.12, 0);                // skirt
    eye = box(0.16, 0.16, 0.1, PAL.HAZARD, 0.26, 0.4, 0);      // the eye
    box(0.5, 0.12, 0.42, mix(PAL.MACHINE, PAL.INK, 0.2), 0, 0.6, 0);
    for (const dx of [-0.2, 0.2]) {
      for (const dz of [0.18, -0.18]) {
        legs.push(box(0.1, 0.24, 0.1, PAL.DARK, dx, 0.12, dz));
      }
    }
  }
  // The telegraph is named the same on both sides of the seam, because the
  // rule the gate checks is about the GAME — the tell has to be a size you
  // can see — and not about which art is behind it today.
  eye.name = 'tell';
  return { group: g, eye, legs };
}

export class Robot {
  // span = { c0, c1, kind, cy } in cells; it never leaves it, and `cy` puts
  // it on a DECK rather than on the ground
  // `asset` is optional and may be null — see the banner at the top of this
  // file. Null means "draw your own", which is what this class always did.
  constructor(scene, level, span, asset = null) {
    this.level = level;
    this.c0 = span.c0; this.c1 = span.c1;
    this.kind = span.kind || 'skitter';
    this.x = (span.c0 + span.c1) / 2;
    // the deck it was DECLARED on, not "whatever is under it right now" —
    // groundTop from a fixed height puts every deck robot back on the floor
    this.deck = span.cy ?? null;
    this.y = level.groundTop(this.x, this.deck ?? 8);
    this.baseY = this.y;
    this.face = 1;
    this.state = 'patrol'; this.t = 0;
    this.dead = false;
    this.hop = 0; this.shrugT = 0;
    // ASK FOR A MODEL, DRAW ONE IF THERE IS NOT ONE. adoptModel returns null
    // for anything it cannot dress safely — no eye to brighten, a node that is
    // not a mesh — so a half-usable model falls back rather than half-works.
    const built = (asset && adoptModel(asset, this.kind)) || buildRobot(this.kind);
    this.group = built.group;
    this.eye = built.eye;
    this.legs = built.legs;
    this.mixer = built.mixer || null;
    this.actions = built.actions || null;
    this.firstClip = built.firstClip || null;
    this.clip = null;
    this.hw = this.kind === 'roller' ? 0.46 : this.kind === 'hopper' ? 0.24
      : this.kind === 'bucket' ? 0.44 : 0.34;
    this.h = this.kind === 'roller' ? 0.5 : this.kind === 'hopper' ? 1.0
      : this.kind === 'bucket' ? 0.72 : 0.7;
    // asleep until landed near — see update()
    if (this.kind === 'bucket') this.state = 'sleep';
    // the roller is the one you jump rather than land on
    this.stompable = this.kind !== 'roller';
    this.group.position.set(this.x, this.y, 0);
    scene.add(this.group);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 14),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);
  }

  go(s) { this.state = s; this.t = 0; }

  // landed on and NOT stompable: it shoves you off, and for a moment it
  // cannot also hit you for it. Without this beat, bouncing off a roller
  // reads as bouncing off a roller AND walking into one, in the same frame.
  shrug() { this.shrugT = 0.4; }

  // The costume, and nothing else. It reads `this.state` — which the design's
  // own clock sets — and never writes it, so a missing clip can change how a
  // robot LOOKS and can never change what it DOES.
  playClip(dt) {
    if (!this.mixer) return;
    this.mixer.update(dt);
    const want = CLIP_FOR[this.state] || 'idle';
    const name = this.actions[want] ? want
      : this.actions.idle ? 'idle'
      : this.firstClip;
    if (!name || name === this.clip) return;
    const next = this.actions[name];
    const prev = this.clip && this.actions[this.clip];
    next.reset().play();
    if (prev) prev.crossFadeTo(next, 0.15, false); else next.fadeIn(0.1);
    this.clip = name;
  }

  update(dt, target, reduced) {
    if (this.dead) { this.fade(dt); this.playClip(dt); return; }
    this.t += dt;
    // one frame behind the state that is about to be computed, which is
    // invisible, and it keeps the costume out of every early return below
    this.playClip(dt);
    this.shrugT = Math.max(0, this.shrugT - dt);
    const dx = target.x - this.x;
    const near = Math.abs(dx) < SEE && Math.abs(target.y - this.y) < 2.2;

    // ---- the two kinds that never react ---------------------------------
    // Neither one hunts. A hopper is a metronome and a roller is a moving
    // wall; both are read from across the screen and neither can surprise
    // you, which is what makes them fair for a six-year-old.
    if (this.kind === 'hopper' || this.kind === 'roller') {
      if (this.kind === 'roller') {
        this.x += this.face * ROLL_SPEED * dt;
        if (this.x < this.c0) { this.x = this.c0; this.face = 1; }
        if (this.x > this.c1 + 1) { this.x = this.c1 + 1; this.face = -1; }
        this.state = 'roll';
      } else {
        // a fixed rhythm, and the CROUCH is the tell: it gathers visibly on
        // the ground for a third of a second before it leaves
        const k = this.t % HOP_CYCLE;
        const p = k < HOP_CROUCH ? 0 : (k - HOP_CROUCH) / Math.max(0.001, HOP_CYCLE - HOP_CROUCH);
        this.hop = Math.sin(p * Math.PI) * HOP_RISE;
        this.state = k < HOP_CROUCH ? 'crouch' : 'hop';
        this.face = Math.sign(dx) || this.face;
      }
      const floor = this.deck !== null ? this.deck : this.level.groundTop(this.x, this.baseY + 1.2);
      this.y = floor + this.hop;
      this.group.position.set(this.x, this.y, 0);
      this.group.rotation.y = this.face > 0 ? 0 : Math.PI;
      this.group.scale.y = this.state === 'crouch' ? 0.78 : 1;
      if (this.kind === 'roller' && !reduced) {
        for (const l of this.legs) l.rotation.y += this.face * dt * 6;
      }
      this.eye.material.color.set(this.state === 'crouch'
        ? mix(PAL.HAZARD, '#ffffff', reduced ? 0.7 : (Math.sin(this.t * 26) * 0.5 + 0.5))
        : PAL.HAZARD);
      this.shadow.position.set(this.x, floor + 0.02, 0);
      return;
    }

    // ---- the bucket: asleep until you land beside it ---------------------
    // WAKING IS A LANDING, not a proximity radius, and that is the whole
    // design of it: walking past a sleeping bucket has to be safe, or the
    // beat becomes "never go near the pipe mouth" and the pipe stops being
    // the way across. `target.landed` is the frame the kid touches down.
    if (this.kind === 'bucket') {
      const heard = Math.abs(dx) < BKT.hear && Math.abs(target.y - this.y) < 2.4;
      // the landing EDGE, computed here rather than asked for: main.js
      // passes the kid's grounded flag and this is the frame it turns true
      const landed = !!target.grounded && this.wasAir === true;
      this.wasAir = !target.grounded;
      if (this.state === 'sleep') {
        if (heard && landed) { this.face = Math.sign(dx) || this.face; this.go('wake'); }
      } else if (this.state === 'wake') {
        // the head lifts and the lamp comes up: the telegraph, and it does
        // not move an inch during it
        if (this.t >= BKT.wake) this.go('chase');
      } else if (this.state === 'chase') {
        this.face = Math.sign(dx) || this.face;
        this.x += this.face * BKT.speed * dt;
        this.x = Math.max(this.c0 - 0.5, Math.min(this.c1 + 1.5, this.x));
        if (this.t >= BKT.chase) this.go('settle');
      } else if (this.state === 'settle') {
        if (this.t >= BKT.settle) this.go('sleep');
      }
      this.y = this.deck !== null ? this.deck : this.level.groundTop(this.x, this.y + 1.2);
      this.group.position.set(this.x, this.y, 0);
      this.group.rotation.y = this.face > 0 ? 0 : Math.PI;
      // asleep it sits low and dark; awake it stands up and the lamp burns
      const up = this.state === 'sleep' ? 0.86 : this.state === 'wake' ? 0.94 + Math.min(1, this.t / BKT.wake) * 0.06 : 1;
      this.group.scale.y = up;
      const lit = this.state === 'wake' || this.state === 'chase';
      const blink = reduced ? 1 : (Math.sin(this.t * 22) * 0.5 + 0.5);
      this.eye.material.color.set(this.state === 'sleep' ? PAL.STEEL[3]
        : lit ? mix(PAL.HAZARD, '#ffffff', blink * 0.7) : PAL.HAZARD);
      if (!reduced && this.state === 'chase') {
        for (let i = 0; i < this.legs.length; i++) {
          this.legs[i].position.y = 0.09 + Math.sin(this.t * 18 + i * Math.PI) * 0.04;
        }
      }
      this.shadow.position.set(this.x, this.y + 0.02, 0);
      return;
    }

    if (this.state === 'patrol') {
      this.x += this.face * WALK * dt;
      if (this.x < this.c0) { this.x = this.c0; this.face = 1; }
      if (this.x > this.c1 + 1) { this.x = this.c1 + 1; this.face = -1; }
      if (near) { this.face = Math.sign(dx) || this.face; this.go('notice'); }
    } else if (this.state === 'notice') {
      if (this.t >= NOTICE) this.go('wind');
    } else if (this.state === 'wind') {
      this.x -= this.face * 0.9 * dt;                       // it draws back
      if (this.t >= WIND) this.go('lunge');
    } else if (this.state === 'lunge') {
      this.x += this.face * LUNGE_SPEED * dt;
      // it will not leave its own floor, ever
      this.x = Math.max(this.c0 - 0.6, Math.min(this.c1 + 1.6, this.x));
      if (this.t >= LUNGE) this.go('recover');
    } else if (this.state === 'recover') {
      if (this.t >= RECOVER) this.go(near ? 'wind' : 'patrol');
    }

    this.y = this.deck !== null ? this.deck : this.level.groundTop(this.x, this.y + 1.2);
    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.y = this.face > 0 ? 0 : Math.PI;

    // the telegraph, drawn: the eye brightens through notice and wind, and
    // reduced motion holds it lit rather than flashing
    const hot = this.state === 'notice' || this.state === 'wind';
    const blink = reduced ? 1 : (Math.sin(this.t * 26) * 0.5 + 0.5);
    this.eye.material.color.set(hot ? mix(PAL.HAZARD, '#ffffff', blink * 0.7) : PAL.HAZARD);
    const crouch = this.state === 'wind' ? 0.82 : 1;
    this.group.scale.y = crouch;
    // legs scuttle while patrolling
    if (!reduced && this.state === 'patrol') {
      for (let i = 0; i < this.legs.length; i++) {
        this.legs[i].position.y = 0.12 + Math.sin(this.t * 14 + i * 1.6) * 0.03;
      }
    }
    this.shadow.position.set(this.x, this.y + 0.02, 0);
  }

  // For the skitter only the LUNGE hurts — one patrolling about is scenery
  // you step over, and that is what makes it a provocation test. A hopper or
  // a roller has no lunge, so touching one is the cost: they are read by
  // timing and spacing instead, and the way past both is over the top.
  hits(x, y, hw, h) {
    if (this.shrugT > 0) return false;
    if (this.kind === 'bucket') {
      // ASLEEP IS HARMLESS. Otherwise the tell is decoration: something you
      // cannot walk past teaches nothing by lifting its head first.
      if (this.state === 'sleep' || this.state === 'wake') return false;
      return !this.dead && Math.abs(x - this.x) < hw + this.hw
        && y < this.y + this.h && y + h > this.y;
    }
    if (this.kind === 'hopper' || this.kind === 'roller') {
      return !this.dead && Math.abs(x - this.x) < hw + this.hw
        && y < this.y + this.h && y + h > this.y;
    }
    return this.hitsLunging(x, y, hw, h);
  }

  hitsLunging(x, y, hw, h) {
    if (this.dead || this.state !== 'lunge') return false;
    return Math.abs(x - this.x) < hw + this.hw
      && y < this.y + this.h && y + h > this.y;
  }

  // a machine drives straight over one
  crush(mx, mhw) {
    if (this.dead || Math.abs(mx - this.x) > mhw + this.hw) return false;
    this.kill(false);
    return true;
  }

  // THE STOMP (DESIGN.md §2). Landing on one kills it and bounces you —
  // the verb that makes a platformer feel like a platformer, and the reason
  // these things are worth putting in a level rather than just avoiding.
  // Generous on purpose (age six): the test is only that he is FALLING and
  // roughly over it, never a precise hitbox.
  stompedBy(x, y, hw, vy) {
    if (!this.stompable || !this.landedOn(x, y, hw, vy)) return false;
    this.kill(true);
    return true;
  }

  // the same geometry WITHOUT the kill: a roller is landed on, not stomped,
  // and the game still owes you the bounce for having read it right
  landedOn(x, y, hw, vy) {
    if (this.dead || vy >= 0) return false;
    if (Math.abs(x - this.x) > hw + this.hw + 0.18) return false;
    return y >= this.y + this.h * 0.35 && y <= this.y + this.h + 0.85;
  }

  // squashed things do not vanish — they flatten, then go. A kill you do
  // not see is a kill you do not believe.
  kill(squash) {
    this.dead = true;
    this.squashT = squash ? 0.34 : 0;
    if (!squash) { this.group.visible = false; this.shadow.visible = false; }
  }

  // called from update() while dead, to play the flatten out
  fade(dt) {
    if (this.squashT === undefined || this.squashT <= 0) return;
    this.squashT -= dt;
    const k = Math.max(0, this.squashT / 0.34);
    this.group.scale.set(1 + (1 - k) * 0.5, Math.max(0.06, k), 1 + (1 - k) * 0.5);
    this.group.position.y = this.y;
    if (this.squashT <= 0) { this.group.visible = false; this.shadow.visible = false; }
  }
}

// ---- a small hazard: a steam vent on the floor ---------------------------
// It breathes on a fixed clock with a visible tell before it blows, so it is
// a rhythm to walk through rather than a surprise.

const VENT_CYCLE = CLOCK.vent.cycle, VENT_WARN = CLOCK.vent.warn, VENT_BLOW = CLOCK.vent.blow;

export class SteamVent {
  constructor(scene, level, x) {
    this.x = x;
    this.y = level.groundTop(x, 8);
    this.t = Math.random() * VENT_CYCLE;

    this.group = new THREE.Group();
    this.group.position.set(x, this.y, 0);
    const M = (c) => craftMat(c, 'balsa');
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.16, 10), M(PAL.STEEL[1]));
    cap.position.y = 0.08; this.group.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 14), M(PAL.MACHINE));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.16; this.group.add(ring);

    this.puffs = [];
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 7),
        new THREE.MeshBasicMaterial({ color: PAL.CLOUD, transparent: true, opacity: 0 }),
      );
      p.life = 1; this.puffs.push(p); scene.add(p);
    }
    scene.add(this.group);
  }

  get blowing() {
    const k = this.t % VENT_CYCLE;
    return k > VENT_WARN && k < VENT_WARN + VENT_BLOW;
  }
  get warning() { return (this.t % VENT_CYCLE) <= VENT_WARN; }

  update(dt, reduced) {
    this.t += dt;
    if (this.blowing) {
      const p = this.puffs.find((q) => q.life >= 1);
      if (p) {
        p.life = 0;
        p.position.set(this.x + (Math.random() - 0.5) * 0.3, this.y + 0.2, (Math.random() - 0.5) * 0.6);
        p.scale.setScalar(0.6);
      }
    }
    for (const p of this.puffs) {
      if (p.life >= 1) { p.material.opacity = 0; continue; }
      p.life = Math.min(1, p.life + dt / 0.8);
      p.position.y += 3.4 * dt;
      p.scale.setScalar(0.6 + p.life * 2.4);
      p.material.opacity = 0.7 * (1 - p.life);
    }
    // the tell: the collar glows before it blows, steady under reduced motion
    const ring = this.group.children[1];
    ring.material.color.set(this.warning
      ? mix(PAL.MACHINE, PAL.HAZARD, reduced ? 0.7 : (Math.sin(this.t * 22) * 0.5 + 0.5))
      : PAL.MACHINE);
  }

  hits(x, y, hw, h) {
    if (!this.blowing) return false;
    return Math.abs(x - this.x) < hw + 0.42 && y < this.y + 2.2 && y + h > this.y;
  }
}
