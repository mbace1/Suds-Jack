// The machine on a kiosk wall, and the camera that sits CLOSE to it.
//
// The owner's first note on v1 was "the mobile view should be much closer",
// so the camera here solves for the face, not the room: it fits the machine
// into whatever band the HUD leaves free, and while a coin is on the face it
// leans in and follows it. World units are board units, straight: x across,
// y up, the face at z = 0 and everything that stands out of it at z > 0.

import * as THREE from 'three';
import { faceCanvas, coinCanvas, signCanvas, wallCanvas, PPU } from './art.js?v=2';
import { FACE, JACKPOT } from './layout.js?v=2';

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
    this.scene.background = new THREE.Color(0x120b07);
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
    this.insets = { top: 60, bottom: 60, right: 0, left: 0 };
    this.cam = { x: 0, y: 40, d: 200, tx: 0, ty: 40, td: 200 };
    this.follow = 0;             // 0 = the whole machine, 1 = leaning in on the coin
    this.flash = {};             // cup id -> seconds of light left
    this.drops = [];             // coins falling into the tray, for the eye only
    this.lever = 0;              // 0..1, how far the handle is down
    this.build();
    this.resize();
  }

  build() {
    const s = this.scene, L = this.L;
    const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

    // the wall
    const wt = tex(wallCanvas()); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(5, 4);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(500, 400), new THREE.MeshLambertMaterial({ map: wt }));
    wall.position.set(0, 40, -9); s.add(wall);

    // the face
    const fc = faceCanvas(L);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(fc.width / PPU, fc.height / PPU),
      new THREE.MeshLambertMaterial({ map: tex(fc) }));
    face.position.set(-31 + fc.width / PPU / 2, 82 - fc.height / PPU / 2, 0); s.add(face);
    this.faceMat = face.material;

    // the cabinet: varnished wood round the face, a header with the sign, a
    // tray below
    const wood = new THREE.MeshPhongMaterial({ color: 0x5a2c14, shininess: 60, specular: 0x3a2412 });
    const dark = new THREE.MeshPhongMaterial({ color: 0x2a140a, shininess: 30 });
    const chrome = new THREE.MeshPhongMaterial({ color: 0xd8dde4, shininess: 120, specular: 0xffffff });
    this.chrome = chrome;
    const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); s.add(b); return b; };
    box(5, 102, 7, -33.5, 36, 1.5, wood); box(5, 102, 7, 33.5, 36, 1.5, wood);   // sides
    box(72, 5, 7, 0, 84.5, 1.5, wood);                                            // top of the face
    box(72, 16, 9, 0, 95, 2.5, wood);                                              // header
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(64, 12), new THREE.MeshBasicMaterial({ map: tex(signCanvas()) }));
    sign.position.set(0, 95, 7.05); s.add(sign);
    this.signMat = sign.material;
    box(72, 16, 12, 0, -9, 4, wood);                                              // the lower cabinet
    box(50, 6, 8, 0, -4.5, 10, dark);                                              // the tray
    box(51, 1, 8.5, 0, -1.3, 10, chrome);                                          // its lip
    this.trayY = -1.8;
    // the coin slot, top right, with its chrome plate
    box(7, 3.4, 1, 26, 90, 7.4, chrome);
    box(4, 0.6, 1.2, 26, 90, 7.8, dark);

    // the rails and walls stand out of the face: one box per segment
    const brass = new THREE.MeshPhongMaterial({ color: 0xcaa24a, shininess: 90, specular: 0xfff0b0 });
    const segGeo = new THREE.BoxGeometry(1, 1, 1);
    const kinds = { rail: chrome, guide: chrome, cup: brass, kicker: brass, divider: brass, lanefloor: chrome };
    for (const g of L.segs) {
      const m = kinds[g.kind]; if (!m) continue;
      const len = Math.hypot(g.bx - g.ax, g.by - g.ay);
      const b = new THREE.Mesh(segGeo, m);
      b.scale.set(len + 0.25, g.kind === 'rail' || g.kind === 'guide' ? 0.35 : 0.3, PIN_LEN + 0.2);
      b.position.set((g.ax + g.bx) / 2, (g.ay + g.by) / 2, (PIN_LEN + 0.2) / 2);
      b.rotation.z = Math.atan2(g.by - g.ay, g.bx - g.ax);
      s.add(b);
    }
    // the nails: one instanced mesh, brass, heads catching the lamp
    const pinGeo = new THREE.CylinderGeometry(FACE.PIN_R, FACE.PIN_R, PIN_LEN, 10);
    pinGeo.rotateX(Math.PI / 2); pinGeo.translate(0, 0, PIN_LEN / 2);
    const pins = new THREE.InstancedMesh(pinGeo, brass, L.pins.length);
    const m4 = new THREE.Matrix4();
    L.pins.forEach((p, i) => { m4.makeTranslation(p.x, p.y, 0); pins.setMatrixAt(i, m4); });
    s.add(pins);

    // a lamp behind each cup's plaque that lights when it pays
    this.cupLights = {};
    for (const p of L.pockets) {
      const glow = new THREE.Mesh(new THREE.CircleGeometry(p.pay === JACKPOT ? 4.2 : 3.2, 24),
        new THREE.MeshBasicMaterial({ color: p.pay === JACKPOT ? 0xffe060 : 0xffc070, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.position.set(p.x, p.y - p.depth + 0.8, 0.05); s.add(glow);
      this.cupLights[p.id] = glow.material;
    }

    // the coin
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
    // a soft shadow on the enamel under the coin
    this.coinShadow = new THREE.Mesh(new THREE.CircleGeometry(r * 1.05, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    this.coinShadow.visible = false; s.add(this.coinShadow);

    // the glass: a pane with one long highlight across it
    const gc = document.createElement('canvas'); gc.width = 256; gc.height = 256;
    const gg = gc.getContext('2d');
    const gr = gg.createLinearGradient(0, 0, 256, 256);
    gr.addColorStop(0.0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,.55)'); gr.addColorStop(0.56, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = gr; gg.fillRect(0, 0, 256, 256);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(62, 86),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
    glass.position.set(0, 40, GLASS_Z); s.add(glass);

    // the lever, out on the right of the cabinet: a chrome arm and a red knob
    this.leverPivot = new THREE.Group(); this.leverPivot.position.set(37, 8, 3); s.add(this.leverPivot);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 14, 12), chrome); arm.position.y = 7; this.leverPivot.add(arm);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14), new THREE.MeshPhongMaterial({ color: 0xd4182c, shininess: 110, specular: 0xffffff }));
    knob.position.y = 14.5; this.leverPivot.add(knob);
    box(4, 6, 4, 36, 8, 2, chrome);

    // light: a warm kiosk lamp above, a cool fill
    s.add(new THREE.HemisphereLight(0xfff0d8, 0x2a160c, 0.9));
    const key = new THREE.PointLight(0xffe2b0, 1.6, 0, 0); key.position.set(-20, 120, 90); s.add(key);
    const fill = new THREE.DirectionalLight(0xbfd4ff, 0.35); fill.position.set(40, 20, 60); s.add(fill);
  }

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
    // world height visible at distance d is 2 d tan; the region must fill at
    // most the band's share of it in both directions
    const dH = ((y1 - y0) * H / bandH) / (2 * tan);
    const dW = ((x1 - x0) * W / bandW) / (2 * tan * this.camera.aspect);
    const d = Math.max(dH, dW);
    // shift the camera so the region's middle lands on the band's middle
    const perPx = (2 * d * tan) / H;
    const bx = (i.left + bandW / 2) - W / 2, by = (i.top + bandH / 2) - H / 2;
    return { x: (x0 + x1) / 2 - bx * perPx, y: (y0 + y1) / 2 + by * perPx, d };
  }

  fit(snap = false) {
    // the whole machine: face, header and tray (and on a wide screen the
    // lever on the right). Upright, the face is fitted to the phone's WIDTH
    // and the sign may sit under the coin count: a phone is narrow, and the
    // face is the game.
    this.tall = this.W / this.H < 1.1;
    const whole = this.tall ? this.solve(-33.5, 33.5, -6, 104) : this.solve(-37, 41, -12, 102);
    Object.assign(this.cam, { tx: whole.x, ty: whole.y, td: whole.d });
    this.whole = whole;
    if (snap) Object.assign(this.cam, { x: whole.x, y: whole.y, d: whole.d });
  }

  pop(id) { this.flash[id] = 1.4; }

  // coins dropping into the tray: the payout, as something you watch
  payout(n) {
    for (let k = 0; k < Math.min(n, 24); k++) {
      const m = new THREE.Mesh(this.coinGeo, this.coinMat);
      m.position.set(20 + Math.random() * 3, 4, 9);
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.scene.add(m);
      this.drops.push({ m, t: -k * 0.09, vx: -8 - Math.random() * 14, vy: 4 + Math.random() * 6, rest: false });
    }
  }
  clearTray() { for (const d of this.drops) this.scene.remove(d.m); this.drops.length = 0; }

  update(game, dt, time) {
    const c = game.board.coins[0];
    // lean in while a coin is on the face; ease back out when it is done
    this.follow += ((c ? 1 : 0) - this.follow) * Math.min(1, dt * (c ? 2.2 : 1.4));
    const w = this.whole;
    let tx = w.x, ty = w.y, td = w.d;
    if (this.follow > 0.001) {
      // the close shot: two thirds of the face, centred on the coin but never
      // past the edge of the machine
      const cx = c ? c.x : this.lastX ?? 0, cy = c ? c.y : this.lastY ?? 40;
      if (c) { this.lastX = cx; this.lastY = cy; }
      const halfW = this.tall ? 15.5 : 22, halfH = halfW * 1.25;
      const x = Math.max(-31 + halfW, Math.min(31 - halfW, cx));
      const y = Math.max(-2 + halfH, Math.min(84 - halfH, cy));
      const close = this.solve(x - halfW, x + halfW, y - halfH, y + halfH);
      const k = this.follow * this.zoom;
      tx = w.x + (close.x - w.x) * k; ty = w.y + (close.y - w.y) * k; td = w.d + (close.d - w.d) * k;
    }
    const ease = Math.min(1, dt * 4);
    this.cam.x += (tx - this.cam.x) * ease; this.cam.y += (ty - this.cam.y) * ease; this.cam.d += (td - this.cam.d) * ease;
    this.camera.position.set(this.cam.x, this.cam.y, this.cam.d);
    this.camera.lookAt(this.cam.x, this.cam.y, 0);

    // the coin
    if (c) {
      this.coin.visible = this.coinShadow.visible = true;
      this.coin.position.set(c.x, c.y, COIN_Z);
      this.coin.rotation.z = c.spin;
      this.coinShadow.position.set(c.x + 0.35, c.y - 0.45, 0.02);
    } else this.coin.visible = this.coinShadow.visible = false;

    // lamps
    for (const [id, m] of Object.entries(this.cupLights)) {
      const f = this.flash[id] ?? 0;
      m.opacity = f > 0 ? 0.35 + 0.35 * Math.abs(Math.sin(time * 14)) * Math.min(1, f) : 0;
      if (f > 0) this.flash[id] = f - dt;
    }

    // the lever follows the hand
    this.leverPivot.rotation.z = -this.lever * 0.9;

    // coins in the tray
    for (const d of this.drops) {
      d.t += dt; if (d.t < 0 || d.rest) continue;
      d.vy -= 90 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt;
      d.m.rotation.x += dt * 9; d.m.rotation.y += dt * 5;
      if (d.m.position.x < -22) { d.m.position.x = -22; d.vx = Math.abs(d.vx) * 0.3; }
      if (d.m.position.y < this.trayY) {
        d.m.position.y = this.trayY; d.vy = -d.vy * 0.25; d.vx *= 0.5;
        if (Math.abs(d.vy) < 3) { d.rest = true; d.m.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.3, 0, Math.random() * 6); }
      }
    }
    // a tray holds a handful; the oldest go into the player's pocket
    while (this.drops.length > 40) this.scene.remove(this.drops.shift().m);
  }

  get zoom() { return this._zoom ?? 1; }
  set zoom(z) { this._zoom = z; }

  // where a board point is on the screen, for the floating numbers
  toScreen(x, y, z = COIN_Z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return [(v.x * 0.5 + 0.5) * this.W, (-v.y * 0.5 + 0.5) * this.H];
  }

  // how big a coin is on the screen right now, in CSS pixels
  coinPx(x = 0, y = 40) {
    const [ax] = this.toScreen(x - FACE.COIN_R, y), [bx] = this.toScreen(x + FACE.COIN_R, y);
    return Math.abs(bx - ax);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
