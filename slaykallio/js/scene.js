// The arena: a THICK WOODEN BRIDGE over a Kallio canal, seen from the side,
// close in, with the park out of focus behind it.
//
// Owner's direction, 2026-09-04: a thick wooden bridge, no back panels
// blocking the view, much closer to the characters, gritty. That is three
// instructions and they are all answered here:
//
//   1. THE DECK IS THE PLAY AREA and nothing stands behind it. The bench this
//      replaced had a backrest, and a backrest crosses a standing figure at
//      the chest — every puppet was cut in half by a slat. A bridge carries
//      its structure UNDERNEATH, which is the whole reason it is a better
//      board: beams, braces and piles take the eye down into the water
//      instead of putting a fence across the fight.
//   2. THE CAMERA IS ON THE OTHER SIDE, looking along the deck from the open
//      side, so what stands between you and the puppets is one handrail post
//      at each end of the frame and nothing else.
//   3. CLOSE. The action width is small enough that a puppet is a real part
//      of the picture rather than a chess piece on a table.
//
// Everything is weathered: no two planks are the same tone, the ironwork is
// rusted, and nothing in the set is bright except what the game paints on top.

import * as THREE from 'three';
import { paintedPark, paintForeground, fromImage } from './bg.js';

// how far behind the deck the painting hangs, and how far in front of it the
// out-of-focus foreground sits
const BG_Z = -14;
const FG_Z = 2.4;

// ── the timber ──────────────────────────────────────────────────────────
// Per-plank tone alone left the deck reading as flat brown bands, which is the
// opposite of what "thick wooden bridge, gritty" asks for. Real boards have
// grain running their length, knots, split ends and stains, and none of that
// survives as a colour value — so the wood is a drawn texture, painted once and
// shared by every plank, with each board still tinted its own tone on top.
// Grain runs along V, which on these boxes is the depth axis: the direction the
// boards actually run.
let WOOD = null;
function woodTexture() {
  if (WOOD) return WOOD;
  const w = 64, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  let s = 12345;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  ctx.fillStyle = '#b18f68'; ctx.fillRect(0, 0, w, h);
  // grain: long wandering lines down the board, dark and light
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w;
    ctx.strokeStyle = rnd() > 0.45 ? `rgba(80,58,36,${0.06 + rnd() * 0.22})` : `rgba(228,205,170,${0.05 + rnd() * 0.14})`;
    ctx.lineWidth = 0.6 + rnd() * 2.2;
    ctx.beginPath(); ctx.moveTo(x, -4);
    for (let y = 0; y < h + 8; y += 16) ctx.lineTo(x + Math.sin(y * 0.05 + i) * 2.5 + (rnd() - 0.5) * 2, y);
    ctx.stroke();
  }
  // a knot or two, with the grain bending round them
  for (let i = 0; i < 2; i++) {
    const kx = 8 + rnd() * (w - 16), ky = 30 + rnd() * (h - 60);
    for (let r = 9; r > 0; r -= 1.4) {
      ctx.strokeStyle = `rgba(66,44,26,${0.5 - r * 0.04})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(kx, ky, r * 0.6, r, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(48,32,18,0.75)';
    ctx.beginPath(); ctx.ellipse(kx, ky, 2.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  // splits at the ends, where a board has been walked on for years
  for (let i = 0; i < 5; i++) {
    const x = rnd() * w, top = rnd() > 0.5;
    ctx.strokeStyle = 'rgba(40,28,16,0.5)'; ctx.lineWidth = 0.8 + rnd();
    ctx.beginPath(); ctx.moveTo(x, top ? 0 : h);
    ctx.lineTo(x + (rnd() - 0.5) * 5, top ? 10 + rnd() * 24 : h - 10 - rnd() * 24); ctx.stroke();
  }
  // stains, and the wear that lightens the middle where boots land
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 7; i++) { ctx.fillStyle = rnd() > 0.5 ? '#3a2a16' : '#5a5240'; ctx.beginPath(); ctx.ellipse(rnd() * w, rnd() * h, 5 + rnd() * 14, 8 + rnd() * 26, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  const wear = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.7);
  wear.addColorStop(0, 'rgba(255,238,206,0)'); wear.addColorStop(0.5, 'rgba(255,238,206,0.16)'); wear.addColorStop(1, 'rgba(255,238,206,0)');
  ctx.fillStyle = wear; ctx.fillRect(0, 0, w, h);
  // the long edges go dark: a board is chamfered by wear, and that shadow is
  // what separates one plank from the next even where the gap is not visible
  const edge = ctx.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, 'rgba(28,20,12,0.55)'); edge.addColorStop(0.14, 'rgba(28,20,12,0)');
  edge.addColorStop(0.86, 'rgba(28,20,12,0)'); edge.addColorStop(1, 'rgba(28,20,12,0.55)');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, w, h);
  WOOD = new THREE.CanvasTexture(c);
  WOOD.colorSpace = THREE.SRGBColorSpace;
  WOOD.anisotropy = 8;
  return WOOD;
}

// One tone per plank position, so the deck is a row of different boards rather
// than one long brown bar — the grain texture on top is shared.
function plankMaterials(base) {
  const c = new THREE.Color(base);
  const map = woodTexture();
  return Array.from({ length: 9 }, (_, i) => {
    const k = 0.95 + ((i * 37) % 11) / 16;          // deterministic, not random
    return new THREE.MeshLambertMaterial({ color: c.clone().multiplyScalar(k), map });
  });
}

export class Arena {
  constructor(canvas, theme) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.puppets = [];
    this.portrait = false;
    this.shake = 0;
    this.focus = 0.6;
    this._v = new THREE.Vector3();

    // A late, low sun from behind the camera's left, a cold sky fill and a dim
    // bounce off the water. Gritty means the light has a direction and the
    // shadow side is genuinely dark.
    const hemi = new THREE.HemisphereLight('#a8bac6', '#3a4034', 1.05);
    const sun = new THREE.DirectionalLight('#ffd9a8', 1.45);
    sun.position.set(-5, 4.5, 6);
    // A bounce off the water, aimed UP into the understructure. Without it the
    // beams, braces and piles are one black mass and the bridge stops reading
    // as built — which is the whole reason the board is a bridge.
    const bounce = new THREE.DirectionalLight('#7e939c', 0.85);
    bounce.position.set(3, -6, 4);
    this.scene.add(hemi, sun, bounce);

    this.setTheme(theme);
  }

  setTheme(theme) {
    this.theme = theme;
    if (this.bg) this.scene.remove(this.bg);
    if (this.fg) this.scene.remove(this.fg);
    this.photo = false;
    this.bgMat = new THREE.MeshBasicMaterial({ map: paintedPark(theme, 3, this.focus) });
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.bgMat);
    this.bg.position.z = BG_Z;
    this.scene.add(this.bg);
    this.fg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: paintForeground(theme), transparent: true, depthWrite: false }));
    this.fg.position.z = FG_Z;
    this.scene.add(this.fg);
    if (this.bridge) this.scene.remove(this.bridge);
    this.buildBridge(theme);
    this.fitFrame();
  }

  // A photograph behind the bridge — the owner's "can even use a real photo".
  // It goes through the SAME focus pass as the painting, so a plate is
  // tilt-shifted to the deck's row like everything else.
  async setPhoto(url, opts) {
    const tex = await fromImage(url, { focus: this.focus, ...opts });
    this.bgMat.map = tex; this.bgMat.needsUpdate = true;
    this.photo = true;                     // a plate is not repainted on resize
  }

  buildBridge(theme) {
    const p = theme.park;
    const g = new THREE.Group();
    const planks = plankMaterials(p.bench);
    const iron = new THREE.MeshLambertMaterial({ color: p.iron });
    const grain = woodTexture();
    const beam = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.bench).multiplyScalar(0.8), map: grain });
    const beamDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.bench).multiplyScalar(0.62), map: grain });
    const rust = new THREE.MeshLambertMaterial({ color: '#6a4a32' });
    const stone = new THREE.MeshLambertMaterial({ color: p.stone });
    const stoneDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.stone).multiplyScalar(0.72) });

    const L = 13, DEPTH = 1.6;             // the deck runs off both ends of the frame

    // ── the deck: planks laid ACROSS the bridge, so the boards run toward the
    // camera and the joins between them are what says "thick timber"
    // A dark board under the deck, so the gap between two planks is a SHADOW
    // rather than more of the same brown. Without it the boards merge into one
    // slab and the whole point of thick timber is lost.
    const under = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, DEPTH),
      new THREE.MeshLambertMaterial({ color: '#241c14' }));
    under.position.set(0, -0.14, 0); g.add(under);

    // A plank is about the width of a boot. Eleven boards across thirteen
    // metres read as a pier; thirty read as a footbridge somebody nailed down.
    const n = 30;
    for (let i = 0; i < n; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(L / n * 0.9, 0.17, DEPTH), planks[i % planks.length]);
      plank.position.set(-L / 2 + L / n * (i + 0.5), -0.075, 0);
      plank.rotation.z = ((i * 13) % 5 - 2) * 0.004;       // nothing is quite flat
      plank.position.y += ((i * 7) % 3 - 1) * 0.006;       // nor quite level
      g.add(plank);
      // a nail head over each stringer on every third board — the detail that
      // says somebody built this out of boards rather than modelled a brown box
      if (i % 3 === 0) for (const nz of [-DEPTH / 2 + 0.22, DEPTH / 2 - 0.22]) {
        const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), iron);
        nail.position.set(plank.position.x, 0.008, nz);
        g.add(nail);
      }
    }
    // No separate "worn strip" mesh: the wear is painted into the wood texture
    // itself now, and having both drew a hard line straight across the deck
    // where the two treatments met.

    // ── the structure, all of it UNDER the deck ──
    for (const z of [-DEPTH / 2 + 0.22, DEPTH / 2 - 0.22]) {
      const stringer = new THREE.Mesh(new THREE.BoxGeometry(L, 0.34, 0.3), beam);
      stringer.position.set(0, -0.32, z); g.add(stringer);
    }
    for (let i = -2; i <= 2; i++) {
      const x = i * 2.9;
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, DEPTH + 0.3), beamDark);
      cross.position.set(x, -0.62, 0); g.add(cross);
      for (const z of [-DEPTH / 2 + 0.24, DEPTH / 2 - 0.24]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 3.4, 8), beam);
        pile.position.set(x, -2.4, z); pile.rotation.z = (i % 2 ? 1 : -1) * 0.02; g.add(pile);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 8), rust);
        band.position.set(x, -1.0, z); g.add(band);
      }
      // a diagonal brace: the thing that makes it read as built rather than stacked
      const brace = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.16), beamDark);
      brace.position.set(x + 1.1, -1.5, DEPTH / 2 - 0.24);
      brace.rotation.z = i % 2 ? 0.62 : -0.62; g.add(brace);
    }

    // ── the handrail: posts at the ENDS only ──
    // A rail along the near side would be exactly the back panel the owner
    // asked to be rid of, so there is one post at each end of the frame and a
    // single top rail well above head height, on the FAR side.
    for (const x of [-L / 2 + 0.6, L / 2 - 0.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.4, 0.22), beam);
      post.position.set(x, 1.1, -DEPTH / 2 + 0.2); g.add(post);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), beamDark);
      cap.position.set(x, 2.34, -DEPTH / 2 + 0.2); g.add(cap);
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 6), iron);
      bolt.rotation.x = Math.PI / 2; bolt.position.set(x, 0.5, -DEPTH / 2 + 0.2); g.add(bolt);
    }
    // There is deliberately NO rail spanning the deck. A top rail on the far
    // side sits above head height and still draws a line straight across the
    // fight, which is the thing the owner asked to be rid of. The two end
    // posts carry the idea of a handrail; the gate asserts that nothing at all
    // stands above the deck over the play area, and it caught this rail.
    // Stubs on the posts say the rail was there and has gone the way of
    // everything else on this bridge.
    for (const x of [-L / 2 + 0.6, L / 2 - 0.6]) {
      const stub = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.13, 0.15), beamDark);
      stub.position.set(x + (x < 0 ? 0.34 : -0.34), 1.75, -DEPTH / 2 + 0.2);
      stub.rotation.z = x < 0 ? -0.12 : 0.1; g.add(stub);
    }

    // ── the water below, and the banks the bridge lands on ──
    const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 26),
      new THREE.MeshLambertMaterial({ color: p.water }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, -4.2, -6); g.add(water);
    for (let i = 0; i < 7; i++) {
      const glint = new THREE.Mesh(new THREE.PlaneGeometry(3 + i * 0.6, 0.12),
        new THREE.MeshBasicMaterial({ color: '#8fa4a8', transparent: true, opacity: 0.22 }));
      glint.rotation.x = -Math.PI / 2;
      glint.position.set(-8 + i * 2.9, -4.18, -1.5 - i * 1.4); g.add(glint);
    }
    // the stone from the first brief, kept: a granite abutment at each end
    // where the deck meets the bank, cropped by the frame
    for (const s of [-1, 1]) {
      const abut = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 2.8), stone);
      abut.position.set(s * (L / 2 + 0.6), -1.6, -0.2); g.add(abut);
      const cap2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.26, 3.1), stoneDark);
      cap2.position.set(s * (L / 2 + 0.6), -0.1, -0.2); g.add(cap2);
    }

    // rubbish on the deck: this is Kallio at the wrong end of the night
    for (const [x, col, r] of [[-3.4, '#4a6a4a', 0.1], [2.1, '#8a8f94', 0.08], [4.6, '#6a5a3a', 0.09], [-1.2, '#8a8f94', 0.07]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(r * 2.4, r * 1.6, r * 2), new THREE.MeshLambertMaterial({ color: col }));
      m.position.set(x, r * 0.8, 0.46); m.rotation.y = x; g.add(m);
    }

    this.bridge = g;
    this.scene.add(g);
  }

  add(puppet) { this.puppets.push(puppet); this.scene.add(puppet.group, puppet.shadow); }
  clearPuppets() { for (const p of this.puppets) this.scene.remove(p.group, p.shadow); this.puppets = []; }

  // Fit the ACTION WIDTH, not the bridge — the deck runs off both ends of the
  // frame on purpose. Close in: a puppet has to be a real part of the picture.
  resize(w, h, actionWidth = 4.6) {
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.portrait = aspect < 1;
    const cam = this.camera;
    cam.aspect = aspect;
    cam.fov = this.portrait ? 46 : 36;
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const width = this.portrait ? actionWidth * 0.74 : actionWidth;
    const dist = (width / 2 + 0.35) / Math.tan(hfov / 2);
    // A little above the deck and tilted down about ten degrees. Dead level
    // hides the deck entirely — the planks go edge-on and the understructure
    // becomes the whole lower half of the frame — while a high camera turns
    // the bridge into a floor plan. This is the angle where you can see the
    // boards the figures are standing on and still have sky behind their heads.
    // Portrait is flatter again: the phone frame is tall, so every degree of
    // downward tilt spends screen on the water instead of on the fight.
    const lookY = this.portrait ? 0.46 : 0.28;
    cam.position.set(0, this.portrait ? 1.25 : 1.6, dist);
    cam.lookAt(0, lookY, 0);
    cam.updateProjectionMatrix();
    this.baseCam = cam.position.clone();
    this.lookY = lookY;
    this.actionWidth = width;
    this.fitFrame();
  }

  // Guarantee the tallest figure on the board fits under the top of the frame.
  // The camera fits the action WIDTH, which says nothing about height — and the
  // boss stands a head taller than anyone else, so his crown was cropped by the
  // frame edge while every gate stayed green. Pulling back a little for one
  // encounter is the right trade: cropping the boss is worse than seeing him
  // slightly smaller, and every other fight is untouched because nothing else
  // is tall enough to trip it.
  // The margin only has to stop a crown being CROPPED — it is not a band to
  // reserve. At 0.13 it pulled every ordinary fight back too, which undoes
  // "much closer to the characters" for the five encounters that never needed
  // it; the unit labels are clamped into the frame separately.
  ensureHeadroom(worldTop, margin = 0.035) {
    for (let i = 0; i < 20; i++) {
      const p = this._v.set(0, worldTop, 0).project(this.camera);
      if ((1 - p.y) / 2 >= margin) break;
      this.camera.position.z += 0.2;
      this.camera.lookAt(0, this.lookY, 0);
      this.camera.updateProjectionMatrix();
    }
    this.baseCam = this.camera.position.clone();
    this.fitFrame();
  }

  // How wide the picture actually is at a given depth. The layout used to
  // guess this from the action width, which is the width the camera was ASKED
  // to fit and not the width you can see at the plane the puppets stand on —
  // so the end of a three-wide row sat on the frame edge. Ask the camera.
  halfWidthAt(z = 0) {
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    return Math.tan(vfov / 2) * this.camera.aspect * (this.camera.position.z - z);
  }

  // where the deck sits, as a fraction down the frame
  deckRow() {
    const p = this._v.set(0, 0.45, 0).project(this.camera);
    return (1 - p.y) / 2;
  }
  // kept under its old name too: the gate and main.js both ask this question
  benchRow() { return this.deckRow(); }

  // The painting fills the frame exactly at its own distance, and its sharp
  // band follows the deck up and down the screen.
  fitFrame() {
    if (!this.bg || !this.baseCam) return;
    const cam = this.camera;
    const d = cam.position.z - BG_Z;
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * d;
    this.bg.scale.set(vh * cam.aspect * 1.04, vh * 1.04, 1);
    const t = d / cam.position.z;
    this.bg.position.y = cam.position.y + ((this.lookY ?? 0) - cam.position.y) * t;

    // the near band, hung off the BOTTOM edge of the frame at its own distance
    const fd = cam.position.z - FG_Z;
    const fh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * fd;
    const centre = cam.position.y + ((this.lookY ?? 0) - cam.position.y) * (fd / cam.position.z);
    const band = this.portrait ? 0.4 : 0.3;
    this.fg.scale.set(fh * cam.aspect * 1.05, fh * band, 1);
    this.fg.position.set(0, centre - fh * 0.5 + fh * band * 0.46, FG_Z);

    // Repainting is a blur pass over one canvas, so it happens only when the
    // row has actually moved — a resize drag must not repaint on every pixel.
    const row = this.deckRow();
    if (!this.photo && Math.abs(row - this.focus) > 0.04) {
      this.focus = Math.max(0.2, Math.min(0.85, row));
      this.bgMat.map = paintedPark(this.theme, 3, this.focus);
      this.bgMat.needsUpdate = true;
    }
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
      const s = this.shake * this.shake * 0.14;
      this.camera.position.set(this.baseCam.x + (Math.random() - 0.5) * s, this.baseCam.y + (Math.random() - 0.5) * s, this.baseCam.z);
      this.camera.lookAt(0, this.lookY, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
