// TOKO LIVE — guaranteed Hub cabinet.
// Rendered after hub.js builds the floor, so catalogue/module-token drift cannot hide it.
const rack=document.getElementById('cabinets');
if(rack&&!document.getElementById('cab-tokolive')){
  const card=document.createElement('article');card.className='cab';card.id='cab-tokolive';card.style.setProperty('--cab','#f0027f');
  const frame=document.createElement('a');frame.className='marquee';frame.href='toko-live/';frame.setAttribute('aria-label','Play Toko Live');frame.tabIndex=-1;
  const canvas=document.createElement('canvas');canvas.className='art';canvas.width=128;canvas.height=72;canvas.setAttribute('aria-hidden','true');
  frame.appendChild(canvas);card.appendChild(frame);
  const body=document.createElement('div');body.className='cab-body';
  const head=document.createElement('div');head.className='cab-head';const caret=document.createElement('span');caret.className='caret';caret.textContent='>';const h3=document.createElement('h3');const title=document.createElement('a');title.className='cab-link';title.href='#tokolive';title.textContent='Toko Live';title.onclick=e=>{e.preventDefault();card.scrollIntoView({block:'center',behavior:'smooth'});history.replaceState(null,'','#tokolive')};h3.appendChild(title);head.append(caret,h3);const ver=document.createElement('span');ver.className='ver';ver.textContent='v18';head.appendChild(ver);body.appendChild(head);
  const lineage=document.createElement('p');lineage.className='lineage';lineage.textContent='Sierra conversation × virtual character × local project brain';
  const tagline=document.createElement('p');tagline.className='tagline';tagline.textContent='Talk to Toko face to face. Project knowledge, critique, decisions, status and factual news.';
  const tags=document.createElement('ul');tags.className='tags';for(const t of ['conversation','project-brain','local']){const li=document.createElement('li');li.textContent=t;tags.appendChild(li)}
  const note=document.createElement('p');note.className='note';note.textContent='v18 — approved Toko face only';
  const controls=document.createElement('p');controls.className='controls';controls.textContent='type and press Enter · tap suggested topics · Esc / HOME returns';
  const actions=document.createElement('div');actions.className='actions';const play=document.createElement('a');play.className='btn play';play.href='toko-live/';play.textContent='[ PLAY ]';actions.appendChild(play);
  body.append(lineage,tagline,tags,note,controls,actions);card.appendChild(body);rack.prepend(card);
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#f0027f';c.fillRect(0,0,128,72);c.strokeStyle='#fff';c.lineWidth=4;c.lineCap='round';c.lineJoin='round';
  const arc=(cx,cy,r,a0,a1)=>{c.beginPath();c.arc(cx,cy,r,a0,a1);c.stroke()};
  for(const ex of [43,85]){arc(ex,21,13,Math.PI,Math.PI*2);c.beginPath();c.moveTo(ex-13,21);c.lineTo(ex-13,28);c.moveTo(ex+13,21);c.lineTo(ex+13,28);c.stroke()}
  arc(64,40,34,.07,Math.PI-.07);arc(64,40,13,.18,Math.PI-.18);
}
