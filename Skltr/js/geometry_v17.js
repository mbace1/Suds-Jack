import * as THREE from 'three';
import { Player } from './player.js?v=12';
import { Enemy } from './enemy.js?v=12';

const BOXES=[
[-31,-22,12,.7,2.2],[-31,-8,12,.7,2.2],[-38,-15,2.2,.7,12],[-24,-15,2.2,.7,12],[-31,-29,7,1,5],[-31,-1,7,1,5],
[18,-19,9,1,6],[27,-12,10,1.8,7],[17,-5,8,2.6,6],[8,-12,2.2,1.35,10],[31,-22,5,.8,9],[7,-23,7,1.2,5],
[-10,20,7,1,7],[-2,27,7,2,7],[7,22,7,3,7],[13,31,6,4,6],[-15,31,5,1.6,5],[3,36,5,2.6,5],
[24,24,8,1.4,8],[-20,34,9,1.8,7],[1,39,5,.8,13]
];
function geoHeight(x,z){let h=-Infinity;for(const [cx,cz,w,top,d] of BOXES)if(x>=cx-w/2&&x<=cx+w/2&&z>=cz-d/2&&z<=cz+d/2)h=Math.max(h,top);return h;}
function wrapHeight(native){return(x,z)=>Math.max(native(x,z),geoHeight(x,z));}

export function buildCombatGeometry(scene){
 if(scene.getObjectByName('SKLTR_V28_GEOMETRY'))return;
 const root=new THREE.Group();root.name='SKLTR_V28_GEOMETRY';scene.add(root);
 const mat=new THREE.MeshStandardMaterial({color:0x263449,emissive:0x07121f,roughness:.78,metalness:.22});
 const edgeMat=new THREE.LineBasicMaterial({color:0x72d9ff,transparent:true,opacity:.42});
 for(const [x,z,w,h,d] of BOXES){const g=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(g,mat);m.position.set(x,h*.5,z);root.add(m);const e=new THREE.LineSegments(new THREE.EdgesGeometry(g),edgeMat);e.position.copy(m.position);root.add(e);}
}
const pUpdate=Player.prototype.update;
Player.prototype.update=function(dt,input,aim,enemies,heightAt,...rest){return pUpdate.call(this,dt,input,aim,enemies,wrapHeight(heightAt||(()=>0)),...rest)};
const eUpdate=Enemy.prototype.update;
Enemy.prototype.update=function(dt,player,pool,heightAt,...rest){return eUpdate.call(this,dt,player,pool,wrapHeight(heightAt||(()=>0)),...rest)};
const originalAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){const result=originalAdd.apply(this,objects);if(this.isScene&&!this.getObjectByName('SKLTR_V28_GEOMETRY')){THREE.Scene.prototype.add=originalAdd;queueMicrotask(()=>buildCombatGeometry(this));}return result;};
window._skltrGeometry={boxes:BOXES,heightAt:geoHeight};
