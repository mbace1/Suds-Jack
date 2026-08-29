import { Enemy, COST } from './enemy.js?v=12';
import { Player } from './player.js?v=12';

// SKLTR v25 — authored enemy order, cadence and formation slots.
// main.js still owns object creation, but no longer chooses encounter composition or placement.
const INF=1e6, BASE={chaser:1,turret:1.5,flyer:1.7,boss:30,boss2:22,boss3:34};
const F=(name,seq,slots,gap=.8)=>({name,seq,slots,gap});
const R=(name,rest)=>({name,rest});
const CARDS=[
 F('HOUND RUN · OPEN',['chaser','chaser','chaser','chaser','chaser'],[[-22,-8],[22,-8],[-26,12],[26,12],[0,26]],.62),
 F('HOUND RUN · CROSS',['turret','chaser','chaser','chaser','chaser','chaser'],[[0,-26],[-22,-2],[22,-2],[-25,20],[25,20],[0,30]],.72),
 R('LINK 1',7),
 F('TORTOISE HEIGHTS · LANES',['turret','turret','chaser','chaser','turret','chaser'],[[-20,16],[18,-17],[-28,0],[28,4],[0,28],[0,-28]],.86),
 F('TORTOISE HEIGHTS · PINCH',['turret','chaser','turret','chaser','turret','chaser','chaser'],[[-24,-18],[-10,28],[24,-18],[28,10],[0,30],[-28,10],[8,-30]],.76),
 R('LINK 2',8),
 F('WASP LIFT · LOOK UP',['flyer','chaser','flyer','chaser','flyer','chaser'],[[-18,24],[-26,0],[18,24],[26,0],[0,-28],[0,30]],.78),
 F('WASP LIFT · STACK',['turret','flyer','chaser','flyer','chaser','flyer','chaser','flyer'],[[0,-30],[-24,18],[-30,-4],[24,18],[30,-4],[-15,-24],[0,30],[15,-24]],.68),
 R('LINK 3',8),
 F('MACHINE YARD · ECOLOGY',['turret','chaser','flyer','chaser','turret','flyer','chaser','flyer','turret','chaser','chaser'],[[-26,-18],[-18,24],[0,-30],[24,18],[28,-8],[-28,8],[0,30],[18,-24],[-8,28],[-30,-2],[30,2]],.60),
 F('MACHINE YARD · CRUSH',['turret','flyer','chaser','chaser','turret','flyer','chaser','turret','flyer','chaser','chaser','flyer','chaser'],[[-30,-14],[0,-30],[-20,24],[20,24],[30,-14],[-26,8],[26,8],[0,30],[-10,-28],[-30,2],[30,2],[10,-28],[0,20]],.52),
 R('FINAL LINK',7),
 F('KILL FLOOR · OVERDRIVE',['turret','flyer','chaser','chaser','flyer','turret','chaser','flyer','chaser','turret','chaser','flyer','chaser','chaser','turret'],[[-30,-18],[0,-32],[-22,24],[22,24],[30,-18],[-28,6],[28,6],[0,30],[-12,-28],[12,-28],[-30,0],[30,0],[-18,18],[18,18],[0,-22]],.46),
 F('LAST STAND · I',['flyer','turret','chaser','chaser','flyer','turret','chaser','chaser','flyer','turret','chaser','chaser','flyer','chaser','chaser','turret','flyer'],[[-30,-20],[0,-32],[-22,24],[22,24],[30,-20],[-28,4],[28,4],[0,30],[-12,-28],[12,-28],[-30,10],[30,10],[-18,18],[18,18],[0,-20],[-8,28],[8,28]],.42),
 F('LAST STAND · II',['turret','flyer','chaser','flyer','chaser','turret','chaser','flyer','chaser','turret','chaser','flyer','chaser','chaser','turret','flyer','chaser','chaser','flyer','turret'],[[-32,-18],[0,-34],[-24,24],[24,24],[32,-18],[-28,4],[28,4],[0,32],[-14,-30],[14,-30],[-32,8],[32,8],[-20,18],[20,18],[0,-22],[-10,28],[10,28],[-26,-8],[26,-8],[0,20]],.38)
];
let card=0,index=0,alive=new Set(),restUntil=0,started=false,nextSpawnAt=0;
const originalPlace=Enemy.prototype.place, originalTake=Enemy.prototype.takeDamage, originalReset=Player.prototype.reset;
function spec(){return CARDS[Math.min(card,CARDS.length-1)]}
function announce(){const s=spec();window.dispatchEvent(new CustomEvent('skltr-arena',{detail:{name:s.rest?'TRAVERSE':'ENCOUNTER',arena:s.name}}))}
function resetCard(){index=0;alive.clear();const s=spec();restUntil=s.rest?performance.now()+s.rest*1000:0;nextSpawnAt=performance.now()+350;announce()}
function resetRun(){card=0;index=0;alive.clear();restUntil=0;started=false;nextSpawnAt=0}
function desired(){const s=spec();return s.rest?null:s.seq[index]||null}
function advance(){const s=spec();for(const e of [...alive])if(!e.alive)alive.delete(e);if(s.rest){if(performance.now()>=restUntil&&card<CARDS.length-1){card++;resetCard()}return}if(index>=s.seq.length&&alive.size===0&&card<CARDS.length-1){card++;resetCard()}}
Player.prototype.reset=function(...args){resetRun();return originalReset.apply(this,args)};
Enemy.prototype.place=function(x,z){const s=spec(),want=desired();if(!this.boss&&want===this.type&&s.slots?.[index]){[x,z]=s.slots[index];index++;alive.add(this);nextSpawnAt=performance.now()+(s.gap||.8)*1000;}return originalPlace.call(this,x,z)};
Enemy.prototype.takeDamage=function(...args){const dead=originalTake.apply(this,args);if(dead){alive.delete(this);queueMicrotask(advance)}return dead};
for(const type of Object.keys(BASE))Object.defineProperty(COST,type,{configurable:true,enumerable:true,get(){if(type.startsWith('boss'))return BASE[type];if(!started){started=true;resetCard()}advance();const want=desired();return want===type&&performance.now()>=nextSpawnAt?BASE[type]:INF}});
window._skltrEncounter=()=>({card,name:spec().name,index,total:spec().seq?.length||0,next:desired(),alive:alive.size,rest:Math.max(0,restUntil-performance.now())});
