// Toko Player Pulse — contextual multiple-choice feedback capture.
// Public client stores pulses locally and emits events. Production upload must
// go through the authenticated/rate-limited endpoint described in PLAYER_PULSE.md.

const STORE_KEY='tokoPlayerPulse.v1';
const SESSION_KEY='tokoPlayerPulseSession.v1';
const nowISO=()=>new Date().toISOString();
const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const uid=()=>globalThis.crypto?.randomUUID?.()||`pulse-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const QUESTIONS=[
  {
    id:'powder.vision.001', project:'powder', builds:['*'], trigger:'post-session',
    prompt:'Powder is starting to find its identity. What should I push hardest?',
    answers:[['racing','Racing + speed'],['exploration','Exploration + discovery'],['expression','Tricks + expression'],['strange','Make it stranger']],
    why:'Vision pressure: understand which fantasy is currently pulling players hardest.'
  },
  {
    id:'tokodrop.stop.001', project:'toko-drop', builds:['*'], trigger:'session-ended-early',
    prompt:'What made you stop that run?',
    answers:[['done','I was done'],['bored','It got repetitive'],['confused','It became confusing'],['retry','I wanted to retry differently']],
    why:'Separate healthy run-ending from boredom/readability/retry intent.'
  },
  {
    id:'tokomove.missed.001', project:'toko-move', builds:['*'], trigger:'missed-boarding-twice',
    prompt:'You missed that tram twice. What was unclear?',
    answers:[['timing','The timing'],['route','The route'],['button','What to press'],['mistimed','Nothing — I mistimed it']],
    why:'Readability check after repeated boarding misses.'
  },
  {
    id:'generic.return.001', project:'*', builds:['*'], trigger:'return-after-update',
    prompt:'This build changed since you were here. Better?',
    answers:[['better','Yes'],['worse','No'],['mixed','Different strengths'],['unsure','Too early to tell']],
    why:'Lightweight post-update sentiment without pretending it is a quality score.'
  }
];

function session(){let s=readJSON(SESSION_KEY,null);if(!s){s={id:uid(),startedAt:nowISO()};writeJSON(SESSION_KEY,s)}return s}
export function allPulses(){return readJSON(STORE_KEY,[])}
export function questionById(id){return QUESTIONS.find(q=>q.id===id)||null}
export function eligibleQuestions({project='*',build='*',trigger=null,answeredIds=[]}={}){
  const answered=new Set(answeredIds);
  return QUESTIONS.filter(q=>!answered.has(q.id)&&(q.project==='*'||q.project===project)&&(!trigger||q.trigger===trigger)&&(q.builds.includes('*')||q.builds.includes(build)));
}
export function recordPulse(questionId,answer,{project=null,build='unknown',trigger=null,playContext={},freeText=null}={}){
  const q=questionById(questionId);if(!q)throw new Error(`Unknown pulse question: ${questionId}`);
  const valid=new Set(q.answers.map(([id])=>id));if(!valid.has(answer))throw new Error(`Invalid answer for ${questionId}`);
  const pulse={schema:1,id:uid(),questionId:q.id,project:project||q.project,build,askedAt:nowISO(),trigger:trigger||q.trigger,sessionId:session().id,playContext:{...playContext},answer,freeText:freeText?String(freeText).slice(0,500):null};
  const all=allPulses();all.push(pulse);writeJSON(STORE_KEY,all.slice(-400));
  try{dispatchEvent(new CustomEvent('toko:pulse',{detail:pulse}))}catch{}
  return pulse;
}
export function answeredQuestionIds(){return [...new Set(allPulses().map(p=>p.questionId))]}
export function summarizePulses({project=null,questionId=null}={}){
  const rows=allPulses().filter(p=>(!project||p.project===project)&&(!questionId||p.questionId===questionId));
  const counts={};for(const p of rows)counts[p.answer]=(counts[p.answer]||0)+1;
  return {responses:rows.length,counts,lastAt:rows.at(-1)?.askedAt||null};
}

function ensureStyles(){if(document.getElementById('toko-pulse-style'))return;const s=document.createElement('style');s.id='toko-pulse-style';s.textContent=`
.toko-pulse-card{border:2px solid #fff;background:#080808;color:#fff;padding:14px;margin:10px 0;font-family:inherit}
.toko-pulse-kicker{font-size:11px;letter-spacing:.12em;opacity:.65;margin-bottom:6px}.toko-pulse-q{font-size:16px;line-height:1.3;margin:0 0 10px}
.toko-pulse-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.toko-pulse-btn{appearance:none;border:1px solid #fff;background:#111;color:#fff;padding:11px 10px;text-align:left;font:inherit;cursor:pointer;min-height:48px}
.toko-pulse-btn:hover,.toko-pulse-btn:focus{background:#fff;color:#000;outline:none}.toko-pulse-letter{display:inline-block;min-width:1.5em;font-weight:700}.toko-pulse-done{opacity:.72;margin-top:8px;font-size:12px}
@media(max-width:520px){.toko-pulse-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
export function mountPulseCard(container,question,{project=question.project,build='unknown',trigger=question.trigger,playContext={},onAnswer=null}={}){
  if(!container||!question)return null;ensureStyles();const card=document.createElement('section');card.className='toko-pulse-card';card.dataset.questionId=question.id;
  const kicker=document.createElement('div');kicker.className='toko-pulse-kicker';kicker.textContent='TOKO ASKS';const q=document.createElement('p');q.className='toko-pulse-q';q.textContent=question.prompt;const grid=document.createElement('div');grid.className='toko-pulse-grid';
  question.answers.forEach(([id,label],i)=>{const b=document.createElement('button');b.type='button';b.className='toko-pulse-btn';b.innerHTML=`<span class="toko-pulse-letter">${String.fromCharCode(65+i)}</span>${label}`;b.addEventListener('click',()=>{const pulse=recordPulse(question.id,id,{project,build,trigger,playContext});grid.replaceChildren();const done=document.createElement('div');done.className='toko-pulse-done';done.textContent='I heard you. This becomes development evidence, not a vote.';grid.appendChild(done);onAnswer?.(pulse,question);});grid.appendChild(b)});
  card.append(kicker,q,grid);container.appendChild(card);return card;
}
export function askPulse({container,project='*',build='unknown',trigger,playContext={},onAnswer=null}={}){
  const [q]=eligibleQuestions({project,build,trigger,answeredIds:answeredQuestionIds()});if(!q)return null;return mountPulseCard(container,q,{project,build,trigger,playContext,onAnswer});
}

globalThis.TokoPlayerPulse={QUESTIONS,allPulses,questionById,eligibleQuestions,recordPulse,summarizePulses,askPulse,mountPulseCard};
