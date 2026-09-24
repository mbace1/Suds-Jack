// Toko Move v2.12 clean runtime core — no RouteDrawer, no player-built lines, no wrapper-era fake vehicles.
import {createFlow} from '../../flow-core/sim.js?v=2';
import {FlowRenderer} from '../../flow-core/render.js?v=3';
import {THEME} from './palette.js?v=1';
import {DeliveryChallenge,DELIVERY_TARGET} from './deliveries.js?v=20';
import {TransitLayers} from './transit-layers.js?v=7';
import {buildRealHelsinki} from './real-helsinki.js?v=2';
import {boardBox,boardFit,roadPaths,lineFamily,ROAD_INK,ROAD_INK_MAJOR,ROAD_INK_MID,ROAD_INK_MINOR,HUB_INK,NIGHT} from './board.js?v=6';
import {TRANSFER_HUBS} from './hubs-walking.js?v=3';
import {SHIFT} from './live-network.js?v=12';
import {Camera,SCALES,FLEET_RADIUS_M,metresBetween} from './camera.js?v=1';
import {loadGround,STREET_TIERS} from './ground.js?v=10';
import {dots,minutes} from './ui.js?v=1';
import {landmarkPoints,drawLandmarks} from './landmarks.js?v=3';
import {drawCityEvent,family as dayFamily} from './city-events.js?v=1';
import {dailyName,resolveShift,todayRecord,recordDaily,streak,shareText,grid as dailyGrid} from './daily.js?v=1';
import * as Week from './week.js?v=2';
import * as Kit from './kit.js?v=1';
import {drawWeather} from './weather.js?v=1';
import {colourOf,parcelHtml,bagHtml} from './parcels.js?v=1';

const $=id=>document.getElementById(id);
const BUILD_VERSION='2.49';
const MAP_THEME={...THEME,latent:THEME.paper,hideQueues:true,hideLoadMarks:true,hideCarriers:true,modeColours:{metro:'rgba(0,0,0,0)',tram:'rgba(0,0,0,0)',car:'rgba(0,0,0,0)'}};
const cargoColour=colourOf;   // ONE palette: this file and the job board drew the same parcel in two different colours until v2.43
const esc=s=>String(s??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]||ch));
let flow,challenge,renderer,transit,city,water,ground,source,transitView=false,done=false,last=0,msgs=[];
let box,roads,camera;
// THE SHIFT SEED. Every shift used to be seed 7 — the same three encounters at
// the same three minutes, the same rival claim, for ever. A deck that cannot
// vary is a deck nobody plays twice, so a shift now has a NUMBER: random per
// visit, pinned by `?shift=N` so a shift can be replayed and a bot can be
// pointed at one, printed on the title card and the end screen so a player can
// say which shift beat them. It drives the event deck, the rival and the day —
// NOT the job offers, which still come from the same hash they always did.
// That is deliberate and it is the next thing to do rather than a thing done:
// varying the jobs in the same version as the days would leave two changes
// arguing over one measurement.
const params=new URLSearchParams(location.search);
// v2.45: no parameter is TODAY'S shift — the date is the seed, the same for
// everyone who opens the game today (daily.js). `?shift=N` still pins one and
// `?shift=random` still deals a fresh one.
// v2.47: `?week` is THE WEEK (week.js) — five shifts and rent on Friday. The
// page is one shift of it; the save says which, and a shift left half-played
// was closed as the page opened (leaving is clocking out).
let WEEK=params.has('week')?Week.resume():null;
if(WEEK&&Week.isOver(WEEK)){Week.clearWeek();WEEK=Week.resume();}
const WEEK_DAY=WEEK?Week.today(WEEK):null;
const SHIFT_INFO=WEEK?{kind:'week',seed:WEEK_DAY.seed,index:WEEK_DAY.index,name:WEEK_DAY.name}:resolveShift(params);
const shiftSeed=SHIFT_INFO.seed;
const shiftLabel=()=>SHIFT_INFO.kind==='daily'?`${dailyName(SHIFT_INFO.number).toUpperCase()} · ${SHIFT_INFO.label}`:SHIFT_INFO.kind==='week'?`WEEK ${WEEK.seed} · ${SHIFT_INFO.name}`:`shift #${shiftSeed}`;
const cityDay=drawCityEvent(shiftSeed,WEEK?WEEK_DAY.day:params.get('day'));
// v2.48: KIT (kit.js). A week carries what was picked on its nights. `?kit=`
// applies it to a pinned or random shift — the bot measures each item that way
// — and never to the daily, whose result is one everybody can compare.
const KIT_IDS=WEEK?Week.owned(WEEK):SHIFT_INFO.kind==='daily'?[]:Kit.parse(params.get('kit'));
const KIT_FX=Kit.effects(KIT_IDS);
// v2.49: WEATHER (weather.js) — a look and a lever per morning, drawn from the
// shift. `?weather=` pins it; the harness's `?day=none` control means clear.
const WEATHER=drawWeather(shiftSeed,params.get('weather'),params.get('day'));
const say=s=>{if(msgs[0]===s)return;msgs.unshift(s);msgs.length=Math.min(8,msgs.length);paintFeed();};  // a line repeated back to back is a double call, not news

function publish(){window.__tm={...(window.__tm||{}),version:BUILD_VERSION,shiftSeed,shiftInfo:SHIFT_INFO,cityDay,kit:KIT_IDS,kitFx:KIT_FX,weather:WEATHER,flow,challenge,renderer,transit,city,water,board:box,project:fitLatLon,projection,camera,ground,landmarkPoints:()=>_lmPoints,fleetFilter,courierLatLon,drawStopLabels,shift:SHIFT,say,paintHud,paintSheet,sheetSlot};}

// THE one projection. It used to go lat/lon -> graph space -> flow.graph.fit(),
// and fit() letterboxes with Math.min: the board is portrait (about 4km across
// by 7km tall) and the canvas is landscape, so the whole city was squeezed into
// a narrow column while the far ends of M1 and M2 sprawled off both sides. Every
// delivery anchor sits inside 9.1% of the pack's area and that is exactly what
// it looked like. Going straight from lat/lon through the board box fills the
// canvas with the part of Helsinki the game is played in.
// It also used to rebuild the whole projection on EVERY call — a cos, two
// closures, per point, per path, per frame — which was affordable at one fixed
// scale and is not once a camera makes the answer change continuously. It is
// memoised on the only five numbers it depends on.
let _proj=null,_base=null,_pw=0,_ph=0,_pz=-1,_px=0,_py=0;
function projection(){const c=$('map'),z=camera?camera.zoom:1,cx=camera?camera.cx:0,cy=camera?camera.cy:0;
  if(!_proj||_pw!==c.width||_ph!==c.height||_pz!==z||_px!==cx||_py!==cy){
    _base=boardFit(box,c.width,c.height);_proj=camera?camera.apply(_base,c.width,c.height):_base;
    _pw=c.width;_ph=c.height;_pz=z;_px=cx;_py=cy;}
  return _proj;}
function baseProjection(){projection();return _base;}
function fitLatLon(lat,lon){return projection()(lat,lon);}
function coverageLabel(s){return s?.clippedTo?`exact inside ${s.clippedTo.s}–${s.clippedTo.n} N`:'full Helsinki source pack';}

function boot(seed=7){
  if(!city)return;
  // The shift ends on the delivery that completes it, whether or not anything
  // else changed that tick: step() only reports events and crowds, so tying the
  // end card to it left a won shift running (v2.29-v2.45) until an event
  // happened to fire, and on a quiet day none did. The day's end always ends it.
  flow=createFlow({city,seed,days:1,demand:null,ticksPerDay:SHIFT.ticksPerDay,hooks:{onTick:()=>{const changed=challenge?.step?.();if(changed){paintHud();paintSheet();}weekProgress();if(challenge?.complete)finish();},onDay:()=>finish()}});
  challenge=new DeliveryChallenge(flow,say);challenge.shiftSeed=shiftSeed;challenge.kit=KIT_FX;if(WEEK)challenge.useStanding(Week.standingStore(WEEK));done=false;msgs=[];
  renderer=new FlowRenderer($('map'),MAP_THEME);
  challenge.start();publish();paintHud();paintSheet();
}

// WHICH SCALE A PHONE OPENS AT. Measured, not preferred: CITY fits the whole
// board by HEIGHT, and board.js then grows the box sideways to fill the canvas
// (growing rather than cropping, so no stop is ever hidden). On a desktop the
// map element carries the board's own portrait aspect and the growth is tiny.
// On a phone `width:100%` and `max-height` force the element landscape, the
// grown half has no ground, no water and no streets in it — the data ends where
// the extract does — and 48% of the map is black. The badges that survive pile
// into an unreadable heap in the middle.
//
// ROUTE's 4 km viewport is a CROP of the board rather than a fit to it, so it
// is full of map at any element shape, and it is the scale the game is played
// at anyway. CITY stays one tap away on the rail; this only picks the opening.
function openingScale(){if(!camera)return;if(innerWidth>=900)return;
  camera.snapTo('route');camera.zoom=camera.targetZoom;}

function paintTransitPanel(){
  if(!transit)return;
  const s=transit.source;$('transitMeta').textContent=`${s.source} · ${s.fetched} · ${transit.layers.length} source lines · ${coverageLabel(s)}`;
  const rows=$('transitRows');rows.innerHTML='';
  for(const layer of transit.layers){const row=document.createElement('div');row.className='lineRow';row.innerHTML=`<span class="lineSwatch" style="background:${layer.colour}"></span><label><input type="checkbox" ${layer.visible?'checked':''}> ${esc(layer.name)} <small>${layer.mode==='SUBWAY'?'metro':'tram'}</small></label><button class="ctl">SOLO</button>`;row.querySelector('input').onchange=e=>transit.setVisible(layer.id,e.target.checked);row.querySelector('button').onclick=()=>{transit.solo(layer.id);paintTransitPanel();};rows.append(row);}
}
function showTransit(mode='all'){transitView=true;document.body.classList.add('transit-view');$('transitPanel').hidden=false;if(mode==='TRAM')transit.showAll('TRAM');else if(mode==='SUBWAY')transit.showAll('SUBWAY');else transit.showAll();paintTransitPanel();}
function hideTransit(){transitView=false;document.body.classList.remove('transit-view');$('transitPanel').hidden=true;}

function drawWater(ctx=$('map').getContext('2d'),alpha=.92){const src=ground?.water||water;if(!src||!city||!flow)return;const d=renderer?.dpr||1;ctx.save();ctx.globalAlpha=alpha;
  // Inland bodies are closed rings and fill. The SEA does not: an OSM coastline
  // is a directed OPEN line — land on its left, water on its right — and closing
  // it into a polygon is inventing a shape the data does not contain. (The
  // earlier lane tried three closures and completed none of them.) So the sea
  // is not filled; it is SHOWN, by shading outward from the shore on the side
  // the data itself says is water. Three offset passes, fading out, which reads
  // as sea at a glance and is derived rather than drawn: flip the winding and
  // the shading goes inland, which is exactly the error it would be.
  ctx.strokeStyle=NIGHT.water;ctx.fillStyle=NIGHT.waterFill;ctx.lineWidth=1.2*d;
  for(const area of src.areas||[]){if(!area.shape?.length)continue;ctx.beginPath();area.shape.forEach(([lat,lon],i)=>{const p=fitLatLon(lat,lon);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.lineJoin='round';ctx.lineCap='round';
  for(const[off,w,a]of[[13,17,.30],[6,11,.42],[1.6,5,.60]]){
    ctx.strokeStyle=NIGHT.waterFill;ctx.globalAlpha=alpha*a;ctx.lineWidth=w*d;
    for(const edge of src.edges||[]){const pts=(edge.shape||[]).map(([lat,lon])=>fitLatLon(lat,lon));if(pts.length<2)continue;
      ctx.beginPath();
      for(let i=0;i<pts.length;i++){
        // the right-hand normal of the direction of travel = the water side
        const a0=pts[Math.max(0,i-1)],b0=pts[Math.min(pts.length-1,i+1)];
        const dx=b0.x-a0.x,dy=b0.y-a0.y,len=Math.hypot(dx,dy)||1;
        const x=pts[i].x+(dy/len)*off*d,y=pts[i].y-(dx/len)*off*d;
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
      ctx.stroke();}}
  ctx.globalAlpha=alpha;ctx.strokeStyle=NIGHT.waterEdge;ctx.lineWidth=1.6*d;
  for(const edge of src.edges||[]){if(!edge.shape?.length)continue;ctx.beginPath();edge.shape.forEach(([lat,lon],i)=>{const p=fitLatLon(lat,lon);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.stroke();}
  ctx.restore();}

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
function drawRoads(ctx=$('map').getContext('2d')){const d=renderer?.dpr||1,scale=camera?.nearestScale()||'city';
  // TWO REAL SOURCES, SPLIT BY GEOGRAPHY, and no authored line anywhere.
  //
  // Inside the OSM street extract — 9.2 km² of a 41.2 km² board — the ground is
  // OpenStreetMap ways. Outside it, where the board used to fall back to twelve
  // hand-drawn corridors, it is now HSL's own service corridors from the GTFS
  // feed, clipped by ground.js to exactly the ground OSM does not cover so the
  // two never draw the same street twice with slightly different geometry.
  //
  // Which one you are looking at no longer depends on where the CAMERA is — the
  // first cut chose a source by the camera centre, which meant panning across
  // the extract boundary swapped the whole ground layer under you. Geography
  // decides, so both are on screen at once and the seam is where the data's
  // seam actually is.
  //
  // The corridors are not a street map and the credit line says so. What they
  // are is the streets that carry service, which is the right thing for the
  // coarse layer to be: an arterial is exactly a street a bus runs on.
  const W={minor:1.5,mid:2.6,major:4.2},INK={minor:ROAD_INK_MINOR,mid:ROAD_INK_MID,major:ROAD_INK_MAJOR};
  const tiers=STREET_TIERS[scale]||STREET_TIERS.city;
  const trace=shape=>shape.forEach(([lat,lon],i)=>{const p=fitLatLon(lat,lon);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});
  ctx.save();ctx.lineJoin='round';ctx.lineCap='butt';
  if(ground?.byTier||ground?.corridorRuns?.length){
    // thin first, thick last, so an arterial crosses over a side street rather
    // than being nibbled by it
    for(const tier of ['minor','mid','major']){if(!tiers.includes(tier))continue;
      ctx.strokeStyle=INK[tier];ctx.lineWidth=W[tier]*d;ctx.beginPath();
      for(const r of ground.byTier?.[tier]||[])trace(r.shape);
      for(const r of ground.corridorRuns||[])if(r.tier===tier)trace(r.shape);
      ctx.stroke();}}
  else if(roads?.length){ctx.strokeStyle=ROAD_INK_MINOR;ctx.lineWidth=2.2*d;ctx.globalAlpha=.85;
    for(const road of roads){ctx.beginPath();trace(road.path);ctx.stroke();}}
  ctx.restore();}

// WHAT IS ON SCREEN. boardRect() is the board in canvas pixels and moves with
// the camera, so once you can zoom it is regularly bigger than the canvas — and
// the legend, the frame and the label placement all used it as "the area I may
// draw in". Zoomed in they were laying their work out against a rectangle three
// screens wide. viewRect is the intersection: the part of the board you can
// actually see, which is what those three layers meant all along.
function viewRect(){const c=$('map'),r=boardRect();
  const x=Math.max(0,r.x),y=Math.max(0,r.y);
  return{x,y,w:Math.max(0,Math.min(r.x+r.w,c.width)-x),h:Math.max(0,Math.min(r.y+r.h,c.height)-y)};}

// WHERE THE COURIER IS. The camera follows this, and the 2 km circle is measured
// from it. It is read off the mobility controller rather than stored, because
// mobility already owns the answer in all four of its states and a second copy
// would be a second truth: waiting at a stop, walking between two, riding a
// vehicle whose live position the fleet knows, or standing on the step of one.
function courierLatLon(){
  const tm=window.__tm,mob=tm?.mobility,at=id=>{const n=city?.resolved?.[id];return n?{lat:n.lat,lon:n.lon}:null;};
  // Before the first job there is no courier, and the camera used to sit on the
  // board's geometric middle — which is a field in Töölö, not anywhere the game
  // is about to happen. During dispatch you are standing AT the hub the offers
  // leave from, so that is where the camera looks and where the circle is drawn.
  if(!challenge?.active)return at(challenge?.offers?.[0]?.stops?.[0]||challenge?.currentFrom?.());
  const st=mob?.status?.();
  if(st?.kind==='walking'){const a=at(st.from),b=at(st.to);if(a&&b){const span=Math.max(1,st.arriveTick-st.startTick),
      t=Math.max(0,Math.min(1,(flow.clock.tick-st.startTick)/span)),e=t*t*(3-2*t);
    return{lat:a.lat+(b.lat-a.lat)*e,lon:a.lon+(b.lon-a.lon)*e};}}
  if(st?.kind==='riding'&&st.ride?.position)return{lat:st.ride.position.lat,lon:st.ride.position.lon};
  return at(st?.at||challenge.currentFrom());}

// WHICH LINES PASS BY ME. The same 120 m test approachingAt() uses, cached on the
// point asked about — it walks every point of all 34 layers, which is fine once
// and not fine sixty times a second.
// It keeps WHERE on each path you stand, not just that you are on it, because
// "will pass by me" is a question about direction: a tram that has already gone
// through your stop is not one you can catch, and drawing it as though it were
// is the same lie as drawing one on the other side of the city.
// Recomputed at most once every ten ticks (one second). It walks every point of
// all 34 layers, and while you are RIDING the courier position changes every
// frame — so a cache keyed only on position never hit, and the city view went
// from 60 to 30 frames a second doing 14,000 distance tests per frame to answer
// a question whose answer changes about once a stop.
let _nearCache={key:'',map:new Map(),at:-999};
function layersNear(lat,lon,metres=180){
  const key=`${lat.toFixed(4)},${lon.toFixed(4)},${metres}`,now=flow?.clock?.tick||0;
  if(_nearCache.key===key||now-_nearCache.at<10)return _nearCache.map;
  const map=new Map();
  for(const layer of transit?.layers||[]){if(!layer.path?.length)continue;
    let bi=-1,bd=Infinity;
    for(let i=0;i<layer.path.length;i++){const[la,lo]=layer.path[i],d=metresBetween(la,lo,lat,lon);if(d<bd){bd=d;bi=i;}}
    if(bd<=metres)map.set(layer.id,bi);}
  _nearCache={key,map,at:now};return map;}

// THE FLEET RULE, applied. Returns a predicate the live layer asks about each
// vehicle before it draws a badge. Two regimes, per the owner's direction and
// per camera.fleetRule(): zoomed in, everything in frame; at city scale, the
// services that pass where you stand, inside the 2 km circle. The vehicle you
// are actually riding is never filtered out of its own ride.
function fleetFilter(){
  const c=$('map'),rule=camera?camera.fleetRule():'viewport';
  const riding=window.__tm?.liveNetwork?.selectedVehicleId||null;
  if(rule==='viewport'){const m=48;
    return(lat,lon,layer,v)=>{if(v&&v.id===riding)return true;const p=fitLatLon(lat,lon);
      return p.x>=-m&&p.x<=c.width+m&&p.y>=-m&&p.y<=c.height+m;};}
  const me=courierLatLon()||{lat:(box.n+box.s)/2,lon:(box.e+box.w)/2};
  const lines=layersNear(me.lat,me.lon),net=window.__tm?.liveNetwork,tick=flow?.clock?.tick||0;
  return(lat,lon,layer,v)=>{if(v&&v.id===riding)return true;
    const mine=lines.get(layer.id);if(mine==null)return false;
    if(metresBetween(lat,lon,me.lat,me.lon)>FLEET_RADIUS_M)return false;
    // "will pass by me": the stop has to be AHEAD of it along the direction it
    // is actually travelling. Two ticks of slack so a vehicle sitting on the
    // stop does not blink out at the moment you would board it.
    const p=v&&net?.position?.(v,tick);
    return !p||(mine-p.pathIndex)*p.direction>=-2;};}

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
function drawLegend(){if(!transit)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1,r=viewRect();
  // No key on a phone: seventeen chips over the bottom of a 390px map were the
  // loudest thing on it, and every badge and every row already wears its line.
  if($('map').width/d<600)return;
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
  let y=r.y+r.h-(rows.length*(h+4*d))-4*d-creditHeight()*d;   // above the licence line, however tall it is
  for(const row of rows){const rowW=row.reduce((a,it)=>a+it.tw+gap,0)-gap;let x=r.x+(r.w-rowW)/2;
    for(const it of row){ctx.fillStyle=it.colour;ctx.beginPath();ctx.roundRect(x,y,it.tw,h,3*d);ctx.fill();
      ctx.fillStyle='#fff';ctx.fillText(it.f,x+it.tw/2,y+h/2+.5*d);x+=it.tw+gap;}
    y+=h+4*d;}
  ctx.restore();}

// The landmarks sit ON the ground layer, above the streets and under the
// network: a tram passes in front of the cathedral, and the cathedral stands on
// the street. They are hidden at CITY scale, where a 15px building among the
// whole of Helsinki is a speck arguing with a stop dot — a landmark you cannot
// tell from a marker is not doing a landmark's job.
let _lmPoints=null;
function drawLandmarkLayer(ctx){if(!ground?.landmarks||!city)return;
  if(camera&&camera.nearestScale()==='city')return;
  if(!_lmPoints)_lmPoints=landmarkPoints(ground.landmarks,city.resolved);
  const base=baseProjection(),pxPerMetre=(base.scale*(camera?camera.zoom:1))/111320;
  drawLandmarks(ctx,_lmPoints,fitLatLon,pxPerMetre,renderer?.dpr||1);}

// THE LICENCE LINE, and how much room it needs.
//
// It wraps, and it draws EVERY line it wraps to. The first cut capped it at the
// last two and looked fine — until the HSL corridor clause was added, at which
// point the string wrapped to three and the one that fell off the top was
// "© OpenStreetMap contributors (ODbL 1.0)". A layout rule silently deleted an
// attribution that is a condition of use. So the cap is gone, the legend asks
// how many lines there are rather than assuming, and a credit that will not fit
// pushes the legend up instead of losing a clause.
function creditLines(ctx,width){if(!ground)return[];const t=ground.credit();if(!t)return[];
  const lines=[];let line='';
  for(const part of t.split(' · ')){const next=line?`${line} · ${part}`:part;
    if(ctx.measureText(next).width>width&&line){lines.push(line);line=part;}else line=next;}
  if(line)lines.push(line);
  return lines;}
function creditFont(d){return `${Math.round(7.5*d)}px ui-monospace,monospace`;}
function creditHeight(){const ctx=$('map').getContext('2d'),d=renderer?.dpr||1,r=viewRect();
  ctx.save();ctx.font=creditFont(d);const n=creditLines(ctx,r.w-12*d).length;ctx.restore();
  return n?(n*9+4):0;}
function drawCredit(){if(!ground)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1,r=viewRect();
  ctx.save();ctx.font=creditFont(d);ctx.textAlign='left';ctx.textBaseline='bottom';
  ctx.globalAlpha=.72;ctx.fillStyle=NIGHT.credit;
  const lines=creditLines(ctx,r.w-12*d);
  lines.forEach((l,i)=>ctx.fillText(l,r.x+6*d,r.y+r.h-4*d-(lines.length-1-i)*9*d));
  ctx.restore();}
// THE SHIFT IS 07:00 TO 08:15, AND THE BOARD SHOULD KNOW. One warm wash over
// the ground, strongest at the first tick and gone by the last, so the five
// minutes have a direction you can feel without reading the clock — the same
// low September light the tramstop cover is painted in. Soft-light keeps the
// line colours honest (test/board.mjs measures them on the paper, not on this);
// it lifts the ground, never the ink.
// Over the WHOLE canvas, not the board: the surround is the land grey now, and a
// wash that stopped at the board edge lit the board and left the margins dark,
// which put the black slab back that the grey had just removed.
// WEATHER, drawn in the night map's own register (weather.js has the rules):
// rain is streaks and a darker wet sheen, snow is the streets going pale under
// falling flakes, frost a cold edge, and fog is the map losing contrast past
// the courier's reach — drawn as exactly the 400 m the rule uses, so what you
// see and what the panel says are one fact. Under the badges, over the lines.
function paintWeather(ctx){const w=WEATHER;if(!w||w.id==='clear'||!flow)return;const c=$('map'),W=c.width,H=c.height,t=flow.clock.tick,d=renderer?.dpr||window.devicePixelRatio||1;ctx.save();
  if(w.id==='rain'){ctx.fillStyle='rgba(10,24,40,0.16)';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(170,205,230,0.38)';ctx.lineWidth=1*d;ctx.beginPath();
    for(let i=0;i<150;i++){const x=(((i*97.31+t*2.2*d)%(W+40))+W+40)%(W+40)-20,y=(((i*53.77+t*8*d)%(H+40))+H+40)%(H+40)-20;ctx.moveTo(x,y);ctx.lineTo(x-3*d,y+12*d);}ctx.stroke();}
  else if(w.id==='snow'){ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(190,200,212,0.20)';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(246,249,252,0.85)';
    for(let i=0;i<120;i++){const x=((i*131.7+Math.sin((t+i*13)/40)*18*d)%W+W)%W,y=(((i*71.3+t*1.5*d)%(H+20))+H+20)%(H+20)-10;ctx.beginPath();ctx.arc(x,y,(1+(i%3)*0.6)*d,0,Math.PI*2);ctx.fill();}}
  else if(w.id==='frost'){const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.75);g.addColorStop(0,'rgba(200,225,245,0)');g.addColorStop(1,'rgba(200,225,245,0.24)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  else if(w.id==='fog'){const ll=courierLatLon();if(ll){const p=fitLatLon(ll.lat,ll.lon),q=fitLatLon(ll.lat+w.fogM/111320,ll.lon),r=Math.max(18*d,Math.hypot(q.x-p.x,q.y-p.y));
    const g=ctx.createRadialGradient(p.x,p.y,r*0.8,p.x,p.y,r*1.5);g.addColorStop(0,'rgba(140,150,158,0)');g.addColorStop(1,'rgba(140,150,158,0.62)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(215,225,230,0.4)';ctx.setLineDash([4*d,5*d]);ctx.lineWidth=1*d;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();}}
  ctx.restore();}
function paintDawn(ctx){if(!flow)return;const a=0.13*(1-Math.min(1,flow.clock.dayProgress));if(a<=0.005)return;const c=$('map'),r={x:0,y:0,w:c.width,h:c.height};ctx.save();ctx.globalCompositeOperation='soft-light';ctx.fillStyle=`rgba(255,190,130,${a.toFixed(3)})`;ctx.fillRect(r.x,r.y,r.w,r.h);ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(90,50,25,${(a*0.2).toFixed(3)})`;ctx.fillRect(r.x,r.y,r.w,r.h);ctx.restore();}
function drawBoardFrame(){const ctx=$('map').getContext('2d'),d=renderer?.dpr||1,r=boardRect();ctx.save();ctx.strokeStyle=NIGHT.frame;ctx.lineWidth=1*d;ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);ctx.restore();}

// Stops and transfer spots. A transfer spot is the decision point of the whole
// game — it is where waiting, catching and changing lines happen — so it is
// drawn as a real interchange marker (white body, dark ring, named) while an
// ordinary delivery stop is a small dot. Size carries the hierarchy; colour is
// left to the lines, which own it.
function drawStops(){if(!flow||!city)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1;ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const node of city.nodes){const p=fitLatLon(node.lat,node.lon),hub=TRANSFER_HUBS.includes(node.id);
    if(hub){ctx.beginPath();ctx.arc(p.x,p.y,7*d,0,Math.PI*2);ctx.fillStyle=NIGHT.hub;ctx.fill();ctx.lineWidth=2.8*d;ctx.strokeStyle=NIGHT.hubRing;ctx.stroke();}
    else{ctx.beginPath();ctx.arc(p.x,p.y,3.6*d,0,Math.PI*2);ctx.fillStyle=NIGHT.stop;ctx.fill();ctx.lineWidth=1.8*d;ctx.strokeStyle=NIGHT.stopRing;ctx.stroke();}}
  ctx.restore();}

// Labels are drawn LAST — after main-v212.js has put the moving vehicles down —
// because a stop's name is the layer that identifies everything else and must
// not be printed under a tram badge that happens to be passing. The badges are
// handed in as boxes to avoid, so a name steps aside for a vehicle rather than
// fighting it. Same reason they are a separate call at all: core and the live
// layer are two rAF loops, and the labels have to come after both.
function drawStopLabels(avoid=[]){if(!flow||!city)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1;ctx.save();clipToBoard(ctx);ctx.textAlign='center';ctx.textBaseline='middle';
  const taken=[...avoid],r=viewRect();
  const free=b=>b.x>=r.x&&b.x+b.w<=r.x+r.w&&b.y>=r.y&&b.y+b.h<=r.y+r.h&&!taken.some(t=>b.x<t.x+t.w&&b.x+b.w>t.x&&b.y<t.y+t.h&&b.y+b.h>t.y);
  // Density is the camera's business too. Twenty-two names over the whole city
  // is a wall of type at CITY scale and a sparse, readable map at STOP scale —
  // the same list, and only one of those is worth printing. Zoomed out, the
  // board keeps the names that are decisions: the transfer spots, and the two
  // ends of the job in hand. The dots stay drawn either way, so nothing is
  // hidden — only unlabelled, and one zoom step brings the name back.
  const wide=camera?.nearestScale()==='city',ends=[challenge?.currentFrom(),challenge?.currentTo()].filter(Boolean);
  const shown=city.nodes.filter(n=>!wide||TRANSFER_HUBS.includes(n.id)||ends.includes(n.id));
  const ordered=[...shown].sort((a,b)=>Number(TRANSFER_HUBS.includes(b.id))-Number(TRANSFER_HUBS.includes(a.id)));
  for(const node of ordered){const p=fitLatLon(node.lat,node.lon),hub=TRANSFER_HUBS.includes(node.id),size=hub?9.5:8,gap=(hub?13:10)*d;
    ctx.font=`${hub?'bold ':''}${Math.round(size*d)}px ui-monospace,monospace`;
    const w=ctx.measureText(node.name).width,h=size*d*1.25;
    // above, below, right, left — first one that is clear wins
    const spots=[[p.x-w/2,p.y-gap-h],[p.x-w/2,p.y+gap],[p.x+gap,p.y-h/2],[p.x-gap-w,p.y-h/2]].map(([x,y])=>({x,y,w,h}));
    const at=spots.find(free);if(!at)continue;taken.push(at);
    const tx=at.x+w/2,ty=at.y+h/2;
    ctx.lineWidth=3.2*d;ctx.strokeStyle=NIGHT.halo;ctx.strokeText(node.name,tx,ty);
    ctx.fillStyle=hub?NIGHT.label:NIGHT.labelDim;ctx.fillText(node.name,tx,ty);}
  ctx.restore();}

function drawTransitInspector(){const c=$('map'),ctx=c.getContext('2d');ctx.fillStyle=NIGHT.paper;ctx.fillRect(0,0,c.width,c.height);drawWater($('map').getContext('2d'),1);transit?.draw(ctx,c.width,c.height,{alpha:.96,lineWidth:2.6*(renderer?.dpr||1)});}
// The district names were drawn on top of the stop names at the same size, so
// KÄPYLÄ and Käpylä sat on each other. They are the coarser layer, so they go
// UNDER the network as a wide watermark rather than competing with the labels.
function drawDistricts(ctx=$('map').getContext('2d')){if(!city)return;const d=renderer?.dpr||1,scale=camera?.nearestScale()||'city';
  ctx.save();ctx.globalAlpha=.4;ctx.fillStyle=NIGHT.district;ctx.font=`${Math.round(11*d)}px ui-monospace,monospace`;ctx.textAlign='center';ctx.letterSpacing=`${2*d}px`;
  // Forty-one real sub-district label points from the city's own osa-aluejako,
  // ordered by how much of the extent each covers — which is the only ordering
  // in that pack that means anything on a map, because the big quarters are the
  // ones you navigate by from far away. It replaces nine names that were typed
  // into this file by hand and hung off whichever delivery anchor was nearest.
  if(ground?.districts){for(const dis of ground.districtsFor(scale)){const p=fitLatLon(dis.at[0],dis.at[1]);
    ctx.fillText(dis.name.toUpperCase(),p.x,p.y);}ctx.restore();return;}
  for(const[id,label]of[['kapyla','KÄPYLÄ'],['pasila','PASILA'],['toolontori','TÖÖLÖ'],['kallionkirkko','KALLIO'],['rautatientori','KESKUSTA'],['kalasatama','KALASATAMA'],['lansiterminaali','LÄNSISATAMA'],['eira','EIRA'],['katajanokka','KATAJANOKKA']]){const n=city.resolved?.[id];if(!n)continue;const p=fitLatLon(n.lat,n.lon);ctx.fillText(label,p.x,p.y+26*d);}
  ctx.restore();}

// The active job's two ends, over everything: where you are and where the box
// has to go. Nothing between them is drawn — no route is the answer.
function drawJobEnds(){if(!challenge?.active||!city)return;const ctx=$('map').getContext('2d'),d=renderer?.dpr||1;ctx.save();
  for(const[id,col]of[[challenge.currentFrom(),'#2f9fb8'],[challenge.currentTo(),cargoColour(challenge.active.cargo)]]){const n=city.resolved?.[id];if(!n)continue;const p=fitLatLon(n.lat,n.lon);ctx.strokeStyle=col;ctx.lineWidth=3.4*d;ctx.beginPath();ctx.arc(p.x,p.y,14*d,0,Math.PI*2);ctx.stroke();}
  // WHERE THIS JOB ENDS gets a flag, not a second ring. Two rings in two
  // colours said "two places matter" and nothing about which is which; the
  // one you are going to now carries a pennant in the cargo's colour on a pole
  // with the stop's name on it, so the destination reads from across the board
  // at any scale, before the stop labels have decided whether it earns one.
  {const to=challenge.currentTo(),n=city.resolved?.[to];if(n){const p=fitLatLon(n.lat,n.lon),col=cargoColour(challenge.active.cargo),ink='#0f1418';
    ctx.lineJoin='round';ctx.lineCap='round';
    const pole=()=>{ctx.beginPath();ctx.moveTo(p.x,p.y-4*d);ctx.lineTo(p.x,p.y-30*d);};
    const flag=()=>{ctx.beginPath();ctx.moveTo(p.x,p.y-30*d);ctx.lineTo(p.x+16*d,p.y-25*d);ctx.lineTo(p.x,p.y-20*d);ctx.closePath();};
    ctx.strokeStyle='rgba(255,253,247,.9)';ctx.lineWidth=5*d;pole();ctx.stroke();flag();ctx.stroke();
    ctx.strokeStyle=ink;ctx.lineWidth=2*d;pole();ctx.stroke();flag();ctx.fillStyle=col;ctx.fill();ctx.stroke();
    const name=challenge.name(to);ctx.font=`bold ${Math.round(9*d)}px ui-monospace,monospace`;ctx.textAlign='left';ctx.textBaseline='middle';const w=ctx.measureText(name).width+8*d,x=p.x+4*d,y=p.y-40*d;
    ctx.fillStyle=col;ctx.strokeStyle=ink;ctx.lineWidth=1.5*d;ctx.beginPath();ctx.roundRect(x,y-7*d,w,14*d,3*d);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.fillText(name,x+4*d,y+.5*d);}}
  ctx.restore();}

// THE HUD IS GLYPHS. Clock, deliveries as dots, a score, and the current job
// as its cargo glyph inside a ring that empties with the deadline — no
// "deliveries" / "deadline" labels and no ticks (owner: Mini Metro succinct).
function paintHud(){if(!challenge||!flow)return;const c=challenge.active?challenge.cargoRule():null;$('done').innerHTML=dots(challenge.index,challenge.target,challenge.drops);{const b=$('bagHud');if(b)b.innerHTML=challenge.active?bagHtml(challenge.carrying?.()||[],challenge.capacity?.()):'';}$('reach').textContent=challenge.active?`${challenge.name(challenge.currentFrom())} → ${challenge.name(challenge.currentTo())}`:'dispatch';$('emit').textContent=challenge.active?(challenge.remaining()<20?'due':minutes(challenge.remaining())):'';$('score').textContent=challenge.score?String(challenge.score):'';{const m=challenge.streakMult?.()||1,el=$('mult');if(el){el.textContent=m>1?`×${m}`:'';el.style.opacity=m>=2?'1':'.8';}}{const ring=$('cargoHud'),g=$('cargoGlyph');if(g)g.innerHTML=challenge.active?parcelHtml(challenge.active.cargo,{max:16}):'<span class="pcl pcl-none"></span>';ring.title=c?`${challenge.active.cargo} · ${c.rule}`:'no job';const p=challenge.active?Math.max(0,Math.min(100,100*challenge.remaining()/challenge.active.limit)):0;ring.style.setProperty('--p',p.toFixed(1));ring.style.setProperty('--ring',challenge.active?cargoColour(challenge.active.cargo):'#e2e6e1');}{const m=SHIFT.startHour*60+Math.floor(flow.clock.dayProgress*SHIFT.hours*60);$('clock').textContent=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}{const net=window.__tm?.liveNetwork,sc=SCALES.find(x=>x.id===camera?.nearestScale())?.label||'CITY';$('lines').textContent=net&&Number.isFinite(net.lastShown)?`${sc} \u00b7 ${net.lastShown}/${net.vehicles.length} near`:'HSL network';}}
// THE JOB SHEET HAS THREE WRITERS AND HAD NO OWNER.
// paintSheet (this file), the dispatch board (job-board-v212.js) and the catch
// panel (route-choice.js) all wrote into #sheet on their own timers, and each
// one appended. Taking a job therefore changed NOTHING on screen: the dispatch
// list with its three TAKE JOB cards stayed exactly where it was, the header
// saying which job you now had was only painted on a tick that reported a
// change, and the buttons that actually board a tram were appended third —
// below the fold, under a list that looked untouched. The owner's report was
// "don't know how to move from one spot to another", and that is the whole of
// it: the next action was off screen behind a stale one.
//
// So the sheet has three SLOTS in a fixed order and each writer owns one. The
// order is the order you need them in: what you are carrying, what you can
// board right now, and only then anything else on offer.
// The order is what you can act on first. Boarding leads, because it is the
// only thing on this screen you can do and because the HUD one row up already
// says which job you are on and when it is due — measured on a phone, the job
// header pushed the first CATCH button to y=577 of 664. Then the header, then
// what else this stop offers, then anything still on the dispatch list. There
// were SIX writers into #sheet, not three. hub-tactics and recovery append
// too, and hub-tactics was landing above everything — and `rideStatus`, the
// panel that says which tram you are on, was appending straight to the sheet
// and was not on this list at all. It happened to come out first, because
// sheetSlot moves the six named ones to the end and leaves anything else where
// it is; correct by accident is not correct, and the next module to append
// directly would have landed on top of the panel you act on. PR #473 found it.
//
// While riding, the two things you can DO are get off early and change plan, so
// those lead; standing at a stop, boarding leads.
const SHEET_SLOTS=['cityDay','eventCard','rideStatus','recoveryControls','routeChoices','alongBoard','jobHead','hubTactics','jobBoard'];
function sheetSlot(id){if(id===undefined)return SHEET_SLOTS.slice();const sheet=$('sheet');if(!sheet)return null;
  for(const s of SHEET_SLOTS){let el=document.getElementById(s);
    if(!el){el=document.createElement('section');el.id=s;sheet.append(el);}
    else if(el.parentElement!==sheet)sheet.append(el);}
  // re-assert the order, cheaply: appendChild moves an existing node
  for(const s of SHEET_SLOTS)sheet.append(document.getElementById(s));
  return document.getElementById(id);}

function paintSheet(){if(!challenge)return;const b=sheetSlot('jobHead');if(!b)return;if(!challenge.active){b.innerHTML='';return;}const j=challenge.active,c=challenge.cargoRule(),constrained=c.modes||c.fragile||c.freshness||c.express;b.innerHTML=`<div class="jobTop" style="align-items:center"><span class="cargoBadge">${parcelHtml(j.cargo,{title:c.rule})}</span><div style="flex:1;min-width:0"><h2 style="font-size:14px">${esc(challenge.name(challenge.currentTo()))}</h2><p class="hint">from ${esc(challenge.name(challenge.currentFrom()))} · ${minutes(challenge.remaining())} left${constrained?` · ${esc(c.rule.toLowerCase().split(';')[0].split(' — ')[0])}`:''}</p></div></div><div class="meter"><i style="width:${Math.max(0,Math.min(100,100*challenge.remaining()/j.limit))}%;background:${cargoColour(j.cargo)}"></i></div>`;}
function paintFeed(){const f=$('feed');if(!f)return;f.innerHTML='';for(const m of msgs.slice(0,2)){const d=document.createElement('div');d.textContent=m;f.append(d);}}
// THE RESULT, and the line you send. The first finish of today's shift is
// the day's result and is recorded; any later one is practice and says so.
// The share line is plain text — navigator.share where a phone has it, the
// clipboard where it does not, and the text itself on screen if neither
// works, so there is always a way to get it out.
function paintDaily(){const box=$('endStats');if(!box)return;
  const again=$('again');
  if(SHIFT_INFO.kind==='week'){paintWeek(box,again);return;}
  if(SHIFT_INFO.kind!=='daily'){if(again)again.textContent='RUN THIS SHIFT AGAIN';return;}
  const res={results:[...(challenge.results||[])],target:challenge.target,drops:challenge.drops||0,score:challenge.score,delivered:challenge.index,day:cityDay?.id||null};
  const r=recordDaily(SHIFT_INFO.key,res),rec=r.record,run=streak(SHIFT_INFO.key);
  const text=shareText({number:SHIFT_INFO.number,label:SHIFT_INFO.label,dayName:cityDay?.name||'',results:rec.results,target:rec.target,drops:rec.drops,score:rec.score,url:location.origin+location.pathname});
  box.insertAdjacentHTML('afterbegin',`<div class="dailyBox"><p class="dailyHead">${esc(shiftLabel())}${cityDay?` · ${esc(cityDay.name)}`:''}</p><p class="dailyGrid">${dailyGrid(rec.results,rec.target)}${rec.drops?` <small>+${rec.drops} drops</small>`:''}</p>${r.first?`<p class="hint">today's result${run>1?` · ${run} days running`:''}</p>`:`<p class="hint">practice — today's result stands at ${Number(rec.score).toLocaleString('en-US')}${run>1?` · ${run} days running`:''}</p>`}<button class="btn prime wide" id="share">SHARE TODAY'S</button><pre class="shareText" id="shareText" hidden></pre><a class="btn wide ghost" href="?shift=random">A RANDOM SHIFT</a></div>`);
  // One loud button on this card, and it is SHARE. Replaying today is allowed
  // and is practice, so it steps down to the quiet style beside it.
  if(again){again.textContent="PLAY TODAY'S AGAIN · PRACTICE";again.classList.remove('prime');again.classList.add('ghost');}
  const btn=$('share');if(btn)btn.onclick=async()=>{
    try{if(navigator.share){await navigator.share({text});btn.textContent='SHARED';return;}}catch(e){if(e?.name==='AbortError')return;}
    try{await navigator.clipboard.writeText(text);btn.textContent='COPIED';return;}catch{}
    const pre=$('shareText');if(pre){pre.textContent=text;pre.hidden=false;}btn.textContent='COPY THIS';};}

// ── THE WEEK, on the page ────────────────────────────────────────────────
// Every delivery is written into the save as it lands, so a page left at any
// moment leaves the shift it was on honestly recorded (week.js: leaving is
// clocking out).
let _weekScore=-1,_weekDone=-1;
function weekProgress(){if(!WEEK||!challenge||done)return;const sc=challenge.score,n=(challenge.results||[]).length;
  if(sc===_weekScore&&n===_weekDone)return;_weekScore=sc;_weekDone=n;
  Week.progress(WEEK,{score:sc,results:challenge.results});Week.saveWeek(WEEK);}
function weekStrip(w,current=-1){return `<div class="weekStrip">${Week.DAY_NAMES.map((d,i)=>{const x=w.shifts[i];
  return `<span class="wd${i===current?' now':''}${x?' done':''}"><b>${d.slice(0,3)}</b>${x?`<i>€${x.euros}</i>`:`<i>${i===current?'today':'—'}</i>`}</span>`;}).join('')}</div>`;}
function kitChips(ids){return ids.length?`<span class="kitChips"><small>KIT</small> ${ids.map(id=>{const k=Kit.BY_ID[id];return k?`<span title="${esc(k.name)}: ${esc(k.line)}">${k.glyph}</span>`:'';}).join('')}</span>`:'';}
// One tap takes the item AND goes to the next shift: a kit is applied when the
// page boots, and a picker that asked for a second tap would be a menu.
function kitPicker(){const n=Week.night(WEEK);if(!n||n.pick)return'';Week.saveWeek(WEEK);
  return `<div class="kitPick"><p class="kitHead">TONIGHT, TAKE ONE FOR ${esc(Week.DAY_NAMES[WEEK.day])}</p>${n.offers.map(id=>{const k=Kit.BY_ID[id];
    return `<button class="kitOffer" data-kit="${esc(id)}"><span class="kg">${k.glyph}</span><span class="kt"><b>${esc(k.name)}</b><small>${esc(k.line)}</small></span></button>`;}).join('')}</div>`;}
function wireKitPicker(root){root.querySelectorAll('.kitOffer').forEach(b=>b.onclick=()=>{if(Week.choose(WEEK,b.dataset.kit)){Week.saveWeek(WEEK);location.href='?week';}});}
function weekTitle(){const w=WEEK,p=Week.pace(w),prev=w.shifts[w.shifts.length-1];
  return `${esc(shiftLabel())} · ${SHIFT_INFO.index+1} of ${Week.LENGTH}${weekStrip(w,SHIFT_INFO.index)}${kitChips(Week.owned(w))}<span class="weekPace">€${p.total} banked · rent €${Week.RENT} on Friday${p.need?` · about €${p.perDay} a shift to go`:' · covered'}</span>${prev?.left?`<br><span class="dailyDone">${esc(prev.name.toLowerCase())} was left mid-shift — it paid €${prev.euros}</span>`:''}`;}
function paintWeek(box,again){const w=WEEK;
  Week.close(w,{score:challenge.score,results:challenge.results,drops:challenge.drops||0,tips:challenge.tips||0});Week.saveWeek(w);
  const x=w.shifts[SHIFT_INFO.index],over=Week.isOver(w),v=Week.verdict(w),p=Week.pace(w);
  const head=`<p class="dailyHead">${esc(SHIFT_INFO.name)}${cityDay?` · ${esc(cityDay.name)}`:''}</p><p class="dailyGrid">${Week.dayGrid(x.results)} <small>€${x.euros}</small></p>`;
  const tail=over?`<p class="weekVerdict ${v.paid?'paid':'short'}">${v.paid?`RENT PAID · €${v.over} over`:`SHORT €${-v.over} ON THE RENT`}</p><button class="btn prime wide" id="share">SHARE THE WEEK</button><pre class="shareText" id="shareText" hidden></pre><a class="btn ghost wide" href="?week" id="newWeek">A NEW WEEK</a>`
    :`<p class="weekPace">€${p.total} of €${Week.RENT} · about €${p.perDay} a shift to go</p>${kitPicker()||`<a class="btn prime wide" href="?week" id="nextShift">${Week.DAY_NAMES[w.day]} →</a>`}`;
  box.insertAdjacentHTML('afterbegin',`<div class="dailyBox weekBox">${head}${weekStrip(w)}${kitChips(Week.owned(w))}${tail}</div>`);wireKitPicker(box);
  // A shift of the week is played once: the card's replay button would be a
  // way round the one rule a run has.
  if(again)again.hidden=true;
  $('endNote').textContent=over?(v.paid?'The week is done, and so is the rent.':'The week is done. The rent is not.'):'The week goes on. Your regulars remember today.';
  if(over){const text=Week.shareText(w,location.origin+location.pathname+'?week');const btn=$('share');if(btn)btn.onclick=async()=>{
    try{if(navigator.share){await navigator.share({text});btn.textContent='SHARED';return;}}catch(e){if(e?.name==='AbortError')return;}
    try{await navigator.clipboard.writeText(text);btn.textContent='COPIED';return;}catch{}
    const pre=$('shareText');if(pre){pre.textContent=text;pre.hidden=false;}btn.textContent='COPY THIS';};}}

function finish(){if(done)return;done=true;flow.clock.setPaused(true);$('endTitle').textContent=challenge.complete?'ALL DELIVERED':'DAY OVER';$('endStats').innerHTML=`<p>deliveries <b>${challenge.index}/${challenge.target}</b></p>${challenge.drops?`<p>drops on the way <b>${challenge.drops}</b></p>`:''}<p>score <b>${challenge.score}</b></p><p>best streak <b>×${(1+challenge.streakStep()*Math.max(0,Math.min(4,challenge.bestStreak-1))).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')} (${challenge.bestStreak})</b></p>${challenge.tips?`<p>tips from regulars <b>${challenge.tips}</b></p>`:''}${challenge.goodwill?`<p>goodwill <b>${challenge.goodwill>0?'+':''}${challenge.goodwill}</b></p>`:''}${window.__tm?.rival?`<p>${window.__tm.rival.name} delivered <b>${window.__tm.rival.delivered}</b>${window.__tm.rival.taken.length?` · took ${window.__tm.rival.taken.join(', ')}`:''}</p>`:''}${window.__tm?.visited?`<p>stops you have been to <b>${window.__tm.visited.size}</b></p>`:''}<p>cargo bonuses <b>${challenge.bonuses}</b></p><p>late jobs <b>${challenge.late}</b></p><p class="hint">${cityDay?esc(cityDay.name)+' · ':''}${esc(shiftLabel())}</p>`;$('endNote').textContent=challenge.complete?'Every job delivered.':'The shift ended.';{const log=window.__tm?.shiftLog;log?.poll?.();log?.finish?.();const r=$('replay');if(r)r.remove();const html=log?.html?.()||'';if(html)$('endStats').insertAdjacentHTML('afterend',html);}paintDaily();$('end').hidden=false;}

// THE GROUND IS CACHED. Water, streets and place names are three of the four
// most expensive layers on the board and NONE of them moves: they change when
// the camera changes and at no other time. Painted every frame they cost the
// city view half its frame rate — 60 down to 30 — for a picture identical to
// the one before it. So they are painted into an offscreen canvas keyed on the
// camera, and the live frame blits it. Same discipline as gameoflife's
// `scr.cached`, and the same rule applies: key on what actually changes, and
// keep every moving part (the fleet, the walker, the labels) outside it.
let _ground=null,_groundKey='';
function paintGround(dest){const c=$('map');
  if(!_ground||_ground.width!==c.width||_ground.height!==c.height){_ground=document.createElement('canvas');_ground.width=c.width;_ground.height=c.height;_groundKey='';}
  const key=`${camera?camera.zoom.toFixed(4)+':'+camera.cx.toFixed(6)+':'+camera.cy.toFixed(6)+':'+camera.nearestScale():''}|${challenge?.currentFrom()||''}|${challenge?.currentTo()||''}`;
  if(key!==_groundKey){_groundKey=key;const g=_ground.getContext('2d');
    g.clearRect(0,0,_ground.width,_ground.height);
    g.save();const r=boardRect();g.beginPath();g.rect(r.x,r.y,r.w,r.h);g.clip();
    g.fillStyle=NIGHT.paper;g.fillRect(r.x,r.y,r.w,r.h);
    drawWater(g);drawDistricts(g);drawRoads(g);drawLandmarkLayer(g);g.restore();}
  dest.drawImage(_ground,0,0);}

// The board is painted here bottom-up — paper, water, districts, roads, lines,
// stops, job ends — rather than through FlowRenderer, which projects with the
// letterboxing graph fit and would disagree with every other layer about where
// a stop is. The renderer instance stays for dpr and resize; main-v212.js draws
// the live vehicles and walker on top through the same published projection.
function frame(now){const dt=last?Math.min(120,now-last):0;last=now;
  if(flow){flow.update(dt);
    if(camera&&!transitView){const c=$('map');camera.step(dt,baseProjection(),c.width,c.height,courierLatLon());placeRail();paintRail();}
    if(transitView)drawTransitInspector();
    else{const c=$('map'),ctx=c.getContext('2d');ctx.fillStyle=NIGHT.surround;ctx.fillRect(0,0,c.width,c.height);
      paintGround(ctx);paintDawn(ctx);
      ctx.save();clipToBoard(ctx);
      drawTransit();drawStops();drawJobEnds();paintWeather(ctx);drawLegend();drawCredit();ctx.restore();drawBoardFrame();}
    if(flow.clock.tick%10===0)paintHud();}
  requestAnimationFrame(frame);}

async function init(){
  $('play').disabled=true;$('play').textContent='LOADING HELSINKI…';
  try{const [r,g]=await Promise.all([fetch('./cities/helsinki.json',{cache:'no-store'}),loadGround()]);ground=g;water=g?.water||null;if(!r.ok)throw new Error(`HSL pack ${r.status}`);source=await r.json();transit=new TransitLayers(source);transit.showAll();city=buildRealHelsinki(source);box=boardBox(city.resolved);roads=roadPaths(city.resolved);camera=new Camera(box);openingScale();{const kx=Math.cos(((box.n+box.s)*.5)*Math.PI/180);$('map').style.aspectRatio=`${(box.e-box.w)*kx} / ${box.n-box.s}`;renderer?.resize?.();}paintTransitPanel();boot();$('play').disabled=false;$('play').textContent=WEEK?`START ${SHIFT_INFO.name}`:'START SHIFT';paintDayCard();requestAnimationFrame(frame);}catch(err){$('play').textContent='MAP LOAD FAILED';$('transitMeta').textContent=err.message;console.error(err);}
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

// ------------------------------------------------------------- the camera UI
//
// Three notches and a recentre, laid over the map's own top-right corner rather
// than added to the HUD strip — the HUD is the shift (deliveries, deadline, the
// clock) and the rail is the map, and a control that changes what you are
// looking at belongs on the thing it changes. It is placed in script against the
// canvas rect for the same reason #pop is: the canvas is a grid area whose real
// THE DAY, ON THE TITLE CARD. The shift has a name before it starts, which is
// the whole of roadmap item 7: a modifier you meet by losing is a different
// genre, so the card says what today does and which lines it slows.
function paintDayCard(){const el=$('dayCard');if(!el)return;
  const n=$('shiftNo');if(n){const rec=SHIFT_INFO.kind==='daily'?todayRecord(SHIFT_INFO.key):null;
    // Already played today: say so BEFORE the run, not after it — finding out
    // at the end that the run you just cared about was practice is a small
    // betrayal, and the whole point of one result a day is that it is one.
    n.innerHTML=SHIFT_INFO.kind==='week'?weekTitle():`${esc(shiftLabel())}${rec?`<br><span class="dailyDone">played · ${dailyGrid(rec.results,rec.target)} · ${Number(rec.score).toLocaleString('en-US')} — this run is practice</span>`:''}`;
    // A night left without a pick (the page was closed on the end card) is
    // offered again here, and the shift waits for it: the kit is applied at boot.
    if(SHIFT_INFO.kind==='week'&&Week.pending(WEEK)){n.insertAdjacentHTML('beforeend',kitPicker());wireKitPicker(n);const pl=$('play');pl.disabled=true;pl.textContent='TAKE ONE FIRST';}
    const wl=$('weekLink');if(wl){const w=SHIFT_INFO.kind==='week'?null:Week.loadWeek();wl.hidden=SHIFT_INFO.kind==='week';
      wl.innerHTML=w&&!Week.isOver(w)&&w.shifts.length?`CONTINUE THE WEEK · ${Week.DAY_NAMES[w.day]} · €${Week.total(w)}/€${Week.RENT}`:`OR THE WEEK · five shifts, rent due Friday`;}}
  const wx=WEATHER&&WEATHER.id!=='clear'?`<div class="dayCard wxCard"><span class="dayGlyph">${WEATHER.glyph}</span><div><b>${esc(WEATHER.name)}</b><p>${esc(WEATHER.blurb)}</p></div></div>`:'';
  if(!cityDay){el.innerHTML=wx;return;}
  const fams=(cityDay.crowds?.families||[]).map(f=>{const l=(transit?.layers||[]).find(x=>dayFamily(x.name)===f);
    return `<span class="lb" style="background:${esc(l?.colour||'#52676d')}">${esc(f)}</span>`;}).join(' ');
  el.innerHTML=`<div class="dayCard"><span class="dayGlyph">${cityDay.glyph}</span><div><b>${esc(cityDay.name)}</b><p>${esc(cityDay.blurb)}</p>${fams?`<p class="dayChips">${fams} crowded all morning</p>`:''}</div></div>${wx}`;}

// size is decided by aspect-ratio and max-height, so there is no element in the
// document whose box is the picture.
let _railAt='';
function placeRail(){const rail=$('zoomRail'),c=$('map');if(!rail||!c)return;
  rail.hidden=false;
  // Measure AFTER un-hiding, and refuse to cache a measurement of zero. The
  // first cut cached the position computed while the rail was still `hidden`,
  // so offsetWidth was 0, the rail was placed a full width to the right of the
  // map — over the job sheet — and at z-index 30 it silently ate every click on
  // a CATCH button. The game was fine; the report card played a whole shift
  // taking one job, because a real pointer could not reach the control.
  const r=c.getBoundingClientRect(),w=rail.offsetWidth;
  if(!w)return;
  const key=`${Math.round(r.right)}:${Math.round(r.top)}:${w}`;
  if(key===_railAt)return;_railAt=key;
  rail.style.left=`${Math.round(r.right-8-w)}px`;rail.style.top=`${Math.round(r.top+8)}px`;}
function paintRail(){const rail=$('zoomRail');if(!rail||!camera)return;const now=camera.nearestScale();
  for(const b of rail.querySelectorAll('[data-scale]'))b.setAttribute('aria-pressed',String(b.dataset.scale===now));
  const rc=$('recentre');if(rc)rc.hidden=camera.following;}

// Pixels to degrees. Every pan and every pinch goes through this one conversion
// so a drag moves the map by exactly the distance under the finger — the same
// "one projection" discipline the draw layers keep.
function canvasScale(){const c=$('map'),r=c.getBoundingClientRect();return c.width/Math.max(1,r.width);}
function mapPoint(e){const c=$('map'),r=c.getBoundingClientRect();
  return{x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)};}
function zoomAt(px,py,z){const c=$('map');camera.zoomAbout(baseProjection(),c.width,c.height,px,py,z);}

let drag=null,pinch=null,dragged=false,lastTap=0;
const map=$('map');
map.addEventListener('wheel',e=>{if(!camera||transitView)return;e.preventDefault();const p=mapPoint(e);
  zoomAt(p.x,p.y,camera.zoom*Math.pow(1.0018,-e.deltaY));},{passive:false});
map.addEventListener('dblclick',e=>{if(!camera||transitView)return;const p=mapPoint(e);
  const i=SCALES.findIndex(x=>x.id===camera.nearestScale());
  zoomAt(p.x,p.y,camera.zoomFor(SCALES[Math.min(SCALES.length-1,i+1)].id));});
map.addEventListener('pointerdown',e=>{if(transitView)return;dragged=false;drag={x:e.clientX,y:e.clientY,id:e.pointerId};});
addEventListener('pointermove',e=>{if(!drag||pinch||!camera||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!dragged&&Math.hypot(dx,dy)<5)return;dragged=true;
  const k=canvasScale(),base=baseProjection(),s=base.scale*camera.zoom,
    kx=Math.cos(((box.n+box.s)*.5)*Math.PI/180);
  camera.panBy(dy*k/s,-dx*k/(s*kx));drag.x=e.clientX;drag.y=e.clientY;});
for(const ev of ['pointerup','pointercancel'])addEventListener(ev,()=>{drag=null;});
// Two fingers. touchstart is where a pinch is claimed, and claiming it drops the
// one-finger drag: a pinch that also pans is a map that slides away under the
// gesture that was meant to scale it.
const tdist=e=>Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
const tmid=e=>{const c=$('map'),r=c.getBoundingClientRect(),
  x=(e.touches[0].clientX+e.touches[1].clientX)/2,y=(e.touches[0].clientY+e.touches[1].clientY)/2;
  return{x:(x-r.left)*(c.width/r.width),y:(y-r.top)*(c.height/r.height)};};
map.addEventListener('touchstart',e=>{if(!camera||transitView||e.touches.length!==2)return;
  drag=null;dragged=true;pinch={d:Math.max(1,tdist(e)),z:camera.zoom};},{passive:false});
map.addEventListener('touchmove',e=>{if(!pinch||!camera||e.touches.length!==2)return;e.preventDefault();
  const m=tmid(e);zoomAt(m.x,m.y,pinch.z*(tdist(e)/pinch.d));},{passive:false});
for(const ev of ['touchend','touchcancel'])map.addEventListener(ev,e=>{if(e.touches.length<2)pinch=null;});
// A double TAP is the touch half of the double-click above; there is no dblclick
// on a thumb, and the stop popup is what a single tap does.
map.addEventListener('touchend',e=>{if(!camera||transitView||dragged)return;
  const now=performance.now(),t=e.changedTouches?.[0];if(!t)return;
  if(now-lastTap<320){const c=$('map'),r=c.getBoundingClientRect(),
    p={x:(t.clientX-r.left)*(c.width/r.width),y:(t.clientY-r.top)*(c.height/r.height)},
    i=SCALES.findIndex(x=>x.id===camera.nearestScale());
    zoomAt(p.x,p.y,camera.zoomFor(SCALES[Math.min(SCALES.length-1,i+1)].id));lastTap=0;e.preventDefault();}
  else lastTap=now;},{passive:false});
$('zoomRail')?.addEventListener('click',e=>{const b=e.target.closest('[data-scale]');if(!b||!camera)return;
  camera.snapTo(b.dataset.scale);paintRail();});
$('recentre')?.addEventListener('click',()=>{if(!camera)return;camera.recentre();
  const me=courierLatLon();if(me)camera.lookAt(me.lat,me.lon);paintRail();});
addEventListener('keydown',e=>{if(!camera||transitView)return;
  if(e.key==='+'||e.key==='=')camera.cycle(1);else if(e.key==='-'||e.key==='_')camera.cycle(-1);else return;paintRail();});

for(const ev of ['pointerup','touchend'])$('map').addEventListener(ev,e=>{
  if(transitView||dragged)return;const t=e.changedTouches?.[0]||e;const node=nodeAtPoint(t.clientX,t.clientY);
  if(node){showStop(node,{x:t.clientX,y:t.clientY});e.preventDefault();}else $('pop').hidden=true;},{passive:false});
addEventListener('resize',()=>{renderer?.resize();_railAt='';placeRail();});
$('play').onclick=()=>{if(!flow)return;if(WEEK){Week.begin(WEEK);Week.saveWeek(WEEK);}$('title').hidden=true;flow.clock.setPaused(false);};
$('pause').onclick=()=>{if(!flow)return;flow.clock.setPaused(!flow.clock.paused);$('pause').textContent=flow.clock.paused?'▶':'❚❚';};
$('speed').onclick=()=>{if(!flow)return;const s=flow.clock.speed>=4?1:flow.clock.speed*2;flow.clock.setSpeed(s);$('speed').textContent=`×${s}`;};
$('again').onclick=()=>{
  // RUN THE DAY AGAIN used to boot a fresh flow and challenge in place — and
  // main-v212's mobility controller, live fleet, trails and shift log all kept
  // their handles on the OLD ones. Measured: after "again", tm.mobility.ch was
  // not tm.challenge, a job taken on the second shift was invisible to the
  // controller and no CATCH could ever light. A reload rebuilds every seam in
  // the order the first load did; a rewire would be that same order, kept by
  // hand, in two files.
  location.reload();};
$('transit').onclick=()=>transitView?hideTransit():showTransit();$('transitClose').onclick=hideTransit;$('tramOnly').onclick=()=>showTransit('TRAM');$('metroOnly').onclick=()=>showTransit('SUBWAY');$('allTransit').onclick=()=>showTransit('all');$('popClose').onclick=()=>{$('pop').hidden=true;};
init();
