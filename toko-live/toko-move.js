// Toko Live v30: first-class Toko Move project brain grounded in current project state + design notebook.
const KEY='tokoLive.tokoMove.v2';
const FACTS={
  identity:[
    'Toko Move is a courier game on Helsinki’s existing moving transit network. The board is fixed; opportunity moves.',
    'The core decision is wait, catch, ride, transfer, get off, or walk — not drawing transit lines.',
    'Real Helsinki and exact HSL geometry are part of the game system, not background dressing.'
  ],
  progress:[
    'The current v2.12 branch has exact HSL tram and metro source layers, deterministic gameplay vehicles on that geometry, transfer hubs, a simplified walking graph, manual catches, manual transfers and physical arrival gating.',
    'The caught visible vehicle is stored as the ride identity and highlighted while aboard.',
    'Walking consumes game time and can be used to reposition toward downstream catches.',
    'The active development pass is tuning interception as a readable skill before expanding job complexity.'
  ],
  tram:[
    'Exact HSL tram and metro geometry stays authoritative; authored approximation must never masquerade as real HSL data.',
    'Every gameplay vehicle should matter as a moving opportunity, not decorative traffic.',
    'The game should expose which vehicles are catchable without telling the player which one is optimal.'
  ],
  interception:[
    'Interception is becoming the signature skill: walk to a downstream stop, predict a vehicle, and arrive with a small catch window.',
    'The most interesting target is usually a visible two-to-eight-tick margin rather than a huge safe wait.',
    'A missed vehicle should create a new tactical problem, not a restart.'
  ],
  jobs:[
    'The strongest next depth test is two simultaneous jobs. That creates route chaining without adding another abstract system.',
    'Cargo should change how the same city is read: urgent, fragile, heavy, hot or flexible rather than a wall of modifiers.',
    'Late delivery should usually fail softly through lower quality or pay so improvisation remains viable.'
  ],
  visual:[
    'The visual target is between a beautiful transit diagram and a living miniature Helsinki, not Google Maps.',
    'Vehicles and the player need highest contrast; active destinations and useful hubs come next; transit lines remain legible but quieter; streets and city texture sit underneath.',
    'Helsinki identity should survive even when challenge UI is hidden.'
  ],
  session:[
    'Progression should unlock work complexity, information and job capacity rather than fictional transit speed.',
    'The city should stay honest while the courier becomes better at reading it.',
    'A strong short-session structure is a shift made of recoverable routing decisions rather than a chain of perfect-route puzzles.'
  ],
  risks:[
    'The biggest risk is turning the real network into a solved route recommendation instead of a moving tactical board.',
    'Walking cannot become a universal escape button or transit becomes decoration.',
    'Exact network data can still become unreadable if too many layers compete visually at once.'
  ]
};
const PROPOSALS={
  interception:[
    'I would tune walking so good interceptions regularly leave a visible 2–8 tick catch margin. Wider windows teach the mechanic; tighter windows become mastery.',
    'I would award explicit moments such as TIGHT CONNECTION, INTERCEPTED and LATE RECOVERY rather than hide creativity inside an opaque score.'
  ],
  jobs:[
    'Prototype exactly two active jobs before adding more systems. The useful question is whether one tram can advance both jobs, or whether finishing one now is worth abandoning the shared route.',
    'Keep each job legible in one glance: one dominant constraint, one destination, one pressure. Depth should come from interaction with Helsinki rather than rule text.'
  ],
  visual:[
    'Use contextual emphasis instead of recommendation arrows. Several catchable vehicles can brighten at once; the player still owns the decision.',
    'Use three information scales — city, route and stop — so the same map can answer both “where am I going?” and “can I catch that?” without separate screens.'
  ],
  session:[
    'I would keep the whole city visible and unlock contracts rather than geography. Familiar streets should become deeper through new job combinations, weather, time and transfer pressure.',
    'The run should preserve mistakes. A missed tram should expose the next best recovery rather than erase the previous minute.'
  ]
};
function state(){try{return JSON.parse(localStorage.getItem(KEY)||'{"active":false,"used":[]}')}catch{return{active:false,used:[]}}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function isMove(q){const s=norm(q);return /\btoko\s*move\b|\btokomove\b/.test(s)||['toko moev','toko mov','toko mvoe','toko moe'].some(x=>s.includes(x))}
function otherProject(q){return /tiny hawk|piritori|betterment|hyper dagger|suds jack|flash prince|toko drop|\beeri\b/i.test(q)}
function active(q=''){const s=state();if(isMove(q)){s.active=true;save(s);return true}if(otherProject(q)){s.active=false;save(s);return false}return !!s.active}
function topic(q){const s=norm(q);if(/intercept|catch|walk|timing|miss|window/.test(s))return'interception';if(/job|delivery|cargo|client|econom|pay|reputation/.test(s))return'jobs';if(/tram|line|transit|rail|vehicle/.test(s))return'tram';if(/visual|look|art|screen|readab|camera|ui/.test(s))return'visual';if(/session|shift|progress|campaign|difficulty|unlock/.test(s))return'session';if(/risk|problem|wrong|weak|issue/.test(s))return'risks';if(/status|done|current|where are we|progress/.test(s))return'progress';return null}
function pick(bank,idPrefix){if(!bank?.length)return null;const s=state();let choices=bank.map((text,i)=>({id:`${idPrefix}:${i}`,text})).filter(x=>!s.used.includes(x.id));if(!choices.length){s.used=s.used.filter(id=>!id.startsWith(`${idPrefix}:`));choices=bank.map((text,i)=>({id:`${idPrefix}:${i}`,text}))}const x=choices[Math.floor(Math.random()*choices.length)];s.used.push(x.id);s.used=s.used.slice(-48);save(s);return x.text}
function statusReply(){return `${FACTS.progress.join(' ')} The design notebook currently points next toward interception tuning and two-job routing; I treat those as development direction until the build proves them.`}
function answer(q){if(!active(q))return null;const s=norm(q),t=topic(q);if(/status|where are we|what is done|current state|progress/.test(s))return statusReply();if(/why/.test(s)&&t==='interception')return 'Because interception converts walking from fallback travel into a prediction skill. The player reads a moving vehicle, judges whether walking buys a better catch, and owns the result.';if(/why/.test(s)&&t==='tram')return 'Because the fixed real network is the constraint that gives the game identity. If the routes move to suit the level, Helsinki stops being the system and becomes a skin.';if(/next|priority|first|what should we do/.test(s))return 'First tune interception until catching downstream vehicles is readable and satisfying. Then add two simultaneous jobs and test whether they create route chaining without UI overload. Only after those two work would I add more economy or progression.';if(/opinion|think|favorite|care/.test(s))return 'My strongest position is that Toko Move should feel like real-time tactics on a moving Helsinki board. Interception is the skill, multiple jobs create the strategy, and the real network keeps both honest.';if(t&&FACTS[t]){const a=pick(FACTS[t],`fact:${t}`),b=PROPOSALS[t]?pick(PROPOSALS[t],`proposal:${t}`):null;return b?`${a} ${b}`:a}if(/what is toko move|tell me about|explain/.test(s))return `${FACTS.identity.join(' ')} ${FACTS.interception[0]}`;return `${pick(FACTS.identity,'fact:identity')} ${pick(PROPOSALS.interception,'proposal:interception')}`}
function append(who,text){const log=document.querySelector('.toko-chat .tc-log');if(!log)return false;const d=document.createElement('div');d.className=who==='you'?'tc-you':'tc-me';d.textContent=text;log.appendChild(d);return true}
addEventListener('keydown',e=>{if(e.key!=='Enter')return;const input=e.target;if(!(input instanceof HTMLInputElement)||!input.closest('.toko-chat'))return;const q=input.value.trim();if(!q)return;const r=answer(q);if(!r)return;e.preventDefault();e.stopImmediatePropagation();append('you',q);input.value='';setTimeout(()=>{append('toko',r);dispatchEvent(new CustomEvent('toko:deep-answer',{detail:{text:r,project:'Toko Move'}}));dispatchEvent(new CustomEvent('toko:context',{detail:{project:'Toko Move'}}))},80)},true);
window.TokoMove={answer,facts:FACTS,proposals:PROPOSALS,isActive:()=>state().active,setActive(v=true){const s=state();s.active=!!v;save(s)}};
