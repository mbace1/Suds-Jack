import * as THREE from 'three';

// SKLTR v141-v144 — boss patterns now have arenas designed around their movement asks.
// Geometry is sparse, BVH-backed and leaves multiple escape routes; no decorative walls
// that bullets ignore. Built lazily when a boss actually attacks.
let scene=null,active='',builds=0;const MAT=()=>new THREE.MeshStandardMaterial({color:0x221012,roughness:.72,metalness:.22});
const oldAdd=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...o){const r=oldAdd.apply(this,o);if(this.isScene&&!scene)scene=this;return r};
function solid(root,x,z,w,h,d,ry=0,low=false){const g=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(g,MAT());m.position.set(x,h*.5,z);m.rotation.y=ry;m.castShadow=m.receiveShadow=true;m.userData.skltrHeroSolid=1;if(low)m.userData.skltrJumpRail=1;root.add(m);const e=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:0xff8c72,transparent:true,opacity:.42}));e.position.copy(m.position);e.rotation.copy(m.rotation);root.add(e);return m}
function build(name){if(!scene||active===name)return;const base=scene.getObjectByName('SKLTR_V60_WORLD');if(!base){requestAnimationFrame(()=>build(name));return}const old=base.getObjectByName('SKLTR_V144_BOSS_ARENA');if(old)base.remove(old);const r=new THREE.Group();r.name='SKLTR_V144_BOSS_ARENA';base.add(r);active=name;builds++;
 if(name==='WARBEAR'){
   // Gapped rings/spokes: four low vault rails give radial choices without hard cover camping.
   for(const [x,z,ry] of [[0,-18,0],[18,0,Math.PI/2],[0,18,0],[-18,0,Math.PI/2]])solid(r,x,z,8,.72,1.2,ry,true);
   for(const [x,z] of [[-28,-28],[28,-28],[-28,28],[28,28]])solid(r,x,z,3.4,7,3.4);
 }else if(name==='STAG'){
   // Fans + homing hunt: offset pillars make lock-breaking routes but preserve cross lanes.
   for(const [x,z] of [[-17,-12],[17,12],[-17,18],[17,-18]])solid(r,x,z,4.2,9,4.2,.12);
   solid(r,0,26,10,.72,1.2,0,true);solid(r,0,-26,10,.72,1.2,0,true);
 }else{
   // NEST spiral/halo: alternating inner vaults and outer blockers create moving slalom gaps.
   for(let i=0;i<6;i++){const a=i/6*Math.PI*2,x=Math.cos(a)*23,z=Math.sin(a)*23;if(i%2===0)solid(r,x,z,7,.72,1.1,-a,true);else solid(r,x,z,3.2,8,3.2,-a);}
 }
 queueMicrotask(()=>window._skltrBVH96?.refresh?.());dispatchEvent(new CustomEvent('skltr-boss-arena-ready',{detail:{boss:name}}));
}
addEventListener('skltr-boss-attack',e=>build(e.detail?.boss||'WARBEAR'));
window._skltrBossArena144=()=>({active,builds,solids:scene?.getObjectByName('SKLTR_V144_BOSS_ARENA')?.children.filter(o=>o.isMesh).length||0});
