// TOKO MIDORI GAMES — conversation bridge for local play history.
import play from './play-awareness.js';
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
function append(chat,raw,lines){const log=chat.querySelector('.tc-log');if(!log)return;const you=document.createElement('p');you.className='tc-you';you.textContent=raw.toUpperCase();log.appendChild(you);for(const text of lines){const p=document.createElement('p');p.className='tc-me';p.textContent=text;log.appendChild(p)}log.scrollTop=log.scrollHeight}
function answer(raw){const q=norm(raw);
  if(/^(what have i played|what did i play|my games|my play history|play history|what do you know about my games)/.test(q))return play.summaryLines();
  if(/what do you notice about (how|the way) i play|what does my play history say|what kind of player am i|analyse my play|analyze my play|read my play history/.test(q))return play.reflectionLines();
  if(/^(my scores|scores|high scores|bests|my best scores)/.test(q)){const s=play.snapshot().games.filter(g=>g.best!=null);return s.length?s.map(g=>`${g.title.toUpperCase()} — ${g.scoreFmt==='secs'?Number(g.best).toFixed(2)+' sec':Math.round(g.best)+' pts'}`):['NO DECLARED HIGH SCORES FOUND ON THIS DEVICE YET.'];}
  if(/^(my favourites|my favorites|favourites|favorites)/.test(q)){const f=play.snapshot().games.filter(g=>g.favourite);return f.length?['YOU MARKED: '+f.map(x=>x.title.toUpperCase()).join(', ')+'.']:['YOU HAVE NOT MARKED A FAVOURITE YET.'];}
  if(/^(favourite|favorite)\s+/.test(q)){const x=play.favouriteGame(q,true);return x?[`${x.title.toUpperCase()} MARKED AS A FAVOURITE.`,'I will treat that as taste, not a command to recommend only more of the same.']:['I COULD NOT MATCH THAT TO A CABINET.'];}
  if(/^(unfavourite|unfavorite)\s+/.test(q)){const x=play.favouriteGame(q,false);return x?[`${x.title.toUpperCase()} REMOVED FROM FAVOURITES.`]:['I COULD NOT MATCH THAT TO A CABINET.'];}
  if(/what.*(score|played|history|fail|death|run|favourite|favorite|time)|how.*doing.*in/.test(q)){const g=play.findGame(q);if(g)return play.gameLines(q);}
  return null;
}
export function mountPlayConversation(root=document){const chat=root.querySelector('.toko-chat')||document.querySelector('.toko-chat');if(!chat)return null;const input=chat.querySelector('.tc-say-row input');if(!input)return null;const onKey=e=>{if(e.key!=='Enter')return;const raw=input.value.trim();if(!raw)return;const lines=answer(raw);if(!lines)return;e.preventDefault();e.stopImmediatePropagation();input.value='';append(chat,raw,lines)};input.addEventListener('keydown',onKey,true);return{destroy:()=>input.removeEventListener('keydown',onKey,true)}}
const boot=()=>document.querySelector('.toko-chat')?mountPlayConversation(document):requestAnimationFrame(()=>mountPlayConversation(document));if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
