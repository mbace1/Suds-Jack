import * as THREE from 'three';
import { Bunny } from './shared.js?v=12';

// SKLTR v51 — final silhouette layer on the existing authored motion rig.
// Rabbit anatomy stays suppressed; ears are an explicit optional costume accessory.
const baseUpdate=Bunny.prototype.update;
function outlined(geo,edge=0xc8f6ff,fill=0x070912){const g=new THREE.Group();g.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:fill})));g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:edge})));return g}
function build(b){if(b._v51)return;b._v51=true;
  const toko=b._tokoFace?.group;
  for(const c of [...b.head.children])c.visible=(c===toko);
  for(const c of b.body.children||[])if((c.position?.z||0)>.5)c.visible=false;
  const shell=outlined(new THREE.BoxGeometry(.44,.50,.30),0xe9fbff);shell.position.set(0,.015,-.005);b.head.add(shell);
  if(toko){toko.visible=true;toko.position.set(0,.01,-.171);toko.scale.setScalar(.70);b.head.add(toko)}
  const shoulder=outlined(new THREE.BoxGeometry(.78,.13,.38),0x9bfff0);shoulder.position.set(0,.28,-.02);b.chest.add(shoulder);
  const bib=outlined(new THREE.BoxGeometry(.42,.34,.06),0xffd34d);bib.position.set(0,.03,-.20);b.chest.add(bib);
  const belt=outlined(new THREE.BoxGeometry(.50,.075,.33),0xffd34d);belt.position.set(0,-.35,0);b.chest.add(belt);
  const q=new URLSearchParams(location.search),forced=q.get('ears');const wear=forced==='1'||(forced!=='0'&&Math.random()<.20);
  if(wear){for(const x of [-.13,.13]){const ear=outlined(new THREE.BoxGeometry(.07,.38,.065),0xffd34d);ear.position.set(x,.43,.02);ear.rotation.z=x<0?.10:-.10;b.head.add(ear)}}
}
Bunny.prototype.update=function(dt,state={}){const out=baseUpdate.call(this,dt,state);build(this);return out};
