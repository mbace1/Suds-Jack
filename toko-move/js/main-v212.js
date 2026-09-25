// Toko Move v2.12.2 runtime — clean HSL core + transfer hubs + walking/interception + two-job carry.
import './core-v212.js?v=57';
import './route-choice.js?v=23';
import {LiveNetwork,HEADWAY_MIN,MODE_KMH} from './live-network.js?v=14';
import {hidden as fogHides} from './weather.js?v=1';
import {mountCity,headwayFor,walkFactor,encounterCount,goodwillFactor,marketOf} from './city-events.js?v=1';
import {TRANSFER_HUBS,WALK_STREETS,walksFrom} from './hubs-walking.js?v=3';
import {MobilityController} from './mobility-v212.js?v=9';
import {interceptionOptions,bestInterception} from './interception-v212.js?v=2';
import {mountJobBoard,reachableSoon,planCost,alongOffersFor} from './job-board-v212.js?v=23';
import {mountEvents} from './events.js?v=4';
import {mountRival} from './rival.js?v=3';
import {loadVisited,saveVisited,visit,teach,progress,streetsAt} from './knowledge.js?v=2';
import {planEstimate} from './timetable.js?v=2';
import {ShiftLog} from './shiftlog.js?v=4';
import {Trails} from './trails.js?v=2';
import {mountHubTactics} from './hub-tactics-v212.js?v=6';
import {mountSkillMoments} from './moments-v212.js?v=2';
import {mountJuice} from './juice.js?v=1';
import {mountRecovery} from './recovery-v212.js?v=3';
import {about,inMinutes} from './ui.js?v=2';
const BUILD_VERSION='2.55';
function mount(){const tm=window.__tm;if(!tm?.transit||!tm?.flow||!tm?.city){setTimeout(mount,50);return;}tm.version=BUILD_VERSION;// THE DAY IS DRAWN BEFORE THE FLEET, because one of the four is a timetable:
// QUIET SUNDAY provisions fewer trams, and a fleet cannot be re-provisioned
// after its vehicles exist without every phase in it moving under the player.
tm.walkFactor=walkFactor(tm.cityDay)*(tm.weather?.walk||1);
// FOG (weather.js): how far off an arrival `eta` ticks away is, in metres at
// the line's own speed — the panel says "in the fog" past the fog's reach.
tm.inFog=(layer,eta)=>{const w=tm.weather;if(!w?.fogM||eta==null)return false;const tpm=tm.flow.clock.ticksPerDay/(tm.shift?.hours*60||75),kmh=(MODE_KMH[layer?.mode]||MODE_KMH.TRAM)*(w.speed||1);return eta/tpm*kmh*1000/60>w.fogM;};
{const mk=marketOf(tm.cityDay);
 if(mk){const at=(tm.transit?.pack?.stops||[]).filter(s=>s.name===mk.name);
  tm.market=at.length?{...mk,lat:at.reduce((a,s)=>a+s.lat,0)/at.length,lon:at.reduce((a,s)=>a+s.lon,0)/at.length}:mk;}
 else tm.market=null;}
tm.challenge.market=tm.market;
tm.liveNetwork=new LiveNetwork(tm.transit,{headwayMinutes:headwayFor(tm.cityDay,HEADWAY_MIN),ticksPerDay:tm.flow.clock.ticksPerDay,speedFactor:tm.weather?.speed||1});tm.challenge.reachable=o=>reachableSoon(tm,o);tm.challenge.estimate=o=>planCost(tm,o);tm.planCostFrom=(from,to)=>planCost(tm,{stops:[from,to],cargo:tm.challenge.active?.cargo});tm.planEstimateOf=plan=>planEstimate(tm,plan);tm.shiftLog=new ShiftLog(tm);tm.trails=new Trails();tm.challenge.refreshOffers();tm.transferHubs=TRANSFER_HUBS;tm.walkStreets=WALK_STREETS;tm.walksFrom=walksFrom;tm.mobility=new MobilityController(tm);tm.interceptionOptions=()=>interceptionOptions(tm);tm.bestInterception=()=>bestInterception(tm);// THE CITY YOU KNOW. You know a way on foot when you have been to BOTH ends
// of it — seeing a stop is what teaches you where it is. Owned here because
// knowledge.js is pure and the mobility controller only needs to ask.
tm.visited=loadVisited();
tm.visitHere=id=>{if(!visit(tm.visited,id))return false;saveVisited(tm.visited);const p=progress(tm.visited),st=streetsAt(id);
  tm.challenge.say?.(`FIRST TIME AT ${tm.challenge.name(id)}${st.length?` · ${st.join(', ')}`:''} · ${p.known}/${p.total} walks open`);return true;};
tm.teachStreet=seed=>{const id=teach(tm.visited,seed);if(id){saveVisited(tm.visited);tm.challenge.say?.(`SHOWN THE WAY · ${tm.challenge.name(id)} is walkable from here`);}return id;};
tm.visitHere(tm.challenge.currentFrom?.()||'lasipalatsi');
tm.alongOffers=()=>alongOffersFor(tm);mountJobBoard(tm);mountHubTactics(tm);mountSkillMoments(tm);mountJuice(tm);mountRecovery(tm);mountCity(tm);mountEvents(tm,tm.shiftSeed??7,{encounters:encounterCount(tm.cityDay,null),goodwill:goodwillFactor(tm.cityDay)});mountRival(tm,tm.shiftSeed??7);const canvas=document.getElementById('map'),ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;const project=(lat,lon)=>tm.project(lat,lon);const nodePoint=id=>{const n=tm.city.resolved?.[id];return n?project(n.lat,n.lon):null;};const drawTransitLayer=()=>{if(document.body.classList.contains('transit-view')||!tm.transit)return;tm.transit.draw(ctx,canvas.width,canvas.height,{fit:project,alpha:.96,lineWidth:2.5*(tm.renderer?.dpr||window.devicePixelRatio||1)});};// Which lines are any use to you RIGHT NOW: the one you are on, the one your plan
// says to take, and the ones the board is offering. Those keep a readable badge in a
// crowd; everything else yields to a dot. Without this the declutter would be
// arbitrary about which tram it silenced, and the silenced one is often yours.
const relevantLines=()=>{const s=new Set(),ch=tm.challenge,st=tm.mobility?.status?.();
  const add=l=>{if(l?.label)s.add(l.label);if(l?.sourceId)s.add(l.sourceId);if(typeof l==='string')s.add(l);};
  add(st?.ride?.line);for(const leg of ch?.selectedPlan?.legs||[])add(leg?.line);
  for(const c of document.getElementById('routeChoices')?._choices||[])for(const leg of c?.legs||[])add(leg?.line);
  for(const l of document.getElementById('jobBoard')?._lines||[])add(l);   // at dispatch: the lines the offers would put you on
  return s;};
const drawInterception=()=>{const hit=bestInterception(tm);if(!hit)return;const b=nodePoint(hit.hub);if(!b)return;const d=tm.renderer?.dpr||window.devicePixelRatio||1;ctx.save();ctx.fillStyle='#fffdf7';ctx.strokeStyle=hit.layer?.colour||'#233d4d';ctx.lineWidth=2*d;ctx.font=`bold ${Math.round(11*d)}px ui-monospace,monospace`;const text=`WALK ${about(hit.walkTicks,tm)} → ${hit.line.label} ${inMinutes(hit.waitTicks,tm)}`,pad=6*d,w=ctx.measureText(text).width+pad*2,h=22*d,x=b.x-w/2,y=b.y-34*d;ctx.beginPath();ctx.roundRect(x,y,w,h,4*d);ctx.fill();ctx.stroke();ctx.fillStyle='#15262b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,b.x,y+h/2);ctx.restore();};// THE COURIER IS A FIGURE, AND IS ON THE BOARD WHENEVER YOU ARE. It used to
// be a navy dot marked W, and only while walking — standing at a stop you were
// nowhere on the map at all, which is most of the shift and most of "I don't
// know how to move". A flat fill inside a hard line, the house register: head,
// coat, two legs that swap on a five-tick gait while walking and stand while
// waiting. Riding, the selected badge is you and nothing else is drawn.
// THE OTHER COURIER, drawn the way you are but in their own colour and
// without the bag's navy — you must be able to tell at a glance which figure
// is yours. A dashed line to where they are heading, because a rival you
// cannot read is just a sprite.
const drawRival=()=>{const r=tm.rival,p=r?.position?.();if(!p)return;const d=tm.renderer?.dpr||window.devicePixelRatio||1,q=project(p.lat,p.lon),x=q.x,y=q.y-9*d;
  {const b=p.target;if(b){const t=project(b.lat,b.lon),race=p.kind==='race';ctx.save();ctx.strokeStyle=race?'rgba(155,89,182,.9)':'rgba(155,89,182,.5)';ctx.lineWidth=(race?3:2)*d;ctx.setLineDash(race?[6*d,4*d]:[4*d,4*d]);ctx.lineDashOffset=race?-performance.now()/40:0;ctx.beginPath();ctx.moveTo(x,y+6*d);ctx.lineTo(t.x,t.y);ctx.stroke();
    // HE IS COMING FOR YOUR JOB (rival.js, v2.53): the stop he is racing to
    // pulses in his colour with the seconds he has left — the same seconds
    // the board's row counts (ten ticks a second at x1).
    if(race){const left=r.claim?Math.max(0,r.claim.at-tm.flow.clock.tick):0,pulse=0.5+0.5*Math.sin(performance.now()/150);
     ctx.setLineDash([]);ctx.strokeStyle=`rgba(155,89,182,${(0.5+0.5*pulse).toFixed(2)})`;ctx.lineWidth=(3+2*pulse)*d;ctx.beginPath();ctx.arc(t.x,t.y,(16+4*pulse)*d,0,Math.PI*2);ctx.stroke();
     const lab=`${r.name.toUpperCase()} · ${Math.ceil(left/10)} s`;ctx.font=`900 ${Math.round(10*d)}px ui-monospace,monospace`;ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=3*d;ctx.strokeStyle='#fffdf7';ctx.strokeText(lab,t.x,t.y+30*d);ctx.fillStyle='#7d3c98';ctx.fillText(lab,t.x,t.y+30*d);}
    ctx.restore();}}
  const step=Math.floor(tm.flow.clock.tick/5)%2,ink='#0f1418',coat='#9b59b6',skin='#e8d3c0';
  if(p.carrying){ctx.save();ctx.fillStyle='#c58b3c';ctx.strokeStyle=ink;ctx.lineWidth=1.5*d;ctx.beginPath();ctx.roundRect(x+2*d,y-4*d,7*d,7*d,1.5*d);ctx.fill();ctx.stroke();ctx.restore();}   // the job he took, on his back
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  const body=()=>{ctx.beginPath();ctx.moveTo(x-4*d,y-2*d);ctx.lineTo(x+4*d,y-2*d);ctx.lineTo(x+3.5*d,y+6*d);ctx.lineTo(x-3.5*d,y+6*d);ctx.closePath();};
  const legs=()=>{ctx.beginPath();ctx.moveTo(x-2*d,y+6*d);ctx.lineTo(x-(step?5:1)*d,y+12*d);ctx.moveTo(x+2*d,y+6*d);ctx.lineTo(x+(step?1:5)*d,y+12*d);};
  const head=()=>{ctx.beginPath();ctx.arc(x,y-6*d,3.6*d,0,Math.PI*2);};
  ctx.strokeStyle='rgba(255,253,247,.9)';ctx.lineWidth=5*d;body();ctx.stroke();legs();ctx.stroke();head();ctx.stroke();
  ctx.strokeStyle=ink;ctx.lineWidth=2*d;legs();ctx.stroke();
  body();ctx.fillStyle=coat;ctx.fill();ctx.stroke();
  head();ctx.fillStyle=skin;ctx.fill();ctx.stroke();
  ctx.restore();};
// YOUR STOP, TAPPABLE (v2.50): when the ride reaches it, the stop pulses and a
// tap on it gets you off — the map's half of the GET OFF button.
const drawGetOff=()=>{const st=tm.mobility?.status?.();if(st?.kind!=='getoff')return;const p=nodePoint(st.at);if(!p)return;const d=tm.renderer?.dpr||window.devicePixelRatio||1,pulse=0.5+0.5*Math.sin(performance.now()/160);
  ctx.save();ctx.strokeStyle=`rgba(35,61,77,${(0.6+0.4*pulse).toFixed(2)})`;ctx.lineWidth=(3+2*pulse)*d;ctx.beginPath();ctx.arc(p.x,p.y,(14+5*pulse)*d,0,Math.PI*2);ctx.stroke();
  ctx.font=`bold ${Math.round(10*d)}px ui-monospace,monospace`;ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=3*d;ctx.strokeStyle='#fffdf7';ctx.strokeText('TAP · GET OFF',p.x,p.y-(24*d));ctx.fillStyle='#233d4d';ctx.fillText('TAP · GET OFF',p.x,p.y-(24*d));ctx.restore();};
const drawCourier=()=>{const st=tm.mobility?.status?.();if(!st||st.kind==='riding'||st.kind==='getoff')return;
  let x,y,walking=false;const d=tm.renderer?.dpr||window.devicePixelRatio||1;
  if(st.kind==='walking'){
    // v2.55: along the street, not through the block — the line still to walk
    // is drawn ahead of the figure as a dashed trail, so where you are going
    // reads before you get there.
    const line=tm.walkLine?.(st),e=tm.walkProgress?.(st)??0,ll=line&&tm.courierLatLon?.();
    if(ll){const p=project(ll.lat,ll.lon);x=p.x;y=p.y;
      // Ink dashes on a white casing: the walk runs down the same streets the
      // trams do, and an orange dash vanished into the orange line under it.
      ctx.save();ctx.lineCap='butt';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x,y);
      let run=0;const M=(a,b)=>Math.hypot((a[0]-b[0])*111320,(a[1]-b[1])*55800),total=line.slice(1).reduce((m,q,i)=>m+M(line[i],q),0),goal=e*total;
      for(let i=1;i<line.length;i++){run+=M(line[i-1],line[i]);if(run>goal){const q=project(line[i][0],line[i][1]);ctx.lineTo(q.x,q.y);}}
      ctx.setLineDash([6*d,4*d]);ctx.strokeStyle='rgba(255,253,247,.95)';ctx.lineWidth=5*d;ctx.stroke();
      ctx.strokeStyle='#0f1418';ctx.lineWidth=2.2*d;ctx.stroke();ctx.restore();}
    else{const a=nodePoint(st.from),b=nodePoint(st.to);if(!a||!b)return;x=a.x+(b.x-a.x)*e;y=a.y+(b.y-a.y)*e;}
    walking=true;}
  else{const ll=tm.courierLatLon?.();if(!ll)return;const p=project(ll.lat,ll.lon);x=p.x;y=p.y-9*d;}
  const step=walking?Math.floor(tm.flow.clock.tick/5)%2:0,ink='#0f1418',coat='#e2683c',skin='#f3d5b5';
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  // halo so the figure reads on any ground
  ctx.strokeStyle='rgba(255,253,247,.9)';ctx.lineWidth=5*d;
  const body=()=>{ctx.beginPath();ctx.moveTo(x-4*d,y-2*d);ctx.lineTo(x+4*d,y-2*d);ctx.lineTo(x+3.5*d,y+6*d);ctx.lineTo(x-3.5*d,y+6*d);ctx.closePath();};
  const legs=()=>{ctx.beginPath();if(walking){ctx.moveTo(x-2*d,y+6*d);ctx.lineTo(x-(step?5:1)*d,y+12*d);ctx.moveTo(x+2*d,y+6*d);ctx.lineTo(x+(step?1:5)*d,y+12*d);}else{ctx.moveTo(x-2*d,y+6*d);ctx.lineTo(x-2*d,y+12*d);ctx.moveTo(x+2*d,y+6*d);ctx.lineTo(x+2*d,y+12*d);}};
  const head=()=>{ctx.beginPath();ctx.arc(x,y-6*d,3.6*d,0,Math.PI*2);};
  body();ctx.stroke();legs();ctx.stroke();head();ctx.stroke();
  ctx.strokeStyle=ink;ctx.lineWidth=2*d;
  legs();ctx.stroke();
  body();ctx.fillStyle=coat;ctx.fill();ctx.stroke();
  head();ctx.fillStyle=skin;ctx.fill();ctx.stroke();
  // the bag: what makes a courier a courier
  ctx.beginPath();ctx.rect(x+3*d,y-1*d,3.5*d,4.5*d);ctx.fillStyle='#233d4d';ctx.fill();ctx.stroke();
  ctx.restore();};
// The ride card in route-choice.js says ON TRAM 1H → Ooppera with the strip
// and the countdown; this slot used to say ON TRAM 1H a second time above it.
// It now carries only the one thing that card does not: a second job aboard.
const rideStatus=()=>{const ch=tm.challenge,el=tm.sheetSlot?.('rideStatus');if(!el)return;const st=tm.mobility?.status?.();
  if(!ch?.active||st?.kind!=='riding'||!ch.queued){if(el.innerHTML)el.innerHTML='';return;}
  const html=`<div style="margin-top:8px;padding:8px;border:2px solid #e2683c;border-radius:8px;background:#fff8ef;font-size:11px"><b>SECOND JOB ONBOARD</b> → ${ch.name(ch.queued.originalStops?.[1]||ch.queued.stops[1])}</div>`;
  if(el.innerHTML!==html)el.innerHTML=html;};
const draw=()=>{tm.shiftLog?.poll();if(!document.body.classList.contains('transit-view')){const dpr=tm.renderer?.dpr||window.devicePixelRatio||1,base=tm.fleetFilter?.(),here=tm.weather?.fogM?tm.courierLatLon?.():null,filter=here?(lat,lon,l,v)=>(!base||base(lat,lon,l,v))&&(v?.id===tm.liveNetwork?.selectedVehicleId||!fogHides(tm.weather,here,{lat,lon})):base;/* FOG: nothing past its reach but the ride you are on */tm.trails?.update(ctx,tm.liveNetwork,tm.flow.clock.tick,project,dpr,filter);const rel=relevantLines(),budget=Math.max(10,Math.min(32,Math.round((canvas.width/dpr)*(canvas.height/dpr)/11000))),lit=new Set((tm.catchables?.()||[]).map(x=>x.vehicle.id)),boxes=tm.liveNetwork?.draw(ctx,tm.flow.clock.tick,project,dpr,{filter,priority:(l,v)=>lit.has(v?.id)?2.5:rel.has(l?.name)||rel.has(l?.id)?2:1,budget,lit,now:performance.now(),full:tm.rushOn?tm.isFull:null})||[];tm.drawStopLabels?.(boxes);drawRival();drawCourier();drawInterception();drawGetOff();tm.juice?.draw(ctx,project,dpr);rideStatus();}requestAnimationFrame(draw);};requestAnimationFrame(draw);}
mount();
