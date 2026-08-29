// Toko Live v21: fuzzy, context-aware conversation engine.
// Goal: sustain discussion rather than require exact parser phrases.
import { PROJECT_EVIDENCE } from './evidence.js?v=1';

const PROJECTS={
'TINY HAWK':{
 aliases:['tiny hawk','tinyhawk','tiny h','hawk'],
 identity:['third-person free-roam skating','Skate-style load/flick controls','THPS vocabulary','a fat bird on a skateboard'],
 pillars:['board/body/camera coherence','right-stick control reliability','low chase-camera readability','movement feel before content','sparse Skate Story atmosphere'],
 risks:['camera hiding board response','controls feeling arbitrary','adding tricks before movement is trustworthy','visual detail obscuring the board','turning free-roam skating into a runner'],
 actions:['lock the low chase camera','make right-stick load/flick deterministic','show board response clearly','test movement before expanding tricks','add visual polish only after control feel is stable']},
'EERI':{
 aliases:['eeri','eerin peli','crafted world game'],
 identity:['a young-player-first crafted platformer','80% platforming spine','big machines to ride and small hazards to dodge','a handmade world with generous retries'],
 pillars:['run/jump/climb readability','machine interaction clarity','young-player legibility','craft materials supporting gameplay','short readable levels'],
 risks:['craft detail hiding traversable edges','low-climb glitches','unclear machine affordances','punishing timing','background detail competing with the route'],
 actions:['fix traversal edge cases','make machine interactions obvious','protect platform contrast','add environmental life around readable routes','keep retries generous and immediate']},
'PIRITORI':{
 aliases:['piritori','piritori to eden','eden','kallio game'],
 identity:['Drug Wars economy plus tactical encounters','Kallio as both story and system','East of Eden character mapping','a miniature Helsinki diorama world'],
 pillars:['map/market/encounter loop','Era I completion','Kallio specificity','clean tactical slab readability','consequential information and combat'],
 risks:['generic Helsinki scenery','expanding before the economy loop works','diorama detail collapsing tactical silhouettes','combat becoming detached from the market','too many systems before one complete day works'],
 actions:['complete one buy-travel-encounter-sell-consequence loop','lock Era I before Era II expansion','push real Kallio identity','keep central tactical spaces clean','make information meaningfully avoid or alter conflict']},
'BETTERMENT':{
 aliases:['betterment','kindling','bonfire app'],
 identity:['a self-care loop wrapped in dark fantasy','five daily goals','a bonfire as progress language','a companion without guilt mechanics'],
 pillars:['mobile Today usability','five-goal clarity','warm progress feedback','functional navigation','absence without punishment'],
 risks:['streak anxiety','guilt for missed days','fantasy obscuring usability','companion becoming judgmental','visual atmosphere overpowering the daily task'],
 actions:['finish the Today loop','make five-goal progress instantly readable','tie fire response gently to completion','keep navigation functional','make companion reactions warm but non-punitive']},
'HYPER DAGGER':{
 aliases:['hyper dagger','hyperdagger','dagger','devil daggers clone'],
 identity:['a Devil Daggers look-and-feel target','oppressive threat readability','speed and dread over spectacle','a sparse hostile arena'],
 pillars:['enemy silhouette threat','weapon presence','pressure at speed','background restraint','mouth/skull animation'],
 risks:['decorative environment stealing attention','weak skull menace','weapon disappearing visually','chasing Hyper Demon spectacle','asset quantity replacing second-to-second feel'],
 actions:['strip background noise','strengthen skull silhouette and mouth motion','tune weapon contrast','judge every pass at gameplay speed','add only visuals that increase pressure or readability']},
'SUDS JACK':{
 aliases:['suds jack','sudsjack','suds','tempest game'],
 identity:['a nine-lane vector score attack','Bomb Jack through a Tempest perspective','a dive-focused arcade loop','topography expressed through the lane field'],
 pillars:['lower Tempest-like camera','ramp/topography depth','lane readability','horizon clarity','visible versioned changes'],
 risks:['camera staying too high','topography feeling flat','ramps hurting lane reading','detail masking the dive line','changes being too subtle to verify'],
 actions:['lower the camera unmistakably','shape side ramps with lane depth','test horizon and lanes together','keep the dive line obvious','version every playable visual pass']},
'FLASH PRINCE':{
 aliases:['flash prince','flashprince','flash','prince'],
 identity:['Flashback-style cinematic movement','rotoscope readability','two distinct character animation identities','shooting and shield layered onto authored traversal'],
 pillars:['coherent animation set per character','low-climb reliability','jump/ledge transitions','cinematic silhouette','combat that respects locomotion timing'],
 risks:['hybrid animation sets','low-climb state glitches','generic action-platformer combat','shooting interrupting movement language','detail before traversal is stable'],
 actions:['separate character animation sets fully','fix low-climb and jump transitions','add shooting states carefully','add shield states carefully','polish environments after movement is trustworthy']},
'TOKO DROP':{
 aliases:['toko drop','tokodrop','drop'],
 identity:['a slow readable top-down shooter','dash commitment plus right-stick aim','authored combat rounds','roguelite upgrades between rounds','gelatinous visual identity'],
 pillars:['round/dash/shoot loop','combat hierarchy','readable bullets and enemies','upgrade cadence','juicy but legible gel feedback'],
 risks:['generic twin-stick noise','too many effects hiding danger','upgrades becoming pure stat inflation','movement becoming too fast','content breadth before core feel'],
 actions:['finish the small round loop','make dash commitment readable','establish bullet/enemy/impact hierarchy','make upgrades alter decisions','expand content only after the core is fun']}
};

const GENERAL={
 game:['games are strongest when the verb, feedback and consequence agree','a mechanic earns its place when it changes a decision','feel is not decoration; it is information delivered through timing','scope is a design tool, not just a production constraint','clarity and mystery can coexist if the player understands what they can do'],
 art:['art direction is a filtering system: it decides what not to show','a strong style survives at gameplay scale, not only in a still image','specificity beats generic polish','visual hierarchy matters more than raw detail','the image should support the action unless the image itself is the action'],
 ai:['AI is useful when it increases iteration without erasing authorship','the seam can be visible; pretending the tool is magic makes the work less interesting','authorship means choosing, rejecting and editing, not merely generating','AI should reduce mechanical effort while leaving taste accountable','a tool becomes dangerous creatively when it replaces judgment rather than extending it'],
 industry:['most market talk is downstream of whether people care about the work','trend-chasing works only when the team understands why the trend feels good','marketing cannot permanently repair a weak product promise','the interesting question is not what is popular but what behavior the audience is rewarding','production reality and creative identity have to meet somewhere concrete'],
 nature:['nature is useful because it changes scale, pace and attention','going outside is not a streak or achievement','distance from the screen can reveal which problems were actually important','a walk is sometimes a better design tool than another hour of staring at the same screen','balance is not anti-technology; it keeps technology from becoming the only frame']
};

const INTENTS={
 why:['why','reason','point','purpose','intent','matter'],
 fix:['fix','improve','change','better','solve','repair'],
 next:['next','priority','prioritize','first','roadmap','after'],
 problem:['problem','wrong','weak','issue','bug','bad','critique'],
 explain:['explain','tell','describe','what is','what are','how does','design'],
 compare:['compare','versus','vs','difference','similar','better than'],
 agree:['agree','yes','right','correct'],
 disagree:['disagree','no','wrong','dont','do not','not really','actually'],
 more:['more','go on','continue','else','deeper','further'],
 news:['news','headline','latest','today','industry','current']
};

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
function lev(a,b){a=norm(a);b=norm(b);const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const d=Array(n+1).fill(0).map((_,j)=>j);for(let i=1;i<=m;i++){let prev=d[0];d[0]=i;for(let j=1;j<=n;j++){const old=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return d[n]}
function similar(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a.includes(b)||b.includes(a))return 1;return 1-lev(a,b)/Math.max(a.length,b.length)}
function fuzzyContains(text,phrase,threshold=.72){const t=norm(text),p=norm(phrase);if(t.includes(p))return true;const words=t.split(' '),pw=p.split(' ');if(pw.length===1)return words.some(w=>similar(w,p)>=threshold);for(let i=0;i<=words.length-pw.length;i++)if(similar(words.slice(i,i+pw.length).join(' '),p)>=threshold)return true;return false}
function detectProject(text){let best=null,score=.55;for(const [name,p] of Object.entries(PROJECTS)){for(const a of p.aliases){const s=similar(text,a);if(norm(text).includes(norm(a)))return name;const words=norm(text).split(' ');for(const w of words){const sw=similar(w,a);if(sw>score){score=sw;best=name}}if(s>score){score=s;best=name}}}return best}
function intent(text){let best=null,bestScore=0;for(const [name,phrases] of Object.entries(INTENTS)){let score=0;for(const p of phrases){if(fuzzyContains(text,p,.7))score+=p.includes(' ')?2:1}if(score>bestScore){bestScore=score;best=name}}return best}
function context(){const c=window.TokoLiveContext?.snapshot?.()||{};const recent=[...document.querySelectorAll('.toko-chat .tc-log .tc-you,.toko-chat .tc-log .tc-me')].slice(-14).map(n=>n.textContent||'').join(' ');return {project:(c.project||detectProject(recent)||'').toUpperCase()||null,lastYou:c.lastYou||'',lastToko:c.lastToko||'',recent}}
function pick(a,avoid=''){const xs=a.filter(x=>!avoid||!avoid.includes(x));return xs[Math.floor(Math.random()*(xs.length||a.length))]||a[0]}
function sentence(s){return s?`${s.charAt(0).toUpperCase()}${s.slice(1)}.`:''}
function projectReply(p,intentName,last=''){const x=PROJECTS[p];if(!x)return null;const pillar=pick(x.pillars,last),risk=pick(x.risks,last),action=pick(x.actions,last),identity=pick(x.identity,last);
 switch(intentName){
  case 'why': return `${sentence(identity)} ${sentence(pillar)} That is why ${risk} is the thing I would resist.`;
  case 'fix': return `${sentence(action)} Then ${pick(x.actions.filter(a=>a!==action),last)}. I would measure the change against ${pillar}, not against how much new material was added.`;
  case 'next': return `${sentence(action)} After that: ${pick(x.actions.filter(a=>a!==action),last)}. The gate is ${pillar}.`;
  case 'problem': return `The biggest risk is ${risk}. It weakens ${pillar}. I would answer it by ${action}.`;
  case 'explain': return `${sentence(identity)} The design hangs on ${pillar}, ${pick(x.pillars.filter(v=>v!==pillar),last)}, and ${pick(x.pillars.filter(v=>v!==pillar),last)}.`;
  case 'compare': return `I would compare it through ${pillar}, not feature count. ${sentence(identity)} Its own standard is whether ${action} actually improves the second-to-second experience.`;
  case 'disagree': return `Good. Then I would not defend the wording; I would test the consequence. If ${risk} is not actually hurting the experience, we should drop that concern and look at ${pick(x.risks.filter(v=>v!==risk),last)} instead.`;
  case 'agree': return `Then I would treat ${pillar} as locked direction and move to ${action}. Agreement should narrow the next decision, not end the discussion.`;
  case 'more': return `${sentence(pillar)} A second layer is ${pick(x.pillars.filter(v=>v!==pillar),last)}. The interesting tension is that improving one can worsen ${risk}, so the next pass should test both together.`;
  default:return `${sentence(identity)} Right now I would focus on ${pillar}. The risk is ${risk}; the useful next move is to ${action}.`;
 }
}
function generalTopic(text){for(const k of Object.keys(GENERAL))if(fuzzyContains(text,k,.7))return k;if(/visual|style|image|look|feel|art/.test(norm(text)))return'art';if(/mechanic|player|gameplay|system|level/.test(norm(text)))return'game';if(/ai|model|generate|automation/.test(norm(text)))return'ai';if(/market|studio|industry|sales|publisher/.test(norm(text)))return'industry';if(/outside|forest|nature|walk/.test(norm(text)))return'nature';return null}
function generalReply(topic,intentName,last=''){const bank=GENERAL[topic]||GENERAL.game;const a=pick(bank,last),b=pick(bank.filter(x=>x!==a),last);if(intentName==='why')return `${sentence(a)} ${sentence(b)}`;if(intentName==='problem')return `The failure mode is treating the label as the answer. ${sentence(a)} I would test the idea against an actual player decision or production consequence.`;if(intentName==='fix'||intentName==='next')return `${sentence(a)} So I would make one concrete change, observe what it changes, and only then add another layer.`;if(intentName==='disagree')return `That is useful friction. I would rather revise the position than protect it. ${sentence(b)}`;return `${sentence(a)} ${sentence(b)}`}
function fallback(raw,c){const q=norm(raw);if(q.length<2)return null;const topic=generalTopic(q);if(topic)return generalReply(topic,intent(q),c.lastToko);if(c.project)return projectReply(c.project,intent(q)||'more',c.lastToko);
 if(/who|toko|you/.test(q))return 'Toko Midori. Artist, developer, audience, mask. I care about games as authored work, useful technology, and knowing when to leave the screen.';
 if(/hello|hi|hey|moi|yo/.test(q))return 'I am here. Give me a game, a design problem, a piece of news, or something you think I am wrong about.';
 return `I may not have a named topic for that yet, but I can still pull on it. Tell me whether you want the design reason, the problem, the next action, or the connection to what we were just discussing.`}
function answer(raw){const c=context(),p=detectProject(raw)||c.project,i=intent(raw)||(/\?$/.test(raw.trim())?'explain':'more');if(i==='news')return null;return p?projectReply(p,i,c.lastToko):fallback(raw,c)}
function append(text){const log=document.querySelector('.toko-chat .tc-log');if(!log)return;const d=document.createElement('div');d.className='tc-me';d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight}
function boot(){const input=document.querySelector('.toko-chat .tc-say-row input');if(!input)return requestAnimationFrame(boot);input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const raw=input.value.trim();if(!raw)return;const reply=answer(raw);if(!reply)return;e.preventDefault();e.stopImmediatePropagation();input.value='';append(reply);dispatchEvent(new CustomEvent('toko:deep-answer',{detail:{question:raw,reply}}))},true)}
boot();
window.TokoDeepConversation={answer,detectProject,intent,similar,fuzzyContains,projects:PROJECTS};
