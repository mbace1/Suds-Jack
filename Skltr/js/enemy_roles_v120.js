import { Enemy } from './enemy.js?v=12';

// SKLTR v117-v120 — enemy movement roles become explicit combat problems.
// HOUND flanks before committing, TORTOISE alternates hold/reposition beats,
// WASP changes altitude while orbiting. Existing LOS/BVH rules stay authoritative.
const oldUpdate=Enemy.prototype.update;

Enemy.prototype.update=function(dt,player,pool,heightAt=()=>0,bound=47,...rest){
  if(!this.alive)return oldUpdate.call(this,dt,player,pool,heightAt,bound,...rest);
  const out=oldUpdate.call(this,dt,player,pool,heightAt,bound,...rest);
  if(!this.alive||this.boss)return out;

  const dx=player.x-this.x,dz=player.z-this.z,d=Math.hypot(dx,dz)||1,nx=dx/d,nz=dz/d,tx=-nz,tz=nx;

  if(this.type==='chaser'){
    this._v120Clock=(this._v120Clock||0)+dt;
    if(this._v120Side===undefined)this._v120Side=Math.random()<.5?-1:1;
    if(d>6&&d<17){
      const flank=this._v120Clock%3.2<1.45;
      if(flank){
        const step=dt*3.0*this._v120Side;
        const cx=this.x+tx*step,cz=this.z+tz*step;
        const g0=heightAt(this.x,this.z),g1=heightAt(cx,cz);
        if(Math.abs(g1-g0)<.9&&Math.hypot(cx,cz)<bound-1){this.x=cx;this.z=cz;}
      }else if(this._v120Clock%3.2<2.05){
        this.x+=nx*dt*4.4;this.z+=nz*dt*4.4;
        if(this.flash<=0)this.edge.color.setHex(0xff6b5c);
      }
      if(this._v120Clock>6.4){this._v120Clock=0;this._v120Side*=-1;}
    }
  }else if(this.type==='turret'){
    this._v120Beat=(this._v120Beat||0)+dt;
    const cycle=this._v120Beat%5.2;
    if(cycle>3.4&&d>11&&d<27){
      const side=this._v120Side||(this._v120Side=Math.random()<.5?-1:1);
      const step=dt*1.55*side,cx=this.x+tx*step,cz=this.z+tz*step;
      const api=window._skltrBVH96;
      const clear=!api?.lineClear||api.lineClear(this.x,this.y+.4,this.z,cx,this.y+.4,cz,.08);
      if(clear&&Math.hypot(cx,cz)<bound-1){this.x=cx;this.z=cz;}
    }
    if(cycle<.75&&this.flash<=0)this.edge.color.setHex(0xffc36b);
    if(this._v120Beat>10.4){this._v120Beat=0;this._v120Side*=-1;}
  }else if(this.type==='flyer'){
    this._v120Wave=(this._v120Wave||Math.random()*6)+dt;
    const lift=Math.sin(this._v120Wave*1.45)*1.05+Math.sin(this._v120Wave*.55)*.45;
    this.y=this.t.y+lift;
    if(this.g)this.g.position.y=this.y;
    if(d<9){this.x-=nx*dt*2.8;this.z-=nz*dt*2.8;}
  }

  if(this.g){this.g.position.x=this.x;this.g.position.z=this.z;}
  return out;
};

window._skltrEnemyRoles120=()=>({hound:'flank/commit',tortoise:'hold/reposition',wasp:'orbit/altitude'});
