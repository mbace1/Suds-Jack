// cloaker.js — how CLOAKER looks: 1.x's plain satin gel dome (a 1.x
// BLOB_TYPE with the default silhouette, enemy.js:644-648, 803-806), ice
// blue 0x66ddee, shaped by the core as every plain blob is — the squash
// spring, the breath, the smear it drags along the floor — and made
// TRANSPARENT at birth, as 1.x made it (enemy.js:1206 "shimmer needs live
// opacity"), so its opacity is the one thing this look drives:
//
//   visible   full presence, opacity 1
//   cloak     a faint shimmer, 0.14 + 0.05·sin(9·clock) (enemy.js:1860)
//   decloak   fading back in linearly, 0.14 + 0.86·k over 0.6 s (enemy.js:1871),
//             strobing a teal glow 0x226677 / black on sin(24·clock) — the
//             tell v143 meant and 1.x overwrote in the same frame
//             (enemy.js:1872, 2689; tuning `look.strobe`, false = 1.x as it
//             drew). The hit flash and a VOLATILE body's smoulder outrank it.
//   burst     snapped to full, the glow off (enemy.js:1874-1875)
// read from the sim's g.cloak (0 full … 1 at the floor) and g.s.drew (the
// branch that drew this step), on the body's own clock (1.x `_wobbleT`: a
// random start, then time). A cloaked body is still hittable; its ripple and
// hit flash show through the shimmer, as 1.x's did ("rewards watching for
// ripples", v143).
//
// THE DEATH: the core stops updating a dying view, so the body fades itself
// as it is drawn, as 1.x's updateDeath faded every body (1 − t)²·0.82 over
// the 0.28 s pop (enemy.js:2983-2984) — a CLOAKER shot dead mid-shimmer pops
// back into view and fades out with the swell. (1.x also turned depth writes
// off for the pop, enemy.js:3022; a WebGPU pipeline change mid-fight is a
// compile stall, so the port keeps them on.)
//
// Numbers: js/tuning/species/cloaker.js `look`. Contract: docs/SIM_CONTRACT.md.
export default {
  build(ctx) {
    const { THREE, S, T, geo } = ctx, L = S.look;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    mat.transparent = true;                               // enemy.js:1206
    mat.opacity = 1;
    const body = new THREE.Mesh(geo.blob, mat);
    // the pop: no look hook runs for a dying view, so the body fades itself
    body.onBeforeRender = () => {
      const v = body.userData.view;
      if (v && v.dyingT > 0) mat.opacity = deathOpacity(L, T.blob.death, v.dyingT);
    };
    return { body, mat, clock0: rand(L.clockStart[0], L.clockStart[1]) };
  },

  update(v, g, w, time) {
    const L = v.S.look, s = g.s, clock = time + v.clock0;
    v.body.userData.view = v;
    v.mat.opacity = opacity(L, g.cloak, s.drew, clock);
    if (L.strobe && s.drew === 'decloak' && g.flash <= 0 && g.affix !== 'volatile') {
      v.mat.emissive.setHex(Math.sin(clock * L.strobeRate) > 0 ? L.strobeOn : L.strobeOff);
    }
  },

  // a pooled view comes back in full view, on a fresh clock
  reset(v) { v.mat.opacity = 1; v.clock0 = rand(v.S.look.clockStart[0], v.S.look.clockStart[1]); },
};

// what 1.x's _setOpacity calls drew this step: the floor-to-full ramp the sim
// reports as g.cloak (0 full, 1 at the floor), plus the shimmer while the
// cloak branch drew (enemy.js:1860, 1871, 1874)
export function opacity(L, cloak, drew, clock) {
  const base = 1 - (cloak || 0) * (1 - L.floor);
  return drew === 'cloak' ? base + L.shimmer * Math.sin(clock * L.shimmerRate) : base;
}

// 1.x updateDeath (enemy.js:2970-2971, 2983-2984): t runs 0 → 1 over the pop
export function deathOpacity(L, life, dyingT) {
  const t = 1 - Math.max(dyingT, 0) / life;
  return Math.pow(1 - t, L.deathFadePow) * L.deathOpacity;
}

const rand = (a, b) => a + Math.random() * (b - a);
