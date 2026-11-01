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
import {drawMasterBadge} from '../../toko/js/master.js';
import {pickWeighted} from './mutators.js?v=2';
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

// Costs are in TICKS (ten a second at ×1). 100 ticks is the owner's ten seconds.
export const ENCOUNTERS=[
 {id:'granny',mood:'opportunity',where:'stop',glyph:'👵',text:'An old lady wants to cross Mannerheimintie. The lights are short.',
  options:[{label:'Walk her across',cost:100,goodwill:2,score:20},{label:'Walk on',cost:0}]},
 {id:'tourist',mood:'opportunity',where:'stop',glyph:'🧳',text:'A tourist with a paper map is looking for the cathedral. They have the whole city on it.',
  options:[{label:'Trade directions',cost:40,goodwill:1,score:15,teaches:true},{label:'Shrug',cost:0}]},
 {id:'inspector',mood:'notice',where:'aboard',glyph:'🎫',text:'Ticket inspection. Everyone is looking for their phone.',
  options:[{label:'Papers, please — waved through',cost:0,needs:'documents',score:10},{label:'Show your ticket',cost:30},{label:'Look busy',cost:0}]},
 {id:'wallet',mood:'warning',where:'stop',glyph:'👛',text:'A wallet on the bench. Nobody around.',
  options:[{label:'Hand it in at the kiosk',cost:60,goodwill:2,score:30},{label:'Pocket it',cost:0,goodwill:-3,score:45},{label:'Leave it',cost:0}]},
 {id:'busker',mood:'info',where:'stop',glyph:'🎸',text:'A busker starts the one song you actually like.',
  options:[{label:'Stay for the chorus',cost:30,goodwill:1,score:10},{label:'Walk on',cost:0}]},
 {id:'stroller',mood:'opportunity',where:'aboard',glyph:'👶',text:'A stroller and three bags at the tram steps.',
  options:[{label:'Lift it aboard',cost:20,goodwill:1,score:10},{label:'Look at your phone',cost:0}]},
 {id:'friend',mood:'info',where:'aboard',glyph:'🧑',text:'Someone from school gets on. It has been years.',
  options:[{label:'Catch up',cost:0,goodwill:1,score:5,note:'you nearly miss your stop'},{label:'Nod and look away',cost:0}]},
 // Walking-focused (content phase, 2026-10-31). Use the street network as a verb.
 {id:'shortcut',mood:'opportunity',where:'walking',glyph:'👣',text:'A local points at a side street. It is shorter if you know it.',
  options:[{label:'Take the tip',cost:20,goodwill:1,score:15,teaches:true},{label:'Stay on the main street',cost:0}]},
 {id:'handoff-walk',mood:'opportunity',where:'walking',glyph:'📦',text:'Someone is walking the other way with a small package. They will trade stops.',
  options:[{label:'Swap packages',cost:40,goodwill:1,score:20},{label:'Keep walking',cost:0}]},
 // Cargo choice. Fragile pays for care; ignoring it is free but costs goodwill.
 {id:'fragile-care',mood:'warning',where:'stop',glyph:'💌',text:'The fragile parcel is shifting. You can pad it or leave it.',
  options:[{label:'Pad it properly',cost:50,needs:'fragile',goodwill:1,score:25},{label:'Leave it',cost:0}]},
];
// A held line: every vehicle on it stands where it is for `minutes`.
export const DISRUPTIONS=[
 {id:'stuck-car',mood:'warning',glyph:'🚗',text:l=>`A car is parked on the rails — ${l} is held for a few minutes.`,minutes:4},
 {id:'switch',mood:'warning',glyph:'⚡',text:l=>`Points failure — ${l} is standing at the next stop.`,minutes:6},
 {id:'medical',mood:'warning',glyph:'🚑',text:l=>`A passenger is unwell — ${l} waits for the ambulance.`,minutes:5},
];
// THE FACE'S MOODS (art bible §4): a Toko face, white, on a mood disc, posed
// only the way the traced master can be — eyes squash about their foot, the
// smile grins about its top. One accent per card. Never magenta.
export const MOODS={
 info:{disc:'#33b2d2',squash:1,grin:1},          // Toko cyan: facts, a familiar face
 opportunity:{disc:'#ffcc00',squash:1,grin:1.06},// yellow: favours, shortcuts, a trade
 warning:{disc:'#e2683c',squash:.62,grin:.86},   // coral: risk, a held line
 notice:{disc:'#176b73',squash:.85,grin:.94},    // deep teal: inspectors, service notices
};
export const BUDGET={encounters:3,disruptions:1,maxCostTicks:280};
// A Disruption run's held family (MUTATORS.md §2): not a car on the rails for a
// few minutes but the run's whole problem — it holds until two jobs are done or
// its time is up, whichever comes first.
export const HALTED={id:'halted',mood:'warning',glyph:'⛔',text:l=>`${l} is halted — the network routes around it.`,minutes:30};

// The shift's schedule, from its seed alone.
// `encounters` overrides the budget for a day that is about people being out
// (HELSINKI DAY). Everything else about the draw is unchanged, so the same seed
// on an ordinary day still deals the same three cards it always did.
// v2.70: `moods` weights the deal by card mood (a mutator's bias, mutators.js)
// and `halt` replaces the shift's chance disruption with a Disruption run's own
// held family. With neither, the draw is the one it always was, card for card.
// v2.73: `places` keeps the deck to cards that happen where the run's player
// will be — EASY's one card is never a walking card, or someone who only
// catches trams would meet none. Unset, the deck is every card, as it was.
export function drawSchedule(seed,ticksPerDay=3000,lines=[],encounters=null,moods=null,halt=null,places=null){const h=hash(`events:${seed}`),out=[];
 const deck=places?ENCOUNTERS.filter(c=>places.includes(c.where)):ENCOUNTERS;
 const n=Math.min(encounters||BUDGET.encounters,deck.length),used=new Set;
 for(let i=0;i<n;i++){const k=(h>>>(i*4))&0xffff;let card=pickWeighted(deck,k,moods);let guard=0;while(used.has(card.id)&&guard++<deck.length)card=deck[(k+guard)%deck.length];used.add(card.id);
  const at=Math.round(ticksPerDay*(0.12+0.24*i)+(k%400));out.push({kind:'encounter',card,at,job:i+1});}
 if(halt){out.push({kind:'disruption',card:{...HALTED,minutes:halt.minutes},line:halt.line,lines:halt.lines,at:halt.atTick,recoverJobs:halt.recoverJobs});}
 else if(BUDGET.disruptions&&lines.length){const k=(h>>>13)&0xffff,d=DISRUPTIONS[k%DISRUPTIONS.length],line=lines[(k>>3)%lines.length];out.push({kind:'disruption',card:d,line,at:Math.round(ticksPerDay*0.3+(k%(ticksPerDay*0.35)))});}
 return out.sort((a,b)=>a.at-b.at);}

export class EventDirector{
 constructor(tm,seed=7,opts={}){this.tm=tm;this.seed=seed;this.goodwillFactor=opts.goodwill||1;const lines=(tm.transit?.layers||[]).filter(l=>l.visible).map(l=>l.name);this.queue=drawSchedule(seed,tm.flow.clock.ticksPerDay,lines,opts.encounters||null,opts.moods||null,opts.halt||null,opts.places||null);if(opts.disruptions===0)this.queue=this.queue.filter(e=>e.kind!=='disruption');   // a run with no held lines (EASY)
  this.pending=null;this.seen=[];this.busyUntil=0;this.holds=[];}
 // Called every tick after mobility. A card fires at the first moment after its
 // scheduled tick that the courier is where the card says.
 step(){const tm=this.tm,ch=tm.challenge,tick=tm.flow.clock.tick;
  // a held family that two jobs lift (a Disruption run): the hole closes when
  // the courier has worked round it twice, not only when its time is up
  let lifted=false;for(const h of this.holds)if(h.recoverJobs&&tick<h.until&&(ch?.index||0)>=h.startIndex+h.recoverJobs){this.lift(h,tick);lifted=true;}
  // a held line keeps its own time: it is not a card waiting for the courier to
  // be somewhere, so nothing waiting holds it back, and it may start while a
  // card is open (the hold is drawn under it)
  {const hi=this.queue.findIndex(e=>e.kind==='disruption'&&tick>=e.at);if(hi>=0){const [ev]=this.queue.splice(hi,1);this.startHold(ev);return true;}}
  if(this.pending||!ch?.active)return lifted;const st=tm.mobility?.status?.();const here=st?.kind==='waiting'?'stop':st?.kind==='riding'?'aboard':st?.kind==='walking'?'walking':null;
  // v2.72: the first DUE card whose place this is — not the head of the queue.
  // A card waiting for the courier to be somewhere used to hold every card
  // behind it, so a player who never walked never met a card at all: shift 1
  // deals a "walking" card first, and a stranger who only catches trams saw
  // none of the four (test/stranger.cjs now asserts a card is met).
  // A card is due at its time OR once the shift has reached its job (the n-th
  // card by the n-th delivery), whichever is first: the times assume all
  // seventy-five minutes, and a quick courier who finished three jobs by
  // half-time used to leave two of the three cards undealt. Job one is never
  // interrupted early — the first card waits for its time or the first drop.
  const i=this.queue.findIndex(e=>e.kind==='encounter'&&(tick>=e.at||(e.job!=null&&(ch.index||0)>=e.job))&&here&&(e.card.where==='any'||here===e.card.where));if(i<0)return lifted;   // 'any': a card with no place (the sealed parcel's label)
  const [next]=this.queue.splice(i,1);this.pending={...next,since:tick};ch.say?.(`${next.card.glyph} ${next.card.text}`);return true;}
 startHold(ev){if(this.tm.live)return;/* LIVE: the real city brings its own disruptions */const net=this.tm.liveNetwork,names=ev.lines||[ev.line],layers=(net?.transit?.layers||[]).filter(l=>names.includes(l.name));if(!net||!layers.length)return;const perMin=this.tm.flow.clock.ticksPerDay/((this.tm.shift?.hours||1.25)*60),from=this.tm.flow.clock.tick,until=from+Math.round(ev.card.minutes*perMin);for(const layer of layers)net.hold?.(layer,from,until);this.holds.push({...ev,from,until,startIndex:this.tm.challenge?.index||0});this.tm.challenge?.say?.(`${ev.card.glyph} ${ev.card.text(ev.line)}`);}
 lift(h,tick){const net=this.tm.liveNetwork,ids=new Set((net?.transit?.layers||[]).filter(l=>(h.lines||[h.line]).includes(l.name)).map(l=>l.id));for(const x of net?.holds||[])if(ids.has(x.layerId)&&x.from===h.from&&x.until===h.until)x.until=tick;h.until=tick;h.lifted=true;this.tm.challenge?.say?.(`${h.line} is running again.`);}
 // Is this layer standing still right now? (the board's grey dash and its trams)
 heldLayer(l){return this.activeHolds().some(h=>(h.lines||[h.line]).includes(l?.name));}
 // What is held right now, for the banner.
 activeHolds(){const t=this.tm.flow.clock.tick;return this.holds.filter(h=>t>=h.from&&t<h.until);}
 options(){const p=this.pending;if(!p)return[];const cargo=this.tm.challenge?.active?.cargo;return p.card.options.filter(o=>!o.needs||o.needs===cargo);}
 choose(i){const p=this.pending;if(!p)return{error:'nothing to answer'};const opts=this.options(),o=opts[i];if(!o)return{error:'no such option'};const ch=this.tm.challenge,tick=this.tm.flow.clock.tick;
  if(o.cost)this.busyUntil=tick+o.cost;ch.goodwill=(ch.goodwill||0)+(o.goodwill||0)*this.goodwillFactor;if(o.score){ch.score+=o.score;}
  if(o.teaches)this.tm.teachStreet?.(this.seed+tick);
  if(o.reveal)ch.revealSealed?.();   // the sealed parcel's kiosk (sealed.js)
  this.seen.push({id:p.card.id,option:o.label,cost:o.cost||0,tick});this.pending=null;
  ch.say?.(`${o.label}${o.cost?` · ${Math.round(o.cost/10)} s`:''}${o.score?` · +${o.score}`:''}`);return{ok:true,cost:o.cost||0};}
 busy(){return this.tm.flow.clock.tick<this.busyUntil;}
}

// THE CARD (art bible §4): a Toko face, one line, two big buttons priced in
// seconds — the first filled navy, the rest ghost. A held line is the same card
// with a coral face and no buttons, and clears when the hold lifts. Same slot
// discipline as every other panel: it writes only into `eventCard`, first on
// the sheet. The face is the traced master (toko/js/master.js), never a glyph;
// the glyph stays on the card for the feed line.
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
const faceCache={};
// A mood's face as an image URL, drawn once per mood: the disc, the white face
// placed like drawMasterBadge, and a white ring for the light panel.
export function moodFace(mood,px=88){const m=MOODS[mood]||MOODS.info,key=`${mood}:${px}`;if(faceCache[key]!==undefined)return faceCache[key];
 let url='';try{const c=typeof document!=='undefined'?document.createElement('canvas'):null,ctx=c?.getContext?.('2d');
  if(ctx){c.width=c.height=px;const r=px/2,ring=Math.max(2,px*.045);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(r,r,r,0,Math.PI*2);ctx.fill();
   drawMasterBadge(ctx,r,r,r-ring,{ground:m.disc,ink:'#ffffff',squash:m.squash,grin:m.grin});url=c.toDataURL('image/png');}}catch(e){url='';}
 return faceCache[key]=url;}
const face=(mood,cls='')=>{const url=moodFace(mood),disc=(MOODS[mood]||MOODS.info).disc;return url?`<img class="evFace ${cls}" src="${url}" alt="" width="44" height="44">`:`<i class="evFace ${cls}" style="background:${disc}"></i>`;};
// Two pills share a row only while their words fit one or two lines at phone
// width; past this the options stack full width (playtest, v2.68: "Papers,
// please — waved through" wrapped to four lines in a half-width pill).
const STACK_AT=18;
// Every button reads as a time cost, "+N s", the free way past included.
export const priceSeconds=o=>`+${Math.round((o?.cost||0)/10)} s`;
export function mountEvents(tm,seed=7,opts={}){const dir=new EventDirector(tm,seed,opts);tm.events=dir;
 const ch=tm.challenge;const prev=ch.step;ch.step=()=>{const a=prev?prev():false;const b=dir.step();return a||b;};
 let last='';const render=()=>{const slot=tm.sheetSlot?.('eventCard');if(!slot)return;const p=dir.pending,holds=dir.activeHolds(),tick=tm.flow.clock.tick,busy=dir.busy();
  const key=`${p?.card.id||''}:${holds.map(h=>h.line+h.until).join(',')}:${busy?Math.floor((dir.busyUntil-tick)/10):''}`;if(key===last)return;last=key;
  let html='';
  if(p){const opts=dir.options(),mood=p.card.mood||'info';html+=`<section class="eventCard mood-${esc(mood)}"><div class="evHead">${face(mood)}<b class="evLine">${esc(p.card.text)}</b></div><div class="evOpts${opts.some(o=>String(o.label).length>STACK_AT)?' evStack':''}">${opts.map((o,i)=>{const extra=[o.note,o.score?`+${o.score}`:''].filter(Boolean).join(' · ');return `<button class="evBtn ${i===0?'evPrimary':'evGhost'} eventOpt" data-i="${i}"${extra?` title="${esc(extra)}"`:''}><span class="evLb">${esc(o.label)}</span><span class="evCost">${priceSeconds(o)}</span></button>`;}).join('')}</div></section>`;}
  else if(busy){html+=`<div class="row dim"><span class="to">Helping…<small>${Math.max(1,Math.ceil((dir.busyUntil-tick)/10))} s</small></span></div>`;}
  for(const h of holds){const perMin=tm.flow.clock.ticksPerDay/((tm.shift?.hours||1.25)*60),mood=h.card.mood||'warning';html+=`<section class="eventCard evHold mood-${esc(mood)}" title="${esc(h.card.text(h.line))}"><div class="evHead">${face(mood)}<b class="evLine"><span class="lb" style="background:${esc(tm.transit?.layers?.find(l=>l.name===(h.lines?.[0]||h.line))?.colour||'#52676d')}">${esc(h.line)}</span> is held · ${Math.max(1,Math.round((h.until-tick)/perMin))} min</b></div></section>`;}
  slot.innerHTML=html;slot.querySelectorAll('.eventOpt').forEach(b=>b.onclick=()=>{dir.choose(Number(b.dataset.i));last='';render();tm.paintHud?.();});};
 setInterval(render,200);render();return dir;}
