// Toko Move v2.12 clean runtime core — no RouteDrawer, no player-built lines, no wrapper-era fake vehicles.
import {createFlow} from '../../flow-core/sim.js?v=2';
import {FlowRenderer} from '../../flow-core/render.js?v=3';
import {THEME} from './palette.js?v=1';
import {DeliveryChallenge,DELIVERY_TARGET} from './deliveries.js?v=7';
import {TransitLayers} from './transit-layers.js?v=4';
import {buildRealHelsinki} from './real-helsinki.js?v=2';
import {boardBox,boardFit,roadPaths,lineFamily,ROAD_INK,HUB_INK} from './board.js?v=2';
import {TRANSFER_HUBS} from './hubs-walking.js?v=2';

const $=id=>document.getElementById(id);
const BUILD_VERSION='2.15';
const MAP_THEME={...THEME,latent:THEME.paper,hideQueues:true,hideLoadMarks:true,hideCarriers:true,modeColours:{metro:'rgba(0,0,0,0)',tram:'rgba(0,0,0,0)',car:'rgba(0,0,0,0)'}};
const cargoColour=c=>({documents:'#4c7fb0','hot food':'#d65a31',parts:'#6b747b',fragile:'#b16aa5',equipment:'#6d604b',express:'#ca3f37','fresh food':'#5b9d58','market goods':'#b0803c'}[c]||'#e2683c');
const esc=s=>String(s??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]||ch));
let flow,challenge,renderer,transit,city,water,source,transitView=false,done=false,last=0,msgs=[];
let box,roads;
const say=s=>{msgs.unshift(s);msgs.length=Math.min(8,msgs.length);paintFeed();};

function publish(){window.__tm={...(window.__tm||{}),version:BUILD_VERSION,flow,challenge,renderer,transit,city,water,board:box,project:fitLatLon,drawStopLabels,say,paintHud,paintSheet};}

// THE one projection. It used to go lat/lon -> graph space -> flow.graph.fit(),
// and fit() letterboxes with Math.min: the board is portrait (about 4km across
// by 7km tall) and the canvas is landscape, so the whole city was squeezed into
// a narrow column while the far ends of M1 and M2 sprawled off both sides. Every
// delivery anchor sits inside 9.1% of the pack's area and that is exactly what
// it looked like. Going straight from lat/lon through the board box fills the
// canvas with the part of Helsinki the game is played in.
function fitLatLon(lat,lon){const c=$('map');return boardFit(box,c.width,c.height)(lat,lon);}
function coverageLabel(s){return s?.clippedTo?`exact inside ${s.clippedTo.s}–${s.clippedTo.n} N`:'full Helsinki source pack';}

function boot(seed=7){
  if(!city)return;
  flow=createFlow({city,seed,days:1,demand:null,hooks:{onTick:()=>{const changed=challenge?.step?.();if(changed){paintHud();paintSheet();if(challenge.complete)finish();}},onDay:()=>{if(!challenge?.complete)finish();}}});
  challenge=new DeliveryChallenge(flow,say);done=false;msgs=[];
  renderer=new FlowRenderer($('map'),MAP_THEME);
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
function drawTransit(){transit?.draw($('map').getContext('2d'),$('map').width,$('map').height,{fit:fitLatLon,alpha:.92,lineWidth:2.4*(renderer?.dpr||1)});}

// Main roads: GROUND, and they have to stay ground. They are drawn first, in
// one flat grey with no rounded caps, so they read as the surface the network
// sits on. The rule from the handover is that a street must never look like a
// transit line the player laid — which is why they get no colour, no casing and
// no label of their own.
// First cut drew these at 5.5px in a warm beige and they came out as sand-
// coloured ribbons wider than the tram lines, cutting straight through Pasila
// and Töölö — ground competing with the thing it is meant to sit under. Thin,
// cool grey, and no cap.
function drawRoads(){if(!roads?.length)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1;ctx.save();ctx.strokeStyle=ROAD_INK;ctx.lineWidth=2.6*d;ctx.lineJoin='round';ctx.lineCap='butt';for(const road of roads){ctx.beginPath();road.path.forEach(([lat,lon],i)=>{const p=fitLatLon(lat,lon);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.stroke();}ctx.restore();}

// The board's own edge. A portrait board in a squarish canvas always leaves
// spare width, and the spare width was filling with real network the game never
// uses — the far end of M2, a stub of the 4 out west. Clipping to the box says
// which part is the board instead of leaving it to be inferred, and the frame
// makes it deliberate rather than a canvas that happens to end there.
function boardRect(){const c=$('map'),a=fitLatLon(box.n,box.w),b=fitLatLon(box.s,box.e);return{x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y};}
function clipToBoard(ctx){const r=boardRect();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();}
// The key. Thirteen tram colours with nothing naming them is a code you have
// to break by tapping — so the families ACTUALLY drawn on the board get a strip
// along the bottom, in the same ink and the same order every time. Built from
// the visible layers rather than from the palette, so hiding a line in the MAP
// inspector takes it out of the key too, and a family added later appears
// without anyone maintaining a list.
function drawLegend(){if(!transit)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1,r=boardRect();
  // Grouped by COLOUR, not by family: M1 and M2 deliberately share one ink
  // because they share track across the whole board, and two identical orange
  // chips side by side would ask a question the map does not mean to raise.
  // One chip per ink, labelled with every family that wears it.
  const byInk=new Map();
  for(const l of transit.layers){if(!l.visible)continue;const f=lineFamily(l.name);
    const e=byInk.get(l.colour)||{colour:l.colour,metro:l.mode==='SUBWAY',fams:[]};
    if(!e.fams.includes(f))e.fams.push(f);byInk.set(l.colour,e);}
  const fams=[...byInk.values()].map(e=>({...e,f:e.fams.join(' ')}));
  if(!fams.length)return;
  fams.sort((a,b)=>(a.metro-b.metro)||(parseInt(a.fams[0].replace(/\D/g,''),10)||99)-(parseInt(b.fams[0].replace(/\D/g,''),10)||99));
  ctx.save();ctx.font=`bold ${Math.round(8.5*d)}px ui-monospace,monospace`;ctx.textBaseline='middle';ctx.textAlign='center';
  const padX=6*d,gap=5*d,h=13*d;let w=0;const items=fams.map(x=>{const tw=Math.max(15*d,ctx.measureText(x.f).width+padX*2);w+=tw+gap;return{...x,tw};});
  w-=gap;
  // wrap rather than run off the frame — a key that leaves the board is not a key
  const maxW=r.w-16*d;const rows=[[]];let rw=0;
  for(const it of items){if(rw+it.tw+gap>maxW&&rows.at(-1).length){rows.push([]);rw=0;}rows.at(-1).push(it);rw+=it.tw+gap;}
  let y=r.y+r.h-(rows.length*(h+4*d))-4*d;
  for(const row of rows){const rowW=row.reduce((a,it)=>a+it.tw+gap,0)-gap;let x=r.x+(r.w-rowW)/2;
    for(const it of row){ctx.fillStyle=it.colour;ctx.beginPath();ctx.roundRect(x,y,it.tw,h,3*d);ctx.fill();
      ctx.fillStyle='#fff';ctx.fillText(it.f,x+it.tw/2,y+h/2+.5*d);x+=it.tw+gap;}
    y+=h+4*d;}
  ctx.restore();}

function drawBoardFrame(){const ctx=$('map').getContext('2d'),d=renderer?.dpr||1,r=boardRect();ctx.save();ctx.strokeStyle='rgba(29,47,54,.22)';ctx.lineWidth=1*d;ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);ctx.restore();}

// Stops and transfer spots. A transfer spot is the decision point of the whole
// game — it is where waiting, catching and changing lines happen — so it is
// drawn as a real interchange marker (white body, dark ring, named) while an
// ordinary delivery stop is a small dot. Size carries the hierarchy; colour is
// left to the lines, which own it.
function drawStops(){if(!flow||!city)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1;ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const node of city.nodes){const p=fitLatLon(node.lat,node.lon),hub=TRANSFER_HUBS.includes(node.id);
    if(hub){ctx.beginPath();ctx.arc(p.x,p.y,7*d,0,Math.PI*2);ctx.fillStyle='#fffdf7';ctx.fill();ctx.lineWidth=2.8*d;ctx.strokeStyle=HUB_INK;ctx.stroke();}
    else{ctx.beginPath();ctx.arc(p.x,p.y,3.6*d,0,Math.PI*2);ctx.fillStyle='#fffdf7';ctx.fill();ctx.lineWidth=1.8*d;ctx.strokeStyle='#5d6a72';ctx.stroke();}}
  ctx.restore();}

// Labels are drawn LAST — after main-v212.js has put the moving vehicles down —
// because a stop's name is the layer that identifies everything else and must
// not be printed under a tram badge that happens to be passing. The badges are
// handed in as boxes to avoid, so a name steps aside for a vehicle rather than
// fighting it. Same reason they are a separate call at all: core and the live
// layer are two rAF loops, and the labels have to come after both.
function drawStopLabels(avoid=[]){if(!flow||!city)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1;ctx.save();clipToBoard(ctx);ctx.textAlign='center';ctx.textBaseline='middle';
  const taken=[...avoid],r=boardRect();
  const free=b=>b.x>=r.x&&b.x+b.w<=r.x+r.w&&b.y>=r.y&&b.y+b.h<=r.y+r.h&&!taken.some(t=>b.x<t.x+t.w&&b.x+b.w>t.x&&b.y<t.y+t.h&&b.y+b.h>t.y);
  const ordered=[...city.nodes].sort((a,b)=>Number(TRANSFER_HUBS.includes(b.id))-Number(TRANSFER_HUBS.includes(a.id)));
  for(const node of ordered){const p=fitLatLon(node.lat,node.lon),hub=TRANSFER_HUBS.includes(node.id),size=hub?9.5:8,gap=(hub?13:10)*d;
    ctx.font=`${hub?'bold ':''}${Math.round(size*d)}px ui-monospace,monospace`;
    const w=ctx.measureText(node.name).width,h=size*d*1.25;
    // above, below, right, left — first one that is clear wins
    const spots=[[p.x-w/2,p.y-gap-h],[p.x-w/2,p.y+gap],[p.x+gap,p.y-h/2],[p.x-gap-w,p.y-h/2]].map(([x,y])=>({x,y,w,h}));
    const at=spots.find(free);if(!at)continue;taken.push(at);
    const tx=at.x+w/2,ty=at.y+h/2;
    ctx.lineWidth=3.2*d;ctx.strokeStyle='rgba(247,250,248,.92)';ctx.strokeText(node.name,tx,ty);
    ctx.fillStyle=hub?HUB_INK:'#5d6a72';ctx.fillText(node.name,tx,ty);}
  ctx.restore();}

function drawTransitInspector(){const c=$('map'),ctx=c.getContext('2d');ctx.fillStyle='#edf4f2';ctx.fillRect(0,0,c.width,c.height);drawWater(.8);transit?.draw(ctx,c.width,c.height,{alpha:.96,lineWidth:2.6*(renderer?.dpr||1)});}
// The district names were drawn on top of the stop names at the same size, so
// KÄPYLÄ and Käpylä sat on each other. They are the coarser layer, so they go
// UNDER the network as a wide watermark rather than competing with the labels.
function drawDistricts(){if(!city)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1;ctx.save();ctx.globalAlpha=.4;ctx.fillStyle='#93a0a4';ctx.font=`${Math.round(11*d)}px ui-monospace,monospace`;ctx.textAlign='center';ctx.letterSpacing=`${2*d}px`;
  for(const[id,label]of[['kapyla','KÄPYLÄ'],['pasila','PASILA'],['toolontori','TÖÖLÖ'],['kallionkirkko','KALLIO'],['rautatientori','KESKUSTA'],['kalasatama','KALASATAMA'],['lansiterminaali','LÄNSISATAMA'],['eira','EIRA'],['katajanokka','KATAJANOKKA']]){const n=city.resolved?.[id];if(!n)continue;const p=fitLatLon(n.lat,n.lon);ctx.fillText(label,p.x,p.y+26*d);}
  ctx.restore();}

// The active job's two ends, over everything: where you are and where the box
// has to go. Nothing between them is drawn — no route is the answer.
function drawJobEnds(){if(!challenge?.active||!city)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1;ctx.save();
  for(const[id,col]of[[challenge.currentFrom(),'#2f9fb8'],[challenge.currentTo(),cargoColour(challenge.active.cargo)]]){const n=city.resolved?.[id];if(!n)continue;const p=fitLatLon(n.lat,n.lon);ctx.strokeStyle=col;ctx.lineWidth=3.4*d;ctx.beginPath();ctx.arc(p.x,p.y,14*d,0,Math.PI*2);ctx.stroke();}
  ctx.restore();}

function paintHud(){if(!challenge||!flow)return;const c=challenge.active?challenge.cargoRule():null;$('done').textContent=`${challenge.index}/${DELIVERY_TARGET}`;$('reach').textContent=challenge.active?`${challenge.name(challenge.currentFrom())} → ${challenge.name(challenge.currentTo())}`:'dispatch';$('emit').textContent=challenge.active?`${challenge.remaining()}t`:`${challenge.score} pts`;$('cargoHud').textContent=c?c.icon:'JOB';$('cargoHud').style.borderColor=challenge.active?cargoColour(challenge.active.cargo):'';$('clock').textContent=`${String(6+Math.floor(flow.clock.dayProgress*16)).padStart(2,'0')}:00`;$('lines').textContent='HSL network';}
function paintSheet(){if(!challenge)return;const b=$('sheet');if(!challenge.active){if(!document.getElementById('jobBoard'))b.innerHTML='<p class="hint">Dispatching local jobs…</p>';return;}const j=challenge.active,c=challenge.cargoRule();b.innerHTML=`<div class="jobTop"><span class="cargoBadge" style="border-color:${cargoColour(j.cargo)}">${c.icon}</span><div><h2>JOB ${challenge.index+1}/${DELIVERY_TARGET}</h2><p class="route"><b>${esc(challenge.routeLabel())}</b></p></div></div><p class="hint">${esc(j.label)} · ${esc(j.cargo)}</p><p class="cargoRule">${esc(c.rule)}</p><div class="meter"><i style="width:${Math.max(0,Math.min(100,100*challenge.remaining()/j.limit))}%"></i></div><p class="hint">${challenge.remaining()} ticks remaining · score ${challenge.score}</p>`;}
function paintFeed(){const f=$('feed');if(!f)return;f.innerHTML='';for(const m of msgs.slice(0,3)){const d=document.createElement('div');d.textContent=m;f.append(d);}}
function finish(){if(done)return;done=true;flow.clock.setPaused(true);$('endTitle').textContent=challenge.complete?'ALL DELIVERED':'DAY OVER';$('endStats').innerHTML=`<p>deliveries <b>${challenge.index}/${DELIVERY_TARGET}</b></p><p>score <b>${challenge.score}</b></p><p>cargo bonuses <b>${challenge.bonuses}</b></p><p>late jobs <b>${challenge.late}</b></p>`;$('endNote').textContent=challenge.complete?'Ten Helsinki courier jobs complete.':'The shift ended; the route remains replayable.';$('end').hidden=false;}

// The board is painted here bottom-up — paper, water, districts, roads, lines,
// stops, job ends — rather than through FlowRenderer, which projects with the
// letterboxing graph fit and would disagree with every other layer about where
// a stop is. The renderer instance stays for dpr and resize; main-v212.js draws
// the live vehicles and walker on top through the same published projection.
function frame(now){const dt=last?Math.min(120,now-last):0;last=now;
  if(flow){flow.update(dt);
    if(transitView)drawTransitInspector();
    else{const c=$('map'),ctx=c.getContext('2d');ctx.fillStyle='#e6ece9';ctx.fillRect(0,0,c.width,c.height);
      ctx.save();clipToBoard(ctx);const r=boardRect();ctx.fillStyle='#edf4f2';ctx.fillRect(r.x,r.y,r.w,r.h);
      drawWater();drawDistricts();drawRoads();drawTransit();drawStops();drawJobEnds();drawLegend();ctx.restore();drawBoardFrame();}
    if(flow.clock.tick%10===0)paintHud();}
  requestAnimationFrame(frame);}

async function init(){
  $('play').disabled=true;$('play').textContent='LOADING HELSINKI…';
  try{const [r,w]=await Promise.all([fetch('./cities/helsinki.json',{cache:'no-store'}),fetch('../flow-core/data/kallio-water-v1.json',{cache:'no-store'})]);if(!r.ok)throw new Error(`HSL pack ${r.status}`);source=await r.json();water=w.ok?await w.json():null;transit=new TransitLayers(source);transit.showAll();city=buildRealHelsinki(source);box=boardBox(city.resolved);roads=roadPaths(city.resolved);{const kx=Math.cos(((box.n+box.s)*.5)*Math.PI/180);$('map').style.aspectRatio=`${(box.e-box.w)*kx} / ${box.n-box.s}`;renderer?.resize?.();}paintTransitPanel();boot();$('play').disabled=false;$('play').textContent='START SHIFT';requestAnimationFrame(frame);}catch(err){$('play').textContent='MAP LOAD FAILED';$('transitMeta').textContent=err.message;console.error(err);}
}

// Tapping the board. The whole verb set is READ the network and time it, and
// until now the map was the one thing you could not ask a question of — every
// answer lived in the sheet. One projection is published, so "what is coming
// through here, and which way is it going" is a nearest-node lookup and a
// direction read off the live fleet.
//
// It navigates on pointerup AND touchend, never click: the same trap hub/shell.js
// and the Toko signature both paid for. It reports what is APPROACHING rather
// than a route to take — naming an answer is what this build is built not to do.
function nodeAtPoint(px,py){if(!city)return null;const c=$('map'),r=c.getBoundingClientRect(),d=renderer?.dpr||1;
  const x=(px-r.left)*(c.width/r.width),y=(py-r.top)*(c.height/r.height);
  let best=null,bd=Infinity;for(const node of city.nodes){const p=fitLatLon(node.lat,node.lon),dist=Math.hypot(p.x-x,p.y-y);if(dist<bd){bd=dist;best=node;}}
  return bd<=26*d?best:null;}

function approachingAt(node){const out=[];const net=window.__tm?.liveNetwork;if(!net||!transit||!flow)return out;
  const kx=Math.cos(node.lat*Math.PI/180);
  for(const layer of transit.layers){if(!layer.visible||!layer.path?.length)continue;
    let bi=0,bd=Infinity;
    for(let i=0;i<layer.path.length;i++){const[lat,lon]=layer.path[i],dy=lat-node.lat,dx=(lon-node.lon)*kx,dd=dy*dy+dx*dx;if(dd<bd){bd=dd;bi=i;}}
    if(Math.sqrt(bd)>0.0009)continue;
    // 120 m in degrees, longitude scaled by cos(lat) — without that correction a
    // stop matches roughly twice as far east-west as north-south.
    for(const v of net.vehicles){if(v.layer.id!==layer.id)continue;
      const pos=net.position(v,flow.clock.tick);if(!pos)continue;
      const ahead=(bi-pos.pathIndex)*pos.direction;
      if(ahead<-1.5||ahead>60)continue;
      // A vehicle covers (path.length-1) indices per 1/speed ticks, so an index
      // gap is a real ETA in the same ticks the deadlines are counted in — the
      // first cut reported the raw index gap as "stops", which it never was.
      const ticks=Math.round(ahead*(1/v.speed)/Math.max(1,layer.path.length-1));
      out.push({name:layer.name,mode:layer.mode==='SUBWAY'?'metro':'tram',colour:layer.colour,
        ticks:Math.max(0,ticks),here:ahead<=1.5,dir:pos.direction});}}
  const best=new Map();
  for(const x of out){const k=`${x.name}:${x.dir}`;if(!best.has(k)||best.get(k).ticks>x.ticks)best.set(k,x);}
  return [...best.values()].sort((a,b)=>a.ticks-b.ticks).slice(0,6);}

function showStop(node,at=null){const pop=$('pop'),body=$('popBody');if(!pop||!body)return;
  const hub=TRANSFER_HUBS.includes(node.id),near=approachingAt(node);
  const rows=near.length?near.map(x=>`<div style="display:flex;gap:7px;align-items:center;padding:3px 0;border-top:1px dashed var(--rule)"><span style="display:inline-block;min-width:30px;text-align:center;background:${x.colour};color:#fff;font-weight:900;border-radius:3px;padding:1px 4px">${esc(x.name)}</span><span style="font-size:11px;color:var(--dim)">${x.mode} · ${x.here?'AT THE STOP':`${x.ticks}t away`}</span></div>`).join('')
    :'<p class="hint" style="margin-top:6px">Nothing within reach of this stop right now.</p>';
  body.innerHTML=`<b>${esc(node.name)}</b>${hub?' <span style="font-size:10px;color:var(--coral);font-weight:900">TRANSFER</span>':''}`
    +`<div class="tpMeta">${esc(node.hslStopName||'')} · ${esc(node.hslStopId||'')}</div>`+rows;
  pop.hidden=false;
  // Place it beside the stop, clamped inside the window. Unpositioned it sat in
  // the top-left corner, over the HOME button — the one control a player needs
  // to always be able to hit.
  if(at){const r=pop.getBoundingClientRect(),m=8;
    const x=Math.min(Math.max(m,at.x+14),innerWidth-r.width-m),y=Math.min(Math.max(m+44,at.y-r.height/2),innerHeight-r.height-m);
    pop.style.left=`${x}px`;pop.style.top=`${y}px`;pop.style.right='auto';pop.style.bottom='auto';}}

for(const ev of ['pointerup','touchend'])$('map').addEventListener(ev,e=>{
  if(transitView)return;const t=e.changedTouches?.[0]||e;const node=nodeAtPoint(t.clientX,t.clientY);
  if(node){showStop(node,{x:t.clientX,y:t.clientY});e.preventDefault();}else $('pop').hidden=true;},{passive:false});
addEventListener('resize',()=>renderer?.resize());
$('play').onclick=()=>{if(!flow)return;$('title').hidden=true;flow.clock.setPaused(false);};
$('pause').onclick=()=>{if(!flow)return;flow.clock.setPaused(!flow.clock.paused);$('pause').textContent=flow.clock.paused?'▶':'❚❚';};
$('speed').onclick=()=>{if(!flow)return;const s=flow.clock.speed>=4?1:flow.clock.speed*2;flow.clock.setSpeed(s);$('speed').textContent=`×${s}`;};
$('again').onclick=()=>{$('end').hidden=true;boot(7);publish();flow.clock.setPaused(false);};
$('transit').onclick=()=>transitView?hideTransit():showTransit();$('transitClose').onclick=hideTransit;$('tramOnly').onclick=()=>showTransit('TRAM');$('metroOnly').onclick=()=>showTransit('SUBWAY');$('allTransit').onclick=()=>showTransit('all');$('popClose').onclick=()=>{$('pop').hidden=true;};
init();
