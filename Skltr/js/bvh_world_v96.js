import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { ProjectilePool } from './projectile.js?v=12';
import { Player } from './player.js?v=12';

// SKLTR v93-v100 — three-mesh-bvh powers solid-world projectile and LOS queries.
THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

let capturedScene=null,colliders=[];
const ray=new THREE.Raycaster();
ray.firstHitOnly=true;

function refresh(){
  colliders=[];
  const root=capturedScene?.getObjectByName('SKLTR_V60_WORLD');
  root?.traverse(o=>{
    if(!o.isMesh || o.material?.wireframe) return;
    o.geometry.computeBoundingBox?.();
    const sz=new THREE.Vector3();o.geometry.boundingBox?.getSize(sz);
    if(sz.x<.35 || sz.y<.35 || sz.z<.35) return;
    if(!o.geometry.boundsTree)o.geometry.computeBoundsTree();
    o.userData.skltrBVH=true;
    colliders.push(o);
  });
  dispatchEvent(new CustomEvent('skltr-bvh-ready',{detail:{colliders:colliders.length}}));
}

const oldAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){
  const out=oldAdd.apply(this,objects);
  if(this.isScene&&!capturedScene){capturedScene=this;queueMicrotask(refresh)}
  return out;
};
addEventListener('skltr-world-shift',()=>queueMicrotask(refresh));

function segmentHit(ax,ay,az,bx,by,bz,pad=0){
  if(!colliders.length)return null;
  const origin=new THREE.Vector3(ax,ay,az),dir=new THREE.Vector3(bx-ax,by-ay,bz-az);
  const len=dir.length();if(len<1e-5)return null;dir.multiplyScalar(1/len);
  ray.set(origin,dir);ray.near=0;ray.far=len+pad;
  return ray.intersectObjects(colliders,false)[0]||null;
}
function lineClear(ax,ay,az,bx,by,bz,pad=0){
  const hit=segmentHit(ax,ay,az,bx,by,bz,pad);
  if(!hit)return true;
  const d=Math.hypot(bx-ax,by-ay,bz-az);
  return hit.distance>=d-pad;
}

const oldPoolUpdate=ProjectilePool.prototype.update;
ProjectilePool.prototype.update=function(dt){
  oldPoolUpdate.call(this,dt);
  for(let i=this.active.length-1;i>=0;i--){
    const p=this.active[i],hit=segmentHit(p.px,p.py,p.pz,p.x,p.y,p.z,p.r||0);
    if(!hit)continue;
    dispatchEvent(new CustomEvent('skltr-world-hit',{detail:{point:hit.point,fromPlayer:p.fromPlayer,object:hit.object}}));
    this.recycle(i);
  }
};

const oldAim=Player.prototype._aim;
Player.prototype._aim=function(a,en){
  const visible=en?.filter(e=>{
    if(!e?.alive)return false;
    const eyeY=this.y+1.25,targetY=(e.y||0)+.45;
    return lineClear(this.x,eyeY,this.z,e.x,targetY,e.z,e.r||.7);
  })||en;
  return oldAim.call(this,a,visible);
};

window._skltrBVH96={
  state:()=>({colliders:colliders.length,enabled:true}),
  segmentHit,
  lineClear,
  refresh
};
