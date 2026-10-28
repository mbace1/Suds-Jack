// pike.js — how PIKE looks: a long gel, low and pointed along its heading,
// with a tail fin that beats faster as it charges; while it lines up, its lane
// is lit on the floor out to the wall it will hit (the sim's s.lx, lz), and
// the boss ring is under it.
import { auraBuild, auraUpdate, auraReset } from './bossaura.js?v=58';

export default {
  build(ctx) {
    const { THREE, S } = ctx, L = S.look;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    const fish = new THREE.Mesh(ctx.geo.blob, mat);
    const finMat = new THREE.MeshStandardNodeMaterial({ color: L.fin, roughness: 0.5 });
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4), finMat);
    fin.geometry.rotateX(Math.PI / 2); fin.geometry.scale(1.2, 0.25, 1);
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 4), finMat);
    const body = new THREE.Group(); body.add(fish, fin, dorsal);
    const laneMat = new THREE.MeshBasicNodeMaterial({ color: L.lane, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), laneMat);
    lane.renderOrder = 2;
    return { body, mat, fish, fin, dorsal, lane, laneMat, laneIn: false, own: true, yaw: 0, ...auraBuild(ctx) };
  },

  update(v, g, w, time, grow) {
    const s = g.s, L = v.S.look, r = g.r * grow;
    if (!v.laneIn) { v.root.add(v.lane); v.laneIn = true; }
    // undo the squash group: the parts carry their own shape
    const rq = Math.sqrt(g.sq); v.body.scale.set(rq, 1 / g.sq, rq);
    const fx = g.faceX || 0, fz = g.faceZ || 1;
    if (Math.hypot(fx, fz) > 1e-3) v.yaw = Math.atan2(fx, fz);
    v.body.rotation.y = v.yaw;
    const charging = s.state === 'charge';
    const thin = charging ? 0.85 : 1;
    v.fish.scale.set(r * 0.72 * thin, r * L.height * g.sq, r * L.length / thin);
    v.fish.position.set(0, 0, 0);
    const beat = Math.sin(time * (charging ? 30 : 9) + g.id) * (charging ? 0.5 : 0.3);
    v.fin.position.set(0, r * 0.35, -r * L.length * 0.95);
    v.fin.rotation.y = beat;
    v.fin.scale.setScalar(r);
    v.dorsal.position.set(0, r * L.height * 0.95 * g.sq, -r * 0.2);
    v.dorsal.scale.setScalar(r);
    // the lane, while it lines up
    const on = s.state === 'aim';
    v.lane.visible = on;
    if (on) {
      const rp = v.root.position, dx = s.lx - rp.x, dz = s.lz - rp.z, len = Math.hypot(dx, dz);
      v.lane.position.set(0, 0.03, 0);
      v.lane.rotation.y = Math.atan2(dx, dz);
      v.lane.scale.set(r * 1.6, 1, Math.max(0.1, len));
      v.laneMat.opacity = (0.18 + 0.32 * g.tell) * (0.7 + 0.3 * Math.sin(time * 24));
    }
    auraUpdate(v, g, time);
  },

  reset(v) { v.yaw = 0; v.lane.visible = false; auraReset(v); },
};
