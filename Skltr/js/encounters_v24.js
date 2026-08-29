import { Enemy, COST } from './enemy.js?v=24';

// SKLTR v24 encounter state controller.
// This replaces time-only density steering with finite encounter cards. The legacy
// main loop remains the spawn executor, but it may only buy the enemy type currently
// requested by this controller. A card enters CLEAR only after its finite quota has
// spawned and those enemies have been killed. Recovery links explicitly lock spawning.
const INF=1e6;
const BASE={chaser:1,turret:1.5,flyer:1.7,boss:30,boss2:22,boss3:34};
const CARDS=[
 {name:'HOUND RUN · OPEN',quota:{chaser:5}},
 {name:'HOUND RUN · CROSS',quota:{chaser:5,turret:1}},
 {name:'LINK 1',rest:7},
 {name:'TORTOISE HEIGHTS · LANES',quota:{chaser:3,turret:3}},
 {name:'TORTOISE HEIGHTS · PINCH',quota:{chaser:4,turret:3}},
 {name:'LINK 2',rest:8},
 {name:'WASP LIFT · LOOK UP',quota:{chaser:3,flyer:3}},
 {name:'WASP LIFT · STACK',quota:{chaser:3,turret:1,flyer:4}},
 {name:'LINK 3',rest:8},
 {name:'MACHINE YARD · ECOLOGY',quota:{chaser:5,turret:3,flyer:3}},
 {name:'MACHINE YARD · CRUSH',quota:{chaser:6,turret:3,flyer:4}},
 {name:'FINAL LINK',rest:7},
 {name:'KILL FLOOR · OVERDRIVE',quota:{chaser:7,turret:4,flyer:4}},
 {name:'LAST STAND · I',quota:{chaser:8,turret:4,flyer:5}},
 {name:'LAST STAND · II',quota:{chaser:9,turret:5,flyer:6}},
];
let card=0,spawned={},alive=new Set(),restUntil=0,lastProgress=performance.now(),started=false;
const originalPlace=Enemy.prototype.place,originalTake=Enemy.prototype.takeDamage;
function spec(){return CARDS[Math.min(card,CARDS.length-1)]}
function announce(){const s=spec();window.dispatchEvent(new CustomEvent('skltr-arena',{detail:{name:s.rest?'TRAVERSE':'ENCOUNTER',arena:s.name}}));}
function resetCard(){spawned={};alive.clear();const s=spec();restUntil=s.rest?performance.now()+s.rest*1000:0;lastProgress=performance.now();announce();}
function wanted(type){const s=spec();if(s.rest)return false;const q=s.quota?.[type]||0;return(spawned[type]||0)<q;}
function advanceIfClear(){const s=spec();if(s.rest){if(performance.now()>=restUntil){card=Math.min(card+1,CARDS.length-1);resetCard();}return;}const quotaDone=Object.entries(s.quota||{}).every(([t,n])=>(spawned[t]||0)>=n);for(const e of [...alive])if(!e.alive)alive.delete(e);if(quotaDone&&alive.size===0&&card<CARDS.length-1){card++;resetCard();}}
Enemy.prototype.place=function(...args){const r=originalPlace.apply(this,args);if(!this.boss&&wanted(this.type)){spawned[this.type]=(spawned[this.type]||0)+1;alive.add(this);lastProgress=performance.now();}return r;};
Enemy.prototype.takeDamage=function(...args){const dead=originalTake.apply(this,args);if(dead){alive.delete(this);queueMicrotask(advanceIfClear);}return dead;};
for(const type of Object.keys(BASE))Object.defineProperty(COST,type,{configurable:true,enumerable:true,get(){if(type.startsWith('boss'))return BASE[type];advanceIfClear();if(!started){started=true;resetCard();}return wanted(type)?BASE[type]:INF;}});
window._skltrEncounter=()=>({card,name:spec().name,spawned:{...spawned},alive:alive.size,wants:Object.keys(BASE).filter(t=>!t.startsWith('boss')&&wanted(t))});
