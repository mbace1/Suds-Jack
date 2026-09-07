import { Player } from './player.js?v=12';

// SKLTR v39 — conservative consolidation tune for the movement/offense loop.
// Keeps melee razor-close, gives FLOW enough time to chain, and trims punishment spikes.
const FLOW_MAX=3,FLOW_LIFE=3.6,DASH_REACH=.34,SKIM_REACH=.14,SKIM_SPEED=14.5;
const oldReset=Player.prototype.reset;
Player.prototype.reset=function(...args){const out=oldReset.apply(this,args);if(this._stats)this._stats.dashCD=Math.min(this._stats.dashCD||.84,.80);return out};
Player.prototype._movementOffense=function(dt,enemies){
  this.flowPulse=false;
  if(this.flowT>0){this.flowT=Math.max(0,this.flowT-dt);if(this.flowT===0)this.flowStacks=0}
  const speed=Math.hypot(this.vx||0,this.vz||0),skim=speed>=SKIM_SPEED;
  if(!this.dashing&&!skim)return;
  if(!this._meleeTagged)this._meleeTagged=new WeakSet();
  for(const e of enemies||[]){
    if(!e?.alive||e.boss||this._meleeTagged.has(e))continue;
    const vertical=Math.abs((this.y+.9)-(e.y||0));if(vertical>1.35)continue;
    const d=Math.hypot(e.x-this.x,e.z-this.z),reach=(e.r||.7)+(this.dashing?DASH_REACH:SKIM_REACH);
    if(d>reach)continue;
    this._meleeTagged.add(e);
    const killed=e.takeDamage((e.hp||1)+1);if(!killed)continue;
    this.addKill();this.flowStacks=Math.min(FLOW_MAX,(this.flowStacks||0)+1);this.flowT=FLOW_LIFE;this.flowPulse=true;this._meleePulse=1;
    dispatchEvent(new CustomEvent('skltr-melee-kill',{detail:{x:e.x,y:e.y,z:e.z,type:e.type}}));
  }
};
const oldUpdate=Player.prototype.update;
Player.prototype.update=function(...args){
  if(this.pool?.spawn&&!this.pool._v39Tune){const prev=this.pool.spawn.bind(this.pool);this.pool.spawn=(...a)=>{const o=a[a.length-1];if(o&&!o.fromPlayer){o.speed*=.96;o.damage*=.94;o.r=Math.min(o.r||.45,.45)}return prev(...a)};this.pool._v39Tune=true}
  return oldUpdate.apply(this,args)
};
