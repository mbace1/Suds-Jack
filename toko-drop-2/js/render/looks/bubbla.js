// bubbla.js — how BUBBLA looks: a small gel inside a clear bubble. The
// bubble thins with each hit it takes (g.s.shell), wobbles when struck, and
// is gone while popped; the gel inside is the species' own dome. The bubble
// is all rim (a fresnel: clear face-on, bright at the edge, with a soap-film
// shift of hue round it) — a flat disc of grey read as a lid, not a bubble.
export default {
  build(ctx) {
    const { THREE, S } = ctx;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    const inner = new THREE.Mesh(ctx.geo.blob, mat);
    const { TSL } = ctx;
    const shellMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const strength = TSL.uniform(1);
    const rim = TSL.float(1).sub(TSL.abs(TSL.dot(TSL.normalView, TSL.positionViewDirection))).pow(2.4);
    // the film's colours: cyan at the rim turning to violet and gold as it thins
    shellMat.colorNode = TSL.mix(TSL.vec3(0.75, 0.95, 1.0), TSL.vec3(1.0, 0.8, 1.0), TSL.sin(rim.mul(9)).mul(0.5).add(0.5));
    shellMat.opacityNode = TSL.float(0.04).add(rim.mul(0.85)).mul(strength);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), shellMat);
    shell.renderOrder = 3;
    const body = new THREE.Group();
    body.add(inner, shell);
    return { body, mat, inner, shell, shellMat, strength };
  },

  update(v, g, w, time) {
    const S = v.S, L = S.look, s = g.s, k = Math.max(0, s.shell ?? S.shell) / S.shell;
    v.inner.scale.setScalar(L.inner);
    v.inner.position.y = 0.25;
    v.shell.visible = k > 0;
    const wob = 1 + 0.06 * Math.sin(time * 9 + g.id) * (g.flash > 0 ? 3 : 1);
    v.shell.scale.set(L.shell * wob, L.shell * (2 - wob) * 0.92, L.shell * wob);
    v.shell.position.y = 0.55;
    v.strength.value = 0.35 + 0.65 * k;   // thinner with every hit
  },

  reset(v) { v.shell.visible = true; v.strength.value = 1; },
};
