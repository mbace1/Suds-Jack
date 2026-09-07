import { Player } from './player.js?v=12';
import { Enemy } from './enemy.js?v=12';

// SKLTR v129-v132 — traversal, architecture and enemy placement become one combat puzzle.
// Hero solids stop the player before CONTACT melee resolves. Low hero rails are checked
// at knee/chest height, so they block a grounded run but clear naturally when jumped.
let arena='',bumps=0,routeEntries=0,lastRoute='';
addEventListener('skltr-arena',e=>{arena=e.detail?.arena||'';lastRoute=''});

const ROUTES={
  HOUND:[{x:0,z:8,r:5,name:'CENTER VAULT'},{x:-24,z:19,r:5,name:'LEFT CUT'},{x:24,z:25,r:5,name:'RIGHT CUT'}],
  TORTOISE:[{x:-17,z:-6,r:6,name:'LOW APERTURE'},{x:19,z:16,r:6,name:'HIGH APERTURE'}],
  WASP:[{x:0,z:13,r:6,name:'UNDER RING'},{x:-19,z:14,r:5,name:'LEFT AIR CUT'},{x:19,z:14,r:5,name:'RIGHT AIR CUT'}],
  MACHINE:[{x:-24,z:-18,r:6,name:'WEST GANTRY'},{x:25,z:20,r:6,name:'EAST GANTRY'},{x:0,z:8,r:6,name:'CENTER VAULT'}],
  KILL:[{x:0,z:-24,r:6,name:'SOUTH APERTURE'},{x:0,z:25,r:6,name:'NORTH APERTURE'}]
};
function routes(){if(arena.includes('TORTOISE'))return ROUTES.TORTOISE;if(arena.includes('WASP'))return ROUTES.WASP;if(arena.includes('MACHINE'))return ROUTES.MACHINE;if(arena.includes('KILL')||arena.includes('LAST'))return ROUTES.KILL;return ROUTES.HOUND}
function heroHit(hit){return !!hit?.object?.userData?.skltrHeroSolid}

const oldOffense=Player.prototype._movementOffense;
Player.prototype._movementOffense=function(dt,en,px=this.x,pz=this.z){
  const api=window._skltrBVH96;
  if(api?.segmentHit&&Math.hypot(this.x-px,this.z-pz)>.02){
    const knee=api.segmentHit(px,this.y+.34,pz,this.x,this.y+.34,this.z,.18);
    const chest=api.segmentHit(px,this.y+1.02,pz,this.x,this.y+1.02,this.z,.18);
    if(heroHit(knee)||heroHit(chest)){
      this.x=px;this.z=pz;this.vx*=.22;this.vz*=.22;bumps++;
      dispatchEvent(new CustomEvent('skltr-route-blocked',{detail:{arena,jumpRail:!!(knee?.object?.userData?.skltrJumpRail||chest?.object?.userData?.skltrJumpRail)}}));
    }
  }
  for(const r of routes()){
    if(Math.hypot(this.x-r.x,this.z-r.z)<r.r){if(lastRoute!==r.name){lastRoute=r.name;routeEntries++;dispatchEvent(new CustomEvent('skltr-route-enter',{detail:{arena,route:r.name}}));}break;}
  }
  return oldOffense.call(this,dt,en,px,pz);
};

// Authored ranged anchors are nudged away from traversal corridors after their normal
// encounter slot has been chosen. HOUNDs may invade the route; that is their job.
const oldPlace=Enemy.prototype.place;
Enemy.prototype.place=function(x,z){
  const out=oldPlace.call(this,x,z);
  if(this.alive&&this.t?.ranged&&!this.boss){
    for(const r of routes()){
      let dx=this.x-r.x,dz=this.z-r.z,d=Math.hypot(dx,dz);
      const keep=r.r+2.2;
      if(d<keep){if(d<.01){dx=1;dz=0;d=1}const push=keep-d;this.x+=dx/d*push;this.z+=dz/d*push;if(this.g){this.g.position.x=this.x;this.g.position.z=this.z;}}
    }
  }
  return out;
};

window._skltrTraversal132=()=>({arena,bumps,routeEntries,lastRoute,routes:routes().map(r=>r.name)});
