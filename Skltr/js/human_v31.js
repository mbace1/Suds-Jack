import { Bunny, lerp } from './shared.js?v=12';

// SKLTR v31 — authored locomotion layer.
// Keeps controller/physics intact, but replaces subtle wobble with explicit pose states.
const baseUpdate = Bunny.prototype.update;

const clamp01 = v => Math.max(0, Math.min(1, v));
const mix = (a,b,t)=>a+(b-a)*t;
const pose = (a,b,t)=>a.map((v,i)=>mix(v,b[i],t));

// [chestX, chestY, bodyY, headX, armLX, armRX, hipLX, hipRX, kneeLX, kneeRX, footLX, footRX]
const RUN = [
  [ .12,-.10, .05,-.05,-.75, .65, .72,-.58,-.25,.78,-.25,.18],
  [ .08,-.04, .02,-.03,-.35, .28, .32,-.18, .18,.42,-.05,.05],
  [ .10, .08,-.04,-.04, .35,-.28,-.32, .18, .72,.20, .16,-.02],
  [ .14, .12,-.06,-.06, .72,-.58,-.58, .62, .86,-.18, .28,-.20],
  [ .12, .10,-.05,-.05, .75,-.65,-.72, .58, .78,-.25, .18,-.25],
  [ .08, .04,-.02,-.03, .35,-.28,-.32, .18, .42,.18, .05,-.05],
  [ .10,-.08, .04,-.04,-.35, .28, .32,-.18, .20,.72,-.02,.16],
  [ .14,-.12, .06,-.06,-.72, .58, .58,-.62,-.18,.86,-.20,.28],
];

const TAKEOFF = [ .22,0,0,-.08,-.35,.20,-.62,-.48,.88,.82,.18,.14 ];
const RISE    = [ .18,0,0,-.10,-.20,.10,-.48,-.30,.72,.62,.12,.08 ];
const APEX    = [ .02,0,0, .02, .10,-.08, .18,-.12,.48,.40,-.02,-.04 ];
const FALL    = [-.10,0,0, .06, .24,-.18, .30,.18,.38,.30,-.08,-.10 ];
const LAND    = [-.22,0,0, .12,-.18,.12, .36,.36,.92,.92,-.16,-.16 ];
const DASH_A  = [ .26,0,0,-.12,-.65,.18,-.22,.38,.38,.16,.12,-.10 ];
const DASH_B  = [ .36,0,0,-.16,-.92,.32, .78,-.62,.10,.72,.28,-.22 ];
const DASH_R  = [ .14,0,0,-.06,-.28,.10, .18,-.08,.42,.28,.04,-.02 ];

function apply(b,p,dt,rate=18){
  const t=clamp01(dt*rate);
  b.chest.rotation.x = lerp(b.chest.rotation.x,p[0],t);
  b.chest.rotation.y = lerp(b.chest.rotation.y,p[1],t);
  b.body.rotation.y = lerp(b.body.rotation.y,p[2],t);
  b.head.rotation.x = lerp(b.head.rotation.x,p[3],t);
  b.armLU.pivot.rotation.x = lerp(b.armLU.pivot.rotation.x,p[4],t);
  b.armRU.pivot.rotation.x = lerp(b.armRU.pivot.rotation.x,p[5],t);
  b.legL.thigh.pivot.rotation.x = lerp(b.legL.thigh.pivot.rotation.x,p[6],t);
  b.legR.thigh.pivot.rotation.x = lerp(b.legR.thigh.pivot.rotation.x,p[7],t);
  b.legL.shin.pivot.rotation.x = lerp(b.legL.shin.pivot.rotation.x,p[8],t);
  b.legR.shin.pivot.rotation.x = lerp(b.legR.shin.pivot.rotation.x,p[9],t);
  b.legL.foot.rotation.x = lerp(b.legL.foot.rotation.x,p[10],t);
  b.legR.foot.rotation.x = lerp(b.legR.foot.rotation.x,p[11],t);
}

Bunny.prototype.update = function(dt,state={}){
  baseUpdate.call(this,dt,state);
  if (this._v31PrevAir == null) { this._v31PrevAir=false; this._v31Land=0; this._v31Dash=0; this._v31Run=0; }
  const speed=state.speed||0, air=!!state.airborne, dash=!!state.dashing, vy=state.vy||0;
  const run=clamp01(speed/8.5);
  if(this._v31PrevAir && !air) this._v31Land=1;
  this._v31PrevAir=air;
  this._v31Land=Math.max(0,this._v31Land-dt*6.5);
  this._v31Dash=lerp(this._v31Dash,dash?1:0,clamp01(dt*20));
  this._v31Run += dt*(7.2+speed*1.25);

  if(dash){
    const q=this._v31Dash;
    const p=q<.35?pose(DASH_A,DASH_B,q/.35):pose(DASH_B,DASH_R,clamp01((q-.72)/.28));
    apply(this,p,dt,24);
    this.body.position.y += .03;
  } else if(air){
    let p;
    if(vy>7) p=TAKEOFF;
    else if(vy>1.5) p=RISE;
    else if(vy>-2) p=APEX;
    else p=FALL;
    apply(this,p,dt,16);
  } else if(this._v31Land>0){
    const k=this._v31Land;
    apply(this,pose(RUN[0],LAND,k),dt,24);
    this.body.position.y -= .06*k;
  } else if(run>.08){
    const f=(this._v31Run%(Math.PI*2))/(Math.PI*2)*8;
    const i=Math.floor(f)%8, j=(i+1)%8, u=f-Math.floor(f);
    apply(this,pose(RUN[i],RUN[j],u),dt,20);
    this.body.position.y += (Math.sin(this._v31Run*2)*.035 + .025)*run;
    this.chest.rotation.z = lerp(this.chest.rotation.z, Math.sin(this._v31Run)*.05*run, clamp01(dt*14));
  }
};
