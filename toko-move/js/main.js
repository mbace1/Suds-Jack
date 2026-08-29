// Toko Move v2.6 — delivery game + exact HSL transit inspector.
import { createFlow } from '../../flow-core/sim.js?v=2';
import { FlowRenderer } from '../../flow-core/render.js?v=2';
import { RouteDrawer } from '../../flow-core/input.js?v=1';
import { THEME } from './palette.js?v=1';
import { HELSINKI } from './helsinki.js?v=3';
import { DeliveryChallenge, DELIVERY_TARGET, CARGO } from './deliveries.js?v=5';
import { TransitLayers } from './transit-layers.js?v=2';

const BUILD_VERSION='2.6';
const $=id=>document.getElementById(id);
let flow,challenge,renderer,drawer,draft=null,sel=null,done=false,msgs=[];
let transitLayers=null,transitView=false;
const say=s=>{msgs.unshift(s);msgs.length=Math.min(msgs.length,10);paintFeed();};

function boot(seed=7){
  flow=createFlow({city:HELSINKI,seed,days:1,demand:{rate:38,pairs:[{from:'home',to:'work',weight:2},{from:'transfer',to:'shop',weight:1}]},hooks:{onTick:()=>{if(challenge?.step()){paintHud();paintSheet();if(challenge.complete)finish();}},onDay:()=>finish(),onEvent:ev=>{if(ev.kind==='surge')say(`Crowding at ${flow.graph.node(ev.target).name}.`);}}});
  challenge=new DeliveryChallenge(flow,say); done=false; msgs=[]; sel=null;
  $('map').style.aspectRatio=`${flow.graph.bounds.w} / ${flow.graph.bounds.h}`;
  drawer?.destroy(); renderer=new FlowRenderer($('map'),THEME);
  drawer=new RouteDrawer($('map'),renderer,flow,{markersProvider:markers,onCommit:(mode,nodes)=>{if(transitView)return;const r=flow.addRoute(mode,nodes);say(r.error?`— ${r.error}`:`NEW LINE · ${nodes.map(id=>flow.graph.node(id).name).join(' → ')}`);paintHud();},onTap:(hit,p)=>{if(transitView)return;if(hit.kind==='node'){sel=hit.id;paintSheet();hidePop();}else showPop(hit,p);},onDraft:d=>draft=d});
  challenge.start(); paintHud(); paintSheet();
}

async function loadTransit(){
  try{transitLayers=await TransitLayers.load('./cities/helsinki.json');paintTransitPanel();}
  catch(err){$('transitMeta').textContent=`Exact transit pack failed to load: ${err.message}`;}
}
function paintTransitPanel(){
  if(!transitLayers)return;
  const s=transitLayers.source;
  $('transitMeta').textContent=`${s.source} · ${s.fetched} · ${transitLayers.layers.length} source line-directions · exact inside ${s.clippedTo.s}–${s.clippedTo.n} N`;
  const rows=$('transitRows'); rows.innerHTML='';
  for(const layer of transitLayers.layers){
    const row=document.createElement('div'); row.className='lineRow';
    row.innerHTML=`<span class="lineSwatch" style="background:${layer.colour}"></span><label><input type="checkbox" ${layer.visible?'checked':''}> ${esc(layer.name)} <small>${layer.mode==='SUBWAY'?'metro':'tram'}</small></label><button class="ctl">SOLO</button>`;
    row.querySelector('input').onchange=e=>transitLayers.setVisible(layer.id,e.target.checked);
    row.querySelector('button').onclick=()=>{transitLayers.solo(layer.id);paintTransitPanel();};
    rows.append(row);
  }
}
function showTransit(mode='all'){
  if(!transitLayers)return;
  transitView=true; document.body.classList.add('transit-view'); $('transitPanel').hidden=false;
  if(mode==='TRAM')transitLayers.showAll('TRAM'); else if(mode==='SUBWAY')transitLayers.showAll('SUBWAY'); else transitLayers.showAll();
  paintTransitPanel();
}
function hideTransit(){transitView=false;document.body.classList.remove('transit-view');$('transitPanel').hidden=true;}
function drawTransitView(){
  if(!transitLayers)return;
  const c=$('map'),ctx=c.getContext('2d');
  ctx.save();ctx.fillStyle='#edf4f2';ctx.fillRect(0,0,c.width,c.height);ctx.restore();
  transitLayers.draw(ctx,c.width,c.height,{alpha:.95,lineWidth:2.6*(renderer?.dpr||1)});
  const p=transitLayers.source,d=renderer?.dpr||1;
  ctx.save();ctx.fillStyle='#233d4d';ctx.globalAlpha=.75;ctx.font=`${Math.round(10*d)}px ui-monospace,monospace`;ctx.fillText(`TOKO MOVE v${BUILD_VERSION} · REAL HSL GEOMETRY`,12*d,18*d);ctx.fillStyle='#647176';ctx.globalAlpha=.7;ctx.font=`${Math.round(8*d)}px ui-monospace,monospace`;ctx.fillText(`feed ${p.fetched} · clipped central Helsinki`,12*d,31*d);ctx.restore();
}

const cargoColour=c=>({documents:'#4c7fb0','hot food':'#d65a31',parts:'#6b747b',fragile:'#b16aa5',equipment:'#6d604b',express:'#ca3f37','fresh food':'#5b9d58','market goods':'#b0803c'}[c]||'#e2683c');
function markers(){if(!flow||!challenge||transitView)return[];const out=[],slots={};const slot=n=>(slots[n]=(slots[n]??-1)+1);for(const t of flow.trips.active){if(t.payload?.kind!=='delivery')continue;const col=cargoColour(t.payload.cargo);out.push({id:`job:${t.id}`,node:t.dest,slot:slot(t.dest),glyph:'▣',color:col,data:t});out.push({id:`pickup:${t.id}`,node:t.origin,slot:slot(t.origin),glyph:'●',color:'#2f9fb8',data:t});}return out;}
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function showPop(hit,p){const body=popBody(hit);if(!body){hidePop();return;}$('popBody').innerHTML=body;const b=$('pop');b.hidden=false;const r=$('map').getBoundingClientRect(),w=Math.min(300,innerWidth-20);b.style.width=w+'px';b.style.left=Math.max(10,Math.min(innerWidth-w-10,r.left+p.x-w/2))+'px';b.style.top=Math.max(10,Math.min(innerHeight-170,r.top+p.y+14))+'px';}
function hidePop(){$('pop').hidden=true;}
function popBody(hit){if(hit.kind!=='marker')return null;const t=hit.marker.data;if(!t)return null;const c=CARGO[t.payload?.cargo]||CARGO.documents;return `<h3>${hit.marker.id.startsWith('pickup:')?'PICKUP':'DELIVER'} · ${c.icon}</h3><p>${esc(flow.graph.node(t.origin).name)} → ${esc(flow.graph.node(t.dest).name)}</p><p class="dim">${esc(t.payload?.label||'Delivery')}</p><p class="dim">${esc(c.rule)}</p>`;}
function paintHud(){if(!challenge)return;const c=challenge.active?challenge.cargoRule():null;$('done').textContent=`${challenge.index}/${DELIVERY_TARGET}`;$('reach').textContent=challenge.active?`${challenge.name(challenge.currentFrom())} → ${challenge.name(challenge.currentTo())}`:'complete';$('emit').textContent=challenge.active?`${challenge.remaining()}t`:`${challenge.score} pts`;$('cargoHud').textContent=c?c.icon:'DONE';$('cargoHud').style.borderColor=challenge.active?cargoColour(challenge.active.cargo):'';$('clock').textContent=`${String(6+Math.floor(flow.clock.dayProgress*16)).padStart(2,'0')}:00`;$('lines').textContent=`${flow.routes.drawn.length}/${flow.routes.maxRoutes} lines`;}
function paintSheet(){const b=$('sheet');if(challenge?.active&&!sel){const j=challenge.active,c=challenge.cargoRule(),multi=j.stops.length>2?` · ${j.stops.length-1} legs`:'';b.innerHTML=`<div class="jobTop"><span class="cargoBadge" style="border-color:${cargoColour(j.cargo)}">${c.icon}</span><div><h2>JOB ${challenge.index+1}/${DELIVERY_TARGET}</h2><p class="route"><b>${challenge.routeLabel()}</b></p></div></div><p class="hint">${j.label} · ${j.cargo}${multi}</p><p class="cargoRule">${c.rule}</p><div class="meter"><i style="width:${Math.max(0,Math.min(100,100*challenge.remaining()/j.limit))}%"></i></div><p class="hint">${challenge.remaining()} ticks remaining · score ${challenge.score}</p>`;return;}if(!sel){b.innerHTML='<p class="hint">Tap a stop for details.</p>';return;}const n=flow.graph.node(sel);b.innerHTML=`<h2>${n.name}</h2><p class="hint">${n.waiting.length} waiting · ${flow.routes.routesAt(sel).length} services call here</p><button class="btn wide" id="jobBack">SHOW CURRENT JOB</button>`;$('jobBack').onclick=()=>{sel=null;paintSheet();};}
function paintFeed(){const f=$('feed');f.innerHTML='';for(const m of msgs.slice(0,3)){const d=document.createElement('div');d.textContent=m;f.append(d);}}
function drawCityOverlay(){const c=$('map'),ctx=c.getContext('2d');if(!flow||!renderer)return;const f=flow.graph.fit(c.width,c.height),d=renderer.dpr||1;ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#2f9fb8';ctx.beginPath();ctx.moveTo(0,c.height*.82);ctx.lineTo(c.width,c.height*.74);ctx.lineTo(c.width,c.height);ctx.lineTo(0,c.height);ctx.closePath();ctx.fill();ctx.globalAlpha=.52;ctx.fillStyle='#5d6a72';ctx.font=`${Math.round(9*d)}px ui-monospace,monospace`;ctx.textAlign='center';for(const [id,label] of [['pasila','PASILA'],['rautatientori','CITY CENTRE'],['kalasatama','KALASATAMA'],['katajanokka','HARBOUR']]){const n=flow.graph.node(id);if(n)ctx.fillText(label,f.x(n.x),f.y(n.y)-20*d);}ctx.restore();}
function finish(){if(done)return;done=true;flow.clock.setPaused(true);$('endTitle').textContent=challenge.complete?'ALL DELIVERED':'DAY OVER';$('endStats').innerHTML=`<p>deliveries <b>${challenge.index}/${DELIVERY_TARGET}</b></p><p>score <b>${challenge.score}</b></p><p>cargo bonuses <b>${challenge.bonuses}</b></p><p>late jobs <b>${challenge.late}</b></p>`;$('endNote').textContent=challenge.complete?(challenge.late?`All ten delivered. ${challenge.late} arrived late.`:'Perfect day: every job arrived on time.'):'Run it again and finish the route.';$('end').hidden=false;}
let last=0;function frame(now){const dt=last?Math.min(120,now-last):0;last=now;if(flow){flow.update(dt);if(transitView)drawTransitView();else{renderer.draw(flow,{draft,alpha:flow.clock.alpha(),markers:markers()});drawCityOverlay();}if(flow.clock.tick%10===0){paintHud();if(!sel)paintSheet();}}requestAnimationFrame(frame);}
addEventListener('resize',()=>renderer?.resize());$('play').onclick=()=>{$('title').hidden=true;flow.clock.setPaused(false);};$('pause').onclick=()=>{flow.clock.setPaused(!flow.clock.paused);$('pause').textContent=flow.clock.paused?'▶':'❚❚';};$('speed').onclick=()=>{const s=flow.clock.speed>=4?1:flow.clock.speed*2;flow.clock.setSpeed(s);$('speed').textContent=`×${s}`;};$('again').onclick=()=>{$('end').hidden=true;boot(7);flow.clock.setPaused(false);};$('popClose').onclick=hidePop;
$('transit').onclick=()=>transitView?hideTransit():showTransit('all');$('transitClose').onclick=hideTransit;$('tramOnly').onclick=()=>showTransit('TRAM');$('metroOnly').onclick=()=>showTransit('SUBWAY');$('allTransit').onclick=()=>showTransit('all');
addEventListener('keydown',e=>{if(e.key==='Escape'){if(transitView)hideTransit();else hidePop();}});
boot();loadTransit();requestAnimationFrame(frame);window.__tm={version:BUILD_VERSION,get flow(){return flow;},get challenge(){return challenge;},get transit(){return transitLayers;},debug:{boot,finish,markers,showTransit,hideTransit}};
