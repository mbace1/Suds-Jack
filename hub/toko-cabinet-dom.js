// TOKO LIVE — the Hub cabinet, injected after hub.js builds the floor.
//
// THE NUMBER IS NOT TYPED HERE. It used to be — `ver.textContent = 'v34'` —
// and the page went to v46 while the chip stayed where somebody last
// remembered to edit it, twelve releases behind its own game. hub.js fills
// every `.ver` slot from versions.json by `dataset.game`, so the slot is
// declared and left empty and the generator is the only thing that writes a
// version. The `note` below is prose and carries its own prefix, the way
// every other cabinet's note in games.js does.
import { drawFace } from '../toko/js/face.js';

function buildTokoCabinet(){
  const card=document.createElement('article');card.className='cab';card.id='cab-tokolive';card.style.setProperty('--cab','#f0027f');
  const frame=document.createElement('a');frame.className='marquee';frame.href='toko-live/';frame.setAttribute('aria-label','Play Toko Live');frame.tabIndex=-1;
  const canvas=document.createElement('canvas');canvas.className='art';canvas.width=128;canvas.height=72;canvas.setAttribute('aria-hidden','true');
  frame.appendChild(canvas);card.appendChild(frame);
  const body=document.createElement('div');body.className='cab-body';
  const head=document.createElement('div');head.className='cab-head';const caret=document.createElement('span');caret.className='caret';caret.textContent='>';const h3=document.createElement('h3');const title=document.createElement('a');title.className='cab-link';title.href='#tokolive';title.textContent='Toko Live';title.onclick=e=>{e.preventDefault();card.scrollIntoView({block:'center',behavior:'smooth'});history.replaceState(null,'','#tokolive')};h3.appendChild(title);head.append(caret,h3);const ver=document.createElement('span');ver.className='ver';ver.dataset.game='tokolive';ver.textContent='';head.appendChild(ver);body.appendChild(head);
  const lineage=document.createElement('p');lineage.className='lineage';lineage.textContent='Sierra conversation × virtual character × local project brain';
  const tagline=document.createElement('p');tagline.className='tagline';tagline.textContent='Talk to Toko face to face. The approved Toko character now performs more distinctly while listening, thinking, talking, reacting and being corrected.';
  const tags=document.createElement('ul');tags.className='tags';for(const t of ['conversation','character','local']){const li=document.createElement('li');li.textContent=t;tags.appendChild(li)}
  const note=document.createElement('p');note.className='note';note.textContent='v46 — the character is back; a layer that fought for the menu used to take the whole page with it';
  const controls=document.createElement('p');controls.className='controls';controls.textContent='type and press Enter · tap contextual replies · tap Toko for a small acknowledgement · Esc / HOME returns';
  const actions=document.createElement('div');actions.className='actions';const play=document.createElement('a');play.className='btn play';play.href='toko-live/';play.textContent='[ PLAY ]';actions.appendChild(play);
  // Two ways in, because there is a race and it is not always lost the same
  // way. hub.js fills every `.ver` from versions.json the moment the fetch
  // lands — which catches this card if it is already on the floor — and it
  // parks the result on `__hub.versions`, which catches it when the fetch
  // landed FIRST, and again every time hub.js re-renders the floor and this
  // card is rebuilt behind it. Declared-and-empty either way: no number is
  // typed in this file.
  const known=globalThis.__hub&&globalThis.__hub.versions&&globalThis.__hub.versions.tokolive;
  if(known)ver.textContent='v'+known.v;
  body.append(lineage,tagline,tags,note,controls,actions);card.appendChild(body);
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#f0027f';c.fillRect(0,0,128,72);drawFace(c,25,3,78,{color:'#fff',open:0});
  return card;
}

let queued=false;
function ensureTokoCabinet(){queued=false;const rack=document.getElementById('cabinets');if(!rack||document.getElementById('cab-tokolive')) return;rack.prepend(buildTokoCabinet())}
function queueEnsure(){if(queued)return;queued=true;queueMicrotask(ensureTokoCabinet)}
ensureTokoCabinet();new MutationObserver(queueEnsure).observe(document.body,{childList:true,subtree:true});addEventListener('load',queueEnsure);addEventListener('hashchange',queueEnsure);setTimeout(queueEnsure,250);setTimeout(queueEnsure,1000);setTimeout(queueEnsure,2500);
