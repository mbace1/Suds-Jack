// The machine, in three.js: a pachinko board over a coin pusher over a tray.
// Everything here READS the engine and never writes it — the nails are drawn
// where the physics put them, and a coin is drawn where the physics has it.
//
// World units are metres; one board unit is a centimetre.

import * as THREE from 'three';
import { BOARD } from '../board.js?v=4';
import { PUSHER } from '../pusher.js?v=4';
import { LINES, STOP_ORDER } from '../reels.js?v=4';
import * as T from './textures.js?v=4';

export const S = 0.01;
export const M = {
  BOARD_Z: -0.935,          // the painted face of the playfield
  BOARD_Y0: 1.02,           // board y = 0
  BED_Y: 0.86,              // the pusher bed's surface
  BED_Z0: -0.935,           // pusher z = 0: the back wall
  COIN_Z: -0.935 + 0.0065,  // a board coin's centre, in front of the paint
  TRAY_Y: 0.735,
};
export const bx = x => x * S;
export const by = y => M.BOARD_Y0 + y * S;
export const pz = z => M.BED_Z0 + z * S;
export const edgeZ = () => pz(PUSHER.D);

const KIND_COLOR = {
  copper: 0xd88a4e, silver: 0xe9eef6, gold: 0xffc93a, clover: 0x62e08a, jumbo: 0xd8a24a,
  trash: 0xb8392b, prize: 0xffffff,
};

export class Machine {
  constructor(scene, envMap) {
    this.scene = scene;
    this.env = envMap;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.mats = this.makeMaterials();
    this.cabinet();
    this.boardGroup = new THREE.Group();
    this.root.add(this.boardGroup);
    this.coinsInit();
    this.reel = T.makeReelScreen();
    this.trayPile = [];       // {m: Matrix4, kind}
    this.falling = [];        // coins in the air: off the lip, into a gutter
    this.lampT = 0;
    this.layoutKey = null;
    this.flash = { color: new THREE.Color(0xffffff), t: 0 };
  }

  makeMaterials() {
    const env = this.env;
    const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.18, envMap: env });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.3, envMap: env });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf0c040, metalness: 1, roughness: 0.25, envMap: env, emissive: 0x3a2400 });
    const lacquer = new THREE.MeshLambertMaterial({ map: T.lacquer() });
    const dark = new THREE.MeshLambertMaterial({ color: 0x17141a });
    const bed = new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.6, roughness: 0.55, envMap: env, map: T.metal(64, 64, '#6d727a', 9) });
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe0ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.035, envMap: env, envMapIntensity: 0.6, depthWrite: false });
    const acrylic = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.18, roughness: 0.1, envMap: env, depthWrite: false });
    const plastic = (c, e = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: e });
    return { chrome, brass, gold, lacquer, dark, bed, glass, acrylic, plastic };
  }

  // ── the cabinet ─────────────────────────────────────────────────────
  cabinet() {
    const { root } = this, m = this.mats;
    const box = (w, h, d, mat, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); root.add(b); return b; };
    // lower body, under the bed
    box(0.74, 0.84, 0.42, m.lacquer, 0, 0.42, -0.83);
    // the tray: a chrome trough sticking out under the lip
    const tray = new THREE.Group();
    const tw = 0.44, td = 0.13, th = 0.05;
    const tb = (w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.chrome); b.position.set(x, y, z); tray.add(b); };
    tb(tw, 0.006, td, 0, 0, 0);
    tb(tw, th, 0.006, 0, th / 2, td / 2);
    tb(0.006, th, td, -tw / 2, th / 2, 0); tb(0.006, th, td, tw / 2, th / 2, 0);
    tray.position.set(0, M.TRAY_Y - 0.004, edgeZ() + 0.055);
    root.add(tray);
    // the tray has its own little lamp: what lands in it is the payout, and the
    // payout should be the brightest small thing in the room
    const trayLamp = new THREE.PointLight(0xffd9a0, 0.9, 0.32, 1.5);
    trayLamp.position.set(0, M.TRAY_Y + 0.07, edgeZ() + 0.03);
    root.add(trayLamp);
    this.trayBox = { x: tw / 2 - 0.02, z0: edgeZ() + 0.004, z1: edgeZ() + td - 0.01, y: M.TRAY_Y };
    // a drip rail under the lip that the coins fall past
    box(0.5, 0.012, 0.02, m.chrome, 0, M.BED_Y - 0.006, edgeZ() + 0.01);
    // the bed and its slab
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(PUSHER.HW * 2 * S, PUSHER.D * S), m.bed);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0, M.BED_Y, pz(PUSHER.D / 2));
    root.add(bed);
    this.slab = new THREE.Group();
    const slabBody = new THREE.Mesh(new THREE.BoxGeometry(PUSHER.HW * 2 * S - 0.002, PUSHER.SLAB_H * S, 0.3), m.chrome);
    slabBody.position.set(0, PUSHER.SLAB_H * S / 2, -0.15);
    this.slab.add(slabBody);
    const slabTop = new THREE.Mesh(new THREE.PlaneGeometry(PUSHER.HW * 2 * S - 0.004, 0.3), new THREE.MeshStandardMaterial({ color: 0x5a5f68, metalness: 0.7, roughness: 0.5, envMap: this.env }));
    slabTop.rotation.x = -Math.PI / 2; slabTop.position.set(0, PUSHER.SLAB_H * S + 0.0005, -0.15);
    this.slab.add(slabTop);
    this.slab.position.set(0, M.BED_Y, pz(PUSHER.PZ0));
    root.add(this.slab);
    // the back wall the slab slides out of, up to the bottom of the board
    box(0.5, M.BOARD_Y0 - M.BED_Y - PUSHER.SLAB_H * S - 0.002, 0.03, m.dark, 0, (M.BOARD_Y0 + M.BED_Y + PUSHER.SLAB_H * S) / 2 + 0.001, M.BED_Z0 - 0.015);
    // the three chutes from the board down to the shelf, and the hopper slot
    for (const x of [-14, 0, 14]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.07, 12, 1, true), m.chrome);
      tube.position.set(bx(x), M.BOARD_Y0 - 0.035, M.BED_Z0 + 0.012);
      root.add(tube);
    }
    this.hopperLamp = box(0.3, 0.012, 0.006, new THREE.MeshBasicMaterial({ color: 0x552200 }), 0, M.BOARD_Y0 - 0.012, M.BED_Z0 + 0.001);
    // side walls: acrylic up to where the gutters open, then nothing
    const gz = PUSHER.GZ;
    for (const sx of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.09, gz * S), m.acrylic);
      wall.position.set(sx * (PUSHER.HW * S + 0.002), M.BED_Y + 0.045, pz(gz / 2));
      root.add(wall);
      // the gutter: a dark mouth beside the front corners
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, (PUSHER.D - gz) * S), new THREE.MeshBasicMaterial({ color: 0x050505 }));
      mouth.position.set(sx * (PUSHER.HW * S + 0.026), M.BED_Y - 0.002, pz((gz + PUSHER.D) / 2));
      root.add(mouth);
      this['guard' + (sx < 0 ? 'L' : 'R')] = (() => {
        const g = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.05, 1), m.brass);
        g.position.set(sx * (PUSHER.HW * S + 0.002), M.BED_Y + 0.025, 0);
        g.visible = false; root.add(g); return g;
      })();
    }
    // cheeks either side of the bed, lacquered
    for (const sx of [-1, 1]) box(0.1, 0.2, 0.34, m.lacquer, sx * 0.33, M.BED_Y + 0.06, -0.8);
    // The bed's own lamps: a strip under the board shining down onto the
    // field. A pusher is lit like a shop window, because the coins at the lip
    // are the thing you paid to look at.
    this.bedLight = new THREE.PointLight(0xfff0d8, 1.6, 0.75, 1.2);
    this.bedLight.position.set(0, M.BOARD_Y0 - 0.02, pz(PUSHER.D * 0.55));
    root.add(this.bedLight);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.008, 0.012), new THREE.MeshBasicMaterial({ color: 0xfff4d8 }));
    strip.position.set(0, M.BOARD_Y0 - 0.03, M.BED_Z0 + 0.02);
    root.add(strip);
    this.bedStrip = strip;

    // the upper frame around the board
    const fw = 0.72, fh = 0.94, fy = M.BOARD_Y0 + 0.42;
    box(fw, 0.06, 0.08, m.lacquer, 0, fy + fh / 2 - 0.03, -0.93);                   // top
    box(0.06, fh, 0.08, m.lacquer, -fw / 2 + 0.03, fy, -0.93);                      // left
    box(0.06, fh, 0.08, m.lacquer, fw / 2 - 0.03, fy, -0.93);                       // right
    box(fw, 0.05, 0.09, m.lacquer, 0, M.BOARD_Y0 - 0.01, -0.94);                    // sill
    box(fw - 0.1, fh - 0.06, 0.02, m.dark, 0, fy - 0.01, -0.955);                   // back
    // board glass
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.86), m.glass);
    bg.position.set(0, by(42), M.BOARD_Z + 0.017);
    root.add(bg);
    this.glass = bg;
    // lamp strips down both sides of the frame
    this.sideLamps = [];
    const lampGeo = new THREE.SphereGeometry(0.008, 8, 6);
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const l = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0x331a00 }));
        l.position.set(sx * (fw / 2 - 0.03), M.BOARD_Y0 + 0.05 + i * 0.075, -0.885);
        root.add(l); this.sideLamps.push(l);
      }
    }
    // the marquee
    const mq = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.18), new THREE.MeshBasicMaterial({ map: T.marquee() }));
    mq.position.set(0, fy + fh / 2 + 0.09, -0.9);
    root.add(mq);
    this.marquee = mq;
    box(0.76, 0.2, 0.1, m.lacquer, 0, fy + fh / 2 + 0.09, -0.955);
    // the handle: a chrome knob, lower right, that turns with the power
    this.handle = new THREE.Group();
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.03, 20), m.chrome);
    knob.rotation.x = Math.PI / 2;
    this.handle.add(knob);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.02), m.plastic(0x202020));
    grip.position.set(0, 0.018, 0.018);
    this.handle.add(grip);
    this.handleGrip = grip;
    this.handle.position.set(0.29, 0.67, -0.605);
    root.add(this.handle);
    // the lever on the side: pulled to start a shift
    this.lever = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 10), m.chrome);
    stick.position.y = 0.14;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd01830, roughness: 0.25, metalness: 0.1, envMap: this.env }));
    ball.position.y = 0.29;
    this.lever.add(stick, ball);
    this.lever.position.set(0.385, 1.02, -0.72);
    root.add(this.lever);
    this.leverBall = ball;
    this.leverT = 0;
  }

  // ── the board, from the physics layout ──────────────────────────────
  buildBoard(L) {
    const key = JSON.stringify(L.mods);
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    const g = this.boardGroup, m = this.mats;
    while (g.children.length) { const c = g.children.pop(); c.geometry?.dispose?.(); }
    this.L = L;
    // the painted face
    this.artTex?.dispose();
    this.artTex = T.boardArt(L);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.W * S, BOARD.H * S),
      new THREE.MeshLambertMaterial({ map: this.artTex, emissive: 0xffffff, emissiveMap: this.artTex, emissiveIntensity: 0.42 }));
    face.position.set(0, by(BOARD.H / 2), M.BOARD_Z);
    g.add(face);
    this.face = face;
    // nails: brass shanks with a little head, instanced
    const shank = new THREE.CylinderGeometry(0.0021, 0.0021, 0.013, 6);
    shank.rotateX(Math.PI / 2); shank.translate(0, 0, 0.0065);
    // the heads are drawn a little fat: a nail is 2 mm of brass and at a few
    // hundred lines a 2 mm head is no pixel at all
    const head = new THREE.CylinderGeometry(0.0042, 0.0042, 0.0015, 8);
    head.rotateX(Math.PI / 2); head.translate(0, 0, 0.0132);
    const pins = new THREE.InstancedMesh(shank, m.brass, L.pins.length);
    const heads = new THREE.InstancedMesh(head, m.brass, L.pins.length);
    const mm = new THREE.Matrix4();
    L.pins.forEach((p, i) => { mm.makeTranslation(bx(p.x), by(p.y), M.BOARD_Z); pins.setMatrixAt(i, mm); heads.setMatrixAt(i, mm); });
    g.add(pins, heads);
    // rails: chrome strips along the physics' own segments
    for (const s of L.segs) {
      const kind = s.kind;
      if (!['rail', 'guide', 'frame', 'stage', 'valve', 'lanefloor'].includes(kind)) continue;
      const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
      if (len < 1e-3) continue;
      const depth = kind === 'frame' ? 0.016 : kind === 'stage' ? 0.012 : 0.014;
      const thick = kind === 'rail' || kind === 'guide' ? 0.0045 : kind === 'frame' ? 0.007 : 0.004;
      const mat = kind === 'frame' ? m.gold : kind === 'stage' ? m.plastic(0xff7a2a, 0x401000) : m.chrome;
      const b = new THREE.Mesh(new THREE.BoxGeometry(len * S + 0.001, thick, depth), mat);
      b.position.set(bx((s.ax + s.bx) / 2), by((s.ay + s.by) / 2), M.BOARD_Z + depth / 2);
      b.rotation.z = Math.atan2(s.by - s.ay, s.bx - s.ax);
      g.add(b);
    }
    // the reel window: the LCD, recessed behind the gold frame
    const W = L.WIN;
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry((W.x1 - W.x0 - 0.8) * S, (W.y1 - W.y0 - 0.8) * S),
      new THREE.MeshBasicMaterial({ map: this.reel.texture }));
    lcd.position.set(bx((W.x0 + W.x1) / 2), by((W.y0 + W.y1) / 2), M.BOARD_Z + 0.001);
    g.add(lcd);
    this.lcd = lcd;
    // the roof of the window, a gold gable
    // pockets
    this.pocketMeshes = {};
    for (const p of L.pockets) {
      const grp = new THREE.Group();
      const col = { start: 0xff3b5c, tulip: 0xff5ac8, pocket: 0x3fd96a, attacker: 0xffc830 }[p.kind];
      const mat = new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.25, transparent: true, opacity: 0.92 });
      const w = (p.narrow ?? p.w) * S, d = p.depth * S;
      const add = (gw, gh, x, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, 0.013), mat); b.position.set(x, y, 0.0065); grp.add(b); return b; };
      if (p.kind === 'attacker') {
        add(0.004, d, -w / 2, -d / 2); add(0.004, d + 0.02, w / 2, -d / 2 + 0.01); add(w, 0.004, 0, -d);
        const flap = new THREE.Group();
        const fl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.004, 0.013), mat);
        fl.position.set(0, 0, 0.0065);
        flap.add(fl);
        flap.position.set(0, 0.01, 0);
        flap.rotation.z = Math.atan2(2, (p.w));
        grp.add(flap);
        this.attackerFlap = flap;
      } else {
        add(0.003, d, -w / 2, -d / 2); add(0.003, d, w / 2, -d / 2); add(w + 0.003, 0.003, 0, -d);
        if (p.kind === 'tulip') {
          const wings = [];
          for (const sx of [-1, 1]) {
            const piv = new THREE.Group();
            piv.position.set(sx * w / 2, -0.007, 0);
            const wing = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.02, 0.013), mat);
            wing.position.set(0, 0.01, 0.0065);
            piv.add(wing); grp.add(piv); wings.push({ piv, sx });
          }
          grp.userData.wings = wings;
        }
      }
      grp.position.set(bx(p.x), by(p.y), M.BOARD_Z);
      grp.userData.mat = mat;
      g.add(grp);
      this.pocketMeshes[p.id] = grp;
    }
    // windmills
    this.windmills = L.windmills.map(w => {
      const grp = new THREE.Group();
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.015, 10), m.chrome);
      hub.rotation.x = Math.PI / 2; hub.position.z = 0.0075;
      grp.add(hub);
      const bladeMat = m.plastic(0x7ad7ff, 0x0a2a3a);
      for (let k = 0; k < 4; k++) {
        const bl = new THREE.Mesh(new THREE.BoxGeometry(w.r * S * 2, 0.003, 0.011), bladeMat);
        bl.rotation.z = k * Math.PI / 4;
        bl.position.z = 0.007;
        grp.add(bl);
      }
      grp.position.set(bx(w.x), by(w.y), M.BOARD_Z);
      g.add(grp);
      return grp;
    });
    // the warp's mouth: a dark hole with a ring that glows when it swallows
    const wp = L.warp;
    const hole = new THREE.Mesh(new THREE.PlaneGeometry((wp.x1 - wp.x0) * S, (wp.y1 - wp.y0) * S), new THREE.MeshBasicMaterial({ color: 0x0a0010 }));
    hole.position.set(bx((wp.x0 + wp.x1) / 2), by((wp.y0 + wp.y1) / 2), M.BOARD_Z + 0.002);
    g.add(hole);
    this.warpRing = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.016, 20), new THREE.MeshBasicMaterial({ color: 0xb04dff, transparent: true, opacity: 0.4 }));
    this.warpRing.position.set(bx(wp.x0 - 0.2), by((wp.y0 + wp.y1) / 2), M.BOARD_Z + 0.004);
    g.add(this.warpRing);
    // rail lamps: a chase of little bulbs round the outer rail
    const lampGeo = new THREE.SphereGeometry(0.004, 6, 4);
    const n = 26;
    this.railLamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (i / (n - 1));
      mm.makeTranslation(bx(Math.cos(a) * (BOARD.R + 0.9)), by(BOARD.C.y + Math.sin(a) * (BOARD.R + 0.9)), M.BOARD_Z + 0.006);
      this.railLamps.setMatrixAt(i, mm);
      this.railLamps.setColorAt(i, new THREE.Color(0x442200));
    }
    g.add(this.railLamps);
  }

  // ── coins ───────────────────────────────────────────────────────────
  coinsInit() {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 20);
    const face = T.coinFace();
    // metal, but not all metal: a coin keeps a little diffuse and a faint warm
    // glow, so it never goes black in front of a dark board
    const side = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.75, roughness: 0.38, envMap: this.env, emissive: 0x201408 });
    const cap = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.7, roughness: 0.3, envMap: this.env, map: face, emissive: 0x2a1a0c });
    const mats = [side, cap, cap];
    this.coinMax = 900;
    this.coinMesh = new THREE.InstancedMesh(geo, mats, this.coinMax);
    this.coinMesh.frustumCulled = false;
    this.coinMesh.count = 0;
    this.coinMesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.root.add(this.coinMesh);
    // Coins in FLIGHT get their own mesh: brighter, and each one sitting on a
    // dark disc a little bigger than itself. A copper coin at true size simply
    // dissolved into a purple-and-brass board; the Master System's answer — a
    // flat fill inside a hard dark line — is the one that reads.
    const flyMats = [
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.55, roughness: 0.3, envMap: this.env, emissive: 0x6a4420 }),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.25, envMap: this.env, map: face, emissive: 0x7a5028 }),
    ];
    this.flyMesh = new THREE.InstancedMesh(geo, [flyMats[0], flyMats[1], flyMats[1]], 80);
    this.flyMesh.frustumCulled = false; this.flyMesh.count = 0;
    this.flyMesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.root.add(this.flyMesh);
    const rimGeo = new THREE.CircleGeometry(1, 20);
    this.rimMesh = new THREE.InstancedMesh(rimGeo, new THREE.MeshBasicMaterial({ color: 0x07030a, transparent: true, opacity: 0.8, depthWrite: false }), 80);
    this.rimMesh.frustumCulled = false; this.rimMesh.count = 0;
    this.root.add(this.rimMesh);
    // the prize capsule: half red, half clear
    const cap2 = new THREE.SphereGeometry(1, 16, 12);
    this.prizeMesh = new THREE.InstancedMesh(cap2, new THREE.MeshStandardMaterial({ color: 0xff3050, roughness: 0.2, metalness: 0.1, envMap: this.env }), 8);
    this.prizeMesh.count = 0; this.prizeMesh.frustumCulled = false;
    this.root.add(this.prizeMesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
  }

  // `order` matters: a board coin is stood up (x) and THEN spun about the
  // world z — in three's default XYZ the spin is applied first and tips the
  // disc's axis sideways, and the first renders showed every coin edge-on
  putCoin(i, x, y, z, r, rx, ry, rz, kind, order = 'XYZ') {
    this._e.set(rx, ry, rz, order);
    this._q.setFromEuler(this._e);
    this._p.set(x, y, z);
    const thick = kind === 'trash' ? 0.004 : 0.003;
    this._s.set(r, thick, r);
    this._m.compose(this._p, this._q, this._s);
    this.coinMesh.setMatrixAt(i, this._m);
    this._c.setHex(KIND_COLOR[kind] ?? KIND_COLOR.copper);
    this.coinMesh.setColorAt(i, this._c);
  }

  // a coin in flight on the board: drawn a touch large, on its dark disc
  putFly(i, x, y, z, r, spin, kind, tilt = Math.PI / 2) {
    this._e.set(tilt, 0, spin, 'ZYX');
    this._q.setFromEuler(this._e);
    this._m.compose(this._p.set(x, y, z), this._q, this._s.set(r * 1.25, 0.003, r * 1.25));
    this.flyMesh.setMatrixAt(i, this._m);
    this._c.setHex(KIND_COLOR[kind] ?? KIND_COLOR.copper);
    this.flyMesh.setColorAt(i, this._c);
    this._q.identity();
    this._m.compose(this._p.set(x, y, z - 0.0022), this._q, this._s.set(r * 1.6, r * 1.6, 1));
    this.rimMesh.setMatrixAt(i, this._m);
  }

  // ── every frame ─────────────────────────────────────────────────────
  update(e, dt, time, events) {
    this.buildBoard(e.board.L);
    let n = 0, np = 0, nf = 0;
    const put = (...a) => { if (n < this.coinMax) this.putCoin(n++, ...a); };
    // on the board: discs facing you, turning as they roll
    for (const c of e.board.coins) if (nf < 80) this.putFly(nf++, bx(c.x), by(c.y), M.COIN_Z, c.r * S, c.spin, c.kind);
    // in the chutes, on the way down to the shelf
    for (const c of e.chutes) {
      const k = 1 - c.at / 0.42, x = { L: -14, C: 0, R: 14 }[c.chute] ?? 0;
      const y0 = M.BOARD_Y0 + 0.01, y1 = M.BED_Y + PUSHER.SLAB_H * S + 0.003;
      if (nf < 80) this.putFly(nf++, bx(x), y0 + (y1 - y0) * k * k, M.BED_Z0 + 0.012 + 0.012 * k, S, k * 3, c.kind, Math.PI / 2 * (1 - k));
    }
    this.flyMesh.count = nf; this.rimMesh.count = nf;
    this.flyMesh.instanceMatrix.needsUpdate = true; this.rimMesh.instanceMatrix.needsUpdate = true;
    if (this.flyMesh.instanceColor) this.flyMesh.instanceColor.needsUpdate = true;
    // on the shelf and the bed
    const D = PUSHER.D;
    for (const c of e.pusher.coins) {
      const base = M.BED_Y + (c.shelf ? PUSHER.SLAB_H * S : 0) + (c.lvl * PUSHER.THICK + PUSHER.THICK / 2) * S;
      const drop = c.fall > 0 ? c.fall * 0.16 : 0;
      // the lip: a coin hanging over the edge leans out over the tray
      const over = !c.shelf && c.z > D - c.r ? (c.z - (D - c.r)) / c.r : 0;
      const wob = ((c.id * 2654435761) % 1000) / 1000 - 0.5;
      const lean = c.lvl ? wob * 0.18 : wob * 0.03;
      if (c.kind === 'prize') {
        if (np < 8) { this._m.compose(this._p.set(bx(c.x), base + drop + c.r * S * 0.4, pz(c.z)), this._q.identity(), this._s.set(c.r * S * 0.8, c.r * S * 0.8, c.r * S * 0.8)); this.prizeMesh.setMatrixAt(np++, this._m); }
        continue;
      }
      put(bx(c.x), base + drop - over * 0.004, pz(c.z), c.r * S, over * 0.5 + lean, c.spin, lean * 0.7, c.kind);
    }
    // off the lip and into the tray; off the side and away
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.t += dt; f.vy -= 9.8 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.rx += f.vr * dt;
      if (f.tray && f.y <= this.trayTop()) {
        this.landInTray(f); this.falling.splice(i, 1); continue;
      }
      if (f.t > 1.2) { this.falling.splice(i, 1); continue; }
      put(f.x, f.y, f.z, f.r, f.rx, f.ry, 0, f.kind);
    }
    for (const p of this.trayPile) {
      if (n >= this.coinMax) break;
      this.coinMesh.setMatrixAt(n, p.m);
      this._c.setHex(KIND_COLOR[p.kind] ?? KIND_COLOR.copper);
      this.coinMesh.setColorAt(n++, this._c);
    }
    this.coinMesh.count = n;
    this.coinMesh.instanceMatrix.needsUpdate = true;
    if (this.coinMesh.instanceColor) this.coinMesh.instanceColor.needsUpdate = true;
    this.prizeMesh.count = np;
    this.prizeMesh.instanceMatrix.needsUpdate = true;

    // the slab
    this.slab.position.z = pz(e.pusher.zp);
    // gutter guards, when a charm has put them in
    const gz = e.pusher.gutterZ;
    for (const g of [this.guardL, this.guardR]) {
      const len = (gz - PUSHER.GZ) * S;
      g.visible = len > 0.002;
      if (g.visible) { g.scale.z = len; g.position.z = pz(PUSHER.GZ) + len / 2; }
    }
    // board furniture
    const L = e.board.L;
    for (const w of this.windmills ?? []) {}
    L.windmills.forEach((w, i) => { if (this.windmills[i]) this.windmills[i].rotation.z = w.a; });
    for (const p of L.pockets) {
      const g = this.pocketMeshes[p.id];
      if (!g) continue;
      g.userData.mat.emissiveIntensity = 0.25 + p.flash * 1.6;
      if (g.userData.wings) for (const { piv, sx } of g.userData.wings) {
        const want = p.open ? -sx * 0.55 : 0;
        piv.rotation.z += (want - piv.rotation.z) * Math.min(1, dt * 12);
      }
    }
    if (this.attackerFlap) {
      const open = L.byId.attacker?.open;
      const want = open ? -1.2 : Math.atan2(2, 12);
      this.attackerFlap.rotation.x += ((open ? -1.1 : 0) - this.attackerFlap.rotation.x) * Math.min(1, dt * 8);
      this.attackerFlap.rotation.z = open ? 0 : want;
    }
    // the handle turns with the power; the lever swings when a shift starts
    this.handle.rotation.z = -e.power * 2.4 + 1.2;
    if (this.leverT > 0) this.leverT = Math.max(0, this.leverT - dt);
    this.lever.rotation.x = -Math.sin(Math.min(1, this.leverT / 0.6) * Math.PI) * 0.9;

    this.lamps(e, dt, time);
    this.drawReels(e, time);
  }

  trayTop() { return M.TRAY_Y + 0.004 + Math.min(0.03, this.trayPile.length * 0.0004); }

  // a coin going over the lip: the view takes it from the engine and drops it
  spill(x, kind, value) {
    this.falling.push({ x: bx(x), y: M.BED_Y + 0.002, z: edgeZ() + 0.004, vx: (Math.random() - 0.5) * 0.08, vy: 0.02,
      vz: 0.18 + Math.random() * 0.1, rx: 0.4, ry: Math.random() * 6, vr: 6 + Math.random() * 6, r: S, kind, t: 0, tray: true });
  }

  gutterSpill(x, z, kind, side) {
    this.falling.push({ x: bx(x), y: M.BED_Y, z: pz(z), vx: side * 0.2, vy: 0.05, vz: 0.02, rx: 0, ry: 0, vr: 8, r: S, kind, t: 0, tray: false });
  }

  landInTray(f) {
    const b = this.trayBox;
    const x = Math.max(-b.x, Math.min(b.x, f.x + (Math.random() - 0.5) * 0.06));
    const z = b.z0 + Math.random() * (b.z1 - b.z0);
    this._e.set((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4);
    this._q.setFromEuler(this._e);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, this.trayTop(), z), this._q.clone(), new THREE.Vector3(S, 0.003, S));
    this.trayPile.push({ m, kind: f.kind });
    if (this.trayPile.length > 160) this.trayPile.shift();
  }

  emptyTray() { this.trayPile.length = 0; }

  // ── light ───────────────────────────────────────────────────────────
  lamps(e, dt, time) {
    this.lampT += dt;
    const on = e.machineOn;
    const fever = e.fever.active;
    const n = this.railLamps?.count ?? 0;
    for (let i = 0; i < n; i++) {
      let k;
      if (!on) k = 0.12;
      else if (fever) k = (Math.floor(time * 12) + i) % 3 === 0 ? 1 : 0.3;
      else k = 0.35 + 0.65 * Math.max(0, Math.sin(time * 3 - i * 0.5)) ** 8;
      this._c.setRGB(1 * k, (fever ? 0.75 : 0.62) * k, (fever ? 0.2 : 0.35) * k);
      this.railLamps.setColorAt(i, this._c);
    }
    if (this.railLamps?.instanceColor) this.railLamps.instanceColor.needsUpdate = true;
    this.sideLamps.forEach((l, i) => {
      const k = !on ? 0.1 : fever ? ((Math.floor(time * 10) + i) % 2 ? 1 : 0.2) : 0.3 + 0.7 * ((Math.floor(time * 4) + i) % 6 === 0 ? 1 : 0);
      l.material.color.setRGB(k, k * (fever ? 0.8 : 0.55), k * 0.2);
    });
    this.hopperLamp.material.color.setHex(e.hopper.length ? (Math.floor(time * 16) % 2 ? 0xffc040 : 0x663300) : 0x221100);
    if (this.face) this.face.material.emissiveIntensity = on ? 0.42 : 0.16;
    if (this.warpRing) this.warpRing.material.opacity = 0.25 + 0.2 * Math.sin(time * 4);
  }

  // ── the reel window ─────────────────────────────────────────────────
  drawReels(e, time) {
    const { ctx: g, W, H, sheet } = this.reel;
    const cellH = 38, top = 6, colW = W / 3;
    const fever = e.fever.active;
    g.fillStyle = fever ? '#2a1600' : '#0b0620'; g.fillRect(0, 0, W, H);
    // a slow starfield when idle, so the window is never a black rectangle
    for (let i = 0; i < 18; i++) {
      const x = (i * 53 + time * (8 + i % 5)) % W, y = (i * 29) % H;
      g.fillStyle = fever ? 'rgba(255,200,80,0.35)' : 'rgba(150,120,255,0.3)'; g.fillRect(x | 0, y, 1, 1);
    }
    const s = e.spin, last = this.lastGrid;
    for (let k = 0; k < 3; k++) {
      const x0 = k * colW;
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x0 + 3, top - 2, colW - 6, cellH * 3 + 4);
      let offset = 0, spinning = false, col = null;
      if (s) {
        const stop = s.stops[k];
        const left = stop - s.t;
        if (left > 0) {
          spinning = true;
          // symbols per second: fast, then easing into the stop; a reach
          // reel crawls through its last second and a half
          const isReach = s.reach && k === STOP_ORDER[2];
          const v = isReach && left < 1.9 ? 2.2 + left * 3 : 14;
          offset = left * v;
        }
        col = s.grid[k];
      } else if (last) col = last[k];
      for (let r = -1; r < 4; r++) {
        let name;
        const pos = r - offset;
        const rowIdx = Math.floor(pos);
        const frac = pos - rowIdx;
        if (spinning) {
          const idx = rowIdx;
          name = idx >= 0 && idx < 3 && col ? col[idx] : sheet.names[Math.abs((idx * 7 + k * 3 + ((s?.len ?? 0) * 10 | 0))) % sheet.names.length];
        } else {
          if (r < 0 || r > 2) continue;
          name = col ? col[r] : sheet.names[(r + k * 2) % sheet.names.length];
        }
        const y = top + (spinning ? (rowIdx + (pos - rowIdx) - pos + r - frac) : r) * cellH;
        const yy = spinning ? top + (r - frac) * cellH : top + r * cellH;
        const si = sheet.names.indexOf(name);
        if (si < 0 || yy < -cellH || yy > H) continue;
        g.globalAlpha = spinning ? 0.75 : 1;
        g.drawImage(sheet.canvas, si * sheet.size, 0, sheet.size, sheet.size, x0 + (colW - 36) / 2, yy + 1, 36, 36);
        g.globalAlpha = 1;
        void y;
      }
      if (spinning) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x0 + 3, top - 2, colW - 6, cellH * 3 + 4); }
    }
    // the winning line, once everything has stopped
    if (s && s.t >= s.stops[STOP_ORDER[2]] && s.line) {
      g.strokeStyle = s.outcome === 'mask' ? '#ff3030' : '#ffe14a'; g.lineWidth = 3;
      g.beginPath();
      LINES[s.line].forEach(([rk, rw], i) => {
        const x = rk * colW + colW / 2, y = top + rw * cellH + cellH / 2;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
    }
    if (s) this.lastGrid = s.grid;
    // REACH: the banner that holds the room's breath
    if (s && s.reach && s.t >= s.stops[STOP_ORDER[1]] && s.t < s.stops[STOP_ORDER[2]]) {
      if (Math.floor(time * 6) % 2) {
        g.fillStyle = 'rgba(255,40,70,0.85)'; g.fillRect(0, H / 2 - 12, W, 24);
        g.fillStyle = '#fff'; g.font = 'bold 18px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('REACH!', W / 2, H / 2 + 1);
      }
    }
    if (fever) {
      g.fillStyle = '#ffd23f'; g.font = 'bold 12px monospace'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText(`FEVER ${e.fever.left}`, 4, H - 12);
      g.textAlign = 'right'; g.fillText('SHOOT RIGHT ▸', W - 4, H - 12);
    }
    // the hold lamps: spins waiting
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i < e.spins.length ? '#ff4d6d' : '#2a1a3a';
      g.beginPath(); g.arc(W / 2 - 21 + i * 14, H - 5, 3.2, 0, Math.PI * 2); g.fill();
    }
    if (!e.machineOn) {
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#b89cff'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (Math.floor(time * 1.5) % 2) g.fillText(e.phase === 'due' ? 'PAY THE ATM' : 'PULL THE LEVER', W / 2, H / 2);
    }
    this.reel.texture.needsUpdate = true;
  }

  pullLever() { this.leverT = 0.6; }
}
