// floor.js — the ground the gels stand on: 1.x's arena floor, and since v19
// the floor of each later world (sim/worlds.js).
//
// A port of 1.x's FLOOR_FRAG (js/main.js at v268, the studio-default depth):
// a dark navy plane with a slowly pulsing grid in square cells, a vignette
// toward the rim, the grid fading as it goes, and a soft pool of light that
// follows the hero. The border is a thin rail in the same blue as 1.x's.
// That is `style: 'grid'`. The others (owner, 2026-10-23):
//   'concrete'  world 2, the driveway: a night slab under a warm flood from
//               the far end, aggregate and mottling in it, expansion joints
//               cut every few metres, an old oil stain or two
//   'sewer'     world 3: wet dark flagstones in running bond, the tunnel's
//               water channel down its long middle, flowing
//
// Unlit, as 1.x's was: the floor is a picture, and the gels are the only
// lit things on it. Each style's picture is a colour and a MASK — the lines
// a lit surface would show its texture in (the grid, the joints, the
// grout) — and they share the rest: the arena's light and shadow, the
// intro's reveal, and the drain's SWIRL, which twists the floor into a
// vortex (sim/worlds.js's transition: `swirl` 0 → 1 winds it up round
// `swirlAt`, out to `swirlR`, and opens a hole of `hole` m in the middle).
import * as THREE from 'three/webgpu';
import { Fn, uv, uniform, float, abs, fract, min, max, sin, cos, length, smoothstep, mix, fwidth, texture, clamp, vec2, vec3, pow, floor as tfloor, select, mod, dFdx, dFdy, exp, normalize, dot, cameraPosition, positionWorld } from 'three/tsl';
import { GEL_TIME } from './gel.js?v=53';
import { noise } from './scenery.js?v=53';

const _white = new THREE.Color(0xffffff);

// `light` (optional) is the arena's light map (render/light.js): its rgb is
// light thrown on the floor, its alpha the shadow of what stands on it.
// `bounds`: SURVIVAL's floor changes size (sim/reshape.js). It is built at
// its biggest; `bounds.cur` (half sizes) is where the walls are now, and
// the rest is the void. While `bounds.warn` is up the floor lights where it
// is about to change, as Sektori's does: cyan where floor is coming, red
// where it is going.
// `film` (optional) is the goo on the floor (render/goo.js): its wet film and
// the stain it dries to, two textures that swap every film step (setFilm).
// `region` (a campaign room that is not a rectangle, sim/shape.js slots()):
// up to four rects and circles, joined or intersected. Outside it the floor
// is the void, and its edge is drawn as 1.x's rail (`regionRail`), the box's
// rail hidden.
// `colors` ({ base, gridHi } sRGB 0..1): a campaign world's own floor (1.x's depth looks).
export function buildFloor(T, hx, hz, light, { style = 'grid', bounds: hasBounds = false, film = null, region = null, regionRail = null, colors = null } = {}) {
  const F = T.floor, LF = T.light.arena.floor;
  const group = new THREE.Group();

  const player = uniform(new THREE.Vector2(0.5, 0.5));   // the hero, in floor uv
  const gridX = uniform((hx * 2) / F.gridCell), gridZ = uniform((hz * 2) / F.gridCell);
  const base = uniform(new THREE.Color(F.base)), gridLo = uniform(new THREE.Color(F.gridLo)), gridHi = uniform(new THREE.Color(F.gridHi));
  // 1.x's numbers are the screen's (sRGB 0..1: its SURFACE base is 2.0's own 0x14142b)
  if (colors) { const sr = THREE.SRGBColorSpace; base.value.setRGB(...colors.base, sr); gridHi.value.setRGB(...colors.gridHi, sr); gridLo.value.setRGB(...colors.base.map((c) => Math.min(1, c * 1.6)), sr); }
  // The start intro (intro/intro.js) lets the floor RUN OUT of the drop that
  // lands on it: outside `revealR` (world units from `revealAt`) the floor is
  // the void, and a bright front rides the edge with the grid lit up behind
  // it. At rest revealR is huge and the front is off, so play is unchanged.
  // A droplet landing in a new world reveals that world's floor the same way.
  const revealAt = uniform(new THREE.Vector2(0, 0)), revealR = uniform(1e4), revealFront = uniform(0);
  const voidCol = uniform(new THREE.Color(T.render.clearColor)), frontCol = uniform(new THREE.Color({ grid: 0x5f8cff, concrete: 0xffd9a0, sewer: 0x7fd8d0, hex: 0xff5fd0, tide: 0x5fffe8, cistern: 0x7fe8ff, boiler: 0xffb060, river: 0x7fffe0, ice: 0xe0f4ff, deep: 0x6688ff, core: 0xff66ee }[style] ?? 0x5f8cff));
  // the drain's swirl
  const swirl = uniform(0), swirlAt = uniform(new THREE.Vector2(0, 0)), swirlR = uniform(8), hole = uniform(0);
  const holeRim = uniform(new THREE.Color({ grid: 0x2fe0ff, concrete: 0x9fd6ff, sewer: 0x6fffe0, hex: 0xff7fe0, tide: 0x7ffff0, cistern: 0x6fefff, boiler: 0xffaa44, river: 0x6fffdd, ice: 0xcff0ff, deep: 0x5577ff, core: 0xff55ee }[style] ?? 0x2fe0ff));
  const W = T.worlds.floor;
  const bounds = hasBounds ? { cur: uniform(new THREE.Vector2(hx, hz)), next: uniform(new THREE.Vector2(hx, hz)), warn: uniform(0) } : null;
  const comeCol = uniform(new THREE.Color(0x40e8ff)), goCol = uniform(new THREE.Color(0xff3040));
  // the room's region, as a signed distance at a floor point (1.x arena.js)
  // Each slot's numbers are uniforms, so a room whose floor MOVES (sim/shape.js
  // orbit, pulse) redraws it every frame with setRegion; the kinds and how
  // they combine are fixed for the room.
  const regionU = region ? region.slots.map(([, a, b, c]) => uniform(new THREE.Vector3(a, b, c))) : null;
  const regionSdf = region ? (wp) => {
    let d = null;
    region.slots.forEach(([k], i) => {
      if (!k) return;
      const u = regionU[i];
      const di = k === 1 ? max(abs(wp.x).sub(u.x), abs(wp.y).sub(u.y)) : length(wp.sub(vec2(u.x, u.y))).sub(u.z);
      d = d === null ? di : region.combine === 1 ? max(d, di) : min(d, di);
    });
    return d;
  } : null;
  const railCol = uniform(new THREE.Color(regionRail ?? F.rail));

  const wetTex = film ? texture(film.wetTexture) : null, dryTex = film ? texture(film.dryTexture) : null;

  // The goo on the floor (goo.js). Depths are millimetres.
  //   the contact line  a film shows wherever it is deeper than `edge` mm,
  //                     antialiased by the screen's own derivative, so its
  //                     edge is as crisp as a real liquid's at any depth and
  //                     two pools that meet merge along one outline
  //   the body          the floor seen through the jelly, each channel
  //                     absorbed by what the hue does not carry (Beer–Lambert:
  //                     a thin film barely tints, a deep one is its own
  //                     colour), plus the light the jelly scatters back in
  //                     its own hue, which grows with depth the same way
  //   the relief        the surface's slope, lit by the sun: the side of a
  //                     bead or a pool's rim that faces the light is lifted,
  //                     the far side dimmed, and the curve catches a glint.
  //                     The flat middle of a pool mirrors nothing (the floor
  //                     stays matte, owner 2026-10-22)
  //   the light         a wet film catches the light thrown on the floor
  //                     (the light map) a little more than bare floor does
  //   the stain         what dried: the floor darkened toward the goo's
  //                     hue, deeper where more goo dried, with the same
  //                     crisp edge
  const K = T.goo?.look;
  const Ld = film ? normalize(vec3(...T.light.sun.position)) : null;
  // A cubic B-spline read of the film in four bilinear taps (Sigg and
  // Hadwiger's trick): a texel is 6 cm, and a plain bilinear read draws a
  // drop's stain as the outline of the texels it fell in, a staircase. The
  // B-spline's field is smooth to its second derivative, so its contour is
  // round, the way a liquid's edge is.
  const filmSize = uniform(new THREE.Vector2(512, 512));
  const smoothRead = (tex, st) => {
    const t = st.mul(filmSize).sub(0.5), i = t.floor(), f = t.sub(i);
    const f2 = f.mul(f), f3 = f2.mul(f);
    const w0 = float(1).sub(f).pow(3).div(6), w1 = float(4).sub(f2.mul(6)).add(f3.mul(3)).div(6);
    const w2 = float(1).add(f.mul(3)).add(f2.mul(3)).sub(f3.mul(3)).div(6), w3 = f3.div(6);
    const g0 = w0.add(w1), g1 = w2.add(w3);
    const h0 = i.sub(0.5).add(w1.div(g0)), h1 = i.add(1.5).add(w3.div(g1));   // texel centres are at +0.5
    const a = h0.div(filmSize), b = h1.div(filmSize);
    const top = tex.sample(vec2(a.x, a.y)).mul(g0.x).add(tex.sample(vec2(b.x, a.y)).mul(g1.x));
    const bot = tex.sample(vec2(a.x, b.y)).mul(g0.x).add(tex.sample(vec2(b.x, b.y)).mul(g1.x));
    return top.mul(g0.y).add(bot.mul(g1.y));
  };
  const goo = (under, lightRgb, st) => {
    const W = smoothRead(wetTex, st), Dr = smoothRead(dryTex, st);
    const h = W.a, hue = W.rgb.div(max(h, 1e-4)), d = Dr.a, dHue = Dr.rgb.div(max(d, 1e-4));
    const edgeOf = (v, at) => { const fw = fwidth(v).mul(0.75).add(1e-4); return smoothstep(float(at).sub(fw), float(at).add(fw), v); };
    const dryK = edgeOf(d, K.dryEdge).mul(mix(float(K.dryBase), float(1), float(1).sub(exp(d.div(K.dryDepth).negate())))).mul(K.dryAlpha);
    const stained = mix(under, under.mul(K.dryDark).add(dHue.mul(K.dryTint)), dryK);
    // the slope (metres a metre) from the screen's own derivatives: how the
    // smooth depth and the floor's x, z change across a pixel, solved for
    // the depth's change along x and z. No texture read: the B-spline's field
    // is smooth, so a 2×2 pixel quad's difference is its slope.
    const wxz = positionWorld.xz, ax = dFdx(wxz), ay = dFdy(wxz), hX = dFdx(h), hY = dFdy(h);
    const det = ax.x.mul(ay.y).sub(ax.y.mul(ay.x)), inv = float(0.001).div(select(abs(det).greaterThan(1e-9), det, float(1e-9)));
    const sx = hX.mul(ay.y).sub(hY.mul(ax.y)).mul(inv), sz = ax.x.mul(hY).sub(ay.x.mul(hX)).mul(inv);
    const n = normalize(vec3(sx.mul(-K.bump), 1, sz.mul(-K.bump)));
    const Vd = normalize(cameraPosition.sub(positionWorld));
    const curve = smoothstep(K.curve[0], K.curve[1], length(vec2(sx, sz)));
    const relief = dot(n, Ld).sub(Ld.y).mul(K.relief);                        // > 0 facing the sun, < 0 turned from it
    const glint = pow(max(dot(n, normalize(Ld.add(Vd))), 0), float(K.shine)).mul(K.spec).mul(curve);
    const absorb = exp(vec3(1).sub(hue).mul(h.div(K.absorb)).negate());
    const thick = float(1).sub(exp(h.div(K.absorb).negate()));
    const body = stained.mul(absorb).add(hue.mul(thick).mul(K.scatter));
    const wet = body.mul(float(1).add(relief)).add(mix(hue, vec3(1), 0.5).mul(max(relief, 0)).mul(K.rim)).add(vec3(glint)).add(lightRgb.mul(K.lit));
    return mix(stained, wet, edgeOf(h, K.edge));
  };

  // world (x, z) from floor uv and back: v runs from z = +hz to -hz
  const toWorld = (p) => vec2(p.x.sub(0.5).mul(hx * 2), float(hz).sub(p.y.mul(hz * 2)));
  const toUv = (w) => vec2(w.x.div(hx * 2).add(0.5), float(hz).sub(w.y).div(hz * 2));

  // ── each style's picture: { col, mask, lineCol, wet? } at uv p, world w ──
  const grid = (p) => {
    // distance to the nearest grid line, in cells; 1.x drew the line 1/50 of
    // a cell wide, and it is antialiased here so a far or small floor does
    // not crawl with moiré
    const gx = float(0.5).sub(abs(fract(p.x.mul(gridX)).sub(0.5)));
    const gz = float(0.5).sub(abs(fract(p.y.mul(gridZ)).sub(0.5)));
    const d = min(gx, gz), aa = fwidth(d);
    const line = float(1).sub(smoothstep(float(F.gridLine).sub(aa), float(F.gridLine).add(aa), d));
    const pulse = float(0.7).add(sin(GEL_TIME.mul(1.2)).mul(0.3));
    // rim distance, corner-normalised so it reads the same either way up
    const rim = length(p.sub(0.5)).div(0.7071);
    const vig = float(1).sub(smoothstep(F.vignetteInner, 1, rim).mul(F.vignetteDepth));
    const gridFade = float(1).sub(smoothstep(F.vignetteInner, 1, rim).mul(F.gridFalloff));
    const pool = float(1).sub(smoothstep(0, F.poolRadius, length(p.sub(player))));
    const gridColor = mix(gridLo, gridHi, line);
    const col = mix(base, gridColor, line.mul(pulse).mul(0.7).mul(gridFade).mul(F.gridGlow));
    return { col: col.mul(vig).add(gridColor.mul(pool).mul(F.poolLift * 0.25)).add(base.mul(pool).mul(F.poolLift)), mask: line.mul(gridFade), lineCol: gridHi };
  };

  const concrete = (p, w) => {
    const C = W.concrete;
    // the slab: a mid grey, mottled in broad patches, with fine aggregate
    const mott = noise(w.mul(0.35)).mul(0.6).add(noise(w.mul(1.3)).mul(0.4));
    const grit = noise(w.mul(26)), speck = smoothstep(0.78, 0.86, noise(w.mul(61).add(3.1)));
    let col = mix(vec3(...C.lo), vec3(...C.hi), mott.mul(0.75).add(grit.mul(0.25))).add(vec3(...C.speck).mul(speck));
    // an oil stain or two, where cars stood
    const oil = smoothstep(0.74, 0.86, noise(w.mul(0.13).add(vec2(17.3, 4.1)))).mul(smoothstep(0.3, 0.6, noise(w.mul(1.7))).mul(0.4).add(0.6));
    col = mix(col, vec3(...C.oil), oil.mul(C.oilDepth));
    // expansion joints, cut every `joint` m both ways: a dark groove with a
    // worn light lip either side
    const jx = abs(fract(w.x.div(C.joint).add(0.5)).sub(0.5)).mul(C.joint), jz = abs(fract(w.y.div(C.joint).add(0.5)).sub(0.5)).mul(C.joint);
    const jd = min(jx, jz), aa = max(fwidth(jd), 1e-4);
    const groove = float(1).sub(smoothstep(float(C.jointW).sub(aa), float(C.jointW).add(aa), jd));
    const lip = max(float(1).sub(smoothstep(C.jointW, C.jointW * 3, jd)).sub(groove), 0);
    col = col.mul(float(1).sub(groove.mul(0.62))).add(vec3(...C.lip).mul(lip.mul(0.25)));
    // the flood from the far end (the garage), warm, falling off toward the
    // street; the near end in the cold
    const flood = smoothstep(float(hz * 2.2), float(-hz * 0.2), w.y.add(hz)).mul(C.flood);
    col = col.mul(float(C.ambient).add(flood)).add(vec3(...C.floodTint).mul(flood.mul(0.06)));
    const pool = float(1).sub(smoothstep(0, F.poolRadius * 0.6, length(p.sub(player))));
    return { col: col.add(col.mul(pool).mul(0.35)), mask: groove.add(lip.mul(0.5)), lineCol: vec3(...C.lip) };
  };

  const sewer = (p, w) => {
    const S = W.sewer, alongX = hx >= hz;
    // along / across the tunnel
    const a = alongX ? w.x : w.y, c = alongX ? w.y : w.x;
    // the channel: the middle `channel` m, water running down it, and a
    // kerb of lighter stone along each side of it
    const inCh = float(1).sub(smoothstep(S.channel / 2 - 0.04, S.channel / 2 + 0.04, abs(c)));
    const kerb = float(1).sub(smoothstep(0.0, 0.12, abs(abs(c).sub(S.channel / 2 + 0.12))));
    // flagstones in running bond
    const u = a.div(S.slab[0]), v = c.div(S.slab[1]);
    const row = tfloor(v), off = fract(row.mul(0.5));
    const fu = fract(u.add(off)), fv = fract(v);
    const gu = min(fu, float(1).sub(fu)).mul(S.slab[0]), gv = min(fv, float(1).sub(fv)).mul(S.slab[1]);
    const gd = min(gu, gv), aa = max(fwidth(gd), 1e-4);
    const grout = float(1).sub(smoothstep(float(S.grout).sub(aa), float(S.grout).add(aa), gd));
    const tone = noise(vec2(tfloor(u.add(off)), row).mul(1.9)).mul(0.5).add(noise(w.mul(3.1)).mul(0.25)).add(0.55);
    let stone = vec3(...S.stone).mul(tone);
    // wet: dark puddles standing in the hollows
    const wet = smoothstep(0.72, 0.8, noise(w.mul(0.55).add(9.1))).mul(smoothstep(0.35, 0.6, noise(w.mul(2.3))));
    stone = mix(stone, stone.mul(0.62), wet);
    stone = mix(stone, vec3(...S.groutCol), grout);
    // the water: dark and deep, its ripples running down the channel
    const flow = a.sub(GEL_TIME.mul(S.flow));
    const rip = smoothstep(0.9, 1.0, sin(flow.mul(3.0).add(noise(vec2(flow.mul(0.5), c.mul(1.6))).mul(3.5))).mul(0.5).add(0.5));
    const water = mix(vec3(...S.water), vec3(...S.waterHi), rip.mul(0.35).add(noise(vec2(flow.mul(1.1), c.mul(2.4))).mul(0.18)));
    let col = mix(stone, water, inCh).add(vec3(...S.kerb).mul(kerb.mul(0.35)));
    // the tunnel goes dark toward its ends
    const L = alongX ? hx : hz;
    const end = smoothstep(float(L * 0.55), float(L * 1.05), abs(a));
    col = col.mul(float(1).sub(end.mul(0.75)));
    return { col, mask: grout.mul(float(1).sub(inCh)).add(inCh.mul(rip).mul(1.5)), lineCol: vec3(...S.waterHi), wet: wet.add(inCh) };
  };

  // ── the NEON worlds (the title's WORLDS · NEON, v23): abstract floors in
  // the grid's own language, for the driveway and the sewer ──
  // world 2: a hex lattice, its lines pulsing out from the middle in waves,
  // a cell here and there lit from under
  const hex = (p, w) => {
    const H = W.hex, q = w.div(H.cell), R = vec2(1, 1.7320508), h = R.mul(0.5);
    const a = mod(q, R).sub(h), b = mod(q.sub(h), R).sub(h);
    const gv = select(dot(a, a).lessThan(dot(b, b)), a, b), id = q.sub(gv);
    const hd = max(dot(abs(gv), vec2(0.5, 0.8660254)), abs(gv.x));
    const d = float(0.5).sub(hd), aa = max(fwidth(d), 1e-4);
    const line = float(1).sub(smoothstep(float(H.line).sub(aa), float(H.line).add(aa), d));
    const r = length(w);
    const wave = pow(sin(r.mul(H.waveK).sub(GEL_TIME.mul(H.waveHz))).mul(0.5).add(0.5), float(6));
    const lit = smoothstep(0.82, 0.9, noise(id.mul(0.71).add(GEL_TIME.mul(0.05))));
    const rim = smoothstep(0.55, 1.0, length(p.sub(0.5)).div(0.7071));
    const lineCol = mix(vec3(...H.lineLo), vec3(...H.lineHi), wave);
    let col = vec3(...H.base).add(vec3(...H.cell2).mul(lit.mul(float(1).sub(d.mul(1.6)))));
    col = mix(col, lineCol, line.mul(float(0.45).add(wave.mul(0.55))).mul(float(1).sub(rim.mul(0.5))));
    const pool = float(1).sub(smoothstep(0, F.poolRadius * 0.7, length(p.sub(player))));
    return { col: col.mul(float(1).sub(rim.mul(0.45))).add(lineCol.mul(pool).mul(0.06)), mask: line, lineCol };
  };
  // world 3: contour lines of a field that flows down the long way, like a
  // map of a current, over a faint square grid
  const tide = (p, w) => {
    const D = W.tide, alongX = hx >= hz, a = alongX ? w.x : w.y, c = alongX ? w.y : w.x;
    const f = noise(vec2(a.mul(D.scale).sub(GEL_TIME.mul(D.flow)), c.mul(D.scale * 1.6))).mul(0.7)
      .add(noise(vec2(a.mul(D.scale * 2.3).sub(GEL_TIME.mul(D.flow * 1.7)), c.mul(D.scale * 3.1).add(5.2))).mul(0.3));
    const band = f.mul(D.bands), fb = abs(fract(band).sub(0.5)), aa = max(fwidth(band), 1e-4);
    const line = float(1).sub(smoothstep(float(D.line).sub(aa), float(D.line).add(aa), float(0.5).sub(fb)));   // fb is 0.5 on a contour
    const gx = abs(fract(w.x.div(D.grid)).sub(0.5)), gz = abs(fract(w.y.div(D.grid)).sub(0.5));
    const gd = float(0.5).sub(max(gx, gz)), ga = max(fwidth(gd), 1e-4);
    const grid = float(1).sub(smoothstep(float(0.012).sub(ga), float(0.012).add(ga), gd));
    const deep = smoothstep(0.2, 0.8, f);
    const L = alongX ? hx : hz, end = smoothstep(float(L * 0.6), float(L * 1.05), abs(a));
    let col = mix(vec3(...D.lo), vec3(...D.hi), deep);
    col = mix(col, vec3(...D.lineCol), line.mul(0.75)).add(vec3(...D.gridCol).mul(grid.mul(0.5)));
    return { col: col.mul(float(1).sub(end.mul(0.7))), mask: line.add(grid.mul(0.4)), lineCol: vec3(...D.lineCol) };
  };

  // ── worlds 4-9 (v28): each world's own floor ──────────────────────
  const v3 = (a) => vec3(...a);
  const along = (w) => (hx >= hz ? w.x : w.y), across = (w) => (hx >= hz ? w.y : w.x);
  // THE CISTERN: a flooded vault — stone slabs under shallow water, the
  // light off the surface wandering over them, the bases of the columns
  const cistern = (p, w) => {
    const C = W.cistern;
    const u = w.div(C.slab), f = fract(u), g = min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y))).mul(C.slab);
    const aa = max(fwidth(g), 1e-4), grout = float(1).sub(smoothstep(float(C.grout).sub(aa), float(C.grout).add(aa), g));
    const tone = noise(tfloor(u).mul(1.7)).mul(0.5).add(noise(w.mul(2.2)).mul(0.2)).add(0.55);
    let stone = v3(C.stone).mul(tone);
    stone = mix(stone, stone.mul(0.45), grout);
    const t = GEL_TIME;
    const ca = sin(noise(w.mul(0.45).add(vec2(t.mul(0.11), t.mul(0.07)))).mul(9).add(noise(w.mul(1.2).sub(vec2(t.mul(0.09), 0))).mul(4))).mul(0.5).add(0.5);
    const caustic = smoothstep(0.93, 1.0, ca);
    // the column bases: a square plinth every `column` m, its edge catching the light
    const q = fract(w.div(C.column).add(0.5)).sub(0.5).mul(C.column), dq = max(abs(q.x), abs(q.y));
    const plinth = float(1).sub(smoothstep(C.plinth - 0.03, C.plinth + 0.03, dq));
    const rim = float(1).sub(smoothstep(0, 0.07, abs(dq.sub(C.plinth))));
    let col = mix(stone, v3(C.water), C.depth).add(v3(C.caustic).mul(caustic.mul(0.1)));
    col = mix(col, v3(C.stone).mul(0.35), plinth).add(v3(C.rim).mul(rim.mul(0.5)));
    return { col, mask: caustic.mul(0.6).add(grout.mul(0.3)).add(rim), lineCol: v3(C.caustic), wet: float(0.8) };
  };
  // THE BOILER ROOM: riveted steel plates, scorched, and grates the fire glows through
  const boiler = (p, w) => {
    const B = W.boiler, P = vec2(...B.plate);
    const u = w.div(P), f = fract(u);
    const sx = min(f.x, float(1).sub(f.x)).mul(B.plate[0]), sz = min(f.y, float(1).sub(f.y)).mul(B.plate[1]);
    const sd = min(sx, sz), aa = max(fwidth(sd), 1e-4);
    const seam = float(1).sub(smoothstep(float(B.seam).sub(aa), float(B.seam).add(aa), sd));
    const rv = length(vec2(min(sx, 0.35).sub(0.18), min(sz, 0.35).sub(0.18)));
    const rivet = float(1).sub(smoothstep(0.05, 0.075, rv));
    const tone = noise(tfloor(u).mul(2.3)).mul(0.35).add(0.75);
    let col = v3(B.steel).mul(tone).add(v3(B.rivet).mul(rivet.mul(0.8)));
    // soot, not the shadow of something standing there (v43: at 0.8 it read as a hole in the floor)
    col = mix(col, v3(B.scorch), smoothstep(0.6, 0.85, noise(w.mul(0.21).add(3.3))).mul(0.4));
    col = col.mul(float(1).sub(seam.mul(0.7)));
    // the grates: slots with the fire under them, breathing
    const gq = fract(w.div(B.grate).add(0.5)).sub(0.5).mul(B.grate);
    const inG = float(1).sub(smoothstep(0, 0.05, max(abs(gq.x).sub(B.grateW[0]), abs(gq.y).sub(B.grateW[1]))));
    const slot = smoothstep(0.35, 0.5, abs(fract(gq.x.mul(2.2)).sub(0.5)).mul(-1).add(0.5).mul(2));
    const pulse = float(0.55).add(sin(GEL_TIME.mul(B.pulse).add(noise(tfloor(w.div(B.grate)).mul(3)).mul(6))).mul(0.45));
    const fire = inG.mul(float(1).sub(slot)).mul(pulse);
    col = mix(col, v3(B.glow).mul(0.6), fire).add(v3(B.glow).mul(inG.mul(0.08)));
    return { col, mask: seam.mul(0.4).add(fire), lineCol: v3(B.glow) };
  };
  // THE RIVER: dark water running the long way, its streaks moving with it,
  // pebbled banks at both edges
  const river = (p, w) => {
    const R = W.river, a = along(w), c = across(w), half = hx >= hz ? hz : hx;
    const flow = a.sub(GEL_TIME.mul(R.flow));
    const streak = smoothstep(0.88, 1.0, sin(flow.mul(1.1).add(noise(vec2(flow.mul(0.25), c.mul(0.7))).mul(7)).add(noise(w.mul(0.9)).mul(2))).mul(0.5).add(0.5));
    const swirl = noise(vec2(flow.mul(0.6), c.mul(1.4))).mul(0.4);
    let col = mix(v3(R.water), v3(R.waterHi), streak.mul(0.14).add(swirl.mul(0.18)));
    const bank = smoothstep(half * R.bank, half * (R.bank + 0.08), abs(c));
    const peb = noise(w.mul(2.8)).mul(0.6).add(noise(w.mul(7.1)).mul(0.4));
    const stones = v3(R.pebble).mul(peb.mul(0.8).add(0.45));
    const foam = float(1).sub(smoothstep(0, 0.35, abs(abs(c).sub(half * R.bank)))).mul(noise(vec2(flow.mul(1.5), c)).mul(0.6).add(0.4));
    col = mix(col, stones, bank).add(v3(R.foam).mul(foam.mul(0.35)));
    return { col, mask: streak.mul(float(1).sub(bank)).add(foam), lineCol: v3(R.waterHi), wet: float(1).sub(bank) };
  };
  // THE ICE SHEET: pale ice, darker where it is deep, cracked, frost along the cracks
  const ice = (p, w) => {
    const I = W.ice, n = noise(w.mul(I.scale)), n2 = noise(w.mul(I.scale * 2.7).add(9.1));
    const r1 = abs(n.sub(0.5)), r2 = abs(n2.sub(0.5));
    const aa1 = max(fwidth(r1), 1e-4), aa2 = max(fwidth(r2), 1e-4);
    const crack = float(1).sub(smoothstep(0.004, float(0.012).add(aa1), r1)).add(float(1).sub(smoothstep(0.003, float(0.008).add(aa2), r2)).mul(0.35));
    const frost = float(1).sub(smoothstep(0, 0.06, r1)).mul(noise(w.mul(9)).mul(0.6).add(0.4));
    const depth = noise(w.mul(0.12).add(4.4));
    let col = mix(v3(I.deep), v3(I.base), depth.mul(0.7).add(0.3));
    col = col.add(v3(I.frost).mul(frost.mul(0.1))).add(v3(I.crack).mul(min(crack, 1).mul(0.3)));
    // the cracks are a texture under the fight, not lines across it (v48: at full strength they were the loudest thing on screen)
    return { col, mask: min(crack, 1).mul(I.lines), lineCol: v3(I.crack), wet: float(0.6) };
  };
  // THE DEEP: black silt in slow ripples, lit only by what lives in it
  const deep = (p, w) => {
    const D = W.deep, t = GEL_TIME;
    const rip = smoothstep(0.7, 1.0, sin(w.x.mul(0.9).add(noise(w.mul(0.3)).mul(6))).mul(0.5).add(0.5));
    let col = mix(v3(D.silt), v3(D.ripple), rip.mul(0.6).add(noise(w.mul(1.7)).mul(0.3)));
    const cell = tfloor(w.mul(D.specks)), rnd = noise(cell.mul(1.31));
    const fp = fract(w.mul(D.specks)).sub(0.5), dot2 = length(fp);
    const tw = sin(t.mul(float(1.2).add(rnd.mul(2))).add(rnd.mul(40))).mul(0.5).add(0.5);
    const speck = smoothstep(0.86, 0.95, rnd).mul(float(1).sub(smoothstep(0.03, 0.14, dot2))).mul(tw);
    col = col.add(mix(v3(D.glow), v3(D.glow2), smoothstep(0.9, 0.95, rnd)).mul(speck.mul(1.6)));
    return { col, mask: speck.add(rip.mul(0.15)), lineCol: v3(D.glow) };
  };
  // THE CORE: black, traced with circuitry; rings go out from the middle and
  // light the traces as they pass
  const core = (p, w) => {
    const K = W.core, u = w.div(K.cell), f = fract(u).sub(0.5), id = tfloor(u);
    const pick = noise(id.mul(0.77));
    const trace = select(pick.greaterThan(0.5), abs(f.x), abs(f.y));
    const aa = max(fwidth(trace), 1e-4), line = float(1).sub(smoothstep(float(0.03).sub(aa), float(0.03).add(aa), trace));
    const node = float(1).sub(smoothstep(0.06, 0.1, length(f))).mul(smoothstep(0.7, 0.75, pick));
    const r = length(w), ring = fract(r.div(K.ringEvery * K.ringSpeed).sub(GEL_TIME.div(K.ringEvery)));
    const band = smoothstep(0.0, 0.05, ring).mul(float(1).sub(smoothstep(0.05, 0.18, ring)));
    const lit = line.add(node).mul(float(0.25).add(band.mul(1.6)));
    const col = v3(K.base).add(mix(v3(K.line), v3(K.pulse), band).mul(lit));
    return { col, mask: line.add(node), lineCol: v3(K.pulse) };
  };

  const surface = { concrete, sewer, hex, tide, cistern, boiler, river, ice, deep, core }[style] ?? grid;

  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = Fn(() => {
    const p0 = uv(), w0 = toWorld(p0);
    // the swirl: the floor wound round the drain and drawn in toward it,
    // more the nearer it is (none at rest: swirl 0 leaves w = w0)
    const d0 = w0.sub(swirlAt), r = length(d0);
    const k = swirl.mul(pow(clamp(float(1).sub(r.div(swirlR)), 0, 1), float(W.swirl.falloff)));
    const ang = k.mul(W.swirl.twist), ca = cos(ang), sa = sin(ang);
    const d1 = vec2(d0.x.mul(ca).sub(d0.y.mul(sa)), d0.x.mul(sa).add(d0.y.mul(ca))).mul(float(1).add(k.mul(W.swirl.pull)));
    const w = swirlAt.add(d1), p = toUv(w);
    const S = surface(p, w);
    let out = S.col;
    if (light) {
      // a shadow darkens what is under it; light lifts the floor a little and
      // its lines a lot, the way a lit surface shows its texture (wet stone
      // takes more of it: it mirrors the bullets' glow)
      // the map's camera looks straight down with the far edge at the top, so
      // its rows run the other way from the floor's v
      const L = texture(light, vec2(p.x, float(1).sub(p.y))), shade = clamp(L.a, 0, 1);
      let take = S.mask.mul(LF.grid).add(LF.spill);
      if (S.wet) take = take.add(S.wet.mul(W.sewer.wetLight));
      out = out.mul(float(1).sub(shade)).add(L.rgb.mul(take));
      // the goo over the floor, before the hole and the walls: they cut it
      if (film) out = goo(out, L.rgb, vec2(p.x, float(1).sub(p.y)));
    }
    // the hole in the middle of the swirl, its lip catching the light
    const inHole = float(1).sub(smoothstep(hole.mul(0.82), hole, r));
    const lip = float(1).sub(smoothstep(0, max(hole.mul(0.25), 0.05), abs(r.sub(hole)))).mul(select(hole.greaterThan(0.01), float(1), float(0)));
    out = mix(out, vec3(0.004, 0.006, 0.012), inHole).add(holeRim.mul(lip).mul(swirl).mul(0.9));
    if (bounds) {
      // inside the walls as they are now, and as they will be
      const ax = abs(w0.x), az = abs(w0.y), e = 0.05;
      const inCur = float(1).sub(smoothstep(bounds.cur.x.sub(e), bounds.cur.x, ax)).mul(float(1).sub(smoothstep(bounds.cur.y.sub(e), bounds.cur.y, az)));
      const inNext = float(1).sub(smoothstep(bounds.next.x.sub(e), bounds.next.x, ax)).mul(float(1).sub(smoothstep(bounds.next.y.sub(e), bounds.next.y, az)));
      const pulse = float(0.55).add(sin(GEL_TIME.mul(16)).mul(0.45)).mul(bounds.warn);
      const coming = inNext.mul(float(1).sub(inCur)).mul(pulse), going = inCur.mul(float(1).sub(inNext)).mul(pulse);
      // the floor that is coming shows faintly, its grid lit; the floor that
      // is going burns red under its grid
      const lit = mix(voidCol, out.mul(0.6), coming.mul(0.7)).add(comeCol.mul(S.mask.mul(0.9).add(0.08)).mul(coming));
      out = mix(lit, out.add(goCol.mul(S.mask.mul(0.8).add(0.12)).mul(going)), inCur);
    }
    if (regionSdf) {
      // outside the room's region the floor is gone; its edge is the rail
      const d = regionSdf(w0), aa = max(fwidth(d), 1e-3);
      const rail = float(1).sub(smoothstep(0.02, 0.07, abs(d))).add(float(1).sub(smoothstep(0, 0.5, abs(d))).mul(0.18));
      out = mix(out, voidCol, smoothstep(aa.negate(), aa, d)).add(railCol.mul(rail).mul(1.2));
    }
    // the reveal, in world units
    const rd = length(w0.sub(revealAt));
    const inside = float(1).sub(smoothstep(revealR.sub(1.1), revealR, rd));
    // a crisp line on the edge, with a faint glow either side of it
    const edge = abs(rd.sub(revealR));
    const front = float(1).sub(smoothstep(0.03, 0.12, edge)).add(float(1).sub(smoothstep(0, 0.7, edge)).mul(0.22)).mul(revealFront);
    const wake = float(1).sub(smoothstep(0, 3.0, revealR.sub(rd))).mul(inside).mul(revealFront);
    return mix(voidCol, out.add(S.lineCol.mul(S.mask).mul(wake).mul(1.4)), inside).add(frontCol.mul(front).mul(1.3));
  })();

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, hz * 2).rotateX(-Math.PI / 2), mat);
  group.add(plane);

  // 1.x's rail, on the grid only (the curb and the walls bound the others: scenery.js)
  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(hx * 2, F.railHeight, hz * 2)),
    new THREE.LineBasicNodeMaterial({ color: F.rail, transparent: true }),   // transparent: the intro fades it in
  );
  border.position.y = F.railHeight / 2;
  border.visible = !region && style !== 'concrete' && style !== 'sewer';   // the abstract floors keep 1.x's rail; a shaped room draws its own
  group.add(border);

  // what the camera must hold: the floor and its rail
  const arena = new THREE.Box3(new THREE.Vector3(-hx, 0, -hz), new THREE.Vector3(hx, F.railHeight, hz));

  return {
    group, arena, border, style, bounds,
    reveal: { at: revealAt, r: revealR, front: revealFront, void: voidCol },
    // the rail's colour, lerped toward white by k (a world rule's warning flash)
    setRail(hex, k = 0) { const c = railCol.value.setHex(hex).lerp(_white, Math.max(0, Math.min(1, k))); border.material.color.copy(c); },
    swirl: { k: swirl, at: swirlAt, r: swirlR, hole },
    // a moving room's region, this frame (sim/shape.js slots())
    setRegion(r) { if (!regionU) return; r.slots.forEach(([, a, b, c], i) => regionU[i]?.value.set(a, b, c)); },
    // the light pool follows the hero (world x, z → floor uv)
    setPlayer(x, z) { player.value.set((x + hx) / (2 * hx), (hz - z) / (2 * hz)); },
    // the film's current textures (they swap every film step) and its size in texels
    setFilm(f) { if (!film) return; wetTex.value = f.wetTexture; dryTex.value = f.dryTexture; filmSize.value.set(1 / f.texel.value.x, 1 / f.texel.value.y); },
    dispose() {
      plane.geometry.dispose(); mat.dispose();
      border.geometry.dispose(); border.material.dispose();
    },
  };
}
