// The arena: a park bench, seen from the side, with the painted park out of
// focus behind it. The bench seat is the play area — puppets stand on it at
// y = 0 — with a granite block at one end and a statue base at the other,
// both in the sharp band, so the diorama has depth where the eye is and none
// where it is not.
//
// One camera rule for two formats: fit the ACTION WIDTH, not the bench. In
// landscape that is a comfortable side view; in portrait the same width is
// fitted to a narrow frame and the bench is pushed up the screen (the hand
// takes the bottom), so both formats show every puppet at a readable size.

import * as THREE from 'three';
import { paintedPark, paintForeground, fromImage } from './bg.js';

// how far behind the bench the painting hangs
const BG_Z = -14;
// and how far in FRONT of it the out-of-focus foreground sits
const FG_Z = 2.6;

export class Arena {
  constructor(canvas, theme) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.puppets = [];
    this.portrait = false;
    this.shake = 0;
    this._v = new THREE.Vector3();

    const hemi = new THREE.HemisphereLight('#dff0ff', '#6a8a4a', 1.1);
    const sun = new THREE.DirectionalLight('#fff4d8', 1.6);
    sun.position.set(-4, 6, 5);
    this.scene.add(hemi, sun);

    this.setTheme(theme);
    this.buildBench(theme);
  }

  setTheme(theme) {
    this.theme = theme;
    if (this.bg) this.scene.remove(this.bg);
    this.focus = this.focus ?? 0.6;
    this.photo = false;
    const tex = paintedPark(theme, 3, this.focus);
    this.bgMat = new THREE.MeshBasicMaterial({ map: tex });
    // a plane far enough back to sit behind everything, sized to fill the frame
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.bgMat);
    this.bg.position.set(0, 0, BG_Z);
    this.scene.add(this.bg);
    if (this.fg) this.scene.remove(this.fg);
    this.fg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: paintForeground(theme), transparent: true, depthWrite: false }));
    this.fg.position.z = FG_Z;
    this.scene.add(this.fg);
    this.fitFrame();
    if (this.bench) { this.scene.remove(this.bench); this.buildBench(theme); }
  }

  // the seam for a photograph — `?bg=<url>[&stereo=sbs&eye=right]`
  async setPhoto(url, opts) {
    const tex = await fromImage(url, { focus: this.focus, ...opts });
    this.bgMat.map = tex; this.bgMat.needsUpdate = true;
    this.photo = true;      // a plate is not repainted when the frame changes
  }

  buildBench(theme) {
    const p = theme.park;
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: p.bench });
    const woodDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.bench).multiplyScalar(0.7) });
    const iron = new THREE.MeshLambertMaterial({ color: p.iron });
    const stone = new THREE.MeshLambertMaterial({ color: p.stone });
    const stoneDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.stone).multiplyScalar(0.8) });

    const L = 8.2;
    // seat: three slats, the play surface at y = 0
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, 0.3), i === 1 ? woodDark : wood);
      slat.position.set(0, -0.04, -0.34 + i * 0.34);
      g.add(slat);
    }
    // backrest, two slats, leaning
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(L, 0.2, 0.06), i ? wood : woodDark);
      s.position.set(0, 0.22 + i * 0.28, -0.72 - i * 0.05);
      s.rotation.x = -0.14;
      g.add(s);
    }
    // cast-iron ends: an arm, a leg, and a foot each side
    for (const x of [-L / 2 + 0.35, L / 2 - 0.35]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.7), iron); leg.position.set(x, -0.55, -0.05); g.add(leg);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.8), iron); arm.position.set(x, 0.3, -0.2); g.add(arm);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), iron); post.position.set(x, 0.16, 0.16); g.add(post);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.1), iron); back.position.set(x, 0.3, -0.7); back.rotation.x = -0.14; g.add(back);
    }
    // The ground is a thin band, not a floor: the camera sits nearly level
    // with the seat, so anything much beyond the bench would only cover the
    // painting that is doing the work behind it.
    // Only what the bench actually stands on is real geometry. Everything
    // further out is the painting, which is blurred; a wide 3D lawn is a sharp
    // slab across the bottom of the frame and undoes the miniature look.
    const gravel = new THREE.Mesh(new THREE.PlaneGeometry(24, 1.7), new THREE.MeshLambertMaterial({ color: p.path }));
    gravel.rotation.x = -Math.PI / 2; gravel.position.set(0, -1.06, 0.15); g.add(gravel);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(30, 3.4), new THREE.MeshLambertMaterial({ color: p.grass }));
    grass.rotation.x = -Math.PI / 2; grass.position.set(0, -1.08, -2.2); g.add(grass);

    // The stone furniture stands OUTSIDE the bench, left and right, so it
    // frames the action instead of standing behind it: a boulder at one end,
    // a statue base at the other. Both are cropped by the frame in landscape,
    // which is what makes them read as near rather than as scenery.
    const rock = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 1.7), stone);
    rock.position.set(-5.6, -0.45, -1.5); rock.rotation.y = 0.35; rock.rotation.z = 0.05; g.add(rock);
    const rock2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.2), stoneDark);
    rock2.position.set(-4.6, -0.75, -1.0); rock2.rotation.y = -0.3; g.add(rock2);
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 2.2), stoneDark); step.position.set(5.6, -0.95, -1.6); g.add(step);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 1.5), stone); plinth.position.set(5.6, -0.1, -1.6); g.add(plinth);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.8), stoneDark); cap.position.set(5.6, 0.68, -1.6); g.add(cap);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.2, 14), stone); column.position.set(5.6, 1.36, -1.6); g.add(column);
    // a few loose granite setts on the gravel, for scale
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), i % 2 ? stone : stoneDark);
      s.position.set(-5 + i * 2.6, -0.98, -0.6 - (i % 3) * 0.35); s.rotation.y = i * 0.7; g.add(s);
    }
    this.bench = g;
    this.scene.add(g);
  }

  add(puppet) { this.puppets.push(puppet); this.scene.add(puppet.group, puppet.shadow); }
  clearPuppets() { for (const p of this.puppets) { this.scene.remove(p.group, p.shadow); } this.puppets = []; }

  // Fit the action width to the frame, from a seat nearly LEVEL with the
  // bench — the owner asked for a side view, and a raised camera turns the
  // lawn into a floor that covers the picture doing all the work behind it.
  // Landscape reads the whole bench; portrait fits a narrower action width
  // (the puppets stand closer together) and lifts the bench up the screen,
  // because the bottom of a phone belongs to the hand.
  resize(w, h, actionWidth = 6.6) {
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.portrait = aspect < 1;
    const cam = this.camera;
    cam.aspect = aspect;
    cam.fov = this.portrait ? 46 : 38;
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const width = this.portrait ? actionWidth * 0.62 : actionWidth;
    const dist = (width / 2 + 0.5) / Math.tan(hfov / 2);
    // Flatter in portrait: a phone has no room for a floor, and every degree
    // of downward tilt trades sky and canopy for lawn nobody plays on.
    const lookY = this.portrait ? 0.35 : 0.3;
    cam.position.set(0, this.portrait ? 1.0 : 1.25, dist);
    cam.lookAt(0, lookY, 0);
    cam.updateProjectionMatrix();
    this.baseCam = cam.position.clone();
    this.lookY = lookY;
    this.actionWidth = width;
    this.fitFrame();
  }

  // The painted park fills the frame exactly at its own distance, so the
  // photograph seam gets the same treatment: a plate is never letterboxed and
  // never cropped by a plane that happens to be the wrong size.
  fitFrame() {
    if (!this.bg) return;
    const cam = this.camera;
    const d = cam.position.z - BG_Z;
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * d;
    const vw = vh * cam.aspect;
    this.bg.scale.set(vw * 1.04, vh * 1.04, 1);
    // centred on the camera's line of sight where it crosses the plane, or a
    // tilted camera hangs the painting off the top of the frame
    const t = d / cam.position.z;
    this.bg.position.y = cam.position.y + ((this.lookY ?? 0) - cam.position.y) * t;

    // The sharp band follows the bench up and down the frame. Repainting is a
    // blur pass over one 1280×720 canvas, so it is done only when the row has
    // actually moved — a resize drag must not repaint on every pixel.
    const row = this.benchRow();
    if (!this.photo && Math.abs(row - this.focus) > 0.04) {
      this.focus = Math.max(0.2, Math.min(0.85, row));
      this.bgMat.map = paintedPark(this.theme, 3, this.focus);
      this.bgMat.needsUpdate = true;
    }

    // the near band, hung off the BOTTOM edge of the frame at its own distance
    const fd = cam.position.z - FG_Z;
    const fh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * fd;
    const fw = fh * cam.aspect;
    const centre = cam.position.y + ((this.lookY ?? 0) - cam.position.y) * (fd / cam.position.z);
    const band = this.portrait ? 0.42 : 0.3;
    this.fg.scale.set(fw * 1.05, fh * band, 1);
    this.fg.position.set(0, centre - fh * 0.5 + fh * band * 0.46, FG_Z);
  }

  // where the seat sits, as a fraction down the frame
  benchRow() {
    const p = this._v.set(0, 0.5, 0).project(this.camera);
    return (1 - p.y) / 2;
  }

  // world → CSS pixels, for the labels that hang over the puppets
  project(v, w, h) {
    const p = this._v.copy(v).project(this.camera);
    return { x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h, behind: p.z > 1 };
  }

  kick(n = 1) { this.shake = Math.min(1, this.shake + n * 0.5); }

  update(dt) {
    for (const p of this.puppets) p.update(dt);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.4);
      const s = this.shake * this.shake * 0.12;
      this.camera.position.set(this.baseCam.x + (Math.random() - 0.5) * s, this.baseCam.y + (Math.random() - 0.5) * s, this.baseCam.z);
      this.camera.lookAt(0, this.lookY, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
