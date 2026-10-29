// challenge.js — what a campaign room asks, drawn (sim/challenge.js): the
// HOLD ring and how full it is, the heart a PROTECT room keeps and what it has
// left, a COLLECT room's orbs, and under an ORDER room's lit body the ring
// that says it is the one that can be hurt. Reads w.ch and nothing else; the
// gates are pickups.js's, a moving floor is floor.js's.
import * as THREE from 'three/webgpu';
import { TUNING } from '../tuning.js?v=62';

const V = TUNING.campaign.view;
const flat = (g) => g.rotateX(-Math.PI / 2);
const glow = (color, opacity = 1) => new THREE.MeshBasicNodeMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

export class ChallengeView {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    // HOLD: the ring, and a disc inside it that grows as it fills
    this.zoneRing = new THREE.Mesh(flat(new THREE.RingGeometry(0.92, 1, 64)), glow(V.zone));
    this.zoneFill = new THREE.Mesh(flat(new THREE.CircleGeometry(1, 48)), glow(V.zone, 0.22));
    this.zoneRing.position.y = 0.04; this.zoneFill.position.y = 0.03; this.zoneRing.renderOrder = this.zoneFill.renderOrder = 1;
    // PROTECT: the heart, and an arc round it of what it has left
    this.heart = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshPhysicalNodeMaterial({ color: V.heart, emissive: V.heart, emissiveIntensity: 0.6, roughness: 0.25, clearcoat: 1 }));
    this.heartArc = new THREE.Mesh(flat(new THREE.RingGeometry(1.25, 1.45, 48, 1, 0, Math.PI * 2)), glow(V.heart));
    this.heartArc.position.y = 0.05; this.heartArc.renderOrder = 1; this.arcAt = 1;
    // ORDER: a ring under the lit body
    this.lit = new THREE.Mesh(flat(new THREE.RingGeometry(1.1, 1.35, 40)), glow(V.lit));
    this.lit.position.y = 0.05; this.lit.renderOrder = 1;
    // COLLECT: the orbs
    this.orbGeo = new THREE.SphereGeometry(V.orb.r, 16, 12);
    this.orbMat = new THREE.MeshBasicNodeMaterial({ color: V.orb.color });
    this.orbHalo = new THREE.RingGeometry(V.orb.r * 1.6, V.orb.r * 2.1, 32);
    this.orbs = [];
    this.group.add(this.zoneRing, this.zoneFill, this.heart, this.heartArc, this.lit);
    this.reset();
  }

  reset() {
    for (const o of this.group.children) o.visible = false;
    for (const o of this.orbs) { this.group.remove(o); o.children[0].material.dispose(); }
    this.orbs = []; this.arcAt = 1;
  }

  sync(w, alpha, time) {
    const ch = w?.ch;
    if (!ch) { if (this.group.children.some((o) => o.visible)) this.reset(); return; }
    // HOLD
    const Z = ch.zone;
    this.zoneRing.visible = this.zoneFill.visible = !!Z;
    if (Z) {
      const k = Math.min(1, Z.fill / ch.goal.need), pulse = Z.inside ? 1 + 0.05 * Math.sin(time * 12) : 1;
      this.zoneRing.position.set(Z.x, 0.04, Z.z); this.zoneRing.scale.setScalar(Z.r * pulse);
      this.zoneFill.position.set(Z.x, 0.03, Z.z); this.zoneFill.scale.setScalar(Math.max(0.01, Z.r * k));
      this.zoneRing.material.opacity = Z.inside ? 1 : 0.55;
      this.zoneFill.material.opacity = Z.inside ? 0.35 : 0.18;
    }
    // PROTECT
    const H = ch.heart;
    this.heart.visible = this.heartArc.visible = !!H && H.hp > 0;
    if (H && H.hp > 0) {
      const beat = 1 + 0.08 * Math.max(0, Math.sin(time * 6)) ** 8;
      this.heart.position.set(H.x, H.r * 0.7, H.z); this.heart.scale.setScalar(H.r * 0.7 * beat);
      const k = H.hp / H.max;
      if (Math.abs(k - this.arcAt) > 1e-6) {
        this.arcAt = k;
        this.heartArc.geometry.dispose();
        this.heartArc.geometry = flat(new THREE.RingGeometry(1.25, 1.45, 48, 1, Math.PI / 2, Math.PI * 2 * k));
      }
      this.heartArc.position.set(H.x, 0.05, H.z); this.heartArc.scale.setScalar(H.r);
    }
    // ORDER
    let lit = null;
    if (ch.goal.type === 'order') for (const g of w.gels) if (g.alive && g.order != null && !g.locked) { lit = g; break; }
    this.lit.visible = !!lit;
    if (lit) {
      const x = lit.px + (lit.x - lit.px) * alpha, z = lit.pz + (lit.z - lit.pz) * alpha;
      this.lit.position.set(x, 0.05, z); this.lit.scale.setScalar(lit.r * (1 + 0.08 * Math.sin(time * 10)));
    }
    // COLLECT
    if (ch.orbs) {
      while (this.orbs.length < ch.orbs.length) {
        const o = new THREE.Group(), core = new THREE.Mesh(this.orbGeo, this.orbMat);
        const halo = new THREE.Mesh(flat(this.orbHalo.clone()), glow(V.orb.color, 0.6));
        halo.position.y = -V.orb.y + 0.04;
        o.add(halo, core); o.visible = false; this.orbs.push(o); this.group.add(o);
      }
      ch.orbs.forEach((s, i) => {
        const o = this.orbs[i];
        o.visible = s.out && !s.taken && !s.lost;
        if (o.visible) {
          o.position.set(s.x, V.orb.y + 0.12 * Math.sin(time * 3 + i), s.z); o.children[1].scale.setScalar(1 + 0.15 * Math.sin(time * 7 + i));
          // an orb with a life: its halo closes in as the time runs out, and flickers at the end
          const left = s.life ? Math.max(0, 1 - (ch.t - s.t) / s.life) : 1;
          o.children[0].scale.setScalar(s.life ? 0.35 + 0.65 * left : 1);
          if (s.life && left < 0.25) o.visible = Math.sin(time * 30) > -0.3;
        }
      });
    }
  }
}
