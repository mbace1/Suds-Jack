import { Enemy, COST } from './enemy.js?v=12';
import { Player } from './player.js?v=12';

// SKLTR v48/v49 — authored 5-minute spine with traversal earned by movement.
const INF=1e6, BASE={chaser:1,turret:1.5,flyer:1.7,boss:30,boss2:22,boss3:34};
const F=(name,seq,slots,gap=.8)=>({name,seq,slots,gap});
const R=(name,meters)=>({name,meters});
const CARDS=[
 F('HOUND RUN · OPEN',['chaser','chaser','chaser','chaser'],[[-18,-8],[18,-8],[-22,14],[22,14]],.72),
 F('HOUND RUN · CROSS',['chaser','chaser','chaser','chaser','chaser'],[[-22,-2],[22,-2],[-26,20],[26,20],[0,30]],.68),
 R('LINK 1 · RUN',24),
 F('TORTOISE HEIGHTS · TWO LANES',['turret','chaser','chaser','turret','chaser'],[[-20,16],[-28,0],[0,-24],[20,-16],[28,4]],1.02),
 F('TORTOISE HEIGHTS · CROSSING FIRE',['turret','chaser','turret','chaser','chaser'],[[-24,-18],[-8,28],[24,-18],[28,10],[-28,10]],.94),
 R('LINK 2 · CLIMB',30),
 F('WASP LIFT · PAIRS',['flyer','chaser','flyer','chaser'],[[-18,24],[-26,0],[18,24],[26,0]],1.00),
 F('WASP LIFT · HIGH LOW',['flyer','chaser','flyer','chaser','flyer'],[[0,-28],[-28,-2],[-22,22],[28,4],[22,22]],.86),
 R('LINK 3 · SPRINT',34),
 F('MACHINE YARD · ECOLOGY',['turret','chaser','flyer','chaser','turret','flyer','chaser','flyer'],[[-26,-18],[-18,24],[0,-30],[24,18],[28,-8],[-28,8],[0,30],[18,-24]],.72),
 F('MACHINE YARD · CRUSH',['turret','flyer','chaser','chaser','turret','flyer','chaser','flyer','chaser'],[[-30,-14],[0,-30],[-20,24],[20,24],[30,-14],[-26,8],[26,8],[0,30],[-10,-28]],.60),
 R('FINAL LINK · COMMIT',38),
 F('KILL FLOOR · OVERDRIVE',['turret','flyer','chaser','chaser','flyer','turret','chaser','flyer','chaser','turret','chaser','flyer'],[[-30,-18],[0,-32],[-22,24],[22,24],[30,-18],[-28,6],[28,6],[0,30],[-12,-28],[12,-28],[-30,0],[30,0]],.52),
 F('LAST STAND · I',['flyer','turret','chaser','chaser','flyer','turret','chaser','chaser','flyer','turret','chaser','chaser'],[[-30,-20],[0,-32],[-22,24],[22,24],[30,-20],[-28,4],[28,4],[0,30],[-12,-28],[12,-28],[-30,10],[30,10]],.48),
 F('LAST STAND · II',['turret','flyer','chaser','flyer','chaser','turret','chaser','flyer','chaser','turret','chaser','flyer','chaser','chaser'],[[-32,-18],[0,-34],[-24,24],[24,24],[32,-18],[-28,4],[28,4],[0,32],[-14,-30],[14,-30],[-32,8],[32,8],[-20,18],[20,18]],.44)
];
let card=0,index=0,alive=new Set(),started=false,nextSpawnAt=0,travel=0,lastPX=null,lastPZ=null;
const originalPlace=Enemy.prototype.place, originalTake=Enemy.prototype.takeDamage, originalReset=Player.prototype.reset, originalUpdate=Player.prototype.update;
function spec(){return CARDS[Math.min(card,CARDS.length-1)]}
function announce(){const s=spec();window.dispatchEvent(new CustomEvent('skltr-arena',{detail:{name:s.meters?'TRAVERSE':'ENCOUNTER',arena:s.name,meters:s.meters||0}}))}
function resetCard(){index=0;alive.clear();travel=0;lastPX=lastPZ=null;nextSpawnAt=performance.now()+350;announce()}
function resetRun(){card=0;index=0;alive.clear();started=false;nextSpawnAt=0;travel=0;lastPX=lastPZ=null}
function desired(){const s=spec();return s.meters?null:s.seq[index]||null}
function advance(){const s=spec();for(const e of [...alive])if(!e.alive)alive.delete(e);if(s.meters){if(travel>=s.meters&&card<CARDS.length-1){card++;resetCard()}return}if(index>=s.seq.length&&alive.size===0&&card<CARDS.length-1){card++;resetCard()}}
Player.prototype.reset=function(...args){resetRun();return originalReset.apply(this,args)};
Player.prototype.update=function(...args){const out=originalUpdate.apply(this,args);const s=spec();if(s.meters&&this.alive){if(lastPX!=null){travel+=Math.hypot(this.x-lastPX,this.z-lastPZ);advance()}lastPX=this.x;lastPZ=this.z}return out};
Enemy.prototype.place=function(x,z){const s=spec(),want=desired();if(!this.boss&&want===this.type&&s.slots?.[index]){[x,z]=s.slots[index];index++;alive.add(this);nextSpawnAt=performance.now()+(s.gap||.8)*1000;}return originalPlace.call(this,x,z)};
Enemy.prototype.takeDamage=function(...args){const dead=originalTake.apply(this,args);if(dead){alive.delete(this);queueMicrotask(advance)}return dead};
for(const type of Object.keys(BASE))Object.defineProperty(COST,type,{configurable:true,enumerable:true,get(){if(type.startsWith('boss'))return BASE[type];if(!started){started=true;resetCard()}advance();const want=desired();return want===type&&performance.now()>=nextSpawnAt?BASE[type]:INF}});
window._skltrEncounter=()=>({card,name:spec().name,index,total:spec().seq?.length||0,next:desired(),alive:alive.size,travel:Math.round(travel),travelGoal:spec().meters||0});
