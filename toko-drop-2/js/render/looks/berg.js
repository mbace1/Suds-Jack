// berg.js — how BERG looks: the rounded cube in ice, turning slowly about
// its own axis as it slides; frosting white as it tells (the sim's g.tell)
// before it fires its icicles. The boss ring under it.
import { auraBuild, auraUpdate, auraReset } from './bossaura.js?v=50';

export default {
  build(ctx) {
    const { THREE, S } = ctx;
    const mat = ctx.gelMaterial(S.color, 'cube', 1);
    const body = new THREE.Mesh(ctx.geo.cube, mat);
    return { body, mat, spin: 0, ...auraBuild(ctx) };
  },

  update(v, g, w, time) {
    const s = g.s;
    v.spin += (s.state === 'slide' ? 0.6 : 0.05) * (1 / 60);
    v.body.rotation.y += v.spin;
    if (g.tell > 0 && g.flash <= 0) v.mat.emissive.setHex(v.S.look.frost).multiplyScalar(0.25 + 0.5 * g.tell);
    auraUpdate(v, g, time);
  },

  reset(v) { v.spin = 0; auraReset(v); },
};
