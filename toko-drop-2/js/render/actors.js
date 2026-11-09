// actors.js — the hero, the gels, their bullets and what is left of them.
//
// Reads the world, never writes it. Every body is 1.x's satin gel (gel.js):
//   root (position) → squash (1.x's squash spring: tall-thin ↔ flat-wide)
//                   → body (1.x's per-frame shape: species silhouette ×
//                     breath × the smear it drags along the floor)
// A species with its own look (render/looks/, docs/SIM_CONTRACT.md) builds
// its own body and moves it in its own update. A bullet sets off a ripple from where it landed. A kill is 1.x's:
// the body thrashes, glows and swells to 2.3x for 0.28 s while chunks of goo
// fly out, squash where they land and shrink away; a big body's death sends a
// shockwave through the gels around it. The goo itself is 2.0's (goo.js):
// droplets with volume that fly, ride the bodies they meet, splash, slide and
// pool on the floor, which dries to a stain. With the goo off (`?goo=off`)
// it is 1.x's again: droplets as chunks, and a puddle with its satellites
// that springs in and fades (splats.js). Views are pooled per species, so a
// gel's material is built once and reused, never compiled mid-fight.
import * as THREE from 'three/webgpu';
import { TUNING } from '../tuning.js?v=127';
import * as TSL from 'three/tsl';
import { gelMaterial, domeGeometry, cubeGeometry, heroGeometry, GEL_TIME } from './gel.js?v=127';
import { LOOKS } from './looks/index.js?v=127';
import { styleName, setStyle as setStyleMode, styledBody } from './style.js?v=127';
import { JellyBody } from './jelly.js?v=127';
import { Juice } from './juice.js?v=127';
import { ArenaLight } from './light.js?v=127';
import { toSdf } from './sdf.js?v=127';
import { PickupView } from './pickups.js?v=127';
import { ChallengeView } from './challenge.js?v=127';
import { PostView } from './posts.js?v=127';
import { SlamView } from './slam.js?v=127';
import { HintView } from './hints.js?v=127';
import { Goo } from './goo.js?v=127';
import { mult as heatMult } from '../sim/heat.js?v=127';
import { strands as liveStrands } from '../sim/formation.js?v=127';

const T = TUNING;
const B = T.blob, D = T.death;
// v114: how much of itself a big body has lost — it draws a little smaller as its life goes (TUNING.sizes.wear)
const worn = (g) => (g.size >= 3 && g.maxHp > 0 ? 1 - T.sizes.wear.shrink * (1 - Math.max(0, g.hp) / g.maxHp) : 1);
const rand = (a, b) => a + Math.random() * (b - a);
const BULLET_Y = 0.45;

export class Actors {
  // `goo: false` keeps 1.x's droplets and puddles instead of the goo
  constructor(scene, splats, { goo = true } = {}) {
    this.scene = scene; this.splats = splats; this.hx = 19; this.hz = 11; this.heat = 0;
    this.geo = { blob: domeGeometry(), cube: cubeGeometry(), hero: heroGeometry(), eye: new THREE.SphereGeometry(1, 12, 8) };
    this.views = new Map();      // live gels by id
    this.gels = 'classic';       // how the gels are drawn: 'classic' meshes or 'sdf' fields (setGels)
    this.look = styleName();     // v92: how they are painted: 'physical', 'cel' or 'watercolor' (setStyle, render/style.js)
    this.pools = {};             // released views by species, per gels × look: a view keeps the style it was built in (_pool)
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
    this.challenge = new ChallengeView(scene);    // a campaign room's ring, heart, orbs and lit body (render/challenge.js)
    this.posts = new PostView(scene);             // v108: what stands on a later world's floor (render/posts.js)
    this.slams = new SlamView(scene, this);       // v112: a giant gathering for its slam, and landing it (render/slam.js)
    this.hints = new HintView(scene);             // v115: STEP OUT! and CLEAR THE LANE!, until this browser has learned them (render/hints.js)
    // droplets and the floor's film (render/goo.js); main.js steps the film.
    // The kit is always built (the floor reads its film); `goo` is it while
    // the title's SPLATTER switch is on, and null while 1.x's puddles stand in
    this.gooKit = new Goo(scene);
    this.goo = goo ? this.gooKit : null;

    const sphere = new THREE.SphereGeometry(1, 10, 8);
    // v104 (owner: "No cheap effects like glow"): a bullet reads by its OWN shading — a white-hot core, its
    // colour, a dark rim at its edge — where an additive halo and trail used to carry it (render/juice.js, off).
    // Its colour rides its own attribute: an instance colour would multiply whatever the shader made of it
    {
      const cap = T.bullets.maxHero + T.bullets.maxGel, BL = T.bullets.look, geo = new THREE.SphereGeometry(1, 16, 12);
      this.bCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('bCol', this.bCol);
      const mat = new THREE.MeshBasicNodeMaterial(), nz = TSL.normalView.z.abs(), bc = TSL.attribute('bCol', 'vec3');
      const body = TSL.mix(bc.mul(BL.rim[2]), bc, TSL.smoothstep(BL.rim[0], BL.rim[1], nz));
      mat.colorNode = TSL.mix(body, TSL.vec3(1, 1, 1), TSL.smoothstep(BL.core[0], BL.core[1], nz).mul(BL.core[2]));
      this.bullets = new THREE.InstancedMesh(geo, mat, cap);
    }
    // v76: the caustics — light focused through each body onto the floor round its foot
    // (TUNING.light.arena.caustic): an additive quad per body in its colour, a core under
    // it, a shimmering ring of arcs at its edge and a faint glow out to the quad's rim
    {
      const C = T.light.arena.caustic, q = TSL.uv().sub(0.5).mul(2), d = TSL.length(q), ang = TSL.atan(q.y, q.x);
      const ph = TSL.fract(TSL.instanceIndex.toFloat().mul(0.618)).mul(6.2832);
      const core = TSL.pow(TSL.clamp(TSL.float(1).sub(d.div(C.core)), 0, 1), 2);
      const arcs = TSL.sin(ang.mul(C.lobes).add(GEL_TIME.mul(C.shimmer)).add(ph)).mul(0.5).add(0.5);
      const ring = TSL.float(1).sub(TSL.smoothstep(0, C.ring[1], TSL.abs(d.sub(C.ring[0])))).mul(C.ring[2]).mul(arcs.mul(0.7).add(0.3));
      const glow = TSL.pow(TSL.clamp(TSL.float(1).sub(d), 0, 1), 3).mul(C.glow);
      const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      mat.opacityNode = core.add(ring).add(glow).mul(C.k);
      this.caustics = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat, C.cap);
      this.caustics.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.caustics.setColorAt(0, new THREE.Color());
      this.caustics.count = 0; this.caustics.frustumCulled = false; this.caustics.renderOrder = 1;
      scene.add(this.caustics);
    }
    this.bullets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bullets.count = 0; this.bullets.frustumCulled = false;
    scene.add(this.bullets);
    // v103: a corpse that bites warns first (sim/world.js plantSeed): a SEED on the corpse, swelling and
    // blinking toward the shot, and a bar on the floor along every line a bullet will take, growing out —
    // solid, in the corpse fire's own colour, no glow
    {
      const V = T.revenge.view, inst = (geo, n) => {
        const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicNodeMaterial(), n);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.setColorAt(0, new THREE.Color());
        m.count = 0; m.frustumCulled = false; scene.add(m); return m;
      };
      this.seeds = inst(sphere, V.maxSeeds);
      this.ticks = inst(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0, 0), V.maxTicks);   // a unit bar along +x from its foot
      // and an arrowhead at each bar's tip, flat on the floor and pointing out: the kill's goo strands radiate
      // from the same corpse in the same colour, and a line with a head is the one that says "a shot goes here"
      const head = new THREE.BufferGeometry();
      head.setAttribute('position', new THREE.Float32BufferAttribute([1, 0, 0, 0, 0, -0.5, 0, 0, 0.5], 3)); head.computeVertexNormals();
      this.heads = inst(head, V.maxTicks); this.heads.material.side = THREE.DoubleSide;
    }

    // chunks of the dead: smooth goo for blobs, angular for cubes (1.x v83)
    this.chunkMax = 300;
    this.chunks = [];
    const chunkMat = () => this._chunkMat();
    this.chunkMesh = { blob: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), chunkMat(), this.chunkMax),
                       cube: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3), chunkMat(), this.chunkMax) };
    for (const m of Object.values(this.chunkMesh)) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, new THREE.Color());
      m.count = 0; m.frustumCulled = false;
      scene.add(m);
    }
    // v83: the strands — a tube of goo from the burst to each chunk, thinning as it stretches, until it snaps
    this.strands = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0), chunkMat(), this.chunkMax);
    this.strands.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.strands.setColorAt(0, new THREE.Color());
    this.strands.count = 0; this.strands.frustumCulled = false; this.strandCount = 0;
    scene.add(this.strands);
    // v106: a linked PAIR's strand (sim/formation.js) — a cord of the pair's goo from one body to the other, in
    // `segs` pieces that wave a little across their line, thinner the further it is stretched; the same goo as a
    // burst's strands, so it reads as made of them, never as a beam
    {
      const C = T.forms.pair.view;
      this.cords = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 7, 1, true).translate(0, 0.5, 0), chunkMat(), C.max * C.segs);
      this.cords.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.cords.setColorAt(0, new THREE.Color());
      this.cords.count = 0; this.cords.frustumCulled = false;
      scene.add(this.cords);
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
  setArena(hx, hz) { this.hx = hx; this.hz = hz; this.light.setArena(hx, hz); this.gooKit.setArena(hx, hz); }
  // the SPLATTER switch: off clears what is thrown and laid, and 1.x's puddles take over
  setGoo(on) { if (!on) this.gooKit.clear(); this.gooKit.setOn(on); this.goo = on ? this.gooKit : null; }

  // the hero's material: 1.x's white satin (never jelly), in the style of the day (v92); the dash and mercy
  // blinks drive its opacity (1.x player.js:62-63)
  _heroMat() {
    const L = T.heroLook, mat = gelMaterial(T.hero.color, 'blob', 1, { wobble: L.wobble, jelly: false });
    mat.transparent = true; mat.opacity = L.opacity;
    return mat;
  }
  // a chunk's or a strand's material (v83): glossy physical goo, or the style's own paint over the instance's colour (v92)
  _chunkMat() {
    const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.45 });
    const look = styleName();
    if (look !== 'physical') m.fragmentNode = TSL.vec4(styledBody(look, TSL.instanceColor.mul(TSL.materialColor), TSL.positionLocal.xz, TSL.vec3(...T.light.sun.position)), 1);
    return m;
  }

  _makeHero() {
    const L = T.heroLook, r = T.hero.radius;
    const root = new THREE.Group(), squash = new THREE.Group();
    const mat = this._heroMat();
    const body = new THREE.Mesh(this.geo.hero, mat);
    body.scale.setScalar(r);
    squash.add(body); root.add(squash);
    // 1.x's dash ghosts and muzzle pop (player.js:70-78, 99-108), pooled
    // v76: a ghost is lit at its rim (the fresnel × `rim` over its opacity), so it reads as
    // the body's outline left behind rather than a blue blot, and keeps the body's squash
    // v116: one graph for every ghost, reading its own fade off its material (a graph a ghost was a shader build
    // a ghost: the run's first dash built one, a later dash the next)
    const ghostMat = new THREE.MeshBasicNodeMaterial({ color: L.ghost.color, transparent: true, opacity: 0, depthWrite: false });
    const ghostOpacity = TSL.materialReference('userData.fade.value', 'float').mul(TSL.float(1).add(TSL.float(1).sub(TSL.normalView.z.abs()).pow(2).mul(L.ghost.rim)));
    const ghosts = Array.from({ length: L.ghost.count }, () => {
      const mat = ghostMat.clone(), fade = TSL.uniform(0);
      mat.userData.fade = fade; mat.opacityNode = ghostOpacity;
      const m = new THREE.Mesh(this.geo.hero, mat); m.visible = false; m.scale.setScalar(r); this.scene.add(m);
      return { mesh: m, life: 0, fade, sq: new THREE.Vector3(1, 1, 1) };
    });
    const muzzle = new THREE.Mesh(this.geo.eye, new THREE.MeshBasicNodeMaterial({ color: L.muzzle.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    muzzle.visible = false; this.scene.add(muzzle);
    // HEAT (v52): a soft halo on the floor under the hero, warmer and wider as the multiplier climbs
    // v104 (owner: "No cheap effects like glow"): a crisp RING on the floor, not an additive glow — the heat's
    // colour and width say the same as the glow did, and the floor shows through its middle
    const haloMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    {
      const R = T.heat.view.ring, d = TSL.length(TSL.uv().sub(TSL.vec2(0.5, 0.5))), aa = TSL.fwidth(d).mul(1.5);
      const band = TSL.smoothstep(TSL.float(R.inner).sub(aa), TSL.float(R.inner).add(aa), d).mul(TSL.float(1).sub(TSL.smoothstep(TSL.float(0.5).sub(aa).sub(0.005), TSL.float(0.5).sub(0.005), d)));
      haloMat.opacityNode = band.mul(TSL.materialOpacity);
    }
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), haloMat);
    halo.visible = false; halo.renderOrder = 1; this.scene.add(halo);
    // 1.x's black oval eyes, facing the last shot. 1.x sat them a little
    // inside the body, so they vanished whenever it stretched toward its aim;
    // these stand just proud of the surface, with the glint in front.
    const black = new THREE.MeshBasicNodeMaterial({ color: 0x111111 }), white = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
    const eyes = new THREE.Group();
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      const ball = new THREE.Mesh(this.geo.eye, black);
      ball.scale.set(L.eye.r * L.eye.scale[0], L.eye.r * L.eye.scale[1], L.eye.r * L.eye.scale[2]);
      // v96 (the style sheet's eyes): a big white highlight in the upper part, a small dot lower right
      const front = L.eye.r * L.eye.scale[2] * 0.9, Hi = L.eye.hi, Dt = L.eye.dot;
      const glint = new THREE.Mesh(this.geo.eye, white);
      glint.scale.set(Hi.size[0], Hi.size[1], 0.012);
      glint.position.set(Hi.at[0], Hi.at[1], front);
      const dot = new THREE.Mesh(this.geo.eye, white);
      dot.scale.setScalar(Dt.r);
      dot.position.set(Dt.at[0], Dt.at[1], front);
      eye.add(ball, glint, dot);
      eye.position.set(s * L.eye.side, r + L.eye.up, L.eye.forward);
      eyes.add(eye);
    }
    root.add(eyes);
    return { root, squash, body, mat, eyes, ghosts, muzzle, halo, muzzleT: 0 };
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
    v.style = this.gels; v.look = this.look;
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

  // A HEAVY body (sim/worlds.js, from world 2): the gel you know, bigger
  // (the sim's radius), and denser — a darker colour that light gets less
  // far into. A pooled view is put back to its own colour for the next body.
  // The SDF bodies share one material a species, so they are only bigger.
  // v105: and a SIZE CLASS (TUNING.sizes, sizeLook): a mite paler, a brute and a tank denser, a giant in its
  // own colour — the species' hue turned, deeper and more saturated — so a giant reads as another animal
  _heavy(v, on, size = on ? 3 : 2) {
    const m = v.mat;
    if (!m?.color || v.sdf) return;
    if (!v.base) v.base = { color: m.color.clone(), att: m.attenuationColor?.clone(), dist: m.attenuationDistance };
    const H = T.worlds.heavyLook, Z = T.sizes.look;
    m.color.copy(v.base.color);
    if (v.base.att) m.attenuationColor.copy(v.base.att);
    const dk = size === 3 ? Z.brute : size === 4 ? H.darken : 1;
    if (size === 1) { m.color.lerp(_white, Z.mite); if (m.attenuationColor) m.attenuationColor.lerp(_white, Z.mite); }
    else if (size === 5) {
      for (const c of [m.color, m.attenuationColor]) {
        if (!c) continue;
        c.getHSL(_hsl); c.setHSL((_hsl.h + Z.giant.hue + 1) % 1, Math.min(1, _hsl.s * Z.giant.sat), _hsl.l * Z.giant.light);
      }
    } else if (dk !== 1) { m.color.multiplyScalar(dk); if (m.attenuationColor) m.attenuationColor.multiplyScalar(dk); }
  }

  _take(kind) {
    const v = this._pool()[kind]?.pop() || this._makeGel(kind);
    v.vx = v.vz = 0; v.hit = 0; v.dyingT = 0; v.cd = v.cb = 0; v.press = null;
    if (v.mat?.gel) { v.mat.gel.hit.value = 0; v.mat.gel.tear.value = 0; v.mat.gel.contact?.value.set(0, 0, 0, 0); }
    v.mat?.emissive?.setScalar(0);
    v.L.reset?.(v);
    this.scene.add(v.root);
    return v;
  }

  _release(v) { this.scene.remove(v.root); v.root.scale.setScalar(1); (this._pool(v.style, v.look)[v.kind] ||= []).push(v); }
  _pool(gels = this.gels, look = this.look) { return (this.pools[`${gels}:${look}`] ||= {}); }

  // v74: every species' shaders compiled on the title, not on the frame its
  // first body is drawn mid-run. One kind a frame (a take is a build, and
  // forty at once would hold a frame): taken as a spawn takes it, drawn once
  // tiny and far under the floor — the pickups' and the jelly's older trick,
  // which compiles the pipeline in that frame's own draw (an async compile
  // would leave a pipeline three draws with before it resolves) — and put
  // back in its pool the frame after, where a run's first body of that kind
  // finds it with its materials, which is what keeps the pipeline cached.
  // After the species, the challenge's pieces and whatever `extra` steps the
  // game adds ({ on, off }: the drain). True while there is more to do
  warmStep(extra = []) {
    this._unholdWarm();
    if (!this.warmQueue) this.warmQueue = [...Object.keys(T.species).map((kind) => ({ kind })), { on: () => this.challenge.warm(true), off: () => this.challenge.warm(false) },
      { on: () => this._warmFx(true), off: () => this._warmFx(false) }, ...extra];
    const step = this.warmQueue.shift();
    if (!step) return false;
    try {
      if (step.kind) {
        const v = this._take(step.kind);
        v.root.position.set(0, -50, 0); v.root.scale.setScalar(1e-4);
        v.root.traverse((o) => { o.userData.warmCull = o.frustumCulled; o.frustumCulled = false; });
        this.warmHeld = { v };
      } else { step.on(); this.warmHeld = step; }
    } catch (e) { console.warn('warm-up step skipped:', e); this.warmHeld = null; }
    return true;
  }

  // the step the warm-up holds, let go: a body back to its pool, the challenge's pieces back where they are drawn.
  // v125 (the state audit): reset() does it too — a campaign room skips the intro, so a run could start while the
  // title's warm-up held a step, and the challenge's group stayed 50 m under the floor at 1/10000 of its size: a
  // HOLD ring, a heart, the orbs, invisible for the whole room
  _unholdWarm() {
    const held = this.warmHeld;
    if (!held) return;
    this.warmHeld = null;
    if (held.v) { held.v.root.traverse((o) => { if (o.userData.warmCull !== undefined) { o.frustumCulled = o.userData.warmCull; delete o.userData.warmCull; } }); this._release(held.v); }
    else held.off();
  }

  // v116: what a run's first seconds draw for the first time — the light map's first pool and shadow, the goo's
  // first stamp on the floor and the wall, the hero's heat ring, a dash ghost, the muzzle pop — drawn once on the
  // title at nothing's size or opacity, so their shaders compile here and not on the run's first shot, kill or dash
  // (measured: a first run compiled them in world 1's first second, and the first dash's ghost at its own)
  _warmFx(on) {
    const hv = this.hero;
    this.light.warm(on);
    for (const m of [hv.halo, hv.muzzle, hv.ghosts[0].mesh]) m.visible = on;
    if (!on) return;
    hv.halo.material.opacity = 0; hv.muzzle.material.opacity = 0; hv.ghosts[0].fade.value = 0;
    this.goo?.warm();
  }

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

  // The STYLE switch (render/style.js, v92): the bodies are built in a style, so every view goes back to its
  // pool (kept per gels × look, as above) and the next sync takes them again; the hero's material is rebuilt
  // in place, the chunks' and the strands' too; the jelly-death materials are let go, to be made again in the
  // style when their species shows; and the title's warm-up runs again (main.js sets `warming`)
  setStyle(look) {
    look = setStyleMode(look);
    if (look === this.look) return;
    for (const v of this.views.values()) this._release(v);
    for (const v of this.dying) this._release(v);
    this.views.clear(); this.dying.length = 0;
    this.look = look;
    const hv = this.hero, old = hv.mat;
    hv.mat = this._heroMat(); hv.body.material = hv.mat; old.dispose();
    for (const m of [...Object.values(this.chunkMesh), this.strands, this.cords]) { const o = m.material; m.material = this._chunkMat(); o.dispose(); }
    this.jellyMats.clear();
    this.warmQueue = null;
  }

  reset() {
    this._unholdWarm();
    for (const v of this.views.values()) this._release(v);
    for (const v of this.dying) this._release(v);
    this.views.clear(); this.dying.length = 0; this.chunks.length = 0; this.heat = 0;
    for (const m of Object.values(this.chunkMesh)) m.count = 0;   // v127: stepFx draws them, and nothing steps on the title
    this.strands.count = this.strandCount = 0; this.cords.count = 0;
    for (const j of this.jellies) { this.scene.remove(j.mesh); j.geo.dispose(); }
    this.jellies.length = 0;
    this.juice.reset();
    this.light.reset();
    this.caustics.count = 0;
    // v127: and what sync fills afresh every frame from the world — on the title nothing syncs, so these held the
    // run's last frame (its bullets in the air, the corpse fire's seeds and lines, the lobs and the puddles)
    this.bullets.count = 0; this.seeds.count = this.ticks.count = this.heads.count = 0; this.lobMesh.count = this.hazMesh.count = 0;
    this.pickups.reset();
    this.challenge.reset();
    this.posts.reset();
    this.slams.reset();
    this.hints.reset();
    this.goo?.clear();
    for (const L of Object.values(LOOKS)) L.clear?.();   // v127: what a species keeps in a pool of its own (YELA's slime, PYRA's chunks)
    this._restHero();
  }

  // v127: the hero as the title first stands it — at the middle, whole and still, nothing of a run on it (a dash's
  // ghosts, the muzzle's pop, the HEAT halo). The title after a run kept the run's last pose of it: gone after a
  // death, shrunk mid-vortex, its halo burning where it last stood
  _restHero() {
    const hv = this.hero;
    hv.root.position.set(0, 0, 0); hv.root.scale.set(1, 1, 1); hv.squash.scale.set(1, 1, 1); hv.root.visible = true;
    hv.mat.opacity = T.heroLook.opacity;
    for (const g of hv.ghosts) { g.life = 0; g.mesh.visible = false; }
    hv.muzzleT = 0; hv.muzzle.visible = false; hv.halo.visible = false;
  }

  // the sim's events that only the view cares about
  onEvent(e, w) {
    this.juice.onEvent(e, w);
    this.light.onEvent(e);
    this.pickups.onEvent(e);
    if (this.goo) this._gooEvent(e, w);
    if (e.type === 'ghost') {
      const G = T.heroLook.ghost, slot = this.hero.ghosts.reduce((a, b) => (a.life <= b.life ? a : b));
      slot.life = G.life; slot.mesh.position.set(e.x, 0, e.z); slot.mesh.visible = true;
      slot.sq.copy(this.hero.squash.scale);   // v76: the body's squash of the moment
      if (this.light.bursts.length < T.light.arena.burstCap) this.light.bursts.push({ x: e.x, z: e.z, r: G.streak.r, k: G.streak.k, life: G.streak.life, max: G.streak.life, hex: G.color });   // and light on the floor under it
    } else if (e.type === 'shot' && !e.round) {
      const M = T.heroLook.muzzle, hv = this.hero;
      hv.muzzle.position.set(e.x, M.y, e.z); hv.muzzleT = M.life; hv.muzzle.visible = true;
    } else if (e.type === 'lobLand' && !this.goo) {
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
      // v114: a big body hit sheds a little of its goo where the shot went in (a bullet sponge you can see soaking it up)
      const Wr = T.sizes.wear, every = Wr.every[g.size];
      if (every && ((v.shed = (v.shed ?? 0) + 1) % every === 0)) this.spray(e.x, e.z, Wr.n[g.size], T.species[g.kind].color, Wr.size);
    } else if (e.type === 'slam') {
      this.slams.onEvent(e);   // v112
    } else if (e.type === 'postHit') {
      // v108: a bullet that dies on a post spits a little of its colour there
      if ((this._postHitN = (this._postHitN ?? 0) + 1) % 2 === 0) this.spray(e.x, e.z, 2, e.color ?? 0xffffff, [0.05, 0.09]);
    } else if (e.type === 'strandCut') {
      // v106: a strand snaps: a spit of the pair's goo where it parted
      const C = T.forms.pair.view, hex = T.species[e.kind]?.color ?? 0xffffff;
      this.spray(e.x, e.z, C.snap, hex, C.snapSize);
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
        const a = Math.random() * Math.PI * 2, sp = rand(...speed), s = rand(...size);
        // v83: it trails a strand from where the body stood (ox, oy, oz), and melts into `vol` of goo at the end
        this.chunks.push({ fam, x: e.x, y, z: e.z, vx: Math.cos(a) * sp, vy: rand(...up), vz: Math.sin(a) * sp,
          s, hex: e.color, life: D.burstLife ?? D.chunkLife, sq: 1, sqV: 0, ox: e.x, oy: y * 0.6, oz: e.z, age: 0, strand: true, bounces: 0, rest: false, vol: D.melt.vol * VOLC * s * s * s });
      }
    };
    throwOut(Math.round(rand(D.chunks[0], D.chunks[1] + 0.99) - 0.49), [D.chunkSize, D.chunkSize], D.chunkSpeed, D.chunkUp);
    if (!this.goo) throwOut(Math.round((e.boss ? D.dropletsBoss : big ? D.dropletsBig : D.droplets) * (1 + this.heat)), D.dropletSize, [D.dropletSpeed, D.dropletSpeed + 4 * (1 + 0.5 * this.heat)], D.dropletUp);
    if (this.splats && !this.goo) {
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

  // What throws goo (TUNING.goo.emit). Every spray comes out of the body at
  // the height it would, the way the blow that made it went.
  _gooEvent(e, w) {
    const E = T.goo.emit, goo = this.goo, h = w?.hero;
    const color = (kind) => T.species[kind]?.color ?? 0xffffff;
    if (e.type === 'kill') {
      // all round, and `exit` of it on through, the way the shot or the dash went
      const K = E.kill, R = e.r;
      let dx = 0, dz = 0;
      if (e.src === 'dash' && h) { dx = h.dashX; dz = h.dashZ; } else if (h) { dx = e.x - h.x; dz = e.z - h.z; }
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const n = Math.round((K.base + K.perR * R) * (1 + K.heat * this.heat)), nx = Math.round(n * K.exit), y = R * 0.8;
      goo.spray(e.x, y, e.z, n - nx, e.color, { speed: K.speed, up: K.up });
      goo.spray(e.x + dx * R * 0.5, y, e.z + dz * R * 0.5, nx, e.color, { dx, dz, cone: K.exitCone, speed: K.speed.map((s) => s * K.exitBoost), up: K.up });
      goo.puddle(e.x, e.z, R * K.puddleR, K.puddle * R * R, e.color);
    } else if (e.type === 'hit') {
      // back out of the entry toward the gun, and a few out of the far side
      const H = E.hit, g = w?.gels.find((x) => x.id === e.id);
      if (!g) return;
      let ox = e.x - g.x, oz = e.z - g.z; const l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l;
      goo.spray(e.x, BULLET_Y, e.z, H.count, color(e.kind), { dx: ox, dz: oz, cone: H.cone, speed: H.speed, up: H.up, size: H.size });
      goo.spray(g.x - ox * g.r, BULLET_Y, g.z - oz * g.r, H.through, color(e.kind), { dx: -ox, dz: -oz, cone: 0.35, speed: H.speed, up: H.up, size: H.size });
    } else if (e.type === 'lobLand') {
      const L = E.lob;
      goo.spray(e.x, 0.3, e.z, L.count, e.color, { speed: L.speed, up: L.up });
      goo.puddle(e.x, e.z, L.puddleR, L.puddle, e.color);
    } else if (e.type === 'shove') {
      // the dash shoves a body: it slops forward off the way it was knocked
      const S = E.shove, g = w?.gels.find((x) => x.id === e.id);
      if (!g || !h) return;
      let dx = g.x - h.x, dz = g.z - h.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      goo.spray(g.x, g.r * 0.7, g.z, S.count, color(g.kind), { dx, dz, cone: S.cone, speed: S.speed, up: S.up, inherit: [g.kx * S.inherit, g.kz * S.inherit] });
    } else if (e.type === 'dashCut') {
      // the CUT: two sheets out of the sides of the blade, a few on along it, and its streak
      const C = E.cut, g = w?.gels.find((x) => x.id === e.id);
      if (!g || !h) return;
      const hex = color(g.kind), l = Math.hypot(h.dashX, h.dashZ) || 1, dx = h.dashX / l, dz = h.dashZ / l;
      for (const s of [1, -1]) goo.spray(g.x, g.r * 0.6, g.z, Math.round(C.count / 2), hex, { dx: -dz * s, dz: dx * s, cone: C.cone, speed: C.speed, up: C.up });
      goo.spray(g.x, g.r * 0.6, g.z, C.along, hex, { dx, dz, cone: 0.3, speed: C.speed, up: C.up });
      goo.pour(g.x, g.z, g.r * 0.25, C.streak * g.r, hex, dx, dz, g.r * 2);
    } else if (e.type === 'hurt' && h) {
      // the hero hit: the goo that hit him, splashed onto him from all round
      // (fine drops, the only ones he wears)
      const by = String(e.by || '').replace(/^(revenge|strand):/, ''), c = _gooC.setHex(T.species[by]?.color ?? T.bullets.gelColor), rMax = T.goo.ride.heroMaxR;
      for (let i = 0; i < E.hurt.count && goo.left > 0; i++, goo.left--) {
        const a = Math.random() * Math.PI * 2, r = rMax * (0.4 + 0.6 * Math.random()), d = T.hero.radius * 1.25;
        goo.sim.emit(h.x + Math.cos(a) * d, 0.5 + Math.random() * 0.5, h.z + Math.sin(a) * d, -Math.cos(a) * 2, 0.5, -Math.sin(a) * 2, r, c.r, c.g, c.b);
      }
    }
  }

  sync(w, alpha, time) {
    // the hero
    const h = w.hero, hv = this.hero, L = T.heroLook;
    const fdt = Math.min(0.1, Math.max(0, time - (this._syncT ?? time))); this._syncT = time;   // the frame's own step (v82's easing)
    // between worlds (sim/worlds.js): shrinking down the hole, then falling
    // into the next world from high above, drawn out long by the fall
    const sink = h.sink || 0, fall = h.fall || 0;
    hv.root.position.set(h.px + (h.x - h.px) * alpha, fall > 0 ? fall * fall * T.worlds.view.fallH : -sink * 0.5, h.pz + (h.z - h.pz) * alpha);
    const sk = 1 - 0.9 * sink;
    hv.root.scale.set(sk * (1 - 0.3 * fall), sk * (1 + 0.7 * fall), sk * (1 - 0.3 * fall));
    hv.squash.scale.set(1 / Math.sqrt(h.sq), h.sq, 1 / Math.sqrt(h.sq));
    hv.eyes.rotation.y = Math.atan2(h.aimX, h.aimZ);
    hv.root.visible = h.alive;
    // 1.x's feedback (player.js:266-282, 326-333): through mercy the body
    // blinks base + amp·|sin(rate·t)| and glows red; a dash blinks faster
    const blink = (B) => B.base + B.amp * Math.abs(Math.sin(time * B.rate));
    hv.mat.opacity = h.mercy > 0 ? blink(L.mercyBlink) : h.dash > 0 ? blink(L.dashBlink) : L.opacity;
    // HEAT (v52): the halo under you and a tint in the gel, warmer as the multiplier climbs.
    // Past ×8 (WHITE HEAT, v60) the halo holds its ×8 size and burns toward white instead
    const HV = T.heat.view, m = heatMult(w), hot = m > 1 && h.alive, top = T.heat.levels;
    const hk = Math.min(m, top), white = m > top ? HV.white * (m - top) / (T.heat.white.levels - top) : 0;
    hv.halo.visible = hot;
    if (hot) {
      const c = HV.colors[Math.min(HV.colors.length - 1, hk - 2)], into = m < top ? (w.heat || 0) - (m - 1) : 0, pulse = 0.85 + 0.15 * Math.sin(time * (4 + m));
      hv.halo.position.set(hv.root.position.x, 0.03, hv.root.position.z);
      hv.halo.scale.setScalar(HV.halo.r * 2 * (1 + HV.halo.per * (hk - 2 + into)));
      hv.halo.material.color.setHex(c).lerp(_white, white);
      hv.halo.material.opacity = Math.min(1, (HV.ring.alpha + HV.ring.perAlpha * (hk - 2)) * pulse);
    }
    if (h.mercy > 0) hv.mat.emissive.setHex(L.flashColor);
    else if (hot) hv.mat.emissive.setHex(HV.colors[Math.min(HV.colors.length - 1, hk - 2)]).lerp(_white, white).multiplyScalar(HV.tint * (hk - 1));
    else hv.mat.emissive.setScalar(0);
    // the lunge the sim keeps (hero.stretch), into the gel's stretch
    hv.mat.gel.stretch.value = h.stretch || 0;
    hv.mat.gel.stretchDir.value.set(h.stretchX || 0, h.stretchZ || 0);
    hv.press = h; hv.pressR = T.hero.radius;   // v82: the gels standing in him (sim/press.js)
    contactEase(hv, fdt, 0);

    // the gels
    const seen = new Set();
    for (const g of w.gels) {
      seen.add(g.id);
      let v = this.views.get(g.id);
      if (!v) { v = this._take(g.kind); this._heavy(v, g.heavy, g.size ?? (g.heavy ? 3 : 2)); this.views.set(g.id, v); }
      v.r = g.r;                                   // its real size: an elite is ×1.2, a boss ×1.5
      const x = g.px + (g.x - g.px) * alpha, z = g.pz + (g.z - g.pz) * alpha;
      v.root.position.set(x, 0, z);
      // velocity, smoothed the way 1.x smoothed it (0.3 a frame)
      v.vx += ((g.x - g.px) / T.sim.dt - v.vx) * 0.3;
      v.vz += ((g.z - g.pz) / T.sim.dt - v.vz) * 0.3;
      v.squash.scale.set(1 / Math.sqrt(g.sq), g.sq, 1 / Math.sqrt(g.sq));
      v.press = g; v.pressR = g.r;   // v82: what pressed on it this step (sim/press.js; eased below)
      // the swell is the view's alone (the body is live from its first step): a
      // child never swells, and a brood still waiting out its parent's pop is not drawn
      v.root.visible = g.state !== 'appear';
      const grow = (g.child || !(g.t < T.gel.swell) ? 1 : 0.15 + 0.85 * smooth(g.t / T.gel.swell)) * worn(g);
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
      contactEase(v, fdt, v.yaw);   // v82: eased here, on the frame clock, where the press is fresh
    }
    for (const [id, v] of this.views) if (!seen.has(id)) { this._release(v); this.views.delete(id); }

    // bullets
    const bm = this.bullets;
    let n = 0;
    const BD = T.bullets.look.draw;
    for (const bl of w.bullets) {
      const x = bl.px + (bl.x - bl.px) * alpha, z = bl.pz + (bl.z - bl.pz) * alpha;
      const s = bl.r * (bl.hero ? BD.hero : BD.gel);   // drawn bigger than it hits: what you dodge is never smaller than what hurts
      this._m.makeScale(s, s, s).setPosition(x, BULLET_Y, z);
      bm.setMatrixAt(n, this._m);
      this._c.setHex(bl.color); this.bCol.setXYZ(n, this._c.r, this._c.g, this._c.b);
      n++;
    }
    bm.count = n;
    bm.instanceMatrix.needsUpdate = true;
    this.bCol.needsUpdate = true;
    // v103: the corpse fire waiting to bite: its seed, and a bar along each line it will fire down
    {
      const V = T.revenge.view, sm = this.seeds, tm = this.ticks, hm = this.heads, M = this._m;
      let ns = 0, nt = 0;
      for (const sd of w.seeds ?? []) {
        if (ns >= V.maxSeeds) break;
        const k = Math.min(1, Math.max(0, 1 - sd.t / sd.tell)), blink = k > V.blinkFrom && Math.floor(k * V.blinks) % 2 === 0;
        const r = V.seed[0] + (V.seed[1] - V.seed[0]) * k;
        M.makeScale(r, r, r).setPosition(sd.x, BULLET_Y, sd.z); sm.setMatrixAt(ns, M);
        sm.setColorAt(ns, this._c.setHex(sd.opts.color).lerp(_white, blink ? V.blinkWhite : V.lift)); ns++;
        const len = V.tick.len * Math.min(1, k / V.tick.grow);
        for (const a of sd.angles) {
          if (nt >= V.maxTicks) break;
          M.makeRotationY(-a).scale(_tickS.set(Math.max(len, 1e-3), V.tick.h, V.tick.w))
            .setPosition(sd.x + Math.cos(a) * V.tick.from, V.tick.y, sd.z + Math.sin(a) * V.tick.from);
          tm.setMatrixAt(nt, M); tm.setColorAt(nt, this._c.setHex(sd.opts.color).lerp(_white, V.tick.lift));
          const H = V.tick.head, d = V.tick.from + len;
          M.makeRotationY(-a).scale(_tickS.set(H, 1, H)).setPosition(sd.x + Math.cos(a) * d, V.tick.y + 0.005, sd.z + Math.sin(a) * d);
          hm.setMatrixAt(nt, M); hm.setColorAt(nt, this._c); nt++;
        }
      }
      for (const [m, c] of [[sm, ns], [tm, nt], [hm, nt]]) { m.count = c; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    }
    this.juice.sync(w, alpha, BULLET_Y);
    this.light.sync(w, alpha, this.views);
    // v76: a caustic under every body, in its colour, slid away from the sun
    {
      const C = T.light.arena.caustic, O = this.light.sunOff, cm = this.caustics, M = this._cm ||= new THREE.Matrix4(), col = this._cc ||= new THREE.Color();
      let c = 0;
      for (const g of w.gels) {
        if (c >= C.cap) break;
        if (!g.alive || (g.state === 'appear' && g.t < 0)) continue;
        const v = this.views.get(g.id);
        if (!v || !v.root.visible) continue;
        const grow = (g.child || !(g.t < T.gel.swell) ? 1 : smooth(g.t / T.gel.swell)) * worn(g);
        const spread = Math.max(0.6, Math.min(1.6, v.squash.scale.x));
        const r = g.r * C.r * grow * spread * (v.shadow ?? 1);
        if (r < 0.1) continue;
        M.makeScale(r, 1, r).setPosition(g.px + (g.x - g.px) * alpha + O.x * r, C.y, g.pz + (g.z - g.pz) * alpha + O.z * r);
        cm.setMatrixAt(c, M);
        col.setHex(T.species[g.kind]?.color ?? 0xffffff).multiplyScalar((g.isBoss ? C.boss : 1) * (g.heavy ? C.heavy : 1) / Math.sqrt(spread));
        cm.setColorAt(c++, col);
      }
      cm.count = c; cm.instanceMatrix.needsUpdate = true; if (cm.instanceColor) cm.instanceColor.needsUpdate = true;
    }
    this.pickups.sync(w, alpha, time);
    this.challenge.sync(w, alpha, time);
    this.posts.sync(w, alpha, time);
    this.slams.sync(w, alpha, time);
    this.hints.sync(w, alpha, time);
    this.goo?.setBodies(w, alpha);

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
    this._cords(w, alpha, time);
  }

  // v106: the strands that stand, each a waving cord of goo between its two bodies (where they are drawn)
  _cords(w, alpha, time) {
    const P = T.forms.pair, C = P.view, m = this.cords, cap = C.max * C.segs, up = this._up ||= new THREE.Vector3(0, 1, 0);
    const dir = this._cdir ||= new THREE.Vector3(), q = this._cq ||= new THREE.Quaternion(), sc = this._csc ||= new THREE.Vector3(), at = this._cat ||= new THREE.Vector3();
    let n = 0;
    for (const { L, a, b } of liveStrands(w)) {
      if (n + C.segs > cap) break;
      const ax = a.px + (a.x - a.px) * alpha, az = a.pz + (a.z - a.pz) * alpha, bx = b.px + (b.x - b.px) * alpha, bz = b.pz + (b.z - b.pz) * alpha;
      const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1e-6, nx = -dz / len, nz = dx / len;
      const stretch = Math.min(1, Math.max(0, (len - P.min) / (P.max - P.min))), wid = C.w * (1 - stretch * C.thin), hex = T.species[L.kind]?.color ?? 0xffffff;
      let px = ax, py = C.y, pz = az;
      for (let k = 1; k <= C.segs; k++) {
        const t = k / C.segs, arc = Math.sin(t * Math.PI), wave = arc * Math.sin(time * C.hz + t * C.waves + L.id) * C.amp;
        const x = ax + dx * t + nx * wave, z = az + dz * t + nz * wave, y = C.y + arc * C.lift;
        dir.set(x - px, y - py, z - pz);
        const l = Math.max(dir.length(), 1e-6);
        q.setFromUnitVectors(up, dir.multiplyScalar(1 / l));
        m.setMatrixAt(n, this._m.compose(at.set(px, py, pz), q, sc.set(wid, l, wid))); m.setColorAt(n, this._c.setHex(hex)); n++;
        px = x; py = y; pz = z;
      }
    }
    m.count = n; m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
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
      const s = rand(...size);
      this.chunks.push({ fam: 'blob', x, y: 0.4, z, vx: Math.cos(a) * sp, vy: rand(2, 5), vz: Math.sin(a) * sp, s, hex, life: D.chunkLife, sq: 1, sqV: 0, age: 0, strand: false, bounces: 0, rest: false, vol: D.melt.vol * VOLC * s * s * s });
    }
  }

  // Everything that runs on the frame clock rather than the sim's: ripples
  // dying out, the dying playing out their last beat, chunks in flight.
  stepFx(dt, time) {
    this.juice.step(dt);
    this.light.step(dt);
    this.pickups.stepFx(dt);
    if (this.goo) { this.goo.step(dt); this.goo.sync(); }   // the goo's drops fly, and what they lay down goes to the film
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
      const t = Math.max(0, g.life / L.ghost.life), k = T.hero.radius * (L.ghost.scale + (1 - L.ghost.scale) * t);
      g.fade.value = L.ghost.opacity * t;
      g.mesh.scale.set(k * g.sq.x, k * g.sq.y, k * g.sq.z);
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
    // it lands, its own wobble, and a shrink over its last moments; v83: a
    // strand trailing it out of the burst until it snaps, a bounce and a
    // jiggle where it lands, a slide to a stop, and a melt into the floor's film
    const HX = this.hx, HZ = this.hz, k = Math.min(3, dt * 60), Bn = D.bounce, Wb = D.wobble, St = D.strand, goo = this.goo;
    const fric = Math.exp(-D.friction * dt);
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      if ((c.life -= dt) <= 0) { this.chunks.splice(i, 1); continue; }
      c.age += dt;
      c.vy -= D.gravity * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (c.y < c.s * 0.5) {
        c.y = c.s * 0.5;
        if (c.vy < 0) {
          const vin = -c.vy;
          if (vin > Bn.min && c.bounces < Bn.max) { c.vy = vin * Bn.e; c.bounces++; c.sqV -= Bn.squash * Math.min(1, vin / 6); }
          else { c.vy = 0; c.sqV -= 0.4 * vin * 0.25; c.rest = true; }
          c.vx *= D.floorKeep; c.vz *= D.floorKeep;
          c.strand = false;   // landed: it has torn free
        }
      }
      if (c.rest) { c.vx *= fric; c.vz *= fric; }
      c.sqV = (c.sqV - (c.sq - 1) * Wb.k * k) * Math.pow(Wb.damp, k);
      c.sq = Math.max(0.3, Math.min(1.7, c.sq + c.sqV * k));
      if (Math.abs(c.x) > HX - c.s) { c.x = Math.sign(c.x) * (HX - c.s); c.vx *= -0.4; }
      if (Math.abs(c.z) > HZ - c.s) { c.z = Math.sign(c.z) * (HZ - c.s); c.vz *= -0.4; }
      // its last moments: with the goo on it melts into the film under it, pouring
      // its goo as it shrinks (so the puddle grows as the chunk goes); without, it fades
      if (goo && c.vol > 0 && c.life < D.shrink) {
        const dv = Math.min(c.vol, c.vol * dt / Math.max(0.05, c.life + dt));
        goo.pour(c.x, c.z, Math.max(0.05, c.s * 0.8), dv, c.hex);
        c.vol -= dv;
      }
    }
    const n = { blob: 0, cube: 0 };
    let ns = 0;
    const sm = this.strands, up = this._up ||= new THREE.Vector3(0, 1, 0), dir = this._dir ||= new THREE.Vector3(), q = this._q ||= new THREE.Quaternion(), sc = this._sc ||= new THREE.Vector3(), at = this._at ||= new THREE.Vector3();
    for (const c of this.chunks) {
      const fade = Math.min(1, c.life / D.shrink), s = c.s * fade, sx = s / Math.sqrt(c.sq);
      this._m.makeScale(sx, s * c.sq, sx).setPosition(c.x, c.y, c.z);
      const m = this.chunkMesh[c.fam];
      m.setMatrixAt(n[c.fam], this._m); m.setColorAt(n[c.fam], this._c.setHex(c.hex)); n[c.fam]++;
      // the strand: from the burst to the chunk, thinner the longer it is stretched, until it snaps
      if (c.strand && ns < this.chunkMax) {
        dir.set(c.x - c.ox, c.y - c.oy, c.z - c.oz);
        const len = dir.length(), w = c.s * St.w * Math.pow(Math.max(0, 1 - len / St.max), 0.6) * Math.max(0, 1 - c.age / St.life);
        if (len < 1e-3 || w < 0.004) { c.strand = false; continue; }
        q.setFromUnitVectors(up, dir.multiplyScalar(1 / len));
        sm.setMatrixAt(ns, this._m.compose(at.set(c.ox, c.oy, c.oz), q, sc.set(w, len, w))); sm.setColorAt(ns, this._c.setHex(c.hex)); ns++;
      }
    }
    for (const [fam, m] of Object.entries(this.chunkMesh)) {
      m.count = n[fam];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    sm.count = this.strandCount = ns; sm.instanceMatrix.needsUpdate = true;
    if (sm.instanceColor) sm.instanceColor.needsUpdate = true;
  }
}

const _white = new THREE.Color(0xffffff), _gooC = new THREE.Color(), _tickS = new THREE.Vector3(), _hsl = { h: 0, s: 0, l: 0 };
const VOLC = 4 / 3 * Math.PI;   // a chunk of radius s is drawn as VOLC s³ of goo

// v82: the press the sim reported (v.press, the body itself: sim/press.js's
// vector, total and axis, metres; pressR the body's radius) eased into the
// gel's contact uniform — a direction in the body's own frame (the mesh is
// yawed the way it moves, as hitDir is) and two depths in radii, quick to rise
// and slower to let go. v90: the side facing the push takes the vector's share
// plus the balance, the far side the balance alone — one body against you
// flattens one side, two either side flatten both. Before this the vector
// alone was read, and a squeeze from both sides read as nothing.
function contactEase(v, dt, yaw) {
  const u = v.mat?.gel?.contact;
  if (!u) return;
  const C = B.contact, p = v.press, R = v.pressR || 1;
  const vx = p?.pressX || 0, vz = p?.pressZ || 0, pm = Math.hypot(vx, vz), tot = Math.max(p?.pressM || 0, pm);
  const wantF = Math.min(C.max, (((tot + pm) / 2) / R) * C.gain), wantB = Math.min(C.max, (((tot - pm) / 2) / R) * C.gain);
  const cd = v.cd || 0, cb = v.cb || 0;
  const kF = Math.min(1, (wantF > cd ? C.attack : C.release) * dt), kB = Math.min(1, (wantB > cb ? C.attack : C.release) * dt);
  v.cd = cd + (wantF - cd) * kF; v.cb = cb + (wantB - cb) * kB;
  // the direction: the vector's while it has one, else the folded axis (a squeeze from both sides has an axis and no net push)
  let dx = vx, dz = vz;
  if (pm < 1e-6) { dx = p?.pressAX || 0; dz = p?.pressAZ || 0; }
  const dl = Math.hypot(dx, dz);
  if (dl > 1e-6) {
    const c = Math.cos(yaw), s = Math.sin(yaw), wx = dx / dl, wz = dz / dl, k = Math.max(kF, kB);
    const lx = wx * c - wz * s, lz = wx * s + wz * c;
    v.cx = (v.cx || 0) + (lx - (v.cx || 0)) * k; v.cz = (v.cz || 0) + (lz - (v.cz || 0)) * k;
    const l = Math.hypot(v.cx, v.cz) || 1; v.cx /= l; v.cz /= l;
  }
  u.value.set(v.cx || 0, v.cz || 0, v.cd, v.cb);
}
const smooth = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
