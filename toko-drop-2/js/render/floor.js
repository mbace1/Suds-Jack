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
import { Fn, uv, uniform, float, abs, fract, min, max, sin, cos, length, smoothstep, mix, fwidth, texture, clamp, vec2, vec3, pow, floor as tfloor, select } from 'three/tsl';
import { GEL_TIME } from './gel.js?v=20';
import { noise } from './scenery.js?v=20';

// `light` (optional) is the arena's light map (render/light.js): its rgb is
// light thrown on the floor, its alpha the shadow of what stands on it.
// `bounds`: SURVIVAL's floor changes size (sim/reshape.js). It is built at
// its biggest; `bounds.cur` (half sizes) is where the walls are now, and
// the rest is the void. While `bounds.warn` is up the floor lights where it
// is about to change, as Sektori's does: cyan where floor is coming, red
// where it is going.
export function buildFloor(T, hx, hz, light, { style = 'grid', bounds: hasBounds = false } = {}) {
  const F = T.floor, LF = T.light.arena.floor;
  const group = new THREE.Group();

  const player = uniform(new THREE.Vector2(0.5, 0.5));   // the hero, in floor uv
  const gridX = uniform((hx * 2) / F.gridCell), gridZ = uniform((hz * 2) / F.gridCell);
  const base = uniform(new THREE.Color(F.base)), gridLo = uniform(new THREE.Color(F.gridLo)), gridHi = uniform(new THREE.Color(F.gridHi));
  // The start intro (intro/intro.js) lets the floor RUN OUT of the drop that
  // lands on it: outside `revealR` (world units from `revealAt`) the floor is
  // the void, and a bright front rides the edge with the grid lit up behind
  // it. At rest revealR is huge and the front is off, so play is unchanged.
  // A droplet landing in a new world reveals that world's floor the same way.
  const revealAt = uniform(new THREE.Vector2(0, 0)), revealR = uniform(1e4), revealFront = uniform(0);
  const voidCol = uniform(new THREE.Color(T.render.clearColor)), frontCol = uniform(new THREE.Color(style === 'grid' ? 0x5f8cff : style === 'concrete' ? 0xffd9a0 : 0x7fd8d0));
  // the drain's swirl
  const swirl = uniform(0), swirlAt = uniform(new THREE.Vector2(0, 0)), swirlR = uniform(8), hole = uniform(0);
  const holeRim = uniform(new THREE.Color(style === 'grid' ? 0x2fe0ff : style === 'concrete' ? 0x9fd6ff : 0x6fffe0));
  const W = T.worlds.floor;
  const bounds = hasBounds ? { cur: uniform(new THREE.Vector2(hx, hz)), next: uniform(new THREE.Vector2(hx, hz)), warn: uniform(0) } : null;
  const comeCol = uniform(new THREE.Color(0x40e8ff)), goCol = uniform(new THREE.Color(0xff3040));

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

  const surface = style === 'concrete' ? concrete : style === 'sewer' ? sewer : grid;

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
  border.visible = style === 'grid';
  group.add(border);

  // what the camera must hold: the floor and its rail
  const arena = new THREE.Box3(new THREE.Vector3(-hx, 0, -hz), new THREE.Vector3(hx, F.railHeight, hz));

  return {
    group, arena, border, style, bounds,
    reveal: { at: revealAt, r: revealR, front: revealFront, void: voidCol },
    swirl: { k: swirl, at: swirlAt, r: swirlR, hole },
    // the light pool follows the hero (world x, z → floor uv)
    setPlayer(x, z) { player.value.set((x + hx) / (2 * hx), (hz - z) / (2 * hz)); },
    dispose() {
      plane.geometry.dispose(); mat.dispose();
      border.geometry.dispose(); border.material.dispose();
    },
  };
}
