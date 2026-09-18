// Toko Move v2.12.2 — concurrent courier jobs expose live tradeoffs without naming a correct answer.
import {CARGO,DELIVERY_TARGET} from './deliveries.js?v=14';
import {badge,inMinutes,about,cargoGlyph,minutes} from './ui.js?v=1';
import {regularAt,standingOf,standingWord} from './regulars.js?v=1';
import {planEstimate,nextDeparture,layerFor} from './timetable.js?v=1';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));
const nodeName=(tm,id)=>tm.city?.nodes?.find(n=>n.id===id)?.name||id;
// layerFor and nearestPathIndex used to be declared here as well. The local
// nearestPathIndex did not scale longitude by cos(lat), so it measured a stop
// as about twice as far north-south as east-west — a third copy of a function
// that already existed twice, and the only one of the three that was wrong.
function choices(tm,from,to){return globalThis.__tmRouteChoiceCore?.routeChoices?.(tm.city,from,to,6)||[];}
// WHEN THE FIRST VEHICLE OF A PLAN GETS HERE. Two bugs came out of this line
// together, and both told the dispatcher something false:
//
//   it scanned only 120 ticks, so a service twelve seconds further out than
//   that reported nothing at all and the offer read "no useful vehicle" — the
//   same horizon artefact the catch panel had;
//
//   and it passed NO DIRECTION, so it happily matched a tram running the other
//   way. The board could advertise a vehicle arriving in 0t that you cannot
//   ride anywhere near your destination.
//
// It takes a LEG now, not a line and a stop, because a leg is the thing that
// knows which way you mean to go — and it asks the shared timetable, so the
// dispatch board and the catch panel cannot give different answers about one
// trip.
function firstArrival(tm,leg,horizon=Infinity){const layer=layerFor(tm,leg.line);if(!layer||!tm.liveNetwork)return null;
 const dt=nextDeparture(tm,leg,tm.flow.clock.tick);
 return dt==null||dt>horizon?null:{dt,layer};}
// The dispatcher's judge: does this offer have a compatible vehicle reaching
// its pickup inside `horizon` ticks? 300 ticks is 30 seconds of wall time — a
// wait a person will sit through on a first job without deciding the game is
// broken. Reads the same fleet the UI reads, so the board and the offer agree.
// THE COST OF A JOB, for the dispatcher and for the deadline.
//
// The cheapest door-to-door plan the network actually offers, from the same
// timetable the catch panel quotes. It is what `deliveries.js` sets a deadline
// from, so a deadline is a fact about this city rather than a distance times a
// constant.
export function planCost(tm,offer){const c=CARGO[offer.cargo]||CARGO.documents;
 const compatible=choices(tm,offer.stops[0],offer.stops[1]).filter(ch=>!c.modes||ch.legs.every(l=>c.modes.includes(l.line.mode)));
 let best=null;
 for(const choice of compatible){const est=planEstimate(tm,choice);
  if(est?.total!=null&&(best==null||est.total<best))best=est.total;}
 return best;}
export function reachableSoon(tm,offer,horizon=300){const c=CARGO[offer.cargo]||CARGO.documents;const compatible=choices(tm,offer.stops[0],offer.stops[1]).filter(choice=>!c.modes||choice.legs.every(l=>c.modes.includes(l.line.mode)));return compatible.some(choice=>!!firstArrival(tm,choice.legs[0],horizon));}
export function rankOffer(tm,offer){const c=CARGO[offer.cargo]||CARGO.documents,compatible=choices(tm,offer.stops[0],offer.stops[1]).filter(choice=>!c.modes||choice.legs.every(l=>c.modes.includes(l.line.mode)));if(!compatible.length)return{unreachable:true};const options=[];for(const choice of compatible){const hit=firstArrival(tm,choice.legs[0]);if(!hit){options.push({choice,waiting:true});continue;}const transfers=choice.transfers||0,est=planEstimate(tm,choice,hit.dt),eta=est?.total??null;options.push({choice,hit,eta,transfers,est});}return{options};}
function offerButton(tm,offer,info,label='TAKE JOB'){const seen=new Set(),live=(info.options||[]).filter(x=>x.hit).sort((a,b)=>(a.eta??1e9)-(b.eta??1e9)||a.hit.dt-b.hit.dt).filter(x=>{const k=`${x.choice.legs[0].line.label}>${x.choice.transfer||''}`;if(seen.has(k))return false;seen.add(k);return true;}),first=live[0];
 // ONE ROW: what you carry, where it goes, the first line that gets you there
 // and when, what it pays. The old card was four lines of prose per job.
 const c=CARGO[offer.cargo]||CARGO.documents,layer=first&&tm.transit?.layers?.find(x=>x.id===first.choice.legs[0].line.sourceId);
 const via=first?`${badge(first.choice.legs[0].line.label,layer?.colour,first.choice.legs[0].line.mode)} ${inMinutes(first.hit.dt,tm)}${first.transfers?' · change':''}`:(info.unreachable?'cannot get there':'nothing scheduled');
 // WHO IS AT THE OTHER END, when there is somebody: a regular's name and how
 // you stand with them, instead of a stop. And a hand-off wears its window —
 // the price at the door is only the price for fifteen seconds.
 const reg=regularAt(offer.stops[1]),st=reg?standingOf(tm.challenge.standing,reg.id):0;
 const hand=offer.handoff&&tm.flow.clock.tick<=offer.bonusUntil,left=hand?Math.max(1,Math.ceil((offer.bonusUntil-tm.flow.clock.tick)/10)):0;
 const claimed=tm.rival?.pressure?.(offer.id),rivalLeft=claimed!=null?Math.max(0,Math.ceil(claimed/10)):null;
 const who=reg?`<b style="color:#233d4d">${esc(reg.name)}</b> · ${esc(nodeName(tm,offer.stops[1]))}`:esc(nodeName(tm,offer.stops[1]));
 const sub=reg?`${esc(standingWord(st))} · ${via}`:via;
 return `<button class="jobOffer row${info.unreachable?' dim':''}${hand?' hand':''}" data-id="${esc(offer.id)}" ${info.unreachable?'disabled':''} title="${esc(c.rule)}"><span class="cg" style="font-size:18px;color:${esc(cargoColourOf(offer.cargo))}">${cargoGlyph(c.icon)}</span><span class="to">${who}<small>${hand?`<b style="color:#e2683c">${esc(offer.from)} hands you one</b> · `:''}${rivalLeft!=null?`<b style="color:#9b59b6">${esc(tm.rival.name)} is going for this · ${rivalLeft} s</b> · `:''}${sub}${first?.eta!=null?` · ${about(first.eta,tm)}`:''}</small></span><span class="rt"><b>+${hand?Math.round(offer.value*(1+offer.bonus)):offer.value}</b>${hand?`<small style="color:#e2683c">+${Math.round(offer.bonus*100)}% · ${left} s</small>`:label==='TAKE JOB'?'':'<small>2nd</small>'}</span></button>`;}
function cargoColourOf(cargo){return {documents:'#2f9fb8','hot food':'#e2683c',parts:'#69777a',fragile:'#9b59b6',equipment:'#233d4d',express:'#c8a03a','fresh food':'#5aa860','market goods':'#b5651d'}[cargo]||'#233d4d';}
// ON YOUR WAY. The drops the current boarding options would pass. One line
// each — the offer names the line, because taking it is a reason to choose
// that line over the others, which is the point.
// The candidates: for each boarding option's first leg, the REAL stops the
// layer calls at strictly between the two graph nodes, in travel order.
export function alongCandidates(tm){const ch=tm.challenge;if(!ch?.active||!ch.waitingForCatch)return[];const from=ch.currentFrom(),to=ch.currentTo(),table=new Map((tm.transit?.pack?.stops||[]).map(st=>[st.id,st]));const out=[];
 for(const c of choices(tm,from,to)){const leg=c.legs[0];if(!leg)continue;const layer=tm.transit?.layers?.find(x=>x.id===leg.line.sourceId);if(!layer?.path?.length)continue;
  const pi=(lat,lon)=>{let bi=0,bd=Infinity;for(let i=0;i<layer.path.length;i++){const q=layer.path[i],d=(q[0]-lat)**2+(q[1]-lon)**2;if(d<bd){bd=d;bi=i;}}return bi;};
  const A=tm.city?.resolved?.[from],B=tm.city?.resolved?.[to];if(!A||!B)continue;const a=pi(A.lat,A.lon),b=pi(B.lat,B.lon);if(a===b)continue;const lo=Math.min(a,b)+2,hi=Math.max(a,b)-2;
  const between=(layer.stops||[]).map(id=>table.get(id)).filter(Boolean).map(st=>({id:st.id,name:st.name,lat:st.lat,lon:st.lon,pathIndex:pi(st.lat,st.lon)})).filter(st=>st.pathIndex>lo&&st.pathIndex<hi);
  between.sort((x,y)=>a<b?x.pathIndex-y.pathIndex:y.pathIndex-x.pathIndex);
  out.push({line:leg.line,from,to,between});}
 return out;}
export function alongOffersFor(tm){return tm.challenge?.alongOffers?.(alongCandidates(tm))||[];}
// ON YOUR WAY. The drops the current boarding options would pass. One line
// each — the offer names the line, because taking it is a reason to choose
// that line over the others, which is the point.
function alongHtml(tm){const ch=tm.challenge;if(!ch?.active||!ch.waitingForCatch)return'';const offers=alongOffersFor(tm),bag=ch.along||[];if(!offers.length&&!bag.length)return'';
 const carried=bag.length?`<p style="font-size:10px;color:#233d4d;margin:4px 0"><b>BAG</b> ${bag.map(j=>`${esc(CARGO[j.cargo]?.icon||'JOB')} → ${esc(j.name||nodeName(tm,j.stops[1]))}`).join(' · ')}</p>`:'';
 return `<section class="alongList" style="margin-top:9px;padding-top:9px;border-top:2px solid #e2683c"><b style="font-size:11px">ON YOUR WAY</b>${carried}${offers.map(o=>{const layer=tm.transit?.layers?.find(x=>x.name===o.line);return `<button class="alongOffer row" data-id="${esc(o.id)}"><span class="cg" style="font-size:18px;color:#e2683c">↓</span><span class="to">${esc(o.name)}<small>${badge(o.line,layer?.colour)} drop on the way · ${esc(cargoGlyph(CARGO[o.cargo]?.icon))}</small></span><span class="rt"><b>+${o.value}</b></span></button>`;}).join('')}</section>`;}
function carryHtml(tm){const ch=tm.challenge;if(!ch?.active)return'';const q=ch.queued,canSecond=ch.canTakeSecond?.();if(!canSecond&&!q)return'';const activeDest=nodeName(tm,ch.active.stops[1]);if(q)return `<section id="carryBoard" style="margin-top:9px;padding:9px;border:2px solid #233d4d;border-radius:9px;background:#f7f5ee"><b>CARRYING 2</b><p style="font-size:11px;color:#69777a;margin:4px 0">${esc(activeDest)} first, then ${esc(nodeName(tm,q.originalStops?.[1]||q.stops[1]))}.</p><button id="swapJobs" style="width:100%;min-height:44px;border:1px solid #233d4d;border-radius:7px;background:#fffdf7;font:inherit;font-weight:900">SWAP DELIVERY ORDER</button></section>`;const rows=(ch.offers||[]).map(o=>({offer:o,info:rankOffer(tm,o)}));if(!rows.length)return'';return `<section id="carryBoard" style="margin-top:9px;padding-top:9px;border-top:2px solid #233d4d"><b style="font-size:11px">TAKE ONE MORE?</b><p class="hint">Both clocks run at once.</p>${rows.map(({offer,info})=>offerButton(tm,offer,info,'CARRY AS SECOND JOB')).join('')}</section>`;}
export function mountJobBoard(tm){let last='';const render=()=>{const ch=tm.challenge,sheet=document.getElementById('sheet');if(!ch||!sheet||ch.complete)return;if(!ch.active||!ch.waitingForCatch){const al=tm.sheetSlot?.('alongBoard');if(al&&al.innerHTML)al.innerHTML='';}const bucket=Math.floor((tm.flow?.clock?.tick||0)/2);if(ch.active){const key=`active:${ch.index}:${ch.queued?.id||''}:${ch.offers?.map(x=>x.id).join(',')}:${(ch.along||[]).map(j=>j.id).join(',')}:${ch.waitingForCatch?'w':'r'}:${ch.currentFrom()}:${bucket}`;if(key===last)return;last=key;
 // The dispatch list is what you choose FROM, and you have already chosen. It
 // used to stay on screen under the new job, three TAKE JOB cards deep, with
 // the catch buttons appended below it off the bottom of a phone.
 const slot=tm.sheetSlot?.('jobBoard')||sheet;slot.innerHTML=carryHtml(tm)||'';{const al=tm.sheetSlot?.('alongBoard');const html=alongHtml(tm)||'';if(al&&al.innerHTML!==html)al.innerHTML=html;}tm.paintSheet?.();sheet.querySelectorAll('.alongList .alongOffer').forEach(btn=>btn.onclick=()=>{const o=alongOffersFor(tm).find(x=>x.id===btn.dataset.id);const r=o?ch.acceptAlong(o):{error:'offer gone'};if(r?.error)sheet.insertAdjacentHTML('beforeend',`<p class="hint">${esc(r.error)}</p>`);last='';render();});sheet.querySelector('#swapJobs')?.addEventListener('click',()=>{ch.swapJobs();last='';render();});sheet.querySelectorAll('#carryBoard .jobOffer:not([disabled])').forEach(btn=>btn.onclick=()=>{const r=ch.acceptOffer(btn.dataset.id);if(r?.error)sheet.insertAdjacentHTML('beforeend',`<p class="hint">${esc(r.error)}</p>`);last='';render();});return;}
 const offers=ch.offers||[],key=`idle:${ch.index}:${bucket}:${offers.map(x=>x.id).join(',')}:${ch.handoffLive?.()?Math.ceil((ch.pendingHandoff.bonusUntil-tm.flow.clock.tick)/10):''}:${tm.rival?.claim?Math.ceil((tm.rival.claim.at-tm.flow.clock.tick)/10):''}`;if(key===last&&document.getElementById('jobBoard')?.innerHTML)return;last=key;const rows=offers.map(o=>({offer:o,info:rankOffer(tm,o)}));const slot=tm.sheetSlot?.('jobBoard')||sheet;const rc=document.getElementById('routeChoices');if(rc)rc.innerHTML='';slot.innerHTML=`<div><h2>DISPATCH · ${esc(nodeName(tm,ch.location))}</h2>${ch.index?'':'<p class="hint">Pick a job. The badge is the tram that takes you.</p>'}${rows.map(({offer,info})=>offerButton(tm,offer,info)).join('')}</div>`;tm.paintSheet?.();sheet.querySelectorAll('.jobOffer:not([disabled])').forEach(btn=>btn.onclick=()=>{const r=ch.acceptOffer(btn.dataset.id);if(r?.error)sheet.insertAdjacentHTML('beforeend',`<p class="hint">${esc(r.error)}</p>`);last='';render();});};setInterval(render,300);render();}
