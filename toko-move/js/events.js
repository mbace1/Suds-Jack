// Toko Move — the event deck (owner, 2026-09-17: "roguelike random events type
// deal… help the granny across the street (10 sec delay)"). Two kinds:
//
//   DISRUPTIONS are facts. A line is held at a stop for a few minutes; the
//   fleet, the catch panel and the estimator all read the hold, so the plan
//   you made visibly goes wrong and you choose again. No buttons.
//
//   ENCOUNTERS are a choice — 80 Days' shape: one line and two options priced
//   in the run's own currency, which here is seconds. Every card has a free
//   way past (Slay the Spire's rule) and some have an option you only get for
//   what you carry (FTL's blue options): documents wave you past the
//   inspector. Helping pays GOODWILL, which nothing spends yet — Regulars will.
//
// The deck is DRAWN, never rolled: the schedule is a hash of the shift, so a
// shift replays and the bot can play it. Budget: at most three encounters and
// one disruption a shift, and the ticks they can cost add to under a tenth of
// the day, measured with test/shifts.cjs so a run of bad luck stays winnable.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

// Costs are in TICKS (ten a second at ×1). 100 ticks is the owner's ten seconds.
export const ENCOUNTERS=[
 {id:'granny',where:'stop',glyph:'👵',text:'An old lady wants to cross Mannerheimintie. The lights are short.',
  options:[{label:'Walk her across',cost:100,goodwill:2,score:20},{label:'Walk on',cost:0}]},
 {id:'tourist',where:'stop',glyph:'🧳',text:'A tourist with a paper map is looking for the cathedral.',
  options:[{label:'Show the way',cost:40,goodwill:1,score:15},{label:'Shrug',cost:0}]},
 {id:'inspector',where:'aboard',glyph:'🎫',text:'Ticket inspection. Everyone is looking for their phone.',
  options:[{label:'Papers, please — waved through',cost:0,needs:'documents',score:10},{label:'Show your ticket',cost:30},{label:'Look busy',cost:0}]},
 {id:'wallet',where:'stop',glyph:'👛',text:'A wallet on the bench. Nobody around.',
  options:[{label:'Hand it in at the kiosk',cost:60,goodwill:2,score:30},{label:'Pocket it',cost:0,goodwill:-3,score:45},{label:'Leave it',cost:0}]},
 {id:'busker',where:'stop',glyph:'🎸',text:'A busker starts the one song you actually like.',
  options:[{label:'Stay for the chorus',cost:30,goodwill:1,score:10},{label:'Walk on',cost:0}]},
 {id:'stroller',where:'aboard',glyph:'👶',text:'A stroller and three bags at the tram steps.',
  options:[{label:'Lift it aboard',cost:20,goodwill:1,score:10},{label:'Look at your phone',cost:0}]},
 {id:'friend',where:'aboard',glyph:'🧑',text:'Someone from school gets on. It has been years.',
  options:[{label:'Catch up',cost:0,goodwill:1,score:5,note:'you nearly miss your stop'},{label:'Nod and look away',cost:0}]},
];
// A held line: every vehicle on it stands where it is for `minutes`.
export const DISRUPTIONS=[
 {id:'stuck-car',glyph:'🚗',text:l=>`A car is parked on the rails — ${l} is held for a few minutes.`,minutes:4},
 {id:'switch',glyph:'⚡',text:l=>`Points failure — ${l} is standing at the next stop.`,minutes:6},
 {id:'medical',glyph:'🚑',text:l=>`A passenger is unwell — ${l} waits for the ambulance.`,minutes:5},
];
export const BUDGET={encounters:3,disruptions:1,maxCostTicks:280};

// The shift's schedule, from its seed alone.
export function drawSchedule(seed,ticksPerDay=3000,lines=[]){const h=hash(`events:${seed}`),out=[];
 const n=Math.min(BUDGET.encounters,ENCOUNTERS.length),used=new Set;
 for(let i=0;i<n;i++){const k=(h>>>(i*4))&0xffff;let card=ENCOUNTERS[k%ENCOUNTERS.length];let guard=0;while(used.has(card.id)&&guard++<ENCOUNTERS.length)card=ENCOUNTERS[(k+guard)%ENCOUNTERS.length];used.add(card.id);
  const at=Math.round(ticksPerDay*(0.12+0.24*i)+(k%400));out.push({kind:'encounter',card,at});}
 if(BUDGET.disruptions&&lines.length){const k=(h>>>13)&0xffff,d=DISRUPTIONS[k%DISRUPTIONS.length],line=lines[(k>>3)%lines.length];out.push({kind:'disruption',card:d,line,at:Math.round(ticksPerDay*0.3+(k%(ticksPerDay*0.35)))});}
 return out.sort((a,b)=>a.at-b.at);}

export class EventDirector{
 constructor(tm,seed=7){this.tm=tm;this.seed=seed;const lines=(tm.transit?.layers||[]).filter(l=>l.visible).map(l=>l.name);this.queue=drawSchedule(seed,tm.flow.clock.ticksPerDay,lines);this.pending=null;this.seen=[];this.busyUntil=0;this.holds=[];}
 // Called every tick after mobility. An encounter fires at the first moment
 // after its scheduled tick that the courier is where the card says.
 step(){const tm=this.tm,ch=tm.challenge,tick=tm.flow.clock.tick;if(this.pending)return false;const st=tm.mobility?.status?.();const here=st?.kind==='waiting'?'stop':st?.kind==='riding'?'aboard':st?.kind==='walking'?'walking':null;
  const next=this.queue[0];if(!next||tick<next.at)return false;
  if(next.kind==='disruption'){this.queue.shift();this.startHold(next);return true;}
  if(!ch?.active||here!==next.card.where)return false;
  this.queue.shift();this.pending={...next,since:tick};ch.say?.(`${next.card.glyph} ${next.card.text}`);return true;}
 startHold(ev){const net=this.tm.liveNetwork,layer=net?.transit?.layers?.find(l=>l.name===ev.line);if(!net||!layer)return;const perMin=this.tm.flow.clock.ticksPerDay/((this.tm.shift?.hours||1.25)*60),from=this.tm.flow.clock.tick,until=from+Math.round(ev.card.minutes*perMin);net.hold?.(layer,from,until);this.holds.push({...ev,from,until});this.tm.challenge?.say?.(`${ev.card.glyph} ${ev.card.text(ev.line)}`);}
 // What is held right now, for the banner.
 activeHolds(){const t=this.tm.flow.clock.tick;return this.holds.filter(h=>t>=h.from&&t<h.until);}
 options(){const p=this.pending;if(!p)return[];const cargo=this.tm.challenge?.active?.cargo;return p.card.options.filter(o=>!o.needs||o.needs===cargo);}
 choose(i){const p=this.pending;if(!p)return{error:'nothing to answer'};const opts=this.options(),o=opts[i];if(!o)return{error:'no such option'};const ch=this.tm.challenge,tick=this.tm.flow.clock.tick;
  if(o.cost)this.busyUntil=tick+o.cost;ch.goodwill=(ch.goodwill||0)+(o.goodwill||0);if(o.score){ch.score+=o.score;}
  this.seen.push({id:p.card.id,option:o.label,cost:o.cost||0,tick});this.pending=null;
  ch.say?.(`${o.label}${o.cost?` · ${Math.round(o.cost/10)} s`:''}${o.score?` · +${o.score}`:''}`);return{ok:true,cost:o.cost||0};}
 busy(){return this.tm.flow.clock.tick<this.busyUntil;}
}

// THE CARD. A face, one line, the options as rows priced in seconds; a held
// line as a banner that clears when the hold lifts. Same slot discipline as
// every other panel: it writes only into `eventCard`, first on the sheet.
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
export function mountEvents(tm,seed=7){const dir=new EventDirector(tm,seed);tm.events=dir;
 const ch=tm.challenge;const prev=ch.step;ch.step=()=>{const a=prev?prev():false;const b=dir.step();return a||b;};
 let last='';const render=()=>{const slot=tm.sheetSlot?.('eventCard');if(!slot)return;const p=dir.pending,holds=dir.activeHolds(),tick=tm.flow.clock.tick,busy=dir.busy();
  const key=`${p?.card.id||''}:${holds.map(h=>h.line+h.until).join(',')}:${busy?Math.floor((dir.busyUntil-tick)/10):''}`;if(key===last)return;last=key;
  let html='';
  if(p){const opts=dir.options();html+=`<section class="eventCard" style="margin:2px 0 8px;padding:10px;border:2px solid #233d4d;border-radius:12px;background:#fffdf7"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:30px;line-height:1">${p.card.glyph}</span><b style="font-size:13px">${esc(p.card.text)}</b></div>${opts.map((o,i)=>`<button class="row ${i===0?'lit':''} eventOpt" data-i="${i}"><span class="to">${esc(o.label)}${o.note?`<small>${esc(o.note)}</small>`:''}</span><span class="rt">${o.cost?`<b>−${Math.round(o.cost/10)} s</b>`:''}${o.score?`<small>+${o.score}</small>`:''}</span></button>`).join('')}</section>`;}
  else if(busy){html+=`<div class="row dim"><span class="to">Helping…<small>${Math.max(1,Math.ceil((dir.busyUntil-tick)/10))} s</small></span></div>`;}
  for(const h of holds){const perMin=tm.flow.clock.ticksPerDay/((tm.shift?.hours||1.25)*60);html+=`<div class="row" style="border-color:#e2683c;background:#fff8ef"><span style="font-size:20px">${h.card.glyph}</span><span class="to"><span class="lb" style="background:${esc(tm.transit?.layers?.find(l=>l.name===h.line)?.colour||'#52676d')}">${esc(h.line)}</span> is held<small>${esc(h.card.text(h.line))} · ${Math.max(1,Math.round((h.until-tick)/perMin))} min</small></span></div>`;}
  slot.innerHTML=html;slot.querySelectorAll('.eventOpt').forEach(b=>b.onclick=()=>{dir.choose(Number(b.dataset.i));last='';render();tm.paintHud?.();});};
 setInterval(render,200);render();return dir;}
