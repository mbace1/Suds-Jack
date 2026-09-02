import { Player } from './player.js?v=12';
import { Enemy } from './enemy.js?v=12';

// SKLTR v77 — reliable tester telemetry.
// Snapshot reads are pure; persistence is throttled; arenas finalize only on real transitions.
const report={build:77,started:performance.now(),arenas:[],meleeKills:0,kills:0,hitsTaken:0,damageTaken:0,flowSeconds:0,flowPeak:0,currentFlow:0,enemyShots:0,playerShots:0,nearMisses:0};
let arena=null,patchedPool=false,nearLatch=new WeakSet(),lastPersist=0;
const now=()=>performance.now();
function closeArena(){if(!arena)return;arena.ms=now()-arena.start;report.arenas.push(arena);arena=null}
function snapshot(){return {...report,durationMs:now()-report.started,arenas:report.arenas.map(a=>({...a})),activeArena:arena?{...arena,ms:now()-arena.start}:null}}
function persist(force=false){const t=now();if(!force&&t-lastPersist<750)return;lastPersist=t;try{localStorage.setItem('skltr-last-playtest',JSON.stringify(snapshot()))}catch{}}
function resetReport(){report.started=now();report.arenas.length=0;report.meleeKills=report.kills=report.hitsTaken=report.damageTaken=report.flowSeconds=report.flowPeak=report.currentFlow=report.enemyShots=report.playerShots=report.nearMisses=0;arena=null;nearLatch=new WeakSet();lastPersist=0;persist(true)}
addEventListener('skltr-arena',e=>{closeArena();arena={name:e.detail?.arena||'UNKNOWN',kind:e.detail?.name||'',start:now()};persist(true)});
addEventListener('skltr-melee-kill',()=>{report.meleeKills++;persist(true)});
addEventListener('skltr-victory',()=>{closeArena();persist(true)});
addEventListener('beforeunload',()=>{closeArena();persist(true)});
const oldReset=Player.prototype.reset;
Player.prototype.reset=function(...args){const out=oldReset.apply(this,args);resetReport();return out};
const oldTake=Enemy.prototype.takeDamage;
Enemy.prototype.takeDamage=function(...args){const wasAlive=this.alive;const dead=oldTake.apply(this,args);if(wasAlive&&dead){report.kills++;persist(true)}return dead};
const oldHurt=Player.prototype.hurt;
Player.prototype.hurt=function(d,...rest){const hp=this.hp;const out=oldHurt.call(this,d,...rest);if(this.hp<hp){report.hitsTaken++;report.damageTaken+=hp-this.hp;persist(true)}return out};
const oldUpdate=Player.prototype.update;
Player.prototype.update=function(dt,input,aim,enemies,...rest){
  if(!patchedPool&&this.pool?.spawn){patchedPool=true;const spawn=this.pool.spawn.bind(this.pool);this.pool.spawn=(...a)=>{const o=a[a.length-1]||{};if(o.fromPlayer)report.playerShots++;else report.enemyShots++;return spawn(...a)}}
  const flow=this.flowStacks||0;report.currentFlow=flow;if(flow>0)report.flowSeconds+=dt;report.flowPeak=Math.max(report.flowPeak,flow);
  const speed=Math.hypot(this.vx||0,this.vz||0);
  if(speed>13.5)for(const e of enemies||[]){if(!e?.alive||e.boss)continue;const d=Math.hypot(e.x-this.x,e.z-this.z);const close=(e.r||.7)+.65;if(d<close&&!nearLatch.has(e)){nearLatch.add(e);queueMicrotask(()=>{if(e.alive){report.nearMisses++;persist(true)}})}if(d>close+1.2)nearLatch.delete(e)}
  const out=oldUpdate.call(this,dt,input,aim,enemies,...rest);persist(false);return out
};
window._skltrPlaytest=()=>snapshot();
window._skltrPlaytestFinalize=()=>{closeArena();persist(true);return snapshot()};
