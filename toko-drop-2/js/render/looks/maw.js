// maw.js — how MAW looks: WORMA's worm (a bulge under the floor; up, a head
// and its segments arching back into the stone), five segments long, with a
// dark ring of a mouth on its head and the boss ring under it.
import worma from './worma.js?v=65';
import { auraBuild, auraUpdate, auraReset } from './bossaura.js?v=65';

export default {
  build(ctx) {
    const { THREE } = ctx, v = worma.build(ctx);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.16, 8, 20), new THREE.MeshStandardNodeMaterial({ color: 0x3a0a1c, roughness: 0.6 }));
    v.segs[0].add(mouth);
    mouth.position.set(0, 0.55, 0.62); mouth.rotation.x = -0.5;
    return { ...v, mouth, ...auraBuild(ctx) };
  },

  update(v, g, w, time, grow) {
    worma.update(v, g, w, time, grow);
    v.mouth.visible = (g.s.up || 0) > 0.05;
    auraUpdate(v, g, time);
  },

  reset(v) { worma.reset(v); auraReset(v); },
};
