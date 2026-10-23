// glowa.js — how GLOWA looks: a dark gel, nearly the colour of THE DEEP,
// holding out a lure — a bright bead on a thin stalk — where the sim says it
// is (g.s.lx, lz). The lure brightens as it tells, and the body flushes.
export default {
  build(ctx) {
    const { THREE, S } = ctx;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    // the shared gel lifts a dark colour and lets light through; this one is
    // meant to be hard to see, so it keeps its own dark and stays opaque-ish
    mat.color.setHex(S.color); mat.transmission = 0.12; mat.sheenColor.setHex(0x1a2a48);
    // and the contrast system's rim and inner glow (which keep every other
    // dark gel readable) are turned down to a thin cold edge
    mat.gel.rim.value *= 0.3; mat.gel.sss.value *= 0.25; mat.gel.rimColor.value.setHex(0x3a5a90); mat.gel.sssColor.value.setHex(0x1a2a48);
    const body = new THREE.Mesh(ctx.geo.blob, mat);
    const lureMat = new THREE.MeshBasicMaterial({ color: S.lure.glow });
    const lure = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), lureMat);
    const stalkMat = new THREE.LineBasicMaterial({ color: 0x3a5a88, transparent: true, opacity: 0.7 });
    const stalk = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]), stalkMat);
    return { body, mat, lure, lureMat, stalk, added: false };
  },

  update(v, g, w, time) {
    if (!v.added) { v.root.add(v.lure, v.stalk); v.added = true; }
    const s = g.s, rp = v.root.position;
    const lx = (s.lx ?? g.x) - rp.x, lz = (s.lz ?? g.z) - rp.z, y = 0.9 + 0.12 * Math.sin(time * 2.3 + g.id);
    v.lure.position.set(lx, y, lz);
    const k = g.tell > 0 ? 1.6 + Math.sin(time * 40) * 0.4 : 1 + 0.25 * Math.sin(time * 3 + g.id);
    v.lure.scale.setScalar(k);
    const p = v.stalk.geometry.attributes.position;
    p.setXYZ(0, 0, g.r * 0.9, 0); p.setXYZ(1, lx, y, lz); p.needsUpdate = true;
  },

  reset(v) { v.lure.scale.setScalar(1); },
};
