import { ProjectilePool } from './projectile.js?v=12';

// SKLTR v153-v156 — runtime pressure guardrails derived from the known v80 failure mode.
// These do not add enemies or damage; they only prevent unreadable projectile pileups.
const W=10000,events=[],stats={suppressed:0,peakHostile:0,peakRate:0};
const MAX_HOSTILE=72,MAX_RATE_PER_MIN=180;
function now(){return performance.now()}
function trim(t){while(events.length&&t-events[0]>W)events.shift()}
function rate(t){trim(t);return events.length*(60000/W)}

const oldSpawn=ProjectilePool.prototype.spawn;
ProjectilePool.prototype.spawn=function(x,y,z,dx,dy,dz,o={}){
  if(!o.fromPlayer){
    const t=now(),hostile=this.active.reduce((n,p)=>n+(!p.fromPlayer?1:0),0),r=rate(t);
    stats.peakHostile=Math.max(stats.peakHostile,hostile);stats.peakRate=Math.max(stats.peakRate,r);
    // Never suppress tracking missiles here; the dedicated missile layer caps them at two.
    if(!o.enemyHoming&&(hostile>=MAX_HOSTILE||r>=MAX_RATE_PER_MIN)){
      stats.suppressed++;dispatchEvent(new CustomEvent('skltr-pressure-suppressed',{detail:{hostile,rate:r}}));return null;
    }
    events.push(t);
  }
  return oldSpawn.call(this,x,y,z,dx,dy,dz,o);
};

window._skltrGuardrails156=()=>({suppressed:stats.suppressed,peakHostile:stats.peakHostile,peakRate:Math.round(stats.peakRate),liveHostile:null,capHostile:MAX_HOSTILE,capRate:MAX_RATE_PER_MIN});
