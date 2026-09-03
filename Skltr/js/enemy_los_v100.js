import { Enemy } from './enemy.js?v=12';

// SKLTR v97-v100 — ranged enemies must earn a sightline.
// Uses the shared three-mesh-bvh query from bvh_world_v96: blocked enemies stop
// firing through architecture and slide laterally toward a real firing lane.
const oldUpdate=Enemy.prototype.update;

function clear(api,ax,ay,az,bx,by,bz,pad=.1){
  return !api?.lineClear || api.lineClear(ax,ay,az,bx,by,bz,pad);
}

Enemy.prototype.update=function(dt,player,pool,heightAt=()=>0,bound=47,...rest){
  if(!this.alive || !this.ranged || this.boss)
    return oldUpdate.call(this,dt,player,pool,heightAt,bound,...rest);

  const api=window._skltrBVH96;
  if(!api?.lineClear)return oldUpdate.call(this,dt,player,pool,heightAt,bound,...rest);

  const eyeY=(this.y||0)+.55,targetY=(player.y||0)+1.0;
  const losBefore=clear(api,this.x,eyeY,this.z,player.x,targetY,player.z,.12);
  const emitted=[];
  const originalSpawn=pool.spawn.bind(pool);
  const proxy=Object.create(pool);
  proxy.spawn=(...args)=>{emitted.push(args);return null;};

  const out=oldUpdate.call(this,dt,player,proxy,heightAt,bound,...rest);
  const nowEye=(this.y||0)+.55;
  const losAfter=clear(api,this.x,nowEye,this.z,player.x,targetY,player.z,.12);

  if(losAfter){
    // A newly recovered lane gets a brief readable settle instead of an instant shot.
    if(this._v100Blocked>0.18 && !losBefore)this.cd=Math.max(this.cd||0,.20);
    emitted.forEach(a=>originalSpawn(...a));
    this._v100Blocked=0;
  }else{
    this._v100Blocked=(this._v100Blocked||0)+dt;
    // Suppress all shots that native behavior attempted while occluded.
    // Reposition only after cover has clearly interrupted the engagement.
    if(this._v100Blocked>.24){
      if(!this._v100Side)this._v100Side=Math.random()<.5?-1:1;
      const dx=player.x-this.x,dz=player.z-this.z,d=Math.hypot(dx,dz)||1;
      const px=-dz/d*this._v100Side,pz=dx/d*this._v100Side;
      const pace=this.type==='flyer'?2.25:1.05;
      const step=Math.min(.22,dt*pace);
      const cx=this.x+px*step,cz=this.z+pz*step;
      const within=Math.hypot(cx,cz)<Math.max(8,bound-1.25);
      const pathClear=clear(api,this.x,nowEye,this.z,cx,nowEye,cz,.08);
      const g0=heightAt(this.x,this.z),g1=heightAt(cx,cz);
      if(within&&pathClear&&Math.abs(g1-g0)<1.3){
        this.x=cx;this.z=cz;
        if(this.g){this.g.position.x=cx;this.g.position.z=cz;}
      }
      // Don't let one bad side trap a ranged unit forever behind the same mass.
      if(this._v100Blocked>1.15){this._v100Side*=-1;this._v100Blocked=.42;}
    }
  }
  return out;
};

window._skltrEnemyLOS100=()=>({enabled:true,bvh:!!window._skltrBVH96});
