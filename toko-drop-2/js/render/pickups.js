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
import { texture } from 'three/tsl';
import { TUNING } from '../tuning.js?v=19';
import { itemLook, gateLook, glyphOf, colorOf } from '../sim/pickups.js?v=19';
import { t as say } from '../ui.js?v=19';

const T = TUNING, P = T.pickups, G = P.gate, C = P.convoy, B = P.bounty;
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
// a line of glowing text (1.x drew these on its HUD canvas over the world point)
function labelTexture(text, color, glow) {
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

// a sprite whose picture can change without a new material: its colour is a
// texture node whose value is swapped
function sprite(order = 5) {
  const node = texture(glyphTexture(' ', 0xffffff));
  const mat = new THREE.SpriteNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  mat.colorNode = node;
  const s = new THREE.Sprite(mat);
  s.renderOrder = order; s.visible = false; s.frustumCulled = false;
  s.userData.node = node;
  return s;
}
const setPicture = (s, tex) => { if (s.userData.node.value !== tex) s.userData.node.value = tex; };

export class PickupView {
  // `actors` lends its chunks (actors.spray) and the arena's light map
  constructor(scene, actors) {
    this.scene = scene; this.actors = actors;
    this.items = [];      // drop views, pooled
    this.gates = [];      // gate views, pooled
    this.moths = [];      // moth views, pooled
    this.unit = new THREE.SphereGeometry(1, 14, 10);
    this.postGeo = new THREE.CylinderGeometry(G.post.r, G.post.r, G.post.h, G.post.segments);
    this.laserGeo = new THREE.BoxGeometry(G.half * 2, G.laser.w, G.laser.d);
    this.glowGeo = new THREE.BoxGeometry(G.half * 2, G.laser.glow[0], G.laser.glow[1]);
    this.wingGeo = new THREE.PlaneGeometry(C.wing.w, C.wing.h);
    // a moth is 1.x's satin gel (makeSatinMat, main.js:2342; TUNING.material), in gold
    const M = T.material;
    this.mothMat = new THREE.MeshPhysicalNodeMaterial({ color: C.color, roughness: M.roughness, clearcoat: M.clearcoat, clearcoatRoughness: M.clearcoatRoughness, sheen: M.sheen, sheenColor: new THREE.Color(C.wing.color) });
    this.wingMat = new THREE.MeshBasicNodeMaterial({ color: C.wing.color, transparent: true, opacity: C.wing.opacity, side: THREE.DoubleSide, depthWrite: false });
    // the bounty's ring and its countdown
    const R = B.ring;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(R.inner, R.outer, R.segments).rotateX(-Math.PI / 2),
      new THREE.MeshBasicNodeMaterial({ color: R.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
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
    for (const o of [iv.orb, iv.badge, gv.root, gv.hint, this._moth(0).root, this.ring, this.bountyLabel, this.ping]) warm(o);
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
  _gate(i) {
    while (this.gates.length <= i) {
      const root = new THREE.Group();
      const postMat = new THREE.MeshStandardNodeMaterial({ color: G.post.color, roughness: G.post.roughness, metalness: G.post.metalness, transparent: true });
      const p1 = new THREE.Mesh(this.postGeo, postMat), p2 = new THREE.Mesh(this.postGeo, postMat);
      const laserMat = new THREE.MeshBasicNodeMaterial({ color: G.green, transparent: true, depthWrite: false });
      const glowMat = new THREE.MeshBasicNodeMaterial({ color: G.green, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const laser = new THREE.Mesh(this.laserGeo, laserMat), glow = new THREE.Mesh(this.glowGeo, glowMat);
      root.add(p1, p2, laser, glow);
      root.visible = false;
      const hint = sprite(6);
      this.scene.add(root, hint);
      this.gates.push({ root, p1, p2, laser, glow, postMat, laserMat, glowMat, hint });
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
    for (const v of this.gates) { v.root.visible = false; v.hint.visible = false; }
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
    else if (e.type === 'bounty') { this.pingId = e.id; this.pingT = B.ping.time; }
    if (e.type === 'pickup') a.spray(e.x, e.z, P.pop.count, e.color, [P.pop.size, P.pop.size]);
    else if (e.type === 'gateDash' && !e.dud) { const S = G.shards; a.spray(e.x, e.z, S.count / 2, G.green, [S.size, S.size]); a.spray(e.x, e.z, S.count / 2, G.shard, [S.size, S.size]); }
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
    for (const g of k.gates) {
      const v = this._gate(i++), look = gateLook(g, time), x = lerp(g, 'x'), z = lerp(g, 'z');
      const dx = Math.cos(g.angle + Math.PI / 2) * G.half, dz = Math.sin(g.angle + Math.PI / 2) * G.half;
      v.root.visible = true; v.root.position.set(0, 0, 0); v.root.scale.setScalar(1);
      v.p1.position.set(x + dx, G.post.h / 2, z + dz); v.p2.position.set(x - dx, G.post.h / 2, z - dz);
      // the beam runs post to post, along (−sin a, cos a): three's +x turned by −(a + π/2) (main.js:1709-1712)
      for (const m of [v.laser, v.glow]) { m.position.set(x, G.laser.y, z); m.rotation.y = -(g.angle + Math.PI / 2); m.visible = g.alive; }
      v.laserMat.color.setHex(look.color); v.glowMat.color.setHex(look.color);
      v.laserMat.opacity = look.laser; v.glowMat.opacity = look.glow;
      v.postMat.opacity = look.fade;
      if (g.alive) pool(x, z, P.light.laser.r, look.color, P.light.laser.k * look.fade, g.angle, G.half * 2 + P.light.laser.r);
      // the teaching tag over every live gate (main.js:5891-5906)
      const tag = hintTex && g.alive && w.hero.alive && this.playing;
      v.hint.visible = !!tag;
      if (tag) {
        setPicture(v.hint, hintTex);
        v.hint.material.opacity = G.hint.alpha[0] + G.hint.alpha[1] * Math.sin(time * G.hint.rate);
        v.hint.scale.set(P.label.h * hintTex.userData.aspect, P.label.h, 1);
        v.hint.position.set(x, G.hint.y, z);
      }
    }
    for (; i < this.gates.length; i++) { this.gates[i].root.visible = false; this.gates[i].hint.visible = false; }

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
      this.bountyLabel.material.opacity = 1;
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
      gates: vis(this.gates, (v) => v.root.visible), beams: vis(this.gates, (v) => v.root.visible && v.laser.visible),
      hints: vis(this.gates, (v) => v.hint.visible), moths: vis(this.moths, (v) => v.root.visible),
      bounty: this.ring.visible && this.bountyLabel.visible, pools: this.pools?.count ?? 0,
      ping: this.ping.visible, floaters: this.floaters.filter((f) => f.s.visible).length,
    };
  }
}
