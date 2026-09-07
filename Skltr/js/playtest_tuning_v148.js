import { ProjectilePool } from './projectile.js?v=12';

// SKLTR v145-v148 — instrumented 3-minute tuning pass.
// Guardrails target the failure modes already measured: unreadable projectile overlap,
// too many simultaneous tracking threats, and a death screen with no restart path.
const T={start:performance.now(),enemyShots:0,playerShots:0,maxEnemyMissiles:0,directorShifts:0,routeBlocks:0,melee:0,nearMiss:0,shotDown:0,report:null};
const oldSpawn=ProjectilePool.prototype.spawn;
ProjectilePool.prototype.spawn=function(...a){const p=oldSpawn.apply(this,a);if(p){if(p.fromPlayer)T.playerShots++;else T.enemyShots++;}return p};
const oldUpdate=ProjectilePool.prototype.update;
ProjectilePool.prototype.update=function(dt){
  // At most two live tracking missiles. Extra ones keep flying but lose homing immediately.
  const tracking=this.active.filter(p=>p.enemyHoming);T.maxEnemyMissiles=Math.max(T.maxEnemyMissiles,tracking.length);
  if(tracking.length>2)for(let i=2;i<tracking.length;i++){tracking[i].enemyHoming=false;tracking[i].mat.opacity=.65;}
  return oldUpdate.call(this,dt);
};
addEventListener('skltr-director-shift',()=>T.directorShifts++);addEventListener('skltr-route-blocked',()=>T.routeBlocks++);addEventListener('skltr-melee-kill',()=>T.melee++);addEventListener('skltr-missile-nearmiss',()=>T.nearMiss++);addEventListener('skltr-missile-shotdown',()=>T.shotDown++);
function snapshot(){const sec=Math.max(1,(performance.now()-T.start)/1000),pt=window._skltrPlaytest?.()||{},miss=window._skltrMissileGameplay136?.()||{},dir=window._skltrAdaptive128?.()||{},trav=window._skltrTraversal132?.()||{},elite=window._skltrElites140?.()||{};return{seconds:Math.round(sec),enemyShotsPerMin:Math.round(T.enemyShots/(sec/60)),playerShotsPerMin:Math.round(T.playerShots/(sec/60)),melee:T.melee,missileNearMiss:T.nearMiss,missileShotDown:T.shotDown,maxTrackingMissiles:T.maxEnemyMissiles,directorShifts:T.directorShifts,routeBlocks:T.routeBlocks,flow:pt.flowPeak||dir.flow||0,director:dir.mode||'',routes:trav.routeEntries||0,elites:elite.elites||0,missileStats:miss};}
setTimeout(()=>{T.report=snapshot();try{localStorage.setItem('skltr-v148-tune',JSON.stringify(T.report))}catch{}dispatchEvent(new CustomEvent('skltr-tune-report',{detail:T.report}));},180000);

// Repair the old screenshot-only death layer: preserve the report, add one explicit restart.
const obs=new MutationObserver(()=>{const w=document.getElementById('skltr-death-v84');if(!w||w.querySelector('[data-v148-restart]'))return;w.style.pointerEvents='auto';const card=w.firstElementChild;if(!card)return;const b=document.createElement('button');b.dataset.v148Restart='1';b.textContent='RESTART RUN';Object.assign(b.style,{marginTop:'14px',width:'100%',padding:'12px',border:'1px solid #9bfff088',background:'#071218',color:'#bfffea',font:'900 12px monospace',letterSpacing:'3px',cursor:'pointer'});b.onclick=()=>location.reload();card.appendChild(b);});obs.observe(document.documentElement,{childList:true,subtree:true});
window._skltrTune148=()=>T.report||snapshot();
