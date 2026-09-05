import {layerFor,nearestPathIndex,pathDirection,planEstimate} from './timetable.js?v=1';
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
function chip(tm,leg){const layer=layerFor(tm,leg.line),colour=layer?.colour||'#52676d';return `<span style="display:inline-block;border-bottom:4px solid ${colour};background:#fffdf7;padding:5px 7px;margin:3px 5px 3px 0;font:700 11px ui-monospace,monospace"><b>${esc(leg.line.label)}</b> ${esc(leg.line.mode)} → ${esc(directionName(tm.city,leg))}</span>`;}
function arrivalState(tm,choice){const leg=choice?.legs?.[0],layer=leg&&layerFor(tm,leg.line);if(!layer||!tm.liveNetwork)return{ready:true,label:'READY',vehicle:null};const idx=nearestPathIndex(tm,layer,leg.from),dir=pathDirection(tm,layer,leg.from,leg.to),near=tm.liveNetwork.nearestTo(layer,idx,tm.flow.clock.tick,2.2,dir);if(near)return{ready:true,label:'AT HUB',eta:0,vehicle:near.vehicle};const eta=tm.liveNetwork.nextArrival(layer,idx,tm.flow.clock.tick,dir);return{ready:false,label:eta==null?'WAITING':`ARRIVES ~${eta}t`,eta,vehicle:null};}
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
  const total = e.total == null ? '' : `~${e.total}t door to door`;
  if (!choice.legs[1]) return total;
  if (e.wait2 == null) return total ? `${total} · transfer wait unknown` : 'transfer wait unknown';
  return `${total}${total ? ' · ' : ''}then WAIT ${e.wait2}t at ${nodeName(tm.city, choice.transfer)}`;
}

function mobilityHtml(tm){const m=tm.mobility,st=m?.status?.();if(!m||!st)return'';if(st.kind==='getoff')return `<div style="margin-top:8px;padding:9px;border:2px solid #e2683c;border-radius:8px;background:#fff8ef"><b>ARRIVED · ${esc(nodeName(tm.city,st.at))}</b><p style="font-size:11px;color:#69777a;margin:4px 0">${st.transfer?'Transfer here. Get off, then wait for a second real vehicle.':'Destination reached by the selected vehicle.'}</p><button id="getOff" style="width:100%;min-height:44px;border:1px solid #233d4d;border-radius:7px;background:#233d4d;color:#fff;font:inherit;font-weight:800">GET OFF</button></div>`;if(st.kind==='walking')return `<div style="margin-top:8px;padding:9px;border:2px solid #69777a;border-radius:8px;background:#f7f5ee"><b>WALKING · ${esc(nodeName(tm.city,st.from))} → ${esc(nodeName(tm.city,st.to))}</b><p style="font-size:11px;color:#69777a;margin-top:4px">${esc(st.street)} · ${st.remaining}t remaining</p></div>`;if(st.kind==='riding'&&st.ride){const r=st.ride;
  // THE RIDE HAS A DECISION IN IT NOW. Offered only while the vehicle is really
  // at a stop, and only when leaving beats staying — an option that is always
  // there is furniture, and one that is never worth taking is a lie.
  const exits=(m.rideExits?.()||[]).filter(x=>x.better!=null&&x.better>0);
  const off=exits.map(x=>`<button class="exitChoice" data-at="${esc(x.at)}" style="display:block;width:100%;min-height:44px;text-align:left;margin-top:7px;padding:7px 8px;background:#fff8ef;border:2px solid #e2683c;border-radius:7px;font:inherit"><b>GET OFF HERE · ${esc(nodeName(tm.city,x.at))}</b><br><span style="font-size:10px;color:#69777a">~${x.exit}t from here against ~${x.stay}t staying aboard · saves ~${x.better}t</span></button>`).join('');
  return `<div style="margin-top:8px;padding:9px;border:2px solid #233d4d;border-radius:8px;background:#eef5ef"><b>ON ${esc(String(r.mode||'transit').toUpperCase())} ${esc(r.line||'')}</b><p style="font-size:11px;color:#52676d;margin:4px 0">Vehicle ${esc(r.vehicleId||'')} · current ${esc(nodeName(tm.city,r.current||r.from))} · next ${esc(nodeName(tm.city,r.next||r.to))}</p><p style="font-size:10px;color:#69777a;margin:0">Stay aboard until this highlighted vehicle physically reaches ${esc(nodeName(tm.city,r.to))}.</p>${off}</div>`;}if(st.kind!=='waiting')return'';const walks=m.walks?.()||[];if(!walks.length)return'';if(!m.canWalk())return `<div style="margin-top:8px;padding:8px;border-top:1px dashed #c5cec8"><b style="font-size:11px">WALK</b><p style="font-size:10px;color:#69777a;margin-top:3px">${esc(tm.challenge.active?.cargo)} must stay on transit.</p></div>`;const interceptions=tm.interceptionOptions?.()||[];return `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #c5cec8"><b style="font-size:11px">OR WALK / INTERCEPT</b><p style="font-size:10px;color:#69777a;margin:4px 0">Walking can reposition you to catch a useful vehicle downstream.</p>${walks.map((w,i)=>{const hit=interceptions.find(x=>x.hub===w.to);const note=hit?` · CATCH ${esc(hit.line.label)} +${hit.waitTicks}t · ${hit.timing}`:' · no clear catch yet';return `<button class="walkChoice" data-walk="${i}" style="display:block;width:100%;min-height:44px;text-align:left;margin-top:5px;padding:7px 8px;background:${hit?'#eef5ef':'#fffdf7'};border:1px solid ${hit?(hit.layer?.colour||'#c5cec8'):'#c5cec8'};border-radius:7px;font:inherit"><b>${esc(nodeName(tm.city,w.to))}</b><br><span style="font-size:10px;color:#69777a">${esc(w.street)} · WALK ${w.cost}t${note}</span></button>`;}).join('')}</div>`;}
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
function refreshArrivals(tm){const box=document.getElementById('routeChoices'),choices=box?._choices;if(!box||!choices)return;
  for(const btn of box.querySelectorAll('.catchChoice')){
    const c=choices[Number(btn.dataset.choice)];if(!c)continue;
    const a=arrivalState(tm,c),head=btn.querySelector('.catchHead'),verb=btn.querySelector('.catchVerb');
    if(head)head.textContent=`${a.label} · ${c.transfers?`FIRST RIDE TO ${nodeName(tm.city,c.transfer)}`:'DIRECT'}`;
    if(verb)verb.textContent=a.ready?'CATCH':'WAIT';
    const cost=btn.querySelector('.catchCost');
    if(cost)cost.textContent=costLine(tm,c,a);
    const est=planEstimate(tm,c,a.ready?0:(a.eta??null));
    btn.dataset.total=est?.total??'';btn.dataset.wait2=est?.wait2??'';
    btn.disabled=!a.ready;
    btn.style.background=a.ready?'#eef5ef':'#f1f0eb';
    btn.style.opacity=a.ready?1:.65;
    btn.style.cursor=a.ready?'pointer':'default';}}

function render(tm,force=false){const sheet=document.getElementById('sheet'),ch=tm.challenge;if(!sheet||!ch?.active||!tm.city)return;const st=tm.mobility?.status?.(),key=structuralKey(tm);let box=document.getElementById('routeChoices');if(!force&&box?.dataset.key===key)return;if(!box){box=document.createElement('section');box.id='routeChoices';box.style.cssText='margin-top:10px;padding-top:9px;border-top:1px dashed #c5cec8';sheet.append(box);}box.dataset.key=key;const mobile=mobilityHtml(tm);if(st?.kind==='getoff'||st?.kind==='walking'||st?.kind==='riding'){box.innerHTML=mobile;wireMobility(tm,box);return;}const choices=routeChoices(tm.city,ch.currentFrom(),ch.currentTo(),3),from=nodeName(tm.city,ch.currentFrom()),to=nodeName(tm.city,ch.currentTo());if(!choices.length){box.innerHTML=`<b style="font-size:11px">WAIT AT HUB</b><p style="font-size:11px;color:#69777a;margin-top:4px">No fixed HSL chain connects ${esc(from)} → ${esc(to)}.</p>${mobile}`;wireMobility(tm,box);return;}box.innerHTML=`<b style="font-size:11px">WAIT AT HUB · ${esc(from)} → ${esc(to)}</b><p style="font-size:10px;color:#69777a;margin:4px 0">Board only when a visible vehicle is here and moving toward this leg.</p>`+choices.map((c,i)=>{const a=arrivalState(tm,c);const est=planEstimate(tm,c,a.ready?0:(a.eta??null));return `<button class="catchChoice" data-choice="${i}" data-total="${est?.total??''}" data-wait2="${est?.wait2??''}" ${a.ready?'':'disabled'} style="display:block;width:100%;min-height:52px;text-align:left;margin-top:6px;padding:7px 8px;background:${a.ready?'#eef5ef':'#f1f0eb'};opacity:${a.ready?1:.65};border:1px solid #c5cec8;border-radius:7px;font:inherit;cursor:${a.ready?'pointer':'default'}"><span class="catchHead" style="font-size:10px;color:#69777a">${a.label} · ${c.transfers?`FIRST RIDE TO ${esc(nodeName(tm.city,c.transfer))}`:'DIRECT'}</span><div>${c.legs.map(l=>chip(tm,l)).join('')}</div><b class="catchVerb" style="font-size:11px">${a.ready?'CATCH':'WAIT'}</b> <span class="catchCost" style="display:block;margin-top:3px;font-size:10px;color:#69777a;font-weight:700">${esc(costLine(tm,c,a))}</span></button>`;}).join('')+mobile;box._choices=choices;box.querySelectorAll('.catchChoice').forEach(btn=>btn.onclick=()=>{const choice=choices[Number(btn.dataset.choice)],a=arrivalState(tm,choice);if(!a.ready){render(tm,true);return;}const res=ch.catchChoice(choice,a.vehicle);if(res?.error){box.insertAdjacentHTML('beforeend',`<p style="font-size:11px;color:#b34a36">${esc(res.error)}</p>`);}else render(tm,true);});wireMobility(tm,box);}
function mount(){if(typeof window==='undefined')return;let last='';setInterval(()=>{const tm=window.__tm;if(!tm?.challenge)return;if(!document.body.classList.contains('transit-view'))tm.transit?.showAll?.();const k=structuralKey(tm);if(k!==last||!document.getElementById('routeChoices')){last=k;render(tm);}else refreshArrivals(tm);},250);}
mount();
