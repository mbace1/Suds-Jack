// EERI — CONTACT SHADOWS.
//
// The owner's note on the original look list was "everything floats", and it
// was right: nothing in this game casts anything, so every crate, pipe and
// character sits on the ground line rather than on the ground. Contact is most
// of what makes a Crafted World screen read as a real object on a real table.
//
// ---- THE GEOMETRY DECIDES THE IMPLEMENTATION ---------------------------
//
// The obvious build is a dark ellipse lying flat on the floor. It is wrong
// here, and the camera says so before any of it is written: `camera.js` sits
// at y ~6.6 and looks at y - 0.4 from a dolly of ~27, which is a pitch of
// **0.86 degrees**. The view is a pure side elevation. A horizontal quad seen
// from 0.86 degrees above is edge-on — a one-pixel line, invisible.
//
// So a shadow here is a quad in the SAME x-y plane the game is played on,
// standing just in front of the surface it falls on, squashed flat and pushed
// along the sun's direction. That is what 2.5D side-view games have always
// done, and here it is not a cheat but the only thing the camera can see.
//
// ---- TWO STYLES, ON PURPOSE --------------------------------------------
//
// The owner's call on soft shadows was "soft, but even that might look weird",
// and the doubt is well founded: a soft airbrushed blob under a hard-edged
// paper cutout is exactly what ART_BRIEF's flat-fill rule forbids everywhere
// else in this game. Rather than argue it, both are built and switchable, so
// the question is settled by looking at one frame twice:
//
//   'soft' — a radial falloff. The Crafted World answer. Beds an object down
//            without asserting an edge that the light does not justify.
//   'cut'  — one flat value with a hard rim. The paper answer: a cutout laid
//            on a table casts a shape, not a gradient, and every other surface
//            in this game is a flat fill inside a hard edge.
//
// Nothing else in the game knows which is in force.
import * as THREE from 'three';

// The sun is the DirectionalLight in main.js at (-14, 22, 18): high, and off
// to the left. Only the x/y ratio matters for where a shadow lands, and it
// gives a shadow that leans RIGHT as the caster rises — away from the light.
const SUN_LEAN = 14 / 22;

// How much a shadow spreads and fades as its caster leaves the ground. Both
// are the same physical fact — a shadow far from its occluder is wider and
// weaker — and doing one without the other reads as a sticker on the floor.
const RISE_SPREAD = 0.16;   // per tile of height
const RISE_FADE = 0.5;      // per tile of height
const MAX_RISE = 4.0;       // past this it has stopped meaning anything

const STYLES = ['soft', 'cut'];

// One 128x64 canvas per style, shared by every shadow in the scene.
function styleTexture(style) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 64;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 128, 64);
  if (style === 'cut') {
    // FLAT, WITH A HARD RIM. No falloff at all — the whole point of this
    // variant is that the edge is an edge. A single pixel of feather is left
    // in only because the alternative is a stair-stepped ellipse: the quad is
    // 128px wide on a texture that gets minified, and an un-antialiased curve
    // crawls. That is not a gradient, it is the edge being drawn properly.
    g.fillStyle = 'rgba(0,0,0,1)';
    g.beginPath(); g.ellipse(64, 32, 61, 29, 0, 0, Math.PI * 2); g.fill();
  } else {
    // SOFT. Weighted so it is not a even fade: the middle holds its value for
    // most of the radius and then goes quickly, because a linear fade from the
    // centre reads as fog rather than as contact.
    const r = g.createRadialGradient(64, 32, 0, 64, 32, 62);
    r.addColorStop(0.00, 'rgba(0,0,0,1)');
    r.addColorStop(0.45, 'rgba(0,0,0,0.92)');
    r.addColorStop(0.75, 'rgba(0,0,0,0.45)');
    r.addColorStop(1.00, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.save(); g.translate(64, 32); g.scale(1, 0.5); g.translate(-64, -64);
    g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;   // same reason as v15.35
  tex.anisotropy = 4;
  return tex;
}

export class Shadows {
  // `level` only has to answer `groundTop(x, yFrom)`, which is the one
  // question this needs and the one thing that stops a shadow from hanging in
  // the air over a pit.
  constructor(scene, level, style = 'soft') {
    this.scene = scene;
    this.level = level;
    this.casters = [];
    this.textures = Object.fromEntries(STYLES.map((s) => [s, styleTexture(s)]));
    this.style = STYLES.includes(style) ? style : 'soft';
  }

  // `get` returns {x, y, rise} in world units, or null for "not right now" —
  // a caster that is dead, despawned, off a cliff or riding inside a machine
  // has no shadow, and returning null is cheaper than every caller learning
  // how to unregister.
  add(get, { width = 1, alpha = 0.42 } = {}) {
    const mat = new THREE.MeshBasicMaterial({
      map: this.textures[this.style],
      transparent: true, opacity: alpha, depthWrite: false,
      // it lies ON a surface that is itself a flat quad, so without this the
      // two z-fight and the shadow flickers as the camera drifts
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.userData.shadow = true;
    mesh.renderOrder = 2;
    mesh.visible = false;
    this.scene.add(mesh);
    const c = { get, mesh, mat, width, alpha };
    this.casters.push(c);
    return c;
  }

  remove(c) {
    const i = this.casters.indexOf(c);
    if (i < 0) return;
    this.casters.splice(i, 1);
    this.scene.remove(c.mesh);
    c.mesh.geometry.dispose();
    c.mat.dispose();
  }

  setStyle(style) {
    if (!STYLES.includes(style) || style === this.style) return;
    this.style = style;
    for (const c of this.casters) { c.mat.map = this.textures[style]; c.mat.needsUpdate = true; }
  }

  update() {
    for (const c of this.casters) {
      const s = c.get();
      if (!s) { c.mesh.visible = false; continue; }
      const top = this.level.groundTop(s.x, s.y + 0.2);
      // groundTop returns -4 over a pit. A shadow on nothing is worse than no
      // shadow: it draws a dark smear across the earth section below the hole.
      if (top < 0) { c.mesh.visible = false; continue; }
      const rise = Math.max(0, Math.min(MAX_RISE, s.y - (s.rise ?? 0.81) - top));
      const spread = 1 + rise * RISE_SPREAD;
      const w = c.width * spread;
      c.mesh.scale.set(w, w * 0.42, 1);
      // pushed along the sun, and NOT scaled by spread: the lean is where the
      // light is, the spread is how far the occluder is. Multiplying them
      // makes a jumping character's shadow race away from him.
      c.mesh.position.set(s.x + rise * SUN_LEAN, top + w * 0.10, (s.z ?? 0) + 0.06);
      c.mat.opacity = Math.max(0, c.alpha * (1 - rise * RISE_FADE / MAX_RISE * 2));
      c.mesh.visible = c.mat.opacity > 0.02;
    }
  }

  dispose() {
    for (const c of this.casters.slice()) this.remove(c);
    for (const t of Object.values(this.textures)) t.dispose();
    this.casters = [];
  }
}

export const SHADOW_STYLES = STYLES;
