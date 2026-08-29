import { Enemy } from './enemy.js?v=12';

// SKLTR v41 — sharper movement problems per regular enemy.
const oldUpdate=Enemy.prototype.update;
Enemy.prototype.update=function(dt,player,pool,heightAt,bound){
  const bx=this.x,bz=this.z;
  oldUpdate.call(this,dt,player,pool,heightAt,bound);
  if(!this.alive||this.boss)return;
  const dx=player.x-this.x,dz=player.z-this.z,d=Math.hypot(dx,dz)||1,nx=dx/d,nz=dz/d;
  if(this.type==='chaser'){
    // HOUND: commits hard through the 3–9m band, then slightly overruns close range.
    if(d>3&&d<9){this.x+=nx*1.25*dt;this.z+=nz*1.25*dt}
    else if(d<1.9){this.x-=nx*.7*dt;this.z-=nz*.7*dt}
  }else if(this.type==='turret'){
    // TORTOISE: owns a lane and refuses melee camping.
    if(d<8){this.x-=nx*1.65*dt;this.z-=nz*1.65*dt}
    const moved=Math.hypot(this.x-bx,this.z-bz);if(d>10&&d<23&&moved>.12){this.x=bx+(this.x-bx)*.55;this.z=bz+(this.z-bz)*.55}
  }else if(this.type==='flyer'){
    // WASP: wider lateral pressure and a more legible altitude rhythm.
    const sideX=-nz*(this._orbit||1),sideZ=nx*(this._orbit||1);
    if(d>9&&d<19){this.x+=sideX*.9*dt;this.z+=sideZ*.9*dt}
    this.y+=(Math.sin(this.bob*1.7)*.16);
  }
  this.x=Math.max(-bound,Math.min(bound,this.x));this.z=Math.max(-bound,Math.min(bound,this.z));
  this.g.position.x=this.x;this.g.position.z=this.z;this.g.position.y=this.y;
};
