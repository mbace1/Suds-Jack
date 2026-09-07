import { Enemy } from './enemy.js?v=12';

// SKLTR v121-v128 — encounter composition makes mixed enemy groups behave as a team.
// HOUND = displacement, TORTOISE = lane denial, WASP = route-change pressure.
// v128 lets the adaptive director weight those roles without changing authored spawns.
let arena='';
addEventListener('skltr-arena',e=>{arena=e.detail?.arena||''});

const oldUpdate=Enemy.prototype.update;
Enemy.prototype.update=function(dt,player,pool,heightAt=()=>0,bound=47,...rest){
  const out=oldUpdate.call(this,dt,player,pool,heightAt,bound,...rest);
  if(!this.alive||this.boss)return out;

  const mixed=arena.includes('MACHINE')||arena.includes('KILL')||arena.includes('LAST');
  const tort=arena.includes('TORTOISE');
  const wasp=arena.includes('WASP');
  const dir=window._skltrAdaptive128?.()||{mode:'BALANCED',role:{hound:1,tortoise:1,wasp:1}};
  const role=dir.role||{};
  const dx=player.x-this.x,dz=player.z-this.z,d=Math.hypot(dx,dz)||1,nx=dx/d,nz=dz/d,tx=-nz,tz=nx;

  if(this.type==='chaser'){
    const side=(this._v124Side??(this._v124Side=Math.random()<.5?-1:1));
    const base=(mixed?1.0:tort?.65:wasp?.8:.45),pressure=base*(role.hound??1);
    if(d>5&&d<18){
      const step=dt*2.0*pressure*side,cx=this.x+tx*step,cz=this.z+tz*step;
      if(Math.hypot(cx,cz)<bound-1&&Math.abs(heightAt(cx,cz)-heightAt(this.x,this.z))<.85){this.x=cx;this.z=cz;}
    }
    if(dir.mode!=='RECOVER'&&(tort||mixed)&&d<9&&d>2.2){this.x+=nx*dt*1.8*(role.hound??1);this.z+=nz*dt*1.8*(role.hound??1);}
  }

  if(this.type==='turret'){
    this._v124LaneT=(this._v124LaneT||0)+dt;
    if((tort||mixed)&&d>12&&d<28&&this._v124LaneT%5.8>3.8){
      const side=(this._v124Lane??(this._v124Lane=Math.random()<.5?-1:1));
      const s=(role.tortoise??1),cx=this.x+tx*side*dt*1.2*s,cz=this.z+tz*side*dt*1.2*s;
      const api=window._skltrBVH96;
      if((!api?.lineClear||api.lineClear(this.x,this.y+.5,this.z,cx,this.y+.5,cz,.08))&&Math.hypot(cx,cz)<bound-1){this.x=cx;this.z=cz;}
      if(this._v124LaneT>11.6){this._v124LaneT=0;this._v124Lane*=-1;}
    }
  }

  if(this.type==='flyer'){
    const api=window._skltrBVH96;
    const los=!api?.lineClear||api.lineClear(this.x,this.y,this.z,player.x,player.y+1.0,player.z,.2);
    if((wasp||mixed)&&!los){
      const s=(role.wasp??1);this.y+=dt*2.4*s;
      const side=(this._v124Air??(this._v124Air=Math.random()<.5?-1:1));
      this.x+=tx*side*dt*1.8*s;this.z+=tz*side*dt*1.8*s;
    }
    if(dir.mode!=='RECOVER'&&mixed&&d<11){const s=(role.wasp??1);this.x-=nx*dt*1.5*s;this.z-=nz*dt*1.5*s;}
  }

  if(this.g){this.g.position.x=this.x;this.g.position.y=this.y;this.g.position.z=this.z;}
  return out;
};

const cue=document.createElement('div');
Object.assign(cue.style,{position:'fixed',left:'50%',top:'18%',transform:'translateX(-50%)',zIndex:'79',font:'800 9px/1 monospace',letterSpacing:'2px',color:'#bfffea',textShadow:'0 0 10px #42ffd980',opacity:'0',pointerEvents:'none',transition:'opacity .2s'});document.body.appendChild(cue);
let timer=0;
addEventListener('skltr-arena',e=>{const a=e.detail?.arena||'';if(a.includes('MACHINE'))cue.textContent='HOUNDS DISPLACE · TORTOISES CUT LANES · WASPS CHANGE ROUTES';else if(a.includes('KILL')||a.includes('LAST'))cue.textContent='FULL ECOLOGY · KEEP MOVING';else return;cue.style.opacity='.72';timer=1.4});
addEventListener('skltr-director-shift',e=>{const m=e.detail?.mode;if(m==='RECOVER')cue.textContent='PRESSURE DROPS · MOVE AND RESET';else if(m==='HUNT')cue.textContent='HOUNDS HUNT STATIC PLAY';else if(m==='DISPLACE')cue.textContent='AERIAL / LANE PRESSURE';else if(m==='OVERDRIVE')cue.textContent='FLOW HIGH · FULL ECOLOGY';else return;cue.style.opacity='.55';timer=.75});
(function tick(){if(timer>0){timer-=1/60;if(timer<=0)cue.style.opacity='0'}requestAnimationFrame(tick)})();

window._skltrComposition124=()=>({arena,mixed:arena.includes('MACHINE')||arena.includes('KILL')||arena.includes('LAST'),director:window._skltrAdaptive128?.()||null});
