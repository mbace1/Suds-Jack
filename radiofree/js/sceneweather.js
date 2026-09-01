// Radio Free Helsinki — reusable Helsinki time, season and weather layers.
// Geometry stays scene-specific; state is derived once and rendered cheaply on top.
import { PAL } from './palette.js?v=37';
import { mix, shade, bayer } from './screen.js?v=37';
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

function night(scr,d,time){if(time==='night'||time==='dusk'||time==='dawn'){const a=time==='night'?.16:.08;scr.px(0,0,W,H,shade('#020509',a));for(let i=0;i<15;i++){const x=(i*37+11)%W,y=25+(i*19)%62;if((i+Math.floor(Date.now()/1500))%4)scr.px(x,y,2,2,shade(ink(d),time==='night'?.24:.14));}}}
function rain(scr,t,d,heavy=false){const n=heavy?42:28;for(let i=0;i<n;i++){const x=(i*29+Math.floor(t*35))%W,y=(i*43+Math.floor(t*62))%H;if(bayer(i&3,(i>>2)&3)<.74)scr.px(x,y,1,heavy?4:3,shade(ink(d),heavy?.38:.29));}const phase=Math.floor(t*7)%19;for(let x=-phase;x<W;x+=23)scr.px(x,143,10,1,shade(ink(d),.2));}
function snow(scr,t,d,slush=false){for(let i=0;i<34;i++){const x=(i*31+Math.floor(t*(slush?10:6)))%W,y=(i*47+Math.floor(t*(slush?17:11)))%H;if(bayer(i&3,(i>>2)&3)<.68)scr.px(x,y,slush?2:1,slush?2:1,shade(hot(d),slush?.28:.24));}if(slush){for(let x=0;x<W;x+=17)scr.px(x+(Math.floor(t*4)%9),144,11,2,shade(ink(d),.2));}else scr.px(0,146,W,3,shade(hot(d),.13));}
function autumn(scr,t,d,scene){if(!['toolo','hakaniemi','kallionight'].includes(scene))return;for(let i=0;i<12;i++){const x=(i*23+Math.floor(t*5))%W,y=70+(i*17)%56;scr.px(x,y,2,1,shade(ink(d),.18));}}
function thaw(scr,t,d){for(let x=4;x<W;x+=21){scr.px(x,145,13,2,shade(ink(d),.14));if((x+Math.floor(t))%3===0)scr.px(x+3,141,5,1,shade(hot(d),.11));}}
function sceneSpecific(scr,t,d,state){
  const s=state.scene;
  if(COASTAL.has(s)){const phase=Math.floor(t*9)%20;for(let y=124;y<151;y+=8)for(let x=-phase;x<W;x+=26)scr.px(x,y,12,1,shade(ink(d),state.season==='winter'?.1:.2));}
  if(RAIL.has(s)&&(state.weather==='rain'||state.weather==='slush'))for(let x=8;x<W;x+=27)scr.px(x,146,15,1,shade(hot(d),.14));
  if(ROOFS.has(s)&&state.season==='winter')for(let x=5;x<W;x+=24)scr.px(x,38+(x%4),14,2,shade(hot(d),.14));
  if(EAST.has(s)&&state.weather==='rain')for(let i=0;i<5;i++){const x=((t*(4+i)+i*28)%W)|0;scr.px(x,112+i*5,9,1,shade(ink(d),.16));}
  if(s==='transitinterior'&&(state.weather==='rain'||state.weather==='slush'))for(const x of [10,49,88])for(let y=36;y<75;y+=9)scr.px(x+((y/9)%3)*5,y,1,3,shade(ink(d),.16));
}
function people(scr,t,d,activity){const count=activity==='busy'?6:activity==='commute'?4:0;for(let i=0;i<count;i++){const x=((t*(7+i*1.2)+i*27)%(W+18))-9,y=121+(i%2)*8;scr.px(x,y,2,3,shade(ink(d),.56));scr.px(x-1,y+3,4,6,shade(ink(d),.48));}}

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
