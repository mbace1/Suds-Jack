// floor.js — the ground the gels stand on: 1.x's arena floor, and since v19
// the floor of each later world (sim/worlds.js).
//
// A port of 1.x's FLOOR_FRAG (js/main.js at v268, the studio-default depth):
// a dark navy plane with a slowly pulsing grid in square cells, a vignette
// toward the rim, the grid fading as it goes, and a soft pool of light that
// follows the hero. The border is a thin rail in the same blue as 1.x's.
// That is `style: 'grid'`. The others (owner, 2026-10-23):
//   'concrete'  world 2, the driveway: a slab in the summer sun (v66; it
//               was a night slab under a garage flood), aggregate and
//               mottling in it, expansion joints cut every few metres, an
//               old oil stain or two, shade along the curb; since v65
//               (the owner's module sheet) hairline cracks in some slabs and
//               a storm drain toward the far right corner
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
import { Fn, If, uv, uniform, float, abs, fract, min, max, sin, cos, atan, length, smoothstep, step, mix, fwidth, texture, clamp, vec2, vec3, pow, floor as tfloor, round, select, mod, dFdx, dFdy, exp, sqrt, sign, normalize, dot, cameraPosition, positionWorld, vec4 } from 'three/tsl';
import { pickStyle, grainAt } from './style.js?v=150';
import { SUN_AT } from './sun.js?v=150';
import { GEL_TIME } from './gel.js?v=150';
import { noise, grate, cells, sewerSpots, treeShade } from './scenery.js?v=150';
import { lilyPads, DRIFT, hash, stoke } from './kit.js?v=150';

const _white = new THREE.Color(0xffffff);
// the floors whose set has a ground of its own under them: a room that is not a rectangle is CUT to its shape there
const CUT_TO_GROUND = new Set(['concrete', 'river', 'cistern', 'ice']);

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
export function buildFloor(T, hx, hz, light, { style = 'grid', bounds: hasBounds = false, film = null, water: waterKit = null, region = null, regionRail = null, colors = null } = {}) {
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
  // the void past the floor: the night, world 2's summer haze (v66), world 3's deep teal (v70), a world's own dark (v72)
  const voidCol = uniform(T.worlds.floor[style]?.sky ? new THREE.Color(...T.worlds.floor[style].sky) : new THREE.Color(T.render.clearColor)), frontCol = uniform(new THREE.Color({ grid: 0x5f8cff, concrete: 0xffd9a0, sewer: 0x7fd8d0, hex: 0xff5fd0, tide: 0x5fffe8, cistern: 0x7fe8ff, boiler: 0xffb060, river: 0x7fffe0, ice: 0xe0f4ff, deep: 0x6688ff, core: 0xff66ee }[style] ?? 0x5f8cff));
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
  // v144: the water this floor stands in (render/water.js), where its world has any: the surface's slope, curvature and foam
  const water = waterKit?.on && T.water?.[style] ? waterKit : null, slopeTex = water ? texture(water.slopeTexture) : null;

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
  const goo = (under, lightRgb, st, E = null) => {
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
    const body = stained.mul(absorb).add(hue.mul(thick).mul(K.scatter).mul(E ?? float(1)));   // v93: the jelly scatters the world's light, not its own
    const wet = body.mul(float(1).add(relief)).add(mix(hue, vec3(1), 0.5).mul(max(relief, 0)).mul(K.rim)).add(vec3(glint)).add(lightRgb.mul(K.lit));
    const physical = mix(stained, wet, edgeOf(h, K.edge));
    // v92, the STYLE switch (render/style.js). CEL: a flat wash with a crisp contour, a lighter flat pool where it
    // is deep, an ink band along the contour, no relief and no glint; the stain a flat tint. WATERCOLOR: pigment
    // (the hue deepened) pooling DARK at the border of the wash, grained, bleeding a little past the contour; the
    // stain a dried ring, darkest at its rim — the washed-out look is the one with none of this
    const CF = T.style.cel.film, WF = T.style.watercolor.film;
    const edgeHard = (v, at) => { const fw = fwidth(v).mul(0.3).add(1e-4); return smoothstep(float(at).sub(fw), float(at).add(fw), v); };
    const celIn = edgeHard(h, K.edge), celBand = celIn.sub(edgeHard(h, K.edge * CF.inkBand)), celDeep = edgeHard(h, K.edge * CF.inner);
    const celDry = mix(under, under.mul(K.dryDark * CF.dryTone).add(dHue.mul(K.dryTint)), edgeHard(d, K.dryEdge).mul(K.dryAlpha));
    let celCol = hue.mul(CF.tone).mul(float(1).add(celDeep.mul(CF.innerLift)));
    celCol = mix(celCol, celCol.mul(1 - CF.ink), celBand).add(lightRgb.mul(K.lit));
    const cel = mix(celDry, celCol, celIn);
    const wIn = edgeOf(h, K.edge), wBleed = edgeOf(h, K.edge * WF.bleed);
    const wRim = float(1).sub(smoothstep(float(K.edge), float(K.edge * WF.rimTo), h));
    const pig = hue.pow(vec3(WF.gamma));
    const wCol = pig.mul(float(1).sub(wRim.mul(WF.rim))).mul(grainAt(positionWorld.xz, WF.grainScale, WF.grain)).add(lightRgb.mul(K.lit));
    const wA = wIn.mul(WF.alpha).add(wBleed.sub(wIn).mul(WF.alpha * 0.5));
    const dryRing = edgeOf(d, K.dryEdge).sub(edgeOf(d, K.dryEdge * 2.5));
    const wDry = mix(under, under.mul(K.dryDark).add(dHue.pow(vec3(WF.gamma)).mul(K.dryTint)).mul(float(1).sub(dryRing.mul(WF.dryRim))), edgeOf(d, K.dryEdge).mul(K.dryAlpha));
    const wc = mix(wDry, wCol, wA);
    return pickStyle(physical, cel, wc);
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
    const C = W.concrete, Sl = C.slabs, J = C.joint;
    // v138: NO TWO POURS ALIKE (owner, 2026-11-10: "the concrete ground ... more detailed ... better slate visual variety"). Each slab — the
    // pour between four joints — has a number of its own (`sid`), and everything below that says "this one" reads it:
    // its tone and warmth, which way the float was dragged over it (the grain), how weathered it is, whether it was
    // saw-cut in two or four, whether a square of it was dug out and poured again. All of it is arithmetic on the
    // slab's number: not one new noise sample (v138's cost pass)
    const sid = tfloor(w.div(J)), loc = fract(w.div(J)), px = max(length(fwidth(w)), 1e-4);
    // (one hash a slab, and the rest of its numbers spun off that one: a sine each was a tenth of the floor's cost)
    const sr = hash(sid.add(vec2(3.7, 1.3))), spin = (k) => fract(sr.mul(k)), sr2 = spin(37.17), sr3 = spin(113.3);
    // the slab: a mid grey, mottled in broad patches (each pour's own: the pattern does not run on under a joint),
    // with fine aggregate — dragged one way, the other, or floated smooth
    const n13 = noise(w.mul(1.3)), mott = noise(w.mul(0.35).add(Sl ? sid.mul(1.7) : 0)).mul(0.6).add(n13.mul(0.4));
    const gs = Sl ? select(sr.lessThan(0.36), vec2(...Sl.grain), select(sr.lessThan(0.72), vec2(Sl.grain[1], Sl.grain[0]), vec2(26, 26))) : vec2(26, 26);
    const grit = noise(w.mul(gs)), sp = noise(w.mul(61).add(3.1)), speck = smoothstep(0.78, 0.86, sp);
    let col = mix(vec3(...C.lo), vec3(...C.hi), mott.mul(0.75).add(grit.mul(0.25))).add(vec3(...C.speck).mul(speck));
    // the saw cuts: some pours were cut across, some along, some both ways (`cut.at`: how many were left whole)
    let cutLine = float(0), inP = float(0), pEdge = float(0);
    if (Sl) {
      const K = Sl.cut, cutX = step(K.at, sr2).mul(float(1).sub(step(K.at + (1 - K.at) * 0.45, sr2)).add(step(K.at + (1 - K.at) * 0.75, sr2))), cutZ = step(K.at + (1 - K.at) * 0.45, sr2);
      const line = (d) => float(1).sub(smoothstep(float(K.w).sub(px), float(K.w).add(px), d));
      cutLine = max(cutX.mul(line(abs(loc.x.sub(0.5)).mul(J))), cutZ.mul(line(abs(loc.y.sub(0.5)).mul(J))));
      // (each piece of a cut pour has weathered a little differently from the next)
      const piece = fract(sr.add(step(0.5, loc.x).mul(cutX).mul(0.37)).add(step(0.5, loc.y).mul(cutZ).mul(0.61)).mul(197.3));
      col = col.mul(float(1).add(sr.sub(0.5).mul(Sl.tone)).add(piece.sub(0.5).mul(K.tone))).mul(mix(vec3(...Sl.cool), vec3(...Sl.warm), sr3));
      // pitting: the fine aggregate's dark end, in the pours the frost got into
      col = col.mul(float(1).sub(float(1).sub(smoothstep(0.1, 0.2, sp)).mul(smoothstep(0.35, 0.8, sr3)).mul(Sl.pit)));
    }
    // an oil stain or two, where cars stood
    const o13 = noise(w.mul(0.13).add(vec2(17.3, 4.1))), oil = smoothstep(0.74, 0.86, o13).mul(smoothstep(0.3, 0.6, noise(w.mul(1.7))).mul(0.4).add(0.6));
    col = mix(col, vec3(...C.oil), oil.mul(C.oilDepth));
    // v138 (the owner's concept, art-ref/world-2-driveway-concept.jpg: an OLD slab): damp where the water sits,
    // cooler and darker in broad patches, and bleached where the sun has had it
    if (C.weather) {
      // (read off the noise the oil stains are cut from, v138's cost pass: no new noise for it)
      const Wt = C.weather, broad = float(1).sub(o13).mul(0.75).add(n13.mul(0.25)).add(Sl ? sr3.sub(0.5).mul(Sl.weather) : 0);   // (and a whole pour leans damp or bleached)
      col = mix(col, col.mul(vec3(...Wt.dampTint)), smoothstep(Wt.dampAt, Wt.dampAt + 0.16, broad));
      col = col.mul(float(1).add(float(1).sub(smoothstep(Wt.bleachAt - 0.18, Wt.bleachAt, broad)).mul(Wt.bleach)));
    }
    // v138: a REPAIR — in a pour here and there (`patch.at`) a square was dug out and poured again: newer, paler,
    // smoother concrete with a saw-cut edge, over whatever the old slab had (its saw cut, its cracks)
    if (Sl) {
      const P = Sl.patch, pc = vec2(spin(53.7), spin(89.1)).mul(0.36).add(0.32), ph = vec2(spin(151.3), spin(67.9)).mul(P.size[1] - P.size[0]).add(P.size[0]);
      const pd = max(abs(loc.x.sub(pc.x)).sub(ph.x), abs(loc.y.sub(pc.y)).sub(ph.y)).mul(J), has = step(P.at, spin(271.9));
      inP = has.mul(float(1).sub(smoothstep(px.negate(), px, pd)));
      pEdge = has.mul(float(1).sub(smoothstep(float(P.w).sub(px), float(P.w).add(px), abs(pd))));
      col = mix(col, mix(vec3(...C.lo), vec3(...C.hi), n13.mul(0.2).add(grit.mul(0.15)).add(0.5)).mul(vec3(...P.tint)), inP).mul(float(1).sub(pEdge.mul(P.depth)));
      cutLine = cutLine.mul(float(1).sub(inP));
      col = col.mul(float(1).sub(cutLine.mul(Sl.cut.depth)));
    }
    // expansion joints, cut every `joint` m both ways: a dark groove with a
    // worn light lip either side
    const jx = abs(fract(w.x.div(C.joint).add(0.5)).sub(0.5)).mul(C.joint), jz = abs(fract(w.y.div(C.joint).add(0.5)).sub(0.5)).mul(C.joint);
    const jd = min(jx, jz), aa = max(fwidth(jd), 1e-4);
    // (v138: an old joint is not one width: it has opened here and held there, `chip`)
    const jw = Sl ? n13.mul(Sl.chip).add(1 - Sl.chip / 2).mul(C.jointW) : float(C.jointW);
    const groove = float(1).sub(smoothstep(jw.sub(aa), jw.add(aa), jd));
    let lip = max(float(1).sub(smoothstep(jw, jw.mul(3), jd)).sub(groove), 0);
    // v138: the pours have SETTLED, each its own way: along a joint one slab stands a little proud of the next, and
    // its edge catches the light while the low one's lies in the step's shade (`settle`; which side, and by how
    // much, is the joint's own number)
    let step_ = float(0);
    if (Sl) {
      const kx = round(w.x.div(J)), kz = round(w.y.div(J));
      const isX = jx.lessThan(jz), hJ = hash(select(isX, vec2(kx, tfloor(w.y.div(J))).add(13.7), vec2(tfloor(w.x.div(J)), kz).add(29.3))).sub(0.5);
      const up = select(isX, w.x.div(J).sub(kx), w.y.div(J).sub(kz)).mul(hJ), amt = abs(hJ).mul(2);
      step_ = select(up.greaterThan(0), float(1), float(-1)).mul(amt).mul(Sl.settle);
      const shade = float(1).sub(smoothstep(jw, jw.mul(5), jd)).sub(groove).mul(max(step_.negate(), 0));
      col = col.mul(float(1).sub(max(shade, 0).mul(0.45)));
      lip = lip.mul(max(step_, 0).mul(2.2).add(0.55));
    }
    col = col.mul(float(1).sub(groove.mul(0.62))).add(vec3(...C.lip).mul(lip.mul(0.25)));
    // v138: dirt lies along the joints and against the curb, and moss has taken in it here and there
    const toCurb = min(float(hx).sub(abs(w.x)), w.y.add(hz));
    if (C.moss) {
      const Ms = C.moss, took = smoothstep(Ms.at, Ms.at + 0.22, mott);   // (where the slab's own mottling is dark: no new noise)
      const inJoint = float(1).sub(smoothstep(C.jointW, Ms.joint, jd)), atEdge = float(1).sub(smoothstep(Ms.edge * 0.1, Ms.edge, toCurb));
      col = col.mul(float(1).sub(max(float(1).sub(smoothstep(C.jointW, Ms.joint * 2.2, jd)), atEdge).mul(Ms.dirt)));
      col = mix(col, vec3(...Ms.color).mul(grit.mul(0.6).add(0.7)), max(inJoint, atEdge.mul(0.85)).mul(took).mul(Ms.k));
    }
    // hairline cracks (v65): the edges of a cell network, jagged by a fine
    // wobble, broken off so they stop mid-slab, only in some of the slabs, and
    // faint — a texture under the fight (v48's lesson). The network is the
    // dearest thing in the floor, so it is worked out only inside the slabs
    // that have cracks (v68): the branch is the same for a whole patch of
    // screen, and the line's antialiasing is taken outside it, from how fast
    // the floor moves under a pixel (a derivative may not sit in a branch)
    const patch = smoothstep(0.54, 0.68, noise(w.mul(C.crackPatch).add(vec2(5.2, 1.7))));
    const eaa = max(length(fwidth(w)).mul(C.crackScale * 2), 1e-4), cwid = float(C.crackW * C.crackScale * 2);
    const crack = float(0).toVar();
    If(patch.greaterThan(0), () => {
      const jag = vec2(noise(w.mul(5.3)), noise(w.mul(5.3).add(vec2(1.7, 9.2)))).sub(0.5).mul(C.crackJag);
      const edge = cells(w.mul(C.crackScale).add(jag));
      crack.assign(float(1).sub(smoothstep(cwid, cwid.add(eaa), edge)).mul(smoothstep(0.42, 0.56, noise(w.mul(C.crackBreak).add(vec2(11.1, 2.3))))).mul(patch));
    });
    col = col.mul(float(1).sub(crack.mul(float(1).sub(inP)).mul(C.crackDepth)));
    // the storm drain (v65), set in the slab toward the far right corner: an iron
    // frame round rows of slots (the slots below, past the flood: no light
    // reaches the bottom of a drain)
    const G = C.grate, gAt = w.sub(vec2(hx - G.at[0], -hz + G.at[1])).div(G.r), g = grate(gAt);
    // v138: the damp round it, where the water has run to it for years, and the moss in that
    if (G.stain) {
      const st = float(1).sub(smoothstep(1.0, G.stain.r, length(gAt))).mul(n13.mul(0.6).add(0.4));
      col = mix(col.mul(float(1).sub(st.mul(G.stain.dark))), vec3(...(C.moss?.color ?? [0.05, 0.07, 0.03])), st.mul(G.stain.moss));
    }
    col = mix(col, mix(vec3(...G.iron), vec3(...G.frame), g.z), g.x);
    // v138: PUDDLES — a few shallow ones (`at`: where, in fractions of the floor, how wide, a seed), their edges
    // wandering: the slab dark and damp round each, and in it the evening sky, lighter toward the far side, the
    // trees' crowns where they hang over it, a shimmer, and rings going out from where the hero stands near it
    let puddle = null;
    if (C.puddles) {
      const Pd = C.puddles, m = float(0).toVar(), wet = float(0).toVar(), rim = float(0).toVar();
      // (v142: `r` is the arcade floor's; a campaign room a quarter the size takes a puddle to its own scale)
      const pr = Math.max(0.6, Math.min(1, Math.sqrt((hx * hz) / (16 * 27.5))));
      for (const [fx, fz, r0, seed] of Pd.at) {
        const r = r0 * pr;
        // (each a little longer one way than the other, turned by its seed; its edge wandering at two scales)
        const ca = Math.cos(seed), sa = Math.sin(seed), q0 = w.sub(vec2(fx * hx, fz * hz)).div(r), q = vec2(q0.x.mul(ca).sub(q0.y.mul(sa)), q0.x.mul(sa).add(q0.y.mul(ca)).mul(1.35));
        If(length(q0).lessThan(1.9), () => {
          const d = length(q).add(noise(q.mul(1.3).add(seed)).sub(0.5).mul(Pd.warp)).add(noise(q.mul(4.1).add(seed * 2.3)).sub(0.5).mul(Pd.warp * 0.3));
          m.assign(max(m, float(1).sub(smoothstep(Pd.edge - 0.035, Pd.edge, d))));
          wet.assign(max(wet, float(1).sub(smoothstep(Pd.edge, Pd.edge + Pd.damp, d))));
          rim.assign(max(rim, float(1).sub(smoothstep(0, 0.03, abs(d.sub(Pd.edge - 0.02))))));
        });
      }
      col = col.mul(float(1).sub(wet.mul(Pd.dark)));
      const sky = vec3(0).toVar();
      If(m.greaterThan(0), () => {
        const hw = toWorld(player), dp = length(w.sub(hw));
        const ring = sin(dp.mul(Pd.ring[0]).sub(GEL_TIME.mul(Pd.ring[1]))).mul(exp(dp.mul(-Pd.ring[2]))).mul(Pd.ring[3]);
        const shimmer = noise(w.mul(2.3).add(vec2(GEL_TIME.mul(0.15), GEL_TIME.mul(0.11)))).sub(0.5).mul(Pd.shimmer);
        // the sky in it: blue overhead with pale cloud drifting over, the trees' crowns dark across it (the same
        // crowns that shade the slab, seen from below), and the low sun's glitter on its ripples
        const cloud = smoothstep(0.3, 0.75, noise(w.mul(Pd.cloud).add(vec2(GEL_TIME.mul(0.02), 3.3))));
        const leafy = WL?.daylight ? canopy(w.add(vec2(Pd.treeAt[0], Pd.treeAt[1])).add(vec2(shimmer, shimmer).mul(4)), WL.daylight) : float(0);
        const glint = smoothstep(0.86, 0.95, noise(w.mul(7).add(vec2(GEL_TIME.mul(0.5), GEL_TIME.mul(-0.35))))).mul(float(1).sub(leafy)).mul(Pd.glint);
        sky.assign(mix(vec3(...Pd.skyNear), vec3(...Pd.skyFar), cloud).mul(float(1).sub(leafy.mul(Pd.trees))).mul(float(1).add(ring).add(shimmer)).add(vec3(...Pd.sun).mul(rim.mul(Pd.rim).add(glint))));
      });
      puddle = { m: m.mul(Pd.k), col: sky };
    }
    // the curb's shade on the slab along it: the far side and the two long
    // ones, none at the open near side (v66)
    col = col.mul(float(1).sub(float(1).sub(smoothstep(0, C.curbAO, toCurb)).mul(C.curbAODepth)));
    // v93: the curb's shadow in the SUN (sun.js SUN_AT, the world's light rig): a curb `curbHeight` tall throws a
    // band cot θ × that long away from the sun — onto the slab from the far curb when the sun stands past the far
    // edge, from a long curb when it stands past that one. A slab in the sun is defined by its shadows; the AO
    // above is the little that is left in the shade
    const SS = C.sunShadow, ch = T.scenery.driveway.curbHeight;
    const sunH = max(length(SUN_AT.xz), 1e-3), cot = min(sunH.div(max(SUN_AT.y, 1e-3)), SS.cotMax);
    const awayX = SUN_AT.x.negate().div(sunH), awayZ = SUN_AT.z.negate().div(sunH);
    const band = (dist, len) => float(1).sub(smoothstep(len.sub(SS.soft), len.add(SS.soft), dist)).mul(step(0.05, len));
    const farLen = cot.mul(ch).mul(max(awayZ, 0)), leftLen = cot.mul(ch).mul(max(awayX, 0)), rightLen = cot.mul(ch).mul(max(awayX.negate(), 0));
    const sunShade = max(max(band(w.y.add(hz), farLen), band(w.x.add(hx), leftLen)), band(float(hx).sub(w.x), rightLen));
    // v128: under a DAYLIGHT rig (TUNING.worlds.lit.concrete) the curb's shadow takes the sun away (worldLight), so it
    // goes the sky's cool colour, rather than darkening the warm slab
    if (!WL?.daylight) col = col.mul(float(1).sub(sunShade.mul(SS.depth)));
    // the sun, a little warmer toward the far end (it was the garage's flood at night)
    const flood = smoothstep(float(hz * 2.2), float(-hz * 0.2), w.y.add(hz)).mul(C.flood);
    col = mix(col.mul(float(C.ambient).add(flood)).add(vec3(...C.floodTint).mul(flood.mul(0.06))), vec3(...G.slot), g.y);
    const pool = float(1).sub(smoothstep(0, F.poolRadius * 0.6, length(p.sub(player))));
    return { col: col.add(col.mul(pool).mul(C.pool)), mask: groove.add(lip.mul(0.5)).add(crack.mul(float(1).sub(g.x)).mul(0.3)).add(g.z.mul(0.4)).add(max(cutLine, pEdge).mul(0.35)), lineCol: vec3(...C.lip),
             sunVis: float(1).sub(sunShade).mul(float(1).sub(g.y)), puddle };
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
    // v140 (owner, 2026-11-10: "look at all other worlds ... we can do a lot better than the concept art"): NO TWO
    // FLAGSTONES ALIKE, as the driveway's pours (v138). The courses start where they start (`vary`: a row's own
    // offset); of each pair of stones along a course some are ONE long stone (`long`) and some are cut in halves
    // (`short`); every stone has its own tone and tint, lies a little out of level (`tilt`: it catches the light its
    // own way), is worn round at its edges (`bevel` m, `relief`: the edge toward the light bright, the one away from
    // it dark — the floor reads as STONES, not as a drawing of joints), and here and there one is cracked across.
    // Slime has taken in the joints by the channel and at the walls' feet, and the stones lie damp there. One hash
    // a stone, the rest spun off it; the old per-stone noise went to pay for it
    const u = a.div(S.slab[0]), v = c.div(S.slab[1]), Vy = S.vary;
    const row = tfloor(v), off = Vy ? hash(vec2(row, 3.3)) : fract(row.mul(0.5));
    const si = tfloor(u.add(off)), fu = fract(u.add(off)), fv = fract(v), n31 = noise(w.mul(3.1));
    let gu = min(fu, float(1).sub(fu)).mul(S.slab[0]), sgnU = select(fu.lessThan(0.5), float(-1), float(1)), stoneId = si;
    if (Vy) {
      const pi = tfloor(si.mul(0.5)), first = si.sub(pi.mul(2)).lessThan(0.5), hp = hash(vec2(pi, row).add(7.7));
      const isLong = hp.greaterThan(1 - Vy.long), isShort = hp.lessThan(Vy.short), low = fu.lessThan(0.5);
      // how far to the joint on either hand: none between the two halves of a long stone, one more through a cut one
      let dl = select(isLong.and(first.not()), float(9), fu), dr = select(isLong.and(first), float(9), float(1).sub(fu));
      dl = select(isShort.and(low.not()), fu.sub(0.5), dl); dr = select(isShort.and(low), float(0.5).sub(fu), dr);
      gu = min(dl, dr).mul(S.slab[0]); sgnU = select(dl.lessThan(dr), float(-1), float(1));
      stoneId = select(isLong, pi.mul(2).add(0.25), select(isShort, si.add(step(0.5, fu).mul(0.5)), si));
    }
    const sgnV = select(fv.lessThan(0.5), float(-1), float(1)), gv = min(fv, float(1).sub(fv)).mul(S.slab[1]);
    const gd = min(gu, gv), aa = max(fwidth(gd), 1e-4);
    const gw = Vy ? n31.mul(Vy.chip).add(1 - Vy.chip / 2).mul(S.grout) : float(S.grout);
    const grout = float(1).sub(smoothstep(gw.sub(aa), gw.add(aa), gd));
    const dch = abs(c).sub(S.channel / 2 + (S.kerbStone?.w ?? 0)), dwall = float(alongX ? hz : hx).sub(abs(c));
    let stone, slime = float(0);
    if (Vy) {
      const h1 = hash(vec2(stoneId, row).add(1.7)), spin = (k) => fract(h1.mul(k));
      const tone = h1.mul(Vy.tone).add(1 - Vy.tone / 2).mul(n31.mul(0.25).add(0.875));
      const tint = mix(mix(vec3(...Vy.cool), vec3(...Vy.warm), spin(37.1)), vec3(...Vy.green), step(1 - Vy.greens, spin(71.3)).mul(0.7));
      // out of level: brighter toward the corner it has risen at
      const tilt = fu.sub(0.5).mul(spin(53.7).sub(0.5)).add(fv.sub(0.5).mul(spin(91.3).sub(0.5))).mul(Vy.tilt);
      // worn round at its edges: the nearest edge faces out along (sgnU, 0) or (0, sgnV); `sun` is where the light is
      const nearU = gu.lessThan(gv), facing = select(nearU, sgnU.mul(Vy.sun[0]), sgnV.mul(Vy.sun[1]));
      const bev = float(1).sub(smoothstep(gw, float(Vy.bevel), gd)).mul(facing).mul(Vy.relief);
      stone = vec3(...S.stone).mul(tint).mul(tone).mul(float(1).add(tilt).add(bev));
      // a crack across one here and there: a straight break through it, at its own angle
      const th = spin(197.3).mul(3.1416), lm = vec2(fu.sub(0.5).mul(S.slab[0]), fv.sub(0.5).mul(S.slab[1]));
      const cd = abs(lm.x.mul(cos(th)).add(lm.y.mul(sin(th))).sub(spin(151.9).sub(0.5).mul(0.3)).add(n31.sub(0.5).mul(0.07)));
      const crack = float(1).sub(smoothstep(float(Vy.crackW).sub(aa), float(Vy.crackW).add(aa), cd)).mul(step(1 - Vy.crack, spin(113.7)));
      stone = stone.mul(float(1).sub(crack.mul(0.55)));
      // damp by the channel and at the walls' feet, and slime in the joints there (and creeping onto the stones' edges)
      const near = max(float(1).sub(smoothstep(0, Vy.dampReach, dch)), float(1).sub(smoothstep(0, Vy.dampReach * 0.6, dwall)));
      stone = stone.mul(float(1).sub(near.mul(Vy.damp)));
      slime = near.mul(smoothstep(0.3, 0.6, n31)).mul(Vy.slimeK);
      stone = mix(stone, vec3(...Vy.slime), slime.mul(float(1).sub(smoothstep(gw, float(Vy.bevel * 1.6), gd))).mul(0.6));
    } else stone = vec3(...S.stone).mul(noise(vec2(si, row).mul(1.9)).mul(0.5).add(n31.mul(0.25)).add(0.55));
    // v78: puddles standing in the hollows (they were a darkening): the stone dark
    // and the vault's dim teal reflected in them, a bright meniscus at the rim
    const PD = S.puddle, pd = puddles(w, PD), wet = pd.mask;
    stone = mix(stone, mix(stone.mul(PD.dark), vec3(...PD.sky), PD.reflect), wet).add(vec3(...PD.rimCol).mul(pd.rim.mul(PD.rim)));
    stone = mix(stone, mix(vec3(...S.groutCol), vec3(...(Vy?.slime ?? S.groutCol)), slime), grout.mul(float(1).sub(wet.mul(0.7))));
    // v78: the channel's water is murky and RUNS (it wore the cistern's net): streaks
    // stretched along the flow, foam along the kerbs, flecks going by
    // v145 (owner, 2026-11-11: "Stream should look a bit like a concave slide. Currently very flat"): the channel is a
    // CHUTE, seen the way a sunk thing is seen: each pixel's own view ray is followed DOWN past the floor's plane to
    // the trough's wall, so the near wall hides behind its lip and the far wall stands open, and what is drawn in
    // the trough lies where a thing that deep would.
    // v148 (owner on v147: "Better, still too flat"): it was a shallow dish more than half full of level water — a
    // band of teal with a grey band over it. It is a HALF-PIPE now: an arc of a circle in section, nearly as deep
    // as it is half wide (the ray's meeting with it is one quadratic, exact at any depth, where three steps down
    // a parabola only held while it was shallow). The wall is lit as a cylinder is — the far wall facing the light,
    // the near side in the shadow of its own lip, a wet gleam standing along it at the one angle that mirrors the
    // light to the eye — and bricked in courses that are even along the CURVE, so they crowd toward the lips as
    // they do on any pipe seen from above. And the water is what water in a slide is: a thin fast sheet that does
    // not lie level but SWINGS, up the far wall and back down through the bottom and up the near one, foam along
    // the edge it climbs with. A level surface is the one thing that says flat; a stream riding up a wall cannot
    const Ch = S.chute, M = S.murk;
    let col, rip;
    if (Ch) {
      const R = S.channel / 2, rho = (R * R + Ch.deep * Ch.deep) / (2 * Ch.deep), yc = rho - Ch.deep, thMax = Math.asin(Math.min(1, R / rho));
      const V = normalize(cameraPosition.sub(positionWorld)), down = float(1).div(max(V.y, 0.25));
      const vc = (alongX ? V.z : V.x).mul(down).negate(), va = (alongX ? V.x : V.z).mul(down).negate();   // the ray's run across and along, a metre of fall
      // where the ray (c + vc d, −d) meets the circle about (0, yc): the one root that is below the floor
      const qa = vc.mul(vc).add(1), qb = c.mul(vc).add(yc), qc = c.mul(c).add(yc * yc - rho * rho);
      const dw = clamp(qb.negate().add(sqrt(max(qb.mul(qb).sub(qa.mul(qc)), 0))).div(qa), 0, Ch.deep);
      const cw = c.add(vc.mul(dw)), aw = a.add(va.mul(dw));
      const nc = cw.negate().div(rho), ny = dw.add(yc).div(rho);   // the wall's own normal there (across, up)
      const th = atan(cw, dw.add(yc)), arc = th.div(thMax);        // the angle round from the bottom; −1 the far lip, 1 the near
      // lit from over the near side (where the tunnel's light leans, vary.sun), and the lip's shadow on what lies under it
      const lx = -(Vy?.sun?.[1] ?? -0.8) * Ch.lightAcross, ll = Math.hypot(lx, 1), Lc = [lx / ll, 1 / ll];
      const diff = clamp(nc.mul(Lc[0]).add(ny.mul(Lc[1])), 0, 1);
      const lit = float(1).sub(smoothstep(R - Ch.lipShade.soft, R + Ch.lipShade.soft, abs(cw.add(dw.mul(lx)))).mul(Ch.lipShade.k));
      const vl = sqrt(vc.mul(vc).add(1)), hx2 = vc.negate().div(vl).add(Lc[0]), hy2 = float(1).div(vl).add(Lc[1]), hl = sqrt(hx2.mul(hx2).add(hy2.mul(hy2)));
      const gleam = pow(clamp(nc.mul(hx2).add(ny.mul(hy2)).div(hl), 0, 1), float(Ch.shine)).mul(noise(vec2(aw.mul(0.8), arc.mul(3))).mul(0.7).add(0.45));
      // bricks: courses even round the curve, each course's joints half a brick on from the last
      const cu = arc.mul(Ch.courses / 2), cq = abs(fract(cu.add(0.5)).sub(0.5)), caa = max(fwidth(cu), 1e-4);
      const course = float(1).sub(smoothstep(float(0.035).sub(caa), float(0.035).add(caa), cq));
      const rq = abs(fract(aw.div(Ch.ring).add(tfloor(cu.add(0.5)).mul(0.5))).sub(0.5)).mul(Ch.ring), raa2 = max(fwidth(aw), 1e-4);
      const ringL = float(1).sub(smoothstep(float(0.02).sub(raa2), float(0.02).add(raa2), rq));
      const bid = vec2(tfloor(aw.div(Ch.ring).add(tfloor(cu.add(0.5)).mul(0.5))), tfloor(cu.add(0.5)));
      const wtone = noise(vec2(aw.mul(1.7), arc.mul(7.1))).mul(0.25).add(hash(bid).mul(0.22)).add(0.72);
      let wall = vec3(...Ch.stone).mul(wtone).mul(diff.mul(Ch.diffuse).mul(lit).add(Ch.ambient)).mul(float(1).sub(dw.div(Ch.deep).mul(Ch.ao))).mul(float(1).sub(max(course, ringL).mul(0.55)));
      // the track it wets as it swings: darker stone that mirrors more
      const wetT = float(1).sub(smoothstep(Ch.stream.swing + Ch.stream.width * 0.6, Ch.stream.swing + Ch.stream.width * 1.5, abs(arc)));
      wall = wall.mul(float(1).sub(wetT.mul(Ch.wet.dark))).add(vec3(...Ch.gleam).mul(gleam.mul(lit).mul(wetT.mul(Ch.wet.gloss).add(1))));
      // the stream: a sheet `width` of the wall wide whose middle swings `swing` of the way to each lip every `every` m
      // (never a ruled sine: its beat is pulled about along the pipe, its reach differs bend to bend, and it runs
      // widest through the bottom and draws out thin as it climbs)
      const St = Ch.stream, ph = aw.div(St.every).add(noise(vec2(aw.mul(0.11), 1.9)).mul(St.wobble)).mul(6.2832).sub(GEL_TIME.mul(St.drift * 6.2832 / St.every));
      const sw = sin(ph), mid = sw.mul(noise(vec2(aw.mul(0.07), 20.3)).mul(0.6).add(0.7)).mul(St.swing);
      const wide = float(St.width).mul(float(1.25).sub(abs(sw).pow(1.5).mul(0.5))).mul(noise(vec2(aw.mul(0.45).sub(GEL_TIME.mul(S.flow * 0.4)), 3.3)).mul(0.3).add(0.85));
      const sx = arc.sub(mid), edge = wide.sub(abs(sx)).mul(rho * thMax), eaa = max(fwidth(arc), 1e-4).mul(rho * thMax);   // m in from the stream's edge
      const inW = smoothstep(eaa.negate(), eaa, edge);
      const sm = sx.mul(rho * thMax), st = streaks(aw, sm, S.flow * Ch.speed, M.stretch * Ch.stretch, M.scale);
      // the fast line down its middle: a brighter thread, where the sheet is quickest
      const thread = float(1).sub(smoothstep(0, Ch.thread, abs(sm.sub(noise(vec2(aw.mul(0.5).sub(GEL_TIME.mul(S.flow * 0.3)), 5.7)).sub(0.5).mul(0.3))))).mul(smoothstep(0.3, 0.75, st)).mul(0.7);
      const flowq = aw.sub(GEL_TIME.mul(S.flow * Ch.speed));
      // foam: along both edges, most on the edge it is climbing with (the outside of each bend)
      const climbing = clamp(sx.mul(cos(ph)).mul(-4).add(0.5), 0.25, 1);
      const foamLine = float(1).sub(smoothstep(0, M.foamW, edge)).mul(smoothstep(0.3, 0.65, noise(vec2(flowq.mul(0.9), sm.mul(5))))).mul(climbing);
      const flecks = smoothstep(0.84, 0.92, noise(vec2(flowq.mul(1.5), sm.mul(2.4)).add(7.7)));
      rip = smoothstep(0.55, 0.85, st).mul(0.6).add(foamLine).add(flecks.mul(0.5)).add(thread).mul(inW);
      const deepW = smoothstep(0, Ch.clear, edge);   // thin and clear at its edges: the wall shows through
      const water = mix(vec3(...S.water), vec3(...S.waterHi), clamp(st.mul(M.lift).add(thread.mul(0.6)), 0, 1)).mul(diff.mul(lit).mul(0.6).add(0.55))
        .add(vec3(...M.foam).mul(foamLine.mul(0.7).add(flecks.mul(0.3)).add(thread.mul(0.25)))).add(vec3(...Ch.gleam).mul(gleam.mul(lit).mul(Ch.gloss)));
      const trough = mix(wall, mix(wall.mul(0.6), water, deepW.mul(0.75).add(0.25)), inW);
      col = mix(stone, trough, inCh);
    } else {
      const flow = a.sub(GEL_TIME.mul(S.flow));
      const st = streaks(a, c, S.flow, M.stretch, M.scale);
      const foamLine = smoothstep(S.channel / 2 - M.foamW, S.channel / 2 - 0.02, abs(c)).mul(smoothstep(0.45, 0.75, noise(vec2(flow.mul(0.8), c.mul(6)))));
      const flecks = smoothstep(0.82, 0.9, noise(vec2(flow.mul(1.6), c.mul(2.2)).add(7.7)));
      rip = smoothstep(0.55, 0.85, st).mul(0.7).add(foamLine).add(flecks.mul(0.6));
      const water = mix(vec3(...S.water), vec3(...S.waterHi), st.mul(M.lift)).add(vec3(...M.foam).mul(foamLine.mul(0.5).add(flecks.mul(0.35))));
      col = mix(stone, water, inCh);
    }
    // v101: the channel's KERB (the module sheet's: a raised strip of pale stone either side of the water) — it was
    // a faint lighter line. Blocks `w` m wide in lengths of `joint` m, their water edge catching the light and
    // their outer edge in a line of shadow on the floor
    const KS = S.kerbStone;
    if (KS) {
      const dk = abs(c).sub(S.channel / 2), kaa = max(fwidth(dk), 1e-4);
      const inK = smoothstep(kaa.negate(), kaa, dk).mul(float(1).sub(smoothstep(float(KS.w).sub(kaa), float(KS.w).add(kaa), dk)));
      const jq = abs(fract(a.div(KS.joint)).sub(0.5)).mul(KS.joint), jaa = max(fwidth(jq), 1e-4);
      const joint = smoothstep(float(KS.joint / 2 - 0.025).sub(jaa), float(KS.joint / 2 - 0.025).add(jaa), jq);
      const lip = float(1).sub(smoothstep(0, 0.05, dk)).mul(inK), shade = float(1).sub(smoothstep(0, 0.09, dk.sub(KS.w))).mul(step(KS.w, dk));
      const kcol = vec3(...KS.color).mul(noise(vec2(a.mul(2.3), c.mul(5))).mul(0.25).add(0.85)).mul(float(1).sub(joint.mul(0.55))).add(vec3(...KS.lit).mul(lip));
      col = mix(col, kcol, inK).mul(float(1).sub(shade.mul(KS.shadow)));
    } else col = col.add(vec3(...S.kerb).mul(kerb.mul(0.35)));
    // v70: the pipes' rivulets, green water from each mouth in the wall across
    // the floor to the channel, glinting as it runs (scenery.js sewerSpots)
    const SP = sewerSpots(T, hx, hz), Rp = T.scenery.sewer.pipe, pm = SP.perSide;
    const ac = abs(c), sd = select(c.greaterThan(0), float(1), float(-1));
    const ap = a.sub(sd.mul(Rp.every / 4)).add(((pm - 1) / 2) * Rp.every);
    const pj = clamp(round(ap.div(Rp.every)), 0, pm - 1), pa = ap.sub(pj.mul(Rp.every));
    // it spreads where it falls, at the wall, and thins and dries out over `reach` m
    const fromWall = float(SP.Wd).sub(ac), wob = noise(vec2(ac.mul(0.9), pj.mul(7.3).add(sd.mul(3.1)))).sub(0.5).mul(0.9), raa = max(fwidth(pa), 1e-4);
    const half = float(Rp.rivulet / 2).mul(float(1.8).sub(smoothstep(0, 1.2, fromWall).mul(1.1)));
    const riv = float(1).sub(smoothstep(half.sub(raa), half.add(raa), abs(pa.sub(wob)))).mul(float(1).sub(smoothstep(Rp.reach * 0.4, Rp.reach, fromWall))).mul(smoothstep(-0.05, 0.1, fromWall));
    const glint = smoothstep(0.8, 1, sin(ac.add(GEL_TIME.mul(Rp.flow)).mul(9).add(noise(vec2(ac.mul(3), pa.mul(9))).mul(3))).mul(0.5).add(0.5));
    // wet stone, a little green, catching the light where it runs
    col = mix(col, col.mul(0.55).add(vec3(...Rp.trickle).mul(float(0.025).add(glint.mul(0.12)))), riv);
    // the tunnel goes dark toward its ends
    const L = alongX ? hx : hz;
    const end = smoothstep(float(L * 0.55), float(L * 1.05), abs(a));
    col = col.mul(float(1).sub(end.mul(0.75)));
    // v70: sunlight through the street grates above, world 2's grate you came
    // down: its slots of light on the floor, side to side down the tunnel, and
    // a faint glow round each (after the dark: it is the day's, not the tunnel's)
    const U = T.scenery.sewer.sun, np = SP.pools.length;
    const pk = clamp(round(a.div(U.every).add((np - 1) / 2)), 0, np - 1), ps = select(mod(pk, 2).greaterThan(0.5), float(1), float(-1));
    const sq = vec2(a.sub(pk.sub((np - 1) / 2).mul(U.every)), c.sub(ps.mul(U.c))).div(U.r);
    const sun = grate(sq).y.mul(U.gain).add(float(1).sub(smoothstep(0, U.halo / U.r, length(sq))).mul(U.haloGain));
    col = col.add(vec3(...U.color).mul(sun));
    return { col, mask: grout.mul(float(1).sub(inCh)).add(inCh.mul(rip).mul(1.5)).add(riv.mul(glint)).add(pd.rim.mul(wet.oneMinus()).mul(0.3)), lineCol: vec3(...S.waterHi), wet: wet.mul(0.9).add(inCh).add(riv) };
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
  // v78 (owner: "all the water in the levels looks the same"): PUDDLES standing
  // in a floor's hollows, a mask with a soft edge and the thin bright meniscus
  // at its rim (`scale` cells to the metre, `t` the threshold — more puddle
  // the lower — `soft` the edge); and water RUNNING one way: noise stretched
  // `stretch` to one along `a`, two layers moving at different speeds
  const puddles = (w, P) => {
    const n = noise(w.mul(P.scale)).mul(0.65).add(noise(w.mul(P.scale * 2.7).add(5.3)).mul(0.35));
    const mask = smoothstep(P.t - P.soft, P.t + P.soft, n);
    const rim = float(1).sub(smoothstep(0, P.soft * 1.6, abs(n.sub(P.t)))).mul(float(1).sub(mask.mul(0.5)));
    return { mask, rim };
  };
  const streaks = (a, c, speed, stretch, scale) => {
    const f1 = a.sub(GEL_TIME.mul(speed)), f2 = a.sub(GEL_TIME.mul(speed * 0.6));
    return noise(vec2(f1.mul(scale / stretch), c.mul(scale))).mul(0.6).add(noise(vec2(f2.mul((scale * 1.7) / stretch).add(3.3), c.mul(scale * 1.9))).mul(0.4));
  };
  // v97 (v99: shared): the classic water CAUSTIC — light focused by a moving surface into thin bright
  // cells, from a domain-warped field (four warps of sines; its lines fall where the field crosses zero).
  // The cistern's slabs and the river's shallows
  const causticNet = (w, N, t) => {
    const q0 = w.mul(N.scale * 6.283);
    let ip = q0, acc = float(0);
    for (let k = 0; k < 4; k++) {
      const tk = t.mul(N.speed * (1 - 3.5 / (k + 1)));
      ip = q0.add(vec2(cos(tk.sub(ip.x)).add(sin(tk.add(ip.y))), sin(tk.sub(ip.y)).add(cos(tk.add(ip.x)))));
      const sx = sin(ip.x.add(tk)), cy = cos(ip.y.add(tk));
      acc = acc.add(abs(sx.mul(cy)).div(length(vec2(sx, cy)).mul(1.25).add(1e-3)));   // small where either is near zero: the lines
    }
    return clamp(pow(max(float(1.17).sub(pow(acc.div(4), float(1.4))), 0), float(N.sharp)).sub(0.45).div(2.6), 0, 1);
  };
  // v99: a bed of PEBBLES — round stones packed with dark gaps between them: a cellular field over nine
  // jittered points, read as the RATIO of the nearest distance to the second (its contours are circles
  // round each point, where the plain difference draws the straight edges of crazy paving): `round` is
  // 1 at a stone's middle, 0 at the line halfway to its neighbour
  // (v100: shared) the nearest two of nine jittered points round w in cells `cell` m across, in cells, and
  // the nearest's cell: the river's pebbles read them as a ratio, the ice's fractures as a difference
  const cellular = (w, cell) => {
    const u = w.div(cell), iu = tfloor(u), fu = fract(u);
    let d1 = float(9), d2 = float(9), id = vec2(0);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const o = vec2(i, j), c = iu.add(o);
      const d = length(o.add(vec2(hash(c), hash(c.add(vec2(19.1, 7.3)))).mul(0.76).add(0.12)).sub(fu));
      const near = d.lessThan(d1);
      d2 = select(near, d1, min(d2, d)); id = select(near, c, id); d1 = select(near, d, d1);
    }
    return { d1, d2, id };
  };
  const pebbleBed = (w, cell) => {
    const c = cellular(w, cell);
    return { round: float(1).sub(c.d1.div(max(c.d2, 1e-4))), id: c.id };
  };
  // THE CISTERN: a flooded vault — stone slabs under shallow water, the
  // light off the surface wandering over them, the bases of the columns
  const cistern = (p, w0) => {
    const C = W.cistern, Vy = C.vary, Wv = water ? C.wave : null, t = GEL_TIME;
    // v144 (owner, 2026-11-11: "the water vfx are too simple and subtle. Could entertain actual water physics ...
    // It looks like a regular day puddle"): the water is SIMULATED (render/water.js) and this is its optics. The
    // surface's slope bends the eye's way down to the bed, so the slabs are drawn where the slope moves them
    // (`refract` m a unit of slope: they swim under a wave and lie still under still water); a crest is a lens
    // and gathers the light under it into a bright line, a trough thins it (`focus`, `thin` — the caustics are
    // the waves' own, not a net that wanders by itself, though the net stays, pulled about by them, for the water
    // the fight has not reached); the lamps and the shaft glint off whichever faces turn to them (worldLight
    // reads the slope); and where the water was thrown about it is white for a moment (`foam`), in broken
    // patches. A fine cross-ripple (`fine`) keeps still water from being glass: the simulation's texels are a
    // hand wide, and the surface has smaller things on it than that
    let w = w0, slope = null, glintSlope = null, glintGate = null, lapK = float(0), foam = float(0);
    if (Wv) {
      const sv = slopeTex.sample(vec2(p.x, float(1).sub(p.y))), Fi = Wv.fine;
      let fine = vec2(0);
      for (const [kx, kz, om, a] of Fi) fine = fine.add(vec2(kx, kz).mul(cos(w0.x.mul(kx).add(w0.y.mul(kz)).add(t.mul(om))).mul(a)));
      slope = sv.xy.mul(Wv.gain).add(fine); lapK = sv.z.mul(Wv.gain); foam = sv.w;
      w = w0.add(slope.mul(Wv.refract));
      // what the lights glint off: the simulation's waves and a slow unevenness (never the fine ripple: three
      // sines mirror a lamp as a quilt)
      // (and only off a WAVE: still water mirrors the breach as one soft patch, which reads as fog on the floor)
      glintGate = smoothstep(Wv.glintAt[0], Wv.glintAt[1], length(sv.xy.mul(Wv.gain)));
      glintSlope = sv.xy.mul(Wv.gain).add(vec2(noise(w0.mul(Wv.swell[0]).add(vec2(t.mul(Wv.swell[1]), 0))).sub(0.5), noise(w0.mul(Wv.swell[0]).add(vec2(11.7, t.mul(Wv.swell[1])))).sub(0.5)).mul(Wv.swell[2]));
    }
    // v140 (owner, 2026-11-10: "look at all other worlds ... we can do a lot better than the concept art"): the pool's
    // floor is LAID, not ruled — as the sewer's (v140). Of each pair of slabs along a row some are ONE long slab
    // (`long`), and some slabs are four small ones (`small`); every slab has its own tone and tint and lies a little
    // out of level; its edges are worn round and catch the light (softer than the sewer's: this is under water);
    // one here and there has SUNK and lies deeper and darker (`sunk`), with the shadow of its neighbours' edges in
    // it; silt has settled pale in the joints in patches; and round the pool, `border.in` m in from its edge, runs
    // a BORDER of small tiles, light and dark, with some gone. One hash a slab, the rest spun off it
    const u = w.div(C.slab), cid = tfloor(u), f0 = fract(u), n22 = noise(w.mul(2.2));
    let g, stone, sink = float(0);
    if (Vy) {
      const shift = cid.y.sub(tfloor(cid.y.mul(0.5)).mul(2)), cx = cid.x.add(shift), pi = tfloor(cx.mul(0.5)), first = cx.sub(pi.mul(2)).lessThan(0.5);
      const isLong = hash(vec2(pi, cid.y).add(7.7)).greaterThan(1 - Vy.long), hs = hash(cid.add(4.1)), isSmall = isLong.not().and(hs.lessThan(Vy.small));
      const fs = fract(f0.mul(2));
      const dl = select(isLong.and(first.not()), float(9), f0.x), dr = select(isLong.and(first), float(9), float(1).sub(f0.x));
      const gx = select(isSmall, min(fs.x, float(1).sub(fs.x)).mul(C.slab / 2), min(dl, dr).mul(C.slab));
      const gy = select(isSmall, min(fs.y, float(1).sub(fs.y)).mul(C.slab / 2), min(f0.y, float(1).sub(f0.y)).mul(C.slab));
      const sgnX = select(isSmall, select(fs.x.lessThan(0.5), float(-1), float(1)), select(dl.lessThan(dr), float(-1), float(1)));
      const sgnY = select(isSmall, select(fs.y.lessThan(0.5), float(-1), float(1)), select(f0.y.lessThan(0.5), float(-1), float(1)));
      g = min(gx, gy);
      const id = select(isLong, vec2(pi.mul(2).add(0.25), cid.y), select(isSmall, cid.add(tfloor(f0.mul(2)).mul(0.37)).add(0.11), cid));
      const h1 = hash(id.add(1.7)), spin = (k) => fract(h1.mul(k));
      const tone = h1.mul(Vy.tone).add(1 - Vy.tone / 2).mul(n22.mul(0.2).add(0.9));
      const tint = mix(mix(v3(Vy.cool), v3(Vy.warm), spin(37.1)), v3(Vy.green), step(1 - Vy.greens, spin(71.3)).mul(0.7));
      const fl = select(isSmall, fs, f0), tilt = fl.x.sub(0.5).mul(spin(53.7).sub(0.5)).add(fl.y.sub(0.5).mul(spin(91.3).sub(0.5))).mul(Vy.tilt);
      // a slab that has sunk (never a small one or half of a long one): deeper, and its neighbours' edges shade it
      sink = step(1 - Vy.sunk, spin(113.7)).mul(float(1).sub(select(isSmall.or(isLong), float(1), float(0))));
      const facing = select(gx.lessThan(gy), sgnX.mul(Vy.sun[0]), sgnY.mul(Vy.sun[1])), edge = float(1).sub(smoothstep(float(C.grout), float(Vy.bevel), g));
      const bev = edge.mul(facing).mul(Vy.relief).mul(mix(float(1), float(-1.6), sink));
      stone = v3(C.stone).mul(tint).mul(tone).mul(float(1).add(tilt).add(bev));
    } else {
      g = min(min(f0.x, float(1).sub(f0.x)), min(f0.y, float(1).sub(f0.y))).mul(C.slab);
      stone = v3(C.stone).mul(noise(cid.mul(1.7)).mul(0.5).add(n22.mul(0.2)).add(0.55));
    }
    const aa = max(fwidth(g), 1e-4), grout = float(1).sub(smoothstep(float(C.grout).sub(aa), float(C.grout).add(aa), g));
    // the joints: dark, and pale where silt has settled in them
    const silt = Vy ? smoothstep(Vy.siltAt, Vy.siltAt + 0.15, n22) : float(0);
    stone = mix(stone, mix(stone.mul(0.45), v3(Vy?.silt ?? C.stone), silt.mul(Vy?.siltK ?? 0)), grout);
    // the border: a band of small tiles round the pool
    // (from the pool's edge as it stands NOW — the floor of a wave may be smaller than the room — and never in a
    // room whose floor is not a rectangle: a band cut off by the shape's edge is a mistake, not a border)
    if (Vy?.border && !region) {
      const B = Vy.border, de = bounds ? min(bounds.cur.x.sub(abs(w.x)), bounds.cur.y.sub(abs(w.y))) : min(float(hx).sub(abs(w.x)), float(hz).sub(abs(w.y))), inB = step(B.in, de).mul(step(de, B.in + B.w));
      // (tiles counted along the edge they run beside, so the band turns the corners whole)
      const tq = w.div(B.tile), tc = tfloor(tq), tf = fract(tq), tg = min(min(tf.x, float(1).sub(tf.x)), min(tf.y, float(1).sub(tf.y))).mul(B.tile);
      const taa = max(fwidth(tg), 1e-4), tgr = float(1).sub(smoothstep(float(B.grout).sub(taa), float(B.grout).add(taa), tg));
      const th = hash(tc.add(9.3)), check = fract(tc.x.add(tc.y).mul(0.5)).mul(2), gone = step(1 - B.gone, th);
      const tile = mix(v3(B.dark), v3(B.light), check).mul(th.mul(0.3).add(0.85));
      // an edge line either side of it
      const lineD = min(abs(de.sub(B.in)), abs(de.sub(B.in + B.w))), line = float(1).sub(smoothstep(0.02, 0.05, lineD));
      stone = mix(stone, mix(tile, tile.mul(0.4), tgr), inB.mul(float(1).sub(gone)));
      stone = mix(stone, v3(B.dark).mul(0.6), line.mul(0.7));
    }
    // v97: the caustic NETWORK the approved picture shows — light focused by the moving surface into thin bright
    // cells over the slabs — from a domain-warped field (four warps of sines, the classic water caustic), brightest
    // in the roof shaft's pool and fainter elsewhere; v71's contour squiggles read as noise over everything
    const N = C.net;
    let caustic = causticNet(Wv ? w.add(slope.mul(Wv.netWarp)) : w, N, t);
    const lt = T.worlds.lit?.cistern?.lights ?? [], key = lt.find((l) => l.caustics) ?? lt[0], pool = key ? float(1).div(float(1).add(dot(w.sub(vec2(key.frac[0] * hx, key.frac[1] * hz)), w.sub(vec2(key.frac[0] * hx, key.frac[1] * hz))).div(key.r * key.r))) : float(1);
    // the column bases: a square plinth every `column` m, its edge catching the light
    const q = fract(w.div(C.column).add(0.5)).sub(0.5).mul(C.column), dq = max(abs(q.x), abs(q.y));
    const plinth = float(1).sub(smoothstep(C.plinth - 0.03, C.plinth + 0.03, dq));
    const rim = float(1).sub(smoothstep(0, 0.07, abs(dq.sub(C.plinth))));
    // v144: the pool is not one depth. Over a slow field the floor falls away into DEEPS (`deeps`: where the field
    // passes `at`, `k` more water over the bed) — the slabs go down into the dark there and the light on them
    // spreads and dims — so a look across the pool has shallows that show their stone and black water between
    let depth = sink.mul(Vy?.sunkDepth ?? 0).add(C.depth), shallow = float(1);
    if (C.deeps) { const Dp = C.deeps, dn = smoothstep(Dp.at[0], Dp.at[1], noise(w.mul(Dp.scale).add(vec2(7.3, 1.9)))); depth = depth.add(dn.mul(Dp.k)); shallow = float(1).sub(dn.mul(Dp.dim)); }
    let light = caustic.mul(N.gain).mul(mix(float(N.inPool), float(1), pool));
    let focus = float(0);
    if (Wv) {
      // the waves' own light: gathered under a crest (curvature < 0), thinned under a trough
      focus = clamp(lapK.negate().mul(Wv.focus), 0, Wv.focusMax);
      light = light.mul(clamp(float(1).sub(lapK.mul(Wv.thin)), 0.25, 1.6)).add(focus.mul(mix(float(Wv.inDark), float(1), pool)));
    }
    let col = mix(stone, v3(C.water), min(depth, 0.96)).add(v3(C.caustic).mul(light.mul(shallow)));
    let relief = float(0);
    if (Wv && key) {
      // and the waves' RELIEF: the vault is dark and the breach is bright, so the face of a wave turned to the
      // breach mirrors it and the face turned away mirrors the dark — what makes a ring a ring from across the pool
      const kp = vec2(key.frac[0] * hx, key.frac[1] * hz), toKey = kp.sub(w0), dk = length(toKey), turn = dot(glintSlope, toKey.div(max(dk, 0.5))).negate();
      relief = clamp(turn.mul(Wv.relief.k), -Wv.relief.dark, Wv.relief.max).mul(float(1).div(float(1).add(dk.mul(dk).div(Wv.relief.r * Wv.relief.r))).mul(1 - Wv.relief.far).add(Wv.relief.far));
      col = col.mul(float(1).add(min(relief, 0))).add(v3(Wv.relief.color).mul(max(relief, 0)));
    }
    col = mix(col, v3(C.stone).mul(0.35), plinth.mul(C.plinthK ?? 1)).add(v3(C.rim).mul(rim.mul(0.5 * (C.plinthK ?? 1))));
    // v71: in each plinth the cut top of a fallen column, a round stone disc
    // with a groove round it, under the same water
    const dr = length(q), sr = C.plinth * C.stump, saa = max(fwidth(dr), 1e-4);
    const stump = float(1).sub(smoothstep(float(sr).sub(saa), float(sr).add(saa), dr));
    const sgroove = float(1).sub(smoothstep(0, 0.045, abs(dr.sub(sr * 0.7))));
    col = mix(col, v3(C.stumpTone).mul(noise(w.mul(4.3)).mul(0.35).add(0.75)).mul(float(1).sub(sgroove.mul(0.45))), stump.mul(0.85 * (C.plinthK ?? 1)));
    // (v144: with the water simulated, the drips' rings and the hero's are the simulation's own — water.js)
    let drip = float(0), wake = float(0);
    if (!Wv) {
      // v71: drip rings: in every `drip.cell` m a drip from the vault every
      // `period` s, somewhere of its own, its rings spreading as they fade
      const D = C.drip, cell = tfloor(w.div(D.cell));
      const dph = noise(cell), dpos = cell.add(vec2(noise(cell.add(vec2(17, 3))), noise(cell.add(vec2(5, 29)))).mul(0.6).add(0.2)).mul(D.cell);
      const dk = fract(t.div(D.period).add(dph)), dd = length(w.sub(dpos)), daa = max(fwidth(dd), 1e-4);
      drip = float(1).sub(smoothstep(float(D.width).sub(daa), float(D.width).add(daa), abs(dd.sub(dk.mul(D.reach)))))
        .add(float(1).sub(smoothstep(float(D.width).sub(daa), float(D.width).add(daa), abs(dd.sub(dk.mul(D.reach * 0.55))))).mul(0.6))
        .mul(float(1).sub(dk).pow(2));
      col = col.add(v3(C.caustic).mul(drip.mul(D.gain)));
      // v143: the water ANSWERS THE HERO, as the driveway's puddles do (v138): it stands in a hand's depth of water, and
      // rings go out from where it stands — thin and bright as a drip's, `gap` m apart, `speed` m/s, gone by `reach` m
      const Wk = C.wake;
      if (Wk) {
        const dp = length(w.sub(toWorld(player))), waa = max(fwidth(dp), 1e-4);
        const off = abs(fract(dp.div(Wk.gap).sub(t.mul(Wk.speed / Wk.gap))).sub(0.5)).mul(Wk.gap);
        wake = float(1).sub(smoothstep(float(Wk.width).sub(waa), float(Wk.width).add(waa), off)).mul(float(1).sub(smoothstep(Wk.reach * 0.35, Wk.reach, dp))).mul(smoothstep(0.4, 0.7, dp));
        col = col.add(v3(C.caustic).mul(wake.mul(Wk.gain)));
      }
    }
    if (Wv) {
      // foam: white where the water was thrown about, broken into patches the way froth is, going as it calms
      // (froth, not paint: a veil of fine bubbles, mottled at two scales, thick only where the water is thrown hardest)
      const Fm = Wv.foam, fq = w0.add(slope.mul(Fm.drag)), n1 = noise(fq.mul(Fm.scale)), n2 = noise(fq.mul(Fm.scale * 3.1).add(vec2(3.7, t.mul(0.15))));
      const fk = smoothstep(float(1).sub(foam.mul(Fm.fill)), float(1).sub(foam.mul(Fm.fill)).add(Fm.soft), n1.mul(0.55).add(n2.mul(0.45))).mul(smoothstep(0.03, 0.3, foam));
      col = mix(col, v3(Fm.color), fk.mul(Fm.k));
      return { col, mask: min(caustic, 1).mul(0.5).add(grout.mul(0.25)).add(focus.mul(0.5)).add(fk.mul(0.6)).add(max(relief, 0)), lineCol: v3(C.caustic), wet: float(Wv.wet), rip: glintSlope, ripSpec: true, glintGate };
    }
    return { col, mask: min(caustic, 1).mul(0.6).add(grout.mul(0.3)).add(rim.mul(C.plinthK ?? 1)).add(drip).add(wake.mul(0.5)), lineCol: v3(C.caustic), wet: float(0.8) };
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
    const Vy = B.vary, pid = tfloor(u), soot = noise(w.mul(0.21).add(3.3));
    let col;
    if (Vy) {
      // v140 (owner, 2026-11-10: "look at all other worlds ... we can do a lot better than the concept art"): NO TWO
      // PLATES ALIKE. Each has its own tone and tint (blued, bare, rusting); a third are TREAD plate (rows of raised
      // lozenges, each catching the light), a third were ROLLED and show it (streaks down their length), and the rest
      // are bare and SCRAPED where things were dragged over them; a plate stands a hair proud of the deck, so its
      // edge toward the light is bright and the other in shade; here and there a PATCH is welded on, a bead round
      // it; rust blooms where the soot is not; and round every grate the steel is TEMPERED by the fire under it —
      // straw, bronze, purple, blue, going out. All arithmetic on one hash a plate
      const h1 = hash(pid.add(vec2(2.3, 5.9))), spin = (k) => fract(h1.mul(k)), kind = spin(29.3);
      const tone = h1.mul(Vy.tone).add(1 - Vy.tone / 2);
      const tint = mix(mix(v3(Vy.blued), v3(Vy.bare), smoothstep(0.2, 0.6, spin(37.1))), v3(Vy.rusty), smoothstep(0.75, 0.95, spin(37.1)));
      const px = max(length(fwidth(w)), 1e-4);
      // tread: lozenges on a `tread` m lattice, turned the other way in every other cell; gone where a pixel is wider than one
      const tq = w.div(Vy.tread), tc = tfloor(tq), tf = fract(tq).sub(0.5), turn = fract(tc.x.add(tc.y).mul(0.5)).greaterThan(0.25);
      const lz = select(turn, abs(tf.x).mul(3.2).add(abs(tf.y)), abs(tf.x).add(abs(tf.y).mul(3.2)));
      const loz = float(1).sub(smoothstep(0.34, 0.42, lz)).mul(float(1).sub(smoothstep(Vy.tread * 0.25, Vy.tread * 0.6, px)));
      const isTread = step(kind, 0.34), isRolled = step(0.34, kind).mul(step(kind, 0.68)), isBare = step(0.68, kind);
      // rolled: streaks down the plate's length, two beats that never line up
      const rs = sin(w.y.mul(41).add(h1.mul(40)).add(sin(w.x.mul(0.9)).mul(2.2))).mul(0.6).add(sin(w.y.mul(17.3).add(h1.mul(11)))).mul(0.4);
      // scrapes: three straight bright scratches across a bare plate, each at the plate's own angle
      const lm = f.sub(0.5).mul(P), th = spin(197.3).mul(3.1416), along = lm.x.mul(cos(th)).add(lm.y.mul(sin(th)));
      const scr = (k) => float(1).sub(smoothstep(0.0, px.add(0.008), abs(along.sub(spin(k).sub(0.5).mul(1.4)))));
      const scrape = max(max(scr(151.9), scr(83.7)), scr(61.3)).mul(isBare);
      // proud of the deck: the nearest seam faces out along x or z; `sun` is where the light stands
      const facing = select(sx.lessThan(sz), select(f.x.lessThan(0.5), float(-1), float(1)).mul(Vy.sun[0]), select(f.y.lessThan(0.5), float(-1), float(1)).mul(Vy.sun[1]));
      const bev = float(1).sub(smoothstep(float(B.seam), float(Vy.bevel), sd)).mul(facing).mul(Vy.relief);
      col = v3(B.steel).mul(tint).mul(tone).mul(float(1).add(bev).add(loz.mul(isTread).mul(Vy.treadK)).add(rs.mul(isRolled).mul(Vy.rolledK)));
      col = col.add(v3(B.rivet).mul(scrape.mul(Vy.scrapeK)));
      // a patch welded on
      const pc = vec2(spin(53.7), spin(89.1)).mul(0.3).add(0.35), ph = vec2(spin(151.3), spin(67.9)).mul(0.08).add(0.12);
      const pd = max(abs(f.x.sub(pc.x)).sub(ph.x).mul(B.plate[0]), abs(f.y.sub(pc.y)).sub(ph.y).mul(B.plate[1])), has = step(1 - Vy.patch, spin(271.9));
      const inP = has.mul(float(1).sub(smoothstep(px.negate(), px, pd))), bead = has.mul(float(1).sub(smoothstep(0.02, float(0.03).add(px), abs(pd))));
      col = mix(col, v3(B.steel).mul(v3(Vy.bare)).mul(1.25), inP).add(v3(B.rivet).mul(bead.mul(sin(along.mul(90)).mul(0.25).add(0.75)).mul(0.5)));
      // rust where the soot is not
      col = mix(col, v3(Vy.rust), float(1).sub(smoothstep(0.18, 0.34, soot)).mul(Vy.rustK).mul(h1.mul(0.6).add(0.4)));
      col = col.add(v3(B.rivet).mul(rivet.mul(0.8)));
    } else col = v3(B.steel).mul(noise(pid.mul(2.3)).mul(0.35).add(0.75)).add(v3(B.rivet).mul(rivet.mul(0.8)));
    // soot, not the shadow of something standing there (v43: at 0.8 it read as a hole in the floor)
    col = mix(col, v3(B.scorch), smoothstep(0.6, 0.85, soot).mul(0.4));
    col = col.mul(float(1).sub(seam.mul(0.7)));
    // v78: oily puddles standing on the plate along the long sides, under the pipe
    // runs: the steel dark under a film with a sheen on it, and the grates' fire in them
    const PD = B.puddle, pd = puddles(w.add(2.2), PD), half = hx >= hz ? hz : hx;
    const pud = pd.mask.mul(smoothstep(half - PD.band - 1.2, half - PD.band, abs(across(w))));
    const hue = noise(w.mul(1.3).add(1.7)).mul(6.283), sheen = vec3(sin(hue), sin(hue.add(2.1)), sin(hue.add(4.2))).mul(0.5).add(0.5);
    col = mix(col, col.mul(PD.dark).add(sheen.mul(PD.sheen)), pud).add(v3(B.rivet).mul(pd.rim.mul(pud.oneMinus()).mul(PD.rim * 0.5)));
    // the grates (v101, the approved picture's): a steel frame round a LATTICE of square holes, the fire under it
    // breathing and hottest in the middle — they were rows of slots. The holes `hole` m across at a `pitch`
    const gq = fract(w.div(B.grate).add(0.5)).sub(0.5).mul(B.grate), G = B.lattice;
    const gd = max(abs(gq.x).sub(B.grateW[0]), abs(gq.y).sub(B.grateW[1]));   // < 0 inside the grate
    const inG = float(1).sub(smoothstep(0, 0.03, gd)), inner = float(1).sub(smoothstep(float(-G.frame - 0.02), float(-G.frame), gd));
    const lq = abs(fract(gq.div(G.pitch)).sub(0.5)).mul(G.pitch), haa = max(fwidth(lq.x), 1e-4);
    const hole = float(1).sub(smoothstep(float(G.hole / 2).sub(haa), float(G.hole / 2).add(haa), max(lq.x, lq.y))).mul(inner);
    const pulse = float(0.55).add(sin(GEL_TIME.mul(B.pulse).add(noise(tfloor(w.div(B.grate)).mul(3)).mul(6))).mul(0.45));
    const heat = float(1).sub(smoothstep(0, 1.1, length(gq.div(vec2(...B.grateW)))));   // hotter toward the middle
    // v149 (owner on v147: "Decks right, mood weak"): the fire is DOWN THERE, and it is BLOWN. Under each grate is a
    // pit `pit.depth` m deep with a bed of coals in it, seen as a sunk thing is — the view followed down through
    // the lattice to the bed, or to the pit's wall where that comes first, so the bars stand against the fire and
    // slide over it as the camera moves, and the near wall is hidden and the far one lit from below. And the room
    // STOKES (kit.js stoke): on a beat the bellows go and a flare runs down the hall grate by grate, the coals
    // going from red toward white and the light they throw (worldLight) swelling with them
    const Pt = G.pit, Sk = B.stoke, gcell = w.sub(gq), flare = Sk ? stoke(Sk, gcell) : float(0), blown = flare.mul(Sk?.k ?? 0).add(1);
    let fireCol;
    if (Pt) {
      const Vv = normalize(cameraPosition.sub(positionWorld)), run = Vv.xz.div(max(Vv.y, 0.3)).negate();   // the ray's run, a metre of fall
      const hb = [B.grateW[0] - G.frame, B.grateW[1] - G.frame];
      const tx = float(hb[0]).sub(gq.x.mul(sign(run.x))).div(max(abs(run.x), 1e-3)), tz = float(hb[1]).sub(gq.y.mul(sign(run.y))).div(max(abs(run.y), 1e-3));
      const tw = min(tx, tz), onBed = step(Pt.depth, tw), dq = gq.add(run.mul(min(tw, Pt.depth)));
      const heatD = float(1).sub(smoothstep(0, 1.15, length(dq.div(vec2(...B.grateW)))));
      // the bed: coals, each its own heat, breathing; whiter where the bed is hottest and when it is blown
      const cn = noise(dq.mul(Pt.coal).add(gcell.mul(0.37))).mul(0.65).add(noise(dq.mul(Pt.coal * 2.7).add(GEL_TIME.mul(0.35))).mul(0.35));
      const hot = smoothstep(0.28, 0.72, cn).mul(pulse.mul(0.35).add(0.65)).mul(blown).mul(heatD.mul(0.6).add(0.5));
      const bed = mix(v3(Pt.coalLo), v3(Pt.coalHi), clamp(hot, 0, 1)).add(v3(G.core).mul(clamp(hot.sub(0.75), 0, 1).mul(Pt.white)));
      // the wall: dark, lit from the bed below it
      const up = clamp(tw.div(Pt.depth), 0, 1), wallC = v3(Pt.wall).add(v3(B.glow).mul(up.mul(up).mul(Pt.wallGlow).mul(pulse.mul(0.3).add(0.7)).mul(blown)));
      fireCol = mix(wallC, bed, onBed);
    } else fireCol = mix(v3(B.glow), v3(G.core), heat.mul(heat)).mul(pulse.mul(0.5).add(0.5)).mul(heat.mul(0.6).add(0.55));
    const fire = hole.mul(pulse).mul(flare.mul(0.5).add(1));
    const frame = inG.mul(float(1).sub(inner)), bars = inner.mul(float(1).sub(hole));
    // v140: the steel round a grate, tempered: out from its frame over `temper.reach` m the colours a fire leaves
    if (B.vary?.temper) {
      const Tm = B.vary.temper, k = clamp(gd.div(Tm.reach), 0, 1), on = step(0, gd).mul(float(1).sub(k)).mul(Tm.k);
      const tc2 = mix(mix(v3(Tm.straw), v3(Tm.bronze), smoothstep(0.0, 0.3, k)), mix(v3(Tm.purple), v3(Tm.blue), smoothstep(0.55, 0.9, k)), smoothstep(0.25, 0.6, k));
      col = mix(col, col.mul(tc2).mul(2.2), on);
    }
    col = mix(col, v3(G.steel), frame.add(bars).min(1));   // the frame and the bars, dark iron
    col = col.add(v3(B.glow).mul(bars.mul(heat).mul(G.barGlow).mul(blown))).add(v3(B.glow).mul(frame.mul(G.frameGlow).mul(blown)));   // lit from the fire under them
    col = mix(col, fireCol, hole);
    col = col.add(v3(B.glow).mul(pud.mul(fire).mul(PD.fire)));   // v78: the fire in the puddles
    // v101: FIRE IN THE SEAMS along the deck's edge (the approved picture's veins of light at the wall's foot):
    // cracks glowing within `reach` m of the edge, thickest at it, breathing on their own beat
    const V = B.veins;
    if (V) {
      // from the edge as it stands NOW: the boiler squeezes its floor (worlds `squeeze`), and the fire hugs the rail
      const e = bounds ? min(bounds.cur.x.sub(abs(w.x)), bounds.cur.y.sub(abs(w.y))) : min(float(hx).sub(abs(w.x)), float(hz).sub(abs(w.y)));
      const near = smoothstep(V.reach, 0, e).mul(step(0, e));
      const vn = noise(w.mul(V.scale)), vr = abs(vn.sub(0.5)), vaa = max(fwidth(vr), 1e-4);
      const crack = float(1).sub(smoothstep(float(V.width).sub(vaa), float(V.width).add(vaa), vr)).mul(near.mul(near))
        .mul(smoothstep(0.35, 0.55, noise(w.mul(V.scale * 0.5).add(9.1))).mul(0.7).add(near.mul(0.3)));
      const breathe = float(0.7).add(sin(GEL_TIME.mul(V.pulse).add(vn.mul(9))).mul(0.3));
      col = col.add(v3(V.color).mul(crack.mul(breathe).mul(V.gain))).add(v3(V.color).mul(near.mul(near).mul(near).mul(V.haze)));
    }
    return { col, mask: seam.mul(0.4).add(fire), lineCol: v3(B.glow), wet: pud };
  };
  // THE RIVER: water running the long way, its streaks moving with it,
  // pebbled banks at both edges (v95: in daylight, the approved picture's)
  const river = (p, w0) => {
    const R = W.river, half = hx >= hz ? hz : hx, U = R.run, t = GEL_TIME, Wv = water ? R.wave : null;
    // v146 (owner, 2026-11-11: "River looks ok, still should be much more realistic water and effects ... I've seen
    // crazy three.js demos online and we don't compare"): the river's water is SIMULATED too (render/water.js), in
    // the stream's own frame — the texture is carried along with the current, so a body standing in the river is
    // moving through the water and trails a real wake, a rock parts the stream and throws a bow wave, and rings from
    // a splash go off downstream as they spread. Its optics are the cistern's (v144) in daylight: the pebbles swim
    // under the waves, the sun stands on the faces turned to it and glitters off them, the caustic web is pulled
    // about and gathered under the crests, and where the water is thrown hardest it is white
    let w = w0, slope = null, lapK = float(0), foamS = float(0);
    if (Wv) {
      const sv = slopeTex.sample(vec2(p.x, float(1).sub(p.y)).sub(water.driftUV));
      slope = sv.xy.mul(Wv.gain); lapK = sv.z.mul(Wv.gain); foamS = sv.w;
      w = w0.add(slope.mul(Wv.refract));
    }
    const a = along(w0), c = across(w0);
    const flow = a.sub(t.mul(R.flow)), ac = abs(c);
    // v99: the shore WANDERS, as the approved picture's does — the bank's edge, and the shallows with it, in
    // and out `shore.amp` of the half width along the river (river.js draws the same line past the ends)
    const Sh = R.shore, wob = Sh ? noise(vec2(a.mul(Sh.scale), 3.7)).sub(0.5).mul(2 * Sh.amp) : float(0);
    const bankAt = wob.add(R.bank).mul(half), shallowAt = wob.add(U.shallow).mul(half);
    // v78: a river that FLOWS (it wore the cistern's net): streaks stretched along the
    // current in two layers, dark and deep down the middle, the bed showing through
    // the shallows toward the banks, foam along the banks' edge and flecks going by
    const st = streaks(a, c, R.flow, U.stretch, U.scale);
    const depth = float(1).sub(smoothstep(shallowAt, bankAt, ac));   // 1 down the middle, 0 at the bank
    // v99: the bed is PEBBLES — round stones in a few tones, dark in their joints and lit on their crowns —
    // and in the shallows the caustic web runs over them with the current (the picture's bright lines)
    const B = R.bed;
    let rock, bed;
    if (B) {
      const pb = pebbleBed(w, B.cell), tone = hash(pb.id.add(0.37)), odd = hash(pb.id.add(5.1));
      const stoneCol = mix(mix(v3(B.tones[0]), v3(B.tones[1]), tone), v3(B.tones[2]), smoothstep(0.72, 1, odd));
      const crown = smoothstep(B.gap, B.gap + B.crown, pb.round);   // dark at its rim, lit on its top
      rock = mix(v3(B.joint), stoneCol.mul(crown.mul(0.5).add(0.6)), smoothstep(B.gap - 0.03, B.gap + 0.02, pb.round));
      const cq = Wv ? vec2(a.sub(t.mul(R.flow * B.drift)), c).add(slope.mul(Wv.netWarp)) : vec2(a.sub(t.mul(R.flow * B.drift)), c);
      let cn = causticNet(cq, B.net, t).mul(B.net.gain);
      // (the waves' own light: gathered under a crest, thinned under a trough)
      if (Wv) cn = cn.mul(clamp(float(1).sub(lapK.mul(Wv.thin)), 0.3, 1.7)).add(clamp(lapK.negate().mul(Wv.focus), 0, Wv.focusMax));
      bed = rock.add(v3(B.caustic).mul(cn));
    } else {
      const peb = noise(w.mul(2.8)).mul(0.6).add(noise(w.mul(7.1)).mul(0.4));
      rock = v3(R.pebble).mul(peb.mul(0.8).add(0.45)); bed = rock;
    }
    let col = mix(v3(R.water), v3(R.waterHi), smoothstep(0.35, 0.8, st).mul(U.lift).mul(depth.mul(0.6).add(0.4)));
    col = mix(col, v3(U.deep), depth.mul(U.deepK));
    col = mix(mix(bed, col, U.shallowTint), col, depth);
    // v140 (owner, 2026-11-10: "look at all other worlds ... we can do a lot better than the concept art"): FISH. Dark
    // shapes holding against the current, each working its tail; they make upstream slowly, and scatter from where
    // the hero stands. Under the water: they darken it, they are not drawn on it. One hash a fish
    // v146 (owner, 2026-11-11: "Fish maybe too one note"): several KINDS of them (`fish.kinds`), each its own size,
    // water and way — the trout holding in the deep middle as before; a SHOAL of fry in the shallows, small and
    // quick, many to a patch, darting together and flashing silver as they turn; and a PIKE or two, long and slow,
    // lying across the current. `zone` is where a kind lives (the depth it keeps between), `flash` how it glints
    const Fi = R.fish;
    if (Fi) {
      const faa = max(length(fwidth(w0)), 1e-4), hw = toWorld(player), dHero = length(w0.sub(hw));   // (a pixel's width in the world: a derivative may not sit in a branch, v68)
      for (const [ki, K] of (Fi.kinds ?? [Fi]).entries()) {
        // a shoal darts: its cells' field jumps on a beat of its own and eases to rest
        const dart = K.dart ? vec2(sin(tfloor(t.mul(K.dart[0])).mul(12.9898 + ki)).mul(K.dart[1]), sin(tfloor(t.mul(K.dart[0])).mul(78.233 + ki)).mul(K.dart[1] * 0.5)).mul(float(1).sub(fract(t.mul(K.dart[0])).pow(0.35))) : vec2(0);
        const fa = a.add(t.mul(K.swim)).add(dart.x), fcx = c.add(dart.y), fc = vec2(fa.div(K.cell[0]), fcx.div(K.cell[1])), fid = tfloor(fc), fh = hash(fid.add(3.1 + ki * 17.3)), fh2 = fract(fh.mul(37.7));
        const fish = float(0).toVar(), turn = float(0).toVar();
        If(fh.greaterThan(1 - K.keep), () => {
          const sway = sin(t.mul(0.45).add(fh.mul(40))).mul(0.07);
          // (a pike lies ACROSS the stream: its own angle; the others head into it)
          const q0 = fract(fc).sub(vec2(fh2.mul(0.5).add(0.25), fract(fh.mul(91.3)).mul(0.5).add(0.25).add(sway))).mul(vec2(...K.cell));
          const ang = K.slant ? fh2.sub(0.5).mul(K.slant) : float(0), q = K.slant ? vec2(q0.x.mul(cos(ang)).add(q0.y.mul(sin(ang))), q0.y.mul(cos(ang)).sub(q0.x.mul(sin(ang)))) : q0;
          const len = fh2.mul(K.len[1] - K.len[0]).add(K.len[0]), s01 = q.x.div(len).add(0.5);   // 0 at its nose (upstream), 1 at its tail
          // the wave that runs down it: nothing at the head, widest at the tail
          const ph = t.mul(K.beat).add(fh.mul(30)).sub(s01.mul(4)), bend = sin(ph).mul(s01.mul(s01)).mul(len.mul(0.13));
          const y = abs(q.y.sub(bend));
          // its outline: a body widest a third of the way back, pinched before the tail, then the tail's fork
          const body = sin(clamp(s01.div(0.86), 0, 1).pow(0.7).mul(3.1416)).mul(len.mul(K.girth ?? 0.13));
          const tail = clamp(s01.sub(0.8).div(0.22), 0, 1).mul(len.mul(0.16));
          const wide = max(body, tail).mul(step(0, s01)).mul(step(s01, 1.02));
          fish.assign(float(1).sub(smoothstep(wide.sub(faa), wide.add(faa), y)).mul(step(0.001, wide)));
          turn.assign(smoothstep(0.75, 1, sin(ph.add(1.2))));   // its flank to the light at the top of each beat
        });
        const away = smoothstep(K.shy[0], K.shy[1], dHero), zone = smoothstep(K.zone[0], K.zone[0] + 0.15, depth).mul(float(1).sub(smoothstep(K.zone[1], K.zone[1] + 0.15, depth)));
        const seen = fish.mul(zone).mul(away);
        col = mix(col, col.mul(v3(K.dark)), seen.mul(K.k));
        if (K.flash) col = col.add(v3(K.flash).mul(seen.mul(turn)));
      }
    }
    // v72: lily pads near the banks. v148 (owner, 2026-11-11: "the lily pads move and then dissapear"): TETHERED —
    // each leans on its stem the way the current rule pushes (kit.js DRIFT, a few decimetres and no further),
    // swings a little of its own and rides the simulated waves; and whether a pad is there is asked at its own
    // centre (in the band between the deep middle and the bank, clear of the bank by its radius), so none is cut
    const Pd = T.scenery.river.pads, ride = Wv ? slope.mul(Pd.ride ?? 0) : vec2(0);
    const lp = lilyPads(w0, Pd.cell, Pd.keep, DRIFT.add(ride), Pd.sway ?? 0, t);
    const pa = along(lp.centre), pc = abs(across(lp.centre)), pBank = (Sh ? noise(vec2(pa.mul(Sh.scale), 3.7)).sub(0.5).mul(2 * Sh.amp) : float(0)).add(R.bank).mul(half);
    const near = step(half * 0.44, pc).mul(step(pc, pBank.sub(lp.r).sub(Pd.clear ?? 0.1)));
    col = mix(col, mix(v3(Pd.lo), v3(Pd.hi), lp.rim), lp.pad.mul(near)).add(v3(Pd.flower).mul(lp.flower.mul(near)));
    const bank = smoothstep(bankAt, bankAt.add(half * 0.08), ac);
    const fnz = noise(vec2(flow.mul(1.5), c.mul(4))), foam = float(1).sub(smoothstep(0, 0.45, abs(ac.sub(bankAt)))).mul(smoothstep(0.4, 0.7, fnz));
    const flecks = (R.flecks ?? 1) > 0 ? smoothstep(0.86, 0.93, noise(vec2(flow.mul(2.2), c.mul(1.4)).add(4.4))).mul(depth) : float(0);   // v99: none (the glitter is the sparkle now)
    col = mix(col, rock.mul(B?.dry ?? 1), bank).add(v3(R.foam).mul(foam.mul(R.foamK ?? 0.4).add(flecks.mul(0.5 * (R.flecks ?? 1)))));
    // v143: the stream BREAKS ROUND THE HERO: a crescent of foam on its upstream side, and behind it a wake — two
    // arms opening downstream at `open` (across per m along), torn by the current's own streaks, gone by `reach` m.
    // On the water only (none on the dry bank)
    const Wr = Wv ? null : R.wake;   // (v146: on simulated water the wake is the simulation's own)
    if (Wr) {
      const hw = toWorld(player), ar = a.sub(along(hw)), cr = c.sub(across(hw)), dr = length(vec2(ar, cr));
      const spread = abs(cr).sub(ar.mul(Wr.open).add(Wr.r)), wd = ar.mul(Wr.widen).add(Wr.w);
      // (torn by the same lace the banks' foam is: a ruled line of white is a laser, not a wake)
      const arm = exp(spread.mul(spread).div(wd.mul(wd)).negate()).mul(step(0, ar)).mul(exp(ar.div(-Wr.reach))).mul(smoothstep(0.28, 0.62, fnz).mul(0.85).add(0.15));
      const bow = exp(dr.sub(Wr.r * 1.25).mul(dr.sub(Wr.r * 1.25)).div(Wr.w * Wr.w * 2).negate()).mul(smoothstep(0.15, 0.75, ar.negate().div(max(dr, 1e-3))));
      col = mix(col, v3(R.foam), clamp(arm.add(bow.mul(0.8)), 0, 1).mul(Wr.k).mul(float(1).sub(bank)));
    }
    let relief = float(0), froth = float(0);
    if (Wv) {
      // the waves' RELIEF in daylight: the face turned to the sun bright, the face turned from it darker
      const Ls = normalize(SUN_AT), sxz = normalize(vec2(Ls.x, Ls.z)), turnS = dot(slope, sxz).negate(), onW = float(1).sub(bank);
      relief = clamp(turnS.mul(Wv.relief.k), -Wv.relief.dark, Wv.relief.max).mul(onW);
      col = col.mul(float(1).add(min(relief, 0))).add(v3(Wv.relief.color).mul(max(relief, 0)));
      // froth where the water is thrown hardest: a veil, mottled, drawn out along the stream
      const Fm = Wv.foam, fq = vec2(flow.mul(Fm.scale * 0.5), c.mul(Fm.scale)).add(slope.mul(Fm.drag)), n1 = noise(fq), n2 = noise(fq.mul(3.1).add(3.7));
      froth = smoothstep(float(1).sub(foamS.mul(Fm.fill)), float(1).sub(foamS.mul(Fm.fill)).add(Fm.soft), n1.mul(0.55).add(n2.mul(0.45))).mul(smoothstep(0.03, 0.3, foamS)).mul(onW);
      col = mix(col, v3(R.foam), froth.mul(Fm.k));
    }
    // v99: the ripples' SLOPE, for the sun's glitter (worldLight): small waves going with the current, two
    // layers; their slope in world x and z, calmer down the deep middle and none on the dry bank
    const Gl = R.glitter;
    let rip = null;
    if (Gl) {
      const fr = a.sub(t.mul(R.flow * Gl.with)), e = 0.05;
      const h = (da, dc) => noise(vec2(fr.add(da).mul(Gl.scale[0]), c.add(dc).mul(Gl.scale[1]))).mul(0.65)
        .add(noise(vec2(fr.add(da).mul(Gl.scale[0] * 2.3).add(7.7), c.add(dc).mul(Gl.scale[1] * 2.1).sub(t.mul(0.3)))).mul(0.35));
      const h0 = h(0, 0), sa = h(e, 0).sub(h0).div(e), sc = h(0, e).sub(h0).div(e);
      const k = float(Gl.amp).mul(float(1).sub(bank)).mul(float(1).sub(depth.mul(Gl.calm)));
      rip = (hx >= hz ? vec2(sa, sc) : vec2(sc, sa)).mul(k);
    }
    if (Wv) rip = (rip ?? vec2(0)).mul(Wv.ripKeep).add(slope.mul(float(1).sub(bank)));   // the sun glitters off the simulation's waves
    return { col, mask: smoothstep(0.5, 0.85, st).mul(float(1).sub(bank)).mul(0.6).add(foam).add(flecks).add(max(relief, 0)).add(froth.mul(0.5)), lineCol: v3(R.waterHi), wet: float(1).sub(bank), rip };
  };
  // THE ICE SHEET: pale ice, darker where it is deep, cracked, frost along the cracks
  const ice = (p, w) => {
    const I = W.ice, F = I.fracture;
    // v100: FRACTURES, as the approved picture's ice is cracked — plates with straight cracks between them, finer
    // ones across the plates — where v72's were the contours of a noise, wavy loops that read as squiggles. A
    // cellular field read as the DIFFERENCE of its nearest two distances is zero on the line between two points;
    // warped a little so no crack runs ruler-straight. Each plate a shade of its own, frost along the big cracks
    const wq = w.add(vec2(noise(w.mul(F.warpScale)), noise(w.mul(F.warpScale).add(7.3))).sub(0.5).mul(F.warp));
    const c1 = cellular(wq, F.cell[0]), c2 = cellular(wq.add(3.7), F.cell[1]);
    const e1 = c1.d2.sub(c1.d1).mul(F.cell[0] * 0.5), e2 = c2.d2.sub(c2.d1).mul(F.cell[1] * 0.5);   // metres to the crack
    const aa1 = max(fwidth(e1), 1e-4), aa2 = max(fwidth(e2), 1e-4);
    // a crack does not close every plate: stretches of the big ones fade out (`gaps`), and only some plates
    // (`minorKeep` of them) are crazed with the fine ones, so there is clear ice between — a uniform net of both
    // read as a crackle glaze, every plate shut and every plate crazed
    const run = smoothstep(F.gaps[0], F.gaps[1], noise(wq.mul(F.gapScale).add(1.9)));
    const crazed = step(1 - F.minorKeep, hash(c1.id.add(2.2))).mul(smoothstep(0.3, 0.5, noise(wq.mul(F.gapScale * 2.3).add(5.5))));
    const crack = float(1).sub(smoothstep(float(F.width[0]), aa1.mul(1.5).add(F.width[0]), e1)).mul(run)
      .add(float(1).sub(smoothstep(float(F.width[1]), aa2.mul(1.5).add(F.width[1]), e2)).mul(crazed).mul(F.minor));
    const frost = float(1).sub(smoothstep(0, F.frost, e1)).mul(run).mul(noise(w.mul(9)).mul(0.6).add(0.4));
    const depth = noise(w.mul(0.12).add(4.4)), plate = hash(c1.id.add(0.5));
    let col = mix(v3(I.deep), v3(I.base), depth.mul(0.55).add(plate.mul(F.plates)).add(0.3 - F.plates * 0.5));
    col = col.add(v3(I.frost).mul(frost.mul(0.1))).add(v3(I.crack).mul(min(crack, 1).mul(0.3)));
    // v72: frost creeping in from the floor's edge, and air caught in the ice, both faint
    const e = min(float(hx).sub(abs(w.x)), float(hz).sub(abs(w.y))), n53 = noise(w.mul(5.3));
    col = col.add(v3(I.frost).mul(smoothstep(I.edgeFrost, 0, e).mul(n53.mul(0.6).add(0.4)).mul(I.edgeFrostGain)));
    // v140: SNOW has drifted over the sheet. Where the ice is pale (the same broad field that makes it deep or
    // shallow) a dusting lies over it — the cracks under it gone — ridged across the wind in fine ripples, its edge
    // scalloped; and the dark windows between are swept clear. The sheet has places now: drift and clear ice
    const Sn = I.snow;
    let drift = float(0), cover = float(0), bare = float(0);
    if (Sn) {
      // (its edge scalloped by the same ridges that ripple it: a fine noise there showed its grid as steps)
      const wd = w.x.mul(Sn.wind[0]).add(w.y.mul(Sn.wind[1])), ridge = sin(wd.mul(Sn.ripple).add(depth.mul(20)));
      // v145 (owner, 2026-11-11: "Want more snow"): more of it, and DEEP along the rail, where the wind has banked it
      // (`bank`: within `reach` m of the edge it lies whatever the sheet is like under it, `deep` thicker there, with a
      // soft shade along its inner edge where the bank stands up off the ice)
      // (in a small room the bank is as much narrower as the room is: it lines the rail, it does not fill the floor)
      const room = Math.max(0.4, Math.min(1, Math.min(hx, hz) / 14)), Bk = Sn.bank, banked = Bk ? exp(e.max(0).div(Bk.reach * room).negate()).mul(room * room) : float(0);
      const lay = depth.mul(0.75).add(noise(w.mul(Sn.scale).add(8.8)).mul(0.25)).add(ridge.mul(Sn.scallop)).add(banked.mul(Bk?.lift ?? 0));
      drift = smoothstep(Sn.at, Sn.at + Sn.soft, lay);
      const thick = Bk ? drift.mul(float(Sn.k).add(banked.mul(Bk.deep))) : drift.mul(Sn.k);
      // v149 (owner on v147: "More snow, sliding on ice trails etc"): a DUSTING over the rest of the sheet, thin and
      // patchy, so there is snow to be swept wherever a thing slides; SPINDRIFT going over all of it on the wind;
      // and the TRAILS — the sheet keeps where bodies have been (water.js `trail`): there the snow is gone and the ice
      // is bare and polished, a berm of it pushed up along each edge, the furrow's walls lit and shaded by the sun
      const Du = Sn.dust, dn = Du ? noise(w.mul(Du.scale).add(13.1)).mul(0.6).add(noise(w.mul(Du.scale * 3.3).add(2.7)).mul(0.4)).add(ridge.mul(0.05)) : float(0);
      const dust = Du ? smoothstep(Du.at[0], Du.at[1], dn).mul(Du.k) : float(0);
      const lain = max(min(thick, Bk?.max ?? 1), dust), Tr = water ? Sn.trail : null;
      let swept = float(0), tg = vec2(0);
      if (Tr) { const sv = slopeTex.sample(vec2(p.x, float(1).sub(p.y))); swept = clamp(sv.a, 0, 1); tg = sv.xy; }
      cover = lain.mul(float(1).sub(swept.mul(Tr?.sweep ?? 0)));
      col = mix(col, v3(Sn.color).mul(ridge.mul(Sn.ridge).add(1)), cover);
      if (Bk) col = col.mul(float(1).sub(smoothstep(Sn.at - Bk.shadeW, Sn.at, lay).mul(float(1).sub(drift)).mul(banked.add(0.35)).mul(Bk.shade).mul(float(1).sub(swept))));
      if (Tr) {
        // the furrow: `tg` points into it. Its wall toward the sun is lit, the other in shade; the berm along its edge
        const sl = max(length(SUN_AT.xz), 1e-3), turn = dot(tg, SUN_AT.xz.div(sl)).negate(), steep = length(tg);
        const wall = smoothstep(Tr.edge[0], Tr.edge[1], steep).mul(lain);
        col = col.mul(float(1).add(clamp(turn.mul(Tr.relief), -Tr.dark, Tr.relief * 1.5).mul(lain)));
        col = mix(col, v3(Sn.color).mul(1.08), wall.mul(float(1).sub(swept)).mul(Tr.pile));
        bare = swept.mul(lain);   // ice that had snow on it and has none now
        col = mix(col, col.mul(v3(Tr.polish)), swept);   // (polished wherever it was swept, snow or no snow there before: a trail shows on bare ice too)
      }
      const Sd = Sn.spindrift;
      if (Sd) {
        const sa = wd, sc2 = w.x.mul(Sn.wind[1]).sub(w.y.mul(Sn.wind[0])), tt = GEL_TIME.mul(Sd.speed);
        const sp = noise(vec2(sa.sub(tt).mul(Sd.scale[0]), sc2.mul(Sd.scale[1]))).mul(0.62).add(noise(vec2(sa.sub(tt.mul(1.6)).mul(Sd.scale[0] * 2.7), sc2.mul(Sd.scale[1] * 2.3).add(4.2))).mul(0.38));
        col = mix(col, v3(Sn.color).mul(1.05), smoothstep(Sd.at[0], Sd.at[1], sp).mul(Sd.k));
      }
    }
    const Bb = I.bubble, bc = tfloor(w.div(Bb.cell)), bh = noise(bc.mul(1.7).add(0.5));
    const bq = fract(w.div(Bb.cell)).sub(0.5).sub(vec2(noise(bc.add(3.1)), noise(bc.add(7.7))).sub(0.5).mul(0.5)).mul(Bb.cell);
    const br = bh.mul(Bb.r[1] - Bb.r[0]).add(Bb.r[0]), bd = length(bq);
    const bubble = float(1).sub(smoothstep(0.015, 0.035, abs(bd.sub(br)))).add(smoothstep(br, br.mul(0.5), bd).mul(0.3)).mul(step(1 - Bb.keep, noise(bc.mul(2.3).add(9.9))));
    col = col.add(v3(I.crack).mul(bubble.mul(Bb.gain)));
    // v100: the ledge's shadow on the ice where the sun stands behind it (scenery.ice.ledge; the curb's, v93)
    const LS = I.ledgeShadow, Lh = T.scenery.ice.ledge;
    if (LS && Lh) {
      const sunH = max(length(SUN_AT.xz), 1e-3), cot = min(sunH.div(max(SUN_AT.y, 1e-3)), LS.cotMax), lh = (Lh.h[0] + Lh.h[1]) / 2;
      const awayX = SUN_AT.x.negate().div(sunH), awayZ = SUN_AT.z.negate().div(sunH);
      const band = (dist, len) => float(1).sub(smoothstep(len.sub(LS.soft), len.add(LS.soft), dist)).mul(step(0.05, len));
      const farLen = cot.mul(lh).mul(max(awayZ, 0)), leftLen = cot.mul(lh).mul(max(awayX, 0)), rightLen = cot.mul(lh).mul(max(awayX.negate(), 0));
      col = col.mul(float(1).sub(max(max(band(w.y.add(hz), farLen), band(w.x.add(hx), leftLen)), band(float(hx).sub(w.x), rightLen)).mul(LS.depth)));
    }
    // the cracks are a texture under the fight, not lines across it (v48: at full strength they were the loudest thing on screen)
    return { col, mask: min(crack, 1).mul(I.lines).mul(float(1).sub(cover)), lineCol: v3(I.crack), wet: bare.mul(Sn?.trail?.gloss ?? 0).add(0.6) };
  };
  // THE DEEP: black silt in slow ripples, lit only by what lives in it
  const deep = (p, w) => {
    const D = W.deep, t = GEL_TIME, S = D.bed, Wv = water ? D.stir : null;
    const rip = smoothstep(0.7, 1.0, sin(w.x.mul(0.9).add(noise(w.mul(0.3)).mul(6))).mul(0.5).add(0.5));
    let col = mix(v3(D.silt), v3(D.ripple), rip.mul(0.6).add(noise(w.mul(1.7)).mul(0.3)));
    // v101: a SEABED, as the approved picture's — warm silt in soft lumps (the river's cellular pebbles, read
    // softly), paler down a swept band through the middle, cold toward the edges — where it was a dark blue field
    // under specks spread evenly as stars, and read as night sky
    let pool = float(1);
    if (S) {
      // soft lumps from a few noises — a cellular field read as lumps here doubled the deep's frame under
      // SwiftShader (9 cells a pixel), and its joints read as paving until they were softened away anyway
      const n1 = noise(w.div(S.cell)), n2 = noise(w.mul(2.3 / S.cell).add(4.1));
      const lump = smoothstep(0.32, 0.78, n1.mul(0.65).add(n2.mul(0.35)));
      col = mix(v3(S.lo), v3(S.hi), lump.mul(S.lumpK).add(noise(w.mul(0.35)).mul(0.35)).add(noise(w.mul(3.7)).mul(0.12)));
      const half = hx >= hz ? hz : hx, cc = across(w).add(noise(vec2(along(w).mul(0.07), 1.7)).sub(0.5).mul(half * 0.6));
      col = mix(col, col.mul(S.swept), float(1).sub(smoothstep(0, half * S.band, abs(cc))).mul(0.7));
      const e = min(float(hx).sub(abs(w.x)), float(hz).sub(abs(w.y)));
      col = mix(col, v3(S.cold), smoothstep(S.coldReach, 0, e).mul(S.coldK)).add(v3(D.ripple).mul(rip.mul(S.ripple)));
      // the specks GATHER where the deep's lights are (worlds.lit.deep: the light IS theirs), a few strays between
      pool = float(S.strays);
      for (const L of T.worlds.lit?.deep?.lights ?? []) {
        if (L.shaft) continue;   // (v150: a shaft of the surface's light is not the plankton's)
        const d = length(w.sub(vec2(L.frac[0] * hx, L.frac[1] * hz)));
        pool = max(pool, float(1).sub(smoothstep(L.r * S.poolR[0], L.r * S.poolR[1], d)));
      }
      col = col.add(v3(D.glow2).mul(pool.mul(pool).mul(S.poolGlow)));
    }
    // v146 (owner, 2026-11-11, of the deep and the core: "Both need more"): this is the BOTTOM OF THE SEA, and now it
    // is under water. (1) THE LIGHT FROM THE SURFACE, far above: what is left of the day comes down in slow broad
    // dapples that wander over the bed (`sun`: the caustic net, big and soft), brighter down the swept band.
    // (2) SOMETHING SWIMS OVER: the shadow of a great ray crosses the floor on its own slow round (`ray`), its wings
    // beating — the bed is somewhere things live above. (3) THE WATER GLOWS WHERE IT IS STIRRED (`stir`, read from
    // the simulation, render/water.js): whatever moves through it wakes the plankton — a trail behind every body, a
    // ring of light going out from every kill — blue-green sparks that fade in a second or two
    const Su = D.sun;
    if (Su) {
      const net = causticNet(w.add(vec2(t.mul(Su.drift[0]), t.mul(Su.drift[1]))), Su.net, t);
      // (v150: under a shaft the web is `shaft` × as bright again)
      let under = float(0);
      for (const L of T.worlds.lit?.deep?.lights ?? []) if (L.shaft) under = max(under, float(1).sub(smoothstep(L.r * 0.3, L.r * 1.3, length(w.sub(vec2(L.frac[0] * hx, L.frac[1] * hz))))));
      const sk = under.mul(Su.shaft ?? 0).add(1);
      col = col.mul(float(1).add(net.mul(Su.gain).mul(sk))).add(v3(Su.color).mul(net.mul(Su.add).mul(sk)));
    }
    const Ry = D.ray;
    if (Ry) {
      // its round: a slow figure over the floor; it heads the way it is going
      const ax = hx * Ry.round[0], az = hz * Ry.round[1], pa = t.mul(Ry.pace[0]).add(1), pb = t.mul(Ry.pace[1]);
      const at = vec2(sin(pa).mul(ax), sin(pb).mul(az)), vel = vec2(cos(pa).mul(ax * Ry.pace[0]), cos(pb).mul(az * Ry.pace[1])), hd = vel.div(max(length(vel), 1e-4));
      const d = w.sub(at), q = vec2(dot(d, hd), d.x.mul(hd.y).sub(d.y.mul(hd.x))).div(Ry.size);   // along its body, across it
      const beat = sin(t.mul(Ry.beat)).mul(0.1).add(1), ay = abs(q.y).div(beat), sw = q.x.add(ay.mul(0.42));   // wings swept back, beating
      const wings = float(1).sub(abs(sw).div(0.62).add(ay.div(1.25))), body = float(1).sub(q.x.div(0.8).pow2().add(q.y.div(0.26).pow2()));
      const tail = float(1).sub(abs(q.y).div(0.035)).min(float(1).sub(abs(q.x.add(1.25)).div(0.75)));
      const shade = smoothstep(-Ry.soft, Ry.soft, max(max(wings, body), tail.mul(0.5)));
      col = col.mul(float(1).sub(shade.mul(Ry.dark)));
    }
    // v150 (owner on v147: "Needs both" — more life, more light). LIGHT: where the shafts from the surface land
    // (scenery: sets/deep.js `shafts`, at the lights marked `shaft` in worlds.lit.deep) the caustic web is at its
    // brightest. LIFE: SHOALS of lantern fish over the bed — small bright bodies, each kind its own colour, size and
    // heading, swimming together in clouds that travel with them, weaving, their tails working; each fish throws a
    // shadow on the silt a little way off (they are ABOVE the bed, and that is what says so); and they part round
    // the hero. One hash a cell, and a cell with no fish in it costs no more
    const Sh = D.shoal;
    if (Sh) {
      const hw = toWorld(player), saa = max(length(fwidth(w)), 1e-4), dHero = length(w.sub(hw));
      const fishAt = (wq, K, ki) => {
        const dx = Math.cos(K.heading), dz = Math.sin(K.heading);
        const a0 = wq.x.mul(dx).add(wq.y.mul(dz)), c0 = wq.y.mul(dx).sub(wq.x.mul(dz));
        const fa = a0.sub(t.mul(K.swim)), fcx = c0.add(sin(a0.mul(K.weave[0]).add(t.mul(K.weave[1]))).mul(K.weave[2]));
        const fc = vec2(fa.div(K.cell[0]), fcx.div(K.cell[1])), fid = tfloor(fc), fh = hash(fid.add(11.3 + ki * 17.3)), fh2 = fract(fh.mul(37.7));
        const m = float(0).toVar();
        If(fh.greaterThan(1 - K.keep), () => {
          const q = fract(fc).sub(vec2(fh2.mul(0.5).add(0.25), fract(fh.mul(91.3)).mul(0.5).add(0.25))).mul(vec2(...K.cell));
          const len = fh2.mul(K.len[1] - K.len[0]).add(K.len[0]), s01 = q.x.div(len).add(0.5);   // 1 at its nose (it swims toward +a), 0 at its tail
          const back = float(1).sub(s01), bend = sin(t.mul(K.beat).add(fh.mul(30)).add(s01.mul(4))).mul(back.mul(back)).mul(len.mul(0.14));
          const y = abs(q.y.sub(bend));
          const body = sin(clamp(s01, 0, 1).pow(0.8).mul(3.1416)).mul(len.mul(K.girth)), tail = clamp(float(0.2).sub(s01).div(0.2), 0, 1).mul(len.mul(0.15));
          const wide = max(body, tail).mul(step(-0.02, s01)).mul(step(s01, 1));
          m.assign(float(1).sub(smoothstep(wide.sub(saa), wide.add(saa), y)).mul(step(0.001, wide)));
        });
        // the cloud it swims in, going the same way at the same pace
        const cloud = smoothstep(K.cloud[0], K.cloud[1], noise(vec2(fa.mul(K.cloudScale), c0.mul(K.cloudScale * 1.6)).add(ki * 9.7)));
        return m.mul(cloud);
      };
      for (const [ki, K] of Sh.kinds.entries()) {
        const shy = smoothstep(K.shy[0], K.shy[1], dHero);
        col = col.mul(float(1).sub(fishAt(w.add(vec2(...Sh.shadow)), K, ki).mul(shy).mul(Sh.shadowK)));
        col = mix(col, v3(K.color), fishAt(w, K, ki).mul(shy).mul(K.k));
      }
    }
    // v140: THINGS LIE ON THE SEABED. The ripples in the silt have a lit side and a dark one; and here and there, in
    // its own place and at its own angle, a starfish or a scallop's shell (`finds`: one cell in `keep` has one,
    // `stars` of those a starfish). A cell with nothing in it costs one hash
    const Fd = D.finds;
    if (Fd) {
      const ph = w.x.mul(0.9).add(noise(w.mul(0.3)).mul(6));
      col = col.mul(float(1).add(cos(ph).mul(Fd.relief)));
      const fc = w.div(Fd.cell), fid = tfloor(fc), fh = hash(fid.add(6.7)), fh2 = fract(fh.mul(37.7));
      const find = vec4(0).toVar(), faa = max(length(fwidth(w)), 1e-4);
      If(fh.greaterThan(1 - Fd.keep), () => {
        const q = fract(fc).sub(vec2(fh2.mul(0.5).add(0.25), fract(fh.mul(91.3)).mul(0.5).add(0.25))).mul(Fd.cell);
        const d = length(q), ang = atan(q.y, q.x).add(fh.mul(6.283));
        const isStar = fract(fh.mul(113.7)).lessThan(Fd.stars);
        // a starfish: five arms; a shell: a fan, ribbed, cut flat at its hinge
        const arm = abs(cos(ang.mul(2.5))).pow(1.6).mul(0.62).add(0.38).mul(Fd.star), inStar = float(1).sub(smoothstep(arm.sub(faa), arm.add(faa), d));
        const fan = q.x.mul(cos(fh.mul(6.283))).add(q.y.mul(sin(fh.mul(6.283)))), inShell = float(1).sub(smoothstep(float(Fd.shell).sub(faa), float(Fd.shell).add(faa), d)).mul(smoothstep(-0.04, 0.0, fan.add(Fd.shell * 0.35)));
        const ribs = cos(ang.mul(11)).mul(0.18).add(0.86);
        const starCol = mix(v3(Fd.starLo), v3(Fd.starHi), fh2).mul(float(1.25).sub(d.div(Fd.star).mul(0.5)));
        find.assign(select(isStar, vec4(starCol, inStar), vec4(v3(Fd.shellCol).mul(ribs).mul(fh2.mul(0.4).add(0.8)), inShell)));
      });
      col = mix(col, find.xyz, find.w.mul(Fd.k));
    }
    const cell = tfloor(w.mul(D.specks)), rnd = noise(cell.mul(1.31));
    const fp = fract(w.mul(D.specks)).sub(0.5), dot2 = length(fp);
    const tw = sin(t.mul(float(1.2).add(rnd.mul(2))).add(rnd.mul(40))).mul(0.5).add(0.5);
    const speck = smoothstep(S ? float(0.86).sub(pool.mul(0.22)) : float(0.86), S ? float(0.95).sub(pool.mul(0.2)) : float(0.95), rnd)
      .mul(float(1).sub(smoothstep(0.03, 0.14, dot2))).mul(tw).mul(S ? pool : float(1));
    col = col.add(mix(v3(D.glow), v3(D.glow2), S ? float(S.green) : smoothstep(0.9, 0.95, rnd)).mul(speck.mul(1.6)));
    let stirred = float(0);
    if (Wv) {
      const sv = slopeTex.sample(vec2(p.x, float(1).sub(p.y)));
      // sparks, not a wash: round points of light, one to a cell of a fine lattice and not in every cell, each where
      // it likes in its cell and twinkling on a beat of its own — lit as far as the water there was stirred
      // (two lattices, turned against each other and of different sizes, each spark anywhere in its cell and its own
      // size: one lattice, however jittered, showed its rows)
      const lat = (q, seed) => {
        const gc = tfloor(q), gr = hash(gc.add(seed)), gr2 = fract(gr.mul(41.3)), gd = length(fract(q).sub(vec2(gr2, fract(gr.mul(97.1))).mul(0.8).add(0.1)));
        const rr = gr2.mul(0.6).add(0.5).mul(Wv.dot);
        return float(1).sub(smoothstep(rr.mul(0.35), rr, gd)).mul(step(1 - Wv.keep, gr)).mul(sin(t.mul(gr2.mul(5).add(3)).add(gr.mul(40))).mul(0.4).add(0.6));
      };
      const spark = max(lat(vec2(w.x.mul(0.857).sub(w.y.mul(0.515)), w.x.mul(0.515).add(w.y.mul(0.857))).mul(Wv.grain), 2.9), lat(vec2(w.x.mul(0.6).add(w.y.mul(0.8)), w.y.mul(0.6).sub(w.x.mul(0.8))).mul(Wv.grain * 1.63), 7.3).mul(0.8));
      stirred = sv.w.mul(spark.mul(Wv.sparkK).add(Wv.haze));
      col = col.add(v3(Wv.color).mul(stirred));
    }
    return { col, mask: speck.add(rip.mul(0.15)).add(stirred), lineCol: v3(D.glow) };
  };
  // THE CORE: black, traced with circuitry; rings go out from the middle and
  // light the traces as they pass
  const core = (p, w) => {
    const K = W.core;
    if (K.tiles) {
      // v101: the approved picture's deck — dark tiles on a MAGENTA GRID, two disc PADS glowing on it and rings of
      // light washing out from them across the lines (the circuitry before it read as a maze, and the rings came
      // from nowhere in particular)
      const Tl = K.tiles, q = w.div(Tl.cell), f = abs(fract(q).sub(0.5)).mul(2), ed = max(f.x, f.y), aa = max(fwidth(ed), 1e-4);
      const line = smoothstep(float(1 - Tl.line).sub(aa), float(1 - Tl.line).add(aa), ed);
      const sheen = float(1).sub(ed).mul(0.25).add(noise(tfloor(q).mul(1.7)).mul(0.25)).add(0.75);   // each tile a shade of its own, lighter in its middle
      let col = v3(Tl.tile).mul(sheen), wash = float(0), pad = float(0), lit = float(0);
      // v147 (owner, 2026-11-11, of the deep and the core: "Both need more"): the deck is GLASS, and the machine is UNDER
      // it. Each pixel's view is followed down through the pane (as into the sewer's chute, v145) to two depths, so
      // what is below slides against the grid as the camera moves, the way things at a depth do. `rotor` m down, a
      // great ROTOR fills the shaft: rings of plate, each cut into segments and turning its own way round the middle
      // of the floor, dark against what is under them. `heart` m down, the HEART of the core: a body of light that
      // BEATS — twice, and a rest — with arcs standing off it; it is what the rings are seen against, and what
      // lights their edges. And each beat goes out through the deck: a ring of light along the grid's lines
      const Un = Tl.under;
      let beat = float(0), ringB = float(0), arcLive = float(0);
      if (Un) {
        const V = normalize(cameraPosition.sub(positionWorld)), run = V.xz.div(max(V.y, 0.3)).negate();   // the ray's run for a metre of fall
        const tb = fract(GEL_TIME.div(Un.period));
        beat = exp(tb.mul(tb).mul(-Un.sharp)).add(exp(tb.sub(Un.second).mul(tb.sub(Un.second)).mul(-Un.sharp)).mul(0.7));
        // the heart
        const wh = w.add(run.mul(Un.heart)), rh = length(wh), ah = atan(wh.y, wh.x);
        const arcs = smoothstep(0.55, 0.95, noise(vec2(ah.mul(Un.arcs), GEL_TIME.mul(Un.arcSpeed).add(rh.mul(0.25))))).mul(exp(rh.div(Un.heartR * 2.2).negate()));
        const body = exp(rh.mul(rh).div(Un.heartR * Un.heartR).negate()), halo = exp(rh.div(Un.heartR * Un.haloR).negate());
        const heart = v3(Un.hot).mul(body.mul(beat.mul(Un.beatK).add(1 - Un.beatK))).add(v3(Tl.glow).mul(halo.mul(Un.haloK).mul(beat.mul(0.5).add(0.5)).add(arcs.mul(Un.arcK))));
        // the rotor, over it
        const wr = w.add(run.mul(Un.rotor)), rr = length(wr), ar = atan(wr.y, wr.x), ri = tfloor(rr.div(Un.ringW)), rf = fract(rr.div(Un.ringW));
        const rh1 = hash(vec2(ri, 3.7)), dir = select(fract(ri.mul(0.5)).greaterThan(0.25), float(1), float(-1));
        // v150 (owner on v147: "Needs more"): the rotor is DRIVEN by the heart — it turns as before, and every beat
        // KICKS it on a step (`kick` of a segment, a smaller one on the second beat): a ratchet, not a fan
        const nb = tfloor(GEL_TIME.div(Un.period)), kicked = nb.mul(1.6).add(smoothstep(0, 0.1, tb)).add(smoothstep(Un.second, Un.second + 0.1, tb).mul(0.6));
        const segs = tfloor(ri.add(0.5).mul(Un.ringW * 6.2832 / Un.seg)).max(3), sq = fract(ar.div(6.2832).add(GEL_TIME.mul(dir).mul(rh1.mul(0.6).add(0.5)).mul(Un.turn).div(ri.add(1))).mul(segs).add(kicked.mul(dir).mul(Un.kick ?? 0)));
        const raa = max(fwidth(rr.div(Un.ringW)), 1e-4), saa = max(fwidth(ar.div(6.2832).mul(segs)), 1e-4);
        const plate = smoothstep(float(Un.gap).sub(raa), float(Un.gap).add(raa), min(rf, float(1).sub(rf))).mul(smoothstep(float(Un.cut).sub(saa), float(Un.cut).add(saa), min(sq, float(1).sub(sq))));
        const rib = smoothstep(0.42, 0.5, abs(fract(sq.mul(3)).sub(0.5))).mul(0.35), edgeL = float(1).sub(smoothstep(0, 0.12, min(min(rf, float(1).sub(rf)).sub(Un.gap), min(sq, float(1).sub(sq)).sub(Un.cut).mul(4)))).mul(plate);
        const lightUp = exp(rr.div(Un.heartR * Un.haloR * 1.3).negate()).mul(beat.mul(0.6).add(0.4));
        const metal = v3(Un.metal).mul(float(1).sub(rib)).add(v3(Tl.glow).mul(edgeL.mul(lightUp).mul(Un.edgeK)));
        // v150: between the rotor and the heart, the STATOR — `vanes.n` great vanes standing out from the middle,
        // `vanes.depth` m down, dark against the heart, so its light comes up between them in beams; a CONDUIT down
        // each one, and on every beat a charge runs out along it (`run` m/s, `len` of the way a pulse long)
        const Vn = Un.vanes;
        let below = heart;
        if (Vn) {
          const wv = w.add(run.mul(Vn.depth)), rv = length(wv), av = atan(wv.y, wv.x), vq = abs(fract(av.div(6.2832).mul(Vn.n).add(0.5)).sub(0.5)).mul(6.2832 / Vn.n).mul(rv);   // m off the vane's line
          const vaa = max(fwidth(vq), 1e-4), vane = float(1).sub(smoothstep(float(Vn.w).sub(vaa), float(Vn.w).add(vaa), vq)).mul(step(Vn.from, rv));
          const duct = float(1).sub(smoothstep(0, Vn.duct, vq)).mul(vane);
          const charge = smoothstep(1 - Vn.len, 1, fract(GEL_TIME.div(Un.period).sub(rv.div(Vn.run * Un.period)))).mul(exp(rv.div(Vn.reach).negate()));
          const vcol = v3(Vn.metal).mul(exp(rv.div(Un.heartR * Un.haloR).negate()).mul(beat.mul(0.5).add(0.5)).mul(Vn.lit).add(1)).add(v3(Tl.glow).mul(duct.mul(float(Vn.idle).add(charge.mul(Vn.k)))));
          below = mix(heart, vcol, vane);
        }
        const under = mix(below, metal, plate.mul(step(Un.hub, rr)));
        // through the glass: the pane takes its tint and keeps a little of its own sheen
        col = under.mul(v3(Un.glass)).add(col.mul(Un.pane));
        // the beat going out along the lines
        const rw = length(w), ph = fract(GEL_TIME.div(Un.period).sub(rw.div(Un.waveSpeed * Un.period)));
        ringB = smoothstep(1 - Un.waveLen, 1, ph).mul(exp(rw.div(Un.waveReach).negate()));
        // v150: THE BEAT HITS THE DECK. A second ring follows the first (the heart beats twice); the whole pane takes
        // a breath of the heart's light with each beat (`thump`, fading out from the middle); and for a moment after
        // it the grid near the heart is LIVE — arcs jumping along its lines, a different few each instant (`arc`)
        const ph2 = fract(GEL_TIME.div(Un.period).sub(Un.second).sub(rw.div(Un.waveSpeed * Un.period)));
        ringB = ringB.add(smoothstep(1 - Un.waveLen * 0.7, 1, ph2).mul(exp(rw.div(Un.waveReach).negate())).mul(0.6));
        if (Un.thump) col = col.add(v3(Tl.glow).mul(beat.mul(exp(rw.div(Un.thump.reach).negate())).mul(Un.thump.k)));
        if (Un.arc) {
          const Ac = Un.arc, live = exp(tb.mul(-Ac.fade)).add(exp(max(tb.sub(Un.second), 0).mul(-Ac.fade)).mul(step(Un.second, tb)).mul(0.6));
          const jump = step(1 - Ac.share, hash(tfloor(q.mul(2)).add(tfloor(GEL_TIME.mul(Ac.rate)).mul(vec2(7.3, 3.1)))));
          arcLive = jump.mul(live).mul(exp(rw.div(Ac.reach).negate())).mul(Ac.k);
        }
      }
      for (const P of Tl.pads) {
        const d = length(w.sub(vec2(P[0] * hx, P[1] * hz))), daa = max(fwidth(d), 1e-4);
        const disc = float(1).sub(smoothstep(float(Tl.padR).sub(daa), float(Tl.padR).add(daa), d));
        const rim = float(1).sub(smoothstep(0, 0.07, abs(d.sub(Tl.padR * 0.86)))).mul(disc);
        const ring = smoothstep(0.86, 1, fract(d.div(Tl.ringEvery).sub(GEL_TIME.mul(Tl.ringSpeed)))).mul(float(1).sub(smoothstep(Tl.padR, Tl.reach, d))).mul(step(Tl.padR, d));
        pad = max(pad, disc.mul(float(0.55).add(float(1).sub(d.div(Tl.padR)).mul(0.25))).add(rim.mul(0.6)));
        wash = max(wash, ring);
        lit = max(lit, float(1).sub(smoothstep(Tl.padR, Tl.reach * 0.6, d)));   // the pads light the floor round them
      }
      col = col.add(v3(Tl.glow).mul(lit.mul(lit).mul(Tl.halo)));
      // v140: the deck is a MACHINE's. Some tiles are VENTS (a block of slots, the core's light faint under them),
      // some carry a status LAMP that blinks on its own beat, and light RUNS along the grid's lines — packets, each
      // lane at its own speed, most lanes quiet. One hash a tile and one a lane
      let packet = float(0);
      if (Tl.vary) {
        const Vt = Tl.vary, tid = tfloor(q), th = hash(tid.add(4.3)), fq = fract(q).sub(0.5);
        const slot = float(1).sub(smoothstep(0.2, 0.3, abs(fract(fq.y.mul(Vt.slots)).sub(0.5)))).mul(step(abs(fq.x), 0.3)).mul(step(abs(fq.y), 0.32)).mul(step(th, Vt.vents));
        col = col.mul(float(1).sub(slot.mul(0.8))).add(v3(Tl.glow).mul(slot.mul(Vt.ventGlow)));
        const lamp = float(1).sub(smoothstep(0.035, 0.06, length(fq.sub(vec2(0.3, -0.3))))).mul(step(1 - Vt.lamps, th));
        const blink = step(0.5, fract(GEL_TIME.mul(fract(th.mul(31.7)).mul(0.6).add(0.3)).add(fract(th.mul(57.3)))));
        col = col.add(v3(Vt.lamp).mul(lamp.mul(blink.mul(0.85).add(0.15))));
        const horiz = f.y.greaterThan(f.x), run = select(horiz, q.x, q.y), lh = hash(vec2(select(horiz, round(q.y), round(q.x)), select(horiz, float(1.5), float(7.5))));
        const Pk = Vt.packet, ph = fract(run.div(Pk.every).sub(GEL_TIME.mul(Pk.speed).mul(lh.mul(0.8).add(0.6))).add(lh.mul(7)));
        packet = smoothstep(1 - Pk.len, 1, ph).mul(line).mul(step(1 - Pk.lanes, lh));
        col = col.add(v3(Pk.color).mul(packet.mul(Pk.gain)));
      }
      col = col.add(v3(Tl.line_).mul(line.mul(float(Tl.lineGlow).add(wash.mul(Tl.washGlow)).add(lit.mul(0.5)).add(ringB.mul(Un?.waveK ?? 0)).add(arcLive)))).add(v3(Tl.glow).mul(wash.mul(Tl.washFloor)));
      col = mix(col, v3(Tl.glow).mul(float(Tl.padGlow).add(ringB.mul(Un?.padKick ?? 0))), pad.min(1));   // (v150: a pad flares as a beat's ring crosses it)
      return { col, mask: line.add(pad), lineCol: v3(Tl.line_) };
    }
    const u = w.div(K.cell), f = fract(u).sub(0.5), id = tfloor(u);
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

  // v93 THE WORLD'S OWN LIGHT (TUNING.worlds.lit, docs/ENVIRONMENTS.md): what the floor is lit by, worked out
  // here because the floor is a picture. Every source is baked into this world's shader (the floor is rebuilt
  // with every world): E, the light falling on a point of the floor, multiplies its picture (Lambert on a flat
  // floor: the source's height over its distance, falling off over `r`), and a source the floor can mirror
  // adds its reflection where the half vector stands up (Blinn on a flat floor). Returns [lit colour, E].
  const WL = T.worlds.lit?.[style];
  const worldSources = () => {
    const out = [];
    for (const L of WL.lights ?? []) out.push({ x: L.frac[0] * hx, z: L.frac[1] * hz, ...L });
    if (WL.pools) {
      const sp = sewerSpots(T, hx, hz);
      sp.pools.forEach((q, i) => out.push({ x: sp.alongX ? q.a : q.c, z: sp.alongX ? q.c : q.a, ...WL.pools, flicker: [0.35, 0.06], seed: i * 1.7 }));
    }
    return out;
  };
  // v128 DAYLIGHT (the owner's golden-hour concept for the driveway): the floor lit by a low warm `sun` and a cool
  // `sky`, each as the light it throws on the slab (linear rgb, E = sky + sun × what of the sun reaches the point).
  // What blocks the sun takes the SUN away, not the light: the curb's band, the bodies' shadows (`bodies` of it,
  // and `contact` of all the light right under them), and the trees past the slab (scenery.js treeShade, v129)
  const canopy = (wp, D) => treeShade(wp, D.trees, hx, hz, W.concrete.sunShadow.cotMax);
  const worldLight = (col, wp, rip, S) => {
    if (!WL) return [col, null];
    if (WL.daylight) {
      const D = WL.daylight, vis = (S?.sunVis ?? float(1)).mul(float(1).sub(canopy(wp, D)));
      const sunE = v3(D.sun).mul(vis);
      return [col.mul(v3(D.sky).add(sunE)), v3(D.sky).add(sunE), sunE];
    }
    const V = normalize(cameraPosition.sub(positionWorld)), sh = WL.sheen;
    // v144: on simulated water a light's glint lies on whichever faces of the waves turn it to the eye
    const Nw = S?.ripSpec && rip ? normalize(vec3(rip.x.negate(), 1, rip.y.negate())) : null, nh = (Hv) => (Nw ? dot(Nw, Hv) : Hv.y);
    let E = vec3(WL.ambient ?? 1), spec = vec3(0), glow = vec3(0);
    const point = (x, z, L, fl) => {
      const d = vec3(x, L.h, z).sub(vec3(wp.x, 0, wp.y)), dist = length(d), Ld = d.div(dist);
      const fall = float(1).div(float(1).add(dot(d, d).div(L.r * L.r))).mul(float(1).sub(smoothstep(L.r * 1.6, L.r * 2.8, dist)));
      E = E.add(v3(L.color).mul(Ld.y.mul(fall).mul(L.k).mul(fl)));
      if (L.glow) glow = glow.add(v3(L.color).mul(fall.mul(L.k * L.glow).mul(fl)));
      if (sh && L.sheen !== false) spec = spec.add(v3(L.color).mul(pow(max(nh(normalize(Ld.add(V))), 0), float(L.shine ?? sh.shine)).mul(fall).mul(L.k * (L.sheenK ?? sh.k)).mul(fl)));
    };
    const flick = (L, seed) => (L.flicker ? float(1).add(sin(GEL_TIME.mul(L.flicker[0]).add(seed ?? 0)).mul(L.flicker[1])) : float(1));
    worldSources().forEach((L, i) => point(L.x, L.z, L, flick(L, L.seed ?? i * 2.3)));
    if (WL.grates) {
      // the boiler: the fire under the NEAREST grate (they stand on a lattice), breathing with it
      const G = WL.grates, g = W.boiler.grate, c = round(wp.div(g)).mul(g);
      // (v149: and swelling when its fire is blown — the stoke, kit.js)
      const Sk = W.boiler.stoke, sw = Sk && G.stoke ? stoke(Sk, c).mul(G.stoke).add(1) : float(1);
      point(c.x, c.y, G, float(1).add(sin(GEL_TIME.mul(G.flicker[0]).add(noise(c.mul(0.37)).mul(6))).mul(G.flicker[1])).mul(sw));
    }
    if (WL.fans) for (const Fa of WL.fans) {
      // v145: the light down a ventilation shaft, through the fan turning in it: wedges of light and of shadow going round
      const d = wp.sub(vec2(Fa.frac[0] * hx, Fa.frac[1] * hz)), r = length(d), q = fract(atan(d.y, d.x).div(6.2832).add(GEL_TIME.div(Fa.period)).mul(Fa.blades));
      const open = smoothstep(Fa.duty - Fa.soft, Fa.duty + Fa.soft, abs(q.sub(0.5)).mul(2)).mul(smoothstep(Fa.hub * 0.6, Fa.hub * 1.4, r));
      const fall = float(1).div(float(1).add(r.mul(r).div(Fa.r * Fa.r))).mul(float(1).sub(smoothstep(Fa.r * 1.3, Fa.r * 2.1, r)));
      E = E.add(v3(Fa.color).mul(open.mul(fall).mul(Fa.k)));
    }
    if (WL.rim) {
      // a band along the edge: all four sides, or the far side and the long ones (never the near side)
      const Rm = WL.rim, ex = float(hx).sub(abs(wp.x)), ez = Rm.sides === 'back' ? wp.y.add(hz) : float(hz).sub(abs(wp.y));
      let band = exp(min(ex, ez).max(0).div(Rm.w).negate());
      if (Rm.every) {
        // the lamps along it, a pool at each: along the far side x, along the long ones z
        const along = select(ex.lessThan(ez), wp.y, wp.x);
        band = band.mul(float(1 - Rm.depth).add(cos(along.div(Rm.every).mul(Math.PI * 2)).mul(0.5).add(0.5).mul(Rm.depth)));
      }
      E = E.add(v3(Rm.color).mul(band.mul(Rm.k)));
      if (Rm.glow) glow = glow.add(v3(Rm.color).mul(band.mul(Rm.k * Rm.glow)));
      if (Rm.sheen && Nw) {
        // v144: and the lamps' own glint on the waves — each side's row of them as the nearest point of a line of
        // light, `off` m out from the edge and `y` m up
        const Sh = Rm.sheen, Pw = vec3(wp.x, 0, wp.y);
        const lines = [vec3(wp.x, Sh.y, -(hz + Sh.off)), vec3(-(hx + Sh.off), Sh.y, wp.y), vec3(hx + Sh.off, Sh.y, wp.y)];
        if (Rm.sides !== 'back') lines.push(vec3(wp.x, Sh.y, hz + Sh.off));
        for (const at of lines) {
          const d = at.sub(Pw), dist = length(d), lamps = Rm.every ? float(1 - Rm.depth).add(cos(select(abs(d.x).lessThan(1e-3), wp.x, wp.y).div(Rm.every).mul(Math.PI * 2)).mul(0.5).add(0.5).mul(Rm.depth)) : float(1);
          spec = spec.add(v3(Rm.color).mul(pow(max(dot(Nw, normalize(d.div(dist).add(V))), 0), float(Sh.shine)).mul(Sh.k).mul(lamps).div(float(1).add(dist.mul(dist).div(Sh.r * Sh.r)))));
        }
      }
    }
    if (WL.sun) {
      // the sun's sheen on water and ice, broad
      const Sn = WL.sun, Ls = normalize(SUN_AT);
      spec = spec.add(v3(Sn.color).mul(pow(max(normalize(Ls.add(V)).y, 0), float(Sn.shine)).mul(Sn.k)));
      if (rip && Sn.glitter) {
        // v99: and its GLITTER — the same sun off the ripples' slopes the surface hands over: a tight lobe on a
        // tilted normal, so a sparkle lies only where the sun can reach the eye off a ripple
        const G = Sn.glitter, Nr = normalize(vec3(rip.x.negate(), 1, rip.y.negate()));
        spec = spec.add(v3(Sn.color).mul(min(pow(max(dot(Nr, normalize(Ls.add(V))), 0), float(G.shine)).mul(G.k), G.max)));
      }
    }
    if (S?.glintGate) spec = spec.mul(S.glintGate);
    return [col.mul(E).add(spec).add(glow), E];
  };

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
    let [out, E, sunE] = worldLight(S.col, w0, S.rip, S);   // v93: the world's own light falls on the picture before anything stands on it
    if (S.puddle) out = mix(out, S.puddle.col, S.puddle.m);   // v138: a puddle shows the sky, not the slab under it
    if (light) {
      // a shadow darkens what is under it; light lifts the floor a little and
      // its lines a lot, the way a lit surface shows its texture (wet stone
      // takes more of it: it mirrors the bullets' glow)
      // the map's camera looks straight down with the far edge at the top, so
      // its rows run the other way from the floor's v
      const L = texture(light, vec2(p.x, float(1).sub(p.y))), shade = clamp(L.a, 0, 1);
      let take = S.mask.mul(LF.grid).add(LF.spill);
      if (S.wet) take = take.add(S.wet.mul(W.sewer.wetLight));
      // v128: under DAYLIGHT a body's shadow is the sun taken away (and a little of everything right under it)
      if (sunE) out = out.sub(S.col.mul(sunE).mul(shade.mul(WL.daylight.bodies))).mul(float(1).sub(shade.mul(WL.daylight.contact))).add(L.rgb.mul(take));
      else out = out.mul(float(1).sub(shade)).add(L.rgb.mul(take));
      // the goo over the floor, before the hole and the walls: they cut it
      if (film) out = goo(out, L.rgb, vec2(p.x, float(1).sub(p.y)), E);
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

  // v73: on the driveway the grass is the limit — a shaped room's floor stops at its rail and
  // the lawn (scenery.js, drawn after the floor) shows past it, where the others show the dark
  // v142: and so do the river, the cistern and the ice — each set lays its ground under the whole floor (kit.js
  // groundPlane), so past a shaped room's edge there is the river's bank and stream, the cistern's dark water, the
  // snowfield, where the floor painted one flat colour (a river's disc sat in an olive square). The boiler and the
  // deep keep their dark: under a deck and past a reef the dark is what is there
  if (regionSdf && CUT_TO_GROUND.has(style)) { mat.opacityNode = Fn(() => step(regionSdf(toWorld(uv())), 0.09))(); mat.alphaTest = 0.5; }
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
    // the water's current surface (its textures swap every step)
    setWater(wk) { if (slopeTex) slopeTex.value = wk.slopeTexture; },
    dispose() {
      plane.geometry.dispose(); mat.dispose();
      border.geometry.dispose(); border.material.dispose();
    },
  };
}
