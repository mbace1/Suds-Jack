// hoppa.js — how HOPPA looks: the plain gel dome, shaped the default way, up
// in the air on its hop (the sim's g.s.y), and while it squats and flies a
// ring on the floor where it is going to land — the hop's tell, so a hop is
// something you can step out of rather than a coin toss.
export default {
  build(ctx) {
    const { THREE, S } = ctx;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    const body = new THREE.Mesh(ctx.geo.blob, mat);
    const markMat = new THREE.MeshBasicMaterial({ color: S.color, transparent: true, opacity: 0, depthWrite: false });
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.78, 1, 32).rotateX(-Math.PI / 2), markMat);
    marker.renderOrder = 2;
    return { body, mat, marker, markMat, markerAdded: false };
  },

  update(v, g, w, time) {
    const s = g.s, L = v.S.look;
    if (!v.markerAdded) { v.root.add(v.marker); v.markerAdded = true; }
    v.root.position.y = s.y || 0;
    // tall at the top of the climb, round again coming down
    const up = Math.max(0, Math.min(1, (s.y || 0) / v.S.height));
    v.squash.scale.y *= 1 + up * L.stretch;
    const on = s.state === 'crouch' || s.state === 'hop';
    const k = s.state === 'crouch' ? g.tell : 1;
    v.markMat.opacity = on ? 0.35 + 0.45 * k * (0.6 + 0.4 * Math.sin(time * 22)) : 0;
    v.marker.visible = on;
    // the mark is on the floor, in the world, wherever the body is
    v.marker.position.set(s.tx - v.root.position.x, 0.03 - v.root.position.y, s.tz - v.root.position.z);
    v.marker.scale.setScalar(g.r * L.marker * (on ? 1.6 - 0.6 * k : 1));
  },

  reset(v) { v.marker.visible = false; v.markMat.opacity = 0; },
};
