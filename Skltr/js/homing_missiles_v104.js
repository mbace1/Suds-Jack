import * as THREE from 'three';
import { Player } from './player.js?v=12';
import { ProjectilePool } from './projectile.js?v=12';

// SKLTR v101-v104 — movement-first homing missile support.
// Missiles are an automatic secondary weapon: the player keeps moving/auto-firing,
// while a slower, heavier projectile periodically launches at a visible priority target.
// FLOW shortens the reload instead of increasing steering strength, so skill feeds tempo.
const BASE_RELOAD=3.8, SPEED=22, TURN=2.35, DAMAGE=28, LIFE=4.6, RANGE=54;

function visibleTarget(player,en,aim){
  const api=window._skltrBVH96;
  let best=null,bestScore=-Infinity;
  for(const e of en||[]){
    if(!e?.alive)continue;
    const tx=e.x-player.x,ty=(e.y||0)+.45-(player.y+1.15),tz=e.z-player.z;
    const d=Math.hypot(tx,ty,tz);if(d<1||d>RANGE)continue;
    const nx=tx/d,ny=ty/d,nz=tz/d;
    const dot=nx*aim.fx+ny*aim.fy+nz*aim.fz;
    if(dot<.38)continue;
    if(api?.lineClear&&!api.lineClear(player.x,player.y+1.15,player.z,e.x,(e.y||0)+.45,e.z,e.r||.7))continue;
    const score=dot*3+(e.boss?1.4:0)+(1-d/RANGE)*.8;
    if(score>bestScore){bestScore=score;best=e;}
  }
  return best;
}

const oldSpawn=ProjectilePool.prototype.spawn;
ProjectilePool.prototype.spawn=function(x,y,z,dx,dy,dz,o={}){
  const p=oldSpawn.call(this,x,y,z,dx,dy,dz,o);
  if(p&&o.missile){
    p.missile=true;p.homingTarget=o.homingTarget||null;p.turnRate=o.turnRate||TURN;
    p.baseScale*=1.9;p.mesh.scale.set(.8*p.baseScale,.8*p.baseScale,2.9*p.baseScale);
    p.mat.color.setHex(0xffe26a);p.mat.opacity=1;
  }
  return p;
};

const oldPoolUpdate=ProjectilePool.prototype.update;
ProjectilePool.prototype.update=function(dt){
  const enemies=this._skltrEnemies||[];
  for(const p of this.active){
    if(!p.missile)continue;
    let t=p.homingTarget;
    if(!t?.alive){
      let bd=Infinity;t=null;
      for(const e of enemies){if(!e?.alive)continue;const d=Math.hypot(e.x-p.x,(e.y||0)+.45-p.y,e.z-p.z);if(d<bd&&d<26){bd=d;t=e;}}
      p.homingTarget=t;
    }
    if(t?.alive){
      let tx=t.x-p.x,ty=(t.y||0)+.45-p.y,tz=t.z-p.z,d=Math.hypot(tx,ty,tz)||1;
      tx/=d;ty/=d;tz/=d;
      const k=Math.min(1,p.turnRate*dt);
      let nx=p.dx+(tx-p.dx)*k,ny=p.dy+(ty-p.dy)*k,nz=p.dz+(tz-p.dz)*k,n=Math.hypot(nx,ny,nz)||1;
      p.dx=nx/n;p.dy=ny/n;p.dz=nz/n;
    }
    p.mesh.rotation.x+=dt*8;p.mesh.rotation.z+=dt*11;
  }
  return oldPoolUpdate.call(this,dt);
};

const oldReset=Player.prototype.reset;
Player.prototype.reset=function(...a){const r=oldReset.apply(this,a);this._missileT=1.6;return r;};

const oldUpdate=Player.prototype.update;
Player.prototype.update=function(dt,input,aim,en,heightAt,drift){
  this.pool._skltrEnemies=en;
  this._missileT=Math.max(0,(this._missileT??1.6)-dt);
  const out=oldUpdate.call(this,dt,input,aim,en,heightAt,drift);
  if(!this.alive||this._missileT>0)return out;
  const target=visibleTarget(this,en,aim);if(!target)return out;
  const sx=this.x,sy=this.y+1.35,sz=this.z;
  let dx=target.x-sx,dy=(target.y||0)+.45-sy,dz=target.z-sz,d=Math.hypot(dx,dy,dz)||1;dx/=d;dy/=d;dz/=d;
  const p=this.pool.spawn(sx+dx*.55,sy,sz+dz*.55,dx,dy,dz,{fromPlayer:true,speed:SPEED,damage:DAMAGE*this.flowDmgMul(),color:0xffe26a,r:.48,life:LIFE,scale:1.05,missile:true,homingTarget:target,turnRate:TURN});
  if(p){
    const reload=Math.max(2.25,BASE_RELOAD-(this.flowStacks||0)*.45);
    this._missileT=reload;
    dispatchEvent(new CustomEvent('skltr-missile-launch',{detail:{target:target.type,reload}}));
  }
  return out;
};

window._skltrMissiles104=()=>({enabled:true,reload:BASE_RELOAD,speed:SPEED,turnRate:TURN,damage:DAMAGE});
