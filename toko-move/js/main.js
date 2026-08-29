// Toko Move v2 — Central Helsinki delivery challenge.
import { createFlow } from '../../flow-core/sim.js?v=2';
import { FlowRenderer } from '../../flow-core/render.js?v=2';
import { RouteDrawer } from '../../flow-core/input.js?v=1';
import { THEME } from './palette.js?v=1';
import { HELSINKI } from './helsinki.js?v=2';
import { DeliveryChallenge, DELIVERY_TARGET } from './deliveries.js?v=2';

const $=id=>document.getElementById(id);
let flow,challenge,renderer,drawer,draft=null,sel=null,done=false,msgs=[];
const say=s=>{msgs.unshift(s);msgs.length=Math.min(msgs.length,10);paintFeed();};

function boot(seed=7){
  flow=createFlow({city:HELSINKI,seed,days:1,demand:{rate:38,pairs:[{from:'home',to:'work',weight:2},{from:'transfer',to:'shop',weight:1}]},hooks:{onTick:()=>{if(challenge?.step()){paintHud();paintSheet();if(challenge.complete)finish();}},onDay:()=>finish(),onEvent:ev=>{if(ev.kind==='surge')say(`Crowding at ${flow.graph.node(ev.target).name}.`);}}});
  challenge=new DeliveryChallenge(flow,say); done=false; msgs=[]; sel=null;
  $('map').style.aspectRatio=`${flow.graph.bounds.w} / ${flow.graph.bounds.h}`;
  drawer?.destroy(); renderer=new FlowRenderer($('map'),THEME);
  drawer=new RouteDrawer($('map'),renderer,flow,{markersProvider:markers,onCommit:(mode,nodes)=>{const r=flow.addRoute(mode,nodes);say(r.error?`— ${r.error}`:`Your line: ${nodes.map(id=>flow.graph.node(id).name).join(' → ')}`);},onTap:(hit,p)=>{if(hit.kind==='node'){sel=hit.id;paintSheet();hidePop();}else showPop(hit,p);},onDraft:d=>draft=d});
  challenge.start(); paintHud(); paintSheet();
}

function markers(){
  if(!flow||!challenge)return[]; const out=[],slots={}; const slot=n=>(slots[n]=(slots[n]??-1)+1);
  for(const t of flow.trips.active){if(t.payload?.kind!=='delivery')continue;out.push({id:`job:${t.id}`,node:t.dest,slot:slot(t.dest),glyph:'▣',color:'#e2683c',data:t});out.push({id:`pickup:${t.id}`,node:t.origin,slot:slot(t.origin),glyph:'●',color:'#2f9fb8',data:t});}
  return out;
}
const esc=s=>String(s).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
function showPop(hit,p){const body=popBody(hit);if(!body){hidePop();return;}$('popBody').innerHTML=body;const b=$('pop');b.hidden=false;const r=$('map').getBoundingClientRect(),w=Math.min(300,innerWidth-20);b.style.width=w+'px';b.style.left=Math.max(10,Math.min(innerWidth-w-10,r.left+p.x-w/2))+'px';b.style.top=Math.max(10,Math.min(innerHeight-170,r.top+p.y+14))+'px';}
function hidePop(){$('pop').hidden=true;}
function popBody(hit){if(hit.kind!=='marker')return null;const t=hit.marker.data;if(!t)return null;return `<h3>${hit.marker.id.startsWith('pickup:')?'PICKUP':'DELIVER'}</h3><p>${esc(flow.graph.node(t.origin).name)} → ${esc(flow.graph.node(t.dest).name)}</p><p class="dim">${esc(t.payload?.label||'Delivery')}</p>`;}
function paintHud(){if(!challenge)return;$('done').textContent=`${challenge.index}/${DELIVERY_TARGET}`;$('reach').textContent=challenge.active?`${challenge.name(challenge.active.from)} → ${challenge.name(challenge.active.to)}`:'complete';$('emit').textContent='v2';$('clock').textContent=`${String(6+Math.floor(flow.clock.dayProgress*16)).padStart(2,'0')}:00`;$('lines').textContent=`${flow.routes.drawn.length}/${flow.routes.maxRoutes} lines`;}
function paintSheet(){const b=$('sheet');if(challenge?.active&&!sel){const j=challenge.active;b.innerHTML=`<h2>JOB ${challenge.index+1}/${DELIVERY_TARGET}</h2><p><b>${challenge.name(j.from)} → ${challenge.name(j.to)}</b></p><p class="hint">${j.label}. Use Helsinki's existing network or drag between stops to add a connection.</p>`;return;}if(!sel){b.innerHTML='<p class="hint">Tap a stop for details.</p>';return;}const n=flow.graph.node(sel);b.innerHTML=`<h2>${n.name}</h2><p class="hint">${n.waiting.length} waiting · ${flow.routes.routesAt(sel).length} services call here</p><button class="btn wide" id="jobBack">SHOW CURRENT JOB</button>`;$('jobBack').onclick=()=>{sel=null;paintSheet();};}
function paintFeed(){const f=$('feed');f.innerHTML='';for(const m of msgs.slice(0,3)){const d=document.createElement('div');d.textContent=m;f.append(d);}}
function finish(){if(done)return;done=true;flow.clock.setPaused(true);$('endTitle').textContent=challenge.complete?'ALL DELIVERED':'DAY OVER';$('endStats').innerHTML=`<p>deliveries <b>${challenge.index}/${DELIVERY_TARGET}</b></p>`;$('endNote').textContent=challenge.complete?'Central Helsinki: ten jobs, done.':'Run it again and finish the route.';$('end').hidden=false;}
let last=0;function frame(now){const dt=last?Math.min(120,now-last):0;last=now;if(flow){flow.update(dt);renderer.draw(flow,{draft,alpha:flow.clock.alpha(),markers:markers()});if(flow.clock.tick%10===0)paintHud();}requestAnimationFrame(frame);}
addEventListener('resize',()=>renderer?.resize());$('play').onclick=()=>{$('title').hidden=true;flow.clock.setPaused(false);};$('pause').onclick=()=>{flow.clock.setPaused(!flow.clock.paused);$('pause').textContent=flow.clock.paused?'▶':'❚❚';};$('speed').onclick=()=>{const s=flow.clock.speed>=4?1:flow.clock.speed*2;flow.clock.setSpeed(s);$('speed').textContent=`×${s}`;};$('again').onclick=()=>{$('end').hidden=true;boot(7);flow.clock.setPaused(false);};$('popClose').onclick=hidePop;addEventListener('keydown',e=>{if(e.key==='Escape')hidePop();});
boot();requestAnimationFrame(frame);window.__tm={get flow(){return flow;},get challenge(){return challenge;},debug:{boot,finish,markers}};
