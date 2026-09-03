// Toko Move v2.12.2 — concurrent courier jobs expose live tradeoffs without naming a correct answer.
import {CARGO,DELIVERY_TARGET} from './deliveries.js?v=9';
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
export function reachableSoon(tm,offer,horizon=300){const c=CARGO[offer.cargo]||CARGO.documents;const compatible=choices(tm,offer.stops[0],offer.stops[1]).filter(choice=>!c.modes||choice.legs.every(l=>c.modes.includes(l.line.mode)));return compatible.some(choice=>!!firstArrival(tm,choice.legs[0],horizon));}
export function rankOffer(tm,offer){const c=CARGO[offer.cargo]||CARGO.documents,compatible=choices(tm,offer.stops[0],offer.stops[1]).filter(choice=>!c.modes||choice.legs.every(l=>c.modes.includes(l.line.mode)));if(!compatible.length)return{unreachable:true};const options=[];for(const choice of compatible){const hit=firstArrival(tm,choice.legs[0]);if(!hit){options.push({choice,waiting:true});continue;}const transfers=choice.transfers||0,est=planEstimate(tm,choice,hit.dt),eta=est?.total??null;options.push({choice,hit,eta,transfers,est});}return{options};}
function offerButton(tm,offer,info,label='TAKE JOB'){const seen=new Set(),live=(info.options||[]).filter(x=>x.hit).sort((a,b)=>(a.eta??1e9)-(b.eta??1e9)||a.hit.dt-b.hit.dt).filter(x=>{const k=`${x.choice.legs[0].line.label}>${x.choice.transfer||''}`;if(seen.has(k))return false;seen.add(k);return true;}),soon=live.slice(0,2),detail=info.unreachable?'cargo cannot reach this destination on allowed modes':soon.length?soon.map(x=>`${esc(x.choice.legs[0].line.mode.toUpperCase())} ${esc(x.choice.legs[0].line.label)} +${x.hit.dt}t · ${x.eta==null?'est unknown':`~${x.eta}t`}${x.transfers?` · via ${esc(nodeName(tm,x.choice.transfer))}${x.est?.wait2!=null?` (+${x.est.wait2}t there)`:''}`:' · direct'}`).join(' | '):'valid route, but nothing scheduled on it';return `<button class="jobOffer" data-id="${esc(offer.id)}" ${info.unreachable?'disabled':''} style="display:block;width:100%;min-height:68px;text-align:left;margin-top:7px;padding:9px;background:#fffdf7;opacity:${info.unreachable ? .48 : 1};border:1px solid #c5cec8;border-radius:8px;font:inherit"><b>${esc(nodeName(tm,offer.stops[1]))}</b> · ${esc(offer.cargo)} · ${offer.value} pts<br><span style="font-size:10px;color:#69777a">${detail} · deadline ${offer.limit}t</span><br><span style="font-size:10px;font-weight:900;color:#233d4d">${label}</span></button>`;}
function carryHtml(tm){const ch=tm.challenge;if(!ch?.active)return'';const q=ch.queued,canSecond=ch.canTakeSecond?.();if(!canSecond&&!q)return'';const activeDest=nodeName(tm,ch.active.stops[1]);if(q)return `<section id="carryBoard" style="margin-top:9px;padding:9px;border:2px solid #233d4d;border-radius:9px;background:#f7f5ee"><b>CARRYING 2 JOBS</b><p style="font-size:10px;color:#69777a;margin:4px 0">First: ${esc(activeDest)} · Second: ${esc(nodeName(tm,q.originalStops?.[1]||q.stops[1]))}. Both deadlines are already running.</p><button id="swapJobs" style="width:100%;min-height:44px;border:1px solid #233d4d;border-radius:7px;background:#fffdf7;font:inherit;font-weight:900">SWAP DELIVERY ORDER</button></section>`;const rows=(ch.offers||[]).map(o=>({offer:o,info:rankOffer(tm,o)}));if(!rows.length)return'';return `<section id="carryBoard" style="margin-top:9px;padding-top:9px;border-top:2px solid #233d4d"><b>TAKE ONE MORE?</b><p class="hint">You can carry two jobs from this pickup hub. The second deadline starts immediately, so destination order matters.</p>${rows.map(({offer,info})=>offerButton(tm,offer,info,'CARRY AS SECOND JOB')).join('')}</section>`;}
export function mountJobBoard(tm){let last='';const render=()=>{const ch=tm.challenge,sheet=document.getElementById('sheet');if(!ch||!sheet||ch.complete)return;const bucket=Math.floor((tm.flow?.clock?.tick||0)/2);if(ch.active){const key=`active:${ch.index}:${ch.queued?.id||''}:${ch.offers?.map(x=>x.id).join(',')}:${bucket}`;if(key===last&&document.getElementById('carryBoard'))return;last=key;document.getElementById('carryBoard')?.remove();const html=carryHtml(tm);if(html)sheet.insertAdjacentHTML('beforeend',html);sheet.querySelector('#swapJobs')?.addEventListener('click',()=>{ch.swapJobs();last='';render();});sheet.querySelectorAll('#carryBoard .jobOffer:not([disabled])').forEach(btn=>btn.onclick=()=>{const r=ch.acceptOffer(btn.dataset.id);if(r?.error)sheet.insertAdjacentHTML('beforeend',`<p class="hint">${esc(r.error)}</p>`);last='';render();});return;}
 const offers=ch.offers||[],key=`idle:${ch.index}:${bucket}:${offers.map(x=>x.id).join(',')}`;if(key===last&&document.getElementById('jobBoard'))return;last=key;const rows=offers.map(o=>({offer:o,info:rankOffer(tm,o)}));sheet.innerHTML=`<section id="jobBoard"><h2>DISPATCH · ${ch.index}/${DELIVERY_TARGET} COMPLETE</h2><p class="hint">${offers.length} jobs leave ${esc(nodeName(tm,ch.location))}. Compare value, deadline, transfers and what is actually approaching; no route is marked as the answer.</p>${rows.map(({offer,info})=>offerButton(tm,offer,info)).join('')}</section>`;sheet.querySelectorAll('.jobOffer:not([disabled])').forEach(btn=>btn.onclick=()=>{const r=ch.acceptOffer(btn.dataset.id);if(r?.error)sheet.insertAdjacentHTML('beforeend',`<p class="hint">${esc(r.error)}</p>`);last='';render();});};setInterval(render,300);render();}
