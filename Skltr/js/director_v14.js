import { COST } from './enemy.js?v=16';

// SKLTR v21 — authored 10-minute arcade run.
// We still steer the legacy spawn loop through COST, but encounter windows now have
// explicit OPEN / PRESSURE / PEAK / CLEAR beats instead of one continuous multiplier.
const BASE={chaser:1.15,turret:2.2,flyer:2.8,boss:30,boss2:22,boss3:34};
let runStart=performance.now(),lastAccess=runStart,phaseId=-1,phaseEntered=runStart;
const P=[
 {end:70,name:'ARENA 1 · HUNT',arena:'HOUND RUN',beats:[[8,4.5],[28,.72],[52,.50],[70,18]],mul:{chaser:.60,turret:2.8,flyer:99}},
 {end:90,name:'TRAVERSE',arena:'LINK 1',clear:true},
 {end:180,name:'ARENA 2 · CROSSFIRE',arena:'TORTOISE HEIGHTS',beats:[[98,5],[125,.82],[155,.58],[180,20]],mul:{chaser:1.05,turret:.56,flyer:6}},
 {end:205,name:'TRAVERSE',arena:'LINK 2',clear:true},
 {end:310,name:'ARENA 3 · VERTICAL',arena:'WASP LIFT',beats:[[215,5],[250,.82],[282,.58],[310,20]],mul:{chaser:1.05,turret:1.35,flyer:.50}},
 {end:335,name:'TRAVERSE',arena:'LINK 3',clear:true},
 {end:450,name:'MIXED ARENA',arena:'THE MACHINE YARD',beats:[[345,4],[385,.78],[425,.56],[450,18]],mul:{chaser:.72,turret:.72,flyer:.72}},
 {end:475,name:'BREATHE',arena:'FINAL LINK',clear:true},
 {end:570,name:'OVERDRIVE',arena:'KILL FLOOR',beats:[[485,3.2],[520,.70],[552,.48],[570,10]],mul:{chaser:.55,turret:.62,flyer:.62}},
 {end:1e9,name:'LAST STAND',arena:'TEN MINUTE CLIMAX',beats:[[580,2.2],[595,.42],[1e9,.36]],mul:{chaser:.48,turret:.54,flyer:.54}}
];
function elapsed(now){if(now-lastAccess>8000){runStart=now;phaseId=-1;phaseEntered=now;}lastAccess=now;return(now-runStart)/1000;}
function phaseAt(t,now){let id=P.findIndex(p=>t<p.end);if(id<0)id=P.length-1;if(id!==phaseId){phaseId=id;phaseEntered=now;window.dispatchEvent(new CustomEvent('skltr-arena',{detail:P[id]}));}return P[id];}
function beatMul(p,t){if(p.clear)return 60;for(const [until,m] of p.beats||[])if(t<until)return m;return 1;}
function liveCost(type){const now=performance.now(),t=elapsed(now),p=phaseAt(t,now);if(!(type in BASE))return 1;if(type.startsWith('boss'))return BASE[type];let cost=BASE[type]*(p.mul[type]??1)*beatMul(p,t);const since=(now-phaseEntered)/1000;if(!p.clear&&since<4)cost*=1+(4-since)*1.8;return cost;}
for(const type of Object.keys(BASE))Object.defineProperty(COST,type,{configurable:true,enumerable:true,get:()=>liveCost(type)});
window._skltrDirector=()=>{const now=performance.now(),t=elapsed(now),p=phaseAt(t,now);return{seconds:Math.round(t),phase:p.name,arena:p.arena,beat:p.clear?'CLEAR':beatMul(p,t),costs:{chaser:liveCost('chaser'),turret:liveCost('turret'),flyer:liveCost('flyer')}}};
