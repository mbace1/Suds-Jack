// bossaura.js — the ring 1.x hung under every boss (main.js:1967-1982,
// 10569-10584; OMEGA's look draws its own), for the worlds' own bosses (v45):
// a flat additive ring on the floor, 1.7 × the boss's radius out and 0.82 of
// that in, gold breathing at 5 rad/s; red and swelling once it rages
// (g.s.enraged, sim/species/bosskit.js). A body that is not a boss has none.
let GEO = null;

export function auraBuild(ctx) {
  const { THREE } = ctx;
  GEO ||= new THREE.RingGeometry(0.82, 1, 40);
  const mat = new THREE.MeshBasicNodeMaterial({ color: 0xffcc33, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(GEO, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  return { auraRing: ring, auraMat: mat, auraIn: false };
}

// y: how high the view's root stands off the floor (a hop), so the ring stays down
export function auraUpdate(v, g, time, y = 0) {
  if (!v.auraIn) { v.root.add(v.auraRing); v.auraIn = true; }
  v.auraRing.visible = !!g.isBoss;
  if (!g.isBoss) return;
  const mad = !!g.s.enraged;
  v.auraMat.opacity = 0.45 + 0.3 * Math.sin(time * 5);
  v.auraMat.color.setHex(mad ? 0xff2200 : 0xffcc33);
  const k = mad ? 1.15 + 0.1 * Math.sin(time * 20) : 1;
  v.auraRing.scale.setScalar(g.r * 1.7 * k);
  v.auraRing.position.y = 0.04 - y;
}

export function auraReset(v) { v.auraRing.visible = false; }
