import { Player } from './player.js?v=12';
import { Enemy } from './enemy.js?v=12';

// SKLTR v84 — response to v80 playtest: fewer projectiles, clearer mistakes.
let born=performance.now();
const age=()=>Math.max(0,(performance.now()-born)/1000);
const oldReset=Player.prototype.reset;
Player.prototype.reset=function(...args){born=performance.now();return oldReset.apply(this,args)};

const oldHurt=Player.prototype.hurt;
Player.prototype.hurt=function(d,...rest){const t=age(),scale=t<45?.86:t<90?.93:1;return oldHurt.call(this,d*scale,...rest)};

const oldFire=Enemy.prototype.fire;
if(oldFire)Enemy.prototype.fire=function(...args){
  const t=age();
  if(!this.boss){
    if(t<25)return;
    const tortoise=this.type==='turret';
    const minGap=tortoise?(t<90?2.8:t<150?2.2:1.8):(t<60?2.1:t<100?1.6:1.15);
    const now=performance.now()/1000;
    if(this._v84ShotAt&&now-this._v84ShotAt<minGap)return;
    this._v84ShotAt=now;
  }
  return oldFire.apply(this,args);
};

const oldUpdate=Enemy.prototype.update;
Enemy.prototype.update=function(dt,player,pool,...rest){
  if(this.type!=='turret'||this.boss||age()>=120)return oldUpdate.call(this,dt,player,pool,...rest);
  const original=pool.spawn.bind(pool), emitted=[];
  const proxy=Object.create(pool); proxy.spawn=(...a)=>{emitted.push(a);return null};
  const out=oldUpdate.call(this,dt,player,proxy,...rest);
  if(emitted.length===5){for(const i of[0,2,4]){const a=emitted[i];a[6]={...a[6],speed:i===2?10.4:8.6,scale:1.18};original(...a)}}
  else emitted.forEach(a=>original(...a));
  return out;
};
window._skltrV84={age};
