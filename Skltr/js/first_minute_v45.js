import { Player } from './player.js?v=12';
import { Enemy } from './enemy.js?v=12';

// SKLTR v79 — first-minute teaching window resets per run and never mutates enemy radii permanently.
let born=performance.now();
const age=()=>Math.max(0,(performance.now()-born)/1000);
const oldReset=Player.prototype.reset;
Player.prototype.reset=function(...a){born=performance.now();return oldReset.apply(this,a)};
const oldHurt=Player.prototype.hurt;
Player.prototype.hurt=function(d,...rest){const t=age(),scale=t<45?.72:t<75?.82:t<100?.92:1;return oldHurt.call(this,d*scale,...rest)};
const oldFire=Enemy.prototype.fire;
if(oldFire)Enemy.prototype.fire=function(...args){const t=age();if(!this.boss){if(t<18)return;const minGap=t<45?1.45:t<75?1.18:1,now=performance.now()/1000;if(this._v79ShotAt&&now-this._v79ShotAt<minGap)return;this._v79ShotAt=now}return oldFire.apply(this,args)};
const oldMove=Player.prototype._movementOffense;
if(oldMove)Player.prototype._movementOffense=function(dt,enemies){const bumped=[];if(age()<65)for(const e of enemies||[]){if(e?.alive&&!e.boss&&e.type==='chaser'){bumped.push([e,e.r]);e.r=(e.r||.7)+.12}}try{return oldMove.call(this,dt,enemies)}finally{for(const [e,r] of bumped)e.r=r}};
window._skltrV79={age};
