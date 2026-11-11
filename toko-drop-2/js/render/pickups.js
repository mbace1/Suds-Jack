// pickups.js — how 1.x's classic pickups look: the drops on the floor, the
// gates, the cargo convoy's moths and the bounty's ring.
//
// Reads the world (w.pk, sim/pickups.js) and its events, never writes them.
// 1.x's own look (main.js:1693-1736, 2243-2349, 2503-2510, 5891-5906,
// 6017-6031), on 2.0's stage:
//   a drop     an unlit orb in its colour, bobbing, spinning and pulsing, a
//              glyph badge over it that is never hidden, both blinking hard
//              over its last 2.5 s, and a pool of its light on the floor
//   a gate     two grey posts and a beam between them in the gate's colour
//              (green, or red on a risk gate's red beat) inside a halo, the
//              beam lighting the floor; a retiring gate stands whole until it
//              goes, as 1.x's; until a gate has ever been dashed, DASH
//              THROUGH! over each while the game is playing
//   a moth     a small gold gel with two flapping wings
//   a bounty   a gold ring on the floor under its body, BOUNTY n over it
//              while playing, and a pulsing "!" ping for 1.6 s when marked
//   a number   1.x's DamageNumber: "+N" over a nugget or a paid bounty, "x2!"
//              over a ×2, rising 2.5 u/s and fading over 0.6 s
// `playing` is set by main.js each frame (false over the pause panel, the
// death beat and the results): 1.x drew its tags only in 'playing'. 1.x's
// convoy also streaked a gold trail ribbon (main.js:10936-10946); 2.0's view
// has no trail pool, so the moths fly without it (arcade-mode.md §6.10).
// The pure numbers (the bob, the blink, the beam's pulse) are
// sim/pickups.js's itemLook / gateLook, so they are tested in bare node; the
// rest is TUNING.pickups. The bits of goo a pickup, a gate or a moth throws
// go through the actors' own chunks.
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import { TUNING } from '../tuning.js?v=143';
import { itemLook, gateLook, glyphOf, colorOf } from '../sim/pickups.js?v=143';
import { t as say } from '../ui.js?v=143';

const T = TUNING, P = T.pickups, G = P.gate, C = P.convoy, B = P.bounty, GL = G.look, FAM = G.family;
// v121: a label over the floor lets the hero show through it. A screenshot pass found DASH THROUGH! and BOUNTY
// written across the hero, the one thing on the floor a player must always see. The test is ON SCREEN, with the
// camera: a label floats 2 m up, so it lands past its anchor, over a hero the floor's own distance calls far; and
// measured along the camera's own right and up, it holds as the view turns with the phone (v18a). Where the hero
// stands inside the label's box (grown by the hero's own size) the label fades to a third, smoothly at the edge
const _v = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
const _L = { x: 0, y: 0 }, _Lr = { x: 0, y: 0 }, _Lu = { x: 0, y: 0 }, _H = { x: 0, y: 0 }, _Hr = { x: 0, y: 0 };
// a world point on screen: normalised device x stretched by the screen's aspect, so a distance reads alike both ways
const onScreen = (cam, v, out) => { v.project(cam); out.x = v.x * (cam.aspect || 1); out.y = v.y; return out; };
function clearOfHero(cam, w, x, y, z, width, height) {
  const h = w.hero;
  if (!cam || !h || h.alive === false) return 1;
  _r.setFromMatrixColumn(cam.matrixWorld, 0); _u.setFromMatrixColumn(cam.matrixWorld, 1);
  const R = T.hero.radius;
  onScreen(cam, _v.set(x, y, z), _L);
  onScreen(cam, _v.set(x, y, z).addScaledVector(_r, width / 2), _Lr);
  onScreen(cam, _v.set(x, y, z).addScaledVector(_u, height / 2), _Lu);
  onScreen(cam, _v.set(h.x, R, h.z), _H);
  onScreen(cam, _v.set(h.x, R, h.z).addScaledVector(_r, R), _Hr);
  const hw = Math.hypot(_Lr.x - _L.x, _Lr.y - _L.y), hh = Math.hypot(_Lu.x - _L.x, _Lu.y - _L.y), hr = Math.hypot(_Hr.x - _H.x, _Hr.y - _H.y);
  // 1 at the edge of the label's box grown by the hero's size; under 1 the hero is behind the words
  const k = Math.max(Math.abs(_H.x - _L.x) / (hw + hr || 1), Math.abs(_H.y - _L.y) / (hh + hr || 1));
  const e = Math.min(1, Math.max(0, (k - 0.85) / 0.3));
  return 0.32 + 0.68 * e * e * (3 - 2 * e);
}
const POOLS = 96;   // pools of light a frame: the drops, the beams, the moths
const css = (hex) => '#' + hex.toString(16).padStart(6, '0');

// ── canvas textures: one per glyph and colour, one per line of text ──
const cache = new Map();
function canvasTexture(key, w, h, draw) {
  let tex = cache.get(key);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}
// 1.x makeGlyphTexture (main.js:2042-2056): a ring and the glyph, in its colour
const glyphTexture = (text, hex) => canvasTexture(`g:${text}:${hex}`, P.badge.px, P.badge.px, (g, w) => {
  const col = css(hex), m = w / 2;
  g.strokeStyle = col; g.lineWidth = P.badge.stroke;
  g.beginPath(); g.arc(m, m, P.badge.ring, 0, Math.PI * 2); g.stroke();
  g.fillStyle = col;
  g.font = `bold ${P.badge.font[text.length > 1 ? 1 : 0]}px monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, m, m + 2);
});
// a line of glowing text (1.x drew these on its HUD canvas over the world point); render/hints.js draws with it too
export function labelTexture(text, color, glow) {
  const key = `l:${text}:${color}`, hit = cache.get(key);
  if (hit) return hit;
  const px = P.label.px, font = `bold ${px}px monospace`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width + px), h = Math.ceil(px * 1.6);
  const tex = canvasTexture(key, w, h, (g) => {
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = glow; g.shadowBlur = px * 0.35; g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
  });
  tex.userData.aspect = w / h;
  return tex;
}

// a sprite whose picture can change without a new material: its picture is the
// material's map, swapped (v116: the map, not a texture node a sprite — a node
// a sprite was a shader build a sprite, as a new tag, badge or number came up
// mid-run; through the map every sprite draws with one compiled shader)
export function sprite(order = 5) {
  const mat = new THREE.SpriteNodeMaterial({ map: glyphTexture(' ', 0xffffff), transparent: true, depthTest: false, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.renderOrder = order; s.visible = false; s.frustumCulled = false;
  return s;
}
export const setPicture = (s, tex) => { if (s.material.map !== tex) s.material.map = tex; };

export class PickupView {
  // `actors` lends its chunks (actors.spray) and the arena's light map
  constructor(scene, actors) {
    this.scene = scene; this.actors = actors;
    this.items = [];      // drop views, pooled
    this.gates = [];      // gate views, pooled
    this.moths = [];      // moth views, pooled
    this.unit = new THREE.SphereGeometry(1, 14, 10);
    // v107: every gate's parts, one draw a part however many stand (TUNING.pickups.gate.look)
    {
      const N = GL.max, inst = (geo, mat, n = N) => {
        const m = new THREE.InstancedMesh(geo, mat, n);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false;
        if (!geo.attributes.gCol) m.setColorAt(0, new THREE.Color());
        scene.add(m); return m;
      };
      const metal = (hex, rough) => new THREE.MeshStandardNodeMaterial({ color: hex, roughness: rough, metalness: 0.65 });
      const gel = new THREE.MeshPhysicalNodeMaterial({ color: 0xffffff, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.35 });
      // the beam: its colour rides an attribute of its own, so the white-hot core is not multiplied by it (as v104's bullets)
      const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).rotateZ(Math.PI / 2);
      this.gCol = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
      beamGeo.setAttribute('gCol', this.gCol);
      const beamMat = new THREE.MeshBasicNodeMaterial(), nz = TSL.normalView.z.abs(), gc = TSL.attribute('gCol', 'vec3'), BM = GL.beam;
      const body = TSL.mix(gc.mul(BM.rim[2]), gc, TSL.smoothstep(BM.rim[0], BM.rim[1], nz));
      beamMat.colorNode = TSL.mix(body, TSL.vec3(1, 1, 1), TSL.smoothstep(BM.core[0], BM.core[1], nz).mul(BM.core[2]));
      this.gp = {
        foot: inst(new THREE.CylinderGeometry(GL.foot.r[0], GL.foot.r[1], GL.foot.h, 14).translate(0, GL.foot.h / 2, 0), metal(GL.metal, 0.5)),
        stem: inst(new THREE.CylinderGeometry(GL.stem.r, GL.stem.r, GL.stem.h, 10).translate(0, GL.foot.h + GL.stem.h / 2, 0), metal(GL.stemMetal, 0.3)),
        cap: inst(new THREE.SphereGeometry(1, 16, 12), gel),
        hub: inst(new THREE.CylinderGeometry(1, 1.1, 1, 18).translate(0, 0.5, 0), metal(GL.metal, 0.45)),
        band: inst(new THREE.TorusGeometry(GL.band.r, GL.band.tube, 6, 16).rotateX(Math.PI / 2), metal(FAM.fuse.stripe, 0.6)),
        hoop: inst(new THREE.TorusGeometry(1, FAM.hoop.tube / FAM.hoop.r, 10, 48).rotateX(Math.PI / 2), gel),
        spark: inst(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicNodeMaterial({ color: GL.sparkColor })),
        beam: inst(beamGeo, beamMat),
      };
    }
    this.wingGeo = new THREE.PlaneGeometry(C.wing.w, C.wing.h);
    // a moth is 1.x's satin gel (makeSatinMat, main.js:2342; TUNING.material), in gold
    const M = T.material;
    this.mothMat = new THREE.MeshPhysicalNodeMaterial({ color: C.color, roughness: M.roughness, clearcoat: M.clearcoat, clearcoatRoughness: M.clearcoatRoughness, sheen: M.sheen, sheenColor: new THREE.Color(C.wing.color) });
    this.wingMat = new THREE.MeshBasicNodeMaterial({ color: C.wing.color, transparent: true, opacity: C.wing.opacity, side: THREE.DoubleSide, depthWrite: false });
    // the bounty's ring and its countdown
    const R = B.ring;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(R.inner, R.outer, R.segments).rotateX(-Math.PI / 2),
      new THREE.MeshBasicNodeMaterial({ color: R.color, transparent: true, depthWrite: false, side: THREE.DoubleSide }));   // v104: drawn, not added (no glow)
    this.ring.position.y = R.y; this.ring.visible = false; this.ring.renderOrder = 1;
    this.bountyLabel = sprite(6);
    this.ping = sprite(6); this.pingId = null; this.pingT = 0;
    this.floaters = [];   // 1.x's DamageNumbers: { s (sprite), x, y, z, life }
    this.playing = true;
    scene.add(this.ring, this.bountyLabel, this.ping);
    // light on the floor: the light map's own pools (render/light.js), one more instanced draw in its scene
    const L = actors?.light;
    if (L?.scene && L.pools?.material) {
      this.pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), L.pools.material, POOLS);
      this.pools.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.pools.setColorAt(0, new THREE.Color());
      this.pools.count = 0; this.pools.frustumCulled = false;
      L.scene.add(this.pools);
    }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
    this._up = new THREE.Vector3(0, 1, 0);
    // one of each drawn microscopic far under the floor from boot until the
    // first run's sync takes it over, so their pipelines compile on the title
    // and not at the first gate or convoy (a WebGPU compile mid-fight stalls;
    // actors.js warms the jelly the same way)
    const warm = (o) => { o.visible = true; o.position.set(0, -50, 0); o.scale.setScalar(1e-4); o.traverse((c) => { c.frustumCulled = false; }); };
    const iv = this._item(0), gv = this._gate(0);
    for (const o of [iv.orb, iv.badge, gv.hint, this._moth(0).root, this.ring, this.bountyLabel, this.ping]) warm(o);
    // and every gate part once, far under the floor, until the first sync draws (or clears) them
    this._m.makeScale(1e-4, 1e-4, 1e-4).setPosition(0, -50, 0);
    for (const m of Object.values(this.gp)) { m.setMatrixAt(0, this._m); m.count = 1; }
  }

  // ── pools ────────────────────────────────────────────────────────
  _item(i) {
    while (this.items.length <= i) {
      const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
      const orb = new THREE.Mesh(this.unit, mat);
      orb.scale.setScalar(P.orb); orb.visible = false;
      const badge = sprite(5);
      this.scene.add(orb, badge);
      this.items.push({ orb, mat, badge });
    }
    return this.items[i];
  }
  // a gate's own view is its teaching tag (v107: its parts are the shared instanced ones, this.gp) and what it drew
  _gate(i) {
    while (this.gates.length <= i) {
      const hint = sprite(6);
      this.scene.add(hint);
      this.gates.push({ hint, drawn: false, beam: false });
    }
    return this.gates[i];
  }
  _moth(i) {
    while (this.moths.length <= i) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(this.unit, this.mothMat);
      body.scale.setScalar(C.r);
      const wl = new THREE.Mesh(this.wingGeo, this.wingMat), wr = new THREE.Mesh(this.wingGeo, this.wingMat);
      wl.position.set(-C.wing.x, C.wing.y, 0); wr.position.set(C.wing.x, C.wing.y, 0);
      root.add(body, wl, wr); root.visible = false;
      this.scene.add(root);
      this.moths.push({ root, body, wl, wr });
    }
    return this.moths[i];
  }

  reset() {
    for (const v of this.items) { v.orb.visible = false; v.badge.visible = false; }
    for (const v of this.gates) { v.drawn = false; v.beam = false; v.hint.visible = false; }
    for (const m of Object.values(this.gp)) m.count = 0;
    for (const v of this.moths) v.root.visible = false;
    this.ring.visible = false; this.bountyLabel.visible = false;
    this.ping.visible = false; this.pingId = null; this.pingT = 0;
    for (const f of this.floaters) { f.life = 0; f.s.visible = false; }
    if (this.pools) this.pools.count = 0;
  }

  // a floating number (1.x DamageNumber, main.js:2397-2407): text in its
  // colour at a world point, from a pool of sprites
  _float(text, color, x, y, z) {
    let f = this.floaters.find((o) => o.life <= 0);
    if (!f) { f = { s: sprite(7), life: 0 }; this.scene.add(f.s); this.floaters.push(f); }
    const tex = labelTexture(text, color, 'rgba(0,0,0,0)');   // 1.x's numbers have no glow (main.js:6039-6041)
    setPicture(f.s, tex);
    f.s.scale.set(P.label.h * tex.userData.aspect, P.label.h, 1);
    f.x = x; f.y = y; f.z = z; f.life = P.floater.life;
  }

  // the frame clock (actors.stepFx): the numbers rise and fade, the ping runs down
  stepFx(dt) {
    const F = P.floater;
    for (const f of this.floaters) if (f.life > 0) { f.life -= dt; f.y += F.rise * dt; }
    if (this.pingT > 0) this.pingT -= dt;
  }

  // the goo a pickup, a gate or a moth throws (1.x main.js:10773-10777, 11176-11181, 11292-11297)
  onEvent(e) {
    const a = this.actors;
    if (!a?.spray) return;
    // the numbers (main.js:11276, 11281, 4440-4441) and the mark's ping (main.js:9432)
    const F = P.floater;
    if (e.type === 'pickup' && e.value > 0) this._float(`+${e.value}`, F.score, e.x, F.y, e.z);
    else if (e.type === 'pickup' && e.kind === 'scoremult') this._float('x2!', F.mult, e.x, F.y, e.z);
    else if (e.type === 'bountyPaid') this._float(`+${e.pay}`, F.bounty, e.x, (e.r ?? 0) * 2 + F.bountyLift, e.z);
    else if (e.type === 'slalom' || e.type === 'threaded') this._float(`+${e.pay}`, F.score, e.x, F.y + (e.type === 'threaded' ? 0.8 : 0), e.z);
    else if (e.type === 'bounty') { this.pingId = e.id; this.pingT = B.ping.time; }
    if (e.type === 'pickup') a.spray(e.x, e.z, P.pop.count, e.color, [P.pop.size, P.pop.size]);
    else if (e.type === 'gateDash' && !e.dud) { const S = G.shards, hex = FAM.colors[e.kind] ?? G.green; a.spray(e.x, e.z, S.count / 2, hex, [S.size, S.size]); a.spray(e.x, e.z, S.count / 2, G.shard, [S.size, S.size]); }
    // v107: a fuse's burst lights the floor out to its reach and throws its goo; a slalom gate and a threading pay their points
    else if (e.type === 'fuse') {
      const L = a.light, B2 = GL.burst;
      if (L && L.bursts.length < T.light.arena.burstCap) L.bursts.push({ x: e.x, z: e.z, r: e.r, k: B2.k, life: B2.life, max: B2.life, hex: FAM.fuse.color });
      a.spray(e.x, e.z, G.shards.count, FAM.fuse.color, [G.shards.size, G.shards.size * 1.6]);
    }
    else if (e.type === 'mothShot') a.spray(e.x, e.z, C.burst.count, C.color, [C.burst.size, C.burst.size]);
  }

  sync(w, alpha, time) {
    const k = w?.pk;
    if (!k || !k.on) { this.reset(); return; }
    const lerp = (o, key) => o['p' + key] + (o[key] - o['p' + key]) * alpha;
    let n = 0;
    const pool = (x, z, r, hex, kk, angle = null, len = 0) => {
      if (!this.pools || n >= POOLS) return;
      if (angle == null) this._m.makeScale(r * 2, 1, r * 2).setPosition(x, 0, z);
      else this._m.compose(this._v.set(x, 0, z), this._q.setFromAxisAngle(this._up, -(angle + Math.PI / 2)), this._s.set(len, 1, r * 2));
      this.pools.setMatrixAt(n, this._m);
      this.pools.setColorAt(n, this._c.setHex(hex).multiplyScalar(kk));
      n++;
    };

    // drops
    let i = 0;
    for (const it of k.items) {
      if (it.taken) continue;
      const v = this._item(i++), L = itemLook(it, time), x = lerp(it, 'x'), z = lerp(it, 'z'), hex = colorOf(it);
      const pod = it.type === 'pod' || it.type === 'dash';
      v.orb.visible = true; v.orb.position.set(x, L.y, z); v.orb.rotation.y = L.spin; v.orb.scale.setScalar(P.orb);
      v.mat.color.setHex(hex); v.mat.opacity = L.opacity;
      setPicture(v.badge, glyphTexture(glyphOf(it), hex));
      v.badge.visible = true; v.badge.material.opacity = L.badge;
      v.badge.scale.setScalar(pod ? P.badge.pod : P.badge.other);
      v.badge.position.set(x, L.y + (pod ? P.badge.liftPod : P.badge.liftOther), z);
      pool(x, z, P.light.item.r, hex, P.light.item.k * L.badge);
    }
    for (; i < this.items.length; i++) { this.items[i].orb.visible = false; this.items[i].badge.visible = false; }

    // gates
    i = 0;
    const hintTex = k.gateUsed ? null : labelTexture(say('dashThrough'), G.hint.color, G.hint.glow);
    // v48: the tag over the nearest live gate only; on every gate at once it crowded the HUD
    let near = null, nd = Infinity;
    if (hintTex) for (const g of k.gates) { const d = g.alive ? Math.hypot(g.x - w.hero.x, g.z - w.hero.z) : Infinity; if (d < nd) { nd = d; near = g; } }
    // v107: each kind's shape from the shared parts — pylons at a beam's ends (a fence's along it too, a fuse's
    // banded), a turnstile's hub and tip caps, a hoop's ring; a broken gate's pylons stand, capped dark, till it retires
    const gp = this.gp, cnt = { foot: 0, stem: 0, cap: 0, hub: 0, band: 0, hoop: 0, spark: 0, beam: 0 };
    const put = (part, x, y, z, sx, sy, sz, hex = null, yaw = 0) => {
      const m = gp[part], j = cnt[part];
      if (j >= GL.max) return;
      this._m.compose(this._v.set(x, y, z), this._q.setFromAxisAngle(this._up, yaw), this._s.set(sx, sy, sz));
      m.setMatrixAt(j, this._m);
      if (hex != null) { if (part === 'beam') { this._c.setHex(hex); this.gCol.setXYZ(j, this._c.r, this._c.g, this._c.b); } else m.setColorAt(j, this._c.setHex(hex)); }
      cnt[part]++;
    };
    const pylon = (x, z, hex, banded) => {
      put('foot', x, 0, z, 1, 1, 1); put('stem', x, 0, z, 1, 1, 1);
      put('cap', x, GL.cap.y, z, GL.cap.r, GL.cap.r, GL.cap.r, hex);
      if (banded) for (const y of GL.band.y) put('band', x, y, z, 1, 1, 1);
    };
    for (const g of k.gates) {
      const v = this._gate(i++), look = gateLook(g, time), x = lerp(g, 'x'), z = lerp(g, 'z'), kind = g.type ?? 'gate';
      const half = g.half ?? G.half, ex = g.ax * half, ez = g.az * half, hex = look.color, capHex = g.alive ? hex : GL.dead;
      v.drawn = true; v.beam = false;
      if (kind === 'hoop') {
        // a ring of gel lying on the floor, bobbing; dashed through, it is gone
        if (g.alive) {
          put('hoop', x, GL.hoopY + GL.hoopBob[0] * Math.sin(time * GL.hoopBob[1] + g.id), z, g.ring, g.ring, g.ring, hex);
          pool(x, z, g.ring * 1.25, hex, P.light.laser.k);
        } else v.drawn = false;
      } else {
        if (kind === 'turnstile') {
          put('hub', x, 0, z, GL.hub.r, GL.hub.h, GL.hub.r);
          put('cap', x, GL.hub.h + GL.cap.r * 0.6, z, GL.cap.r, GL.cap.r, GL.cap.r, capHex);
          if (g.alive) for (const sg of [1, -1]) put('cap', x + ex * sg, GL.beam.y, z + ez * sg, GL.tipCap, GL.tipCap, GL.tipCap, capHex);
        } else {
          pylon(x + ex, z + ez, capHex, kind === 'fuse'); pylon(x - ex, z - ez, capHex, kind === 'fuse');
          if (kind === 'fence') for (let p = 1; p <= FAM.fence.posts; p++) { const tt = (p / (FAM.fence.posts + 1)) * 2 - 1; pylon(x + ex * tt, z + ez * tt, capHex, false); }
        }
        if (g.alive) {
          // the beam runs end to end, along (−sin a, cos a): three's +x turned by −(a + π/2) (main.js:1709-1712)
          put('beam', x, GL.beam.y, z, half * 2, GL.beam.r, GL.beam.r, hex, -(g.angle + Math.PI / 2));
          v.beam = true;
          pool(x, z, P.light.laser.r, hex, P.light.laser.k * look.fade, g.angle, half * 2 + P.light.laser.r);
          // a fuse's spark runs along its beam, end to end and back
          if (kind === 'fuse') { const tt = Math.sin(time * GL.spark.hz * Math.PI); put('spark', x + ex * tt, GL.beam.y, z + ez * tt, GL.spark.r, GL.spark.r, GL.spark.r); }
        }
      }
      // the teaching tag (main.js:5891-5906), over the nearest live gate
      const tag = hintTex && g === near && w.hero.alive && this.playing;
      v.hint.visible = !!tag;
      if (tag) {
        setPicture(v.hint, hintTex);
        v.hint.material.opacity = (G.hint.alpha[0] + G.hint.alpha[1] * Math.sin(time * G.hint.rate)) * clearOfHero(this.actors?.camera, w, x, G.hint.y, z, P.label.h * hintTex.userData.aspect, P.label.h);
        v.hint.scale.set(P.label.h * hintTex.userData.aspect, P.label.h, 1);
        v.hint.position.set(x, G.hint.y, z);
      }
    }
    for (; i < this.gates.length; i++) { const v = this.gates[i]; v.drawn = false; v.beam = false; v.hint.visible = false; }
    for (const [part, m] of Object.entries(gp)) { m.count = cnt[part]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    this.gCol.needsUpdate = true;

    // the convoy's moths
    i = 0;
    for (const m of k.convoy?.moths ?? []) {
      const v = this._moth(i++);
      v.root.visible = m.alive;
      if (!m.alive) continue;
      const x = lerp(m, 'x'), z = lerp(m, 'z'), flap = Math.sin(time * C.wing.flap + m.i * C.wing.phase) * C.wing.amp;
      v.root.position.set(x, C.y, z); v.root.scale.setScalar(1);
      v.wl.rotation.z = flap; v.wr.rotation.z = -flap;
      v.body.rotation.y = time * C.spin.rate + m.i * C.spin.phase;
      pool(x, z, P.light.moth.r, C.color, P.light.moth.k);
    }
    for (; i < this.moths.length; i++) this.moths[i].root.visible = false;

    // the bounty (main.js:10452-10455, 6018-6031)
    const b = k.bounty, g = b.id != null && b.t > 0 ? w.gels.find((x) => x.id === b.id && x.alive) : null;
    this.ring.visible = !!g; this.bountyLabel.visible = !!g && this.playing;
    if (g) {
      const R = B.ring, x = g.px + (g.x - g.px) * alpha, z = g.pz + (g.z - g.pz) * alpha;
      this.ring.position.set(x, R.y, z);
      this.ring.scale.setScalar(Math.max(R.min, g.r) * (1 + R.pulse * Math.sin(time * R.rate)));
      this.ring.material.opacity = R.opacity[0] + R.opacity[1] * Math.abs(Math.sin(time * R.blink));
      const tex = labelTexture(`${say('bounty')} ${Math.ceil(b.t)}`, B.label.color, B.label.glow);
      setPicture(this.bountyLabel, tex);
      this.bountyLabel.scale.set(P.label.h * tex.userData.aspect, P.label.h, 1);
      // fxY + 2r + 1.3 (main.js:6021), fxY a body's mid-height, r (tuning/pickups.js)
      this.bountyLabel.position.set(x, g.r * 3 + B.label.lift, z);
      this.bountyLabel.material.opacity = clearOfHero(this.actors?.camera, w, x, g.r * 3 + B.label.lift, z, P.label.h * tex.userData.aspect, P.label.h);
    }

    // the mark's ping: a gold "!" at fxY + 2r + 0.8 for 1.6 s (main.js:5860-5875)
    const pg = this.pingT > 0 && this.playing ? w.gels.find((x) => x.id === this.pingId && x.alive) : null;
    this.ping.visible = !!pg;
    if (pg) {
      const PG = B.ping, x = pg.px + (pg.x - pg.px) * alpha, z = pg.pz + (pg.z - pg.pz) * alpha;
      const tex = labelTexture('!', PG.color, PG.glow), hh = P.label.h * PG.size * (1 + PG.pulse * Math.sin(time * PG.rate));
      setPicture(this.ping, tex);
      this.ping.scale.set(hh * tex.userData.aspect, hh, 1);
      this.ping.position.set(x, pg.r * 3 + PG.lift, z);
      this.ping.material.opacity = Math.min(1, this.pingT * 2);
    }

    // the numbers
    for (const f of this.floaters) {
      f.s.visible = f.life > 0;
      if (!f.s.visible) continue;
      f.s.position.set(f.x, f.y, f.z);
      f.s.material.opacity = Math.max(0, f.life / P.floater.life);
    }

    if (this.pools) {
      this.pools.count = n;
      this.pools.instanceMatrix.needsUpdate = true;
      if (this.pools.instanceColor) this.pools.instanceColor.needsUpdate = true;
    }
  }

  // what is on screen (test/smoke.mjs)
  stats() {
    const vis = (list, f) => list.filter(f).length;
    return {
      items: vis(this.items, (v) => v.orb.visible), badges: vis(this.items, (v) => v.badge.visible),
      gates: vis(this.gates, (v) => v.drawn), beams: vis(this.gates, (v) => v.drawn && v.beam),
      hints: vis(this.gates, (v) => v.hint.visible), moths: vis(this.moths, (v) => v.root.visible),
      bounty: this.ring.visible && this.bountyLabel.visible, pools: this.pools?.count ?? 0,
      ping: this.ping.visible, floaters: this.floaters.filter((f) => f.s.visible).length,
      parts: Object.fromEntries(Object.entries(this.gp).map(([k, m]) => [k, m.count])),   // v107: the gate family's drawn parts
    };
  }
}
