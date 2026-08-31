// Toko Live v29: first-class Toko Move project brain.
// Facts below are limited to confirmed design direction from the project conversation.
const KEY='tokoLive.tokoMove.v1';
const FACTS={
  identity:[
    'Toko Move is centered on a real Helsinki map rather than an approximate fictional city.',
    'The current design focus is central Helsinki.',
    'Toko treats Toko Move as a high-interest project and will willingly stay on the subject for a long design conversation.'
  ],
  progress:[
    'The project focus was narrowed to the Helsinki map and custom challenges there.',
    'A-to-B challenges were defined as delivery-style routes.',
    'The tram requirement was tightened from a general map treatment to the real-world network: no approximated tram lines.',
    'Each tram line is required on its own layer so individual lines can be shown or hidden independently.'
  ],
  map:[
    'Central Helsinki is the active map focus.',
    'Geographic fidelity matters: the map should support real routes rather than merely look Helsinki-like.',
    'The tram network should be structurally useful to play, not decorative transit wallpaper.'
  ],
  tram:[
    'All Helsinki tram lines should match the real-world lines exactly; approximations are specifically rejected.',
    'Every tram line should live on its own independent layer.',
    'Individual tram layers need to be toggleable so challenges or views can reveal one line at a time.'
  ],
  challenges:[
    'The defined challenge format is travel from A to B in a delivery-style task.',
    'A challenge should make the city route itself the interesting decision rather than turning into a detached minigame.',
    'Because the map is real, challenge design can exploit route knowledge, transfers and street structure without inventing geography.'
  ],
  risks:[
    'The largest design risk is fake fidelity: a map that looks recognizably Helsinki but behaves unlike Helsinki.',
    'A second risk is putting accurate tram data on screen without making it matter to a challenge.',
    'Too many simultaneous transit layers could destroy route readability, which is why independent visibility is important.'
  ]
};
const PROPOSALS={
  map:[
    'I would prototype one dense central-Helsinki slice first and judge whether a player can navigate it from landmarks and transit structure before expanding coverage.',
    'I would separate geographic truth from visual simplification: simplify rendering aggressively, but do not move the actual route geometry to make the composition prettier.'
  ],
  tram:[
    'Example design test: activate one tram layer, choose an A-to-B delivery whose best route intersects it, and see whether the line changes the player’s plan without extra explanation.',
    'I would treat each tram line as both data and a visual layer. That makes challenge scripting, debugging and player-facing filtering use the same source of truth.'
  ],
  challenges:[
    'Example challenge conversation: “What makes this delivery interesting?” — “The destination is not enough. Give the route a constraint that makes Helsinki geography matter, then remove any UI that solves the route automatically.”',
    'Example progression idea to test, not a settled feature: begin with obvious A-to-B deliveries, then layer route constraints only after players prove they can read the city itself.'
  ],
  visual:[
    'For visuals, I would let the real map geometry carry authority and use restrained highlighting for the active route, destination and relevant tram layer.',
    'A useful visual test is whether a screenshot still reads as Helsinki when challenge UI is hidden. If not, the map identity is relying too much on labels.'
  ]
};
function state(){try{return JSON.parse(localStorage.getItem(KEY)||'{"active":false,"used":[]}')}catch{return{active:false,used:[]}}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function isMove(q){const s=norm(q);return /\btoko\s*move\b|\btokomove\b/.test(s)||['toko moev','toko mov','toko mvoe','toko moe'].some(x=>s.includes(x))}
function otherProject(q){return /tiny hawk|piritori|betterment|hyper dagger|suds jack|flash prince|toko drop|\beeri\b/i.test(q)}
function active(q=''){const s=state();if(isMove(q)){s.active=true;save(s);return true}if(otherProject(q)){s.active=false;save(s);return false}return !!s.active}
function topic(q){const s=norm(q);if(/tram|line|transit|rail/.test(s))return'tram';if(/map|helsinki|street|geograph|central/.test(s))return'map';if(/challenge|delivery|route|a to b|mission/.test(s))return'challenges';if(/visual|look|art|screen|readab/.test(s))return'visual';if(/risk|problem|wrong|weak|issue/.test(s))return'risks';if(/progress|status|done|current|where are we/.test(s))return'progress';return null}
function pick(bank,idPrefix){if(!bank?.length)return null;const s=state();let choices=bank.map((text,i)=>({id:`${idPrefix}:${i}`,text})).filter(x=>!s.used.includes(x.id));if(!choices.length){s.used=s.used.filter(id=>!id.startsWith(`${idPrefix}:`));choices=bank.map((text,i)=>({id:`${idPrefix}:${i}`,text}))}const x=choices[Math.floor(Math.random()*choices.length)];s.used.push(x.id);s.used=s.used.slice(-30);save(s);return x.text}
function statusReply(){return `The confirmed design progress I have is: ${FACTS.progress.join(' ')} I do not have verified build-state evidence beyond those decisions, so I will not pretend a feature is implemented just because it was discussed.`}
function exampleReply(t){const bank=PROPOSALS[t]||[...PROPOSALS.map,...PROPOSALS.tram,...PROPOSALS.challenges,...PROPOSALS.visual];return pick(bank,`proposal:${t||'general'}`)}
function answer(q){if(!active(q))return null;const s=norm(q),t=topic(q);if(/progress|status|where are we|what is done|current state/.test(s))return statusReply();if(/example|design conversation|talk through|scenario|show me/.test(s))return exampleReply(t);if(/why|matter|important/.test(s)&&t==='tram')return 'Because exact tram geometry gives Toko Move something generic city games cannot fake: route decisions that correspond to a place the player can actually know. Separate line layers then let us turn that truth into readable challenge-specific information.';if(/why|matter|important/.test(s)&&t==='map')return 'Because the real-city premise only earns its keep when geography changes play. If we move streets and transit to suit level design, we have made a Helsinki skin. I am much more interested in the harder version: make the real structure produce the challenge.';if(/next|priority|first|what should we do/.test(s))return 'My priority is one brutally accurate central-Helsinki playable slice: real street geometry, exact tram lines on separate layers, then several A-to-B delivery challenges that prove those systems affect route choice. I would not widen the map until that loop is convincing.';if(/opinion|think|interested|favorite|care/.test(s))return 'I am unusually interested in Toko Move because the design constraint is productive: Helsinki is not reference dressing, it is the system. Exact transit and real routes can make the city itself the puzzle. I want us to protect that idea from approximation.';if(/visual|look|art|screen/.test(s))return `${pick(PROPOSALS.visual,'proposal:visual')} I have not found a verified Toko Move screenshot or image asset in the connected Suds-Jack repository, so I am not substituting invented art for the game.`;if(t&&FACTS[t]){const a=pick(FACTS[t],`fact:${t}`),b=PROPOSALS[t]?pick(PROPOSALS[t],`proposal:${t}`):null;return b?`${a} ${b}`:a}if(/what is toko move|tell me about|explain/.test(s))return `${FACTS.identity[0]} ${FACTS.identity[1]} The current concrete challenge direction is A-to-B delivery, with exact real-world tram lines kept as individually toggleable layers.`;return `${pick(FACTS.challenges,'fact:challenges')} ${pick(PROPOSALS.challenges,'proposal:challenges')}`}
function append(who,text){const log=document.querySelector('.toko-chat .tc-log');if(!log)return false;const d=document.createElement('div');d.className=who==='you'?'tc-you':'tc-me';d.textContent=text;log.appendChild(d);return true}
addEventListener('keydown',e=>{if(e.key!=='Enter')return;const input=e.target;if(!(input instanceof HTMLInputElement)||!input.closest('.toko-chat'))return;const q=input.value.trim();if(!q)return;const r=answer(q);if(!r)return;e.preventDefault();e.stopImmediatePropagation();append('you',q);input.value='';setTimeout(()=>{append('toko',r);dispatchEvent(new CustomEvent('toko:deep-answer',{detail:{text:r,project:'Toko Move'}}));dispatchEvent(new CustomEvent('toko:context',{detail:{project:'Toko Move'}}))},80)},true);
window.TokoMove={answer,facts:FACTS,proposals:PROPOSALS,isActive:()=>state().active,setActive(v=true){const s=state();s.active=!!v;save(s)}};
