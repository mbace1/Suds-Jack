// Toko Move v2.12 clean runtime core — no RouteDrawer, no player-built lines, no wrapper-era fake vehicles.
import {createFlow} from '../../flow-core/sim.js?v=2';
import {FlowRenderer} from '../../flow-core/render.js?v=3';
import {THEME} from './palette.js?v=1';
import {DeliveryChallenge,DELIVERY_TARGET} from './deliveries.js?v=7';
import {TransitLayers} from './transit-layers.js?v=3';
import {buildRealHelsinki} from './real-helsinki.js?v=2';

const $=id=>document.getElementById(id);
const BUILD_VERSION='2.12.2';
const MAP_THEME={...THEME,latent:THEME.paper,hideQueues:true,hideLoadMarks:true,hideCarriers:true,modeColours:{metro:'rgba(0,0,0,0)',tram:'rgba(0,0,0,0)',car:'rgba(0,0,0,0)'}};
const cargoColour=c=>({documents:'#4c7fb0','hot food':'#d65a31',parts:'#6b747b',fragile:'#b16aa5',equipment:'#6d604b',express:'#ca3f37','fresh food':'#5b9d58','market goods':'#b0803c'}[c]||'#e2683c');
const esc=s=>String(s??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]||ch));
let flow,challenge,renderer,transit,city,water,source,transitView=false,done=false,last=0,msgs=[];
const say=s=>{msgs.unshift(s);msgs.length=Math.min(8,msgs.length);paintFeed();};

function publish(){window.__tm={...(window.__tm||{}),version:BUILD_VERSION,flow,challenge,renderer,transit,city,water,say,paintHud,paintSheet};}
function fitLatLon(lat,lon){const p=city.projectLatLon(lat,lon),f=flow.graph.fit($('map').width,$('map').height);return{x:f.x(p.x),y:f.y(p.y)};}
function coverageLabel(s){return s?.clippedTo?`exact inside ${s.clippedTo.s}–${s.clippedTo.n} N`:'full Helsinki source pack';}

function boot(seed=7){
  if(!city)return;
  flow=createFlow({city,seed,days:1,demand:null,hooks:{onTick:()=>{const changed=challenge?.step?.();if(changed){paintHud();paintSheet();if(challenge.complete)finish();}},onDay:()=>{if(!challenge?.complete)finish();}}});
  challenge=new DeliveryChallenge(flow,say);done=false;msgs=[];
  renderer=new FlowRenderer($('map'),MAP_THEME);
  $('map').style.aspectRatio=`${flow.graph.bounds.w} / ${flow.graph.bounds.h}`;
  challenge.start();publish();paintHud();paintSheet();
}

function paintTransitPanel(){
  if(!transit)return;
  const s=transit.source;$('transitMeta').textContent=`${s.source} · ${s.fetched} · ${transit.layers.length} source lines · ${coverageLabel(s)}`;
  const rows=$('transitRows');rows.innerHTML='';
  for(const layer of transit.layers){const row=document.createElement('div');row.className='lineRow';row.innerHTML=`<span class="lineSwatch" style="background:${layer.colour}"></span><label><input type="checkbox" ${layer.visible?'checked':''}> ${esc(layer.name)} <small>${layer.mode==='SUBWAY'?'metro':'tram'}</small></label><button class="ctl">SOLO</button>`;row.querySelector('input').onchange=e=>transit.setVisible(layer.id,e.target.checked);row.querySelector('button').onclick=()=>{transit.solo(layer.id);paintTransitPanel();};rows.append(row);}
}
function showTransit(mode='all'){transitView=true;document.body.classList.add('transit-view');$('transitPanel').hidden=false;if(mode==='TRAM')transit.showAll('TRAM');else if(mode==='SUBWAY')transit.showAll('SUBWAY');else transit.showAll();paintTransitPanel();}
function hideTransit(){transitView=false;document.body.classList.remove('transit-view');$('transitPanel').hidden=true;}

function drawWater(alpha=.55){if(!water||!city||!flow)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#72a9bd';ctx.fillStyle='rgba(132,190,211,.18)';ctx.lineWidth=1.2*d;for(const area of water.areas||[]){if(!area.shape?.length)continue;ctx.beginPath();area.shape.forEach(([lat,lon],i)=>{const p=fitLatLon(lat,lon);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.fill();ctx.stroke();}ctx.strokeStyle='#4f95af';ctx.lineWidth=1.6*d;for(const edge of water.edges||[]){if(!edge.shape?.length)continue;ctx.beginPath();edge.shape.forEach(([lat,lon],i)=>{const p=fitLatLon(lat,lon);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.stroke();}ctx.restore();}
function drawTransit(){transit?.draw($('map').getContext('2d'),$('map').width,$('map').height,{fit:fitLatLon,alpha:.64,lineWidth:1.75*(renderer?.dpr||1)});}
function drawTransitInspector(){const c=$('map'),ctx=c.getContext('2d');ctx.fillStyle='#edf4f2';ctx.fillRect(0,0,c.width,c.height);drawWater(.8);transit?.draw(ctx,c.width,c.height,{alpha:.96,lineWidth:2.6*(renderer?.dpr||1)});}
function drawCityOverlay(){if(!flow||!renderer)return;const c=$('map'),ctx=c.getContext('2d'),f=flow.graph.fit(c.width,c.height),d=renderer.dpr||1;ctx.save();ctx.globalAlpha=.56;ctx.fillStyle='#5d6a72';ctx.font=`${Math.round(8*d)}px ui-monospace,monospace`;ctx.textAlign='center';for(const[id,label]of[['kapyla','KÄPYLÄ'],['pasila','PASILA'],['toolontori','TÖÖLÖ'],['kallionkirkko','KALLIO'],['rautatientori','CENTRE'],['kalasatama','KALASATAMA'],['lansiterminaali','WEST HARBOUR'],['eira','EIRA'],['katajanokka','KATAJANOKKA']]){const n=flow.graph.node(id);if(n)ctx.fillText(label,f.x(n.x),f.y(n.y)-18*d);}if(challenge?.active){for(const[id,col]of[[challenge.currentFrom(),'#2f9fb8'],[challenge.currentTo(),cargoColour(challenge.active.cargo)]]){const n=flow.graph.node(id);if(!n)continue;ctx.strokeStyle=col;ctx.globalAlpha=.9;ctx.lineWidth=3*d;ctx.beginPath();ctx.arc(f.x(n.x),f.y(n.y),13*d,0,Math.PI*2);ctx.stroke();}}ctx.restore();}

function paintHud(){if(!challenge||!flow)return;const c=challenge.active?challenge.cargoRule():null;$('done').textContent=`${challenge.index}/${DELIVERY_TARGET}`;$('reach').textContent=challenge.active?`${challenge.name(challenge.currentFrom())} → ${challenge.name(challenge.currentTo())}`:'dispatch';$('emit').textContent=challenge.active?`${challenge.remaining()}t`:`${challenge.score} pts`;$('cargoHud').textContent=c?c.icon:'JOB';$('cargoHud').style.borderColor=challenge.active?cargoColour(challenge.active.cargo):'';$('clock').textContent=`${String(6+Math.floor(flow.clock.dayProgress*16)).padStart(2,'0')}:00`;$('lines').textContent='HSL network';}
function paintSheet(){if(!challenge)return;const b=$('sheet');if(!challenge.active){if(!document.getElementById('jobBoard'))b.innerHTML='<p class="hint">Dispatching local jobs…</p>';return;}const j=challenge.active,c=challenge.cargoRule();b.innerHTML=`<div class="jobTop"><span class="cargoBadge" style="border-color:${cargoColour(j.cargo)}">${c.icon}</span><div><h2>JOB ${challenge.index+1}/${DELIVERY_TARGET}</h2><p class="route"><b>${esc(challenge.routeLabel())}</b></p></div></div><p class="hint">${esc(j.label)} · ${esc(j.cargo)}</p><p class="cargoRule">${esc(c.rule)}</p><div class="meter"><i style="width:${Math.max(0,Math.min(100,100*challenge.remaining()/j.limit))}%"></i></div><p class="hint">${challenge.remaining()} ticks remaining · score ${challenge.score}</p>`;}
function paintFeed(){const f=$('feed');if(!f)return;f.innerHTML='';for(const m of msgs.slice(0,3)){const d=document.createElement('div');d.textContent=m;f.append(d);}}
function finish(){if(done)return;done=true;flow.clock.setPaused(true);$('endTitle').textContent=challenge.complete?'ALL DELIVERED':'DAY OVER';$('endStats').innerHTML=`<p>deliveries <b>${challenge.index}/${DELIVERY_TARGET}</b></p><p>score <b>${challenge.score}</b></p><p>cargo bonuses <b>${challenge.bonuses}</b></p><p>late jobs <b>${challenge.late}</b></p>`;$('endNote').textContent=challenge.complete?'Ten Helsinki courier jobs complete.':'The shift ended; the route remains replayable.';$('end').hidden=false;}

function frame(now){const dt=last?Math.min(120,now-last):0;last=now;if(flow){flow.update(dt);if(transitView)drawTransitInspector();else{renderer.draw(flow,{alpha:flow.clock.alpha()});drawWater();drawTransit();drawCityOverlay();}if(flow.clock.tick%10===0)paintHud();}requestAnimationFrame(frame);}

async function init(){
  $('play').disabled=true;$('play').textContent='LOADING HELSINKI…';
  try{const [r,w]=await Promise.all([fetch('./cities/helsinki.json',{cache:'no-store'}),fetch('../flow-core/data/kallio-water-v1.json',{cache:'no-store'})]);if(!r.ok)throw new Error(`HSL pack ${r.status}`);source=await r.json();water=w.ok?await w.json():null;transit=new TransitLayers(source);transit.showAll();city=buildRealHelsinki(source);paintTransitPanel();boot();$('play').disabled=false;$('play').textContent='START SHIFT';requestAnimationFrame(frame);}catch(err){$('play').textContent='MAP LOAD FAILED';$('transitMeta').textContent=err.message;console.error(err);}
}

addEventListener('resize',()=>renderer?.resize());
$('play').onclick=()=>{if(!flow)return;$('title').hidden=true;flow.clock.setPaused(false);};
$('pause').onclick=()=>{if(!flow)return;flow.clock.setPaused(!flow.clock.paused);$('pause').textContent=flow.clock.paused?'▶':'❚❚';};
$('speed').onclick=()=>{if(!flow)return;const s=flow.clock.speed>=4?1:flow.clock.speed*2;flow.clock.setSpeed(s);$('speed').textContent=`×${s}`;};
$('again').onclick=()=>{$('end').hidden=true;boot(7);publish();flow.clock.setPaused(false);};
$('transit').onclick=()=>transitView?hideTransit():showTransit();$('transitClose').onclick=hideTransit;$('tramOnly').onclick=()=>showTransit('TRAM');$('metroOnly').onclick=()=>showTransit('SUBWAY');$('allTransit').onclick=()=>showTransit('all');$('popClose').onclick=()=>{$('pop').hidden=true;};
init();
