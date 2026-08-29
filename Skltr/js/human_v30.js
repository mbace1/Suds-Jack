import * as THREE from 'three';
import { Bunny, FILL_MAT, C, lerp } from './shared.js?v=12';

// SKLTR v30.1 — presentation-only humanisation layer.
// Keeps Player movement/physics untouched and reuses the existing articulated rig.
const originalUpdate = Bunny.prototype.update;

function edged(parent, geo, pos, edge, rot=null) {
  const m = new THREE.Mesh(geo, FILL_MAT); m.position.copy(pos); if(rot) m.rotation.set(rot.x||0,rot.y||0,rot.z||0); parent.add(m);
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 5), edge); l.position.copy(pos); if(rot) l.rotation.copy(m.rotation); parent.add(l);
  return {m,l};
}
function orb(parent, r, pos, edge) {
  const g = new THREE.SphereGeometry(r,10,7); return edged(parent,g,pos,edge);
}
function enhance(b) {
  if (b._humanV30) return; b._humanV30 = true;
  for (const ear of b.ears || []) ear.visible = false;
  if (b.head) {
    b.head.scale.set(0.92,1.08,0.92);
    edged(b.head,new THREE.BoxGeometry(.18,.11,.12),new THREE.Vector3(0,-.13,-.13),b.edge);
    edged(b.head,new THREE.BoxGeometry(.055,.09,.07),new THREE.Vector3(0,.015,-.205),b.edge);
    orb(b.head,.035,new THREE.Vector3(-.075,.035,-.205),b.edge);
    orb(b.head,.035,new THREE.Vector3(.075,.035,-.205),b.edge);
  }
  edged(b.chest,new THREE.CylinderGeometry(.075,.085,.14,8),new THREE.Vector3(0,.46,0),b.edge);
  edged(b.chest,new THREE.BoxGeometry(.42,.045,.16),new THREE.Vector3(0,.30,0),b.edge);
  edged(b.chest,new THREE.BoxGeometry(.22,.17,.15),new THREE.Vector3(0,-.10,0),b.edge);
  for (const x of [-.24,.24]) orb(b.chest,.09,new THREE.Vector3(x,.35,0),b.edge);
  for (const arm of [b.armLU,b.armRU]) orb(arm.tip,.065,new THREE.Vector3(0,0,0),b.edge);
  for (const leg of [b.legL,b.legR]) {
    orb(leg.thigh.tip,.075,new THREE.Vector3(0,0,0),b.edge);
    edged(leg.foot,new THREE.BoxGeometry(.12,.055,.16),new THREE.Vector3(0,-.015,.11),b.edge);
  }
  edged(b.chest,new THREE.BoxGeometry(.16,.28,.08),new THREE.Vector3(0,.13,.14),b.edge);
  b._humanLand = 0; b._humanPrevAir = false; b._humanRun = 0; b._humanDash = 0;
}

Bunny.prototype.update = function(dt, state={}) {
  enhance(this);
  originalUpdate.call(this, dt, state);
  const speed = state.speed || 0, air = !!state.airborne, dash = !!state.dashing, vy = state.vy || 0;
  const run = Math.min(1, speed / 8.5);
  this._humanRun += dt * (6.5 + speed * 1.05);
  this._humanDash = lerp(this._humanDash, dash ? 1 : 0, Math.min(1,dt*18));
  if (this._humanPrevAir && !air) this._humanLand = 1;
  this._humanPrevAir = air; this._humanLand = Math.max(0,this._humanLand-dt*7);
  const cyc = Math.sin(this._humanRun), cyc2 = Math.sin(this._humanRun + Math.PI);

  if (!air && !dash && run > .08) {
    this.body.rotation.y = lerp(this.body.rotation.y, cyc * .055 * run, dt*12);
    this.chest.rotation.y = lerp(this.chest.rotation.y, -cyc * .11 * run, dt*12);
    this.chest.rotation.z = lerp(this.chest.rotation.z, -cyc * .035 * run, dt*10);
    this.chest.rotation.x = lerp(this.chest.rotation.x, .07 * run, dt*10);
    this.body.position.y += Math.abs(Math.sin(this._humanRun*2)) * .025 * run;
    this.head.rotation.z = lerp(this.head.rotation.z, cyc * .018 * run, dt*9);
    this.head.rotation.x = lerp(this.head.rotation.x, -.035 * run, dt*9);
    this.legL.foot.rotation.x = lerp(this.legL.foot.rotation.x, -cyc * .18, dt*14);
    this.legR.foot.rotation.x = lerp(this.legR.foot.rotation.x, -cyc2 * .18, dt*14);
  }

  if (air) {
    const rising = vy > 1.5;
    const hip = rising ? -.42 : .24, knee = rising ? .76 : .48;
    this.legL.thigh.pivot.rotation.x = lerp(this.legL.thigh.pivot.rotation.x, hip, dt*11);
    this.legR.thigh.pivot.rotation.x = lerp(this.legR.thigh.pivot.rotation.x, hip*.72, dt*11);
    this.legL.shin.pivot.rotation.x = lerp(this.legL.shin.pivot.rotation.x, knee, dt*12);
    this.legR.shin.pivot.rotation.x = lerp(this.legR.shin.pivot.rotation.x, knee*.85, dt*12);
    this.chest.rotation.x = lerp(this.chest.rotation.x, rising ? .11 : -.06, dt*9);
    this.head.rotation.x = lerp(this.head.rotation.x, rising ? -.07 : .04, dt*9);
  }

  if (dash) {
    this.chest.rotation.x = lerp(this.chest.rotation.x,.34,dt*20);
    this.head.rotation.x = lerp(this.head.rotation.x,-.18,dt*18);
    this.armLU.pivot.rotation.x = lerp(this.armLU.pivot.rotation.x,.55,dt*20);
    this.armRU.pivot.rotation.x = lerp(this.armRU.pivot.rotation.x,-.18,dt*20);
    this.legL.thigh.pivot.rotation.x = lerp(this.legL.thigh.pivot.rotation.x,.58,dt*20);
    this.legR.thigh.pivot.rotation.x = lerp(this.legR.thigh.pivot.rotation.x,-.48,dt*20);
    this.body.rotation.z = lerp(this.body.rotation.z,.04*Math.sin(this._humanRun),dt*18);
  }

  if (this._humanLand > 0) {
    const k=this._humanLand;
    this.chest.rotation.x -= .12*k;
    this.head.rotation.x += .06*k;
    this.legL.thigh.pivot.rotation.x += .24*k; this.legR.thigh.pivot.rotation.x += .24*k;
    this.legL.shin.pivot.rotation.x += .34*k; this.legR.shin.pivot.rotation.x += .34*k;
  }
};
