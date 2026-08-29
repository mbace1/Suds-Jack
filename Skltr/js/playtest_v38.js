import { Player } from './player.js?v=12';

// SKLTR v38 — local, zero-backend playtest instrumentation.
// Keeps a per-run report in memory/localStorage and exposes window._skltrPlaytest().
const report={build:38,started:performance.now(),arenas:[],meleeKills:0,kills:0,hitsTaken:0,damageTaken:0,flowSeconds:0,flowPeak:0,enemyShots:0,playerShots:0,nearMisses:0};
let arena=null, patchedPool=false, nearLatch=new WeakSet();
function now(){return performance.now()}
function closeArena(){if(arena){arena.ms=now()-arena.start;report.arenas.push(arena);arena=null}}
function persist(){try{localStorage.setItem('skltr-last-playtest',JSON.stringify({...report,durationMs:now()-report.started}))}catch{}}
addEventListener('skltr-arena',e=>{closeArena();arena={name:e.detail?.arena||'UNKNOWN',kind:e.detail?.name||'',start:now()};persist()});
addEventListener('skltr-melee-kill',()=>{report.meleeKills++;persist()});
addEventListener('beforeunload',()=>{closeArena();persist()});
const oldReset=Player.prototype.reset;
Player.prototype.reset=function(...args){const out=oldReset.apply(this,args);report.started=now();report.arenas.length=0;report.meleeKills=report.kills=report.hitsTaken=report.damageTaken=report.flowSeconds=report.flowPeak=report.enemyShots=report.playerShots=report.nearMisses=0;arena=null;nearLatch=new WeakSet();persist();return out};
const oldAddKill=Player.prototype.addKill;
Player.prototype.addKill=function(...args){report.kills++;return oldAddKill.apply(this,args)};
const oldHurt=Player.prototype.hurt;
Player.prototype.hurt=function(d,...rest){const hp=this.hp;const out=oldHurt.call(this,d,...rest);if(this.hp<hp){report.hitsTaken++;report.damageTaken+=hp-this.hp;persist()}return out};
const oldUpdate=Player.prototype.update;
Player.prototype.update=function(dt,input,aim,enemies,...rest){
  if(!patchedPool&&this.pool?.spawn){patchedPool=true;const spawn=this.pool.spawn.bind(this.pool);this.pool.spawn=(...a)=>{const o=a[a.length-1]||{};if(o.fromPlayer)report.playerShots++;else report.enemyShots++;return spawn(...a)}}
  if((this.flowStacks||0)>0)report.flowSeconds+=dt;
  report.flowPeak=Math.max(report.flowPeak,this.flowStacks||0);
  const speed=Math.hypot(this.vx||0,this.vz||0);
  if(speed>13.5)for(const e of enemies||[]){if(!e?.alive||e.boss)continue;const d=Math.hypot(e.x-this.x,e.z-this.z);const close=(e.r||.7)+.65;if(d<close&&!nearLatch.has(e)){nearLatch.add(e);queueMicrotask(()=>{if(e.alive){report.nearMisses++;persist()}})}if(d>close+1.2)nearLatch.delete(e)}
  const out=oldUpdate.call(this,dt,input,aim,enemies,...rest);persist();return out
};
window._skltrPlaytest=()=>{closeArena();persist();return JSON.parse(localStorage.getItem('skltr-last-playtest')||JSON.stringify(report))};
