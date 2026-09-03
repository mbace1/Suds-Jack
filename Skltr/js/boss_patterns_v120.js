import { Enemy } from './enemy.js?v=12';

// SKLTR v120 — bosses speak the same readable combat language as regular enemies:
// lanes, gaps, tracking pressure and movement windows instead of undifferentiated spam.
const oldUpdate=Enemy.prototype.update;

function norm(x,y,z){const d=Math.hypot(x,y,z)||1;return[x/d,y/d,z/d]}
function fire(pool,e,dx,dy,dz,o={}){const [x,y,z]=norm(dx,dy,dz);return pool.spawn(e.x,e.y,e.z,x,y,z,{fromPlayer:false,speed:o.speed??10.5,damage:o.damage??e.dmg,color:o.color??0xff6f4d,r:o.r??.48,life:o.life??6,scale:o.scale??1.3,enemyHoming:o.enemyHoming,enemyTurn:o.enemyTurn})}
function aimed(e,p){return norm(p.x-e.x,(p.y+1.0)-e.y,p.z-e.z)}

Enemy.prototype.update=function(dt,player,pool,heightAt=()=>0,bound=47,...rest){
  if(!this.alive||!this.boss)return oldUpdate.call(this,dt,player,pool,heightAt,bound,...rest);

  const emitted=[],real=pool.spawn.bind(pool),proxy=Object.create(pool);proxy.spawn=(...a)=>{emitted.push(a);return null};
  const out=oldUpdate.call(this,dt,player,proxy,heightAt,bound,...rest);
  if(!emitted.length)return out;

  this._v120Boss=(this._v120Boss||0)+1;
  const hp=this.maxHp?this.hp/this.maxHp:1,phase=hp>.66?0:hp>.33?1:2,mode=this._v120Boss%(3+phase);
  const [ax,ay,az]=aimed(this,player),base=Math.atan2(az,ax);

  if(this.type==='boss'){
    if(mode===0){
      const n=phase===0?16:20;
      for(let i=0;i<n;i++){if(i===3||i===4||i===11||i===12)continue;const a=i/n*Math.PI*2+(this.spin||0);fire(pool,this,Math.cos(a),0,Math.sin(a),{speed:9.2+phase*.7,scale:1.25});}
      dispatchEvent(new CustomEvent('skltr-boss-attack',{detail:{boss:'WARBEAR',attack:'GAPPED RING'}}));
    }else if(mode===1){
      const spread=phase===2?4:3;
      for(let i=-spread;i<=spread;i++){const a=base+i*.145;fire(pool,this,Math.cos(a),ay,Math.sin(a),{speed:12.2+phase,scale:1.18});}
      dispatchEvent(new CustomEvent('skltr-boss-attack',{detail:{boss:'WARBEAR',attack:'HUNTING WEDGE'}}));
    }else{
      for(let arm=0;arm<4+phase;arm++){const a=(arm/(4+phase))*Math.PI*2+(this.spin||0)*1.6;for(let j=0;j<2;j++)fire(pool,this,Math.cos(a),0,Math.sin(a),{speed:7.4+j*3.2,scale:1.34});}
      dispatchEvent(new CustomEvent('skltr-boss-attack',{detail:{boss:'WARBEAR',attack:'ROTATING SPOKES'}}));
    }
    return out;
  }

  if(this.type==='boss2'){
    if(mode===0){
      for(let i=-2;i<=2;i++){const a=base+i*.19;fire(pool,this,Math.cos(a),ay+(i%2)*.035,Math.sin(a),{speed:13.8,scale:1.18});}
      dispatchEvent(new CustomEvent('skltr-boss-attack',{detail:{boss:'STAG',attack:'FIVE-POINT FAN'}}));
    }else if(mode===1){
      fire(pool,this,ax,ay,az,{speed:7.2,life:6.4,damage:this.dmg*.9,scale:1.55,r:.5,enemyHoming:true,enemyTurn:.58,color:0xff6f4d});
      for(const s of[-1,1]){const a=base+s*.28;fire(pool,this,Math.cos(a),ay*.75,Math.sin(a),{speed:11.8,scale:1.08});}
      dispatchEvent(new CustomEvent('skltr-enemy-missile',{detail:{x:this.x,y:this.y,z:this.z,boss:true}}));
      dispatchEvent(new CustomEvent('skltr-boss-attack',{detail:{boss:'STAG',attack:'HOMING HUNT'}}));
    }else{
      for(let i=0;i<4;i++){const a=i*Math.PI*.5+(this.spin||0)*.45;fire(pool,this,Math.cos(a),0,Math.sin(a),{speed:10.4,scale:1.25});}
      dispatchEvent(new CustomEvent('skltr-boss-attack',{detail:{boss:'STAG',attack:'CROSS LANES'}}));
    }
    return out;
  }

  if(this.type==='boss3'){
    if(mode%2===0){
      const arms=4+phase*2;
      for(let i=0;i<arms;i++){const a=i/arms*Math.PI*2+(this.spin||0)*2.1;fire(pool,this,Math.cos(a),0,Math.sin(a),{speed:8.4,scale:1.2});}
      dispatchEvent(new CustomEvent('skltr-boss-attack',{detail:{boss:'NEST',attack:'SPIRAL ARMS'}}));
    }else{
      const n=12+phase*4;
      for(let i=0;i<n;i++){if(i%5===0)continue;const a=i/n*Math.PI*2-(this.spin||0);fire(pool,this,Math.cos(a),0,Math.sin(a),{speed:10.7,scale:1.15});}
      dispatchEvent(new CustomEvent('skltr-boss-attack',{detail:{boss:'NEST',attack:'BROKEN HALO'}}));
    }
    return out;
  }

  emitted.forEach(a=>real(...a));return out;
};

const cue=document.createElement('div');Object.assign(cue.style,{position:'fixed',left:'50%',top:'13%',transform:'translateX(-50%)',zIndex:'80',font:'900 10px/1 monospace',letterSpacing:'3px',color:'#ffd8a8',textShadow:'0 0 12px #ff704080',opacity:'0',pointerEvents:'none',transition:'opacity .18s'});document.body.appendChild(cue);let timer=0;
addEventListener('skltr-boss-attack',e=>{cue.textContent=`${e.detail?.boss||'BOSS'} · ${e.detail?.attack||'ATTACK'}`;cue.style.opacity='.78';timer=1.0});
(function tick(){if(timer>0){timer-=1/60;if(timer<=0)cue.style.opacity='0'}requestAnimationFrame(tick)})();
window._skltrBossPatterns120=()=>({warbear:3,stag:3,nest:2,phases:3});
