import * as THREE from 'three';
import { ProjectilePool } from './projectile.js?v=12';

// SKLTR v88 — cover is gameplay again.
// Both player and enemy shots collide with authored combat geometry instead of
// travelling through walls/terraces. Uses swept segment-vs-AABB tests so fast
// projectiles cannot tunnel through thin cover.
function segAabb(ax,ay,az,bx,by,bz,cx,cy,cz,hx,hy,hz){
  let t0=0,t1=1;
  for(const [a,b,c,h] of [[ax,bx,cx,hx],[ay,by,cy,hy],[az,bz,cz,hz]]){
    const d=b-a;
    if(Math.abs(d)<1e-8){if(a<c-h||a>c+h)return false;continue;}
    let q0=(c-h-a)/d,q1=(c+h-a)/d;if(q0>q1){const q=q0;q0=q1;q1=q;}
    t0=Math.max(t0,q0);t1=Math.min(t1,q1);if(t0>t1)return false;
  }
  return t1>=0&&t0<=1;
}
function blocked(p){
  const boxes=window._skltrGeometry?.boxes||[];
  for(const [x,z,w,h,d] of boxes){
    if(segAabb(p.px,p.py,p.pz,p.x,p.y,p.z,x,h*.5,z,w*.5+p.r,h*.5+p.r,d*.5+p.r))return true;
  }
  return false;
}
function impact(scene,p){
  const g=new THREE.Group();g.position.set(p.x,p.y,p.z);scene.add(g);
  const c=p.fromPlayer?0xa9ecff:0xff7a8a;
  const mat=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.85});
  for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.055,0),mat.clone());const a=i/4*Math.PI*2;m.position.set(Math.cos(a)*.08,Math.sin(a*1.7)*.05,Math.sin(a)*.08);g.add(m);}
  let life=.16;const tick=()=>{life-=.016;g.scale.multiplyScalar(1.08);g.children.forEach(o=>o.material.opacity=Math.max(0,life/.16));if(life>0)requestAnimationFrame(tick);else{scene.remove(g);g.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.()})}};tick();
}
const old=ProjectilePool.prototype.update;
ProjectilePool.prototype.update=function(dt){
  old.call(this,dt);
  for(let i=this.active.length-1;i>=0;i--){const p=this.active[i];if(!blocked(p))continue;impact(this.scene,p);this.recycle(i);}
};
window._skltrCover88={blocked:()=>true};
