import * as THREE from 'three';
import { Player } from './player.js?v=12';

// SKLTR v114 — hero architecture is now solid to the player as well as bullets/LOS.
// We use per-mesh world AABBs from the authored primitive architecture. The check
// happens before movement-offense resolves, so CONTACT cannot pass through a wall.
let scene=null,boxes=[];
const PLAYER_R=.42, BODY_LOW=.18, BODY_HIGH=1.65;

function refresh(){
  boxes=[];
  const root=scene?.getObjectByName('SKLTR_V108_HERO');
  root?.updateMatrixWorld(true);
  root?.traverse(o=>{
    if(!o.isMesh||!o.userData.skltrHeroSolid)return;
    const b=new THREE.Box3().setFromObject(o);
    if(!b.isEmpty())boxes.push(b);
  });
}

function blocked(x,y,z){
  for(const b of boxes){
    if(y+BODY_HIGH<b.min.y||y+BODY_LOW>b.max.y)continue;
    if(x+PLAYER_R<b.min.x||x-PLAYER_R>b.max.x||z+PLAYER_R<b.min.z||z-PLAYER_R>b.max.z)continue;
    return true;
  }
  return false;
}

function resolve(p,px,pz){
  if(!boxes.length||!blocked(p.x,p.y,p.z))return false;
  const nx=p.x,nz=p.z;
  if(!blocked(nx,p.y,pz)){p.z=pz;p.vz=0;return true;}
  if(!blocked(px,p.y,nz)){p.x=px;p.vx=0;return true;}
  p.x=px;p.z=pz;p.vx=0;p.vz=0;return true;
}

const oldOffense=Player.prototype._movementOffense;
Player.prototype._movementOffense=function(dt,en,px=this.x,pz=this.z){
  const hit=resolve(this,px,pz);
  if(hit)dispatchEvent(new CustomEvent('skltr-player-cover-hit',{detail:{x:this.x,y:this.y,z:this.z}}));
  return oldOffense.call(this,dt,en,px,pz);
};

const oldAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...o){const out=oldAdd.apply(this,o);if(this.isScene&&!scene){scene=this;queueMicrotask(refresh)}return out};
addEventListener('skltr-world-shift',()=>setTimeout(refresh,0));
addEventListener('skltr-arena',()=>setTimeout(refresh,0));
addEventListener('skltr-bvh-ready',()=>setTimeout(refresh,0));

window._skltrPlayerWorld114=()=>({solidBoxes:boxes.length,blocked:(x,y,z)=>blocked(x,y,z)});
