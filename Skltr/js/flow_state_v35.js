import { Bunny, lerp } from './shared.js?v=12';
import { Player } from './player.js?v=12';

// SKLTR v35 — FLOW is a visible character state.
// Toko expression stays identical; only stroke weight increases.
// At high FLOW the exaggerated locomotion settles into eerie composure.
const oldPlayerUpdate = Player.prototype.update;
Player.prototype.update = function(...args){
  if(this.fig) this.fig._tokoFlowTarget=Math.max(0,Math.min(1,(this.flowStacks||0)/3));
  return oldPlayerUpdate.apply(this,args);
};

const oldBunnyUpdate = Bunny.prototype.update;
Bunny.prototype.update = function(dt,state={}){
  oldBunnyUpdate.call(this,dt,state);
  this._tokoFlow ||= 0;
  const target=this._tokoFlowTarget||0;
  this._tokoFlow=lerp(this._tokoFlow,target,Math.min(1,dt*2.15));
  const f=this._tokoFlow;

  if(this._tokoFace?.parts){
    // Deliberate slow bolding. Geometry/expression never changes.
    const s=1+f*.72;
    for(const p of this._tokoFace.parts) p.scale.set(s,s,1);
  }

  // FLOW 0–2 keeps the animated arcade body. Near max FLOW, reduce incidental
  // sway while preserving actual locomotion pose and movement readability.
  const calm=Math.max(0,(f-.58)/.42);
  if(calm>0){
    const k=Math.min(1,dt*(5+calm*8));
    this.chest.rotation.z=lerp(this.chest.rotation.z,0,k*calm);
    this.body.rotation.z=lerp(this.body.rotation.z,0,k*calm);
    this.head.rotation.z=lerp(this.head.rotation.z,0,k*calm);
    this.head.rotation.y=lerp(this.head.rotation.y,0,k*calm);
    // Keep forward combat posture rather than neutral mannequin posture.
    this.chest.rotation.x=lerp(this.chest.rotation.x,.10,k*.35*calm);
  }
};
