#!/usr/bin/env node
// view.mjs — the view half of the arrival rule, in bare node: the real
// Actors (render/actors.js) and its ArenaLight (render/light.js) synced off
// the real sim, on a real three, with no GPU and no page.
//
// The sim half is held by test/sim.mjs and each species' own test; this holds
// what only the view does, which nothing else runs:
//   - a brood waiting out its parent's 0.28 s death pop (SPLITTA, REDD, PURP:
//     1.x built it when the pop ended, main.js:10586-10620) is not drawn and
//     casts no shadow; the step it is let out it is drawn whole, at full size
//     ("at full size, with no birth animation", docs/port-1x/species-a.md),
//     and no big death's ripple marks it meanwhile (1.x main.js:4518-4529)
//   - a fresh body spawned outright is drawn from its first step, small, and
//     swells to full size over TUNING.gel.swell (owner, 2026-10-22: dangerous
//     from frame one, only its look swells in)
//
// actors.js imports `three/webgpu` and `three/tsl` as the page's importmap
// maps them, so a resolve hook reads that importmap out of index.html and
// maps the same specifiers to the same vendored, tokened files.
//
// Usage: node test/view.mjs           (exit 1 on any failure)
import { register } from 'node:module';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', ROOT), 'utf8');
const imap = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const MAP = Object.fromEntries(Object.entries(imap).map(([k, v]) => [k, new URL(v, ROOT).href]));
register('data:text/javascript,' + encodeURIComponent(`const MAP = ${JSON.stringify(MAP)};
export async function resolve(spec, ctx, next) {
  return MAP[spec] ? { url: MAP[spec], shortCircuit: true } : next(spec, ctx);
}`));

// the least of a page the view's constructors touch: canvases for its
// generated textures (a 2D context that draws nothing)
const noop = () => {};
const ctx2d = new Proxy({}, {
  get: (t, k) => (k in t ? t[k]
    : k === 'measureText' ? () => ({ width: 10 })
    : k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern' ? () => ({ addColorStop: noop })
    : k === 'getImageData' || k === 'createImageData' ? (x, y, w = 1, h = 1) => ({ data: new Uint8ClampedArray(4 * Math.max(1, w * h)), width: w, height: h })
    : noop),
  set: (t, k, v) => { t[k] = v; return true; },
});
const canvas = () => ({ width: 64, height: 64, style: {}, getContext: () => ctx2d, addEventListener: noop, removeEventListener: noop, toDataURL: () => '' });
globalThis.document ??= { createElement: canvas, createElementNS: canvas, body: { appendChild: noop }, addEventListener: noop };
globalThis.window ??= globalThis;
// the view's own dice (a body's breathing phase, a droplet's flight) are
// Math.random, as they may be; seeded here so a run of this gate is a replay
Math.random = ((a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(20261022);

const at = (p) => new URL(p, ROOT).href;
const THREE = await import(MAP['three/webgpu']);
const { Actors } = await import(at('js/render/actors.js?v=156'));
const { LOOKS } = await import(at('js/render/looks/index.js?v=156'));
const { createWorld, step, api } = await import(at('js/sim/world.js?v=156'));
const { TUNING: T } = await import(at('js/tuning.js?v=156'));

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

const dt = T.sim.dt, A = T.light.arena;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const splats = { spawn: noop, puddle: noop, step: noop, reset: noop, onEvent: noop };
const actors = new Actors(new THREE.Scene(), splats);

// the grow the view hands each body's shaping, as it hands it: the default
// shaping (`_shape`) for a plain dome or cube, and the look's own update
const grown = new Map();
const shape = actors._shape.bind(actors);
actors._shape = (v, time, grow, tell) => { grown.set(v, grow); return shape(v, time, grow, tell); };
for (const L of Object.values(LOOKS)) {
  if (typeof L?.update !== 'function') continue;
  const up = L.update;
  L.update = function (v, g, w, time, grow, ...rest) { grown.set(v, grow); return up.call(this, v, g, w, time, grow, ...rest); };
}

// one frame as main.js runs it: the step, its events to the view, the sync
let clock = 0;
function frame(w, input = IDLE) {
  grown.clear();
  step(w, input);
  for (const e of w.events) actors.onEvent(e, w);
  clock += dt;
  actors.sync(w, 1, clock);
}
const quiet = (seed = 5) => {
  actors.reset();
  const w = createWorld({ seed }); w.director = { step() {} };
  w.hero.mercy = 1e9; w.hero.lives = 1e9;
  return w;
};
// the body's largest drawn scale in the world: every visible mesh under its root
function drawn(v) {
  if (!v.root.visible) return 0;
  v.root.updateMatrixWorld(true);
  let m = 0;
  const s = new THREE.Vector3();
  v.root.traverse((o) => { if (o.isMesh && o.visible) { s.setFromMatrixScale(o.matrixWorld); m = Math.max(m, s.x, s.y, s.z); } });
  return m;
}
// the shadow discs the light map holds this frame: [x, z, r]
function shades() {
  const m = actors.light.shades, out = [], M = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, M); M.decompose(p, q, s); out.push([p.x, p.z, s.x / 2]); }
  return out;
}
const shadeOn = (g) => shades().find(([x, z]) => near(x, g.x, 1e-6) && near(z, g.z, 1e-6));

// ── a brood: not drawn, no shadow while it waits; whole the step it is let out ──
// 1.x's pop: _deathT = 0.28 counted down a frame at a time, the brood built on
// the frame it reaches 0 (enemy.js:2970, 2996, 3007)
const popFrames = (() => { let t = 0.28, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; })();
for (const parent of ['splitta', 'redd', 'purp']) {
  const w = quiet();
  const p = api.spawn(w, parent, 6, 0); p.anchored = true;
  if (p.s.fireT != null) p.s.fireT = 1e9;
  frame(w);
  p.hp = 1; api.heroBullet(w, p.x - p.r - 0.3, p.z, 0);
  frame(w);
  const kids = w.gels.filter((c) => c.alive && c.child);
  for (const c of kids) c.anchored = true;
  check(`${parent}: a bullet kill hands its brood to the core's wait`, !p.alive && kids.length > 0 && kids.every((c) => c.state === 'appear'), `${kids.length}`);
  let hidden = true, unshaded = true, released = -1, n = 0;
  for (n = 1; n <= popFrames + 2 && released < 0; n++) {
    frame(w);
    if (kids.every((c) => c.state === 'active')) { released = n; break; }
    hidden &&= kids.every((c) => { const v = actors.views.get(c.id); return !v || v.root.visible === false; });
    unshaded &&= kids.every((c) => !shadeOn(c));
  }
  check(`${parent}: let out on 1.x's frame, ${popFrames} steps after the kill`, released === popFrames, `${released}`);
  check(`${parent}: while it waits it is not drawn (actors.js: root.visible false)`, hidden);
  check(`${parent}: …and casts no shadow on the light map (light.js)`, unshaded);
  const views = kids.map((c) => actors.views.get(c.id));
  check(`${parent}: the step it is let out, every one is drawn`, views.every((v) => v && v.root.visible === true));
  check(`${parent}: …whole: the view hands it grow 1, no swell (a child never swells)`, views.every((v) => grown.get(v) === 1), views.map((v) => grown.get(v)).join(','));
  check(`${parent}: …at rest: the sim's squash is 1 (1.x enemy.js:669-670)`, kids.every((c) => c.sq === 1 && c.sqV === 0), kids.map((c) => `${c.sq}/${c.sqV}`).join(','));
  check(`${parent}: …and it stands in its full shadow`, kids.every((c, j) => { const s = shadeOn(c); return s && near(s[2], c.r * A.shadow.r * (views[j].shadow ?? 1), 1e-6); }),
    kids.map((c) => (shadeOn(c) || [0, 0, -1])[2].toFixed(3)).join(','));
  // and in size: against the same kind spawned outright and drawn once its
  // swell is over — a body still swelling in would be under a quarter of it
  const out = views.map(drawn);
  const ref = quiet(), rc = api.spawn(ref, kids[0].kind, -6, 4); rc.anchored = true;
  while (rc.t < T.gel.swell) frame(ref);
  const whole = drawn(actors.views.get(rc.id));
  check(`${parent}: …drawn at a whole ${kids[0].kind}'s size, not swelling in`, whole > 0 && out.every((x) => x / whole > 0.8 && x / whole < 1.25), out.map((x) => (x / whole).toFixed(3)).join(','));
}

{
  // a big death's ripple (1.x main.js:4518-4529: _hitRipple 0.75 on the
  // bodies alive at the kill) passes a brood still waiting out a pop: 1.x had
  // not built it yet, so it comes out unrippled as well as unsquashed
  const w = quiet();
  const p = api.spawn(w, 'redd', 0, 0); p.anchored = true;
  const other = api.spawn(w, 'orange', 0, 3); other.anchored = true;
  const live = api.spawn(w, 'globbo', 2, 3); live.anchored = true;
  frame(w);
  api.kill(w, p, 'env');
  const kids = w.gels.filter((c) => c.alive && c.child);
  for (const c of kids) c.anchored = true;
  for (let n = 1; n <= 5; n++) frame(w);
  w.events.length = 0;
  api.kill(w, other, 'env');
  for (const e of w.events) actors.onEvent(e, w);
  const by = kids.filter((c) => Math.hypot(c.x - other.x, c.z - other.z) <= T.death.shockRadius);
  check('a second big death beside the waiting brood ripples a live body (the control)', actors.views.get(live.id).hit > 0);
  check('…but not the brood, whose views exist (hidden) while it waits', by.length > 0 && kids.every((c) => { const v = actors.views.get(c.id); return v && v.root.visible === false && v.hit === 0; }),
    kids.map((c) => actors.views.get(c.id)?.hit).join(','));
}

// ── a fresh body spawned outright: drawn at once, small, swelling to whole ──
// the step its t first reaches the swell (t accumulated as the sim does it)
const swellSteps = (() => { let t = 0, n = 0; while (t < T.gel.swell) { t += dt; n++; } return n; })();
check('the swell is a few steps: TUNING.gel.swell 0.15 s', T.gel.swell === 0.15 && swellSteps === 9, `${swellSteps}`);
for (const kind of ['globbo', 'yela', 'redd', 'spittor']) {
  const w = quiet();
  const g = api.spawn(w, kind, 8, 3); g.anchored = true;
  if (g.s.fireT != null) g.s.fireT = 1e9;
  const sizes = [], grows = [], shade = [];
  for (let n = 1; n <= 40; n++) {
    frame(w);
    const v = actors.views.get(g.id);
    sizes.push(drawn(v)); grows.push(grown.get(v)); shade.push(shadeOn(g)?.[2] ?? 0);
  }
  const full = sizes[swellSteps - 1];
  check(`${kind}: drawn from its first step`, sizes[0] > 0 && actors.views.get(g.id).root.visible);
  check(`${kind}: …at under a quarter of the size it is drawn at once whole`, sizes[0] / full < 0.25, `${(sizes[0] / full).toFixed(3)}`);
  check(`${kind}: …the view's swell from 15% (0.15 + 0.85·smooth(t / swell))`, near(grows[0], 0.15 + 0.85 * ((x) => x * x * (3 - 2 * x))(dt / T.gel.swell), 1e-12), `${grows[0]}`);
  check(`${kind}: …growing every step until the swell ends`, grows.slice(0, swellSteps - 1).every((x, i) => x < 1 && (i === 0 || x > grows[i - 1])));
  check(`${kind}: whole from step ${swellSteps} (t ≥ swell): grow 1 from then on`, grows.slice(swellSteps - 1).every((x) => x === 1) && grows[swellSteps - 2] < 1, grows.slice(swellSteps - 3, swellSteps + 1).join(','));
  check(`${kind}: …and what is drawn is that grow of the whole body, step by step`, sizes.slice(0, swellSteps).every((x, i) => Math.abs(x / grows[i] / full - 1) < 0.15), sizes.slice(0, swellSteps).map((x, i) => (x / grows[i] / full).toFixed(3)).join(','));
  check(`${kind}: its shadow swells with it, from 0 to its full disc`, shade[0] > 0 && shade[0] < 0.1 * g.r * A.shadow.r && near(shade[swellSteps - 1], g.r * A.shadow.r * (actors.views.get(g.id).shadow ?? 1), 1e-6), `${shade[0]} ${shade[swellSteps - 1]}`);
}

// v93: a body's shadow is the one the world's sun throws — an ellipse away from the sun, 1/sin θ as long as it is
// across, its middle on from the foot by offset × cot θ × r; the sun straight overhead throws the disc it was
{
  const w = quiet(11); w.hero.x = w.hero.px = -14; w.hero.z = w.hero.pz = 6;   // the hero far off: the only shadow by the gel is its own
  const g = api.spawn(w, 'globbo', 2, 1); frame(w); frame(w);
  const L = actors.light, M = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const find = () => { for (let i = 0; i < L.shades.count; i++) { L.shades.getMatrixAt(i, M); M.decompose(p, q, sc); if (Math.hypot(p.x - g.x, p.z - g.z) < 2) return { x: p.x, z: p.z, along: sc.x / 2, across: sc.z / 2 }; } return null; };
  const flat = find();
  check('the sun straight overhead: the shadow is a disc under the body', flat && near(flat.x, g.x, 1e-6) && near(flat.z, g.z, 1e-6) && near(flat.along, flat.across, 1e-9), JSON.stringify(flat));
  L.setSun(-16, 15, 10); frame(w);
  const cot = Math.hypot(16, 10) / 15, d = { x: 16 / Math.hypot(16, 10), z: -10 / Math.hypot(16, 10) }, e = find();
  const off = e && { x: e.x - g.x, z: e.z - g.z };
  check('the sun from the near left, 38° up: the shadow is 1/sin θ long away from the sun, its middle on from the foot', e && near(e.along / e.across, Math.sqrt(1 + cot * cot), 1e-6) && near(off.x, d.x * cot * A.shadow.sun.offset * e.across, 1e-6) && near(off.z, d.z * cot * A.shadow.sun.offset * e.across, 1e-6), JSON.stringify({ e, off, cot }));
  L.setSun(0, 20, 0); frame(w);
  const back = find();
  check('…and straight overhead again it is the disc', back && near(back.along, back.across, 1e-9) && near(back.x, g.x, 1e-6));
  L.setSun(0, 200, 1e-9);
}

// v92: the STYLE switch (render/style.js) — a stylised body paints itself with a fragmentNode and bends no
// light, a physical one has neither; the shared uniform follows the switch; actors.setStyle rebuilds the hero
// and the chunks in the style and sends every view back to its pool
{
  const { gelMaterial } = await import('../js/render/gel.js?v=156');
  const { setStyle, STYLE_U, STYLES, styleName } = await import('../js/render/style.js?v=156');
  const phys = gelMaterial(0x40c0a0, 'blob', 1, { style: 'physical' }), cel = gelMaterial(0x40c0a0, 'blob', 1, { style: 'cel' }), wc = gelMaterial(0x40c0a0, 'blob', 1, { style: 'watercolor' });
  check('STYLES are physical, cel and watercolor, physical first', JSON.stringify(STYLES) === '["physical","cel","watercolor"]');
  check('a physical body has no fragment of its own and bends light', !phys.fragmentNode && phys.transmission > 0 && phys.userData.style === 'physical', `${phys.transmission}`);
  check('a cel body and a watercolor body paint themselves and bend no light', !!cel.fragmentNode && !!wc.fragmentNode && cel.transmission === 0 && wc.transmission === 0 && cel.userData.style === 'cel' && wc.userData.style === 'watercolor');
  check('the switch sets the uniform the film and the drops read, and nonsense is physical', (setStyle('watercolor'), STYLE_U.value === 2 && styleName() === 'watercolor') && (setStyle('cel'), STYLE_U.value === 1) && (setStyle('nonsense'), STYLE_U.value === 0 && styleName() === 'physical'));
  const heroMat0 = actors.hero.mat, chunkMat0 = actors.chunkMesh.blob.material;
  actors.setStyle('cel');
  check('actors.setStyle rebuilds the hero and the chunks in the style and empties the floor', actors.look === 'cel' && actors.hero.mat !== heroMat0 && actors.hero.mat.userData.style === 'cel' && actors.hero.body.material === actors.hero.mat && actors.chunkMesh.blob.material !== chunkMat0 && !!actors.chunkMesh.blob.material.fragmentNode && actors.views.size === 0, `${actors.look} ${actors.views.size}`);
  actors.setStyle('physical');
  check('…and back: physical again, no fragment of its own', actors.look === 'physical' && !actors.hero.mat.fragmentNode && !actors.chunkMesh.blob.material.fragmentNode);
}

// ── v116: a new body is a material, not a shader build ───────────────
// three keys a compiled shader by its graph's nodes, so fresh nodes a body were a build a body, mid-fight; one
// graph a kind of gel is shared, each body's own numbers read off its own material as it is drawn
{
  const { gelMaterial } = await import(at('js/render/gel.js?v=156'));
  const a = gelMaterial(0x33ddaa, 'blob', 1), b = gelMaterial(0xff5577, 'blob', 0.6), c = gelMaterial(0x33ddaa, 'cube', 1);
  check('two bodies of one kind of gel share one graph and one program key (one shader for all of them)',
    a.positionNode === b.positionNode && a.emissiveNode === b.emissiveNode && a.thicknessNode === b.thicknessNode && a.customProgramCacheKey() === b.customProgramCacheKey());
  check('…each with its own numbers (a hit on one is not a hit on the other)', a.userData.u !== b.userData.u && a.gel.hit !== b.gel.hit && a.userData.u.hit === a.gel.hit);
  check('another family has a graph of its own', c.positionNode !== a.positionNode);
  const { sprite, setPicture, labelTexture } = await import(at('js/render/pickups.js?v=156'));
  const s1 = sprite(5), s2 = sprite(6), tex = labelTexture('X', '#ffffff', '#000000');
  setPicture(s1, tex);
  check('a label sprite\'s picture is its material\'s map, and every sprite shares one program key', s1.material.map === tex && s1.material.customProgramCacheKey() === s2.material.customProgramCacheKey());
}

// v134 (owner, 2026-11-10: "save the heart. The previous damage to the heart remains after a restart"): a heart room
// started again draws its heart's ring whole — reset() had marked the arc whole without redrawing it, so a fresh
// heart matched the mark and the ring went on showing what the last attempt left
{
  const { ChallengeView } = await import(at('js/render/challenge.js?v=156'));
  const v = new ChallengeView(new THREE.Scene()), ring = () => v.heartArc.geometry.parameters.thetaLength / (2 * Math.PI);
  const room = (hp) => ({ ch: { goal: { type: 'protect' }, heart: { x: 0, z: 0, r: 1.4, hp, max: 8 } }, gels: [] });
  v.sync(room(4), 1, 0); const bitten = ring();
  v.reset(); v.sync(room(8), 1, 0); const again = ring();
  check('a heart room started again draws its heart whole (the ring at 4/8 is half of it; after a restart, at 8/8, all of it)', near(bitten, 0.5, 1e-6) && near(again, 1, 1e-6), `${bitten} → ${again}`);
}

// ── v138: the driveway's fallen leaves (render/leaves.js) ──────────────
{
  const { LeafLitter } = await import(at('js/render/leaves.js?v=156'));
  const L = T.scenery.driveway.leaves, HX = 16, HZ = 27.5, make = () => { const l = new LeafLitter(); l.build(HX, HZ, (m) => m); return l; };
  const a = make(), b = make(), IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false }, dt = T.sim.dt;
  check('the same leaves lie in the same places every time (their own seed)', a.n === L.slab + 2 * L.corner + L.lawn && a.n === b.n && a.x.every((v, i) => v === b.x[i] && a.z[i] === b.z[i]), `${a.n}`);
  let off = 0, near = 0;
  for (let i = 0; i < a.n; i++) { if (a.free[i] ? Math.abs(a.x[i]) > HX || Math.abs(a.z[i]) > HZ : Math.abs(a.x[i]) <= HX && a.z[i] >= -HZ) off++; if (!a.free[i] && a.z[i] > HZ - 1) near++; }
  check('a slab leaf lies on the slab, a lawn leaf past the curb, and none along the near side', off === 0 && near === 0, `${off} misplaced, ${near} along the near side`);
  const world = () => { const w = createWorld({ seed: 3, mode: 'arcade', world: 2, shape: 'portrait' }); w.director = { step() {} }; w.gels.length = 0; w.bullets.length = 0; w.posts.length = 0; w.hero.invinc = 1e9; return w; };
  const w = world(), snap = (l) => [...l.x, ...l.z, ...l.y];
  const s0 = snap(a); for (let i = 0; i < 120; i++) { step(w, IDLE); a.sync(w, dt); }
  check('nothing moves while nothing moves it', snap(a).every((v, i) => v === s0[i]));
  // a leaf out in the open, and the hero walked through it
  const open = (l, skip = -1) => { let best = -1, bd = -1; for (let i = 0; i < l.n; i++) { if (!l.free[i] || i === skip) continue; const d = Math.min(HX - Math.abs(l.x[i]), HZ - Math.abs(l.z[i])); let lone = 9; for (let j = 0; j < l.n; j++) if (j !== i && l.free[j]) lone = Math.min(lone, Math.hypot(l.x[i] - l.x[j], l.z[i] - l.z[j])); if (Math.min(d, lone * 3) > bd) { bd = Math.min(d, lone * 3); best = i; } } return best; };
  const i0 = open(a), x0 = a.x[i0], z0 = a.z[i0];
  w.hero.x = w.hero.px = x0 - 2; w.hero.z = w.hero.pz = z0;
  for (let i = 0; i < 70; i++) { step(w, { ...IDLE, mx: 1 }); a.sync(w, dt); }
  const went = Math.hypot(a.x[i0] - x0, a.z[i0] - z0);
  check('a hero walking through a leaf scuffs it out of its road', went > 0.15 && a.x[i0] > x0 - 0.05, `${went.toFixed(2)} m`);
  for (let i = 0; i < 300; i++) { step(w, IDLE); a.sync(w, dt); }
  check('…and it comes to rest, on the floor, on the slab', a.awake[i0] === 0 && a.y[i0] === 0 && Math.abs(a.x[i0]) <= HX && Math.abs(a.z[i0]) <= HZ + L.lawnOut, `awake ${a.awake[i0]} y ${a.y[i0]}`);
  // a walk past it out of reach leaves it; a dash past at the same distance is a gust
  const c = make(), w2 = world(), w3 = world(), i1 = open(c), side = T.hero.radius + L.scuff + 0.5;
  const pass = (l, ww, dash) => { const x1 = l.x[i1], z1 = l.z[i1]; ww.hero.x = ww.hero.px = x1 - 2.5; ww.hero.z = ww.hero.pz = z1 + side; for (let i = 0; i < 60; i++) { step(ww, { ...IDLE, mx: 1, dash: dash && i === 0 }); l.sync(ww, dt); } return Math.hypot(l.x[i1] - x1, l.z[i1] - z1); };
  const walked = pass(c, w2, false), d = make(), dashed = pass(d, w3, true);
  check('a walk past out of reach leaves a leaf lying; a dash past at the same distance blows it away', walked === 0 && dashed > 0.3, `walk ${walked.toFixed(2)}, dash ${dashed.toFixed(2)} m`);
  // a burst throws the leaves round it up, and they come down
  const e = make(), w4 = world(), i2 = open(e);
  e.onEvent({ type: 'kill', x: e.x[i2] + 0.6, z: e.z[i2], r: 1 });
  let top = 0; for (let i = 0; i < 240; i++) { step(w4, IDLE); e.sync(w4, dt); top = Math.max(top, e.y[i2]); }
  check('a burst throws the leaves round it into the air, and they land again', top > 0.15 && e.y[i2] === 0 && e.awake[i2] === 0, `top ${top.toFixed(2)} m`);
  let lawnMoved = 0; for (const l of [a, c, d, e]) for (let i = 0; i < l.n; i++) if (!l.free[i] && (l.x[i] !== b.x[i] || l.z[i] !== b.z[i])) lawnMoved++;
  check('the leaves on the lawn never move', lawnMoved === 0, `${lawnMoved}`);
  // never left lying inside what stands on the floor
  const f = make(), w5 = createWorld({ seed: 3, mode: 'arcade', world: 2, shape: 'portrait' }); w5.director = { step() {} }; w5.gels.length = 0; w5.hero.invinc = 1e9;
  for (let i = 0; i < f.n; i++) if (f.free[i]) f._kick(i, (i % 7) - 3, (i % 5) - 2, 2);
  for (let i = 0; i < 400; i++) { step(w5, IDLE); f.sync(w5, dt); }
  let inPost = 0; for (let i = 0; i < f.n; i++) if (f.free[i]) for (const p of w5.posts) if (!p.pit && Math.hypot(f.x[i] - p.x, f.z[i] - p.z) < p.r) inPost++;
  check('a leaf never lies inside what stands on the floor', inPost === 0, `${inPost}`);
}

// ── v139: a hole in the ice is broken through (render/posts.js shatter) ──────────────
{
  const { shatter, seededDots, ICE_SHATTER, pitSeed } = await import(at('js/render/posts.js?v=156'));
  const K = ICE_SHATTER(), pits = T.posts.worlds[7].pits.at.map(([x, z, r]) => ({ x, z, r })), brk = (p) => shatter(p, K, seededDots(pitSeed(p)));
  const A = brk(pits[0]), A2 = brk(pits[0]), B = brk(pits[1]), d = (p, [x, z]) => Math.hypot(x - p.x, z - p.z);
  check('the same hole breaks the same way every time', JSON.stringify(A) === JSON.stringify(A2));
  check('two holes break differently', A.hole.length !== B.hole.length || A.hole.some(([x, z], i) => Math.abs((x - pits[0].x) - (B.hole[i][0] - pits[1].x)) > 1e-6 || Math.abs((z - pits[0].z) - (B.hole[i][1] - pits[1].z)) > 1e-6), `${A.hole.length} and ${B.hole.length} corners`);
  const inside = [[pits[0], A], [pits[1], B]].every(([p, S]) => S.hole.every((c) => d(p, c) <= p.r * K.hole[1] + 1e-9 && d(p, c) >= p.r * K.hole[0] - 1e-9));
  check('every corner of the opening lies inside the circle a body stops at', inside && K.hole[1] < 1, `${K.hole[0]}–${K.hole[1]} of the radius`);
  const collar = [[pits[0], A], [pits[1], B]].every(([p, S]) => S.out.every((c) => d(p, c) >= p.r * K.collar[0] - 1e-9 && d(p, c) <= p.r * K.collar[1] + 1e-9) && S.floes.every((f) => f.pts.every(([x, , z]) => d(p, [x, z]) <= p.r * K.collar[1] + 1e-9 && d(p, [x, z]) >= p.r * K.hole[0] * 0.5)));
  check('the floes lie round the opening, out to the circle a body stops at', collar && A.floes.length >= A.hole.length, `${A.floes.length} floes round ${A.hole.length} sides`);
  const starts = A.runs.filter((r, i) => A.out.some(([x, z]) => Math.hypot(r[0] - x, r[1] - z) < 1e-9)).length, sharp = A.runs.every((r) => r[4] > r[5] || r[5] === 0);
  check('cracks run on from the collar\'s corners, thinning as they go', starts >= 3 && sharp && A.runs.some((r) => r[5] === 0), `${starts} cracks, ${A.runs.length} runs`);
}

// ── v140: the floors of worlds 3–9 are made of pieces (render/floor.js) ──────────────
// A piece's kind is read off ONE hash against shares: what must not overlap may not add up past the whole
{
  const F = T.worlds.floor, share = (v) => v > 0 && v < 1;
  const sw = F.sewer.vary, ci = F.cistern.vary, bo = F.boiler.vary, co = F.core.tiles.vary;
  check('the sewer: a pair of stones is one long stone or two cut ones, never both', share(sw.long) && share(sw.short) && sw.long + sw.short < 1, `${sw.long} + ${sw.short}`);
  check('the cistern: long slabs, small tiles and sunk slabs are each a share, and its border fits inside the pool', share(ci.long) && share(ci.small) && share(ci.sunk) && ci.border.in + ci.border.w < 4 && ci.border.tile < ci.border.w, `border ${ci.border.in}+${ci.border.w} m`);
  check('the boiler: a patch is the exception, and the temper colours stop short of the next grate', share(bo.patch) && bo.patch < 0.25 && bo.temper.reach < F.boiler.grate / 2 - Math.max(...F.boiler.grateW), `${bo.temper.reach} m of ${(F.boiler.grate / 2 - Math.max(...F.boiler.grateW)).toFixed(2)}`);
  check('the core: a tile is a vent or carries a lamp, never both', share(co.vents) && share(co.lamps) && co.vents + co.lamps < 1, `${co.vents} + ${co.lamps}`);
  check('the river\'s fish fit their cells, and come back before they are out of sight of the hero', F.river.fish.kinds.every((k) => k.len[1] < k.cell[0] && k.shy[0] < k.shy[1]), F.river.fish.kinds.map((k) => `${k.len[1]} m in ${k.cell}`).join('; '));
  check('the deep\'s finds fit their cells', F.deep.finds.star * 2 < F.deep.finds.cell * 0.5 && F.deep.finds.shell < F.deep.finds.star, `${F.deep.finds.star} m in ${F.deep.finds.cell}`);
  check('the ice\'s snow is a dusting: the floor still shows through it', F.ice.snow.k <= 0.6, `${F.ice.snow.k}`);
}

// ── v141: the ice's chips (render/leaves.js 'chips') ──────────────
{
  const { LeafLitter } = await import(at('js/render/leaves.js?v=156'));
  const C = T.scenery.ice.chips, Lv = T.scenery.driveway.leaves, dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
  const world = (n) => { const w = createWorld({ seed: 3, mode: 'arcade', world: n, shape: 'portrait' }); w.director = { step() {} }; w.gels.length = 0; w.bullets.length = 0; w.hero.invinc = 1e9; return w; };
  const w7 = world(7), HX = w7.hx, HZ = w7.hz, make = () => { const l = new LeafLitter('chips'); l.build(HX, HZ, (m) => m); return l; };
  const a = make(), b = make();
  check('the same chips lie in the same places every time, all of them on the sheet', a.n === C.n && a.x.every((v, i) => v === b.x[i] && a.z[i] === b.z[i] && Math.abs(v) <= HX && Math.abs(a.z[i]) <= HZ), `${a.n}`);
  // the same kick, to a chip and to a leaf: the chip goes much further (ice on ice)
  const slide = (l, i) => { const x0 = l.x[i], z0 = l.z[i]; l._kick(i, 6, 0, 0); const w = world(2); w.posts.length = 0; w.hero.x = w.hero.px = 1e3; for (let k = 0; k < 1200 && l.awake[i]; k++) l.sync(w, dt); return Math.hypot(l.x[i] - x0, l.z[i] - z0); };
  const mid = (l) => { let best = 0, bd = 1e9; for (let i = 0; i < l.n; i++) if (l.free[i]) { const d = Math.hypot(l.x[i] + HX * 0.5, l.z[i]); if (d < bd) { bd = d; best = i; } } return best; };
  const lf = new LeafLitter(); lf.build(HX, HZ, (m) => m);
  const far = slide(make(), mid(a)), near = slide(lf, mid(lf));
  check('a kicked chip skitters several times as far as a kicked leaf', far > near * 2.5 && far > 4, `chip ${far.toFixed(1)} m, leaf ${near.toFixed(1)} m`);
  // off the banks on all four sides — the near one too
  const c = make(), i0 = mid(c); c.x[i0] = 0; c.z[i0] = HZ - 1; c._kick(i0, 0, 12, 0);
  let maxZ = 0; for (let k = 0; k < 600 && c.awake[i0]; k++) { c.sync(w7, dt); maxZ = Math.max(maxZ, c.z[i0]); }
  check('a chip comes back off the near bank (a leaf goes out onto the lawn)', maxZ <= HZ && c.z[i0] < HZ - 0.5, `furthest ${maxZ.toFixed(2)} of ${HZ}`);
  // down a hole, and gone; past it, not
  const pit = w7.posts.find((p) => p.pit), d = make(), i1 = mid(d), i2 = (i1 + 1) % d.n;
  d.x[i1] = pit.x - pit.r - 1.5; d.z[i1] = pit.z; d._kick(i1, 7, 0, 0);
  d.x[i2] = pit.x - pit.r - 1.5; d.z[i2] = pit.z + pit.r + 1.2; d._kick(i2, 7, 0, 0);
  for (let k = 0; k < 900; k++) d.sync(w7, dt);
  check('a chip that slides into a hole in the ice goes down it and is gone; one that slides past lies on', d.sunk[i1] === 2 && d.free[i1] === 0 && d.sunk[i2] === 0 && d.y[i2] === 0, `in: sunk ${d.sunk[i1]}; past: sunk ${d.sunk[i2]}`);
  d._kick(i1, 5, 5, 3); for (let k = 0; k < 60; k++) d.sync(w7, dt);
  check('…and nothing brings it back', d.sunk[i1] === 2 && d.awake[i1] === 0);
  check('the driveway\'s leaves are the driveway\'s still (no chip numbers in them)', Lv.sink == null && Lv.bounce == null && new LeafLitter().kindName === 'leaves');
}

// ── v142: a smaller floor takes its share of what lies loose on it (render/leaves.js) ──────────────
{
  const { LeafLitter } = await import(at('js/render/leaves.js?v=156'));
  const L = T.scenery.driveway.leaves, C = T.scenery.ice.chips, lay = (kind, hx, hz) => { const l = new LeafLitter(kind); l.build(hx, hz, (m) => m); return l; };
  const big = lay('leaves', 16, 27.5), room = lay('leaves', 8, 14), onSlab = (l, hx, hz) => { let n = 0; for (let i = 0; i < l.n; i++) if (l.free[i]) n++; return n; };
  const want = Math.round(L.slab * (8 * 14) / (16 * 27.5)) + 2 * Math.round(L.corner * (8 * 14) / (16 * 27.5));
  check('a campaign room a quarter the arcade floor\'s size has a quarter of its leaves, not all of them', onSlab(big) === L.slab + 2 * L.corner && onSlab(room) === want && want < onSlab(big) * 0.3, `${onSlab(room)} of ${onSlab(big)}`);
  let off = 0; for (let i = 0; i < room.n; i++) if (room.free[i] && (Math.abs(room.x[i]) > 8 || Math.abs(room.z[i]) > 14)) off++;
  check('…and they lie on its own slab', off === 0, `${off} off it`);
  const rink = lay('chips', 11, 11);
  check('the ice\'s chips take their share of a small sheet too', rink.n === Math.round(C.n * 121 / 440) && lay('chips', 20, 30).n === C.n, `${rink.n} of ${C.n}`);
}

// ── v143: the water answers the hero (render/floor.js cistern and river `wake`) ──────────────
{
  const F = T.worlds.floor, cw = F.cistern.wake, rw = F.river.wake;
  check('the cistern\'s rings are thin lines well apart, and gone within a few metres: a texture under the fight', cw.width * 6 < cw.gap && cw.reach <= 5 && cw.gain <= 0.3, `${cw.width} m every ${cw.gap} m, out to ${cw.reach} m`);
  check('the river\'s wake opens behind the hero and is gone within a few metres', rw.open > 0 && rw.open < 1 && rw.reach <= 3 && rw.k <= 0.7 && rw.r >= T.hero.radius * 0.5, `opens ${rw.open}, ${rw.reach} m`);
}

// ── v144: the water as water (render/water.js) — what can be held without a GPU ──────────────
{
  const { Water } = await import(at('js/render/water.js?v=156'));
  const P = T.water.cistern, wk = new Water();
  check('a world with no water of its own has none: nothing is stamped, nothing stepped', !wk.on && (wk.splash(0, 0, 1, 0.1), wk.step(0.1), wk.ns === 0));
  wk.use(P); wk.setArena(16, 27.5);
  const [tw, th] = [wk.rt[0].width, wk.rt[0].height];
  check('the cistern\'s water covers its floor at a hand a texel, never more than its cap a side', wk.on && Math.max(tw, th) <= P.maxTexels && Math.abs(tw / th - 16 / 27.5) < 0.02 && wk.px <= 0.13, `${tw}×${th}, ${wk.px.toFixed(3)} m a texel`);
  // the explicit step holds while K = 4 (c dt / dx)² stays under 2; a wave must lose height, and the level come back
  check('the wave equation\'s step is stable, a wave dies, and the level settles', wk.U.K.value > 0.05 && wk.U.K.value < 1.6 && wk.U.damp.value < 1 && wk.U.damp.value > 0.98 && wk.U.level.value < 1, `K ${wk.U.K.value.toFixed(3)}, damp ${wk.U.damp.value.toFixed(4)}`);
  wk.use(P); wk.setArena(40, 40);
  check('a floor too big for a hand a texel is covered coarser, not bigger', Math.max(wk.rt[0].width, wk.rt[0].height) <= P.maxTexels && wk.U.K.value < 1.6, `${wk.rt[0].width}×${wk.rt[0].height}`);
  wk.use(P); wk.setArena(16, 27.5);
  const w = { hero: { alive: true, x: 2, z: 0, px: 2, pz: 0 }, gels: [{ alive: true, state: 'active', id: 7, r: 1, x: 5.1, z: 0, px: 5, pz: 0 }, { alive: true, state: 'appear', t: -1, id: 8, r: 1, x: 0, z: 0, px: 0, pz: 0 }],
    posts: [{ x: 0, z: 5, r: 1.5 }, { x: 4, z: -5, r: 2, pit: true }] };
  wk.setBodies(w, 1, 1 / 60);
  check('the hero and every gel that is there are in the water; a brood still waiting is not', wk.nb === 2, `${wk.nb}`);
  check('what stands on the floor stands in the water: a post turns a wave back, a pit takes it', wk.solids.geometry.instanceCount === 2 && wk.mA.getW(0) === 0 && wk.mA.getW(1) === 1 && wk.maskDirty);
  wk.step(1 / 60);
  const still = [wk.wB.getX(0), wk.wB.getY(0)], moved = [wk.wB.getX(1), wk.wB.getY(1)];
  check('a body standing still pushes no water aside; one moving pushes it along its way', still[0] === 0 && still[1] === 0 && Math.abs(moved[0] - 0.1) < 1e-6 && moved[1] === 0, `still ${still}, moving ${moved}`);
  const n0 = wk.ns; wk.onEvent({ type: 'kill', x: 1, z: 1, r: 1.2 }); wk.onEvent({ type: 'score', x: 1, z: 1 }); wk.onEvent({ type: 'kill' });
  check('a kill is a splash where the body was; an event with no place, or that is not the water\'s, is nothing', wk.ns === n0 + 1 && wk.wA.getW(n0) < 0, `${wk.ns - n0} stamps`);
  wk.ns = 0; wk.nb = 0; wk.sources = [{ x: -8, z: -17, r: 0.5, rate: 40, amp: 0.05, size: 0.36 }]; wk.carry = 0;
  for (let i = 0; i < 60; i++) { wk.step(1 / 60); }
  const falls = Array.from({ length: wk.ns }, (_, i) => Math.hypot(wk.wA.getX(i) + 8, wk.wA.getY(i) + 17)).filter((d) => d <= 0.5 + 1e-6).length;
  check('a fall goes on landing where it lands, at its own rate', falls >= 36 && falls <= 44, `${falls} in a second`);
  for (let i = 0; i < 4000; i++) wk.splash(0, 0, 1, 0.1);
  check('a frame can never stamp more than the buffers hold', wk.ns <= wk.wA.count);
  const sc = T.scenery.cistern.fall, lit = T.worlds.lit.cistern;
  check('the fall lands in the far half of the pool, never the near side, and only in a room with room for it', lit.lights.find((l) => l.shafts).frac[1] < -0.3 && sc.minArea > 12 * 12 && sc.minArea <= 16 * 27.5 && sc.r < 1, `at ${lit.lights.find((l) => l.shafts).frac}, rooms over ${sc.minArea} m²`);
  check('the cistern is dark: what lights the floor is its lamps and the breach, not the air', lit.ambient <= 0.25, `ambient ${lit.ambient}`);
}

// ── v145: the sewer's chute, the boiler's square decks and fans, the ice broken unevenly, the snow banked ──────────────
{
  const F = T.worlds.floor, Ch = F.sewer.chute, R = F.sewer.channel / 2;
  // v152 (owner, of v148's half-pipe: "a rectangular hole, when it should be a gentle concave stream"): a cosine dip,
  // level at its shoulders. The walk down the view ray to its bank (floor.js sewer) closes while the bank's steepest
  // slope × the ray's run stays under 1 (a ray as shallow as 1.35 m across a metre of fall, the far edge of a phone's view): here the same Newton's steps in plain numbers
  const dipAt = (cc) => { const u = Math.max(-1, Math.min(1, cc / R)) * Math.PI / 2; return Ch.deep * Math.cos(u) ** 2; }, steepest = Ch.deep * Math.PI / (2 * R);
  let walkOff = 0;
  for (let ci = -9; ci <= 9; ci++) for (const vc of [-1.35, -0.9, -0.5, 0, 0.5, 0.9, 1.35]) {
    const c0 = (ci / 9) * R, slopeAt = (cc) => Math.sin(Math.max(-1, Math.min(1, cc / R)) * Math.PI) * steepest; let cw = c0;
    const lo = Math.min(c0, c0 + vc * Ch.deep), hi = Math.max(c0, c0 + vc * Ch.deep);
    for (let k = 0; k < 3; k++) cw = Math.max(lo, Math.min(hi, cw - (cw - c0 - vc * dipAt(cw)) / Math.max(1 + vc * slopeAt(cw), 0.2)));   // Newton's step, kept between the floor and the bottom, as the floor takes it
    walkOff = Math.max(walkOff, Math.abs(cw - (c0 + vc * dipAt(cw))));   // how far from the bank it still is
  }
  check('the sewer\'s trench is GENTLE: shallow for its width, its banks never steep, and the walk down the view ray to them closes', Ch.deep <= 0.8 && Ch.deep >= 0.4 && steepest * 1.35 < 0.8 && walkOff < 0.01, `${Ch.deep} m deep in ${R * 2} m, steepest ${steepest.toFixed(2)}, the walk off by ${walkOff.toFixed(3)} m at worst`);
  const waterHalf = (2 * R / Math.PI) * Math.acos(Math.sqrt(1 - Ch.fill));
  check('its water lies level in the bottom of it, with bank to see on both sides, and nothing swings', Ch.fill >= 0.3 && Ch.fill <= 0.65 && waterHalf / R > 0.35 && waterHalf / R < 0.65 && Ch.stream === undefined && Ch.relief > 0 && Ch.dark < 0.6, `water over ${(waterHalf / R * 100).toFixed(0)}% of the width`);
  const { createWorld } = await import(at('js/sim/world.js?v=156'));
  // a deck is drawn as the box round its circles: nowhere on that box's edge may be far from a circle that blocks
  let worst = 0, decks = 0;
  for (const shape of ['portrait', 'landscape']) {
    const w = createWorld({ seed: 1, mode: 'arcade', world: 5, shape }), byG = new Map();
    for (const p of w.posts) if (p.kind === 'island') { if (!byG.has(p.g)) byG.set(p.g, []); byG.get(p.g).push(p); }
    for (const cs of byG.values()) {
      decks++;
      const x0 = Math.min(...cs.map((c) => c.x - c.r)), x1 = Math.max(...cs.map((c) => c.x + c.r)), z0 = Math.min(...cs.map((c) => c.z - c.r)), z1 = Math.max(...cs.map((c) => c.z + c.r)), cr = 0.75;
      for (let k = 0; k < 200; k++) {
        const t = k / 200 * 4, e = Math.floor(t), u = t - e;
        let [x, z] = e === 0 ? [x0 + (x1 - x0) * u, z0] : e === 1 ? [x1, z0 + (z1 - z0) * u] : e === 2 ? [x1 - (x1 - x0) * u, z1] : [x0, z1 - (z1 - z0) * u];
        // (the corner itself is rounded off: pull the point in to the rounded corner)
        const qx = Math.min(Math.max(x, x0 + cr), x1 - cr), qz = Math.min(Math.max(z, z0 + cr), z1 - cr), dq = Math.hypot(x - qx, z - qz);
        if (dq > cr) { x = qx + (x - qx) * cr / dq; z = qz + (z - qz) * cr / dq; }
        worst = Math.max(worst, Math.min(...cs.map((c) => Math.abs(Math.hypot(x - c.x, z - c.z) - c.r) * (Math.hypot(x - c.x, z - c.z) > c.r ? 1 : 0))));
      }
    }
  }
  check('the boiler\'s decks are rectangles, and what blocks is what is drawn (no edge of a deck further than a step from a circle)', decks === 4 && worst < 0.45, `${decks} decks, ${worst.toFixed(2)} m at worst`);
  const fans = T.worlds.lit.boiler.fans;
  check('the boiler room is dark, and its fans turn opposite ways, slowly', T.worlds.lit.boiler.ambient <= 0.3 && fans.length === 2 && fans[0].period * fans[1].period < 0 && fans.every((f) => Math.abs(f.period) >= 10 && f.k <= 1 && f.duty > 0.3 && f.duty < 0.7), fans.map((f) => f.period).join(' and ') + ' s a turn');
  const { ICE_SHATTER } = await import(at('js/render/posts.js?v=156'));
  const K = ICE_SHATTER();
  check('a hole in the ice is uneven, and the ice round it is broken back at least to where a body stops', K.uneven && K.oval >= 0.3 && K.hole[1] < 1 && K.collar[0] >= 1 && K.collar[1] > 1.25 && K.cracks.len[1] >= 2, `collar ${K.collar}, oval ${K.oval}`);
  const Sn = F.ice.snow;
  check('there is more snow, banked along the rail, and the floor still shows through all of it', Sn.at <= 0.52 && Sn.bank.deep > 0 && Sn.bank.max <= 0.9 && Sn.k <= 0.6, `at ${Sn.at}, banked to ${Sn.bank.max}`);
}

// ── v146: the river's water flows (render/water.js in the stream's own frame) and its fish are of several kinds ──────────────
{
  const { Water } = await import(at('js/render/water.js?v=156'));
  const P = T.water.river, wk = new Water();
  check('the river\'s water runs at the pace its floor is drawn running', P.flow.speed === T.worlds.floor.river.flow && P.flow.bank < T.worlds.floor.river.bank + 1e-9, `${P.flow.speed} and ${T.worlds.floor.river.flow} m/s`);
  wk.use(P); wk.setArena(16, 27.5);   // upright: the river runs along z
  check('a flowing water wraps along its stream and is walled across it', wk.wrapU.value.x === 0 && wk.wrapU.value.y === 1 && !wk.alongX);
  const w = { hero: { alive: true, x: 2, z: 0, px: 2, pz: 0 }, gels: [{ alive: true, state: 'active', id: 7, r: 1, x: 14, z: 3, px: 14, pz: 3 }], posts: [{ x: -4, z: 5, r: 1.5 }] };
  wk.setBodies(w, 1, 1 / 60); wk.step(1 / 60);
  // the hero stands still in the stream: the water goes by it at the stream's pace, so it pushes water aside UPSTREAM-ward
  const dz = wk.wB.getY(0), want = -P.flow.speed / 60;
  check('a body standing still in the stream moves through the water, at the stream\'s pace', Math.abs(dz - want) < 1e-6 && wk.wB.getX(0) === 0, `${dz.toFixed(4)} m a frame`);
  check('a body on the dry bank disturbs nothing; a rock in the stream parts it', wk.ns === 2 && wk.wA.getZ(1) > 1 && Math.abs(wk.wB.getY(1) - want) < 1e-6, `${wk.ns} stamps`);
  const d0 = wk.drift; for (let i = 0; i < 60; i++) wk.step(1 / 60);
  check('the water\'s frame is carried a second\'s run in a second, and the floor is told where', Math.abs(wk.drift - d0 - P.flow.speed) < 1e-6 && Math.abs(wk.driftUV.value.y - wk.drift / 55) < 1e-9 && wk.driftUV.value.x === 0, `${(wk.drift - d0).toFixed(3)} m`);
  // a splash at the seam is put down at both ends
  wk.ns = 0; wk.drift = 0; wk.splash(0, 27.4, 0.8, 0.1);
  check('a splash across the texture\'s seam is put down at both ends of it', wk.ns === 2 && Math.abs(wk.wA.getY(0) - wk.wA.getY(1)) === 55, `${wk.ns} stamps`);
  for (let i = 0; i < 40; i++) wk.step(1);   // the drift goes round and round
  check('the drift stays inside the floor\'s length however long the run', wk.drift >= 0 && wk.drift < 55, `${wk.drift.toFixed(2)}`);
  const kinds = T.worlds.floor.river.fish.kinds;
  check('the river has several kinds of fish, each in water of its own, none longer than its cell', kinds.length >= 3 && kinds.every((k) => k.len[1] < k.cell[0] && k.zone[0] < k.zone[1] && k.shy[0] < k.shy[1]) && new Set(kinds.map((k) => k.zone[0])).size >= 3, kinds.map((k) => `${k.len[1]} m`).join(', '));
  const ck = new Water(); ck.use(T.water.cistern); ck.setArena(16, 27.5);
  check('still water does not flow: the cistern\'s is walled all round and its frame stays put', ck.wrapU.value.x === 0 && ck.wrapU.value.y === 0 && (ck.step(1), ck.drift === 0));
}

// ── v147: the core's glass deck over the machine (render/floor.js core `under`) ──────────────
{
  const Un = T.worlds.floor.core.tiles.under;
  check('the core\'s rotor turns over its heart, both a real depth under the glass', Un.rotor >= 2 && Un.heart > Un.rotor * 2, `${Un.rotor} m and ${Un.heart} m down`);
  check('the rotor is mostly plate: its seams are thin, and there is an eye into the heart no wider than a ring', Un.gap * 2 < 0.2 && Un.cut * 2 < 0.2 && Un.hub < Un.ringW, `seams ${Un.gap * 2} of a ring, the eye ${Un.hub} m in rings of ${Un.ringW} m`);
  check('the heart beats twice and rests, about once a second, and each beat crosses the floor inside a beat or two', Un.period >= 0.9 && Un.period <= 1.6 && Un.second > 0.15 && Un.second < 0.45 && 27.5 / Un.waveSpeed < Un.period * 2.5, `every ${Un.period} s, across in ${(27.5 / Un.waveSpeed).toFixed(1)} s`);
  check('the pane is clear enough to see through and still a pane', Un.pane > 0.1 && Un.pane <= 0.5 && Un.glass.every((c) => c > 0.5 && c <= 1));
}

// ── v148: the river's pads tethered, the cistern's flotsam (render/kit.js lilyPads, render/leaves.js 'flotsam') ──────────────
{
  const Pd = T.scenery.river.pads, Wv = T.worlds.floor.river.wave;
  // a pad is drawn inside its own cell: its home (± 0.1 of a cell), its radius (≤ 0.27), and how far it may be moved
  const moved = (Pd.lean + Pd.sway + Pd.ride * 0.5 * Wv.gain) / Pd.cell;
  check('a lily pad is tethered: lean, swing and the waves together never carry it out of its own cell', 0.1 + 0.27 + moved <= 0.5 && Pd.lean > 0.1 && Pd.lean < 0.5 && Pd.ease > 0.3, `${(0.37 + moved).toFixed(3)} of a cell at most`);
  const { LeafLitter } = await import(at('js/render/leaves.js?v=156'));
  const Fl = T.scenery.cistern.flotsam, HX = 16, HZ = 27.5, src = [{ x: -6, z: -14 }], pit = { x: 6, z: 8, r: 1.7, pit: true };
  const make = (sources = src) => { const l = new LeafLitter('flotsam'); l.build(HX, HZ, (m) => m, sources); return l; };
  const a = make(), b = make();
  check('the same flotsam lies in the same places every time, all of it on the water', a.n === Fl.n && a.kindName === 'flotsam' && a.x.every((v, i) => v === b.x[i] && a.z[i] === b.z[i] && Math.abs(v) <= HX && Math.abs(a.z[i]) <= HZ), `${a.n}`);
  // nobody on the floor, one well: the water carries it there, over the lip, and it comes back in under the fall
  const w = { hero: { alive: false, x: 0, z: 0 }, gels: [], posts: [pit, { x: -8, z: 10, r: 1.0 }] }, dt = 1 / 30;
  let downs = 0, backNear = 0, bad = 0, inPost = 0;
  const was = new Uint8Array(a.n);
  for (let k = 0; k < 30 * 240; k++) {
    a.sync(w, dt);
    for (let i = 0; i < a.n; i++) {
      if (a.sunk[i] === 1 && !was[i]) downs++;
      if (was[i] && a.sunk[i] === 0) { if (Math.hypot(a.x[i] - src[0].x, a.z[i] - src[0].z) <= Fl.spawn + 0.2) backNear++; else bad++; }
      was[i] = a.sunk[i] === 1 ? 1 : 0;
    }
  }
  for (let i = 0; i < a.n; i++) { if (!Number.isFinite(a.x[i] + a.z[i] + a.y[i]) || Math.abs(a.x[i]) > HX || Math.abs(a.z[i]) > HZ || !a.free[i]) bad++; if (Math.hypot(a.x[i] + 8, a.z[i] - 10) < 1.0) inPost++; }
  check('the water carries it to a well and over the lip, and each one that goes down comes back in under the fall', downs >= 5 && backNear === downs && bad === 0 && inPost === 0, `${downs} went down in four minutes, ${backNear} came back at the fall, ${bad} lost, ${inPost} inside a column`);
  // afloat, it never comes to rest (a leaf on the driveway does)
  const still = make(), w0 = { hero: { alive: false, x: 0, z: 0 }, gels: [], posts: [] };
  for (let k = 0; k < 300; k++) still.sync(w0, dt);
  const x0 = still.x.slice(); for (let k = 0; k < 300; k++) still.sync(w0, dt);
  const went = still.x.map((v, i) => Math.abs(v - x0[i])), going = went.filter((d) => d > 1e-4).length, furthest = Math.max(...went);
  check('on a floor with no well it goes slowly round the room: nothing afloat goes to sleep, and nearly all of it is under way', still.awake.every((v) => v === 1) && going >= still.n * 0.8 && furthest < Fl.flow.lone * 10 * 1.5 + 0.01, `${going} of ${still.n} moved in ten seconds, ${furthest.toFixed(2)} m at most`);
  // a body going by pushes it aside, as it does a leaf
  const p = make(), i0 = 0; p.x[i0] = 0; p.z[i0] = 0.5;
  const wb = { hero: { alive: true, x: 0, z: 0, velX: 6, velZ: 0 }, gels: [], posts: [] };
  p.sync(wb, dt);
  check('a body going by pushes it out of its road', Math.hypot(p.vx[i0], p.vz[i0]) > Fl.flow.lone * 2 && p.vz[i0] > 0, `${Math.hypot(p.vx[i0], p.vz[i0]).toFixed(2)} m/s`);
  check('the driveway\'s leaves and the ice\'s chips are not afloat', !new LeafLitter().K.afloat && !new LeafLitter('chips').K.afloat && T.scenery.driveway.leaves.flow == null && T.scenery.ice.chips.flow == null);
}

// ── v149: the ice keeps a trail (render/water.js `trail`), the boiler room stokes (render/kit.js stoke) ──────────────
{
  const { Water } = await import(at('js/render/water.js?v=156'));
  const P = T.water.ice, Tr = P.trail, wk = new Water();
  wk.use(P); wk.setArena(16, 27.5);
  check('the ice keeps a trail, not a wave: its step fills in and softens, nothing runs', wk.U.trail.value === 1 && wk.paintU.value === 1 && wk.U.level.value < 1 && wk.U.level.value > 0.99 && wk.U.blur.value > 0 && wk.U.blur.value < 0.2, `kept ${wk.U.level.value.toFixed(5)} a step`);
  const half = Math.log(0.5) / Math.log(wk.U.level.value) / P.hz;
  check('a trail is half filled in again after `refill` seconds', Math.abs(half - Tr.refill) < 0.01, `${half.toFixed(2)} s`);
  // a body sliding, a body standing, a block adrift, a hole
  const dt = 1 / 60, w = { hero: { alive: true, x: 2, z: 0, px: 2 - 6 * dt, pz: 0 }, gels: [{ alive: true, state: 'active', id: 7, r: 1, x: -5, z: 3, px: -5, pz: 3 }], posts: [{ x: 6, z: -8, r: 1.4 }, { x: -6, z: 10, r: 2, pit: true }] };
  wk.setBodies(w, 1, dt); wk.step(dt);
  check('a body sliding sweeps the strip it crossed; one standing sweeps nothing; a block keeps its footprint swept; a hole none', wk.ns === 2
    && Math.abs(wk.wB.getX(0) - 6 * dt) < 1e-6 && wk.wA.getW(0) > 0 && wk.wA.getW(0) <= 1 && Math.abs(wk.wA.getZ(0) - P.body.hero * P.body.foot) < 1e-6
    && wk.wA.getX(1) === 6 && wk.wB.getX(1) === 0 && Math.abs(wk.wA.getZ(1) - 1.4 * Tr.block) < 1e-6, `${wk.ns} stamps, the hero's ${wk.wA.getW(0).toFixed(3)} of the way to bare`);
  check('a trail has no walls: nothing standing on the ice is masked out of it', wk.solids.geometry.instanceCount === 0);
  // a slow body sweeps less than a fast one, and never more than all of it
  const amt = (v) => { const k = new Water(); k.use(P); k.setArena(16, 27.5); k.setBodies({ hero: { alive: true, x: 0, z: 0, px: -v * dt, pz: 0 }, gels: [], posts: [] }, 1, dt); k.step(dt); return k.ns ? k.wA.getW(0) : 0; };
  check('the faster it slides the harder it sweeps, up to `full`; under `minSpeed` not at all', amt(Tr.minSpeed * 0.9) === 0 && amt(1.5) > 0 && amt(1.5) < amt(Tr.full) && amt(Tr.full) === amt(Tr.full * 3) && amt(40) <= 1, `${amt(1.5).toFixed(3)} at 1.5 m/s, ${amt(Tr.full).toFixed(3)} at ${Tr.full}`);
  wk.ns = 0; wk.onEvent({ type: 'kill', x: 1, z: 1, r: 1 });
  check('a burst clears a disc of snow (a positive stamp, never past bare)', wk.ns === 1 && wk.wA.getW(0) > 0.5 && wk.wA.getW(0) <= 1 && wk.wA.getZ(0) > 1, `${wk.wA.getW(0).toFixed(2)} over ${wk.wA.getZ(0).toFixed(2)} m`);
  const ck = new Water(); ck.use(T.water.cistern); ck.setArena(16, 27.5);
  check('the cistern\'s water is still a wave (no trail in it)', ck.U.trail.value === 0 && ck.paintU.value === 0 && ck.trail === null);
  const Sn = T.worlds.floor.ice.snow;
  check('the ice has snow to sweep everywhere: a dusting thinner than the drifts, spindrift thinner still, and a swept trail is nearly bare', Sn.dust.k > 0.2 && Sn.dust.k < Sn.k && Sn.spindrift.k < Sn.dust.k && Sn.trail.sweep > 0.8 && Sn.trail.sweep <= 1);
  // the stoke: a flare that runs the length of the hall once a beat
  const { stokeAt } = await import(at('js/render/kit.js?v=156'));
  const B = T.worlds.floor.boiler, Sk = B.stoke, span = Math.abs(stokeAt(Sk, [0, 27.5]) - stokeAt(Sk, [0, -27.5]));
  check('the boiler room stokes on a slow beat, and the flare runs the hall\'s length in under one of them', Sk.period >= 5 && Sk.period <= 12 && Sk.rise < Sk.fall && Sk.fall < 0.8 && span > 0.5 && span < 1, `every ${Sk.period} s, ${span.toFixed(2)} of a cycle end to end`);
  check('under each grate is a pit with a bed in it, shallower than the grate is wide', B.lattice.pit.depth > 0.2 && B.lattice.pit.depth < 2 * (B.grateW[1] - B.lattice.frame));
  const Fv = T.scenery.boiler.floorVent;
  check('the floor\'s steam is let off near the rail, never in the middle of the fight, and after the flare', Fv.inside[0] >= 0.35 && Fv.inside[1] >= 0.35 && Fv.lag > 0 && Fv.lag + Fv.on < Sk.fall + 0.2 && Fv.gain <= 0.5);
}

// ── v150: the deep has life and light (crabs, shoals, shafts), the core's machine is driven by its heart ──────────────
{
  const { LeafLitter } = await import(at('js/render/leaves.js?v=156'));
  const Cr = T.scenery.deep.crabs, HX = 16, HZ = 27.5, dt = 1 / 30;
  const make = () => { const l = new LeafLitter('crabs'); l.build(HX, HZ, (m) => m); return l; };
  const a = make(), b = make();
  check('the same crabs start in the same places every time, all of them on the bed', a.n === Cr.n && a.K.alive && !a.K.afloat && a.x.every((v, i) => v === b.x[i] && Math.abs(v) <= HX && Math.abs(a.z[i]) <= HZ), `${a.n}`);
  // nobody about: they scuttle a little way and wait, and go again
  const w0 = { hero: { alive: false, x: 0, z: 0 }, gels: [], posts: [{ x: 4, z: 4, r: 1.5 }] }, x0 = a.x.slice(), z0 = a.z.slice();
  let going = 0, waiting = 0, fastest = 0;
  for (let k = 0; k < 30 * 20; k++) { a.sync(w0, dt); for (let i = 0; i < a.n; i++) { if (a.go[i]) going++; else waiting++; fastest = Math.max(fastest, Math.hypot(a.vx[i], a.vz[i])); } }
  const moved = a.x.filter((v, i) => Math.hypot(v - x0[i], a.z[i] - z0[i]) > 0.3).length, inPost = a.x.filter((v, i) => Math.hypot(v - 4, a.z[i] - 4) < 1.5).length;
  check('left alone a crab scuttles a little way, waits, and goes again; none walks through what stands on the bed or off it', moved >= a.n * 0.8 && going > 0 && waiting > going * 0.5 && fastest <= Cr.run + 0.01 && inPost === 0 && a.x.every((v, i) => Math.abs(v) <= HX && Math.abs(a.z[i]) <= HZ && Number.isFinite(v + a.z[i])) && a.awake.every((v) => v === 1),
    `${moved} of ${a.n} moved, going ${(going / (going + waiting) * 100).toFixed(0)}% of the time, ${fastest.toFixed(2)} m/s at most`);
  // a body comes near: it runs, away
  const c = make(); c.x[0] = 1.2; c.z[0] = 0; const wb = { hero: { alive: true, x: 0, z: 0, velX: 0, velZ: 0 }, gels: [], posts: [] };
  for (let k = 0; k < 20; k++) c.sync(wb, dt);
  check('a crab runs from a body that comes near, straight away from it and faster than it walks', c.x[0] > 1.6 && c.vx[0] > Cr.run && Math.abs(c.vz[0]) < 0.5, `${c.x[0].toFixed(2)} m off, at ${c.vx[0].toFixed(2)} m/s`);
  const Dp = T.worlds.floor.deep, lights = T.worlds.lit.deep.lights, shafts = lights.filter((L) => L.shaft);
  check('the deep is lit from the surface in shafts as well as by what lives in it', shafts.length >= 2 && shafts.every((L) => L.r > 4 && L.h > 5) && lights.length - shafts.length >= 3 && Dp.sun.shaft > 0 && !!T.scenery.deep.shafts);
  check('its shoals are of more than one kind, each fish shorter than the water it is given, each kind its own way', Dp.shoal.kinds.length >= 2 && Dp.shoal.kinds.every((k) => k.len[1] < k.cell[0] && k.len[1] * k.girth * 2 < k.cell[1] && k.shy[0] < k.shy[1] && k.keep > 0 && k.keep < 1) && new Set(Dp.shoal.kinds.map((k) => k.heading)).size === Dp.shoal.kinds.length);
  const Un = T.worlds.floor.core.tiles.under, Vn = Un.vanes;
  check('the core\'s stator stands between the rotor and the heart, and a charge runs out along it faster than the beat\'s ring', Vn.depth > Un.rotor && Vn.depth < Un.heart && Vn.n >= 6 && Vn.run > Un.waveSpeed && Vn.w * 2 * Vn.n < 2 * Math.PI * Vn.from * 1.6, `${Vn.depth} m down between ${Un.rotor} and ${Un.heart}`);
  check('each beat kicks the rotor on part of a segment, and lights a few of the grid\'s lines for a moment', Un.kick > 0.05 && Un.kick < 0.5 && Un.arc.share > 0.05 && Un.arc.share < 0.4 && Un.arc.fade * Un.period > 3 && Un.thump.k < 0.15);
}

// ── v151: REDUCE MOTION reaches the floors' own pulses (render/kit.js CALM) ──────────────
{
  const { CALM } = await import(at('js/render/kit.js?v=156'));
  const Un = T.worlds.floor.core.tiles.under, Sk = T.worlds.floor.boiler.stoke;
  check('the floors\' pulses are whole until REDUCE MOTION is on', CALM.value === 0);
  check('under REDUCE MOTION the core keeps a quarter of its beat or less, and the boiler under half its flare', Un.calm >= 0.6 && Un.calm < 1 && Sk.calm >= 0.5 && Sk.calm < 1, `the beat ${Un.calm} held back, the flare ${Sk.calm}`);
}

console.log(failed ? `✗ view: ${failed} of ${passed + failed} checks failed` : `✔ view: ${passed} checks`);
process.exit(failed ? 1 : 0);
