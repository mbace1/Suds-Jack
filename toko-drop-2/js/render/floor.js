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
import { Fn, If, uv, uniform, float, abs, fract, min, max, sin, cos, length, smoothstep, step, mix, fwidth, texture, clamp, vec2, vec3, pow, floor as tfloor, round, select, mod, dFdx, dFdy, exp, normalize, dot, cameraPosition, positionWorld, vec4 } from 'three/tsl';
import { pickStyle, grainAt } from './style.js?v=120';
import { SUN_AT } from './sun.js?v=120';
import { GEL_TIME } from './gel.js?v=120';
import { noise, grate, cells, sewerSpots } from './scenery.js?v=120';
import { lilyPads, DRIFT, hash } from './kit.js?v=120';

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
    col = col.mul(float(1).sub(crack.mul(C.crackDepth)));
    // the storm drain (v65), set in the slab toward the far right corner: an iron
    // frame round rows of slots (the slots below, past the flood: no light
    // reaches the bottom of a drain)
    const G = C.grate, g = grate(w.sub(vec2(hx - G.at[0], -hz + G.at[1])).div(G.r));
    col = mix(col, mix(vec3(...G.iron), vec3(...G.frame), g.z), g.x);
    // the curb's shade on the slab along it: the far side and the two long
    // ones, none at the open near side (v66)
    const toCurb = min(float(hx).sub(abs(w.x)), w.y.add(hz));
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
    col = col.mul(float(1).sub(sunShade.mul(SS.depth)));
    // the sun, a little warmer toward the far end (it was the garage's flood at night)
    const flood = smoothstep(float(hz * 2.2), float(-hz * 0.2), w.y.add(hz)).mul(C.flood);
    col = mix(col.mul(float(C.ambient).add(flood)).add(vec3(...C.floodTint).mul(flood.mul(0.06))), vec3(...G.slot), g.y);
    const pool = float(1).sub(smoothstep(0, F.poolRadius * 0.6, length(p.sub(player))));
    return { col: col.add(col.mul(pool).mul(C.pool)), mask: groove.add(lip.mul(0.5)).add(crack.mul(float(1).sub(g.x)).mul(0.3)).add(g.z.mul(0.4)), lineCol: vec3(...C.lip) };
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
    // v78: puddles standing in the hollows (they were a darkening): the stone dark
    // and the vault's dim teal reflected in them, a bright meniscus at the rim
    const PD = S.puddle, pd = puddles(w, PD), wet = pd.mask;
    stone = mix(stone, mix(stone.mul(PD.dark), vec3(...PD.sky), PD.reflect), wet).add(vec3(...PD.rimCol).mul(pd.rim.mul(PD.rim)));
    stone = mix(stone, vec3(...S.groutCol), grout.mul(float(1).sub(wet.mul(0.7))));
    // v78: the channel's water is murky and RUNS (it wore the cistern's net): streaks
    // stretched along the flow, foam along the kerbs, flecks going by
    const flow = a.sub(GEL_TIME.mul(S.flow)), M = S.murk;
    const st = streaks(a, c, S.flow, M.stretch, M.scale);
    const foamLine = smoothstep(S.channel / 2 - M.foamW, S.channel / 2 - 0.02, abs(c)).mul(smoothstep(0.45, 0.75, noise(vec2(flow.mul(0.8), c.mul(6)))));
    const flecks = smoothstep(0.82, 0.9, noise(vec2(flow.mul(1.6), c.mul(2.2)).add(7.7)));
    const rip = smoothstep(0.55, 0.85, st).mul(0.7).add(foamLine).add(flecks.mul(0.6));
    const water = mix(vec3(...S.water), vec3(...S.waterHi), st.mul(M.lift)).add(vec3(...M.foam).mul(foamLine.mul(0.5).add(flecks.mul(0.35))));
    let col = mix(stone, water, inCh);
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
  const cistern = (p, w) => {
    const C = W.cistern;
    const u = w.div(C.slab), f = fract(u), g = min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y))).mul(C.slab);
    const aa = max(fwidth(g), 1e-4), grout = float(1).sub(smoothstep(float(C.grout).sub(aa), float(C.grout).add(aa), g));
    const tone = noise(tfloor(u).mul(1.7)).mul(0.5).add(noise(w.mul(2.2)).mul(0.2)).add(0.55);
    let stone = v3(C.stone).mul(tone);
    stone = mix(stone, stone.mul(0.45), grout);
    const t = GEL_TIME;
    // v97: the caustic NETWORK the approved picture shows — light focused by the moving surface into thin bright
    // cells over the slabs — from a domain-warped field (four warps of sines, the classic water caustic), brightest
    // in the roof shaft's pool and fainter elsewhere; v71's contour squiggles read as noise over everything
    const N = C.net, caustic = causticNet(w, N, t);
    const lt = T.worlds.lit?.cistern?.lights ?? [], key = lt.find((l) => l.caustics) ?? lt[0], pool = key ? float(1).div(float(1).add(dot(w.sub(vec2(key.frac[0] * hx, key.frac[1] * hz)), w.sub(vec2(key.frac[0] * hx, key.frac[1] * hz))).div(key.r * key.r))) : float(1);
    // the column bases: a square plinth every `column` m, its edge catching the light
    const q = fract(w.div(C.column).add(0.5)).sub(0.5).mul(C.column), dq = max(abs(q.x), abs(q.y));
    const plinth = float(1).sub(smoothstep(C.plinth - 0.03, C.plinth + 0.03, dq));
    const rim = float(1).sub(smoothstep(0, 0.07, abs(dq.sub(C.plinth))));
    let col = mix(stone, v3(C.water), C.depth).add(v3(C.caustic).mul(caustic.mul(N.gain).mul(mix(float(N.inPool), float(1), pool))));
    col = mix(col, v3(C.stone).mul(0.35), plinth.mul(C.plinthK ?? 1)).add(v3(C.rim).mul(rim.mul(0.5 * (C.plinthK ?? 1))));
    // v71: in each plinth the cut top of a fallen column, a round stone disc
    // with a groove round it, under the same water
    const dr = length(q), sr = C.plinth * C.stump, saa = max(fwidth(dr), 1e-4);
    const stump = float(1).sub(smoothstep(float(sr).sub(saa), float(sr).add(saa), dr));
    const sgroove = float(1).sub(smoothstep(0, 0.045, abs(dr.sub(sr * 0.7))));
    col = mix(col, v3(C.stumpTone).mul(noise(w.mul(4.3)).mul(0.35).add(0.75)).mul(float(1).sub(sgroove.mul(0.45))), stump.mul(0.85 * (C.plinthK ?? 1)));
    // v71: drip rings: in every `drip.cell` m a drip from the vault every
    // `period` s, somewhere of its own, its rings spreading as they fade
    const D = C.drip, cell = tfloor(w.div(D.cell));
    const dph = noise(cell), dpos = cell.add(vec2(noise(cell.add(vec2(17, 3))), noise(cell.add(vec2(5, 29)))).mul(0.6).add(0.2)).mul(D.cell);
    const dk = fract(t.div(D.period).add(dph)), dd = length(w.sub(dpos)), daa = max(fwidth(dd), 1e-4);
    const drip = float(1).sub(smoothstep(float(D.width).sub(daa), float(D.width).add(daa), abs(dd.sub(dk.mul(D.reach)))))
      .add(float(1).sub(smoothstep(float(D.width).sub(daa), float(D.width).add(daa), abs(dd.sub(dk.mul(D.reach * 0.55))))).mul(0.6))
      .mul(float(1).sub(dk).pow(2));
    col = col.add(v3(C.caustic).mul(drip.mul(D.gain)));
    return { col, mask: min(caustic, 1).mul(0.6).add(grout.mul(0.3)).add(rim.mul(C.plinthK ?? 1)).add(drip), lineCol: v3(C.caustic), wet: float(0.8) };
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
    const fireCol = mix(v3(B.glow), v3(G.core), heat.mul(heat)).mul(pulse.mul(0.5).add(0.5)).mul(heat.mul(0.6).add(0.55));
    const fire = hole.mul(pulse);
    const frame = inG.mul(float(1).sub(inner)), bars = inner.mul(float(1).sub(hole));
    col = mix(col, v3(G.steel), frame.add(bars).min(1));   // the frame and the bars, dark iron
    col = col.add(v3(B.glow).mul(bars.mul(heat).mul(G.barGlow))).add(v3(B.glow).mul(frame.mul(G.frameGlow)));   // lit from the fire under them
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
  const river = (p, w) => {
    const R = W.river, a = along(w), c = across(w), half = hx >= hz ? hz : hx, U = R.run, t = GEL_TIME;
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
      const cn = causticNet(vec2(a.sub(t.mul(R.flow * B.drift)), c), B.net, t);
      bed = rock.add(v3(B.caustic).mul(cn.mul(B.net.gain)));
    } else {
      const peb = noise(w.mul(2.8)).mul(0.6).add(noise(w.mul(7.1)).mul(0.4));
      rock = v3(R.pebble).mul(peb.mul(0.8).add(0.45)); bed = rock;
    }
    let col = mix(v3(R.water), v3(R.waterHi), smoothstep(0.35, 0.8, st).mul(U.lift).mul(depth.mul(0.6).add(0.4)));
    col = mix(col, v3(U.deep), depth.mul(U.deepK));
    col = mix(mix(bed, col, U.shallowTint), col, depth);
    // v72: lily pads near the banks, drifting the way the current rule pushes (kit.js DRIFT)
    const Pd = T.scenery.river.pads, lp = lilyPads(w.sub(DRIFT), Pd.cell, Pd.keep);
    const near = smoothstep(half * 0.42, half * 0.52, ac).mul(smoothstep(bankAt, bankAt.sub(half * 0.06), ac));
    col = mix(col, mix(v3(Pd.lo), v3(Pd.hi), lp.y), lp.x.mul(near)).add(v3(Pd.flower).mul(lp.z.mul(near)));
    const bank = smoothstep(bankAt, bankAt.add(half * 0.08), ac);
    const foam = float(1).sub(smoothstep(0, 0.45, abs(ac.sub(bankAt)))).mul(smoothstep(0.4, 0.7, noise(vec2(flow.mul(1.5), c.mul(4)))));
    const flecks = (R.flecks ?? 1) > 0 ? smoothstep(0.86, 0.93, noise(vec2(flow.mul(2.2), c.mul(1.4)).add(4.4))).mul(depth) : float(0);   // v99: none (the glitter is the sparkle now)
    col = mix(col, rock.mul(B?.dry ?? 1), bank).add(v3(R.foam).mul(foam.mul(R.foamK ?? 0.4).add(flecks.mul(0.5 * (R.flecks ?? 1)))));
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
    return { col, mask: smoothstep(0.5, 0.85, st).mul(float(1).sub(bank)).mul(0.6).add(foam).add(flecks), lineCol: v3(R.waterHi), wet: float(1).sub(bank), rip };
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
    const e = min(float(hx).sub(abs(w.x)), float(hz).sub(abs(w.y)));
    col = col.add(v3(I.frost).mul(smoothstep(I.edgeFrost, 0, e).mul(noise(w.mul(5.3)).mul(0.6).add(0.4)).mul(I.edgeFrostGain)));
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
    return { col, mask: min(crack, 1).mul(I.lines), lineCol: v3(I.crack), wet: float(0.6) };
  };
  // THE DEEP: black silt in slow ripples, lit only by what lives in it
  const deep = (p, w) => {
    const D = W.deep, t = GEL_TIME, S = D.bed;
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
        const d = length(w.sub(vec2(L.frac[0] * hx, L.frac[1] * hz)));
        pool = max(pool, float(1).sub(smoothstep(L.r * S.poolR[0], L.r * S.poolR[1], d)));
      }
      col = col.add(v3(D.glow2).mul(pool.mul(pool).mul(S.poolGlow)));
    }
    const cell = tfloor(w.mul(D.specks)), rnd = noise(cell.mul(1.31));
    const fp = fract(w.mul(D.specks)).sub(0.5), dot2 = length(fp);
    const tw = sin(t.mul(float(1.2).add(rnd.mul(2))).add(rnd.mul(40))).mul(0.5).add(0.5);
    const speck = smoothstep(S ? float(0.86).sub(pool.mul(0.22)) : float(0.86), S ? float(0.95).sub(pool.mul(0.2)) : float(0.95), rnd)
      .mul(float(1).sub(smoothstep(0.03, 0.14, dot2))).mul(tw).mul(S ? pool : float(1));
    col = col.add(mix(v3(D.glow), v3(D.glow2), S ? float(S.green) : smoothstep(0.9, 0.95, rnd)).mul(speck.mul(1.6)));
    return { col, mask: speck.add(rip.mul(0.15)), lineCol: v3(D.glow) };
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
      col = col.add(v3(Tl.line_).mul(line.mul(float(Tl.lineGlow).add(wash.mul(Tl.washGlow)).add(lit.mul(0.5))))).add(v3(Tl.glow).mul(wash.mul(Tl.washFloor)));
      col = mix(col, v3(Tl.glow).mul(Tl.padGlow), pad.min(1));
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
  const worldLight = (col, wp, rip) => {
    if (!WL) return [col, null];
    const V = normalize(cameraPosition.sub(positionWorld)), sh = WL.sheen;
    let E = vec3(WL.ambient ?? 1), spec = vec3(0), glow = vec3(0);
    const point = (x, z, L, fl) => {
      const d = vec3(x, L.h, z).sub(vec3(wp.x, 0, wp.y)), dist = length(d), Ld = d.div(dist);
      const fall = float(1).div(float(1).add(dot(d, d).div(L.r * L.r))).mul(float(1).sub(smoothstep(L.r * 1.6, L.r * 2.8, dist)));
      E = E.add(v3(L.color).mul(Ld.y.mul(fall).mul(L.k).mul(fl)));
      if (L.glow) glow = glow.add(v3(L.color).mul(fall.mul(L.k * L.glow).mul(fl)));
      if (sh && L.sheen !== false) spec = spec.add(v3(L.color).mul(pow(max(normalize(Ld.add(V)).y, 0), float(sh.shine)).mul(fall).mul(L.k * sh.k).mul(fl)));
    };
    const flick = (L, seed) => (L.flicker ? float(1).add(sin(GEL_TIME.mul(L.flicker[0]).add(seed ?? 0)).mul(L.flicker[1])) : float(1));
    worldSources().forEach((L, i) => point(L.x, L.z, L, flick(L, L.seed ?? i * 2.3)));
    if (WL.grates) {
      // the boiler: the fire under the NEAREST grate (they stand on a lattice), breathing with it
      const G = WL.grates, g = W.boiler.grate, c = round(wp.div(g)).mul(g);
      point(c.x, c.y, G, float(1).add(sin(GEL_TIME.mul(G.flicker[0]).add(noise(c.mul(0.37)).mul(6))).mul(G.flicker[1])));
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
    let [out, E] = worldLight(S.col, w0, S.rip);   // v93: the world's own light falls on the picture before anything stands on it
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
  if (regionSdf && style === 'concrete') { mat.opacityNode = Fn(() => step(regionSdf(toWorld(uv())), 0.09))(); mat.alphaTest = 0.5; }
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
