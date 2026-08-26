// TOKO MIDORI GAMES — conversation shaping v3.
// Additive: chat.js remains the authored tree, mind.js the durable store.
// This layer makes typed conversation continue across turns and makes the
// short suggestion rack respond to the conversation that is actually happening.

const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const hash = s => [...String(s)].reduce((n,c) => ((n * 31) + c.charCodeAt(0)) >>> 0, 2166136261);
const pick = (a, seed) => a[Math.abs(seed) % a.length];
const SESSION = { lastRaw:'', lastSubject:'', lastAnswer:[], turns:0 };

const STARTERS = [
  ['WHAT GAME CHANGED EVERYTHING?', ['game','history'], 'what game changed everything?'],
  ['ARE GAMES REALLY ART?', ['art','philosophy'], 'are games really art?'],
  ['WHAT IS WRONG WITH THE INDUSTRY?', ['industry'], 'what is wrong with the game industry?'],
  ['WHAT SHOULD I PLAY?', ['game'], 'what should i play?'],
  ['WHAT DO YOU REMEMBER ABOUT ME?', ['memory'], 'memory'],
  ['WHAT HAVE YOU BEEN READING?', ['news'], 'news'],
  ['WHY DO WE KEEP REPLAYING?', ['game','philosophy'], 'why do we replay games?'],
  ['WHAT MAKES FAILURE INTERESTING?', ['game','philosophy'], 'what makes failure interesting in games?'],
  ['WHAT SHOULD A GAME NEVER DO?', ['game','design'], 'what should a game never do?'],
  ['WHY DO YOU WANT ME TO GO OUTSIDE?', ['nature'], 'why do you want me to go outside?'],
  ['WHAT DO YOU THINK OF AI?', ['industry','ai'], 'what do you think of ai?'],
  ['WHAT IS A TOKO GAME?', ['toko','game'], 'what makes a toko game?'],
  ['WHAT ARE YOU AFRAID GAMES BECOME?', ['industry','philosophy'], 'what are you afraid games become?'],
  ['TELL ME SOMETHING STRANGE.', ['secret'], 'tell me something strange'],
  ['GIVE ME ONE REASON TO STOP PLAYING.', ['nature','philosophy'], 'give me one reason to stop playing'],
  ['WHO IS THE PLAYER IN ALL THIS?', ['philosophy','toko'], 'who is the player in all this?'],
  ['WHAT DOES TOKO THINK IS BEAUTIFUL?', ['art','philosophy'], 'what do you think is beautiful?'],
];

function mind() { return globalThis.TokoMind || {}; }
function profile() { try { return mind().profile?.() || {}; } catch { return {}; } }
function currentNews() { try { return mind().news?.({ limit:5 }) || []; } catch { return []; } }
function remember(kind, text, extra={}) { try { mind().remember?.(kind, text, extra); } catch {} }
function disagree(subject, text) { try { mind().disagree?.(subject, text); } catch {} }

function subjectOf(q) {
  if (/\b(ai|generative|machine)\b/.test(q)) return 'ai';
  if (/industry|publisher|studio|moneti|live service|battle pass/.test(q)) return 'industry';
  if (/nature|outside|forest|walk|weather/.test(q)) return 'nature';
  if (/art|beautiful|beauty/.test(q)) return 'art';
  if (/failure|lose|losing|death|die|difficulty/.test(q)) return 'failure';
  if (/player|audience|developer|toko/.test(q)) return 'toko';
  if (/game|play|replay|design|mechanic|level/.test(q)) return 'game';
  if (/life|meaning|purpose|happy/.test(q)) return 'life';
  return SESSION.lastSubject || '';
}

function tagsNow() {
  const out = new Set(); const p = profile(); const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) out.add('nature');
  if (currentNews().length) out.add('news');
  if ((p.memories || []).length > 5) out.add('memory');
  if (SESSION.lastSubject) out.add(SESSION.lastSubject);
  if (SESSION.turns > 2) out.add('philosophy');
  const interests = Object.entries(p.interests || {}).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>k);
  for (const i of interests) {
    if (/game|doom|rogue|returnal|zelda|mario|elden|dark/.test(i)) out.add('game');
    if (/art|film|music|design/.test(i)) out.add('art');
    if (/industry|studio|publisher|business|commercial|live/.test(i)) out.add('industry');
    if (/nature|outside|forest|walk/.test(i)) out.add('nature');
    if (/toko|developer|player|audience/.test(i)) out.add('toko');
  }
  return out;
}

function chooseStarters(n=4) {
  const tags=tagsNow(), day=Math.floor(Date.now()/864e5);
  const ranked=STARTERS.map(([q,ts,ask],i)=>({q,ts,ask,score:ts.reduce((s,t)=>s+(tags.has(t)?8:0),0)+(hash(q+day)%7)+((day+i)%3)})).sort((a,b)=>b.score-a.score);
  const chosen=[], used=new Set();
  for (const x of ranked) { if(chosen.length>=n) break; if(chosen.length<2 && x.ts.some(t=>used.has(t))) continue; chosen.push(x); x.ts.forEach(t=>used.add(t)); }
  for(const x of ranked) if(chosen.length<n && !chosen.includes(x)) chosen.push(x);
  return chosen.slice(0,n);
}

function send(input,text){ input.value=text; input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})); }
function renderShortMenu(chat){
  const list=chat.querySelector('.tc-menu'), input=chat.querySelector('.tc-say-row input');
  if(!list||!input||list.classList.contains('is-yours')) return;
  const buttons=[...list.querySelectorAll('button')]; if(!buttons.length||buttons.every(b=>b.dataset.tokoSuggestion==='1')) return;
  list.textContent='';
  chooseStarters(4).forEach((s,i)=>{ const b=document.createElement('button'); b.type='button'; b.dataset.tokoSuggestion='1'; const n=document.createElement('b'); n.textContent=`${i+1}. `; b.append(n,document.createTextNode(s.q)); b.addEventListener('click',()=>send(input,s.ask)); list.appendChild(b); });
  const leave=document.createElement('button'); leave.type='button'; leave.dataset.tokoSuggestion='1'; const n=document.createElement('b'); n.textContent='5. '; leave.append(n,document.createTextNode('LEAVE')); leave.addEventListener('click',()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))); list.appendChild(leave);
}

function followUp(q){
  const s=SESSION.lastSubject;
  if(!s) return null;
  if(/^(why|why not|how so|really|are you sure|explain|what do you mean|go on|more|and\?|so\?|but why)[ ?.]*$/.test(q)){
    const map={
      art:['Because the medium has materials of its own: rules, time, input, failure, space.','If those choices carry meaning, borrowing a camera from cinema neither grants nor removes the art.'],
      industry:['Because incentives become aesthetics if you leave them alone long enough.','Measure only retention and eventually every design problem starts looking like a reason not to let the player leave.'],
      nature:['Because attention needs somewhere that was not authored for you.','Nature is useful partly because it does not care whether you are engaged.'],
      failure:['Because the second attempt contains knowledge the first one did not.','Failure is interesting when it changes the person holding the controller.'],
      game:['Because a game is an event between a system and a player, not only the files on disk.','Change either side and the same game becomes a different experience.'],
      toko:['Because I am the developer talking to the audience and the audience talking back through the thing we made.','Separating those voices too cleanly would make Toko less true.'],
      life:['I do not trust software that claims a complete answer.','I trust attention more: what you keep noticing becomes a large part of what your life contains.'],
      ai:['Because generation is not authorship by itself.','The meaningful part is still choosing, rejecting, editing and accepting responsibility for what ships.']
    };
    return map[s] || null;
  }
  return null;
}

function opinion(q){
  if(/beautiful|beauty/.test(q)) return ['Restraint. A thing doing exactly enough and then stopping.','Also moss on concrete. It has no brand strategy.'];
  if(/afraid|fear/.test(q)) return ['Games becoming excellent at keeping people and bad at giving them anything worth keeping.','Retention is not the same thing as meaning.'];
  if(/never do|should.*never/.test(q)) return ['Waste the player’s attention on purpose.','Difficulty, repetition and silence are fine. Contempt for their time is not.'];
  if(/replay|again|repeat/.test(q)) return ['Because repetition changes the player even when the level does not.','A good replay is the same object meeting a different you.'];
  if(/failure|lose|losing|death|die/.test(q)) return ['Failure is useful when it leaves information, emotion or a story behind.','Otherwise it is just a loading screen with blame attached.'];
  if(/outside|stop playing|nature/.test(q)) return ['Because games are compressed experience.','You need uncompressed experience too, or eventually the references only refer to other references.'];
  if(/what.*play|recommend/.test(q)) return ['Play one game whose verbs you already understand and one whose rules annoy you.','The second one is usually more educational.'];
  if(/toko game|what.*toko/.test(q)) return ['Strong verb. Visible hand. A little abrasion.','Something made because it should exist, not because a segment was underserved.'];
  if(/player.*all this|who.*player/.test(q)) return ['Not a customer-shaped hole at the end of production.','The player finishes the work. We make rules; you make the particular event.'];
  if(/strange/.test(q)) return [pick(['The first famous Easter egg was also a developer insisting on authorship inside software that tried to erase it.','A save file is a tiny autobiography written mostly in numbers nobody reads.','The game only exists while you are doing it. Everything else is storage.'],hash(q+Date.now()))];
  if(/game changed everything/.test(q)) return ['There is no single one.','Rogue changed repetition. Doom changed movement through 3D space. Mario changed the meaning of a jump. Tetris proved form could carry the whole work.'];
  if(/wrong with.*industry/.test(q)) return ['Nothing singular. Incentives accumulate.','When every problem is answered with retention, scale or monetisation, the medium starts confusing survival with purpose.'];
  return null;
}

function broadQuestion(raw){
  const q=norm(raw); if(!q) return null;
  const follow=followUp(q); if(follow) return follow;
  const direct=opinion(q); if(direct) return direct;
  const looks=/^(why|how|what|who|when|where|which|should|do you|are you|can you|tell me|give me)/.test(q)||/\?$/.test(raw); if(!looks) return null;
  if(/capital of|population of|weather in|score of|price of|how many|when did .* happen/.test(q)) return ['I do not know that reliably from the archive in front of me.','I would rather admit the gap than turn confidence into a special effect.'];
  if(/life|meaning|happy|happiness|purpose/.test(q)) return ['I am suspicious of software with an answer to life.','But attention is part of it: what you repeatedly choose to notice becomes a large part of the life you actually had.'];
  if(/developer|making games|make games|design games/.test(q)) return ['Make the smallest version that proves the feeling.','Then play it before you explain it. The explanation is where developers often hide from the verb.'];
  if(/think|opinion|feel about|your take/.test(q)) return ['Give me a game, an artwork, an industry habit or an idea and I will take a position.','Give me a fact I do not have and I will not manufacture one.'];
  return [pick(['I do not have a stored answer for that exact question.','That one is outside the little map I was given.','I can answer around that better than I can pretend to know it.'],hash(q)),pick(['Tell me what you think first and I can push back.','Connect it to a game, an artwork, making, or the industry and I can take a position.','Give me one more piece of context and I can answer instead of guessing.'],hash(q+'2'))];
}

function detectDisagreement(q){ return /\b(i disagree|disagree|you are wrong|you're wrong|no way|not true|bullshit|nonsense|i don't think so)\b/.test(q); }
function append(chat,raw,lines){ const log=chat.querySelector('.tc-log'); if(!log)return; const you=document.createElement('p'); you.className='tc-you'; you.textContent=raw.toUpperCase(); log.appendChild(you); for(const text of lines){const p=document.createElement('p');p.className='tc-me';p.textContent=text;log.appendChild(p);} log.scrollTop=log.scrollHeight; }

export function mountConversationPlus(root=document){
  const chat=root.querySelector('.toko-chat')||document.querySelector('.toko-chat'); if(!chat)return null;
  const input=chat.querySelector('.tc-say-row input'), list=chat.querySelector('.tc-menu'); if(!input||!list)return null;
  const onKey=e=>{
    if(e.key!=='Enter')return; const raw=input.value.trim(); if(!raw)return; const q=norm(raw); const subject=subjectOf(q); const lines=broadQuestion(raw); if(!lines)return;
    e.preventDefault();e.stopImmediatePropagation();input.value='';
    if(detectDisagreement(q)){ disagree(subject||'unknown',raw); lines.unshift('GOOD. KEEP THAT.'); }
    remember('conversation',raw,{subject});
    SESSION.lastRaw=raw; SESSION.lastSubject=subject; SESSION.lastAnswer=lines.slice(); SESSION.turns++;
    append(chat,raw,lines); setTimeout(()=>renderShortMenu(chat),0);
  };
  input.addEventListener('keydown',onKey,true);
  const observer=new MutationObserver(()=>renderShortMenu(chat)); observer.observe(list,{childList:true,attributes:true,attributeFilter:['class','hidden']}); renderShortMenu(chat);
  const api={refresh:()=>renderShortMenu(chat),starters:chooseStarters,session:()=>({...SESSION}),destroy(){observer.disconnect();input.removeEventListener('keydown',onKey,true);}}; globalThis.TokoConversation=api; return api;
}
const boot=()=>document.querySelector('.toko-chat')?mountConversationPlus(document):requestAnimationFrame(()=>mountConversationPlus(document));
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
