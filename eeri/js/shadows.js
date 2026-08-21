// EERI — CONTACT SHADOWS. **PARKED, 2026-08-21, at the owner's call.**
//
// Built, wired, rendered and then taken back out of `main.js`: "maybe shadows
// aren't adding much visual value at this point". That is the right read. At
// the framing this game is played at, a contact shadow on the ground line is a
// thin band mostly hidden behind the grass fringe, and it was costing more
// tuning than it was returning — the module works, the effect is subtle, and
// subtle is not what the look needs right now.
//
// The file stays because two findings in it are worth more than the feature
// and are not obvious enough to re-derive:
//
//   1. The camera pitch is **0.86 degrees**. Any future lighting or grounding
//      work has to start from "this is a side elevation", not from the ground
//      plane. See below.
//   2. `groundTop()` returns -4 over a pit, and anything that draws at ground
//      level has to check for it or it smears across the earth section.
//
// Nothing imports this. It is inert.
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
// The band's height in tiles. Fixed, not derived from width — see update().
const SHADOW_H = 0.26;

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
  // `parent` is the SITE's group, not the scene. A site is torn down by
  // removing its group, so shadows parented there go with it; parented to the
  // scene they would survive the room that cast them.
  constructor(parent, level, style = 'soft') {
    this.scene = parent;
    this.level = level;
    this.casters = [];
    this.textures = Object.fromEntries(STYLES.map((s) => [s, styleTexture(s)]));
    this.style = STYLES.includes(style) ? style : 'soft';
  }

  // `get` returns {x, y, foot} in world units, or null for "not right now" —
  // `foot` is how far BELOW `y` the caster's base sits, because the things
  // this has to serve do not agree on where their origin is: the kid is
  // centred (feet at y - 0.81) and a flag is planted (base at y exactly).
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
    // `muted` is the look harness's kill switch (debug.shadowsOn). It lives
    // here rather than in the caller so there is exactly one place that
    // decides whether a shadow is drawn.
    if (this.muted) return;
    for (const c of this.casters) {
      const s = c.get();
      if (!s) { c.mesh.visible = false; continue; }
      const top = this.level.groundTop(s.x, s.y + 0.2);
      // groundTop returns -4 over a pit. A shadow on nothing is worse than no
      // shadow: it draws a dark smear across the earth section below the hole.
      if (top < 0) { c.mesh.visible = false; continue; }
      const rise = Math.max(0, Math.min(MAX_RISE, s.y - (s.foot ?? 0) - top));
      const spread = 1 + rise * RISE_SPREAD;
      const w = c.width * spread;
      // HEIGHT IS NOT A FRACTION OF WIDTH, and tying them was the first thing
      // that had to go. At 0.42x, the machine's 3.4-wide shadow stood 1.4
      // tiles tall and read as a dirty smear up the backdrop rather than as
      // contact. A contact shadow in a side elevation is a THIN band on the
      // ground line whatever is casting it — width says how much is above it,
      // height says only how far the eye is from straight-on, which is fixed
      // by the camera at under a degree.
      const h = SHADOW_H * (1 + rise * 0.06);
      c.mesh.scale.set(w, h, 1);
      // sat ON the line rather than above it: half the band below the ground
      // top, half above, so it reads as something the object is standing in
      // rather than a decal floating behind its feet.
      // BEHIND the play plane, not in front of it. At +0.06 the quad sat a
      // whisker nearer the camera than the character standing on it, and with
      // depthWrite off and renderOrder 2 it painted over his boots. The ground
      // it falls on is behind him, so that is where it goes.
      c.mesh.position.set(s.x + rise * SUN_LEAN, top + h * 0.15, (s.z ?? 0) - 0.30);
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
