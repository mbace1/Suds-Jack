// Craft — the hover racer and its physics. One class drives both the player
// and the AI field; only the control input differs.
//
// The handling model is arcade-honest rather than simulated: the craft carries
// a yaw offset from the fall line, and its velocity follows its nose. Carving
// hard therefore trades speed down the hill for speed across it — DEEP bites
// (grip 1.2) and charges the afterburner, CRUST is fast but washes out, PACKED
// is the balanced line. The numbers here are measured against that loop, not
// guessed; see the burn-economy note in CLAUDE.md before retuning any of them.
import * as THREE from 'three';
import { PAL } from './palette.js?v=2';
import { SURF, POWDER, ROCK, EDGE } from './track.js?v=2';

const G = 38;                 // arcade gravity — big air, short hang time
const WALL = EDGE + 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class Craft {
  constructor(track, opts = {}) {
    this.track = track;
    this.isPlayer = !!opts.isPlayer;
    this.accent = opts.accent ?? PAL.accents[0];
    this.number = opts.number ?? 1;
    this.power = opts.power ?? 1;
    this.basePower = this.power;

    this.s = opts.s ?? 0;
    this.n = opts.n ?? 0;
    this.speed = 30;
    this.yaw = 0;             // heading offset from the fall line, radians
    this.vDrift = 0;          // lateral slide from bank vs centrifugal load
    this.y = 0;
    this.vy = 0;
    this.air = false;
    this.airT = 0;
    this.spin = 0;            // radians rotated while airborne
    this.crashT = 0;
    this.scrapeT = 0;
    this.charge = 45;         // afterburner fuel, 0..100
    this.boostT = 0;
    this.surfType = 0;
    this.depth = 0;
    this.carve = 0;           // 0..1, how hard the edge is loaded (drives spray)
    this.trick = null;        // set on a clean landing, consumed by the HUD
    this.hitT = 0;
    this.landT = 0;

    this._pr = {}; this._nd = {}; this._rocks = [];
    this._prevSurf = null;
    this.aiTargetN = 0; this.aiT = 0;

    this.mesh = buildCraft(this.accent, this.number);
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 12),
      new THREE.MeshBasicMaterial({ color: 0x2a2a30, transparent: true, opacity: 0.34, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 1;
    track.scene.add(this.mesh, this.shadow);
  }

  get surf() { return SURF[this.surfType]; }
  get boosting() { return this.boostT > 0; }

  // ------------------------------------------------------------- physics
  update(dt, ctl) {
    const tr = this.track;
    const pr = tr.probe(this.s, this.n, this._pr);
    this.surfType = pr.type;
    this.depth = pr.depth;
    const surf = SURF[pr.type];
    const nd = tr.sample(this.s, this._nd);

    const crashed = this.crashT > 0;
    if (crashed) this.crashT -= dt;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.scrapeT > 0) this.scrapeT -= dt;
    if (this.boostT > 0) this.boostT -= dt;

    // ---- steering. In the air the stick spins the craft: that is the trick.
    const steer = crashed ? 0 : clamp(ctl.steer, -1, 1);
    const grip = surf.grip;
    if (this.air) {
      const d = steer * 3.2 * dt;
      this.yaw += d;
      this.spin += Math.abs(d);
      this.airT += dt;
    } else {
      // Heavy. The craft does not point where you ask, it leans over and
      // comes round to it — Jet Moto with a load in the back. Turn-in is slow,
      // and once the nose is across you have to unwind it deliberately.
      const maxYaw = 0.58 - 0.30 * Math.min(1, this.speed / 120);
      const target = steer * maxYaw * Math.min(1.25, grip);
      const rate = (target * this.yaw < 0 || Math.abs(target) < Math.abs(this.yaw)
        ? 2.6 : 3.4) * grip * dt;      // unwinding is slower than loading up
      this.yaw += clamp(target - this.yaw, -rate, rate);
      this.carve = Math.min(1, Math.abs(this.yaw) / Math.max(0.12, maxYaw));
    }

    // ---- afterburner: powder carving is what fills the tank
    if (!this.air && !crashed) {
      // Measured: filling FASTER makes the loop worse, not better. The cost of
      // the dive is dominated by the travel out to the deep stuff and back, so
      // a quicker fill just buys more round trips. Leave it slow enough that
      // one committed carve is worth a full tank.
      this.charge = Math.min(100, this.charge
        + (this.depth * 22 + this.carve * this.depth * 26 + this.carve * 3) * dt);
    } else if (this.air) {
      this.charge = Math.min(100, this.charge + 9 * dt);
    }
    if (ctl.boost && this.charge > 4 && !crashed) {
      this.charge = Math.max(0, this.charge - 22 * dt);
      this.boostT = 0.18;
    }

    // ---- speed
    let vMax = 96 * surf.speed * this.power;
    if (ctl.tuck) vMax *= 1.10;
    if (ctl.brake) vMax *= 0.42;
    // Carving scrubs speed — but scale it by grip, or the deep stuff is paying
    // twice. Holding a line off-piste needs constant steering, so a flat scrub
    // stacked on the surface penalty made DEEP half speed and the whole
    // dive-to-charge loop cost more than the burn ever returned. Grippy snow
    // carves clean; sliding sideways on CRUST is what should bleed.
    vMax *= 1 - 0.34 * this.carve * (2 - Math.min(1.5, surf.grip));
    if (this.boosting) vMax *= 1.70;
    if (crashed) vMax *= 0.22;
    if (this.air) vMax = this.speed * 0.999;      // no thrust off the ground
    const k = this.speed < vMax ? 0.55 : (ctl.brake ? 2.6 : 1.1);
    this.speed += (vMax - this.speed) * Math.min(1, k * dt);
    this.speed = Math.max(6, this.speed);

    // ---- move along the fall line, then across it
    const ds = this.speed * Math.cos(this.yaw) * dt;
    let dn = this.speed * Math.sin(this.yaw) * dt;
    // A banked turn dishes you inward; the corner load throws you outward.
    // They nearly cancel — nearly — so a fast sweeper still walks you wide,
    // and the slow decay means the slide keeps running after you unwind.
    this.vDrift += (-this.speed * this.speed * nd.curv * 0.20 - 22 * nd.tilt) * dt;
    this.vDrift *= Math.exp(-0.55 * dt);
    dn += this.vDrift * dt;
    this.s += Math.max(0, ds);
    this.n += dn;

    // valley walls: scrape along them rather than leaving the world
    if (Math.abs(this.n) > WALL) {
      this.n = Math.sign(this.n) * WALL;
      this.vDrift *= -0.15;
      this.yaw *= 0.5;
      this.speed *= 0.985;
      this.scrapeT = 0.12;
    }

    // ---- vertical: stay on the snow until the snow drops away faster than
    // gravity can pull us down, which is exactly what a jump lip does.
    const surfNow = tr.surface(this.s, this.n);
    if (this.air) {
      this.vy -= G * dt;
      this.y += this.vy * dt;
      if (this.y <= surfNow) this._land(surfNow, pr);
    } else {
      const rate = this._prevSurf === null ? 0 : (surfNow - this._prevSurf) / Math.max(dt, 1e-4);
      const surfNext = tr.surface(this.s + ds, this.n + dn);
      const yFree = surfNow + rate * dt - 0.5 * G * dt * dt;
      // 4.5 not 3: the rollers now crest hard enough to pop the craft, which
      // is wanted, but a lower bar makes it chatter on every ripple
      if (rate > 4.5 && yFree > surfNext + 0.05) {
        this.air = true; this.airT = 0; this.spin = 0;
        this.vy = clamp(rate, 0, 30);
        this.y = surfNow;
      } else {
        this.y = surfNow;
        this.vy = 0;
      }
    }
    this._prevSurf = surfNow;

    // ---- boulders
    if (!this.air && !crashed) {
      const rocks = tr.rocksNear(this.s, this._rocks);
      for (let i = 0; i < rocks.length; i++) {
        const r = rocks[i];
        if (Math.abs(this.s - r.s) < r.r + 1.8 && Math.abs(this.n - r.n) < r.r + 1.5) {
          this.crash(); break;
        }
      }
    }
    if (this.surfType === ROCK && !this.air) this.scrapeT = 0.12;

    this._pose(dt, nd);
  }

  _land(surfNow, pr) {
    this.air = false;
    this.y = surfNow;
    // Landing straight is clean. Landing sideways is survivable in deep powder
    // and a wreck on anything harder.
    const off = Math.abs(wrapPi(this.yaw));
    const rots = Math.floor(this.spin / (Math.PI * 2));
    if (off < 0.5) {
      this.yaw = wrapPi(this.yaw);
      if (this.airT > 0.45) {
        this.charge = Math.min(100, this.charge + 16 + rots * 15);
        this.trick = rots > 0 ? `${rots * 360} CLEAN` : 'CLEAN LANDING';
      }
    } else if (pr.type === POWDER || off < 0.9) {
      this.yaw = wrapPi(this.yaw) * 0.5;
      this.speed *= 0.82;
      if (this.airT > 0.45) this.trick = 'SOFT LANDING';
    } else {
      this.crash();
    }
    this.spin = 0;
    this.vy = 0;
    this.landT = 0.25;
  }

  crash() {
    if (this.crashT > 0) return false;
    this.crashT = 1.25;
    this.speed *= 0.32;
    this.yaw = 0;
    this.vDrift = 0;
    this.air = false;
    this.hitT = 0.4;
    return true;
  }

  /** Shoved by another craft. */
  shove(dir) {
    this.vDrift += dir * 11;
    this.speed *= 0.94;
    this.hitT = 0.25;
  }

  // -------------------------------------------------------------- visuals
  _pose(dt, nd) {
    const tr = this.track;
    const hover = 1.15 + (this.air ? 0 : Math.sin(this.s * 0.35) * 0.10);
    tr.worldPos(this.s, this.n, this.mesh.position);
    this.mesh.position.y = this.y + hover;

    this.mesh.rotation.order = 'YXZ';
    this.mesh.rotation.y = -(nd.head + this.yaw);
    const tgtPitch = this.air ? clamp(this.vy * 0.022, -0.42, 0.5) : -nd.pitch;
    this.mesh.rotation.x += (tgtPitch - this.mesh.rotation.x) * Math.min(1, 8 * dt);
    // lean hard into the carve — this is most of what "heavy" looks like
    const tgtRoll = clamp(-this.yaw * 1.7 - this.vDrift * 0.012, -0.62, 0.62)
                  + (this.crashT > 0 ? Math.sin(this.crashT * 34) * 0.5 : 0);
    this.mesh.rotation.z += (tgtRoll - this.mesh.rotation.z) * Math.min(1, 5 * dt);

    // blob shadow, right off the reference plates — hard and close
    const gy = tr.surface(this.s, this.n);
    this.shadow.position.set(this.mesh.position.x, gy + 0.09, this.mesh.position.z);
    const lift = clamp((this.y - gy) / 12, 0, 1);
    const sc = 1.6 * (1 + lift * 0.8);
    this.shadow.scale.set(sc, sc * 1.6, 1);
    this.shadow.material.opacity = 0.30 * (1 - lift * 0.7);

    // exhaust flare
    const thrust = this.boosting ? 1 : (this.crashT > 0 ? 0.1 : 0.35 + this.speed / 260);
    for (const f of this.mesh.userData.flares) {
      f.scale.set(1, 1, thrust * (this.boosting ? 2.6 : 1));
      f.material.opacity = 0.25 + thrust * 0.5;
    }
    const hull = this.mesh.userData.hull;
    hull.material.color.setHex(this.hitT > 0 ? 0xffffff : PAL.hull);
  }

  // ------------------------------------------------------------------ AI
  aiControl(dt, playerS) {
    this.aiT -= dt;
    if (this.aiT <= 0) {
      // pick a fresh line: mostly the packed run, sometimes a powder gamble
      const w = this._nd.w || 26;
      this.aiTargetN = (Math.random() < 0.3 ? 1 : 0.55) * (Math.random() * 2 - 1) * w;
      this.aiT = 1.6 + Math.random() * 2.4;
    }
    // steer away from boulders that are dead ahead
    const rocks = this.track.rocksNear(this.s + 26, this._rocks);
    let avoid = 0;
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i], ds = r.s - this.s;
      if (ds > 4 && ds < 34 && Math.abs(r.n - this.n) < r.r + 5) avoid -= Math.sign(r.n - this.n || 1);
    }
    const lateral = this.speed * Math.sin(this.yaw) + this.vDrift;
    const steer = clamp((this.aiTargetN - this.n) * 0.055 - lateral * 0.07 + avoid, -1, 1);
    // rubber band: the field will not let you run away, or fall too far back
    const band = clamp((playerS - this.s) / 420, -1, 1);
    this.power = this.basePower + band * 0.07;
    return { steer, tuck: true, brake: false, boost: this.charge > 55 };
  }

  dispose() {
    this.track.scene.remove(this.mesh, this.shadow);
  }
}

function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// --------------------------------------------------------------- the model
// Low-poly by conviction: six-sided fuselage, eight-sided nacelles, flat
// shading, and a nearest-filtered numeral decal on the flanks. Straight off
// the reference plates — cream hull, one accent panel, chrome cans, black
// intake mouths, needle nose probe.
const _geo = {};
function geo(key, make) { return _geo[key] || (_geo[key] = make()); }

function numberTexture(num, accent) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#' + new THREE.Color(PAL.hull).getHexString();
  g.beginPath(); g.arc(32, 32, 27, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#' + new THREE.Color(accent).getHexString();
  g.lineWidth = 3;
  g.beginPath(); g.arc(32, 32, 27, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#241f1c';
  g.font = 'bold 44px monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(num), 32, 34);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function buildCraft(accent, number) {
  const g = new THREE.Group();
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const hullMat = lam(PAL.hull);
  const accMat = lam(accent);
  const chromeMat = new THREE.MeshPhongMaterial({
    color: PAL.chrome, specular: 0xffffff, shininess: 60, flatShading: true });

  // Proportions taken off the plates: a long cream fuselage flattened in
  // section, cockpit well forward under a small bubble, a needle probe out the
  // nose, and the chrome cans slung at the BACK where they belong.
  const body = new THREE.Mesh(geo('body', () => {
    const b = new THREE.CylinderGeometry(0.90, 0.70, 6.0, 6);
    b.rotateX(-Math.PI / 2); return b;
  }), hullMat);
  body.position.z = 0.6;
  body.scale.set(1.12, 0.78, 1);
  g.add(body);

  const nose = new THREE.Mesh(geo('nose', () => {
    const b = new THREE.ConeGeometry(0.90, 4.0, 6);
    b.rotateX(-Math.PI / 2); return b;
  }), hullMat);
  nose.position.z = -4.4;
  nose.scale.set(1.12, 0.78, 1);
  g.add(nose);

  // The weathered accent panel — a band across the middle, not a repaint.
  // Cream dominates, and the tail stays cream so the chase camera sees the
  // hull rather than a slab of plum.
  const panel = new THREE.Mesh(geo('panel', () => {
    const b = new THREE.CylinderGeometry(0.88, 0.84, 1.6, 6);
    b.rotateX(-Math.PI / 2); return b;
  }), accMat);
  panel.position.z = -0.5;
  panel.scale.set(1.12, 0.78, 1);
  g.add(panel);

  const canopy = new THREE.Mesh(geo('canopy', () => new THREE.SphereGeometry(0.5, 6, 3)),
    new THREE.MeshPhongMaterial({ color: PAL.glass, specular: 0xffffff, shininess: 90, flatShading: true }));
  canopy.scale.set(0.92, 0.66, 1.7);
  canopy.position.set(0, 0.44, -2.4);
  g.add(canopy);

  const probe = new THREE.Mesh(geo('probe', () => {
    const b = new THREE.CylinderGeometry(0.06, 0.03, 2.2, 4);
    b.rotateX(-Math.PI / 2); return b;
  }), chromeMat);
  probe.position.z = -7.4;
  g.add(probe);

  // small swept fin, cream with an accent cap — a solid plum slab back here
  // reads as a sail and eats the silhouette
  const fin = new THREE.Mesh(geo('fin', () => new THREE.BoxGeometry(0.12, 0.82, 1.1)), hullMat);
  fin.position.set(0, 0.72, 2.9);
  fin.rotation.x = -0.34;
  g.add(fin);
  const finCap = new THREE.Mesh(geo('finCap', () => new THREE.BoxGeometry(0.14, 0.22, 1.1)), accMat);
  finCap.position.set(0, 1.09, 2.78);
  finCap.rotation.x = -0.34;
  g.add(finCap);

  // the flat delta underplate that gives these things their low, wide read
  const plate = new THREE.Mesh(geo('plate', () => {
    const b = new THREE.CylinderGeometry(1.55, 0.85, 3.4, 6);
    b.rotateX(-Math.PI / 2); return b;
  }), hullMat);
  plate.scale.set(1, 0.13, 1.7);
  plate.position.set(0, -0.46, -0.9);
  g.add(plate);

  const flares = [];
  for (const side of [-1, 1]) {
    // Slim cans slung low and aft. Fat ones swallow the fuselage from the
    // side and the whole thing turns back into a torpedo.
    const nac = new THREE.Mesh(geo('nac', () => {
      const b = new THREE.CylinderGeometry(0.38, 0.35, 2.9, 8);
      b.rotateX(-Math.PI / 2); return b;
    }), chromeMat);
    nac.position.set(side * 1.24, -0.28, 2.1);
    g.add(nac);

    // chrome collar at the intake lip, then the black mouth inside it
    const collar = new THREE.Mesh(geo('collar', () => {
      const b = new THREE.CylinderGeometry(0.44, 0.40, 0.30, 8);
      b.rotateX(-Math.PI / 2); return b;
    }), chromeMat);
    collar.position.set(side * 1.24, -0.28, 0.74);
    g.add(collar);

    const mouth = new THREE.Mesh(geo('mouth', () => {
      const b = new THREE.CircleGeometry(0.32, 8);
      b.rotateY(Math.PI); return b;
    }), new THREE.MeshBasicMaterial({ color: PAL.intake }));
    mouth.position.set(side * 1.24, -0.28, 0.58);
    g.add(mouth);

    const strut = new THREE.Mesh(geo('strut', () => new THREE.BoxGeometry(1.0, 0.16, 0.6)), chromeMat);
    strut.position.set(side * 0.72, -0.24, 1.9);
    g.add(strut);

    const flare = new THREE.Mesh(geo('flare', () => {
      const b = new THREE.ConeGeometry(0.28, 1.9, 6);
      b.rotateX(Math.PI / 2); return b;
    }), new THREE.MeshBasicMaterial({ color: 0xffe7bd, transparent: true, opacity: 0.34, depthWrite: false }));
    flare.position.set(side * 1.24, -0.28, 4.6);
    g.add(flare);
    flares.push(flare);
  }

  const tex = numberTexture(number, accent);
  for (const side of [-1, 1]) {
    const decal = new THREE.Mesh(geo('decal', () => new THREE.PlaneGeometry(1.0, 1.0)),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    decal.position.set(side * 0.92, 0.08, -0.5);
    decal.rotation.y = side * Math.PI / 2;
    g.add(decal);
  }
  // ~8 m long. Any bigger and it eats the run: the packed line is only 40-60 m
  // across, and a 15 m craft leaves nowhere to read the course behind it.
  g.scale.setScalar(0.62);

  g.userData.flares = flares;
  g.userData.hull = body;
  return g;
}
