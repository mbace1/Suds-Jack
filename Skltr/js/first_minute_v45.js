import { Player } from './player.js?v=12';
import { Enemy } from './enemy.js?v=12';

// SKLTR v45 — first-minute correction from screenshot telemetry.
// Goal: teach movement/melee before projectile pressure becomes the main problem.
const born=performance.now();
const age=()=>Math.max(0,(performance.now()-born)/1000);

// Early regular enemies are less punishing. Protection fades out by 100 seconds.
const oldHurt=Player.prototype.hurt;
Player.prototype.hurt=function(d,...rest){
  const t=age();
  const scale=t<45?.72:t<75?.82:t<100?.92:1;
  return oldHurt.call(this,d*scale,...rest);
};

// Delay and thin regular-enemy projectile pressure during the teaching window.
const oldFire=Enemy.prototype.fire;
if(oldFire) Enemy.prototype.fire=function(...args){
  const t=age();
  if(!this.boss){
    if(t<18)return;
    const minGap=t<45?1.45:t<75?1.18:1;
    const now=performance.now()/1000;
    if(this._v45ShotAt&&now-this._v45ShotAt<minGap)return;
    this._v45ShotAt=now;
  }
  return oldFire.apply(this,args);
};

// Hounds are the melee teacher: slightly larger contact envelope only in the first minute.
const oldMove=Player.prototype._movementOffense;
Player.prototype._movementOffense=function(dt,enemies){
  if(age()<65){
    for(const e of enemies||[]){
      if(e?.alive&&!e.boss&&e.type==='chaser'&&!e._v45R){e._v45R=e.r;e.r=(e.r||.7)+.12}
    }
  }
  return oldMove.call(this,dt,enemies);
};

window._skltrV45={age};
