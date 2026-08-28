// TOKO MIDORI GAMES — conversation bridge for internal game design knowledge.
import projects from './project-knowledge.js';
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const SESSION={project:null};
function append(chat,raw,lines){const log=chat.querySelector('.tc-log');if(!log)return;const you=document.createElement('p');you.className='tc-you';you.textContent=raw.toUpperCase();log.appendChild(you);for(const text of lines){const p=document.createElement('p');p.className='tc-me';p.textContent=text;log.appendChild(p)}log.scrollTop=log.scrollHeight}
function answer(raw){const q=norm(raw);let p=projects.findProject(q);if(p)SESSION.project=p;
  if(/^(what projects|what games do you know|list projects|list games|game designs)/.test(q))return ['PROJECT FILES I CAN READ:',...projects.projectList().slice(0,18).map(x=>x.title.toUpperCase())];
  if(!p&&SESSION.project&&/^(roadmap|design|design goals|what next|next steps|locks|constraints|source|source of truth|why)/.test(q))p=SESSION.project;
  if(!p)return null;
  if(/roadmap|what next|next steps|where.*going|future plan/.test(q))return projects.roadmapLines(p.title);
  if(/lock|constraint|must not|rule/.test(q))return projects.constraintLines(p.title);
  if(/source|authority|canon|where.*know/.test(q))return projects.sourceLines(p.title);
  if(/design|what is|what.*about|core loop|goal|vision|pitch/.test(q))return projects.designLines(p.title);
  return null;
}
export function mountProjectConversation(root=document){const chat=root.querySelector('.toko-chat')||document.querySelector('.toko-chat');if(!chat)return null;const input=chat.querySelector('.tc-say-row input');if(!input)return null;const onKey=e=>{if(e.key!=='Enter')return;const raw=input.value.trim();if(!raw)return;const lines=answer(raw);if(!lines)return;e.preventDefault();e.stopImmediatePropagation();input.value='';append(chat,raw,lines)};input.addEventListener('keydown',onKey,true);return{destroy:()=>input.removeEventListener('keydown',onKey,true),session:()=>({...SESSION})}}
const boot=()=>document.querySelector('.toko-chat')?mountProjectConversation(document):requestAnimationFrame(()=>mountProjectConversation(document));if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
