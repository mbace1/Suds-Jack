// actors.js — the hero, the gels, their bullets and what is left of them.
//
// Reads the world, never writes it. Every body is 1.x's satin gel (gel.js):
//   root (position) → squash (1.x's squash spring: tall-thin ↔ flat-wide)
//                   → body (1.x's per-frame shape: species silhouette ×
//                     breath × the smear it drags along the floor)
// A species with its own look (render/looks/, docs/SIM_CONTRACT.md) builds
// its own body and moves it in its own update. A bullet sets off a ripple from where it landed. A kill is 1.x's:
// the body thrashes, glows and swells to 2.3x for 0.28 s while chunks and
// droplets of goo fly out, squash where they land and shrink away, and a
// puddle with its satellites springs in and fades (splats.js); a big body's
// death sends a shockwave through the gels around it. Views are pooled per
// species, so a gel's material is built once and reused, never compiled
// mid-fight.
import * as THREE from 'three/webgpu';
import { TUNING } from '../tuning.js?v=17';
import * as TSL from 'three/tsl';
import { gelMaterial, domeGeometry, cubeGeometry, heroGeometry, GEL_TIME } from './gel.js?v=17';
import { LOOKS } from './looks/index.js?v=17';
import { JellyBody } from './jelly.js?v=17';
import { Juice } from './juice.js?v=17';
import { ArenaLight } from './light.js?v=17';
import { toSdf } from './sdf.js?v=17';
import { PickupView } from './pickups.js?v=17';

const T = TUNING;
const B = T.blob, D = T.death;
const rand = (a, b) => a + Math.random() * (b - a);
const BULLET_Y = 0.45;

export class Actors {
  constructor(scene, splats) {
    this.scene = scene; this.splats = splats; this.hx = 19; this.hz = 11; this.heat = 0;
    this.geo = { blob: domeGeometry(), cube: cubeGeometry(), hero: heroGeometry(), eye: new THREE.SphereGeometry(1, 12, 8) };
    this.views = new Map();      // live gels by id
    this.pool = {};              // released views by species
    this.gels = 'classic';       // how the gels are drawn: 'classic' meshes or 'sdf' fields (setGels)
    this.poolSdf = {};           // released SDF views by species: a view keeps the style it was built in
    this.dying = [];             // killed gels playing out their last beat
    this.jellies = [];           // big gels dying as jelly halves (jelly.js)
    this.jellyMats = new Map();  // their material, per species, built and warmed when it first appears
    // the cut's code, warmed while the game loads: cold, the first slice of a
    // run cost ~3x a warm one, a hitch on exactly the kill it decorates
    if (T.death.jelly.on) {
      const [a, b] = JellyBody.dome(1, 0.8).cut([0.1, 0, 0], [1, 0, 0]), buf = new Float32Array(a.vertexCount * 3);
      a.step(1 / 60); a.fill(buf, buf.slice()); void b;
    }

    this.hero = this._makeHero();
    scene.add(this.hero.root);
    this.juice = new Juice(scene);   // bullet comets, hit sparks, kill flashes and rings
    this.light = new ArenaLight();   // the light and shadow the floor reads (main.js draws it)
    this.pickups = new PickupView(scene, this);   // 1.x's drops, gates, convoy and bounty (render/pickups.js)

    const sphere = new THREE.SphereGeometry(1, 10, 8);
    this.bullets = new THREE.InstancedMesh(sphere, new THREE.MeshBasicNodeMaterial(), T.bullets.maxHero + T.bullets.maxGel);
    this.bullets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bullets.setColorAt(0, new THREE.Color());
    this.bullets.count = 0; this.bullets.frustumCulled = false;
    scene.add(this.bullets);

    // chunks of the dead: smooth goo for blobs, angular for cubes (1.x v83)
    this.chunkMax = 300;
    this.chunks = [];
    const chunkMat = () => new THREE.MeshPhysicalNodeMaterial({ roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.45 });
    this.chunkMesh = { blob: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), chunkMat(), this.chunkMax),
                       cube: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3), chunkMat(), this.chunkMax) };
    for (const m of Object.values(this.chunkMesh)) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, new THREE.Color());
      m.count = 0; m.frustumCulled = false;
      scene.add(m);
    }
    // lobs in flight and hazards on the floor
    this.lobMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalNodeMaterial({ roughness: 0.2, clearcoat: 1 }), 64);
    this.lobMesh.setColorAt(0, new THREE.Color()); this.lobMesh.count = 0; this.lobMesh.frustumCulled = false;
    this.hazMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicNodeMaterial({ transparent: true, opacity: 0.45, depthWrite: false }), 96);
    this.hazMesh.setColorAt(0, new THREE.Color()); this.hazMesh.count = 0; this.hazMesh.frustumCulled = false; this.hazMesh.renderOrder = -1;
    scene.add(this.lobMesh, this.hazMesh);
    this._m = new THREE.Matrix4(); this._c = new THREE.Color();
    this.lookCtx = { THREE, TSL, gelMaterial, GEL_TIME, geo: this.geo, T, scene };
  }

  // The arena this run plays on.
  setArena(hx, hz) { this.hx = hx; this.hz = hz; this.light.setArena(hx, hz); }

  _makeHero() {
    const L = T.heroLook, r = T.hero.radius;
    const root = new THREE.Group(), squash = new THREE.Group();
    const mat = gelMaterial(T.hero.color, 'blob', 1, { wobble: L.wobble, jelly: false });   // the hero stays 1.x's white satin
    mat.transparent = true; mat.opacity = L.opacity;      // 1.x: the dash and mercy blinks drive opacity (player.js:62-63)
    const body = new THREE.Mesh(this.geo.hero, mat);
    body.scale.setScalar(r);
    squash.add(body); root.add(squash);
    // 1.x's dash ghosts and muzzle pop (player.js:70-78, 99-108), pooled
    const ghostMat = new THREE.MeshBasicNodeMaterial({ color: L.ghost.color, transparent: true, opacity: 0, depthWrite: false });
    const ghosts = Array.from({ length: L.ghost.count }, () => { const m = new THREE.Mesh(this.geo.hero, ghostMat.clone()); m.visible = false; m.scale.setScalar(r); this.scene.add(m); return { mesh: m, life: 0 }; });
    const muzzle = new THREE.Mesh(this.geo.eye, new THREE.MeshBasicNodeMaterial({ color: L.muzzle.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    muzzle.visible = false; this.scene.add(muzzle);
    // 1.x's black oval eyes, facing the last shot. 1.x sat them a little
    // inside the body, so they vanished whenever it stretched toward its aim;
    // these stand just proud of the surface, with the glint in front.
    const black = new THREE.MeshBasicNodeMaterial({ color: 0x111111 }), white = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
    const eyes = new THREE.Group();
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      const ball = new THREE.Mesh(this.geo.eye, black);
      ball.scale.set(L.eye.r * L.eye.scale[0], L.eye.r * L.eye.scale[1], L.eye.r * L.eye.scale[2]);
      const glint = new THREE.Mesh(this.geo.eye, white);
      glint.scale.setScalar(L.eye.glint * 0.6);
      glint.position.set(0.02, 0.06, L.eye.r * L.eye.scale[2] * 0.9);
      eye.add(ball, glint);
      eye.position.set(s * L.eye.side, r + L.eye.up, L.eye.forward);
      eyes.add(eye);
    }
    root.add(eyes);
    return { root, squash, body, mat, eyes, ghosts, muzzle, muzzleT: 0 };
  }

  _makeGel(kind) {
    const S = T.species[kind], L = LOOKS[kind] || {};
    const root = new THREE.Group(), squash = new THREE.Group();
    const v = { kind, S, L, root, squash, phase: Math.random() * Math.PI * 2, vx: 0, vz: 0, yaw: 0, hit: 0, dyingT: 0 };
    if (L.build) {
      Object.assign(v, L.build({ ...this.lookCtx, S, kind }));     // { body, mat, own?, ...parts }
    } else {
      const fam = S.family === 'cube' ? 'cube' : 'blob';
      v.mat = gelMaterial(S.color, fam, 1);
      v.body = new THREE.Mesh(this.geo[fam], v.mat);
    }
    v.shape = !v.own && S.family !== 'cube' ? (B.shapes[kind] || B.shape) : null;
    squash.add(v.body); root.add(squash);
    v.style = this.gels;
    if (this.gels === 'sdf') v.sdf = toSdf(v);   // render/sdf.js: the dome and cube bodies as fields
    if (S.family === 'blob' && D.jelly.on && !this.jellyMats.has(kind)) this._jellyMat(kind);
    return v;
  }

  // A species' jelly-death material: its own colour as plain jelly, made when
  // the species first appears and drawn once out of sight so the pipeline is
  // compiled then, not at the first slice (a WebGPU compile mid-fight stalls)
  _jellyMat(kind) {
    const mat = gelMaterial(T.species[kind].color, 'blob', 1, { wobble: 0 });
    this.jellyMats.set(kind, mat);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.01, 0, 0, 0, 0, 0.01]), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    const warm = new THREE.Mesh(g, mat);
    warm.position.set(0, -50, 0); warm.frustumCulled = false;
    this.scene.add(warm);
    (this.warming ||= []).push({ mesh: warm, frames: 3 });
    return mat;
  }

  // A big blob dies as jelly (TUNING.death.jelly, jelly.js): a soft body of
  // its own size and shape, cut in two by a vertical blade along the line
  // from the hero through it, the halves pushed apart off the blade. False
  // when it does not qualify (or the cap is reached): then it pops as 1.x's.
  _sliceJelly(e, w, v) {
    const J = D.jelly, S = T.species[e.kind], mat = this.jellyMats.get(e.kind);
    if (!J.on || S?.family !== 'blob' || e.r < J.minRadius || !mat) return false;
    // a body you could not fully see (a CLOAKER cloaked or coming out of it)
    // dies its own way, fading: sliced, it would burst into solid jelly
    if (v?.mat && v.mat.opacity < 1) return false;
    if (new Set(this.jellies.map((j) => j.from)).size >= J.max) return false;
    const sh = B.shapes[e.kind] || B.shape, h = w?.hero;
    let dx = h ? e.x - h.x : 0, dz = h ? e.z - h.z : 1;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nrm = [-dz, 0, dx];                                   // square to the shot line
    const halves = JellyBody.dome(e.r * sh.x, e.r * sh.y).cut([0, 0, 0], nrm);
    halves.forEach((body, i) => {
      if (!body) return;
      const sgn = i === 0 ? 1 : -1;
      body.kick(nrm[0] * J.push * sgn + dx * J.push * 0.35, J.up, nrm[2] * J.push * sgn + dz * J.push * 0.35);
      const n = body.vertexCount, geo = new THREE.BufferGeometry();
      const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3), nor = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
      pos.setUsage(THREE.DynamicDrawUsage); nor.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', pos); geo.setAttribute('normal', nor);
      geo.setDrawRange(0, body.fill(pos.array, nor.array));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(e.x, 0, e.z); mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.jellies.push({ body, mesh, geo, from: e.id, age: 0 });
    });
    return true;
  }

  _take(kind) {
    const v = (this.gels === 'sdf' ? this.poolSdf : this.pool)[kind]?.pop() || this._makeGel(kind);
    v.vx = v.vz = 0; v.hit = 0; v.dyingT = 0;
    if (v.mat?.gel) { v.mat.gel.hit.value = 0; v.mat.gel.tear.value = 0; }
    v.mat?.emissive?.setScalar(0);
    v.L.reset?.(v);
    this.scene.add(v.root);
    return v;
  }

  _release(v) { this.scene.remove(v.root); v.root.scale.setScalar(1); ((v.style === 'sdf' ? this.poolSdf : this.pool)[v.kind] ||= []).push(v); }

  // The title's GELS switch: every view on the floor goes back to its pool and
  // the next sync takes them again in the new style. Pools are kept, never
  // disposed: some looks hang scene objects off each view.
  setGels(style) {
    style = style === 'sdf' ? 'sdf' : 'classic';
    if (style === this.gels) return;
    for (const v of this.views.values()) this._release(v);
    for (const v of this.dying) this._release(v);
    this.views.clear(); this.dying.length = 0;
    this.gels = style;
  }

  reset() {
    for (const v of this.views.values()) this._release(v);
    for (const v of this.dying) this._release(v);
    this.views.clear(); this.dying.length = 0; this.chunks.length = 0; this.heat = 0;
    for (const j of this.jellies) { this.scene.remove(j.mesh); j.geo.dispose(); }
    this.jellies.length = 0;
    this.juice.reset();
    this.light.reset();
    this.pickups.reset();
  }

  // the sim's events that only the view cares about
  onEvent(e, w) {
    this.juice.onEvent(e, w);
    this.light.onEvent(e);
    this.pickups.onEvent(e);
    if (e.type === 'ghost') {
      const G = T.heroLook.ghost, slot = this.hero.ghosts.reduce((a, b) => (a.life <= b.life ? a : b));
      slot.life = G.life; slot.mesh.position.set(e.x, 0, e.z); slot.mesh.visible = true;
    } else if (e.type === 'shot' && !e.round) {
      const M = T.heroLook.muzzle, hv = this.hero;
      hv.muzzle.position.set(e.x, M.y, e.z); hv.muzzleT = M.life; hv.muzzle.visible = true;
    } else if (e.type === 'lobLand') {
      const S = D.lobSplash;
      this.splats?.puddle(e.x, e.z, S.puddle, e.color);
      this.spray(e.x, e.z, S.droplets, e.color, S.dropletSize);
    } else if (e.type === 'hit') {
      const v = this.views.get(e.id), g = v && w.gels.find((x) => x.id === e.id);
      if (!v || !g || !v.mat?.gel) return;
      // the ripple starts where the bullet landed, in the body's own frame
      const dx = e.x - g.x, dz = e.z - g.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
      const lx = dx * c - dz * s, lz = dx * s + dz * c, l = Math.hypot(lx, lz) || 1;
      v.hit = 1; v.mat.gel.hitDir.value.set(lx / l, lz / l);
    } else if (e.type === 'kill') {
      this.burst(e, w);
      const v = this.views.get(e.id);
      if (!v) return;
      this.views.delete(e.id);
      if (this._sliceJelly(e, w, v)) { this._release(v); return; }
      v.dyingT = B.death;
      v.mat?.emissive?.setHex(e.color).lerp(_white, D.whiten);
      this.dying.push(v);
    }
  }

  // The rest of a kill, all at the killing hit (1.x onKill): goo thrown out,
  // the puddle and its satellites, and — for a big body — a shockwave.
  burst(e, w) {
    const big = e.r >= D.big, fam = T.species[e.kind]?.family === 'cube' ? 'cube' : 'blob', y = e.r * 0.8;
    this.heat = Math.min(1, this.heat + D.heatPerKill);
    const throwOut = (n, size, speed, up) => {
      for (let i = 0; i < n && this.chunks.length < this.chunkMax; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(...speed);
        this.chunks.push({ fam, x: e.x, y, z: e.z, vx: Math.cos(a) * sp, vy: rand(...up), vz: Math.sin(a) * sp,
          s: rand(...size), hex: e.color, life: D.chunkLife, sq: 1, sqV: 0 });
      }
    };
    throwOut(Math.round(rand(D.chunks[0], D.chunks[1] + 0.99) - 0.49), [D.chunkSize, D.chunkSize], D.chunkSpeed, D.chunkUp);
    throwOut(Math.round((e.boss ? D.dropletsBoss : big ? D.dropletsBig : D.droplets) * (1 + this.heat)), D.dropletSize, [D.dropletSpeed, D.dropletSpeed + 4 * (1 + 0.5 * this.heat)], D.dropletUp);
    if (this.splats) {
      this.splats.puddle(e.x, e.z, e.r * D.puddle, e.color);
      const sats = big ? 3 : this.heat > 0.5 ? 2 : 1;
      for (let i = 0; i < sats; i++) {
        const a = Math.random() * Math.PI * 2, d = rand(...D.satellites);
        this.splats.puddle(e.x + Math.cos(a) * d, e.z + Math.sin(a) * d, e.r * rand(...D.satelliteSize), e.color);
      }
    }
    if (big && w) {
      for (const g of w.gels) {
        const v = this.views.get(g.id);
        if (!v || !v.mat?.gel || g.id === e.id || g.state === 'appear' || Math.hypot(g.x - e.x, g.z - e.z) > D.shockRadius) continue;
        v.hit = Math.max(v.hit, D.shockRipple);
        const dx = g.x - e.x, dz = g.z - e.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw), l = Math.hypot(dx, dz) || 1;
        v.mat.gel.hitDir.value.set(-(dx * c - dz * s) / l, -(dx * s + dz * c) / l);
      }
    }
    return big;
  }

  sync(w, alpha, time) {
    // the hero
    const h = w.hero, hv = this.hero, L = T.heroLook;
    hv.root.position.set(h.px + (h.x - h.px) * alpha, 0, h.pz + (h.z - h.pz) * alpha);
    hv.squash.scale.set(1 / Math.sqrt(h.sq), h.sq, 1 / Math.sqrt(h.sq));
    hv.eyes.rotation.y = Math.atan2(h.aimX, h.aimZ);
    hv.root.visible = h.alive;
    // 1.x's feedback (player.js:266-282, 326-333): through mercy the body
    // blinks base + amp·|sin(rate·t)| and glows red; a dash blinks faster
    const blink = (B) => B.base + B.amp * Math.abs(Math.sin(time * B.rate));
    hv.mat.opacity = h.mercy > 0 ? blink(L.mercyBlink) : h.dash > 0 ? blink(L.dashBlink) : L.opacity;
    if (h.mercy > 0) hv.mat.emissive.setHex(L.flashColor); else hv.mat.emissive.setScalar(0);
    // the lunge the sim keeps (hero.stretch), into the gel's stretch
    hv.mat.gel.stretch.value = h.stretch || 0;
    hv.mat.gel.stretchDir.value.set(h.stretchX || 0, h.stretchZ || 0);

    // the gels
    const seen = new Set();
    for (const g of w.gels) {
      seen.add(g.id);
      let v = this.views.get(g.id);
      if (!v) { v = this._take(g.kind); this.views.set(g.id, v); }
      v.r = g.r;                                   // its real size: an elite is ×1.2, a boss ×1.5
      const x = g.px + (g.x - g.px) * alpha, z = g.pz + (g.z - g.pz) * alpha;
      v.root.position.set(x, 0, z);
      // velocity, smoothed the way 1.x smoothed it (0.3 a frame)
      v.vx += ((g.x - g.px) / T.sim.dt - v.vx) * 0.3;
      v.vz += ((g.z - g.pz) / T.sim.dt - v.vz) * 0.3;
      v.squash.scale.set(1 / Math.sqrt(g.sq), g.sq, 1 / Math.sqrt(g.sq));
      // the swell is the view's alone (the body is live from its first step): a
      // child never swells, and a brood still waiting out its parent's pop is not drawn
      v.root.visible = g.state !== 'appear';
      const grow = g.child || !(g.t < T.gel.swell) ? 1 : 0.15 + 0.85 * smooth(g.t / T.gel.swell);
      if (!v.own) this._shape(v, time, grow, g.tell);
      // 1.x's glow order (enemy.js:2650-2690): the hit flash, then a VOLATILE
      // body's smoulder, then a tell in the body's colour
      if (v.mat?.emissive) {
        if (g.flash > 0) v.mat.emissive.setScalar(v.mat.userData?.jelly ? D.hitFlashJelly : D.hitFlash);
        else if (g.affix === 'volatile') v.mat.emissive.setHex(T.variants.volatileGlow[Math.sin(time * T.variants.volatileHz) > 0 ? 0 : 1]);
        else if (g.tell > 0) v.mat.emissive.setHex(v.S.color).multiplyScalar(g.tell * (0.5 + 0.5 * Math.sin(time * 30)));
        else v.mat.emissive.setScalar(0);
      }
      v.L.update?.(v, g, w, time, grow);
    }
    for (const [id, v] of this.views) if (!seen.has(id)) { this._release(v); this.views.delete(id); }

    // bullets
    const bm = this.bullets;
    let n = 0;
    for (const bl of w.bullets) {
      const x = bl.px + (bl.x - bl.px) * alpha, z = bl.pz + (bl.z - bl.pz) * alpha;
      const s = bl.r * (bl.hero ? 1.05 : 1.15);
      this._m.makeScale(s, s, s).setPosition(x, BULLET_Y, z);
      bm.setMatrixAt(n, this._m);
      bm.setColorAt(n, this._c.setHex(bl.color));
      n++;
    }
    bm.count = n;
    bm.instanceMatrix.needsUpdate = true;
    if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
    this.juice.sync(w, alpha, BULLET_Y);
    this.light.sync(w, alpha, this.views);
    this.pickups.sync(w, alpha, time);

    // lobs in flight, hazards on the floor (a slow pulse, fading out at the end)
    let k = 0;
    for (const l of w.lobs) {
      if (k >= 64) break;
      const x = l.px + (l.x - l.px) * alpha, z = l.pz + (l.z - l.pz) * alpha;
      this._m.makeScale(l.size, l.size, l.size).setPosition(x, l.y, z);
      this.lobMesh.setMatrixAt(k, this._m); this.lobMesh.setColorAt(k, this._c.setHex(l.color)); k++;
    }
    this.lobMesh.count = k; this.lobMesh.instanceMatrix.needsUpdate = true;
    if (this.lobMesh.instanceColor) this.lobMesh.instanceColor.needsUpdate = true;
    k = 0;
    for (const z of w.hazards) {
      if (z.kind === 'poison') continue;          // 1.x's poison is invisible; the poured trail is the read
      if (k >= 96) break;
      const s = z.r * (0.94 + 0.06 * Math.sin(time * 5 + z.x)) * Math.min(1, z.life / 0.4, (z.max - z.life) / 0.15 + 0.2);
      this._m.makeScale(s, 1, s).setPosition(z.x, 0.015, z.z);
      this.hazMesh.setMatrixAt(k, this._m); this.hazMesh.setColorAt(k, this._c.setHex(z.color)); k++;
    }
    this.hazMesh.count = k; this.hazMesh.instanceMatrix.needsUpdate = true;
    if (this.hazMesh.instanceColor) this.hazMesh.instanceColor.needsUpdate = true;
  }

  // 1.x's per-frame body: silhouette × breath × the smear it drags along the
  // floor (nose lifts, rear drags), all anchored at the floor contact.
  _shape(v, time, grow, tell) {
    const r = (v.r ?? v.S.radius) * grow;
    const breathe = (v.kind === 'splitta' ? B.breatheAmpSplitta : B.breatheAmp) * Math.sin(time * B.breatheHz + v.phase);
    const sp = Math.hypot(v.vx, v.vz);
    if (sp > 0.4) v.yaw = Math.atan2(v.vx, v.vz);
    if (v.shape) {
      const drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax);
      const inflate = tell > 0 ? 0.12 * tell : 0;
      v.body.rotation.set(-drag * B.rearDragTilt, v.yaw, 0);
      v.body.scale.set(
        r * v.shape.x * (1 - breathe * 0.5) * (1 + inflate),
        r * v.shape.y * (1 + breathe - drag * 0.25) * (1 + inflate),
        r * v.shape.z * (1 - breathe * 0.5 + drag) * (1 + inflate));
    } else {
      v.body.rotation.set(0, v.yaw, 0);
      v.body.scale.set(r * (1 - breathe * 0.25), r * (1 + breathe * 0.5), r * (1 - breathe * 0.25));
    }
  }

  // droplets of goo thrown from a point (a lob's splash)
  spray(x, z, n, hex, size) {
    for (let i = 0; i < n && this.chunks.length < this.chunkMax; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6, sp = rand(2.5, 5.5);
      this.chunks.push({ fam: 'blob', x, y: 0.4, z, vx: Math.cos(a) * sp, vy: rand(2, 5), vz: Math.sin(a) * sp, s: rand(...size), hex, life: D.chunkLife, sq: 1, sqV: 0 });
    }
  }

  // Everything that runs on the frame clock rather than the sim's: ripples
  // dying out, the dying playing out their last beat, chunks in flight.
  stepFx(dt, time) {
    this.juice.step(dt);
    this.light.step(dt);
    this.pickups.stepFx(dt);
    // jelly halves: step, redraw, and in their last part slump into the puddle
    const J = D.jelly;
    for (let i = this.jellies.length - 1; i >= 0; i--) {
      const j = this.jellies[i];
      j.age += dt;
      j.body.step(Math.min(dt, 1 / 30));
      const pos = j.geo.attributes.position, nor = j.geo.attributes.normal;
      j.geo.setDrawRange(0, j.body.fill(pos.array, nor.array));
      pos.needsUpdate = true; nor.needsUpdate = true;
      const t = j.age / J.life, k = t <= J.shrinkFrom ? 1 : Math.max(0, 1 - (t - J.shrinkFrom) / (1 - J.shrinkFrom));
      j.mesh.scale.set(0.55 + 0.45 * k, k * k, 0.55 + 0.45 * k);
      if (j.age >= J.life) { this.scene.remove(j.mesh); j.geo.dispose(); this.jellies.splice(i, 1); }
    }
    if (this.warming?.length) {
      for (let i = this.warming.length - 1; i >= 0; i--) if (--this.warming[i].frames <= 0) { this.scene.remove(this.warming[i].mesh); this.warming[i].mesh.geometry.dispose(); this.warming.splice(i, 1); }
    }
    // the hero's ghosts fade and shrink; the muzzle pop swells and fades
    const hv = this.hero, L = T.heroLook;
    for (const g of hv.ghosts) {
      if (g.life <= 0) continue;
      g.life -= dt;
      const t = Math.max(0, g.life / L.ghost.life);
      g.mesh.material.opacity = L.ghost.opacity * t;
      g.mesh.scale.setScalar(T.hero.radius * (L.ghost.scale + (1 - L.ghost.scale) * t));
      g.mesh.visible = g.life > 0;
    }
    if (hv.muzzleT > 0) {
      hv.muzzleT -= dt;
      const t = Math.max(0, hv.muzzleT / L.muzzle.life);
      hv.muzzle.material.opacity = L.muzzle.opacity * t;
      hv.muzzle.scale.setScalar(L.muzzle.r * (L.muzzle.scale[1] - (L.muzzle.scale[1] - L.muzzle.scale[0]) * t));
      hv.muzzle.visible = hv.muzzleT > 0;
    }
    for (const v of this.views.values()) {
      if (v.hit > 0) { v.hit = Math.max(0, v.hit - dt / B.hitRipple); if (v.mat?.gel) v.mat.gel.hit.value = v.hit; }
    }
    // the dying: 1.x updateDeath — swell to 2.3x and thrash out over 0.28 s
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const v = this.dying[i];
      v.dyingT -= dt;
      const t = Math.min(1, 1 - v.dyingT / B.death);
      // 1.x destroy(): the squash resets and the body pops as a uniform dome
      // of its own size × (1 + 1.3t) (enemy.js:2968-2984, 3013-3029)
      v.squash.scale.setScalar(1);
      if (v.own) v.root.scale.setScalar(1 + t * B.deathSwell);
      else v.body.scale.setScalar((v.r ?? v.S.radius) * (1 + t * B.deathSwell));
      if (v.mat?.gel) v.mat.gel.tear.value = Math.max(0, v.dyingT / B.death);
      if (v.dyingT <= 0) { this._release(v); this.dying.splice(i, 1); }
    }
    this.heat = Math.max(0, this.heat - D.heatDecay * dt);

    // goo in flight: 1.x's chunk physics — gravity, a squash and a skid where
    // it lands, its own wobble, and a shrink over its last moments
    const HX = this.hx, HZ = this.hz, k = Math.min(3, dt * 60);
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      if ((c.life -= dt) <= 0) { this.chunks.splice(i, 1); continue; }
      c.vy -= D.gravity * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (c.y < c.s * 0.5) {
        c.y = c.s * 0.5;
        if (c.vy < 0) { c.sqV -= 0.4 * Math.abs(c.vy) * 0.25; c.vy = 0; c.vx *= D.floorKeep; c.vz *= D.floorKeep; }
      }
      c.sqV = (c.sqV - (c.sq - 1) * 0.32 * k) * Math.pow(0.8, k);
      c.sq = Math.max(0.3, Math.min(1.7, c.sq + c.sqV * k));
      if (Math.abs(c.x) > HX - c.s) { c.x = Math.sign(c.x) * (HX - c.s); c.vx *= -0.4; }
      if (Math.abs(c.z) > HZ - c.s) { c.z = Math.sign(c.z) * (HZ - c.s); c.vz *= -0.4; }
    }
    const n = { blob: 0, cube: 0 };
    for (const c of this.chunks) {
      const fade = Math.min(1, c.life / D.shrink), s = c.s * fade, sx = s / Math.sqrt(c.sq);
      this._m.makeScale(sx, s * c.sq, sx).setPosition(c.x, c.y, c.z);
      const m = this.chunkMesh[c.fam];
      m.setMatrixAt(n[c.fam], this._m); m.setColorAt(n[c.fam], this._c.setHex(c.hex)); n[c.fam]++;
    }
    for (const [fam, m] of Object.entries(this.chunkMesh)) {
      m.count = n[fam];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}

const _white = new THREE.Color(0xffffff);
const smooth = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
