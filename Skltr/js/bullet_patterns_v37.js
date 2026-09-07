import { Enemy } from './enemy.js?v=12';

// SKLTR v37 — Returnal-style projectile choreography.
// Preserve enemy cadence/count, but turn raw volleys into readable lanes, ladders,
// wavefronts and rings with intentional gaps.
const oldUpdate = Enemy.prototype.update;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const rotate = (x,z,a) => ({x:x*Math.cos(a)-z*Math.sin(a), z:x*Math.sin(a)+z*Math.cos(a)});

Enemy.prototype.update = function(dt, player, pool, ...rest){
  const emitted=[];
  const originalSpawn=pool.spawn.bind(pool);
  const proxy=Object.create(pool);
  proxy.spawn=(...args)=>{ emitted.push(args); return null; };

  oldUpdate.call(this,dt,player,proxy,...rest);
  if(!emitted.length) return;

  const fire=(args)=>originalSpawn(...args);
  const type=this.type;

  if(type==='turret' && emitted.length===5){
    // TORTOISE: one readable lane fan with a bowed wavefront. Same 5 bullets,
    // different speeds create obvious threading space instead of a flat wall.
    const speeds=[9.2,10.5,12.2,10.5,9.2];
    emitted.forEach((a,i)=>{ a[6]={...a[6],speed:speeds[i],scale:1.28}; fire(a); });
    return;
  }

  if(type==='flyer' && emitted.length===3){
    // WASP: vertical ladder. Center arrives first; upper/lower rails trail behind.
    const speeds=[13.8,16.6,13.8];
    emitted.forEach((a,i)=>{ a[6]={...a[6],speed:speeds[i],scale:i===1?1.28:1.08}; fire(a); });
    return;
  }

  if(type==='boss' && emitted.length>=18){
    // WARBEAR ring: carve a deliberate escape wedge aimed toward the player.
    const target=Math.atan2(player.z-this.z,player.x-this.x);
    for(const a of emitted){
      const ang=Math.atan2(a[5],a[3]);
      if(Math.abs(wrap(ang-target))<0.34) continue;
      a[6]={...a[6],speed:9.6,scale:1.22}; fire(a);
    }
    return;
  }

  if(type==='boss' && emitted.length===7){
    // Aimed fan: central lane arrives first, outer lanes hang back.
    const speeds=[10.6,11.5,12.8,14.2,12.8,11.5,10.6];
    emitted.forEach((a,i)=>{ a[6]={...a[6],speed:speeds[i],scale:1.2}; fire(a); });
    return;
  }

  if(type==='boss2' && emitted.length===3){
    // STAG: three clear rails rather than a homogenous burst.
    const speeds=[12.2,15.8,12.2];
    emitted.forEach((a,i)=>{ a[6]={...a[6],speed:speeds[i],scale:i===1?1.3:1.12}; fire(a); });
    return;
  }

  if(type==='boss3' && emitted.length===4){
    // NEST: rotating four-arm spiral, alternating inner/outer arrival times.
    emitted.forEach((a,i)=>{
      const r=rotate(a[3],a[5], i%2===0?.08:-.08);
      a[3]=r.x;a[5]=r.z;a[6]={...a[6],speed:i%2===0?8.2:10.4,scale:1.18};fire(a);
    });
    return;
  }

  // Fallback: preserve existing behavior exactly.
  emitted.forEach(fire);
};
