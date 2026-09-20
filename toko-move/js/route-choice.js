import {layerFor,nearestPathIndex,pathDirection,planEstimate} from './timetable.js?v=1';
import {inMinutes,about,minutes} from './ui.js?v=1';
// Toko Move v2.12.2 — catch exact existing HSL gameplay vehicles at transfer hubs.
const uniq=a=>[...new Set(a)];
const serviceKey=l=>`${l.mode}:${l.label}`;
function orderedLeg(line,from,to){const a=line.nodes.indexOf(from),b=line.nodes.indexOf(to);if(a<0||b<0||a===b)return null;return{line,from,to,stops:Math.abs(b-a),direction:b>a?1:-1};}
function routeChoices(city,from,to,max=3){if(!city||!from||!to)return[];const direct=[];for(const line of city.lines||[]){const leg=orderedLeg(line,from,to);if(leg)direct.push({kind:'direct',legs:[leg],transfers:0,cost:leg.stops+(line.mode==='metro'?-0.25:0)});}const transfers=[];for(const a of city.lines||[]){if(!a.nodes.includes(from))continue;for(const b of city.lines||[]){if(serviceKey(a)===serviceKey(b)||!b.nodes.includes(to))continue;const shared=uniq(a.nodes.filter(n=>b.nodes.includes(n)&&n!==from&&n!==to));for(const at of shared){const l1=orderedLeg(a,from,at),l2=orderedLeg(b,at,to);if(!l1||!l2)continue;transfers.push({kind:'transfer',legs:[l1,l2],transfer:at,transfers:1,cost:l1.stops+l2.stops+2});}}}const seen=new Set(),all=[...direct,...transfers].sort((x,y)=>x.cost-y.cost||x.transfers-y.transfers).filter(c=>{const k=c.legs.map(x=>serviceKey(x.line)).join('>')+':'+(c.transfer||'');if(seen.has(k))return false;seen.add(k);return true;});return all.slice(0,max);}
function servicesAt(city,node){return(city?.lines||[]).filter(l=>l.nodes.includes(node));}
globalThis.__tmRouteChoiceCore={routeChoices,servicesAt};
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));}
function nodeName(city,id){return city?.nodes?.find(n=>n.id===id)?.name||id;}
function directionName(city,leg){const i=leg.line.nodes.indexOf(leg.to),next=leg.line.nodes[i+leg.direction];return next?nodeName(city,next):nodeName(city,leg.to);}
function chip(tm,leg){const layer=layerFor(tm,leg.line),colour=layer?.colour||'#52676d',metro=String(leg.line.mode||'').toUpperCase()==='SUBWAY'||/^M/.test(String(leg.line.label));return `<span class="lb${metro?' lbm':''}" style="background:${colour}"><b class="lineLabel">${esc(leg.line.label)}</b></span>`;}
function arrivalState(tm,choice){const leg=choice?.legs?.[0],layer=leg&&layerFor(tm,leg.line);if(!layer||!tm.liveNetwork)return{ready:true,label:'READY',vehicle:null};const idx=nearestPathIndex(tm,layer,leg.from),dir=pathDirection(tm,layer,leg.from,leg.to),near=tm.liveNetwork.nearestTo(layer,idx,tm.flow.clock.tick,2.2,dir);if(near)return{ready:true,label:'now',eta:0,vehicle:near.vehicle};const eta=tm.liveNetwork.nextArrival(layer,idx,tm.flow.clock.tick,dir);return{ready:false,label:eta==null?'no service':inMinutes(eta,tm),eta,vehicle:null};}
// WHAT A TRANSFER COSTS, priced at the moment you choose it.
//
// The report card measured this and it is the largest single number in the
// shift: transfer waits are 77% of all platform time (501t across four
// transfers, against 146t across five first catches; worst 256t). And the panel
// was showing NONE of it. A two-leg plan advertised "ARRIVES ~10t" — the wait
// for leg one — while leg two sat behind a 250-tick headway at the interchange
// nobody had looked at yet. The game's own rule is that no route is marked as
// the answer; it is not that the facts are withheld. A cost you only discover
// after committing is not a choice, it is a reveal.
//
// The fleet is deterministic, so none of this is a guess: it is the timetable,
// read forward. What is uncertain is only whether you make the vehicle that is
// standing there, which is why the totals are shown with a ~.
// One sentence, and it says the thing the panel was hiding: the wait AT THE
// INTERCHANGE. A total on its own lets a plan hide a 250-tick stand behind an
// otherwise reasonable number, and the wait is the part a player feels.
function costLine(tm, choice, arrival) {
  const e = planEstimate(tm, choice, arrival?.ready ? 0 : (arrival?.eta ?? null));
  if (!e) return '';
  const total = e.total == null ? '' : about(e.total, tm);
  if (!choice.legs[1]) return total;
  if (e.wait2 == null) return total ? `${total} · change ?` : 'change ?';
  return `${total}${total ? ' · ' : ''}+${minutes(e.wait2, tm)} change`;
}

function mobilityHtml(tm){const m=tm.mobility,st=m?.status?.();if(!m||!st)return'';if(st.kind==='getoff')return `<button id="getOff" class="row lit" style="min-height:60px;background:#233d4d;color:#fff;border-color:#233d4d"><span class="to" style="font-size:15px">GET OFF<small style="color:#d7e2e6">${esc(nodeName(tm.city,st.at))}${st.transfer?' · change here':''}</small></span></button>`;if(st.kind==='walking')return `<div class="row dim"><span class="to">Walking to ${esc(nodeName(tm.city,st.to))}<small>${esc(st.street)} · ${minutes(st.remaining,tm)}</small></span></div>`;if(st.kind==='riding'&&st.ride){const r=st.ride;
  // THE RIDE HAS A DECISION IN IT NOW. Offered only while the vehicle is really
  // at a stop, and only when leaving beats staying — an option that is always
  // there is furniture, and one that is never worth taking is a lie.
  const exits=(m.rideExits?.()||[]).filter(x=>x.better!=null&&x.better>0);
  const off=exits.map(x=>`<button class="exitChoice row" data-at="${esc(x.at)}" style="border-color:#e2683c;background:#fff8ef"><span class="to">Get off here · ${esc(nodeName(tm.city,x.at))}<small>saves ${about(x.better,tm)}</small></span></button>`).join('');
  return `<div style="margin-top:8px;padding:9px;border:2px solid #233d4d;border-radius:8px;background:#eef5ef"><b>ON ${esc(String(r.mode||'transit').toUpperCase())} ${esc(r.line||'')} → ${esc(nodeName(tm.city,r.to))}</b><span id="rideEta" style="float:right;font-size:11px;font-weight:800;color:#233d4d">${esc(rideEtaText(tm))}</span>${rideStrip(tm)}${tm.challenge?.index?'':`<p class="hint" style="margin:4px 0 0">GET OFF lights at ${esc(nodeName(tm.city,r.to))}.</p>`}${off}</div>`;}if(st.kind!=='waiting')return'';const walks=m.walks?.()||[];if(!walks.length)return'';if(!m.canWalk())return '';const interceptions=tm.interceptionOptions?.()||[];return `<div style="margin-top:8px;padding-top:6px;border-top:1px dashed #c5cec8"><b style="font-size:11px">OR WALK</b>${walks.map((w,i)=>{const hit=interceptions.find(x=>x.hub===w.to);const layer=hit&&layerFor(tm,hit.line);const note=hit?`then <span class="lb" style="background:${layer?.colour||'#52676d'}">${esc(hit.line.label)}</span> ${inMinutes(hit.waitTicks,tm)}`:'nothing to catch there yet';return `<button class="walkChoice row${hit?'':' dim'}" data-walk="${i}"><span class="cg" style="font-size:16px">🚶</span><span class="to">${esc(nodeName(tm.city,w.to))}<small>${minutes(w.cost,tm)} · ${note}</small></span></button>`;}).join('')}</div>`;}
// THE RIDE, DRAWN. Aboard for 600 ticks the panel used to say "Vehicle
// hsl:1H:2 · current Kamppi · next Kluuvi" — an id nobody asked for and no
// sense of how far along you were. This is the leg as a strip of stops: passed
// ones filled, the one you are at ringed, the one you are going to marked, and
// a countdown read off the same closed form the catch panel uses. Names are
// printed for the ends and for where you are; every other stop is a dot.
function rideStops(tm,r){const nodes=r.stops||[],a=nodes.indexOf(r.from),b=nodes.indexOf(r.to);if(a<0||b<0)return[];return a<=b?nodes.slice(a,b+1):nodes.slice(b,a+1).reverse();}
function rideEtaText(tm){const m=tm.mobility,r=m?.rideProgress?.();if(!r?.position||!r.vehicleId)return'';const v=tm.liveNetwork?.vehicle?.(r.vehicleId);if(!v)return'';const idx=m.pathIndexFor(v.layer,r.to);if(idx==null)return'';const rest=Math.round(Math.abs(idx-r.position.pathIndex)*tm.liveNetwork.ticksPerIndex(v));return rest<=3?'ARRIVING':about(rest,tm);}
function rideStrip(tm){const m=tm.mobility,r=m?.rideProgress?.();if(!r)return'';const stops=rideStops(tm,r);if(stops.length<2)return'';const cur=stops.indexOf(r.current);
  const n=stops.length;
  return `<div class="rideStrip" data-cur="${esc(String(r.current))}:${(tm.challenge?.along||[]).length}" style="position:relative;height:34px;margin:8px 4px 4px">${stops.map((id,i)=>{const passed=cur>=0&&i<cur,here=i===cur,last=i===n-1,first=i===0,x=(i/(n-1)*100).toFixed(2);
    const seg=last?'':`<span style="position:absolute;left:${x}%;width:${(100/(n-1)).toFixed(2)}%;top:6px;height:2px;background:${passed?'#233d4d':'#c5cec8'}"></span>`;
    const size=here?12:last?10:7;
    const dot=`<span style="position:absolute;left:${x}%;top:7px;width:${size}px;height:${size}px;margin-left:-${size/2}px;margin-top:-${size/2}px;border-radius:50%;background:${passed||here?'#233d4d':'#fffdf7'};border:2px solid ${last?'#e2683c':'#233d4d'};box-sizing:border-box"></span>`;
    const label=first||last||here?`<span style="position:absolute;top:16px;${last?'right:0;text-align:right':first?'left:0':`left:${x}%;transform:translateX(-50%)`};font-size:9px;white-space:nowrap;color:${here?'#233d4d':'#69777a'};font-weight:${here?800:400}">${esc(nodeName(tm.city,id))}</span>`:'';
    return seg+dot+label;}).join('')}${(m.dropProgress?.()||[]).map(d=>{const x=(d.fraction*100).toFixed(2);return `<span title="${esc(d.name)}" style="position:absolute;left:${x}%;top:7px;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#e2683c;border:2px solid #fffdf7;box-sizing:border-box"></span><span style="position:absolute;left:${x}%;top:-6px;transform:translateX(-50%);font-size:8px;color:#b34a36;white-space:nowrap">${esc(d.name)}</span>`;}).join('')}</div>`;}
function wireMobility(tm,box){const m=tm.mobility;if(!m)return;box.querySelector('#getOff')?.addEventListener('click',()=>{m.getOff();render(tm,true);});box.querySelectorAll('.exitChoice').forEach(btn=>btn.onclick=()=>{const res=m.getOffEarly(btn.dataset.at);if(res?.error)box.insertAdjacentHTML('beforeend',`<p style="font-size:11px;color:#b34a36">${esc(res.error)}</p>`);render(tm,true);});const walks=m.walks?.()||[];box.querySelectorAll('.walkChoice').forEach(btn=>btn.onclick=()=>{const res=m.beginWalk(walks[Number(btn.dataset.walk)]);if(res?.error)box.insertAdjacentHTML('beforeend',`<p style="font-size:11px;color:#b34a36">${esc(res.error)}</p>`);render(tm,true);});}
// THE KEY IS STRUCTURAL, and the clock is deliberately not in it.
//
// It used to carry `Math.floor(tick/2)`, so this panel rewrote its own
// innerHTML about four times a second — which destroys and rebuilds the CATCH
// buttons, and a button that is replaced four times a second is a button you
// can miss. A real pointer arriving mid-swap lands on a detached element and
// does nothing. The report card found it the hard way: a whole shift, one job
// taken, eleven CATCH presses that never reached a live element. On a phone
// that is a tap that silently fails at exactly the moment the game is asking
// you to be quick.
//
// So the panel is REBUILT only when what it says changes — the job, the leg,
// where you are, what you are doing — and the part that really does change
// every tick (how far away the next vehicle is, and whether it can be caught
// yet) is refreshed IN PLACE by refreshArrivals below.
function structuralKey(tm){const ch=tm.challenge,st=tm.mobility?.status?.();
  return ch?.active?`${ch.index}:${ch.leg}:${ch.currentFrom()}:${ch.currentTo()}:${ch.waitingForCatch}:${ch.activeTrip?.id||''}:${st?.kind||''}:${st?.remaining||''}:${st?.ride?.vehicleId||''}:${(tm.mobility?.rideExits?.()||[]).map(x=>x.at).join(',')}`:'done';}

// Update the arrival line, the enabled state and the verb, without touching the
// tree. Everything it writes is text or an attribute on an element that stays
// exactly where it was, so a press in flight still lands.
function refreshArrivals(tm){const box=document.getElementById('routeChoices');
  {const eta=box?.querySelector?.('#rideEta');if(eta){eta.textContent=rideEtaText(tm);const strip=box.querySelector('.rideStrip'),r=tm.mobility?.rideProgress?.();if(strip&&r&&strip.dataset.cur!==`${r.current}:${(tm.challenge?.along||[]).length}`){strip.outerHTML=rideStrip(tm);}}}
  const choices=box?._choices;if(!box||!choices)return;
  for(const btn of box.querySelectorAll('.catchChoice')){
    const c=choices[Number(btn.dataset.choice)];if(!c)continue;
    const a=arrivalState(tm,c),head=btn.querySelector('.catchHead'),verb=btn.querySelector('.catchVerb');
    if(head)head.textContent=`${a.label}${c.transfers?` · change at ${nodeName(tm.city,c.transfer)}`:''}`;
    if(verb)verb.textContent=a.ready?'CATCH':'WAIT';
    const cost=btn.querySelector('.catchCost');
    if(cost)cost.textContent=costLine(tm,c,a);
    const est=planEstimate(tm,c,a.ready?0:(a.eta??null));
    btn.dataset.total=est?.total??'';btn.dataset.wait2=est?.wait2??'';
    btn.disabled=!a.ready;
    btn.classList.toggle('lit',a.ready);btn.classList.toggle('dim',!a.ready);if(verb)verb.style.color=a.ready?'#233d4d':'#69777a';}}

function render(tm,force=false){const sheet=document.getElementById('sheet'),ch=tm.challenge;if(!sheet||!ch?.active||!tm.city)return;const st=tm.mobility?.status?.(),key=structuralKey(tm);let box=tm.sheetSlot?.('routeChoices')||document.getElementById('routeChoices');if(!force&&box?.dataset.key===key)return;if(!box){box=document.createElement('section');box.id='routeChoices';sheet.append(box);}box.style.cssText='margin-top:10px;padding-top:9px;border-top:1px dashed #c5cec8';box.dataset.key=key;const mobile=mobilityHtml(tm);if(st?.kind==='getoff'||st?.kind==='walking'||st?.kind==='riding'){box.innerHTML=mobile;wireMobility(tm,box);return;}const raw=routeChoices(tm.city,ch.currentFrom(),ch.currentTo(),3),from=nodeName(tm.city,ch.currentFrom()),to=nodeName(tm.city,ch.currentTo());
  // THE ONE YOU CAN PRESS COMES FIRST. Three cards at 130px each put the lit
  // CATCH second or third, below the fold on a phone, under two greyed WAITs —
  // the screenshot had the player reading two things they could not do before
  // the one they could. Lit first, then by door-to-door, and each option is
  // one row: verb, service, where it goes, what it costs.
  const choices=raw.map(c=>{const a=arrivalState(tm,c),est=planEstimate(tm,c,a.ready?0:(a.eta??null));return{c,a,est};})
    .sort((x,y)=>(y.a.ready-x.a.ready)||((x.est?.total??1e9)-(y.est?.total??1e9))||((x.a.eta??1e9)-(y.a.eta??1e9))).map(x=>x.c);
  if(!choices.length){box.innerHTML=`<b style="font-size:11px">WAIT AT HUB</b><p style="font-size:11px;color:#69777a;margin-top:4px">No fixed HSL chain connects ${esc(from)} → ${esc(to)}.</p>${mobile}`;wireMobility(tm,box);return;}
  box.innerHTML=`<b style="font-size:11px">BOARD ONE OF ${choices.length} · to ${esc(to)}</b>${ch.index?'':(choices.some(c=>arrivalState(tm,c).ready)?'<p class="hint">Tap the lit one.</p>':`<p class="hint">Nothing to catch yet${(()=>{const e=Math.min(...choices.map(c=>arrivalState(tm,c).eta??Infinity));return Number.isFinite(e)?' · first '+inMinutes(e,tm):'';})()}.</p>`)}`+choices.map((c,i)=>{const a=arrivalState(tm,c);const est=planEstimate(tm,c,a.ready?0:(a.eta??null));const last=c.legs[c.legs.length-1];return `<button class="catchChoice row ${a.ready?'lit':'dim'}" data-choice="${i}" data-total="${est?.total??''}" data-wait2="${est?.wait2??''}" ${a.ready?'':'disabled'}><b class="catchVerb" style="font-size:11px;min-width:44px;color:${a.ready?'#233d4d':'#69777a'}">${a.ready?'CATCH':'WAIT'}</b><span class="to">${c.legs.map(l=>chip(tm,l)).join(' <span style="color:#69777a">→</span> ')} <span style="font-weight:400">${esc(directionName(tm.city,last))}</span><small class="catchHead">${a.label}${c.transfers?` · change at ${esc(nodeName(tm.city,c.transfer))}`:''}</small></span><span class="catchCost rt">${esc(costLine(tm,c,a))}</span></button>`;}).join('')+mobile;box._choices=choices;box.querySelectorAll('.catchChoice').forEach(btn=>btn.onclick=()=>{const choice=choices[Number(btn.dataset.choice)],a=arrivalState(tm,choice);if(!a.ready){render(tm,true);return;}const res=ch.catchChoice(choice,a.vehicle);if(res?.error){box.insertAdjacentHTML('beforeend',`<p style="font-size:11px;color:#b34a36">${esc(res.error)}</p>`);}else render(tm,true);});wireMobility(tm,box);}
// A MISS IS ONLY A MISS IF IT WAS A CATCH YOU COULD HAVE PRESSED.
//
// hub-tactics used to work this out for itself, and it asked a different
// question: its arrival() scanned EVERY service calling at the stop and took no
// direction, so it flagged a miss whenever any tram on any line was at the hub
// and left. A CATCH lights only for a vehicle going the way your leg goes.
// Measured on the live build — an iPad, a job taken, standing still at
// Lasipalatsi for 100 seconds — that produced 23 MISSED banners across 8 lines
// (4T, 10H, 4H, H, 1H, 10B, 10, 1T) while the only line the game ever offered
// for that job was 1. The overlap was NONE: every accusation was about a tram
// the player had never been offered, and the one they could actually board was
// never mentioned. The owner's recording shows four of these, and they were
// read as evidence the buttons were unreachable; that was a real bug and it is
// fixed, but this one is why the game felt like it was keeping score against
// you.
//
// So the miss is detected HERE, where readiness is already computed with a
// direction, and it means what the word says: a catch that was lit, and is not
// any more, and you did not board it.
const MISS_TICKS = 8;
let _ready = new Map(), _readyJob = '';
function trackMisses(tm, choices) {
  const ch = tm.challenge, st = tm.mobility?.status?.();
  if (!ch?.active || !choices) return;
  const job = `${ch.index}:${ch.leg}`;
  if (job !== _readyJob) { _ready = new Map(); _readyJob = job; }
  // Only while you are standing at the stop. Boarding makes a lit catch stop
  // being lit, and calling that a miss would blame you for succeeding.
  const waiting = st?.kind === 'waiting';
  const now = tm.flow.clock.tick, misses = (tm.catchMisses ||= []);
  for (const c of choices) {
    const leg = c?.legs?.[0]; if (!leg) continue;
    const key = `${leg.line.label}:${leg.from}>${leg.to}`;
    const ready = arrivalState(tm, c).ready, was = _ready.get(key);
    if (was === true && !ready && waiting) misses.push({ tick: now, line: leg.line.label });
    _ready.set(key, ready);
  }
  while (misses.length && now - misses[0].tick > MISS_TICKS) misses.shift();
}

function mount(){if(typeof window==='undefined')return;let last='';setInterval(()=>{const tm=window.__tm;if(!tm?.challenge)return;if(!document.body.classList.contains('transit-view'))tm.transit?.showAll?.();const k=structuralKey(tm);if(k!==last||!document.getElementById('routeChoices')){last=k;render(tm);}else refreshArrivals(tm);
  trackMisses(tm,document.getElementById('routeChoices')?._choices);},250);}
mount();
