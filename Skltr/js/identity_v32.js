import * as THREE from 'three';
import { Bunny, C } from './shared.js?v=12';

// SKLTR v32 — player identity layer.
// Exact Toko expression geometry: two arch eyes, U nose, broad U mouth.
// Face is always present; FLOW progressively boldens it without changing expression.
const baseUpdate = Bunny.prototype.update;

function curve(points, mat) {
  const c = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)), false, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(c, 20, .012, 6, false), mat);
}
function addToko(b) {
  if (b._tokoFace) return;
  const mat = new THREE.MeshBasicMaterial({color:0xffc400});
  const face = new THREE.Group(); face.position.set(0,.01,-.235); face.rotation.y=Math.PI; face.scale.setScalar(.72); b.head.add(face);
  const arch=(x)=>curve([[x-.065,0,0],[x-.055,.075,0],[x,.105,0],[x+.055,.075,0],[x+.065,0,0]],mat);
  const eyeL=arch(-.085), eyeR=arch(.085); face.add(eyeL,eyeR);
  const nose=curve([[-.045,-.035,0],[-.035,-.095,0],[0,-.115,0],[.035,-.095,0],[.045,-.035,0]],mat); face.add(nose);
  const mouth=curve([[-.125,-.075,0],[-.105,-.18,0],[0,-.245,0],[.105,-.18,0],[.125,-.075,0]],mat); face.add(mouth);
  b._tokoFace={group:face, parts:[eyeL,eyeR,nose,mouth]};

  // Suppress the inherited rabbit read. Ears remain an occasional accessory, not anatomy.
  for(const ear of b.ears||[]) ear.visible=false;
  // Abstract arcade proportions: larger head, compact torso, bigger extremities.
  b.head.scale.set(1.08,1.02,.9);
  b.chest.scale.set(1.08,.94,.9);
  b.body.scale.x*=1.03;
}

Bunny.prototype.update=function(dt,state={}){
  addToko(this);
  baseUpdate.call(this,dt,state);
  addToko(this);
  const flow=Math.max(0,Math.min(1,(state.accent||0)/3));
  // Slow bolding: geometry remains exact, only stroke thickness/visual weight increases.
  this._tokoBold=this._tokoBold==null?0:this._tokoBold;
  this._tokoBold += (flow-this._tokoBold)*Math.min(1,dt*2.2);
  const s=1+this._tokoBold*.38;
  for(const p of this._tokoFace.parts) p.scale.set(s,s,1);
  this._tokoFace.group.position.z=-.235-.004*this._tokoBold;
};
