import * as THREE from 'three';
import { ProjectilePool } from './projectile.js?v=12';

// SKLTR v133-v136 — missiles become a complete movement mechanic.
// Enemy missiles lose tracking behind solid BVH geometry, can be shot down, and award
// aggressive near-misses. Both sides get pooled trails and velocity-aligned bodies.
const stats={shotDown:0,nearMiss:0,locksBroken:0};
const zAxis=new THREE.Vector3(0,0,1),dir=new THREE.Vector3();

function ensureTrail(pool,p,color){
  if(!p._missileTrail){
    const a=new Float32Array(18),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));
    const m=new THREE.LineBasicMaterial({color,transparent:true,opacity:.62});
    p._missileTrail=new THREE.Line(g,m);p._trailArray=a;pool.scene.add(p._missileTrail);
  }
  p._missileTrail.material.color.setHex(color);p._missileTrail.visible=true;
  for(let i=0;i<6;i++){p._trailArray[i*3]=p.x;p._trailArray[i*3+1]=p.y;p._trailArray[i*3+2]=p.z;}
  p._missileTrail.geometry.attributes.position.needsUpdate=true;
}
function hideTrail(p){if(p?._missileTrail)p._missileTrail.visible=false}
function updateTrail(p){
  if(!p._missileTrail?.visible)return;const a=p._trailArray;
  for(let i=5;i>0;i--){a[i*3]=a[(i-1)*3];a[i*3+1]=a[(i-1)*3+1];a[i*3+2]=a[(i-1)*3+2];}
  a[0]=p.x;a[1]=p.y;a[2]=p.z;p._missileTrail.geometry.attributes.position.needsUpdate=true;
}

const oldSpawn=ProjectilePool.prototype.spawn;
ProjectilePool.prototype.spawn=function(x,y,z,dx,dy,dz,o={}){
  const p=oldSpawn.call(this,x,y,z,dx,dy,dz,o);if(!p)return p;
  // Recycled projectile objects must never keep missile state from a previous life.
  p.missile=!!o.missile;p.enemyHoming=!!o.enemyHoming;p._enemyMissile=!!o.enemyHoming;
  if(!p.missile){p.homingTarget=null;p.turnRate=0;}
  if(!p.enemyHoming)p.enemyTurn=0;
  p._lockBlocked=0;p._nearAward=false;p._shotMarked=false;
  if(p.missile)ensureTrail(this,p,0xffe26a);else if(p._enemyMissile)ensureTrail(this,p,0xff6f4d);else hideTrail(p);
  return p;
};
const oldRecycle=ProjectilePool.prototype.recycle;
ProjectilePool.prototype.recycle=function(i){const p=this.active[i];hideTrail(p);return oldRecycle.call(this,i)};

const oldUpdate=ProjectilePool.prototype.update;
ProjectilePool.prototype.update=function(dt){
  const player=this._skltrPlayer,api=window._skltrBVH96;
  // Cover breaks enemy missile lock after a short, readable grace period.
  if(player?.alive&&api?.lineClear){for(const p of this.active){if(!p.enemyHoming)continue;
    const clear=api.lineClear(p.x,p.y,p.z,player.x,player.y+1,player.z,.18);
    p._lockBlocked=clear?0:(p._lockBlocked||0)+dt;
    if(p._lockBlocked>.22){p.enemyHoming=false;p.mat.opacity=.62;stats.locksBroken++;dispatchEvent(new CustomEvent('skltr-missile-lock-broken',{detail:{x:p.x,y:p.y,z:p.z}}));}
  }}
  const out=oldUpdate.call(this,dt);

  for(const p of this.active){
    if(p.missile||p._enemyMissile){
      updateTrail(p);dir.set(p.dx,p.dy,p.dz);if(dir.lengthSq()>.001){dir.normalize();p.mesh.quaternion.setFromUnitVectors(zAxis,dir);}
    }
  }

  // Any player shot can intercept a hostile missile. Mark first, recycle in one pass.
  const hostile=this.active.filter(p=>p._enemyMissile),friendly=this.active.filter(p=>p.fromPlayer);
  for(const m of hostile){if(m._shotMarked)continue;for(const s of friendly){if(s===m||s._shotMarked)continue;
    const r=(m.r||.45)+(s.r||.35)+.22;if((m.x-s.x)**2+(m.y-s.y)**2+(m.z-s.z)**2<=r*r){m._shotMarked=s._shotMarked=true;stats.shotDown++;if(player){player._missileT=Math.max(0,(player._missileT||0)-.65);player.flowT=Math.max(player.flowT||0,1.8);}dispatchEvent(new CustomEvent('skltr-missile-shotdown',{detail:{x:m.x,y:m.y,z:m.z}}));break;}
  }}
  for(let i=this.active.length-1;i>=0;i--)if(this.active[i]._shotMarked)this.recycle(i);

  if(player?.alive)for(const p of this.active){if(!p._enemyMissile||p._nearAward)continue;const d=Math.hypot(p.x-player.x,p.y-(player.y+1),p.z-player.z);
    if(d<1.75&&d>.65){p._nearAward=true;stats.nearMiss++;player._missileT=Math.max(0,(player._missileT||0)-.45);player.flowT=Math.max(player.flowT||0,1.25);dispatchEvent(new CustomEvent('skltr-missile-nearmiss',{detail:{distance:d}}));}
  }
  return out;
};

const cue=document.createElement('div');Object.assign(cue.style,{position:'fixed',left:'50%',top:'22%',transform:'translateX(-50%)',zIndex:'90',font:'900 12px/1 monospace',letterSpacing:'4px',color:'#ff9b72',textShadow:'0 0 14px #ff5b4077',opacity:'0',pointerEvents:'none',transition:'opacity .15s'});document.body.appendChild(cue);let cueT=0;
function show(t,sec=.8){cue.textContent=t;cue.style.opacity='.9';cueT=sec}
addEventListener('skltr-enemy-missile',()=>show('MISSILE LOCK',1));
addEventListener('skltr-missile-lock-broken',()=>show('LOCK BROKEN',.65));
addEventListener('skltr-missile-shotdown',()=>show('MISSILE DOWN',.55));
addEventListener('skltr-missile-nearmiss',()=>show('NEAR MISS · RELOAD +',.5));
(function tick(){if(cueT>0){cueT-=1/60;if(cueT<=0)cue.style.opacity='0'}requestAnimationFrame(tick)})();

window._skltrMissileGameplay136=()=>({...stats});
