// curbking.js — how CURB KING looks: HOPPA's look (the dome up in the air on
// its hop, the landing marked on the floor while it squats and flies), with a
// gold crown riding on its head and the boss ring under it.
import hoppa from './hoppa.js?v=48';
import { auraBuild, auraUpdate, auraReset } from './bossaura.js?v=48';

export default {
  build(ctx) {
    const { THREE, S } = ctx, v = hoppa.build(ctx);
    const crownMat = new THREE.MeshStandardNodeMaterial({ color: S.look.crown, metalness: 0.5, roughness: 0.35, emissive: S.look.crown, emissiveIntensity: 0.55 });
    const crown = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.16, 20, 1, true), crownMat);
    crown.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 6), crownMat);
      spike.position.set(Math.cos(a) * 0.42, 0.22, Math.sin(a) * 0.42);
      crown.add(spike);
    }
    return { ...v, crown, crownIn: false, top0: 1 + ctx.T.blob.domeCut, ...auraBuild(ctx) };
  },

  update(v, g, w, time, grow) {
    hoppa.update(v, g, w, time, grow);
    if (!v.crownIn) { v.root.add(v.crown); v.crownIn = true; }
    // the crown sits on the dome's top, wherever its squash has put it
    const r = g.r * grow;
    v.crown.position.y = v.body.scale.y * v.top0 * v.squash.scale.y + 0.05 * r;
    v.crown.scale.setScalar(r * 1.15);
    v.crown.rotation.y = time * 0.6;
    auraUpdate(v, g, time, g.s.y || 0);
  },

  reset(v) { hoppa.reset(v); auraReset(v); },
};
