// The machine on a bar wall in Kallio, and the camera that sits CLOSE to it.
//
// The owner's first note was "the mobile view should be much closer", so the
// camera solves for the face, not the room: it fits the machine into whatever
// band the HUD leaves free, and while a coin is on the face it leans in and
// follows it. World units are board units, straight: x across, y up, the face
// at z = 0 and everything that stands out of it at z > 0.
//
// The case, the pot and the room are the owner's photographs (2026-09-27):
// teak veneer, a black 1 mk plate down the right, a chrome drawer handle, the
// crank on the right side, two brown bottles on top, an orange wall.

import * as THREE from 'three';
import { faceCanvas, coinCanvas, plateCanvas, nameCanvas, woodCanvas, wallCanvas, tableCanvas, PPU, X0, Y1 } from './art.js?v=7';
import { FACE, JACKPOT } from './layout.js?v=7';

const COIN_Z = 1.0;           // the coin rolls on the face this far out of it
const PIN_LEN = 2.0;
const GLASS_Z = 2.6;

export class View {
  constructor(canvas, L) {
    this.L = L;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a1208);
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
    this.insets = { top: 60, bottom: 60, right: 0, left: 0 };
    this.cam = { x: 0, y: 40, d: 200, tx: 0, ty: 40, td: 200 };
    this.follow = 0;             // 0 = the whole machine, 1 = leaning in on the coin
    this.flash = {};             // window id -> seconds of light left
    this.drops = [];             // coins falling into the tray, for the eye only
    this.falls = [];             // coins dropping into a pot column
    this.caught = [];            // a coin sitting in a window for a moment
    this.pending = new Array(FACE.COLS).fill(0);
    this.shown = null;           // the pot as last drawn
    this.lever = 0;              // 0..1, how far the handle is down
    this.build();
    this.resize();
  }

  build() {
    const s = this.scene, L = this.L;
    const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); s.add(b); return b; };

    // the bar: white wall, the orange painted panel the machine hangs on, and
    // the edge of a table in front, bottom right
    const white = new THREE.Mesh(new THREE.PlaneGeometry(700, 500), new THREE.MeshLambertMaterial({ color: 0xe9e4da }));
    white.position.set(40, 40, -9.2); s.add(white);
    const wt = tex(wallCanvas()); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(2, 3);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(128, 400), new THREE.MeshLambertMaterial({ map: wt }));
    wall.position.set(2, 40, -9); s.add(wall);
    const tt = tex(tableCanvas());
    const tableTop = new THREE.MeshLambertMaterial({ map: tt });
    const tableSide = new THREE.MeshLambertMaterial({ color: 0x8a6238 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 34), [tableSide, tableSide, tableTop, tableSide, tableSide, tableSide]);
    table.position.set(66, -17.5, 14); s.add(table);
    box(4, 40, 4, 40, -39, 28, tableSide);

    // the case: teak veneer round the face, a strip down the right for the
    // 1 mk plate, a deep lower rail with the drawer
    const woodT = tex(woodCanvas());
    const wood = new THREE.MeshPhongMaterial({ map: woodT, shininess: 50, specular: 0x3a2412 });
    const woodH = tex(woodCanvas()); woodH.rotation = Math.PI / 2; woodH.center.set(0.5, 0.5);
    const woodAcross = new THREE.MeshPhongMaterial({ map: woodH, shininess: 50, specular: 0x3a2412 });
    const dark = new THREE.MeshPhongMaterial({ color: 0x1c1c20, shininess: 30 });
    const chrome = new THREE.MeshPhongMaterial({ color: 0xd8dde4, shininess: 120, specular: 0xffffff });
    this.chrome = chrome;
    box(5, 104, 8, -33.5, 35, 1.5, wood);                     // left
    box(5, 104, 8, 40.5, 35, 1.5, wood);                      // right
    box(79, 6, 8, 3.5, 85, 1.5, woodAcross);                   // top
    box(79, 16, 10, 3.5, -9, 2.5, woodAcross);                 // the lower rail
    box(7, 104, 12, 44.5, 35, -3.5, dark);                    // the grey-black side of the case
    // the black plate down the right of the glass, and its coin slot
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 82), new THREE.MeshLambertMaterial({ map: tex(plateCanvas()) }));
    plate.position.set(34.6, 41, 0.1); s.add(plate);
    box(0.8, 82, 2, 31, 41, 1, dark);
    // the name plate, small, top left, as the real one carries its maker's
    const name = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), new THREE.MeshPhongMaterial({ map: tex(nameCanvas()), shininess: 90 }));
    name.position.set(-18, 85, 5.6); s.add(name);
    // the latch, top right
    box(2.4, 5, 1.2, 30, 84.5, 6, chrome);
    // the drawer: a chrome pull across the lower rail
    box(22, 1.4, 2.2, 2, -8, 8.6, chrome);
    box(1.4, 1.4, 3.2, -8.3, -8, 7.4, chrome); box(1.4, 1.4, 3.2, 12.3, -8, 7.4, chrome);
    this.trayY = -1.9;
    box(40, 2.4, 6, 2, -4.2, 8.6, dark);                       // the payout lip the coins land on

    // two brown bottles on top of the case
    const glass = new THREE.MeshPhongMaterial({ color: 0x6b2a0a, shininess: 140, specular: 0xffc080, transparent: true, opacity: 0.88 });
    const pts = [[0, 0], [3.1, 0], [3.2, 0.4], [3.2, 9], [2.8, 11], [1.2, 13], [1.0, 16.5], [1.2, 17], [0, 17]].map(([x, y]) => new THREE.Vector2(x, y));
    const bottleGeo = new THREE.LatheGeometry(pts, 18);
    this.bottles = [];
    for (const [x, sc] of [[-10, 1], [2, 0.92]]) { const b = new THREE.Mesh(bottleGeo, glass); b.position.set(x, 88, 0); b.scale.setScalar(sc); s.add(b); this.bottles.push(b); }
    this.woodAcross = woodAcross; this.dark = dark;

    this.tex = tex;
    this.mats = { chrome, deflector: new THREE.MeshPhongMaterial({ color: 0x2a0508, shininess: 40 }),
      petal: new THREE.MeshPhongMaterial({ color: 0xe0203a, shininess: 90, specular: 0xffc0c0 }),
      mill: new THREE.MeshPhongMaterial({ color: 0xffd23f, shininess: 90, specular: 0xffffff }),
      gold: new THREE.MeshPhongMaterial({ color: 0xd8a830, shininess: 110, specular: 0xfff0b0 }),
      lid: new THREE.MeshPhongMaterial({ color: 0x1060d0, shininess: 90, specular: 0xc0e0ff }) };
    this.buildFace(L);

    // the coin, and the coins of the pot
    const coinTex = tex(coinCanvas());
    const r = FACE.COIN_R;
    const coinGeo = new THREE.CylinderGeometry(r, r, 0.32, 28);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = [
      new THREE.MeshPhongMaterial({ color: 0xb8913c, shininess: 80 }),
      new THREE.MeshPhongMaterial({ map: coinTex, shininess: 100, specular: 0xfff0c0 }),
      new THREE.MeshPhongMaterial({ map: coinTex, shininess: 100 }),
    ];
    this.coinGeo = coinGeo; this.coinMat = coinMat;
    this.coin = new THREE.Mesh(coinGeo, coinMat); this.coin.visible = false; s.add(this.coin);
    this.coinShadow = new THREE.Mesh(new THREE.CircleGeometry(r * 1.05, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    this.coinShadow.visible = false; s.add(this.coinShadow);
    this.potMesh = new THREE.InstancedMesh(coinGeo, coinMat, FACE.COLS * FACE.COL_MAX);
    this.potMesh.frustumCulled = false;
    s.add(this.potMesh);

    // the glass: a pane with one long highlight across it
    const gc = document.createElement('canvas'); gc.width = 256; gc.height = 256;
    const gg = gc.getContext('2d');
    const gr = gg.createLinearGradient(0, 0, 256, 256);
    gr.addColorStop(0.0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,.55)'); gr.addColorStop(0.56, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = gr; gg.fillRect(0, 0, 256, 256);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(69, 84),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending }));
    pane.position.set(3, 41, GLASS_Z); s.add(pane);

    // the crank, low on the right side of the case: a chrome hub and a black
    // handle that swings down as you pull
    this.leverPivot = new THREE.Group(); this.leverPivot.position.set(48.5, 6, 2); s.add(this.leverPivot);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.6, 20), chrome); hub.rotation.x = Math.PI / 2; this.leverPivot.add(hub);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 9, 1.2), chrome); arm.position.y = 4.5; this.leverPivot.add(arm);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 5, 14), new THREE.MeshPhongMaterial({ color: 0x151515, shininess: 90 }));
    knob.rotation.x = Math.PI / 2; knob.position.set(0, 9, 2.4); this.leverPivot.add(knob);

    // light: a warm bar lamp above, a cool fill from the window
    s.add(new THREE.HemisphereLight(0xfff0d8, 0x3a1a0c, 0.95));
    const key = new THREE.PointLight(0xffe2b0, 1.5, 0, 0); key.position.set(-20, 130, 90); s.add(key);
    const fill = new THREE.DirectionalLight(0xbfd4ff, 0.35); fill.position.set(60, 20, 60); s.add(fill);
  }

  // Everything that depends on the layout, in one group, so a part bolted on
  // mid-run (KUOPPA) is a rebuild of the face and nothing else.
  buildFace(L) {
    if (this.faceGroup) {
      this.scene.remove(this.faceGroup);
      this.faceGroup.traverse(o => { if (o.geometry && o.geometry !== this.segGeo) o.geometry.dispose(); if (o.material?.map) { o.material.map.dispose(); o.material.dispose(); } });
    }
    const s = this.faceGroup = new THREE.Group();
    this.scene.add(s);
    const { chrome, deflector, petal, mill } = this.mats;
    const fc = faceCanvas(L);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(fc.width / PPU, fc.height / PPU),
      new THREE.MeshLambertMaterial({ map: this.tex(fc) }));
    face.position.set(X0 + fc.width / PPU / 2, Y1 - fc.height / PPU / 2, 0); s.add(face);
    this.faceMat = face.material;

    // rails, windows, dividers and deflectors stand out of the face; a
    // tulip's petals are drawn in both states and shown by the pocket's state
    this.segGeo = this.segGeo ?? new THREE.BoxGeometry(1, 1, 1);
    const gold = this.mats.gold, lid = this.mats.lid;
    const kinds = { rail: chrome, guide: chrome, window: chrome, divider: chrome, kicker: chrome, lanefloor: chrome, wall: chrome, deflector, petal, frame: gold, stage: gold, lid };
    this.petals = [];
    for (const g of L.segs) {
      const m = kinds[g.kind]; if (!m) continue;
      const len = Math.hypot(g.bx - g.ax, g.by - g.ay);
      const b = new THREE.Mesh(this.segGeo, m);
      b.scale.set(len + 0.25, g.kind === 'deflector' ? 0.5 : g.kind === 'petal' || g.kind === 'lid' ? 0.55 : g.kind === 'frame' ? 0.7 : 0.3, PIN_LEN + 0.2);
      b.position.set((g.ax + g.bx) / 2, (g.ay + g.by) / 2, (PIN_LEN + 0.2) / 2);
      b.rotation.z = Math.atan2(g.by - g.ay, g.bx - g.ax);
      s.add(b);
      if (g.when) this.petals.push({ m: b, pocket: g.pocket, when: g.when });
      if (g.kind === 'petal' && g.pocket !== 'denchu') b.visible = false, b.userData.flower = true;
    }
    // the nails: one instanced mesh, chrome
    const pinGeo = new THREE.CylinderGeometry(FACE.PIN_R, FACE.PIN_R, PIN_LEN, 10);
    pinGeo.rotateX(Math.PI / 2); pinGeo.translate(0, 0, PIN_LEN / 2);
    const pins = new THREE.InstancedMesh(pinGeo, chrome, Math.max(1, L.pins.length));
    const m4 = new THREE.Matrix4();
    L.pins.forEach((p, i) => { m4.makeTranslation(p.x, p.y, 0); pins.setMatrixAt(i, m4); });
    s.add(pins);
    // windmills: a hub and four brass blades, turned by the physics
    this.mills = [];
    // windmills (風車): a plastic pinwheel on a pin, four hooked blades in
    // two colours, turned by the physics
    const blade = new THREE.Shape();
    blade.moveTo(0, 0); blade.lineTo(0.35, 0.25); blade.quadraticCurveTo(1.3, 1.1, 1.75, 0.2); blade.lineTo(0, 0);
    const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: 0.5, bevelEnabled: false });
    for (const w of L.windmills) {
      const g = new THREE.Group(); g.position.set(w.x, w.y, 0.5);
      for (let k = 0; k < 4; k++) {
        const b = new THREE.Mesh(bladeGeo, k % 2 ? mill : this.mats.petal);
        b.rotation.z = k * Math.PI / 2; g.add(b);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.6, 12), chrome); hub.rotation.x = Math.PI / 2; g.add(hub);
      s.add(g); this.mills.push({ g, w });
    }

    // a lamp behind each window (and the chucker) that lights when it pays
    this.lights = {};
    for (const p of L.pockets) {
      if (p.window == null && p.pay !== 'start') continue;
      const jack = p.pay === JACKPOT;
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(jack ? 7 : 5.4, jack ? 8 : 6.6),
        new THREE.MeshBasicMaterial({ color: jack ? 0xffe060 : p.pay === 'start' ? 0x80ffb0 : 0xfff0c0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.position.set(p.x, p.y - 2.4, 0.06); s.add(glow);
      this.lights[p.id] = glow.material;
    }
    // the ATTACKER (アタッカー): a red flap in a chrome frame across the right
    // half of the row, hinged at its bottom edge — shut, it lies flat on the
    // face; in 大当たり it tips out toward you and the lamps behind it run
    const att = L.byId.attacker;
    this.gate = null;
    if (att) {
      const hinge = new THREE.Group(); hinge.position.set(att.x, att.y - 1.8, 0.3); s.add(hinge);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(att.w, 2.2, 0.35), this.mats.petal);
      flap.position.set(0, 1.1, 0); hinge.add(flap);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(att.w + 0.6, 0.3, 0.6), chrome); rim.position.set(att.x, att.y - 1.8, 0.3); s.add(rim);
      const gm = new THREE.Mesh(new THREE.PlaneGeometry(att.w, 2.4),
        new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      gm.position.set(att.x, att.y - 0.7, 0.08); s.add(gm);
      this.gate = { m: gm.material, p: att, hinge, a: 0 };
    }
    // TULIPS (チューリップ): a red plastic flower round each tulip window, its
    // two petals hinged at the mouth — they swing open when the tulip is
    this.flowers = [];
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0); petalShape.quadraticCurveTo(-0.9, 1.4, -0.3, 2.9); petalShape.quadraticCurveTo(0.3, 2.2, 0.5, 0.4); petalShape.lineTo(0, 0);
    const petalGeo = new THREE.ExtrudeGeometry(petalShape, { depth: 0.5, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 });
    for (const p of L.pockets) {
      if (!p.tulip && !p.denchu) continue;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(p.w / 2 + 0.6, p.w / 2 + 0.3, 1.2, 16, 1, true), this.mats.petal);
      cup.position.set(p.x, p.y - p.depth - 0.2, 0.8); cup.scale.z = 0.5; s.add(cup);
      const pair = [];
      for (const side of [-1, 1]) {
        const h = new THREE.Group(); h.position.set(p.x + side * p.w / 2, p.y - 0.6, 1.3); s.add(h);
        const m = new THREE.Mesh(petalGeo, this.mats.petal); m.scale.set(-side, 1, 1); h.add(m);
        pair.push({ h, side });
      }
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), new THREE.MeshBasicMaterial({ color: 0xffe060, transparent: true, opacity: 0.2 }));
      lamp.position.set(p.x, p.y - p.depth - 0.8, 1.45); s.add(lamp);
      this.flowers.push({ p, pair, lamp, a: 0 });
    }
    // the LCD (液晶) in the middle of the yakumono, when the heso is on
    this.lcdMesh = null;
    if (L.byId.start && this.lcdTexture) {
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.4), new THREE.MeshBasicMaterial({ map: this.lcdTexture, toneMapped: false }));
      scr.position.set(1.5, 68.9, 0.06); s.add(scr);
      this.lcdMesh = scr;
    }
  }

  setLayout(L) { this.L = L; this.buildFace(L); this.shown = null; }

  // The HUD tells the view what it covers; the view fits the machine into the rest.
  setInsets(top, bottom, right = 0, left = 0) {
    const i = this.insets;
    if (Math.abs(i.top - top) + Math.abs(i.bottom - bottom) + Math.abs(i.right - right) + Math.abs(i.left - left) < 2) return;
    this.insets = { top, bottom, right, left };
    this.fit(true);
  }

  resize() {
    const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.W = w; this.H = h;
    this.fit(true);
  }

  // Solve for a camera distance and position that put a region of the world
  // (x0..x1, y0..y1 at z = 0) inside the free band of the screen.
  solve(x0, x1, y0, y1) {
    const { W, H } = this, i = this.insets;
    const bandW = Math.max(60, W - i.left - i.right), bandH = Math.max(60, H - i.top - i.bottom);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dH = ((y1 - y0) * H / bandH) / (2 * tan);
    const dW = ((x1 - x0) * W / bandW) / (2 * tan * this.camera.aspect);
    const d = Math.max(dH, dW);
    const perPx = (2 * d * tan) / H;
    const bx = (i.left + bandW / 2) - W / 2, by = (i.top + bandH / 2) - H / 2;
    return { x: (x0 + x1) / 2 - bx * perPx, y: (y0 + y1) / 2 + by * perPx, d };
  }

  fit(snap = false) {
    // the whole machine. Upright, the FACE is fitted to the phone's width
    // (the 1 mk plate and the crank run off the right edge: the face is the
    // game); on a wide screen, the case, the bottles and the crank.
    this.tall = this.W / this.H < 1.1;
    const whole = this.tall ? this.solve(-32.5, 32, -6, 92) : this.solve(-38, 52, -12, 106);
    Object.assign(this.cam, { tx: whole.x, ty: whole.y, td: whole.d });
    this.whole = whole;
    if (snap) Object.assign(this.cam, { x: whole.x, y: whole.y, d: whole.d });
  }

  pop(id) { this.flash[id] = 1.4; }

  // a coin in a window sits there a moment, lit, before the machine takes it
  catch(x, y) {
    const m = new THREE.Mesh(this.coinGeo, this.coinMat);
    m.position.set(x, y - FACE.WIN_D + FACE.COIN_R + 0.1, COIN_Z);
    this.scene.add(m);
    this.caught.push({ m, t: 1.1 });
  }

  // coins dropping into the tray: the payout, as something you watch
  payout(n, from = null) {
    for (let k = 0; k < Math.min(n, 30); k++) {
      const m = new THREE.Mesh(this.coinGeo, this.coinMat);
      const p = from?.[k] ?? { x: -6 + Math.random() * 16, y: 2, z: 7 };
      m.position.set(p.x, p.y, p.z ?? 7);
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.scene.add(m);
      this.drops.push({ m, t: from ? -k * 0.02 : -k * 0.08, vx: (Math.random() - 0.5) * 8, vy: from ? 0 : 3 + Math.random() * 4, vz: from ? 5 : 0, rest: false });
    }
  }
  clearTray() { for (const d of this.drops) this.scene.remove(d.m); this.drops.length = 0; }

  // where the j-th coin of column k stands
  stackAt(k, j) {
    const col = this.L.columns[k];
    return { x: col.x + ((j % 2) ? 0.18 : -0.18), y: FACE.COIN_R + 0.3 + j * FACE.STACK, z: 0.5 + j * 0.02 };
  }

  // a coin that missed every window drops down its column onto the pile
  toPot(k, height) {
    const col = this.L.columns[k];
    if (!col) return;
    this.pending[k]++;
    const m = new THREE.Mesh(this.coinGeo, this.coinMat);
    m.position.set(col.x, FACE.COL_TOP, COIN_Z);
    this.scene.add(m);
    this.falls.push({ m, k, to: this.stackAt(k, Math.max(0, height - 1)).y, v: 0 });
  }

  drawPot(pot) {
    const m4 = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    let i = 0;
    for (let k = 0; k < FACE.COLS; k++) {
      const n = Math.max(0, pot[k] - this.pending[k]);
      for (let j = 0; j < FACE.COL_MAX; j++, i++) {
        if (j < n) { const p = this.stackAt(k, j); m4.makeTranslation(p.x, p.y, p.z); this.potMesh.setMatrixAt(i, m4); }
        else this.potMesh.setMatrixAt(i, zero);
      }
    }
    this.potMesh.instanceMatrix.needsUpdate = true;
  }

  update(game, dt, time) {
    const c = game.board.coins[0];
    this.follow += ((c ? 1 : 0) - this.follow) * Math.min(1, dt * (c ? 2.2 : 1.4));
    const w = this.whole;
    let tx = w.x, ty = w.y, td = w.d;
    if (this.follow > 0.001) {
      // the close shot: half the face, centred on the coin but never past the
      // edge of the machine
      const cx = c ? c.x : this.lastX ?? 0, cy = c ? c.y : this.lastY ?? 40;
      if (c) { this.lastX = cx; this.lastY = cy; }
      const halfW = this.tall ? 15.5 : 22, halfH = halfW * 1.25;
      const x = Math.max(-31 + halfW, Math.min(31 - halfW, cx));
      const y = Math.max(-2 + halfH, Math.min(84 - halfH, cy));
      const close = this.solve(x - halfW, x + halfW, y - halfH, y + halfH);
      const k = this.follow * this.zoom;
      tx = w.x + (close.x - w.x) * k; ty = w.y + (close.y - w.y) * k; td = w.d + (close.d - w.d) * k;
    }
    // a FOCUS (KUOPPA's REACH) pulls the camera onto one thing, over the follow
    this.focusK = (this.focusK ?? 0) + ((this.focus ? 1 : 0) - (this.focusK ?? 0)) * Math.min(1, dt * 3);
    if (this.focus) this.lastFocus = this.focus;
    if (this.focusK > 0.001 && this.lastFocus) {
      const f = this.lastFocus, hw = this.tall ? f.halfW : f.halfW * 1.4;
      const cl = this.solve(f.x - hw, f.x + hw, f.y - hw * 0.9, f.y + hw * 0.9);
      tx += (cl.x - tx) * this.focusK; ty += (cl.y - ty) * this.focusK; td += (cl.d - td) * this.focusK;
    }
    const ease = Math.min(1, dt * 4);
    this.cam.x += (tx - this.cam.x) * ease; this.cam.y += (ty - this.cam.y) * ease; this.cam.d += (td - this.cam.d) * ease;
    this.camera.position.set(this.cam.x, this.cam.y, this.cam.d);
    this.camera.lookAt(this.cam.x, this.cam.y, 0);

    if (c) {
      this.coin.visible = this.coinShadow.visible = true;
      this.coin.position.set(c.x, c.y, COIN_Z);
      this.coin.rotation.z = c.spin;
      this.coinShadow.position.set(c.x + 0.35, c.y - 0.45, 0.02);
    } else this.coin.visible = this.coinShadow.visible = false;

    // the pot: coins the POTTI took spill out of their columns into the tray
    const pot = game.pot;
    if (this.shown) {
      const spill = [];
      for (let k = 0; k < pot.length; k++) for (let j = pot[k]; j < this.shown[k]; j++) spill.push(this.stackAt(k, j));
      if (spill.length) this.payout(spill.length, spill);
    }
    this.shown = [...pot];
    for (let i = this.falls.length - 1; i >= 0; i--) {
      const f = this.falls[i];
      f.v += 160 * dt; f.m.position.y -= f.v * dt;
      if (f.m.position.y <= f.to) { this.scene.remove(f.m); this.pending[f.k] = Math.max(0, this.pending[f.k] - 1); this.falls.splice(i, 1); }
    }
    this.drawPot(pot);
    for (let i = this.caught.length - 1; i >= 0; i--) {
      const q = this.caught[i]; q.t -= dt;
      if (q.t <= 0) { this.scene.remove(q.m); this.caught.splice(i, 1); }
    }

    for (const p of this.petals) p.m.visible = !p.m.userData.flower && (p.when === 'open') === !!game.L.byId[p.pocket]?.open;
    for (const { g, w } of this.mills) g.rotation.z = w.a;
    if (this.gate) {
      const g = this.gate, want = g.p.open ? 1 : 0;
      g.a += (want - g.a) * Math.min(1, dt * 8);
      g.hinge.rotation.x = g.a * 1.1;
      g.m.opacity = g.p.open ? 0.22 + 0.25 * Math.abs(Math.sin(time * 8)) : 0;
    }
    for (const f of this.flowers) {
      const want = f.p.open ? 1 : 0;
      f.a += (want - f.a) * Math.min(1, dt * 10);
      for (const { h, side } of f.pair) h.rotation.z = side * (0.15 + f.a * 0.75);
      f.lamp.material.opacity = f.p.open ? 0.6 + 0.4 * Math.abs(Math.sin(time * 10)) : 0.18;
    }
    for (const [id, m] of Object.entries(this.lights)) {
      const f = this.flash[id] ?? 0;
      m.opacity = f > 0 ? 0.3 + 0.35 * Math.abs(Math.sin(time * 14)) * Math.min(1, f) : 0;
      if (f > 0) this.flash[id] = f - dt;
    }

    this.leverPivot.rotation.z = -this.lever * 1.1;

    // coins in the tray
    for (const d of this.drops) {
      d.t += dt; if (d.t < 0 || d.rest) continue;
      d.vy -= 90 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt;
      d.m.position.z = Math.min(9, d.m.position.z + (d.vz ?? 0) * dt);
      d.m.rotation.x += dt * 9; d.m.rotation.y += dt * 5;
      d.m.position.x = Math.max(-16, Math.min(20, d.m.position.x));
      if (d.m.position.y < this.trayY) {
        d.m.position.y = this.trayY; d.vy = -d.vy * 0.25; d.vx *= 0.5;
        if (Math.abs(d.vy) < 3) { d.rest = true; d.m.position.z = 7 + Math.random() * 2; d.m.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.3, 0, Math.random() * 6); }
      }
    }
    while (this.drops.length > 60) this.scene.remove(this.drops.shift().m);
  }

  get zoom() { return this._zoom ?? 1; }
  set zoom(z) { this._zoom = z; }

  toScreen(x, y, z = COIN_Z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return [(v.x * 0.5 + 0.5) * this.W, (-v.y * 0.5 + 0.5) * this.H];
  }

  coinPx(x = 0, y = 40) {
    const [ax] = this.toScreen(x - FACE.COIN_R, y), [bx] = this.toScreen(x + FACE.COIN_R, y);
    return Math.abs(bx - ax);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
