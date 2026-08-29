import { Enemy, COST } from './enemy.js?v=12';

// SKLTR v24 encounter state controller. Uses the exact enemy module identity imported
// by main.js, so the controller owns its COST gates and can observe spawned/killed units.
const INF=1e6,BASE={chaser:1,turret:1.5,flyer:1.7,boss:30,boss2:22,boss3:34};
const CARDS=[
{name:'HOUND RUN · OPEN',quota:{chaser:5}},{name:'HOUND RUN · CROSS',quota:{chaser:5,turret:1}},{name:'LINK 1',rest:7},
{name:'TORTOISE HEIGHTS · LANES',quota:{chaser:3,turret:3}},{name:'TORTOISE HEIGHTS · PINCH',quota:{chaser:4,turret:3}},{name:'LINK 2',rest:8},
{name:'WASP LIFT · LOOK UP',quota:{chaser:3,flyer:3}},{name:'WASP LIFT · STACK',quota:{chaser:3,turret:1,flyer:4}},{name:'LINK 3',rest:8},
{name:'MACHINE YARD · ECOLOGY',quota:{chaser:5,turret:3,flyer:3}},{name:'MACHINE YARD · CRUSH',quota:{chaser:6,turret:3,flyer:4}},{name:'FINAL LINK',rest:7},
{name:'KILL FLOOR · OVERDRIVE',quota:{chaser:7,turret:4,flyer:4}},{name:'LAST STAND · I',quota:{chaser:8,turret:4,flyer:5}},{name:'LAST STAND · II',quota:{chaser:9,turret:5,flyer:6}}];
let card=0,spawned={},alive=new Set(),restUntil=0,started=false;
const originalPlace=Enemy.prototype.place,originalTake=Enemy.prototype.takeDamage;
function spec(){return CARDS[Math.min(card,CARDS.length-1)]}
function announce(){const s=spec();window.dispatchEvent(new CustomEvent('skltr-arena',{detail:{name:s.rest?'TRAVERSE':'ENCOUNTER',arena:s.name}}))}
function resetCard(){spawned={};alive.clear();const s=spec();restUntil=s.rest?performance.now()+s.rest*1000:0;announce()}
function wanted(type){const s=spec();return !s.rest&&(spawned[type]||0)<(s.quota?.[type]||0)}
function advance(){const s=spec();if(s.rest){if(performance.now()>=restUntil&&card<CARDS.length-1){card++;resetCard()}return}for(const e of [...alive])if(!e.alive)alive.delete(e);const done=Object.entries(s.quota||{}).every(([t,n])=>(spawned[t]||0)>=n);if(done&&alive.size===0&&card<CARDS.length-1){card++;resetCard()}}
Enemy.prototype.place=function(...args){const r=originalPlace.apply(this,args);if(!this.boss&&wanted(this.type)){spawned[this.type]=(spawned[this.type]||0)+1;alive.add(this)}return r};
Enemy.prototype.takeDamage=function(...args){const dead=originalTake.apply(this,args);if(dead){alive.delete(this);queueMicrotask(advance)}return dead};
for(const type of Object.keys(BASE))Object.defineProperty(COST,type,{configurable:true,enumerable:true,get(){if(type.startsWith('boss'))return BASE[type];if(!started){started=true;resetCard()}advance();return wanted(type)?BASE[type]:INF}});
window._skltrEncounter=()=>({card,name:spec().name,spawned:{...spawned},alive:alive.size,wants:Object.keys(BASE).filter(t=>!t.startsWith('boss')&&wanted(t))});
