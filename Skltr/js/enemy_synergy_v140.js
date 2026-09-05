import { Enemy } from './enemy.js?v=12';

// SKLTR v137-v140 — a small elite layer that only matters through role synergy.
// No loot rarity ladder: elites make the existing HOUND/TORTOISE/WASP ecology sharper.
let arena='',serial=0;const live=new Set(),stats={elites:0,synergyTicks:0};
addEventListener('skltr-arena',e=>{arena=e.detail?.arena||''});
const mixed=()=>arena.includes('MACHINE')||arena.includes('KILL')||arena.includes('LAST');
const oldPlace=Enemy.prototype.place;
Enemy.prototype.place=function(...a){const out=oldPlace.apply(this,a);if(!this.boss){live.add(this);serial++;if(mixed()&&serial%4===0){this._elite140=true;this.maxHp=Math.round(this.maxHp*1.32);this.hp=Math.round(this.hp*1.32);this.r*=1.06;stats.elites++;if(this.edge){this.edge.color.setHex(this.type==='chaser'?0xff8d72:this.type==='turret'?0xffd27a:0x9dfff3);this.restColor=this.edge.color.getHex();}this.g?.scale.setScalar(1.08);dispatchEvent(new CustomEvent('skltr-elite',{detail:{type:this.type}}));}}return out};
const oldDamage=Enemy.prototype.takeDamage;
Enemy.prototype.takeDamage=function(...a){const dead=oldDamage.apply(this,a);if(dead)live.delete(this);return dead};
const oldDispose=Enemy.prototype.dispose;
Enemy.prototype.dispose=function(...a){live.delete(this);return oldDispose.apply(this,a)};
const oldUpdate=Enemy.prototype.update;
Enemy.prototype.update=function(dt,player,pool,heightAt,bound,...rest){const out=oldUpdate.call(this,dt,player,pool,heightAt,bound,...rest);if(!this.alive||!this._elite140||this.boss)return out;
  let partner=null,best=1e9;for(const e of live){if(e===this||!e.alive||e.type===this.type)continue;const d=Math.hypot(e.x-this.x,e.z-this.z);if(d<best){best=d;partner=e}}
  if(partner&&best<15){stats.synergyTicks++;const dx=player.x-this.x,dz=player.z-this.z,d=Math.hypot(dx,dz)||1,nx=dx/d,nz=dz/d,tx=-nz,tz=nx;
    if(this.type==='chaser'){const side=this._eliteSide||(this._eliteSide=Math.random()<.5?-1:1);this.x+=tx*side*dt*1.25;this.z+=tz*side*dt*1.25;}
    else if(this.type==='turret'){this.cd=Math.max(0,(this.cd||0)-dt*.16);}
    else if(this.type==='flyer'){this.y+=Math.sin(performance.now()*.004+this.bob)*dt*.9;this.cd=Math.max(0,(this.cd||0)-dt*.10);}
    if(this.g){this.g.position.set(this.x,this.y,this.z)}
  }
  return out;
};
const cue=document.createElement('div');Object.assign(cue.style,{position:'fixed',right:'12px',bottom:'74px',zIndex:'81',font:'800 9px monospace',letterSpacing:'2px',color:'#ffe4a0',opacity:'0',pointerEvents:'none',transition:'opacity .2s'});document.body.appendChild(cue);let t=0;addEventListener('skltr-elite',e=>{cue.textContent=`ELITE ${String(e.detail?.type||'').toUpperCase()} · BREAK THE PAIR`;cue.style.opacity='.72';t=1.2});(function tick(){if(t>0){t-=1/60;if(t<=0)cue.style.opacity='0'}requestAnimationFrame(tick)})();
window._skltrElites140=()=>({live:[...live].filter(e=>e.alive).length,elites:stats.elites,synergyTicks:stats.synergyTicks});
