// TOKO MIDORI GAMES — conversation bridge for the local small brain.
import brain from './brain.js';
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const SESSION={last:null};
function append(chat,raw,lines){const log=chat.querySelector('.tc-log');if(!log)return;const you=document.createElement('p');you.className='tc-you';you.textContent=raw.toUpperCase();log.appendChild(you);for(const text of lines){const p=document.createElement('p');p.className='tc-me';p.textContent=text;log.appendChild(p)}log.scrollTop=log.scrollHeight}
function correctionLike(q){return /^(no[, ]|actually\b|correction[: ]|remember that\b|you are wrong\b|that is wrong\b|not quite\b)/.test(q)}
function answer(raw){const q=norm(raw);
  if(/^(brain|what have you learned|learning status|what do you remember learning)/.test(q))return brain.memorySummary();
  if(correctionLike(q)){const c=brain.teachCorrection(raw,SESSION.last||'');return c?[`CORRECTION STORED${c.title?` FOR ${c.title.toUpperCase()}`:''}.`,'I WILL WEIGH THAT ABOVE ROADMAP NOTES WHEN THEY CONFLICT.']:null;}
  if(/^(why do you think that|why do you believe that|source your answer|show your reasoning|what is that based on)/.test(q)&&SESSION.last)return brain.explainBelief(SESSION.last);
  const intent=/why|how|what|where|which|should|design|roadmap|future|next|goal|rule|constraint|direction|plan|priority|work on|because|reason/.test(q);
  if(!intent)return null;
  const lines=brain.compose(raw);if(lines){SESSION.last=raw;return lines}return null;
}
export function mountBrainConversation(root=document){const chat=root.querySelector('.toko-chat')||document.querySelector('.toko-chat');if(!chat)return null;const input=chat.querySelector('.tc-say-row input');if(!input)return null;const onKey=e=>{if(e.key!=='Enter')return;const raw=input.value.trim();if(!raw)return;const lines=answer(raw);if(!lines)return;e.preventDefault();e.stopImmediatePropagation();input.value='';append(chat,raw,lines)};input.addEventListener('keydown',onKey,true);return{destroy:()=>input.removeEventListener('keydown',onKey,true),session:()=>({...SESSION})}}
const boot=()=>document.querySelector('.toko-chat')?mountBrainConversation(document):requestAnimationFrame(()=>mountBrainConversation(document));if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
