// Conversational surface for explicit queue facts and clearly-labelled predictions.
import { queueLines, predictionLines } from './dev-future.js';

const norm=s=>String(s||'').trim().toLowerCase();
function append(chat,cls,text){const log=chat.querySelector('.tc-log');if(!log)return;const p=document.createElement('p');p.className=cls;p.textContent=text;log.appendChild(p);log.scrollTop=log.scrollHeight}
function projectFrom(cmd,prefixes){let s=cmd;for(const p of prefixes)s=s.replace(p,'');return s.trim()}
export function mountFutureConversation(root=document){const chat=root.querySelector('.toko-chat')||document.querySelector('.toko-chat');if(!chat)return null;const input=chat.querySelector('.tc-say-row input');if(!input)return null;const onKey=async e=>{if(e.key!=='Enter')return;const cmd=norm(input.value);if(!cmd)return;
  const queueHit=/^(queue|what('?s| is) queued|what are you working on|what is claude working on)(\s+.*)?$/.test(cmd);
  const predictHit=/^(predict|what('?s| is) next|what comes next|where is .* going)(\s+.*)?$/.test(cmd);
  if(!queueHit&&!predictHit)return;e.preventDefault();e.stopImmediatePropagation();input.value='';append(chat,'tc-you',cmd.toUpperCase());
  const raw=queueHit?projectFrom(cmd,['what is queued','what\'s queued','queue','what are you working on','what is claude working on']):projectFrom(cmd,['predict','what is next','what\'s next','what comes next']);
  const lines=queueHit?await queueLines(raw):predictionLines(raw);for(const line of lines)append(chat,'tc-me',line)
};input.addEventListener('keydown',onKey,true);return{destroy:()=>input.removeEventListener('keydown',onKey,true)}}
const boot=()=>document.querySelector('.toko-chat')?mountFutureConversation(document):requestAnimationFrame(()=>mountFutureConversation(document));if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
