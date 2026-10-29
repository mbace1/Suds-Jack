// kettle.js — how KETTLE looks: the gel dome in hot iron, an iron lid on top
// that rattles as the pressure builds (the sim's s.p) and a spout turned at
// you; red-hot while it stalls (s.hot). The boss ring under it.
import { auraBuild, auraUpdate, auraReset } from './bossaura.js?v=61';

export default {
  build(ctx) {
    const { THREE, S } = ctx;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    const body = new THREE.Mesh(ctx.geo.blob, mat);
    const iron = new THREE.MeshStandardNodeMaterial({ color: S.look.lid, metalness: 0.7, roughness: 0.45 });
    const lid = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.12, 24), iron);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), iron);
    knob.position.y = 0.12; lid.add(disc, knob);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.7, 12), iron);
    spout.geometry.rotateX(Math.PI / 2 - 0.5); spout.geometry.translate(0, 0, 0.3);
    const extras = new THREE.Group(); extras.add(lid, spout);
    return { body, mat, lid, spout, extras, extrasIn: false, top0: 1 + ctx.T.blob.domeCut, ...auraBuild(ctx) };
  },

  update(v, g, w, time) {
    if (!v.extrasIn) { v.root.add(v.extras); v.extrasIn = true; }
    const s = g.s, top = v.body.scale.y * v.top0 * v.squash.scale.y;
    const rattle = s.state === 'build' ? (s.p || 0) ** 3 : s.state === 'vent' ? 1 : 0;
    v.lid.position.y = top * 0.92 + rattle * 0.12 * Math.abs(Math.sin(time * 38));
    v.lid.rotation.z = rattle * 0.08 * Math.sin(time * 31);
    v.lid.scale.setScalar(g.r * 0.8);
    v.spout.position.set(0, top * 0.45, g.r * 0.8);
    v.spout.scale.setScalar(g.r * 0.9);
    v.extras.rotation.y = Math.atan2(g.faceX || 0, g.faceZ || 1);
    if (s.hot && g.flash <= 0) v.mat.emissive.setHex(v.S.look.hot).multiplyScalar(0.55 + 0.35 * Math.sin(time * 9));
    auraUpdate(v, g, time);
  },

  reset(v) { auraReset(v); },
};
