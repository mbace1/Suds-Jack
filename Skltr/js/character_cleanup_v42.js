import * as THREE from 'three';
import { Bunny } from './shared.js?v=12';

// SKLTR v42 — final silhouette cleanup while preserving the authored v31 motion chain.
// The inherited rabbit face/tail are suppressed. Bunny ears exist only as an occasional accessory.
const baseUpdate=Bunny.prototype.update;
function edgeObj(geo,color=0xe8f7ff){const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0x070912}),l=new THREE.LineBasicMaterial({color});g.add(new THREE.Mesh(geo,m),new THREE.LineSegments(new THREE.EdgesGeometry(geo),l));return g}
function clean(b){
  if(b._v42Clean)return;b._v42Clean=true;
  const toko=b._tokoFace?.group;
  for(const child of [...b.head.children])if(child!==toko)child.visible=false;
  for(const child of b.body.children||[])if((child.position?.z||0)>.58)child.visible=false;
  const mask=edgeObj(new THREE.BoxGeometry(.38,.42,.28));mask.position.set(0,.02,-.02);b.head.add(mask);b._v42Mask=mask;
  if(toko){toko.visible=true;toko.position.z=-.175;b.head.add(toko)}
  const chestPlate=edgeObj(new THREE.BoxGeometry(.68,.18,.34),0xbfeeff);chestPlate.position.set(0,.18,-.03);b.chest.add(chestPlate);
  const belt=edgeObj(new THREE.BoxGeometry(.48,.08,.32),0xffd34d);belt.position.set(0,-.36,0);b.chest.add(belt);
  const q=new URLSearchParams(location.search),forced=q.get('ears');const wear=forced==='1'||(forced!=='0'&&Math.random()<.24);
  if(wear){for(const x of [-.12,.12]){const ear=edgeObj(new THREE.BoxGeometry(.075,.42,.07),0xffd34d);ear.position.set(x,.39,.04);ear.rotation.z=x<0?.12:-.12;b.head.add(ear)}}
}
Bunny.prototype.update=function(dt,state={}){const out=baseUpdate.call(this,dt,state);clean(this);if(this._v42Mask){this._v42Mask.rotation.z*=.84;this._v42Mask.rotation.x*=.9}return out};
