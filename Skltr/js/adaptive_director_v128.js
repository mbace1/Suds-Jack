import { Player } from './player.js?v=12';

// SKLTR v125-v128 — adaptive combat director.
// It does not replace authored encounter cards or add raw enemy density. Instead it
// reads the player's current condition and selects which existing enemy relationship
// should be emphasized: HOUND drive, TORTOISE suppression, WASP displacement, or a
// brief recovery beat. Encounter composition consumes the public state below.
const S={mode:'BALANCED',hp:1,flow:0,speed:0,airborne:false,safeFor:0,campFor:0,hits:0,melee:0,missiles:0,changed:performance.now()};
let lastHit=-1e9,lastTick=performance.now();

const ROLE={
  RECOVER:{hound:.62,tortoise:.68,wasp:.56,spawnGap:1.18},
  HUNT:{hound:1.42,tortoise:.82,wasp:.72,spawnGap:1.00},
  DISPLACE:{hound:1.02,tortoise:1.16,wasp:1.24,spawnGap:.96},
  OVERDRIVE:{hound:1.20,tortoise:1.24,wasp:1.30,spawnGap:.92},
  BALANCED:{hound:1,tortoise:1,wasp:1,spawnGap:1}
};

function choose(now,p){
  const sinceHit=(now-lastHit)/1000;
  if(S.hp<.36||sinceHit<2.35)return'RECOVER';
  if(S.campFor>2.2&&S.flow<2)return'HUNT';
  if(S.hp>.72&&S.flow>=2&&sinceHit>5.5)return'OVERDRIVE';
  if(S.flow>=1||S.airborne)return'DISPLACE';
  return'BALANCED';
}
function publish(mode,now){
  if(mode===S.mode)return;
  S.mode=mode;S.changed=now;
  dispatchEvent(new CustomEvent('skltr-director-shift',{detail:{...S,role:ROLE[mode]}}));
}

const oldHurt=Player.prototype.hurt;
Player.prototype.hurt=function(...a){
  const before=this.hp,out=oldHurt.apply(this,a);
  if(this.hp<before){lastHit=performance.now();S.hits++;S.safeFor=0;}
  return out;
};
const oldUpdate=Player.prototype.update;
Player.prototype.update=function(dt,...a){
  const out=oldUpdate.call(this,dt,...a);
  const now=performance.now(),elapsed=Math.min(.25,(now-lastTick)/1000);lastTick=now;
  if(this.maxHp)S.hp=Math.max(0,Math.min(1,this.hp/this.maxHp));
  S.flow=this.flowStacks||0;S.speed=Math.hypot(this.vx||0,this.vz||0);S.airborne=!!(this.grounded&&!this.grounded());
  S.safeFor=Math.max(0,(now-lastHit)/1000);
  if(this.alive&&S.speed<3.2&&!S.airborne)S.campFor+=elapsed;else S.campFor=Math.max(0,S.campFor-elapsed*1.8);
  publish(choose(now,this),now);
  return out;
};
addEventListener('skltr-melee-kill',()=>S.melee++);
addEventListener('skltr-missile-launch',()=>S.missiles++);

window._skltrAdaptive128=()=>({
  mode:S.mode,hp:+S.hp.toFixed(2),flow:S.flow,speed:+S.speed.toFixed(1),airborne:S.airborne,
  safeFor:+S.safeFor.toFixed(1),campFor:+S.campFor.toFixed(1),hits:S.hits,melee:S.melee,missiles:S.missiles,
  role:{...ROLE[S.mode]}
});
