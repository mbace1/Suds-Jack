// Toko Live v21: answer the contextual menu's follow-ups instead of falling through to the old parser.
import { PROJECT_EVIDENCE } from './evidence.js?v=1';
const PROJECTS=['TINY HAWK','EERI','PIRITORI','BETTERMENT','HYPER DAGGER','SUDS JACK','FLASH PRINCE','TOKO DROP'];
const WHY={
'TINY HAWK':'Because the board, body and camera have to communicate one physical action. If the right-stick load/flick is unreliable or the camera hides the board response, extra tricks and scenery only decorate a control problem.',
'EERI':'Because this is for a young player first. Run, jump, climb, stomp and machine interactions need to read before the craft detail does. The handmade world is successful when it makes the route charming without making it harder to understand.',
'PIRITORI':'Because the city is both story and system. Kallio identity has to be specific, but the central slab still needs clean tactical routes, readable encounters and an understandable market loop.',
'BETTERMENT':'Because the fantasy wrapper must support the self-care loop rather than judge it. The fire and companion can make progress feel meaningful, but absence cannot become punishment or streak anxiety.',
'HYPER DAGGER':'Because Devil Daggers works through pressure and legibility. Threat silhouettes, speed, weapon presence and dread matter more than environmental abundance. Every decorative layer has to earn the attention it steals from an enemy.',
'SUDS JACK':'Because perspective is the game board. A lower Tempest-like camera and stronger ramps change how lanes, dives and danger read second to second; surface decoration cannot substitute for that spatial change.',
'FLASH PRINCE':'Because cinematic movement is the identity. Each character needs one coherent animation language, and low climbs, jumps and ledges must transition cleanly before shooting or shield systems can feel authored rather than bolted on.',
'TOKO DROP':'Because the core is readable authored combat rounds. Slow movement, committed dash, aiming and gelatin impact feedback need a clear hierarchy before more enemies or upgrades add useful depth.'};
const FIX={
'TINY HAWK':'First lock the low chase camera. Then make right-stick load/flick deterministic and visibly connect stick motion to board/body response. Only after that add trick breadth and visual polish.',
'EERI':'Fix traversal readability first: clean platform edges, generous low-climb detection and obvious machine affordances. Then add environmental life around those readable routes, never over them.',
'PIRITORI':'Make one complete Era I loop undeniable: map → buy → travel → encounter/information → sell → consequence. Then improve Helsinki specificity and combat presentation around that working spine.',
'BETTERMENT':'Make Today, five goals, fire response and navigation fully functional. Then tune companion reactions so they acknowledge progress warmly without turning missed days into a failure state.',
'HYPER DAGGER':'Strip nonessential background noise, strengthen skull silhouette/mouth motion, then tune weapon and enemy contrast while playing at speed. Judge every pass by threat readability and pressure.',
'SUDS JACK':'Lower the camera enough that the change is unmistakable, shape the side ramps and lane depth together, then test horizon and lane readability before adding more topography.',
'FLASH PRINCE':'Separate the two character animation sets completely. Fix low-climb/jump state transitions next. Then add shooting and shield states using the same timing discipline as locomotion.',
'TOKO DROP':'Make round, aim, shoot and dash feel complete with a small enemy set. Establish bullet/enemy/impact hierarchy, then let upgrades change decisions rather than simply add effects.'};
const NEXT={
'TINY HAWK':'Camera and right-stick control feel. I would not spend the next pass on content.',
'EERI':'Traversal glitches and interaction readability, then environmental life.',
'PIRITORI':'A complete Era I economic/encounter loop before widening the world.',
'BETTERMENT':'The mobile Today loop and five-goal/fire feedback before companion polish.',
'HYPER DAGGER':'Threat readability: skull behavior, weapon presence and background restraint.',
'SUDS JACK':'A visibly lower camera plus ramp/topography pass that changes the spatial read.',
'FLASH PRINCE':'Animation separation and low-climb/jump fixes, then shooting and shield.',
'TOKO DROP':'The round/dash/shoot loop and combat hierarchy before broader roguelite content.'};
function project(){const c=window.TokoLiveContext?.snapshot?.()||{};if(c.project)return c.project.toUpperCase();const t=[...document.querySelectorAll('.tc-log .tc-you,.tc-log .tc-me')].slice(-12).map(n=>n.textContent||'').join(' ').toUpperCase();return PROJECTS.find(p=>t.includes(p))||null}
function append(text){const log=document.querySelector('.toko-chat .tc-log');if(!log)return;const d=document.createElement('div');d.className='tc-me';d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight}
function lastToko(){return window.TokoLiveContext?.snapshot?.().lastToko||''}
function answer(raw){const q=raw.trim().toLowerCase(),p=project();if(!q)return null;
 if(/^go on[.!?]*$/.test(q)){if(p)return `${WHY[p]} ${NEXT[p]}`;const last=lastToko();return last?`The part I would keep pulling on is this: ${last} I would ask what changes in the actual experience if that idea is true.`:null}
 if(/^(why|why do you think that|why does that matter)[.!?]*$/.test(q)){if(p)return WHY[p];const last=lastToko();return last?`Because I am judging the consequence, not the label. ${last} The useful question is what that changes for the player or the work.`:null}
 if(/how would you fix it|how do we fix|what would you change/.test(q)&&p)return FIX[p];
 if(/what (would|should) (you|we) do next|what should we prioritize/.test(q)&&p)return NEXT[p];
 if(/biggest problem/.test(q)&&p){const e=PROJECT_EVIDENCE[p]?.[0];return e?.critique||FIX[p]}
 if(/design intent/.test(q)&&p)return WHY[p];
 if(/what else is connected/.test(q)){if(p)return `${WHY[p]} It connects directly to ${NEXT[p].toLowerCase()}`;return 'Usually I would connect it to three things: what the player actually does, what information the work gives them, and what we are deliberately refusing to add.'}
 return null}
function boot(){const input=document.querySelector('.toko-chat .tc-say-row input');if(!input)return requestAnimationFrame(boot);input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const raw=input.value,reply=answer(raw);if(!reply)return;e.preventDefault();e.stopImmediatePropagation();input.value='';append(reply);dispatchEvent(new CustomEvent('toko:deep-answer',{detail:{question:raw,reply}}))},true)}boot();
window.TokoDeepConversation={answer};
