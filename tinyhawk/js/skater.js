// ── Skater ─────────────────────────────────────────────────────────────────
// The tiny2d physics, lifted into 3D: integrate ballistically, then ask the
// heightfield whether we ended up underground, and if so project velocity onto
// the surface tangent plane. The only change is that the tangent comes from a
// gradient rather than a scalar slope — so rolling into a quarterpipe, pumping
// a transition and launching off a lip all fall out of the same three lines.
//
// On top of that, the things that make it a skateboard rather than a ball:
//   • grip — lateral velocity decays fast, so the board carves instead of sliding
//   • heading — the board points where you steer, and the LANDING is judged on
//     whether the board agrees with where you are actually travelling
//   • fakie — landing at ~180° is legal and worth more, not a bail

import * as THREE from 'three';
import { PARK_EXTENT } from './park.js?v=2';

const G          = 26;
const PUSH       = 16;    // acceleration while the stick is deflected
const TURN       = 2.6;   // rad/s of steering at full stick, low speed
const GRIP       = 8;     // how fast lateral velocity dies (per second)
const ROLL_FRIC  = 0.32;
const AIR_DRAG   = 0.05;
const POP        = 10.5;  // ollie impulse along the surface normal, at power 1
const SPIN_RATE  = 6.4;   // rad/s of yaw in the air
const FLIP_RATE  = 5.4;
const TRICK_DUR  = 0.34;
const BAIL_TIME  = 1.0;
const MAX_SPEED  = 34;
const LAND_TOL   = 0.72;  // radians (~41°) of heading error still counted clean

// ── Grinds and manuals ─────────────────────────────────────────────────────
// Both are UNSTABLE EQUILIBRIA: balance accelerates away from centre on its
// own, and the stick is the only thing holding it. That is the whole mechanic —
// a grind you can hold forever is not a skill, it is a corridor.
const GRIND_LOCK_XZ = 1.25;   // how close to a rail counts as catching it
const GRIND_LOCK_Y  = 1.1;
const GRIND_MIN_SPD = 4;      // slower than this and you just fall off it
const GRIND_FRIC    = 0.55;   // rails are slow; that is the trade for the score
const GRIND_INSTAB  = 3.4;    // how hard balance runs away
const GRIND_CORRECT = 3.6;    // how hard the stick pulls it back
const GRIND_POP     = 7.5;    // ollie out of a grind
const MANUAL_INSTAB = 2.6;
const MANUAL_CORRECT= 3.2;
const MANUAL_MIN_SPD= 3.5;

const _g = new THREE.Vector3(0, -G, 0);
const _n = new THREE.Vector3();
const _hv = new THREE.Vector3();
const _lat = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _m = new THREE.Matrix4();

// ── The prism ──────────────────────────────────────────────────────────────
// The skater is a faceted crystal, not a painted figure. Hue is driven by the
// FACE NORMAL, so every facet catches a different colour as the body turns —
// iridescence with no lights and no environment map. The fresnel rim is pushed
// past 1.0 so the composer's bloom grabs the edges and nothing else.
export function prismMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uPhase: { value: 0 }, uWash: { value: new THREE.Vector3(1, 1, 1) } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uPhase; uniform vec3 uWash;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
        vec3 hue = 0.5 + 0.5 * cos(6.28318 * (vN * 1.15 + vec3(0.0, 0.33, 0.67)) + uPhase);
        // Mostly dark: the colour lives at glancing angles, so the body reads
        // as smoked glass catching light rather than as painted plastic.
        vec3 col = hue * (0.16 + 0.95 * f);
        col += vec3(1.0, 0.96, 0.9) * pow(f, 4.0) * 1.5;
        gl_FragColor = vec4(col * uWash, 1.0);
      }`,
  });
}

// Flat facets: split the geometry so every triangle owns its vertices, then
// recompute normals. Without this an icosahedron shades smooth and the whole
// crystal read collapses.
function facet(geo) {
  // Octahedron/Icosahedron already come non-indexed; only box-likes need it.
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  return g;
}

function piece(group, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(facet(geo), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  group.add(m);
  return m;
}

// Built facing +Z, so world heading is (sin yaw, 0, cos yaw) and Object3D's own
// Y rotation convention applies without a correction anywhere.
function buildSkater(mat) {
  const g = new THREE.Group();
  piece(g, new THREE.BoxGeometry(0.72, 0.1, 2.4), mat, 0, 0.2, 0);
  piece(g, new THREE.BoxGeometry(0.84, 0.22, 0.22), mat, 0, 0.09, 0.75);
  piece(g, new THREE.BoxGeometry(0.84, 0.22, 0.22), mat, 0, 0.09, -0.75);
  piece(g, new THREE.OctahedronGeometry(0.42, 0), mat, 0, 0.72, 0.4, 0.8, 1.9, 0.9);
  piece(g, new THREE.OctahedronGeometry(0.42, 0), mat, 0, 0.72, -0.4, 0.8, 1.9, 0.9);
  piece(g, new THREE.IcosahedronGeometry(0.62, 0), mat, 0, 1.52, 0, 1, 1.15, 1.25);
  piece(g, new THREE.OctahedronGeometry(0.3, 0), mat, 0.44, 1.58, 0.28, 0.7, 2.1, 0.7);
  piece(g, new THREE.OctahedronGeometry(0.3, 0), mat, -0.44, 1.64, -0.22, 0.7, 2.1, 0.7);
  piece(g, new THREE.IcosahedronGeometry(0.34, 0), mat, 0, 2.28, 0.02, 1, 1.15, 1);
  return g;
}

export class Skater {
  constructor(scene, park) {
    this.park = park;
    this.root = new THREE.Group();      // position + orientation
    this.mat = prismMaterial();
    this.body = buildSkater(this.mat);  // trick rotations live here
    this.root.add(this.body);
    scene.add(this.root);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.setModifiers();
    this.reset();
  }

  setModifiers(mods = {}) {
    this.mods = {
      grindCorrect: mods.grindCorrect ?? 1,
      maxSpeed: mods.maxSpeed ?? 1,
      turn: mods.turn ?? 1,
      landingTolerance: mods.landingTolerance ?? 1,
      grindFriction: mods.grindFriction ?? 1,
    };
  }

  reset() {
    this.pos.set(0, 0, 24);
    this.pos.y = this.park.height(this.pos.x, this.pos.z);
    this.vel.set(0, 0, -6);
    this.yaw = Math.PI;          // facing -z, into the park
    this.grounded = true;
    this.up.set(0, 1, 0);
    this.trick = null;
    this.trickPhase = 0;
    this.flipPhase = 0;
    this.spinAccum = 0;
    this.airTime = 0;
    this.airTricks = [];
    this.bailT = 0;
    this.fakie = false;
    this.grind = null;    // { rail, t, dir, balance, balVel, time, name }
    this.manual = null;   // { balance, balVel, time }
    this.loading = false;
    this.hazardCooldown = 0;
  }

  get speed() { return this.vel.length(); }
  get bailing() { return this.bailT > 0; }
  /** True whenever a combo should stay open: airborne, grinding or manualling. */
  get chaining() { return !this.grounded || !!this.grind || !!this.manual; }

  update(dt, input, camYaw) {
    const ev = [];
    const park = this.park;
    if (this.bailT > 0) this.bailT = Math.max(0, this.bailT - dt);
    if (this.hazardCooldown > 0) this.hazardCooldown -= dt;

    const mv = input.getMove();
    const mag = Math.hypot(mv.x, mv.y);
    const locked = this.bailing;

    // Camera-relative desired heading. Camera forward is (sin, 0, cos) and its
    // right is (cos, 0, -sin) — three.js' own Y-rotation basis, so nothing here
    // needs a sign correction.
    const cs = Math.sin(camYaw), cc = Math.cos(camYaw);
    const wantX = cs * mv.y + cc * mv.x;
    const wantZ = cc * mv.y - cs * mv.x;

    // ── Actions ─────────────────────────────────────────────────────────
    for (const a of input.consumeActions()) {
      if (locked) continue;
      if (this.grind) {
        // Ollie out of a grind: keep the speed you carried down the rail.
        if (a.pop || a.dir === 'up') {
          this.vel.y += GRIND_POP * a.power;
          ev.push(this.endGrind('popped'));
          this.grounded = false;
          if (a.pop && a.dir !== 'up') {
            this.trick = { t: 0, dir: a.dir };
            this.airTricks.push(a.dir);
            ev.push({ type: 'trick', dir: a.dir });
          }
        }
      } else if (this.grounded) {
        if (a.pop || a.dir === 'up') {
          park.normal(this.pos.x, this.pos.z, _n);
          this.vel.addScaledVector(_n, POP * a.power);
          this.grounded = false;
          this.airTime = 0;
          this.spinAccum = 0;
          this.airTricks = [];
          if (this.manual) ev.push(this.endManual());
          ev.push({ type: 'ollie', power: a.power });
          if (a.pop && a.dir !== 'up') {
            this.trick = { t: 0, dir: a.dir };
            this.airTricks.push(a.dir);
            ev.push({ type: 'trick', dir: a.dir });
          }
        } else if (a.dir === 'down' && this.speed > MANUAL_MIN_SPD) {
          if (this.manual) { ev.push(this.endManual()); }
          else {
            this.manual = { balance: (Math.random() - 0.5) * 0.2, balVel: 0, time: 0 };
            ev.push({ type: 'manualStart' });
          }
        }
      } else if (!this.trick) {
        this.trick = { t: 0, dir: a.dir };
        this.airTricks.push(a.dir);
        ev.push({ type: 'trick', dir: a.dir });
      }
    }

    // ── Trick rotation ──────────────────────────────────────────────────
    if (this.trick) {
      this.trick.t += dt;
      this.trickPhase = Math.min(this.trick.t / TRICK_DUR, 1);
      if (this.trick.t >= TRICK_DUR) { this.trick = null; this.trickPhase = 0; }
    }

    if (this.grind) {
      // ── Grinding ──────────────────────────────────────────────────────
      const g = this.grind, r = g.rail;
      g.time += dt;
      // Rails are slow, and they tilt you down their own slope.
      g.vAlong *= Math.exp(-GRIND_FRIC * this.mods.grindFriction * dt);
      g.vAlong += -G * r.dir.y * dt;
      g.t += (g.vAlong * dt) / r.len;

      // Balance runs away from centre; the stick is all that holds it.
      g.balVel += g.balance * GRIND_INSTAB * dt;
      g.balVel -= mv.x * GRIND_CORRECT * this.mods.grindCorrect * dt;
      g.balVel *= Math.exp(-1.6 * dt);
      g.balance += g.balVel * dt;

      this.pos.copy(r.a).addScaledVector(r.dir, r.len * g.t);
      this.vel.copy(r.dir).multiplyScalar(g.vAlong);
      this.up.lerp(_UP, 1 - Math.pow(0.02, dt));

      if (Math.abs(g.balance) > 1) {
        ev.push(this.endGrind('lost'));
        this.bailT = BAIL_TIME;
        this.vel.multiplyScalar(0.3);
        ev.push({ type: 'bail', cause: 'balance' });
      } else if (g.t <= 0 || g.t >= 1) {
        g.t = Math.max(0, Math.min(1, g.t));
        ev.push(this.endGrind('end'));
        this.grounded = false;
      } else if (Math.abs(g.vAlong) < GRIND_MIN_SPD * 0.5) {
        ev.push(this.endGrind('stalled'));
        this.grounded = false;
      }
      this.loading = false;
      this.present(dt);
      return ev;
    }

    if (this.grounded) {
      // ── Rolling ───────────────────────────────────────────────────────
      park.normal(this.pos.x, this.pos.z, _n);

      // ── Manual ────────────────────────────────────────────────────────
      if (this.manual) {
        const m = this.manual;
        m.time += dt;
        m.balVel += m.balance * MANUAL_INSTAB * dt;
        m.balVel -= mv.y * MANUAL_CORRECT * dt;
        m.balVel *= Math.exp(-1.7 * dt);
        m.balance += m.balVel * dt;
        if (Math.abs(m.balance) > 1) {
          ev.push(this.endManual());
          this.bailT = BAIL_TIME;
          this.vel.multiplyScalar(0.35);
          ev.push({ type: 'bail', cause: 'manual' });
        } else if (this.speed < MANUAL_MIN_SPD) {
          ev.push(this.endManual());   // just set it down, no penalty
        }
      }

      if (mag > 0.12 && !locked) {
        const want = Math.atan2(wantX, wantZ);
        // Steering authority falls off with speed — you commit to a line.
        const maxSpeed = MAX_SPEED * this.mods.maxSpeed;
        const rate = TURN * this.mods.turn * (1 - Math.min(this.speed / maxSpeed, 1) * 0.6) * mag;
        this.yaw = turnToward(this.yaw, want, rate * dt);
      }

      // Heading projected onto the tangent plane.
      _hv.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      _hv.addScaledVector(_n, -_hv.dot(_n)).normalize();

      // Gravity along the surface — this is what pumps a transition.
      _tmp.copy(_g).addScaledVector(_n, -_g.dot(_n));
      this.vel.addScaledVector(_tmp, dt);

      // Grip: split into along-heading and lateral, and kill the lateral part.
      let along = this.vel.dot(_hv);
      _lat.copy(this.vel).addScaledVector(_hv, -along);
      _lat.multiplyScalar(Math.exp(-GRIP * dt));
      if (mag > 0.15 && !locked) along += PUSH * dt * mag;
      along *= Math.exp(-ROLL_FRIC * dt);
      this.vel.copy(_lat).addScaledVector(_hv, along);

      this.up.lerp(_n, 1 - Math.pow(0.0001, dt));
    } else {
      // ── Airborne ──────────────────────────────────────────────────────
      this.airTime += dt;
      this.vel.y -= G * dt;
      this.vel.multiplyScalar(Math.exp(-AIR_DRAG * dt));
      if (!locked) {
        const spin = mv.x * SPIN_RATE * dt;
        this.yaw += spin;
        this.spinAccum += Math.abs(spin);
        this.flipPhase += mv.y * FLIP_RATE * dt;
      }
      this.up.lerp(_UP, 1 - Math.pow(0.02, dt));
    }

    const maxSpeed = MAX_SPEED * this.mods.maxSpeed;
    if (this.speed > maxSpeed) this.vel.multiplyScalar(maxSpeed / this.speed);
    this.pos.addScaledVector(this.vel, dt);

    // ── Surface contact ─────────────────────────────────────────────────
    const h = park.height(this.pos.x, this.pos.z);
    if (this.pos.y <= h + 0.001) {
      park.normal(this.pos.x, this.pos.z, _n);
      if (!this.grounded) ev.push(this.land(_n));
      this.pos.y = h;
      this.grounded = true;
      // Kill anything pushing into the surface.
      const into = this.vel.dot(_n);
      if (into < 0) this.vel.addScaledVector(_n, -into);
    } else if (this.pos.y > h + 0.06) {
      this.grounded = false;
    }

    if (this.grounded && !locked && this.hazardCooldown <= 0 && this.speed > 4 && park.hazardAt(this.pos)) {
      this.bailT = BAIL_TIME;
      this.hazardCooldown = 1.25;
      this.vel.multiplyScalar(-0.18);
      ev.push({ type: 'bail', cause: 'skate-stopper' });
    }

    // ── Catching a rail ─────────────────────────────────────────────────
    // Airborne only: you have to ollie onto it, which is both correct skating
    // and stops a rail sitting on the floor from grabbing you as you roll past.
    if (!this.grind && !this.grounded && !locked) {
      const hit = park.nearestRail(this.pos, GRIND_LOCK_XZ, GRIND_LOCK_Y);
      if (hit) {
        const vAlong = this.vel.dot(hit.rail.dir);
        if (Math.abs(vAlong) > GRIND_MIN_SPD) {
          const along = Math.abs(Math.sin(this.yaw) * hit.rail.dir.x
                              + Math.cos(this.yaw) * hit.rail.dir.z);
          this.grind = {
            rail: hit.rail, t: hit.t, vAlong,
            balance: (Math.random() - 0.5) * 0.25, balVel: 0, time: 0,
            name: along > 0.8 ? '50-50' : along < 0.4 ? 'Boardslide' : 'Crooked',
            railId: hit.rail.id,
          };
          this.airTime = 0;
          this.trick = null;
          this.trickPhase = 0;
          ev.push({ type: 'grindStart', name: this.grind.name, railId: this.grind.railId });
        }
      }
    }

    // The rim should send you back in; this is only the backstop for clearing it.
    const lim = PARK_EXTENT - 0.5;
    for (const ax of ['x', 'z']) {
      if (this.pos[ax] > lim) { this.pos[ax] = lim; if (this.vel[ax] > 0) this.vel[ax] *= -0.3; }
      if (this.pos[ax] < -lim) { this.pos[ax] = -lim; if (this.vel[ax] < 0) this.vel[ax] *= -0.3; }
    }

    this.loading = !!input.loading && this.grounded && !locked;
    this.present(dt);
    return ev;
  }

  // Landing is judged twice: whether the board agrees with where you are going
  // (heading), and how much of your speed was aimed into the ground (normal).
  land(n) {
    const speedH = Math.hypot(this.vel.x, this.vel.z);
    let err = 0;
    if (speedH > 1.2) {
      const dot = (this.vel.x / speedH) * Math.sin(this.yaw)
                + (this.vel.z / speedH) * Math.cos(this.yaw);
      err = Math.acos(Math.max(-1, Math.min(1, dot)));
    }
    const tolerance = LAND_TOL * this.mods.landingTolerance;
    const isFakie = err > Math.PI - tolerance;
    const clean = err < tolerance || isFakie;

    const spd = this.speed;
    const align = spd > 0.01 ? Math.max(0, -this.vel.dot(n)) / spd : 0;

    const info = {
      type: 'land',
      airTime: this.airTime,
      tricks: this.airTricks.slice(),
      spin: this.spinAccum,
      fakie: isFakie,
      align,
    };

    if (this.trick || !clean) {
      info.quality = 'bail';
      this.trick = null;
      this.trickPhase = 0;
      this.bailT = BAIL_TIME;
      this.vel.multiplyScalar(0.3);
    } else {
      info.quality = align < 0.2 ? 'clean' : align < 0.5 ? 'sketchy' : 'hard';
      const keep = align < 0.2 ? 1 : align < 0.5 ? 1 - (align - 0.2) : 0.55;
      this.vel.multiplyScalar(keep);
      // Riding away backwards: turn the board to match, and remember it.
      if (isFakie) this.yaw += Math.PI;
      this.fakie = isFakie;
    }

    this.airTime = 0;
    this.airTricks = [];
    this.spinAccum = 0;
    this.flipPhase = 0;
    return info;
  }

  endGrind(why) {
    const g = this.grind;
    this.grind = null;
    return { type: 'grindEnd', name: g.name, railId: g.railId, time: g.time, why };
  }

  endManual() {
    const m = this.manual;
    this.manual = null;
    return { type: 'manualEnd', time: m.time };
  }

  // ── Present ───────────────────────────────────────────────────────────────
  present(dt) {
    // Drift the hue with speed — the crystal catches more light the faster it
    // is going, which is most of how the reference sells motion.
    this.mat.uniforms.uPhase.value += dt * (0.6 + this.speed * 0.05);
    this.root.position.copy(this.pos);
    _hv.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    _right.crossVectors(this.up, _hv).normalize();
    _fwd.crossVectors(_right, this.up).normalize();
    _m.makeBasis(_right, this.up, _fwd);
    this.root.quaternion.setFromRotationMatrix(_m);

    // Trick rotations sit on the inner group so they never fight the heading.
    const p = this.trickPhase * Math.PI * 2;
    const d = this.trick ? this.trick.dir : null;
    this.body.rotation.set(
      this.flipPhase,
      d === 'down' ? p : 0,
      d === 'left' ? -p : d === 'right' ? p : 0
    );
    // Crouching while the pop is loaded is the whole tell for the two-phase
    // flick-it gesture — without it the player cannot see the load happen.
    // A manual is a wheelie: pitch the whole board by the balance value, so the
    // meter on the HUD and the thing on screen are the same information.
    if (this.manual) this.body.rotation.x += 0.5 + this.manual.balance * 0.22;
    if (this.grind) this.body.rotation.z += this.grind.balance * 0.3;
    const crouch = this.bailing ? 0.6 : this.loading ? 0.66 : d === 'up' ? 0.82 : 1;
    this.body.scale.y += (crouch - this.body.scale.y) * (1 - Math.pow(0.002, dt));
  }
}

const _UP = new THREE.Vector3(0, 1, 0);

function turnToward(from, to, maxStep) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}
