import { mountChat } from '../toko/js/chat.js?v=20';
import { drawFace } from '../toko/js/face.js';
import { TOKO } from '../toko/js/palette.js';

const slot=document.querySelector('#chat-slot');
const chat=mountChat(slot,{where:'in',openOnLoad:true});
window.__tokoLiveChat=chat;
await import('../toko/js/mind.js?v=10');
await import('../toko/js/project-conversation.js?v=2');
await import('../toko/js/brain-conversation.js?v=1');
await import('../toko/js/conversation-plus.js?v=10');
await import('../toko/js/chat-layout-fix.js?v=1');

const canvas=document.querySelector('#toko-stage');
const ctx=canvas.getContext('2d');
const stage=document.querySelector('.stage');
const label=document.querySelector('#state-label');
const thought=document.querySelector('#thought');
let state='listening',stateUntil=0,mx=0,my=0,gaze=0,answerText='',answerStart=0,idleSeed=Math.random()*99;
let topic={kind:'local',words:['LOCAL','MEMORY','DESIGN']};
const STATES={listening:'LISTENING',thinking:'THINKING',talking:'TALKING',pleased:'PLEASED',glitch:'RECONSIDERING',memory:'REMEMBERING',project:'PROJECT MODE',news:'READING WIRE',mirror:'MIRROR'};
const TOPICS={
  memory:['MEMORY','CORRECTION','RECALL'],project:['DESIGN','ROADMAP','LOCKS'],news:['SOURCE','WIRE','OPINION'],mirror:['PLAYER','SOFTWARE','AUTHOR'],local:['LOCAL','MEMORY','DESIGN']
};
function setState(next,ms=1300,note='',text=''){
  state=next;stateUntil=performance.now()+ms;stage.dataset.state=next;label.textContent=STATES[next]||next.toUpperCase();
  if(note)thought.textContent=note.slice(0,180).toUpperCase();
  if(text){answerText=text;answerStart=performance.now();}
  topic={kind:TOPICS[next]?next:'local',words:TOPICS[next]||TOPICS.local};
}
addEventListener('pointermove',e=>{mx=(e.clientX/innerWidth-.5)*2;my=(e.clientY/innerHeight-.5)*2},{passive:true});
function rr(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
function limb(x,y,len,ang,w=30,hand=true){ctx.save();ctx.translate(x,y);ctx.rotate(ang);rr(-w/2,0,w,len,w*.45,'#0c0c10');if(hand){ctx.fillStyle='#f0027f';ctx.beginPath();ctx.arc(0,len,Math.max(11,w*.42),0,Math.PI*2);ctx.fill()}ctx.restore()}
function rings(cx,cy,t){if(!['memory','project','news'].includes(state))return;ctx.save();ctx.globalAlpha=.24;ctx.strokeStyle=state==='news'?'#e8e05a':'#f0027f';ctx.lineWidth=2;for(let i=0;i<3;i++){const r=145+((t*.03+i*52)%150);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke()}ctx.restore()}
function thoughtObjects(cx,cy,t){if(!['memory','project','news','thinking','mirror'].includes(state))return;const words=topic.words||TOPICS.local;ctx.save();ctx.font='12px "Courier New",monospace';ctx.textAlign='center';for(let i=0;i<words.length;i++){const a=t*.00035+i*(Math.PI*2/words.length);const r=state==='mirror'?190:165;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.62;const pulse=.55+Math.sin(t*.003+i)*.18;ctx.globalAlpha=pulse;ctx.fillStyle=state==='news'?'#e8e05a':'#f0027f';ctx.fillText(words[i],x,y);ctx.strokeStyle='rgba(240,2,127,.18)';ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*112,cy+Math.sin(a)*70);ctx.lineTo(x,y-5);ctx.stroke()}ctx.restore()}
function idleGesture(t){const phase=(t*.00018+idleSeed)%4;return phase<1?0:phase<2?1:phase<3?2:3}
function body(t){
  const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);
  const speaking=state==='talking'||state==='pleased';
  const bob=Math.sin(t*.0017)*5+(speaking?Math.sin(t*.023)*2:0),breathe=Math.sin(t*.0012)*4;
  gaze+=(mx-gaze)*.055;const cx=W*.5+gaze*13,cy=H*.37+my*6+bob;
  const grad=ctx.createRadialGradient(cx,H*.79,10,cx,H*.79,250);grad.addColorStop(0,state==='mirror'?'rgba(255,255,255,.13)':'rgba(240,2,127,.20)');grad.addColorStop(1,'rgba(240,2,127,0)');ctx.fillStyle=grad;ctx.fillRect(0,H*.45,W,H*.55);
  rings(cx,cy,t);thoughtObjects(cx,cy,t);
  ctx.save();ctx.translate(cx,H*.53+breathe);ctx.fillStyle='#101015';ctx.beginPath();ctx.moveTo(-138,58);ctx.quadraticCurveTo(-120,-40,-72,-58);ctx.lineTo(72,-58);ctx.quadraticCurveTo(120,-40,138,58);ctx.lineTo(106,188);ctx.lineTo(-106,188);ctx.closePath();ctx.fill();ctx.strokeStyle='#2c1727';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-52);ctx.lineTo(0,178);ctx.stroke();
  let la=.05+Math.sin(t*.004)*.03,ra=-.05-Math.sin(t*.004)*.03;
  if(state==='listening'){const g=idleGesture(t);if(g===1){la=-.18;ra=.08}else if(g===2){la=.08;ra=-.26}else if(g===3){la=-.08;ra=-.08}}
  if(state==='thinking'){la=-.78;ra=.14}if(state==='talking'){la=-.35+Math.sin(t*.012)*.25;ra=.38+Math.sin(t*.01+1)*.23}if(state==='pleased'){la=-.86;ra=.86}if(state==='glitch'){la=.58;ra=-.58}if(state==='memory'){la=-1.04;ra=.05}if(state==='project'){la=-.18;ra=.98}if(state==='news'){la=.25;ra=-.94}if(state==='mirror'){la=-1.14;ra=1.14}
  limb(-108,28,128,la);limb(108,28,128,ra);ctx.restore();
  ctx.save();ctx.translate(cx-118,cy-118);if(state==='glitch')ctx.translate(Math.sin(t*.08)*5,0);ctx.fillStyle=TOKO.MAGENTA||'#f0027f';ctx.beginPath();ctx.arc(118,118,112,0,Math.PI*2);ctx.fill();ctx.fillStyle='#050507';ctx.beginPath();ctx.arc(118,118,94,0,Math.PI*2);ctx.fill();
  let open=.08;const blink=t%5200;if(blink>5050)open=.95;
  if(speaking){const syll=Math.max(0,Math.sin((t-answerStart)*.019));open=.12+syll*.45;}
  if(state==='pleased')open=.24+Math.max(0,Math.sin((t-answerStart)*.016))*.28;if(state==='thinking')open=.02;if(state==='glitch')open=.72;if(state==='memory')open=.15;if(state==='project')open=.06;if(state==='news')open=.12;if(state==='mirror')open=.92;
  drawFace(ctx,18,18,200,{color:'#fff',open});ctx.restore();
  if(state==='mirror'){ctx.save();ctx.globalAlpha=.16;ctx.scale(-1,1);ctx.drawImage(canvas,-W,0);ctx.restore()}
  ctx.font='12px "Courier New",monospace';ctx.fillStyle='rgba(240,2,127,.72)';const glyph=state==='thinking'?'RETRIEVE > RANK > CONNECT':state==='glitch'?'CORRECTION > OLD NOTE':state==='memory'?'MEMORY > RECALL > WEIGHT':state==='project'?'DESIGN > ROADMAP > LOCKS':state==='news'?'WIRE > SOURCE > OPINION':state==='mirror'?'PLAYER <> SOFTWARE <> AUTHOR':'LOCAL / MEMORY / DESIGN';ctx.fillText(glyph,24,H-26);
}
function loop(t){if(stateUntil&&t>stateUntil){state='listening';stage.dataset.state='listening';label.textContent='LISTENING';stateUntil=0;topic={kind:'local',words:TOPICS.local}}body(t);requestAnimationFrame(loop)}requestAnimationFrame(loop);
function classify(text,who){const s=text.toLowerCase();if(/mirror\.exe|\bmirror\b/.test(s))return['mirror',4000,'THE ROOM IS LOOKING BACK.'];if(/memory|remember|learned|correction/.test(s))return['memory',2500,'SEARCHING LOCAL MEMORY AND CORRECTIONS.'];if(/news|headline|story|wire|industry/.test(s))return['news',2500,'READING SOURCES BEFORE OPINION.'];if(/roadmap|design|project|tiny hawk|eeri|piritori|hyper dagger|suds jack|flash prince|betterment|toko drop/.test(s))return['project',2500,'PROJECT CONTEXT LOCKED.'];if(who==='you'&&/^(no|actually|correction|you are wrong|that is wrong|not quite)/i.test(text))return['glitch',1700,'CORRECTION RECEIVED. RE-WEIGHTING MEMORY.'];if(who==='you')return['thinking',1100,'LOOKING FOR RELATED MEMORY, DESIGN AND PROJECT EVIDENCE.'];return[/good|yes|right|favourite|beaut|fun|thank/i.test(text)?'pleased':'talking',Math.min(3600,1200+text.length*11),text]}
const log=document.querySelector('.toko-chat .tc-log');if(log)new MutationObserver(muts=>{for(const n of muts.flatMap(m=>[...m.addedNodes]).filter(n=>n.nodeType===1)){const text=(n.textContent||'').trim();if(!text)continue;const who=n.classList.contains('tc-you')?'you':n.classList.contains('tc-me')?'me':null;if(!who)continue;const [s,ms,note]=classify(text,who);setState(s,ms,note,who==='me'?text:'')}}).observe(log,{childList:true,subtree:true});
document.querySelectorAll('[data-say]').forEach(b=>b.addEventListener('click',()=>{const input=document.querySelector('.toko-chat .tc-say-row input');if(!input)return;input.value=b.dataset.say;input.focus();input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))}));
