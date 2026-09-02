import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { ProjectilePool } from './projectile.js?v=12';
import { Player } from './player.js?v=12';

// SKLTR v93-v96 — first adoption from GitHub systems research.
// three-mesh-bvh turns authored solid world meshes into fast projectile + LOS
// collision instead of leaving them as visual-only scenery.
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
    // Ignore hairline decoration; only substantial authored masses become gameplay.
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

// Projectiles now respect richer solid arena art, not just the legacy box list.
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

// Auto-aim cannot lock through a solid world mesh. Movement/fire remain unchanged.
const oldAim=Player.prototype._aim;
Player.prototype._aim=function(a,en){
  const visible=en?.filter(e=>{
    if(!e?.alive)return false;
    const eyeY=this.y+1.25,targetY=e.y||0;
    const hit=segmentHit(this.x,eyeY,this.z,e.x,targetY,e.z,0);
    if(!hit)return true;
    const targetDist=Math.hypot(e.x-this.x,targetY-eyeY,e.z-this.z);
    return hit.distance>=targetDist-(e.r||.7);
  })||en;
  return oldAim.call(this,a,visible);
};

window._skltrBVH96=()=>({colliders:colliders.length,enabled:true});
