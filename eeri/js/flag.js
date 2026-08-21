// EERI — the two things that mark a level rather than a room: the CHECKPOINT
// and the FLAG (DESIGN §4.2).
//
// The flag is the owner's, exactly as stated: it BUILDS ITSELF IN THREE
// PHASES as you come up on it, with a puff of smoke on each, and it activates
// by being RUN PAST — no button, no stopping, because a six-year-old at a
// sprint should not have to stop and press something to finish a level. Level
// 3 of a world carries the big one, and it has to be tellable from the small
// one at a distance, so it is taller AND a different colour rather than
// merely larger.
//
// Both are placeholders behind the asset seam (`flag_v1.glb` / `flag_big_v1
// .glb`, contract `phase0 phase1 phase2 pole`), which is why every phase is a
// sibling node the game shows one of, the same rule as js/pieces.js.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=40';
import { craftMat, craftBox } from './craft.js?v=40';

// EVERY surface here is made through the craft factory (ART_TARGET §0.05).
// A prop built with a bare `new MeshLambertMaterial` is flat paint standing
// in a crafted world — the exact failure that put 3 mapped materials on
// screen beside 70 unmapped ones, and the reason craft.js is the only way to
// make a surface. So: the pole and its plate are painted balsa like every
// other bit of site timber, the cloth is WOOL FELT because that is what a
// flag is made of in this kit, and the lamps stay deliberately BARE, because
// a lit lamp is one of the three things craft.js says must not take a map.
const M = (c) => craftMat(c, 'balsa');
const FELT = (c) => craftMat(c, 'felt');

// Phases are CUMULATIVE in the picture and EXCLUSIVE in the tree: phase1 is
// a whole flag-in-progress, not the delta from phase0. A live GLB does the
// same, so nothing downstream has to know which it got.
export function buildFlagModel(big = false) {
  const root = new THREE.Group();
  const nodes = {};
  const H = big ? 5.4 : 3.8;
  const flagCloth = big ? PAL.HAZARD : PAL.MACHINE;
  const flagClothDk = big ? mix(PAL.HAZARD, PAL.INK, 0.3) : PAL.MACHINE_DK;

  const box = (parent, w, h, d, c, x, y, z) => {
    const m = craftBox(w, h, d, M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const cloth = (parent, w, h, d, c, x, y, z) => {
    const m = craftBox(w, h, d, FELT(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };

  // the pole is not a phase — it is the thing the phases are built ON, and
  // it stands from the first frame so the level's end is visible from far off
  const pole = new THREE.Group(); pole.name = 'pole';
  box(pole, 0.16, H, 0.16, PAL.STEEL[2], 0, H / 2, 0);
  box(pole, 0.9, 0.24, 0.9, PAL.DARK, 0, 0.12, 0);           // the foot plate
  root.add(pole); nodes.pole = pole;

  for (let p = 0; p < 3; p++) {
    const g = new THREE.Group(); g.name = `phase${p}`;
    // 0 — the crossbar goes on
    if (p >= 0) box(g, big ? 1.9 : 1.4, 0.14, 0.3, PAL.STEEL[1], (big ? 0.8 : 0.6), H - 0.3, 0);
    // 1 — the cloth, and it is FELT: the one surface here that is not timber
    if (p >= 1) {
      cloth(g, big ? 1.7 : 1.25, big ? 1.15 : 0.85, 0.08, flagCloth,
        (big ? 0.85 : 0.62), H - 0.95, 0.02);
      cloth(g, big ? 1.7 : 1.25, 0.16, 0.1, flagClothDk, (big ? 0.85 : 0.62), H - 1.5, 0.02);
    }
    // 2 — the lamp on top, lit, which is what says FINISHED rather than
    // HALF-BUILT at a glance mid-run
    if (p >= 2) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.28 : 0.2, 10, 8),
        new THREE.MeshBasicMaterial({ color: big ? PAL.MACHINE : PAL.GREEN }));
      lamp.position.set(0, H + 0.18, 0); g.add(lamp);
      box(g, big ? 1.0 : 0.7, 0.12, 0.34, PAL.MACHINE_DK, (big ? 0.5 : 0.35), 0.5, 0);
    }
    g.visible = false;
    root.add(g); nodes[`phase${p}`] = g;
  }
  return { root, nodes };
}

// A tiny shared puff pool — the flag's three phases and the checkpoint each
// cost one. Reduced motion still gets the puff; it is an event, not a loop.
// These are BARE on purpose: a puff of smoke is not made of anything, and
// craft.js names exactly this case (a lamp, a pane, a shadow) as the surface
// that must not take a material map.
class Puffs {
  constructor(scene, n = 10) {
    this.items = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 8, 7),
        new THREE.MeshBasicMaterial({ color: PAL.CLOUD, transparent: true, opacity: 0 }),
      );
      m.life = 1; scene.add(m); this.items.push(m);
    }
  }
  burst(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      const p = this.items.find((q) => q.life >= 1);
      if (!p) return;
      p.life = 0;
      p.position.set(x + (Math.random() - 0.5) * 0.8, y + Math.random() * 0.5, (Math.random() - 0.5) * 0.7);
      p.vx = (Math.random() - 0.5) * 1.6; p.vy = 1.2 + Math.random() * 1.4;
      p.scale.setScalar(0.5);
    }
  }
  update(dt) {
    for (const p of this.items) {
      if (p.life >= 1) { p.material.opacity = 0; continue; }
      p.life = Math.min(1, p.life + dt / 0.75);
      p.position.x += p.vx * dt; p.position.y += p.vy * dt;
      p.scale.setScalar(0.5 + p.life * 1.8);
      p.material.opacity = 0.65 * (1 - p.life);
    }
  }
}

// distances at which each phase lands, in tiles ahead of the flag
const PHASE_AT = [15, 10, 5.5];

export class Flag {
  constructor(scene, def, asset) {
    this.x = def.x; this.y = def.y; this.big = !!def.big;
    this.n = asset.nodes;
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.group.position.set(this.x, this.y, 0);
    scene.add(this.group);
    this.puffs = new Puffs(scene);
    this.phase = -1;
    this.raised = false;
    this.t = 0;
  }

  // one phase per call, so the puff and the sound fire exactly once each
  build() {
    if (this.phase >= 2) return false;
    this.phase++;
    for (let p = 0; p < 3; p++) {
      if (this.n[`phase${p}`]) this.n[`phase${p}`].visible = p === this.phase;
    }
    this.puffs.burst(this.x, this.y + (this.big ? 3.6 : 2.6), 6);
    return true;
  }

  // returns 'phase' the frame a section lands, 'raised' the frame it is run
  // past, and null otherwise — the caller owns the noise and the banner
  update(dt, playerX) {
    this.t += dt;
    this.puffs.update(dt);
    const d = this.x - playerX;
    let event = null;
    const want = PHASE_AT.filter((a) => d <= a).length - 1;
    if (want > this.phase && this.build()) event = 'phase';
    if (!this.raised && this.phase >= 2 && playerX > this.x) {
      this.raised = true;
      this.puffs.burst(this.x, this.y + 1.2, 8);
      event = 'raised';
    }
    // once it is up, the cloth waves — a still flag at the end of a level
    // reads as a prop nobody switched on
    const cl = this.n.phase2?.children?.[1];
    if (this.raised && cl) cl.rotation.z = Math.sin(this.t * 3.4) * 0.08;
    return event;
  }
}

// ---- the checkpoint ------------------------------------------------------
// The midway gate. Nothing here costs a life, because there are none: what a
// checkpoint buys is the middle of a level back, which is the only currency
// this game has (DESIGN §4.1).

export function buildCheckpointModel() {
  const root = new THREE.Group();
  const nodes = {};
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = craftBox(w, h, d, M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };
  box(root, 0.14, 2.4, 0.14, PAL.STEEL[2], 0, 1.2, 0);
  box(root, 0.7, 0.16, 0.7, PAL.DARK, 0, 0.08, 0);
  // the lamp IS the state: red is "not yet", green is "you have this back"
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: PAL.HAZARD }));
  lamp.position.set(0, 2.5, 0); root.add(lamp);
  nodes.lamp = lamp;
  // a small cloth that only appears once it is lit
  const cloth = craftBox(0.8, 0.55, 0.06, craftMat(PAL.GREEN, 'felt'));
  cloth.position.set(0.44, 1.95, 0.02); cloth.visible = false;
  root.add(cloth); nodes.cloth = cloth;
  return { root, nodes };
}

export class Checkpoint {
  constructor(scene, def, asset) {
    this.x = def.x; this.y = def.y;
    this.n = asset.nodes;
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.group.position.set(this.x, this.y, 0);
    scene.add(this.group);
    this.puffs = new Puffs(scene, 6);
    this.lit = false;
    this.t = 0;
  }

  light() {
    if (this.lit) return false;
    this.lit = true;
    this.n.lamp?.material.color.set(PAL.GREEN);
    if (this.n.cloth) this.n.cloth.visible = true;
    this.puffs.burst(this.x, this.y + 1.6, 5);
    return true;
  }

  update(dt, playerX, playerY) {
    this.t += dt;
    this.puffs.update(dt);
    if (this.n.cloth && this.lit) this.n.cloth.rotation.z = Math.sin(this.t * 3) * 0.09;
    // passing it is enough — you never have to touch it precisely
    if (!this.lit && playerX > this.x && Math.abs(playerY - this.y) < 3.5) return this.light();
    return false;
  }
}
