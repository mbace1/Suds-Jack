// Radio Free Helsinki — reusable Helsinki time, season and weather layers.
// Geometry stays scene-specific; state is derived once and rendered cheaply on top.
//
// EVERY LAYER IN HERE SITS OVER A SCENE, so every one of them draws through
// `scr.wash()` rather than `px(shade(colour, a))`. That was the original bug and
// it was not a small one: `shade()` MULTIPLIES, so `shade('#020509', .16)` is
// `#000001` painted opaque, and `night()` filled the whole 128x152 frame with
// it. Measured, the thirteen ambient scenes came out at a mean luminance of
// 1.1/255 against 18-26 for the same scenes with this module switched off — the
// feed was a black rectangle with a dozen dim dots on it. It only fires at
// dusk/night/dawn off the real Helsinki clock, which is why it could ship: at
// midday in summer this module draws almost nothing.
import { PAL } from './palette.js?v=62';
import { mix, bayer } from './screen.js?v=62';
const W=128,H=152; const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d), hot=d=>mix(PAL.GREEN_HOT,PAL.AMBER_HOT,d);

const COASTAL=new Set(['katajanokka','kauppatori','merihaka']);
const RAIL=new Set(['metro','mannerheimrain','centralstation','hakaniemi','pasila','toolo','transitinterior']);
const ROOFS=new Set(['rooftops','kallionight']);
const EAST=new Set(['kalasatama','merihaka']);

function helsinkiParts(now=new Date()){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const get=t=>Number(p.find(x=>x.type===t)?.value||0); return {month:get('month'),hour:get('hour')};
}
function seasonFor(month){if(month<=2||month===12)return'winter';if(month<=4)return'thaw';if(month<=8)return'summer';return'autumn';}
function daylight(hour,season){
  const dawn=season==='winter'?8:season==='autumn'?7:season==='thaw'?6:5;
  const dusk=season==='winter'?16:season==='autumn'?19:season==='thaw'?20:22;
  if(hour<dawn||hour>=dusk)return'night'; if(hour<dawn+2)return'dawn'; if(hour>=dusk-2)return'dusk'; return'day';
}
export function stateForStory(story,scene,seed=0,now=new Date()){
  const {month,hour}=helsinkiParts(now), season=seasonFor(month), time=daylight(hour,season);
  const text=[story?.label,story?.id,story?.head,story?.copy?.en?.head].filter(Boolean).join(' ').toLowerCase();
  let weather='dry', activity='quiet';
  if(/rain|wet|storm|damp|sade|snow|slush|weather/.test(text)) weather=season==='winter'?'snow':season==='thaw'?'slush':'rain';
  else if(season==='winter'&&(Math.abs(seed)%4===0)) weather='snow';
  else if(season==='autumn'&&(Math.abs(seed)%3===0)) weather='rain';
  else if(season==='thaw'&&(Math.abs(seed)%4===1)) weather='slush';
  if(/tram|metro|rail|station|commut|transport|queue|walkout|robot|city/.test(text)) activity='busy';
  if(scene==='transitinterior'&&activity==='quiet') activity='commute';
  return {season,time,weather,activity,scene};
}

// A NIGHT GRADE, not a lid. It dims what is there and lifts the few windows
// that would still be lit, so a night scene still reads as a place. The old
// version was the single darkest thing in the app.
function night(scr,d,time){
  if(time!=='night'&&time!=='dusk'&&time!=='dawn')return;
  const a=time==='night'?.34:.20;
  scr.wash(0,0,W,H,'#020509',a);
  // and the lights that come on because it is dark — the only thing a night
  // pass should ADD. Warm at dusk, colder at night, always above the grade.
  const lit=time==='night'?hot(d):mix(hot(d),ink(d),.4);
  for(let i=0;i<15;i++){
    const x=(i*37+11)%W,y=25+(i*19)%62;
    scr.wash(x,y,2,2,lit,time==='night'?.62:.42);
  }
}
// Rain CATCHES light, so it is drawn in the hot ink over the scene rather than
// in a dim one under it — at 29% of a dimmed green it was invisible even before
// the night lid went over it.
function rain(scr,t,d,heavy=false){const n=heavy?42:28;for(let i=0;i<n;i++){const x=(i*29+Math.floor(t*35))%W,y=(i*43+Math.floor(t*62))%H;if(bayer(i&3,(i>>2)&3)<.74)scr.wash(x,y,1,heavy?4:3,hot(d),heavy?.34:.26);}const phase=Math.floor(t*7)%19;for(let x=-phase;x<W;x+=23)scr.wash(x,143,10,1,hot(d),.18);}
function snow(scr,t,d,slush=false){for(let i=0;i<34;i++){const x=(i*31+Math.floor(t*(slush?10:6)))%W,y=(i*47+Math.floor(t*(slush?17:11)))%H;if(bayer(i&3,(i>>2)&3)<.68)scr.wash(x,y,slush?2:1,slush?2:1,hot(d),slush?.30:.44);}if(slush){for(let x=0;x<W;x+=17)scr.wash(x+(Math.floor(t*4)%9),144,11,2,ink(d),.24);}else scr.wash(0,146,W,3,hot(d),.22);}
function autumn(scr,t,d,scene){if(!['toolo','hakaniemi','kallionight'].includes(scene))return;for(let i=0;i<12;i++){const x=(i*23+Math.floor(t*5))%W,y=70+(i*17)%56;scr.wash(x,y,2,1,ink(d),.34);}}
function thaw(scr,t,d){for(let x=4;x<W;x+=21){scr.wash(x,145,13,2,ink(d),.24);if((x+Math.floor(t))%3===0)scr.wash(x+3,141,5,1,hot(d),.22);}}
function sceneSpecific(scr,t,d,state){
  const s=state.scene;
  if(COASTAL.has(s)){const phase=Math.floor(t*9)%20;for(let y=124;y<151;y+=8)for(let x=-phase;x<W;x+=26)scr.wash(x,y,12,1,ink(d),state.season==='winter'?.18:.30);}
  if(RAIL.has(s)&&(state.weather==='rain'||state.weather==='slush'))for(let x=8;x<W;x+=27)scr.wash(x,146,15,1,hot(d),.24);
  if(ROOFS.has(s)&&state.season==='winter')for(let x=5;x<W;x+=24)scr.wash(x,38+(x%4),14,2,hot(d),.24);
  if(EAST.has(s)&&state.weather==='rain')for(let i=0;i<5;i++){const x=((t*(4+i)+i*28)%W)|0;scr.wash(x,112+i*5,9,1,ink(d),.26);}
  if(s==='transitinterior'&&(state.weather==='rain'||state.weather==='slush'))for(const x of [10,49,88])for(let y=36;y<75;y+=9)scr.wash(x+((y/9)%3)*5,y,1,3,ink(d),.26);
}
// A figure is the one thing here that should be SOLID — a person in front of a
// scene is an occluder, and washing them in at half opacity is what turned the
// crowd into smudges.
function people(scr,t,d,activity){const count=activity==='busy'?6:activity==='commute'?4:0;for(let i=0;i<count;i++){const x=((t*(7+i*1.2)+i*27)%(W+18))-9,y=121+(i%2)*8;scr.px(x,y,2,3,ink(d));scr.px(x-1,y+3,4,6,ink(d));}}

export function drawSceneState(scr,t,d,state={}){
  night(scr,d,state.time);
  if(state.season==='autumn')autumn(scr,t,d,state.scene);
  if(state.season==='thaw')thaw(scr,t,d);
  if(state.weather==='rain')rain(scr,t,d,state.season==='autumn');
  if(state.weather==='snow')snow(scr,t,d,false);
  if(state.weather==='slush')snow(scr,t,d,true);
  sceneSpecific(scr,t,d,state);
  people(scr,t,d,state.activity);
}
