// The pit: a concrete cell at the bottom of a shaft, and everything in it that
// is not the machine. Four stations and a hole in the ceiling.
//
// Seated at the middle, facing the machine (−z). Left is the ATM, right the
// vendor, behind you the door with its padlocks and the red phone. The floor
// under the stool is a grate, and it is a door too.

import * as THREE from 'three';
import * as T from './textures.js?v=3';
import { CHARMS } from '../data.js?v=3';

export const ROOM = { x0: -1.55, x1: 1.55, z0: -1.02, z1: 1.7, h: 3.0, seat: { x: 0, z: 0.38 } };

// Where you look from at each station, where you look at, and the points that
// have to be on screen. Every station SOLVES its lens into the band the HUD
// leaves free (render.js), so these are silhouettes, not framings.
export const STATIONS = {
  // The marquee and the lever are left to the edges on purpose: what has to
  // be READ is the board, the reels and the lip, and every pixel spent on a
  // sign is one taken from a coin.
  machine: { pos: [0, 1.6, 0.28], look: [0, 1.16, -0.9], fit: [
    [-0.33, 1.87, -0.93], [0.33, 1.87, -0.93], [-0.23, 0.72, -0.52], [0.23, 0.72, -0.52],
    [-0.36, 0.86, -0.66], [0.36, 0.86, -0.66]] },
  atm: { pos: [0.25, 1.32, 0.36], look: [-1.3, 1.12, 0.36], fit: [
    [-1.28, 1.56, 0.02], [-1.28, 1.56, 0.7], [-1.28, 0.74, 0.02], [-1.28, 0.74, 0.7]] },
  vendor: { pos: [-0.25, 1.3, 0.36], look: [1.05, 1.15, 0.36], fit: [
    [1.04, 1.9, -0.06], [1.04, 1.9, 0.74], [1.04, 0.6, -0.06], [1.04, 0.6, 0.74]] },
  door: { pos: [0.1, 1.35, -0.25], look: [-0.15, 1.15, 1.7], fit: [
    [-0.47, 2.1, 1.66], [0.47, 2.1, 1.66], [-0.47, 0.1, 1.66], [0.47, 0.1, 1.66], [-1.0, 1.2, 1.58]] },
  up: { pos: [0, 1.3, 0.38], look: [0, 3.6, 0.3] },
};

export class Room {
  constructor(scene, env) {
    this.scene = scene;
    this.env = env;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.shell();
    this.atm();
    this.vendor();
    this.door();
    this.phone();
    this.props();
    this.raccoon();
    this.lights();
    this.t = 0;
  }

  shell() {
    const { x0, x1, z0, z1, h } = ROOM, r = this.root;
    const wallTex = (seed) => T.concrete({ seed, w: 256, h: 256, base: '#4c5049' });
    const wall = (w, hh, tex, rep, pos, rotY) => {
      tex.repeat.set(rep[0], rep[1]);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshLambertMaterial({ map: tex }));
      m.position.set(...pos); m.rotation.y = rotY; r.add(m); return m;
    };
    // a tile is two blocks across and four courses high: 0.8 m square, so a
    // block is the 40 x 20 cm a cinder block actually is
    wall(x1 - x0, h, wallTex(3), [(x1 - x0) / 0.8, h / 0.8], [0, h / 2, z0], 0);                 // front, behind the machine
    wall(x1 - x0, h, wallTex(4), [(x1 - x0) / 0.8, h / 0.8], [0, h / 2, z1], Math.PI);           // back, the door
    wall(z1 - z0, h, wallTex(5), [(z1 - z0) / 0.8, h / 0.8], [x0, h / 2, (z0 + z1) / 2], Math.PI / 2);   // left, the ATM
    wall(z1 - z0, h, wallTex(6), [(z1 - z0) / 0.8, h / 0.8], [x1, h / 2, (z0 + z1) / 2], -Math.PI / 2);  // right, the vendor
    // the last tenant's tally, scratched once beside the machine
    const tally = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), new THREE.MeshLambertMaterial({ map: T.tally(), transparent: true }));
    tally.position.set(-0.78, 1.35, z0 + 0.003); r.add(tally);
    // the floor, with a hole for the trapdoor
    const floorTex = T.concrete({ seed: 9, base: '#46483f', blocks: false, stain: 0.9 });
    floorTex.repeat.set(3, 3);
    const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
    const hw = 0.62, sx = ROOM.seat.x, sz = ROOM.seat.z;
    const slab = (xa, xb, za, zb) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(xb - xa, zb - za), floorMat);
      m.rotation.x = -Math.PI / 2; m.position.set((xa + xb) / 2, 0, (za + zb) / 2); r.add(m);
    };
    slab(x0, x1, z0, sz - hw); slab(x0, x1, sz + hw, z1);
    slab(x0, sx - hw, sz - hw, sz + hw); slab(sx + hw, x1, sz - hw, sz + hw);
    // the trapdoor: two grate leaves over a drop with no bottom
    const grateTex = T.grate(); grateTex.repeat.set(1, 1);
    const gMat = new THREE.MeshLambertMaterial({ map: grateTex });
    this.leaves = [];
    for (const side of [-1, 1]) {
      const piv = new THREE.Group();
      piv.position.set(sx + side * hw, 0, sz);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(hw, 0.03, hw * 2), gMat);
      leaf.position.set(-side * hw / 2, -0.015, 0);
      piv.add(leaf); r.add(piv);
      this.leaves.push({ piv, side });
    }
    // the drop: a shaft of black below the grate, faintly red very far down
    const well = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 12, hw * 2),
      new THREE.MeshBasicMaterial({ color: 0x050303, side: THREE.BackSide }));
    well.position.set(sx, -6.02, sz); r.add(well);
    const ember = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hw * 2), new THREE.MeshBasicMaterial({ color: 0x2a0402 }));
    ember.rotation.x = -Math.PI / 2; ember.position.set(sx, -11.9, sz); r.add(ember);
    // the ceiling, with a square hole over the stool
    const ceilTex = T.concrete({ seed: 12, base: '#3c3d38', blocks: false, stain: 0.2 });
    ceilTex.repeat.set(2, 2);
    const ceilMat = new THREE.MeshLambertMaterial({ map: ceilTex });
    const hh = 0.42;
    const cslab = (xa, xb, za, zb) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(xb - xa, zb - za), ceilMat);
      m.rotation.x = Math.PI / 2; m.position.set((xa + xb) / 2, h, (za + zb) / 2); r.add(m);
    };
    cslab(x0, x1, z0, sz - hh); cslab(x0, x1, sz + hh, z1);
    cslab(x0, sx - hh, sz - hh, sz + hh); cslab(sx + hh, x1, sz - hh, sz + hh);
    // the shaft above: concrete going up into black
    const shaftTex = T.concrete({ seed: 13, base: '#2e302b', stain: 1 }); shaftTex.repeat.set(1, 6);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(hh * 2, 10, hh * 2), new THREE.MeshLambertMaterial({ map: shaftTex, side: THREE.BackSide }));
    shaft.position.set(sx, h + 5, sz); r.add(shaft);
    // pipes along the ceiling, because a room with nothing on its ceiling is a box
    const pipeMat = new THREE.MeshLambertMaterial({ color: 0x5a4a3a });
    for (const [z, rr] of [[-0.8, 0.035], [-0.65, 0.022], [1.45, 0.03]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, x1 - x0, 8), pipeMat);
      p.rotation.z = Math.PI / 2; p.position.set(0, h - 0.12, z); r.add(p);
    }
    // the stool you sit on
    const stoolMat = new THREE.MeshLambertMaterial({ color: 0x5b2a1a });
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 16), stoolMat);
    seat.position.set(sx, 0.62, sz + 0.12); r.add(seat);
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 6), new THREE.MeshLambertMaterial({ color: 0x2b2b2b }));
      leg.position.set(sx + Math.cos(a) * 0.13, 0.31, sz + 0.12 + Math.sin(a) * 0.13);
      leg.rotation.z = Math.cos(a) * 0.12; leg.rotation.x = -Math.sin(a) * 0.12;
      r.add(leg);
    }
    this.stool = seat;
  }

  // ── the ATM on the left wall ────────────────────────────────────────
  atm() {
    const g = new THREE.Group(), x = ROOM.x0;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.6), new THREE.MeshLambertMaterial({ map: T.metal(64, 64, '#6e7479', 4) }));
    body.position.set(x + 0.13, 1.05, 0.36); g.add(body);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.66), new THREE.MeshLambertMaterial({ color: 0x1d4a2a }));
    hood.position.set(x + 0.16, 1.52, 0.36); g.add(hood);
    this.atmScreen = T.makeAtmScreen();
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.27), new THREE.MeshBasicMaterial({ map: this.atmScreen.texture }));
    screen.position.set(x + 0.262, 1.2, 0.36); screen.rotation.y = Math.PI / 2; g.add(screen);
    // keypad and the deposit slot
    for (let i = 0; i < 12; i++) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.028, 0.034), new THREE.MeshLambertMaterial({ color: 0xc8c8c0 }));
      k.position.set(x + 0.265, 0.96 - Math.floor(i / 3) * 0.04, 0.3 + (i % 3) * 0.045); g.add(k);
    }
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.14), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    slot.position.set(x + 0.266, 0.8, 0.36); g.add(slot);
    this.atmSlotLamp = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.16), new THREE.MeshBasicMaterial({ color: 0x114422 }));
    this.atmSlotLamp.position.set(x + 0.268, 0.816, 0.36); g.add(this.atmSlotLamp);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.06), new THREE.MeshBasicMaterial({ map: T.sign('PIT SAVINGS & LOAN', { w: 512, h: 64, bg: '#1d4a2a', fg: '#c8ffd8', font: 'bold 34px monospace' }) }));
    label.position.set(x + 0.321, 1.52, 0.36); label.rotation.y = Math.PI / 2; g.add(label);
    // the wanted poster beside it
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.44), new THREE.MeshLambertMaterial({ map: T.poster() }));
    poster.position.set(x + 0.002, 1.45, 1.05); poster.rotation.y = Math.PI / 2; poster.rotation.z = 0.04; g.add(poster);
    this.root.add(g);
  }

  // ── the vendor on the right wall ────────────────────────────────────
  vendor() {
    const g = new THREE.Group(), x = ROOM.x1;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.9, 0.86), new THREE.MeshLambertMaterial({ color: 0x1f3550 }));
    body.position.set(x - 0.25, 0.95, 0.34); g.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.1), new THREE.MeshLambertMaterial({ color: 0x0c1520, emissive: 0x0a1a2a }));
    face.position.set(x - 0.501, 1.17, 0.4); face.rotation.y = -Math.PI / 2; g.add(face);
    const header = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.16), new THREE.MeshBasicMaterial({ map: T.sign('CHARMS', { w: 512, h: 104, bg: '#0e2c47', fg: '#8fe3ff', border: '#8fe3ff', font: 'bold 64px "Arial Black", Impact, sans-serif' }) }));
    header.position.set(x - 0.502, 1.8, 0.34); header.rotation.y = -Math.PI / 2; g.add(header);
    // three shelves; each holds whatever the vendor has on offer
    this.shelves = [];
    for (let i = 0; i < 3; i++) {
      const y = 1.5 - i * 0.33;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.6), new THREE.MeshLambertMaterial({ color: 0x8aa0b0 }));
      shelf.position.set(x - 0.6, y - 0.13, 0.4); g.add(shelf);
      // a spiral coil, the vending machine's own gesture
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 4, 24), new THREE.MeshLambertMaterial({ color: 0xc0c8d0 }));
      coil.position.set(x - 0.6, y - 0.07, 0.4); coil.rotation.y = Math.PI / 2; g.add(coil);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), new THREE.MeshBasicMaterial({ transparent: true }));
      card.position.set(x - 0.62, y - 0.02, 0.4); card.rotation.y = -Math.PI / 2; g.add(card);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.045), new THREE.MeshBasicMaterial());
      tag.position.set(x - 0.705, y - 0.155, 0.4); tag.rotation.y = -Math.PI / 2; g.add(tag);
      this.shelves.push({ card, tag, id: null, price: null });
    }
    // the glass
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 1.12), new THREE.MeshStandardMaterial({ color: 0xcfefff, transparent: true, opacity: 0.1, roughness: 0.05, envMap: this.env, depthWrite: false }));
    glass.position.set(x - 0.73, 1.17, 0.4); glass.rotation.y = -Math.PI / 2; g.add(glass);
    // the drop tray and coin slot
    const trayHole = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), new THREE.MeshBasicMaterial({ color: 0x030303 }));
    trayHole.position.set(x - 0.502, 0.36, 0.4); trayHole.rotation.y = -Math.PI / 2; g.add(trayHole);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.11), new THREE.MeshLambertMaterial({ map: T.sign('NO CREDIT', { w: 256, h: 80, bg: '#d8d0b8', fg: '#8a1010', font: 'bold 40px "Arial Black", Impact, sans-serif' }) }));
    sign.position.set(x - 0.002, 1.95, 1.1); sign.rotation.y = -Math.PI / 2; sign.rotation.z = -0.05; g.add(sign);
    this.root.add(g);
  }

  // what the vendor has on its shelves: small painted cards
  stock(items, priceOf) {
    items.forEach((it, i) => {
      const sh = this.shelves[i];
      if (!sh) return;
      const key = `${it.id}:${it.sold}:${priceOf(it.id)}`;
      if (sh.key === key) return;
      sh.key = key;
      sh.card.material.map?.dispose();
      sh.card.material.map = it.sold ? null : charmCard(it.id);
      sh.card.material.opacity = it.sold ? 0 : 1;
      sh.card.material.needsUpdate = true;
      sh.tag.material.map?.dispose();
      sh.tag.material.map = T.sign(it.sold ? 'SOLD' : `${priceOf(it.id)}¢`, { w: 128, h: 36, bg: it.sold ? '#402020' : '#f2e6b8', fg: '#111', font: 'bold 26px monospace' });
      sh.tag.material.needsUpdate = true;
    });
  }

  // ── the door, the padlocks, the phone ───────────────────────────────
  door() {
    const g = new THREE.Group(), z = ROOM.z1;
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.1, 0.06), new THREE.MeshLambertMaterial({ map: T.door() }));
    d.position.set(0, 1.05, z - 0.03); g.add(d);
    // light under the door: the only daylight in the pit
    this.crack = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.012), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
    this.crack.position.set(0, 0.006, z - 0.065); g.add(this.crack);
    // a hasp and eight padlocks down the edge of the door
    this.locks = [];
    const lockMat = new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.9, roughness: 0.4, envMap: this.env });
    const shackleMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 1, roughness: 0.25, envMap: this.env });
    for (let i = 0; i < 8; i++) {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.025), lockMat);
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12, Math.PI), shackleMat);
      shackle.position.y = 0.035;
      grp.add(body, shackle);
      const col = i % 2, row = Math.floor(i / 2);
      grp.position.set(0.3 + col * 0.09, 1.55 - row * 0.2, z - 0.08);
      grp.rotation.z = (i % 3 - 1) * 0.08;
      g.add(grp);
      this.locks.push({ grp, shackle, open: false, t: 0, vy: 0, home: grp.position.clone() });
    }
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.9, 0.01), new THREE.MeshLambertMaterial({ color: 0x777b80 }));
    chain.position.set(0.345, 1.25, z - 0.068); g.add(chain);
    this.root.add(g);
  }

  phone() {
    const g = new THREE.Group(), z = ROOM.z1;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.2), new THREE.MeshLambertMaterial({ color: 0x3a2a1a }));
    shelf.position.set(-0.85, 1.05, z - 0.1); g.add(shelf);
    const red = new THREE.MeshStandardMaterial({ color: 0xc81424, roughness: 0.3, metalness: 0.05, envMap: this.env });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.16), red);
    base.position.set(0, 0.04, 0);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
    dial.rotation.x = 0.5; dial.position.set(0, 0.085, 0.03);
    const handset = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.04), red);
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.06), red); e1.position.x = -0.09;
    const e2 = e1.clone(); e2.position.x = 0.09;
    handset.add(bar, e1, e2); handset.position.set(0, 0.1, -0.02);
    const tel = new THREE.Group(); tel.add(base, dial, handset);
    tel.position.set(-0.85, 1.06, z - 0.12);
    tel.rotation.y = Math.PI;
    g.add(tel);
    this.tel = tel; this.handset = handset;
    this.root.add(g);
  }

  props() {
    // the raccoon's junk in the corner: cans and caps
    const r = this.root, R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
    for (let i = 0; i < 14; i++) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), new THREE.MeshLambertMaterial({ color: [0x8a1a1a, 0x2a6a3a, 0x9a9aa0, 0x2a3a8a][i % 4] }));
      can.position.set(-1.35 + R() * 0.35, 0.03, -0.85 + R() * 0.4);
      can.rotation.set(Math.PI / 2 * (R() < 0.7 ? 1 : 0), R() * 6, 0);
      r.add(can);
    }
    // coins that missed the tray, long ago
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xd88a4e, metalness: 0.9, roughness: 0.5, envMap: this.env });
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.003, 12), coinMat);
      c.position.set(-0.3 + R() * 0.6, 0.0015, -0.5 + R() * 0.2);
      r.add(c);
    }
    // a bucket under a drip
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.25, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0x506070, side: THREE.DoubleSide }));
    bucket.position.set(1.3, 0.125, 1.45); r.add(bucket);
  }

  // ── the landlord ────────────────────────────────────────────────────
  raccoon() {
    const g = new THREE.Group();
    // two eyes high up the shaft, always
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    this.eyes = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeMat);
      e.position.set(ROOM.seat.x + sx * 0.06, 6.2, ROOM.seat.z - 0.2);
      g.add(e); this.eyes.push(e);
    }
    // the face, at the lip of the hole, for when you look up
    const c = T.canvas(256, 256), cx = c.getContext('2d');
    T.raccoonFace(cx, 128, 150, 110, { eyes: '#fff2b0', glow: true });
    const faceTex = new THREE.CanvasTexture(c); faceTex.colorSpace = THREE.SRGBColorSpace;
    this.face = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false }));
    this.face.position.set(ROOM.seat.x, 3.02, ROOM.seat.z - 0.28);
    this.face.rotation.x = Math.PI / 2 - 0.35;
    this.face.visible = false;
    g.add(this.face);
    // the paw: a furry arm that comes down the shaft for your coins
    this.paw = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.4, 8), new THREE.MeshLambertMaterial({ color: 0x5a5860 }));
    arm.position.y = 0.7;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshLambertMaterial({ color: 0x2a282e }));
    hand.scale.set(1, 0.6, 1.2);
    for (let k = 0; k < 4; k++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 5), new THREE.MeshLambertMaterial({ color: 0xe8e0d0 }));
      claw.position.set(-0.045 + k * 0.03, -0.05, 0.08); claw.rotation.x = Math.PI * 0.8;
      hand.add(claw);
    }
    this.paw.add(arm, hand);
    this.paw.position.set(ROOM.seat.x, 4.5, ROOM.seat.z - 0.1);
    this.paw.visible = false;
    g.add(this.paw);
    this.pawT = 0; this.pawTrapped = false;
    this.root.add(g);
  }

  lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x708090, 0x201810, 0.14));
    // the bulb on its cord: one warm source, swinging, with a real falloff
    this.bulbGroup = new THREE.Group();
    this.bulbGroup.position.set(0, ROOM.h, 0.1);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.55, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    cord.position.y = -0.275;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }));
    bulb.position.y = -0.58;
    this.bulbMesh = bulb;
    this.bulb = new THREE.PointLight(0xffc98a, 4.2, 6, 1.8);
    this.bulb.position.y = -0.6;
    this.bulbGroup.add(cord, bulb, this.bulb);
    s.add(this.bulbGroup);
    // the machine: the room's second light, and the one that changes
    this.machineLight = new THREE.PointLight(0xffe0b0, 2.2, 3.2, 1.4);
    this.machineLight.position.set(0, 1.35, -0.45);
    s.add(this.machineLight);
    // the vendor's tube, the ATM's screen, the crack under the door
    // the vendor's tube sits in its header, where a fluorescent tube would be
    this.vendorLight = new THREE.PointLight(0x9fdcff, 0.9, 1.8, 1.8);
    this.vendorLight.position.set(ROOM.x1 - 0.72, 1.86, 0.4); s.add(this.vendorLight);
    this.atmLight = new THREE.PointLight(0x40ff80, 0.35, 0.9, 2);
    this.atmLight.position.set(ROOM.x0 + 0.42, 1.2, 0.36); s.add(this.atmLight);
    this.doorLight = new THREE.PointLight(0xffd6a0, 0.4, 1.2, 2);
    this.doorLight.position.set(0, 0.08, ROOM.z1 - 0.2); s.add(this.doorLight);
  }

  // ── every frame ─────────────────────────────────────────────────────
  update(e, dt, time, fx) {
    this.t += dt;
    // the bulb sways; the light swings with it
    this.bulbGroup.rotation.z = Math.sin(time * 0.7) * 0.06 + (fx.shake ?? 0) * Math.sin(time * 30) * 0.2;
    this.bulbGroup.rotation.x = Math.sin(time * 0.53 + 1) * 0.04;
    const flicker = 1 - 0.08 * (Math.sin(time * 37) > 0.97 ? 1 : 0);
    this.bulb.intensity = 4.2 * flicker * (fx.dim ?? 1);
    // the machine light's colour is the machine's mood
    const ml = this.machineLight;
    let col = 0xffe0b0, k = e.machineOn ? 2.4 : 0.9;
    if (e.fever.active) { col = Math.floor(time * 8) % 2 ? 0xffc030 : 0xff7010; k = 4; }
    if (fx.bandit > 0) { col = 0xff2020; k = 4.5; }
    if (fx.win > 0) { col = 0xfff0a0; k = 2.4 + fx.win * 3; }
    ml.color.setHex(col); ml.intensity += (k - ml.intensity) * Math.min(1, dt * 6);
    // the ATM screen
    T.drawAtm(this.atmScreen, { debt: e.debt, atm: e.atm, shift: e.shift, deadline: e.deadline, due: e.phase === 'due', interest: e.rules.interest }, time);
    this.atmSlotLamp.material.color.setHex(e.phase === 'due' ? (Math.floor(time * 3) % 2 ? 0x40ff80 : 0x0a3a1a) : 0x114422);
    this.stock(e.shop.items, id => e.priceOf(id));
    // padlocks: one falls for every paid deadline
    const paid = Math.min(8, e.deadline - 1 + (e.phase === 'won' ? 1 : 0));
    this.locks.forEach((l, i) => {
      if (i < paid && !l.open) { l.open = true; l.t = 0; l.vy = 0; }
      if (i >= paid && l.open) { l.open = false; l.grp.position.copy(l.home); l.grp.rotation.set(0, 0, (i % 3 - 1) * 0.08); l.shackle.rotation.y = 0; }
      if (l.open) {
        l.t += dt;
        l.shackle.rotation.y = Math.min(1.4, l.t * 6);
        if (l.t > 0.35 && l.grp.position.y > 0.035) {
          l.vy -= 9.8 * dt; l.grp.position.y = Math.max(0.035, l.grp.position.y + l.vy * dt);
          l.grp.rotation.z += dt * 4;
          if (l.grp.position.y <= 0.035) { l.grp.rotation.set(Math.PI / 2, 0, (i - 4) * 0.4); l.grp.position.z = l.home.z - 0.1 - (i % 3) * 0.05; }
        }
      }
    });
    // the door, when the last one goes
    this.crack.material.color.setHex(e.phase === 'won' ? 0xffffff : 0xffd9a0);
    this.doorLight.intensity = e.phase === 'won' ? 3 : 0.4;
    // the phone rings
    const ringing = e.phase === 'phone';
    this.handset.position.y = 0.1 + (ringing && Math.floor(time * 18) % 2 ? 0.012 : 0);
    this.handset.rotation.z = ringing ? Math.sin(time * 40) * 0.08 : 0;
    // the paw
    if (this.pawT > 0) {
      this.pawT -= dt;
      const k2 = 1 - Math.max(0, this.pawT) / 1.6;       // 0 → 1 over the grab
      const reach = Math.sin(Math.min(1, k2) * Math.PI);
      this.paw.visible = true;
      this.paw.position.y = 4.4 - reach * (this.pawTrapped ? 1.5 : 2.6);
      this.paw.rotation.z = Math.sin(time * 9) * 0.08;
      if (this.pawT <= 0) this.paw.visible = false;
    }
    this.face.visible = fx.lookUp || this.pawT > 0;
    this.eyes.forEach(ey => ey.scale.setScalar(Math.floor(time * 0.35) % 7 === 0 && (time % 2.857) < 0.12 ? 0.2 : 1));
    // the trapdoor
    if (e.phase === 'fell') {
      for (const lf of this.leaves) lf.piv.rotation.z += (-lf.side * 1.45 - lf.piv.rotation.z) * Math.min(1, dt * 5);
    } else for (const lf of this.leaves) lf.piv.rotation.z *= 0.8;
  }

  grab(trapped) { this.pawT = 1.6; this.pawTrapped = trapped; }
}

// a small card with the charm's family colour, glyph and name
const FAMILY = { nails: '#d8b25a', stamps: '#c0c8d8', reels: '#ff5a7a', pusher: '#7ad7ff', money: '#6fe08a', raccoon: '#b08aff' };
const GLYPH = { nails: '¦', stamps: '◎', reels: '7', pusher: '▤', money: '¢', raccoon: '☻' };
export function charmCard(id) {
  const ch = CHARMS.find(c => c.id === id);
  const c = T.canvas(128, 128), g = c.getContext('2d');
  const col = FAMILY[ch?.family] ?? '#fff';
  g.fillStyle = '#0d1320'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(5, 5, 118, 118);
  g.fillStyle = col; g.font = 'bold 64px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(GLYPH[ch?.family] ?? '?', 64, 52);
  g.font = 'bold 15px monospace'; g.fillStyle = '#f0f0f0';
  const words = (ch?.name ?? id).toUpperCase().split(' ');
  words.slice(0, 2).forEach((w, i) => g.fillText(w, 64, 96 + i * 16 - (words.length > 1 ? 6 : 0)));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export { FAMILY, GLYPH };
