// goo.js — goo you can watch fly, land, run and dry (owner, 2026-10-23: "more
// particle splatter and vfx, actually physical modelled vfx").
//
//   drops — goo-sim.js's droplets, drawn as glossy IMPOSTORS: one camera-
//           facing quad each, stretched along the drop's motion on screen and
//           shaded as a sphere from its uv (wrap light, a jelly rim, a wet
//           glint), alpha-tested so they write depth and need no sorting. One
//           draw call for every drop in the air, sliding or riding a body,
//           and one more for their soft shadows straight below them.
//   film  — the floor's goo as a THIN FILM over the arena: two HalfFloat
//           targets of two textures each, ping-ponged by fragment passes, so
//           it runs the same on WebGPU and on the WebGL 2 fallback:
//             wet  rgb = hue·h, a = h     goo still liquid, h millimetres deep
//             dry  rgb = hue·d, a = d     the stain it leaves as it dries
//           A drop's stamps add VOLUME to the wet film. Each film step the
//           wet goo spreads (a yield-stress flow: goo deeper than `yield`
//           runs toward its shallower neighbours, its colour carried with
//           it), is dragged by the bodies standing in it, and EVAPORATES at a
//           constant depth a second, so a thin smear dries in a moment and a
//           deep pool stays wet a while; what evaporates is laid down as the
//           dry stain (heaviest at the film's edge: the coffee ring), which
//           fades slowly.
//   the floor shades both (floor.js): the stain darkens the floor in its hue;
//           the wet film over it is jelly — a crisp contact line, the floor
//           seen through it (absorbed per channel, Beer–Lambert, so a thin
//           film barely tints and a deep pool is the goo's own colour), its
//           slope lit by the sun and a glint only where its surface curves
//           (the meniscus at its edge, a fresh blob's dome). The flat middle
//           of a pool does not mirror anything: the floor stays matte (owner,
//           2026-10-22).
//
// Cost (a phone draws every frame of it): the drops are two instanced draws;
// a film step is at most three small passes (the stamps, the footprints at a
// quarter of the film's texels, and one flow pass writing the wet film and the
// stain together) over a 608 × 352 film; the floor reads it in eight bilinear
// taps, its slope from the screen's own derivatives.
//
// The film steps at TUNING.goo.film.hz, not every frame, and goes quiet once
// everything on it has dried: then only the stain's slow fade runs, a pass
// every `idleEvery` s. Reads the world and its events, never writes them.
// Every number is TUNING.goo.
import * as THREE from 'three/webgpu';
import {
  Fn, uniform, attribute, texture, uv, vec2, vec3, vec4, float, normalize, dot, length, max, min, clamp, pow, sqrt,
  mix, cameraViewMatrix, varying, select, positionGeometry, step, smoothstep, mrt,
} from 'three/tsl';
import { TUNING } from '../tuning.js?v=51';
import { GooSim, BODY, STAMP } from './goo-sim.js?v=51';

const T = TUNING, G = T.goo;
const MAX_BODIES = 256;

export class Goo {
  constructor(scene) {
    this.scene = scene;
    this.sim = new GooSim(G.cap, G);
    this.bodies = new Float32Array(MAX_BODIES * BODY); this.nb = 0;
    this.hx = 19; this.hz = 11;
    this.left = G.budget;        // drops this frame may still throw (a boss's death cannot stall a frame)
    this._buildDrops(G.cap);
    this.film = new Film(G.film);
  }

  get n() { return this.sim.n; }

  setArena(hx, hz) { this.hx = hx; this.hz = hz; this.film.setArena(hx, hz); }

  _buildDrops(cap) {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iVel = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.iCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.iPos); geo.setAttribute('iVel', this.iVel); geo.setAttribute('iCol', this.iCol);
    geo.instanceCount = 0;
    const D = G.drop;
    const mat = new THREE.MeshBasicNodeMaterial({ alphaTest: 0.5 });
    // the camera's right and up in the world (the view matrix's rows)
    const V = cameraViewMatrix;
    const right = vec3(V[0].x, V[1].x, V[2].x), up = vec3(V[0].y, V[1].y, V[2].y);
    const P = attribute('iPos', 'vec4'), vel = attribute('iVel', 'vec3');
    // stretched along its motion on screen, as a fast drop smears in one frame
    const vr = dot(vel, right), vu = dot(vel, up), vs = length(vec2(vr, vu));
    const ax = select(vs.greaterThan(1e-3), vec2(vr, vu).div(max(vs, 1e-3)), vec2(1, 0));
    const stretch = min(float(1).add(vs.mul(D.stretch)), D.maxStretch);
    const axis = varying(ax, 'vAxis');
    const pos = positionGeometry;            // −0.5 … 0.5 across the quad
    const wAxis = right.mul(axis.x).add(up.mul(axis.y)), wPerp = right.mul(axis.y.negate()).add(up.mul(axis.x));
    mat.positionNode = P.xyz.add(wAxis.mul(pos.x.mul(P.w).mul(2).mul(stretch))).add(wPerp.mul(pos.y.mul(P.w).mul(2)));
    // the sphere's normal from where on the quad this is (x runs along the stretch)
    const q = uv().mul(2).sub(1), d2 = dot(q, q);
    const nz = sqrt(max(float(0), float(1).sub(d2)));
    const nView = normalize(vec3(axis.x.mul(q.x).sub(axis.y.mul(q.y)), axis.y.mul(q.x).add(axis.x.mul(q.y)), nz));
    mat.colorNode = shadeDrop(attribute('iCol', 'vec3'), nView);
    mat.opacityNode = float(1).sub(step(float(1), d2));
    this.drops = new THREE.Mesh(geo, mat);
    this.drops.frustumCulled = false;
    this.scene.add(this.drops);
    // Each drop's shadow on the floor, from the same instances: a soft dark
    // disc straight under it, wider and fainter the higher it flies, so a
    // drop in the air reads as IN THE AIR and not as a dot on the floor
    // (the bodies' own contact shadows are drawn the same way, light.js).
    const S = G.shadow, sm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const sgeo = new THREE.InstancedBufferGeometry();
    sgeo.index = base.index; sgeo.setAttribute('position', base.attributes.position); sgeo.setAttribute('uv', base.attributes.uv);
    sgeo.setAttribute('iPos', this.iPos); sgeo.instanceCount = 0;
    const lift = max(P.y.sub(P.w), 0), size = P.w.mul(float(S.size).add(lift.mul(S.grow)));
    sm.positionNode = vec3(P.x.add(pos.x.mul(size).mul(2)), S.y, P.z.sub(pos.y.mul(size).mul(2)));
    const ring = length(uv().sub(0.5)).mul(2);
    sm.colorNode = vec3(0);
    sm.opacityNode = clamp(float(1).sub(ring), 0, 1).mul(S.alpha).div(float(1).add(lift.mul(S.fade)));
    this.shadows = new THREE.Mesh(sgeo, sm);
    this.shadows.frustumCulled = false; this.shadows.renderOrder = -1;
    this.scene.add(this.shadows);
  }

  // the bodies a drop can land on: the hero (not mid-dash: he goes through
  // what he cuts) and every gel that is drawn (a brood waiting out its
  // parent's pop is not there yet, and a CLOAKER gone see-through sheds what
  // it carried rather than wearing it)
  setBodies(w, alpha) {
    let k = 0;
    const b = this.bodies, h = w.hero, dt = T.sim.dt;
    if (h.alive && !(h.dash > 0)) { b.set([h.px + (h.x - h.px) * alpha, h.pz + (h.z - h.pz) * alpha, T.hero.radius, T.hero.radius * 2, (h.x - h.px) / dt, (h.z - h.pz) / dt, -1, 2], 0); k++; }
    for (const g of w.gels) {
      if (k >= MAX_BODIES) break;
      if (!g.alive || (g.state === 'appear' && g.t < 0) || g.cloak > 0.5) continue;
      const cube = T.species[g.kind]?.family === 'cube';
      b.set([g.px + (g.x - g.px) * alpha, g.pz + (g.z - g.pz) * alpha, g.r, g.r * (cube ? 1.8 : 1.4), (g.x - g.px) / dt, (g.z - g.pz) / dt, g.id, cube ? 1 : 0], k * BODY); k++;
    }
    this.nb = k;
  }

  // A spray: n drops from (x, y, z), `dx, dz` the mean way (a unit vector,
  // or none for all round), `cone` its half-angle, speed and lift ranges, in
  // a colour. Sizes are log-skewed (mostly fine, a few fat) and a fat drop
  // flies slower: it carries the same push in more mass. Returns how many flew.
  spray(x, y, z, n, hex, { dx = 0, dz = 0, cone = Math.PI, speed = [2, 7], up = [1.5, 6], size = G.size, inherit = null } = {}) {
    n = Math.min(n, this.left);
    if (n <= 0) return 0;
    const c = _c.setHex(hex), S = size, lo = Math.log(S.min), span = Math.log(S.max) - lo;
    const all = Math.hypot(dx, dz) <= 1e-6, base = all ? 0 : Math.atan2(dz, dx);
    let i = 0;
    for (; i < n; i++) {
      const r = Math.exp(lo + span * Math.random() ** S.skew);
      const a = all ? Math.random() * Math.PI * 2 : base + (Math.random() * 2 - 1) * cone;
      const k = Math.pow(S.min / r, G.sizeSpeed);
      const sp = (speed[0] + Math.random() * (speed[1] - speed[0])) * (0.55 + 0.45 * k);
      const vy = (up[0] + Math.random() * (up[1] - up[0])) * (0.6 + 0.4 * k);
      if (!this.sim.emit(x, y, z, Math.cos(a) * sp + (inherit?.[0] ?? 0), vy, Math.sin(a) * sp + (inherit?.[1] ?? 0), r, c.r, c.g, c.b)) break;
    }
    this.left -= i;
    return i;
  }

  // goo straight onto the floor (a trail, a cut's streak): VOLUME (m³) into the film
  pour(x, z, rad, vol, hex, dx = 1, dz = 0, len = 0) {
    const c = _c.setHex(hex);
    this.film.add(x, z, dx, dz, len, rad, vol, c.r, c.g, c.b);
  }

  // a body's worth of goo slumping where it stood: not one disc but a few
  // lobes of it, thrown a little off the middle, so the pool's edge is
  // ragged before the flow takes it (a body does not burst evenly)
  puddle(x, z, rad, vol, hex) {
    const P = G.puddle, n = P.lobes, c = _c.setHex(hex), w = [];
    let sum = 0;
    for (let i = 0; i < n; i++) { const k = 0.4 + Math.random(); w.push(k); sum += k; }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : rad * P.spread * Math.sqrt(Math.random()), share = w[i] / sum;
      this.film.add(x + Math.cos(a) * d, z + Math.sin(a) * d, 1, 0, 0, rad * (P.size[0] + (P.size[1] - P.size[0]) * Math.sqrt(share * n / 2)), vol * share, c.r, c.g, c.b);
    }
  }

  // the frame clock: the drops move, their stamps go to the film, the bodies'
  // footprints are noted, and the frame's budget comes back
  step(dt) {
    this.left = G.budget;
    if (dt <= 0) return;
    // a long frame is taken in steps of at most 1/30 s (and at most four)
    const n = Math.min(4, Math.ceil(dt * 30)), h = Math.min(dt / n, 1 / 30), s = this.sim.stamps;
    for (let k = 0; k < n; k++) {
      this.sim.step(h, this.bodies, this.nb, this.hx, this.hz);
      for (let i = 0; i < this.sim.ns; i++) {
        const o = i * STAMP;
        this.film.add(s[o], s[o + 1], s[o + 2], s[o + 3], s[o + 4], s[o + 5], s[o + 6], s[o + 7], s[o + 8], s[o + 9]);
      }
    }
    this.film.feet(this.bodies, this.nb);
    this.film.dt += dt;
  }

  // the drops, as the GPU reads them: one contiguous run, uploaded as far as it goes
  sync() {
    const s = this.sim, n = s.n, P = this.iPos.array, V = this.iVel.array, C = this.iCol.array;
    for (let i = 0; i < n; i++) {
      P[i * 4] = s.x[i]; P[i * 4 + 1] = s.y[i]; P[i * 4 + 2] = s.z[i]; P[i * 4 + 3] = s.r[i];
      V[i * 3] = s.vx[i]; V[i * 3 + 1] = s.vy[i]; V[i * 3 + 2] = s.vz[i];
      C[i * 3] = s.cr[i]; C[i * 3 + 1] = s.cg[i]; C[i * 3 + 2] = s.cb[i];
    }
    for (const a of [this.iPos, this.iVel, this.iCol]) { a.clearUpdateRanges(); a.addUpdateRange(0, Math.max(1, n) * a.itemSize); a.needsUpdate = true; }
    this.drops.geometry.instanceCount = n; this.shadows.geometry.instanceCount = n;
  }

  // `maxDt`: the longest step the film takes (a fast-forward catches up coarsely)
  render(renderer, maxDt) { this.film.render(renderer, maxDt); }

  clear() { this.sim.clear(); this.drops.geometry.instanceCount = 0; this.shadows.geometry.instanceCount = 0; this.film.clear(); }
}

const _c = new THREE.Color();

// a drop: wrap light, a fresnel jelly rim and a wet glint in the view's own
// frame (1.x v222's goo chunks), and a little light of its own so a drop
// over the dark floor keeps its colour
function shadeDrop(col, N) {
  const D = G.drop;
  const L = normalize(cameraViewMatrix.mul(vec4(...T.light.sun.position, 0)).xyz);
  const Vd = vec3(0, 0, 1), H = normalize(L.add(Vd));
  const wrap = clamp(dot(N, L).mul(0.5).add(0.5), 0, 1);
  const fres = pow(float(1).sub(clamp(dot(N, Vd), 0, 1)), float(2.5));
  const spec = pow(clamp(dot(N, H), 0, 1), float(D.gloss));
  return col.mul(wrap.mul(D.diffuse).add(D.ambient)).add(mix(col, vec3(1), 0.6).mul(fres).mul(D.rim)).add(vec3(spec.mul(D.glint))).add(col.mul(D.glow));
}

// ── the thin film ───────────────────────────────────────────────────────
// Stamps and footprints are drawn top-down over the arena, as the light map
// is (light.js): an orthographic camera over the floor, far edge at the top.
class Film {
  constructor(F) {
    this.F = F;
    const opt = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    // each target holds the wet film and the stain (textures 0 and 1), so one
    // pass steps both: on a phone's tiled GPU every pass is a trip through memory
    this.rt = [0, 1].map(() => {
      const rt = new THREE.RenderTarget(16, 16, { ...opt, count: 2 });
      rt.textures[0].name = 'wet'; rt.textures[1].name = 'dry';
      return rt;
    });
    this.vel = new THREE.RenderTarget(16, 16, opt);
    this.cur = 0; this.dt = 0; this.dirty = true;
    this.quiet = Infinity;       // seconds since goo last reached the film
    this.stepped = 0;            // film steps run, for a look at what it costs
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    this.cam.position.set(0, 20, 0); this.cam.up.set(0, 0, -1); this.cam.lookAt(0, 0, 0);
    this.stampScene = new THREE.Scene(); this.velScene = new THREE.Scene();
    const add = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, transparent: true, depthTest: false, depthWrite: false };
    const quad = new THREE.PlaneGeometry(1, 1);   // −0.5 … 0.5 in x and y; laid flat by the vertex code below
    const instanced = (attrs) => {
      const g = new THREE.InstancedBufferGeometry();
      g.index = quad.index; g.setAttribute('position', quad.attributes.position); g.setAttribute('uv', quad.attributes.uv);
      for (const [name, a] of Object.entries(attrs)) g.setAttribute(name, a);
      g.instanceCount = 0;
      return g;
    };

    // a stamp: a capsule from its centre along (dx, dz), its goo a dome
    // profile that integrates to the stamp's volume (the colour carries hue × h0)
    const cap = F.stampCap;
    this.sA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);   // x, z, dx, dz
    this.sB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2).setUsage(THREE.DynamicDrawUsage);   // len, wid
    this.sCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage); // hue × h0, h0
    const sm = new THREE.MeshBasicNodeMaterial(add);
    const A = attribute('sA', 'vec4'), Bv = attribute('sB', 'vec2'), L = Bv.x, W = Bv.y;
    // the quad's y goes to −z, as a plane laid flat by rotateX(−π/2) does, so
    // the top-down camera sees its front
    const along = vec2(A.z, A.w), across = vec2(A.w, A.z.negate());
    const local = positionGeometry.xy.mul(vec2(L.add(W.mul(2)), W.mul(2)));          // metres from the capsule's centre
    const world = A.xy.add(along.mul(local.x)).add(across.mul(local.y));
    sm.positionNode = vec3(world.x, 0, world.y);
    const capsule = Fn(() => {
      const p = uv().sub(0.5).mul(vec2(L.add(W.mul(2)), W.mul(2)));
      const ax = clamp(p.x, L.mul(-0.5), L.mul(0.5));
      const d = length(vec2(p.x.sub(ax), p.y)).div(W);
      return pow(clamp(float(1).sub(d.mul(d)), 0, 1), float(1.5));
    })();
    sm.fragmentNode = mrt({ wet: attribute('sCol', 'vec4').mul(capsule), dry: vec4(0) });   // added: the stain is left as it is
    this.stamps = new THREE.Mesh(instanced({ sA: this.sA, sB: this.sB, sCol: this.sCol }), sm);
    this.stamps.frustumCulled = false;
    this.stampScene.add(this.stamps);
    this.ns = 0;

    // a body's footprint: its velocity × a weight falling off from its middle, and the weight
    this.fA = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BODIES * 3), 3).setUsage(THREE.DynamicDrawUsage);   // x, z, R
    this.fV = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BODIES * 2), 2).setUsage(THREE.DynamicDrawUsage);   // vx, vz
    const vm = new THREE.MeshBasicNodeMaterial(add);
    const fa = attribute('fA', 'vec3');
    const fp = fa.xy.add(positionGeometry.xy.mul(vec2(1, -1)).mul(fa.z.mul(2)));
    vm.positionNode = vec3(fp.x, 0, fp.y);
    const fall = pow(clamp(float(1).sub(length(uv().sub(0.5)).mul(2)), 0, 1), float(0.7));
    vm.outputNode = vec4(attribute('fV', 'vec2').mul(fall), fall, float(0));
    this.footMesh = new THREE.Mesh(instanced({ fA: this.fA, fV: this.fV }), vm);
    this.footMesh.frustumCulled = false;
    this.velScene.add(this.footMesh);
    this.nf = 0;

    // the flow: the wet film spreads, is dragged, evaporates; the stain takes
    // what evaporated and fades. One pass writes both, reading the last pair.
    this.texel = uniform(new THREE.Vector2(1 / 16, 1 / 16));
    this.uDt = uniform(1 / 30); this.uSize = uniform(new THREE.Vector2(38, 22));
    this.wetIn = texture(this.rt[0].textures[0]); this.dryIn = texture(this.rt[0].textures[1]); this.velIn = texture(this.vel.texture);
    const wetFlow = Fn(() => {
      const p = uv(), tx = this.texel;
      // the bodies drag the film along: look back along their mean velocity
      const vv = this.velIn.sample(p);
      const u = select(vv.z.greaterThan(1e-3), vv.xy.div(max(vv.z, 1e-3)).mul(min(vv.z, 1)).mul(F.drag), vec2(0));
      const q = p.sub(u.mul(this.uDt).div(this.uSize));
      const c = this.wetIn.sample(q);
      // flux between two texels: the difference in mobile goo (above the
      // yield) × a mobility that grows with how much is mobile, so deep goo
      // runs and thin goo creeps to a stop at the yield. `spread` ≤ 0.2 keeps
      // the explicit step stable (the 2D limit is 0.25 a side).
      const Y = float(F.yield), K = float(F.spread), Hr = float(F.ref);
      const mob = (h) => max(h.sub(Y), 0);
      const flux = (n) => {
        const mi = mob(c.a), mj = mob(n.a);
        const f = mj.sub(mi).mul(K).mul(min(mi.add(mj).mul(0.5).div(Hr), 1));      // > 0: in from n
        const hue = select(f.greaterThan(0), n.rgb.div(max(n.a, 1e-4)), c.rgb.div(max(c.a, 1e-4)));
        return vec4(hue.mul(f), f);
      };
      const nE = this.wetIn.sample(q.add(vec2(tx.x, 0))), nW = this.wetIn.sample(q.sub(vec2(tx.x, 0)));
      const nN = this.wetIn.sample(q.add(vec2(0, tx.y))), nS = this.wetIn.sample(q.sub(vec2(0, tx.y)));
      const o = c.add(flux(nE)).add(flux(nW)).add(flux(nN)).add(flux(nS));
      // evaporation: a constant depth a second, whatever the depth
      const e = min(o.a, float(F.evap).mul(this.uDt));
      const keep = select(o.a.greaterThan(1e-4), o.a.sub(e).div(max(o.a, 1e-4)), float(0));
      return o.mul(keep);
    })();
    // The coffee ring: a drying film is fed from inside toward its edge,
    // where evaporation is fastest, so what it carried is laid down at the
    // rim. A wet texel with a dry neighbour is the edge: it keeps `ring` ×
    // what it lost, the middle `deposit` ×, so a dried pool is a darker ring
    // round a lighter stain rather than a flat coin.
    const dryFlow = Fn(() => {
      const p = uv(), tx = this.texel;
      const c = this.wetIn.sample(p), d = this.dryIn.sample(p);
      const e = min(c.a, float(F.evap).mul(this.uDt));
      const got = select(c.a.greaterThan(1e-4), c.mul(e.div(max(c.a, 1e-4))), vec4(0));
      const mn = min(min(this.wetIn.sample(p.add(vec2(tx.x, 0))).a, this.wetIn.sample(p.sub(vec2(tx.x, 0))).a),
        min(this.wetIn.sample(p.add(vec2(0, tx.y))).a, this.wetIn.sample(p.sub(vec2(0, tx.y))).a));
      const rim = float(1).sub(smoothstep(0, F.ringAt, mn));
      return d.mul(pow(float(0.5), this.uDt.div(F.dryHalfLife))).add(got.mul(mix(float(F.deposit), float(F.ring), rim)));
    })();
    const m = new THREE.NodeMaterial(); m.depthTest = false; m.depthWrite = false;
    m.fragmentNode = mrt({ wet: wetFlow, dry: dryFlow });
    this.flowQuad = new THREE.QuadMesh(m);
    this._prev = new THREE.Color();
  }

  get wetTexture() { return this.rt[this.cur].textures[0]; }
  get dryTexture() { return this.rt[this.cur].textures[1]; }

  // the film covers the arena exactly, at perMetre texels a metre
  setArena(hx, hz) {
    Object.assign(this.cam, { left: -hx, right: hx, top: hz, bottom: -hz }); this.cam.updateProjectionMatrix();
    const w = Math.max(16, Math.round(2 * hx * this.F.perMetre)), h = Math.max(16, Math.round(2 * hz * this.F.perMetre));
    for (const rt of this.rt) rt.setSize(w, h);
    // the footprints are soft and a body is a metre across: a quarter of the
    // film's texels hold them, and the flow reads them filtered
    this.vel.setSize(Math.max(4, Math.round(w / 4)), Math.max(4, Math.round(h / 4)));
    this.texel.value.set(1 / w, 1 / h); this.uSize.value.set(2 * hx, 2 * hz); this.px = 2 * hx / w;
    this.clear();
  }

  clear() { this.dirty = true; this.ns = 0; this.stamps.geometry.instanceCount = 0; this.quiet = Infinity; }

  // `vol` m³ of goo in a capsule; its depth is kept in millimetres, where a
  // half float is precise
  add(x, z, dx, dz, len, wid, vol, r, g, b) {
    if (this.ns >= this.F.stampCap || !(vol > 0)) return;
    const i = this.ns++, W = Math.max(wid, this.px * this.F.minWid);
    // the dome profile (1 − ρ²)^1.5 holds 0.4 of its disc and about 0.5 of
    // its rectangle: the depth at the middle that holds `vol`
    const area = Math.PI * W * W * 0.4 + 2 * W * len * 0.5, h0 = 1000 * vol / Math.max(area, 1e-6);
    const m = Math.max(r, g, b, 1e-3);
    this.sA.setXYZW(i, x, z, dx, dz); this.sB.setXY(i, len, W);
    this.sCol.setXYZW(i, r / m * h0, g / m * h0, b / m * h0, h0);
    this.quiet = 0;
  }

  feet(bodies, nb) {
    let k = 0;
    for (let i = 0; i < nb && k < MAX_BODIES; i++) {
      const o = i * BODY;
      this.fA.setXYZ(k, bodies[o], bodies[o + 1], bodies[o + 2] * this.F.foot); this.fV.setXY(k, bodies[o + 4], bodies[o + 5]); k++;
    }
    this.nf = k;
  }

  // The smoke and the look checks: how much goo lies round (x, z), read back
  // from the film — depth summed over a 64-texel square (4 m), wet and dry,
  // and how many of those reads hold any. The square sits on (x, z) on one
  // backend and on its mirror across the middle row on the other (their rows
  // run opposite ways), so a probe means most near the middle of the arena.
  async probe(renderer, x, z, n = 64) {
    const out = { wet: 0, dry: 0, covered: 0 };
    const W = this.rt[0].width, H = this.rt[0].height;
    n = Math.min(n, W, H);
    const S = this.uSize.value, cx = Math.round((x / S.x + 0.5) * W), cy = Math.round((z / S.y + 0.5) * H);
    const x0 = Math.max(0, Math.min(W - n, cx - n / 2)), y0 = Math.max(0, Math.min(H - n, cy - n / 2));
    for (const [i, key] of [[0, 'wet'], [1, 'dry']]) {
      const px = await renderer.readRenderTargetPixelsAsync(this.rt[this.cur], x0, y0, n, n, i);
      for (let i = 3; i < px.length; i += 4) {
        const a = px instanceof Uint16Array ? THREE.DataUtils.fromHalfFloat(px[i]) : px[i];
        if (a > 0) { out[key] += a; if (a > 0.05) out.covered++; }
      }
    }
    return out;
  }

  render(renderer, maxDt = 1 / 10) {
    const F = this.F;
    // Quiet: nothing has reached the film for longer than the deepest wet
    // goo takes to dry, so the wet film is empty and the stain only fades.
    const idle = this.quiet > F.wetFor && !this.dirty;
    const every = idle ? F.idleEvery : 1 / F.hz;
    if (this.dt < every && !this.dirty) return;
    const dt = Math.min(this.dt, idle ? F.idleEvery : maxDt); this.dt = 0;
    this.quiet += dt;
    const prevT = renderer.getRenderTarget(), prevA = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
    renderer.getClearColor(this._prev);
    renderer.setClearColor(0x000000, 0);
    if (this.dirty) {
      for (const rt of this.rt) { renderer.setRenderTarget(rt); renderer.clear(); }
      this.dirty = false;
    }
    const a = this.cur, b = 1 - a;
    if (!idle) {
      // 1. the stamps since the last step, added to the wet film where they lie
      if (this.ns) {
        const g = this.stamps.geometry;
        g.instanceCount = this.ns;
        for (const at of [this.sA, this.sB, this.sCol]) { at.clearUpdateRanges(); at.addUpdateRange(0, this.ns * at.itemSize); at.needsUpdate = true; }
        renderer.autoClear = false;
        renderer.setRenderTarget(this.rt[a]);
        renderer.render(this.stampScene, this.cam);
        this.ns = 0;
      }
      // 2. the bodies' footprints
      const fg = this.footMesh.geometry;
      fg.instanceCount = this.nf;
      for (const at of [this.fA, this.fV]) { at.clearUpdateRanges(); at.addUpdateRange(0, Math.max(1, this.nf) * at.itemSize); at.needsUpdate = true; }
      renderer.autoClear = true;
      renderer.setRenderTarget(this.vel); renderer.render(this.velScene, this.cam);
    }
    // 3. the flow: the wet film and the stain together, from the current pair into the other
    this.uDt.value = dt;
    this.wetIn.value = this.rt[a].textures[0]; this.dryIn.value = this.rt[a].textures[1]; this.velIn.value = this.vel.texture;
    renderer.setRenderTarget(this.rt[b]); this.flowQuad.render(renderer);
    this.cur = b; this.stepped++;
    renderer.autoClear = prevAuto;
    renderer.setRenderTarget(prevT); renderer.setClearColor(this._prev, prevA);
  }
}
