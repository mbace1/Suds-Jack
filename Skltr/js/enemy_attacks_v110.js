import { Enemy } from './enemy.js?v=12';
import { ProjectilePool } from './projectile.js?v=12';

// SKLTR v109-v110 — ranged enemies now rotate between authored attack problems.
// WASP includes a slow, readable homing missile: low speed + low turn rate means
// it pressures movement and cover instead of snapping onto the player.
const rotate=(x,z,a)=>({x:x*Math.cos(a)-z*Math.sin(a),z:x*Math.sin(a)+z*Math.cos(a)});

const oldSpawn=ProjectilePool.prototype.spawn;
ProjectilePool.prototype.spawn=function(x,y,z,dx,dy,dz,o={}){
  const p=oldSpawn.call(this,x,y,z,dx,dy,dz,o);
  if(p&&o.enemyHoming){p.enemyHoming=true;p.enemyTurn=o.enemyTurn??.72;p.baseScale*=1.65;p.mat.color.setHex(0xff6f4d);p.mat.opacity=1;p.mesh.scale.set(.95*p.baseScale,.95*p.baseScale,2.7*p.baseScale)}
  return p;
};

const oldPoolUpdate=ProjectilePool.prototype.update;
ProjectilePool.prototype.update=function(dt){
  const player=this._skltrPlayer;
  if(player?.alive)for(const p of this.active){
    if(!p.enemyHoming)continue;
    let tx=player.x-p.x,ty=(player.y+1)-p.y,tz=player.z-p.z,d=Math.hypot(tx,ty,tz)||1;tx/=d;ty/=d;tz/=d;
    const k=Math.min(.065,(p.enemyTurn||.72)*dt);
    let nx=p.dx+(tx-p.dx)*k,ny=p.dy+(ty-p.dy)*k,nz=p.dz+(tz-p.dz)*k,n=Math.hypot(nx,ny,nz)||1;
    p.dx=nx/n;p.dy=ny/n;p.dz=nz/n;p.mesh.rotation.z+=dt*7;
  }
  return oldPoolUpdate.call(this,dt);
};

const oldUpdate=Enemy.prototype.update;
Enemy.prototype.update=function(dt,player,pool,...rest){
  pool._skltrPlayer=player;
  if(this.boss||!this.t?.ranged)return oldUpdate.call(this,dt,player,pool,...rest);
  const emitted=[],fire=pool.spawn.bind(pool),proxy=Object.create(pool);proxy.spawn=(...a)=>{emitted.push(a);return null};
  const out=oldUpdate.call(this,dt,player,proxy,...rest);if(!emitted.length)return out;
  this._v110Attack=(this._v110Attack||0)+1;const mode=this._v110Attack%3;
  if(this.type==='turret'){
    if(mode===0){emitted.forEach((a,i)=>{a[6]={...a[6],speed:[8.4,11.6,8.4][i%3]||9.8,scale:1.22};fire(...a)})}
    else if(mode===1){emitted.forEach((a,i)=>{const r=rotate(a[3],a[5],(i-(emitted.length-1)/2)*.11);a[3]=r.x;a[5]=r.z;a[6]={...a[6],speed:10.2,scale:1.16};fire(...a)})}
    else{const mid=emitted[Math.floor(emitted.length/2)]||emitted[0];mid[6]={...mid[6],speed:15.4,scale:1.48,color:0xffbf62};fire(...mid)}
    return out;
  }
  if(this.type==='flyer'){
    if(mode===2){const a=emitted[Math.floor(emitted.length/2)]||emitted[0];a[6]={...a[6],speed:8.2,life:5.8,damage:10,scale:1.42,color:0xff6f4d,enemyHoming:true,enemyTurn:.72,r:.48};fire(...a);dispatchEvent(new CustomEvent('skltr-enemy-missile',{detail:{x:this.x,y:this.y,z:this.z}}));return out}
    if(mode===1){emitted.forEach((a,i)=>{const r=rotate(a[3],a[5],i===0?-.16:i===emitted.length-1?.16:0);a[3]=r.x;a[5]=r.z;a[6]={...a[6],speed:i===1?14.5:11.1,scale:1.18};fire(...a)});return out}
    emitted.forEach((a,i)=>{a[6]={...a[6],speed:i===1?16.2:12.1,scale:i===1?1.3:1.08};fire(...a)});return out;
  }
  emitted.forEach(a=>fire(...a));return out;
};
window._skltrEnemyAttacks110=()=>({turretModes:3,flyerModes:3,enemyHoming:true,homingSpeed:8.2,homingTurn:.72});
