import { mountChat } from '../toko/js/chat.js?v=23';
import { drawMasterBadge } from '../toko/js/master.js';
import { WAYS, STICKER } from '../toko/js/palette.js';
import { makeToko3D } from '../toko/js/toko3d.js?v=1';
// TOKO IS HIS FACE (toko/BRAND.md §2c, toko-live/CANON.md). The figure this
// stage used to draw — a dark hood, arms with magenta hands, a ring head — was
// an assistant's drawing, not his. He is the owner's master face, traced
// (toko/js/master.js), as the brand's badge: in 3D when WebGL is there, flat
// until it arrives or if it never does. Magenta is his original colour; the
// carrier colours are still him and may carry a mood — so he thinks in SKY,
// is pleased in YELLOW (the master file's own colour) and glitches in RED.
let t3d = null;
makeToko3D(600).then(x => { t3d = x; }).catch(e => console.warn('[toko-live] 3D Toko unavailable, drawing him flat:', e && e.message));
const MOOD = { thinking: STICKER.SKY, pleased: STICKER.YELLOW, glitch: STICKER.RED };
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
let yawS = 0, pitchS = 0;
const slot=document.querySelector('#chat-slot'),chat=mountChat(slot,{where:'in',openOnLoad:true});window.__tokoLiveChat=chat;
// The brain, loaded one layer at a time and ALLOWED TO BE ABSENT.
// This was a chain of bare `await import`s, and that is how the whole page
// died in production: the deploy carried toko-live/ but not three of the
// toko/js modules named here, the first await threw, and every line below it —
// the canvas, the stage, the state machine, the character — never ran. The
// shell is static HTML, so the page looked alive and drew nothing at all.
// A layer that adds intelligence must never be able to remove the character.
for (const m of ['mind.js?v=10', 'project-conversation.js?v=2', 'brain-conversation.js?v=1',
                 'conversation-plus.js?v=11', 'chat-layout-fix.js?v=1']) {
  try { await import('../toko/js/' + m); }
  catch (err) { console.warn('[toko-live] layer unavailable:', m, err && err.message); }
}
const canvas=document.querySelector('#toko-stage'),ctx=canvas.getContext('2d'),stage=document.querySelector('.stage'),label=document.querySelector('#state-label'),thought=document.querySelector('#thought');
let performanceState='listening',until=0,semanticMode='local',mx=0,my=0,gaze=0,focus=null,cards=[],rects=[],hover=-1,answerStart=0,focusIndex=-1,compareIndex=-1,lastTap=0,lastTapIndex=-1,crossPair=null,crossSlots=[0,0];
const P=[
['TINY HAWK','FLICK / FREE ROAM / THE PART',['skate','why','next']],
['EERI','CRAFTED / PLATFORM / MACHINES',['../eeri/assets/2d/card_detail_v2.png','../eeri/assets/2d/felt_detail_v2.png','../eeri/assets/2d/day_sky_v2.webp']],
['PIRITORI','KALLIO / MARKET / CONSEQUENCE',['../piritori/art/v3/scenes/courtyard-prototype-v02.webp','../piritori/art/v3/scenes/karhupuisto-v01.webp','../piritori/art/v3/scenes/toko-slomo-noodles-prototype-v01.webp']],
['BETTERMENT','TODAY / FIVE / BONFIRE',['../kindling/art/camp-night-clean.png','../kindling/art/ashling.png','../kindling/art/fire-states.png']],
['HYPER DAGGER','DEVIL DAGGERS / FEEL / SKULLS',['skull','why','next']],['SUDS JACK','TEMPEST / DIVE / TOPOGRAPHY',['grid','why','next']],['FLASH PRINCE','ROTOSCOPE / CLIMB / SHIELD',['shield','why','next']],['TOKO DROP','ROUNDS / DASH / GELATIN',['drop','why','next']]];
const pf=s=>P.find(p=>s.toUpperCase().includes(p[0]))||null,pfs=s=>P.filter(p=>s.toUpperCase().includes(p[0])),imgs=new Map(),SLOT_NAMES=['PROJECT','WHY','NEXT'];
function image(src){if(!src.includes('/'))return null;if(!imgs.has(src)){const i=new Image();i.src=src;imgs.set(src,i)}return imgs.get(src)}
const POSES={idle:[.04,-.04],listen:[-.12,.12],think:[-.82,.18],explain:[-.42,.46],pleased:[-.9,.9],correct:[.62,-.62],focus:[-.18,.92],compare:[-.7,.7]};
function pose(t){let p=POSES.idle;if(performanceState==='thinking')p=POSES.think;else if(performanceState==='talking')p=POSES.explain;else if(performanceState==='pleased')p=POSES.pleased;else if(performanceState==='glitch')p=POSES.correct;else if(crossPair||compareIndex>=0)p=POSES.compare;else if(focusIndex>=0)p=POSES.focus;else if(performanceState==='listening')p=POSES.listen;return[p[0]+Math.sin(t*.0018)*.025,p[1]-Math.sin(t*.0016)*.025]}
function setPerformance(s,ms,note,text=''){performanceState=s;until=performance.now()+ms;stage.dataset.state=s;label.textContent=`${semanticMode.toUpperCase()} / ${s.toUpperCase()}`;if(note)thought.textContent=note.toUpperCase();if(text)answerStart=performance.now()}
function say(q){const i=document.querySelector('.toko-chat .tc-say-row input');if(i){i.value=q;i.focus();i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))}}
function cardFor(p,s=0){return{t:s===0?p[0]:SLOT_NAMES[s],s:p[1],q:s===0?`Tell me the design of ${p[0]}`:s===1?`Why is ${p[0]} designed this way?`:`What is next for ${p[0]}?`,visual:p[2][s],tag:s===0?'PROJECT MEMORY':s===1?'REFERENCE / INTENT':'DIRECTION / NEXT',project:p[0],slot:s}}
function spawn(p){focus=p;crossPair=null;semanticMode=p?p[0].toLowerCase().replace(/ /g,'-'):'local';cards=p?[cardFor(p,0),cardFor(p,1),cardFor(p,2)]:[];focusIndex=-1;compareIndex=-1}
function rebuildCross(){cards=[cardFor(crossPair[0],crossSlots[0]),cardFor(crossPair[1],crossSlots[1])];focusIndex=0;compareIndex=1}
function spawnCross(a,b){focus=a;crossPair=[a,b];crossSlots=[0,0];semanticMode='cross-project';rebuildCross();thought.textContent=`${a[0]} <> ${b[0]} — TAP A SIDE TO CYCLE PROJECT / WHY / NEXT. DOUBLE-TAP TO ASK.`;label.textContent='CROSS-PROJECT / COMPARE'}
function cycleCross(i){crossSlots[i]=(crossSlots[i]+1)%3;rebuildCross();focusIndex=i;compareIndex=1-i;const c=cards[i];setPerformance('thinking',650,`${c.project}: ${SLOT_NAMES[c.slot]} EVIDENCE.`)}
function focusCard(i){focusIndex=i;compareIndex=crossPair?1-i:-1;setPerformance('thinking',650,`FOCUSING ${cards[i].project||cards[i].t}. TAP AGAIN TO ASK.`)}
function compareCard(i){if(crossPair)return;if(focusIndex<0)return focusCard(i);if(i===focusIndex){compareIndex=-1;return}compareIndex=i;setPerformance('thinking',700,`COMPARING ${cards[focusIndex].t} WITH ${cards[i].t}.`)}
function dismissCard(i){if(!cards[i])return;const name=cards[i].project||cards[i].t;cards.splice(i,1);crossPair=null;focusIndex=-1;compareIndex=-1;hover=-1;setPerformance('listening',650,`${name} DISMISSED.`)}
function hit(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*720/r.width,y=(e.clientY-r.top)*720/r.height;return rects.findIndex(a=>x>a.x&&x<a.x+a.w&&y>a.y&&y<a.y+a.h)}
addEventListener('pointermove',e=>{mx=(e.clientX/innerWidth-.5)*2;my=(e.clientY/innerHeight-.5)*2;hover=hit(e);canvas.style.cursor=hover>=0?'pointer':'default'},{passive:true});
canvas.addEventListener('pointerup',e=>{const i=hit(e);if(i<0)return;const now=performance.now(),double=lastTapIndex===i&&now-lastTap<420;lastTap=now;lastTapIndex=i;if(e.shiftKey)return dismissCard(i);if(crossPair){if(double){focusIndex=i;compareIndex=1-i;say(cards[i].q);setPerformance('thinking',850,`ASKING ABOUT ${cards[i].project}: ${SLOT_NAMES[cards[i].slot]}.`)}else cycleCross(i);return}if(double){focusCard(i);say(cards[i].q);return}if(focusIndex<0)focusCard(i);else if(i===focusIndex){say(cards[i].q);setPerformance('thinking',900,`ASKING ABOUT ${cards[i].t}.`)}else if(compareIndex<0)compareCard(i);else focusCard(i)});
canvas.addEventListener('contextmenu',e=>{const i=hit(e);if(i>=0){e.preventDefault();dismissCard(i)}});
function rr(x,y,w,h,r,f){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=f;ctx.fill()}
function icon(kind,x,y,w,h){const im=image(kind);if(im&&im.complete&&im.naturalWidth){const ir=im.naturalWidth/im.naturalHeight,br=w/h;let sx=0,sy=0,sw=im.naturalWidth,sh=im.naturalHeight;if(ir>br){sw=sh*br;sx=(im.naturalWidth-sw)/2}else{sh=sw/br;sy=(im.naturalHeight-sh)/2}ctx.save();ctx.globalAlpha=.93;ctx.drawImage(im,sx,sy,sw,sh,x,y,w,h);ctx.restore();return}ctx.save();ctx.translate(x+w/2,y+h/2);ctx.strokeStyle='#f0027f';ctx.fillStyle='rgba(240,2,127,.16)';ctx.lineWidth=3;if(kind==='skate'){ctx.fillRect(-48,8,96,10);ctx.beginPath();ctx.arc(-32,24,9,0,7);ctx.arc(32,24,9,0,7);ctx.fill()}else if(kind==='skull'){ctx.beginPath();ctx.arc(0,-5,38,0,7);ctx.stroke();ctx.fillRect(-24,24,48,24)}else if(kind==='grid'){for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*18,-55);ctx.lineTo(i*28,55);ctx.stroke()}for(let j=-3;j<=3;j++){ctx.beginPath();ctx.moveTo(-80,j*15);ctx.lineTo(80,j*15);ctx.stroke()}}else if(kind==='shield'){ctx.beginPath();ctx.moveTo(0,-48);ctx.lineTo(42,-28);ctx.lineTo(30,24);ctx.lineTo(0,50);ctx.lineTo(-30,24);ctx.lineTo(-42,-28);ctx.closePath();ctx.stroke()}else if(kind==='drop'){ctx.beginPath();ctx.moveTo(0,-50);ctx.quadraticCurveTo(55,12,0,52);ctx.quadraticCurveTo(-55,12,0,-50);ctx.fill()}else{ctx.font='bold 34px Courier New';ctx.textAlign='center';ctx.fillStyle='#f0027f';ctx.fillText(kind==='why'?'?':'→',0,12)}ctx.restore()}
function layoutCard(i,cx,cy){if(crossPair)return i===0?{x:58,y:130,w:272,h:245,alpha:1}:{x:390,y:130,w:272,h:245,alpha:1};if(focusIndex>=0){if(compareIndex>=0){if(i===focusIndex)return{x:70,y:145,w:250,h:220,alpha:1};if(i===compareIndex)return{x:400,y:145,w:250,h:220,alpha:1}}else if(i===focusIndex)return{x:cx-165,y:115,w:330,h:270,alpha:1};return{x:65+i*125,y:535,w:110,h:92,alpha:.4}}const a=[-.85,.02,.85][i]||0,w=i?168:202,h=i?136:164;return{x:cx+Math.cos(a)*238-w/2,y:cy+35+Math.sin(a)*170-h/2,w,h,alpha:1}}
function drawTabs(r,c,i){if(!crossPair)return;const names=['PROJECT','WHY','NEXT'],tw=(r.w-16)/3;names.forEach((n,k)=>{ctx.fillStyle=k===c.slot?'#f0027f':'rgba(255,255,255,.12)';ctx.fillRect(r.x+8+k*tw,r.y+r.h-52,tw-2,17);ctx.textAlign='center';ctx.font='8px Courier New';ctx.fillStyle=k===c.slot?'#fff':'#aaa';ctx.fillText(n,r.x+8+k*tw+(tw-2)/2,r.y+r.h-40)});ctx.textAlign='right';ctx.font='8px Courier New';ctx.fillStyle='#fff';ctx.fillText(i===focusIndex?'ACTIVE · TAP TO CYCLE':'TAP TO CYCLE',r.x+r.w-9,r.y+15)}
function drawCards(cx,cy){rects=[];cards.forEach((c,i)=>{const r=layoutCard(i,cx,cy);rects.push(r);ctx.save();ctx.globalAlpha=r.alpha;rr(r.x,r.y,r.w,r.h,6,hover===i?'rgba(43,12,33,.98)':'rgba(7,7,11,.94)');ctx.strokeStyle=i===focusIndex||i===compareIndex?'#fff':i?'#4a2940':'#f0027f';ctx.lineWidth=i===focusIndex||i===compareIndex?2:1;ctx.strokeRect(r.x,r.y,r.w,r.h);icon(c.visual,r.x+8,r.y+8,r.w-16,r.h-(crossPair?88:58));ctx.textAlign='left';ctx.font='8px Courier New';ctx.fillStyle='#f0027f';ctx.fillText(c.tag,r.x+10,r.y+r.h-(crossPair?67:38));ctx.textAlign='center';ctx.font='bold 12px Courier New';ctx.fillStyle='#fff';ctx.fillText(c.project||c.t,r.x+r.w/2,r.y+r.h-(crossPair?55:23));if(!crossPair){ctx.font='9px Courier New';ctx.fillStyle='#aaa';ctx.fillText(c.s,r.x+r.w/2,r.y+r.h-10)}drawTabs(r,c,i);ctx.restore()});if(crossPair){ctx.textAlign='center';ctx.font='bold 18px Courier New';ctx.fillStyle='#f0027f';ctx.fillText('↔',360,252)}}
function limb(x,y,l,a){ctx.save();ctx.translate(x,y);ctx.rotate(a);rr(-15,0,30,l,13,'#0c0c10');ctx.fillStyle='#f0027f';ctx.beginPath();ctx.arc(0,l,13,0,7);ctx.fill();ctx.restore()}
function draw(t){ctx.clearRect(0,0,720,720);gaze+=(mx-gaze)*.05;const cx=360+gaze*12,cy=265+my*5+Math.sin(t*.0017)*5;drawCards(cx,cy);
  const st=performanceState,R=128,ground=MOOD[st]||WAYS.SIGN.ground;
  // where he looks: the card under the pointer or in focus, else the pointer
  const target=hover>=0?rects[hover]:(focusIndex>=0?rects[focusIndex]:null);
  const wantYaw=target?Math.max(-.55,Math.min(.55,((target.x+target.w/2)-cx)/360)):gaze*.22;
  const wantPitch=(target?((target.y+target.h/2)-cy)/900:my*.1)+(st==='thinking'?-.12:0);
  yawS+=(wantYaw-yawS)*.08;pitchS+=(wantPitch-pitchS)*.08;
  // the mark's own acting: a blink every few seconds, the smile breathing while he talks
  const bt=t%4700,squash=bt<150?1-Math.sin(bt/150*Math.PI)*.94:1;
  const talk=(st==='talking'||st==='pleased')?Math.max(0,Math.sin((t-answerStart)*.019)):0;
  const grin=1+talk*.07+(st==='pleased'?.04:0);
  const roll=st==='thinking'?-.12+Math.sin(t*.0011)*.03:st==='glitch'?Math.sin(t*.09)*.08:Math.sin(t*.0009)*.02;
  const pop=(st==='pleased'?1.06:1)+talk*.015;
  const jx=st==='glitch'?(Math.random()-.5)*10:0;
  // his light on the room
  const g=ctx.createRadialGradient(cx,cy,R*.5,cx,cy,R*2.6);g.addColorStop(0,hexA(ground,.34));g.addColorStop(1,hexA(ground,0));ctx.fillStyle=g;ctx.fillRect(0,0,720,720);
  // his shadow
  ctx.save();ctx.globalAlpha=.4;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(cx+18,cy+16,R*pop*Math.cos(yawS),R*pop,roll,0,7);ctx.fill();ctx.restore();
  if(t3d){const img=t3d.render({squash,grin,yaw:yawS,pitch:pitchS,roll,pop,key:ground===WAYS.SIGN.ground?'#9fd8ff':ground,ground});const size=R*2*t3d.half;ctx.drawImage(img,cx-size/2+jx,cy-size/2,size,size);}
  else{ctx.save();ctx.translate(cx+jx,cy);ctx.rotate(roll);ctx.scale(pop*Math.cos(yawS),pop);drawMasterBadge(ctx,0,0,R,{ground,ink:WAYS.SIGN.ink,squash,grin});ctx.restore();}
  ctx.font='12px Courier New';ctx.fillStyle='rgba(240,2,127,.72)';ctx.fillText(`${semanticMode.toUpperCase()} / ${st.toUpperCase()} / ${crossPair?`${SLOT_NAMES[crossSlots[0]]} ↔ ${SLOT_NAMES[crossSlots[1]]}`:focusIndex>=0?(compareIndex>=0?'COMPARE':'FOCUS'):'ROOM'}`,24,694)}
function loop(t){if(until&&t>until){performanceState='listening';label.textContent=`${semanticMode.toUpperCase()} / LISTENING`;until=0}draw(t);requestAnimationFrame(loop)}requestAnimationFrame(loop);
const log=document.querySelector('.toko-chat .tc-log');if(log)new MutationObserver(ms=>{for(const n of ms.flatMap(m=>[...m.addedNodes]).filter(n=>n.nodeType===1)){const text=(n.textContent||'').trim(),who=n.classList.contains('tc-you')?'you':n.classList.contains('tc-me')?'me':null;if(!text||!who)continue;const matches=pfs(text);if(matches.length>=2&&/compare|versus|\bvs\b|difference|relationship|between/i.test(text))spawnCross(matches[0],matches[1]);else if(matches.length===1&&(!focus||matches[0][0]!==focus[0]))spawn(matches[0]);if(who==='you'&&/^(no|actually|correction|you are wrong|that is wrong|not quite)/i.test(text))setPerformance('glitch',1700,'CORRECTION RECEIVED.');else if(who==='you')setPerformance('thinking',1100,crossPair?`COMPARING ${crossPair[0][0]} AND ${crossPair[1][0]}.`:'SEARCHING MEMORY AND PROJECT EVIDENCE.');else setPerformance(/good|yes|right|favourite|beaut|fun|thank/i.test(text)?'pleased':'talking',Math.min(4300,1300+text.length*11),text,text)}}).observe(log,{childList:true,subtree:true});
document.querySelectorAll('[data-say]').forEach(b=>b.addEventListener('click',()=>say(b.dataset.say)));