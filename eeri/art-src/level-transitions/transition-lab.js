import {TRANSITIONS} from './transition-spec.js';
const buttons=document.querySelector('#buttons'),cover=document.querySelector('.cover'),tape=document.querySelector('.tape'),stamp=document.querySelector('.stamp'),reduced=document.querySelector('#reduced'),info=document.querySelector('#info');
for(const name of Object.keys(TRANSITIONS)){const b=document.createElement('button');b.textContent=name.replaceAll('_',' ');b.onclick=()=>play(name);buttons.append(b)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function play(name){const t=TRANSITIONS[name];cover.style.transition=tape.style.transition=stamp.style.transition='none';cover.style.transform='translateX(-105%)';tape.style.transform='translateX(-110%)';stamp.style.opacity=0;stamp.style.transform='translate(-50%,-50%) rotate(-4deg) scale(.7)';await wait(30);info.textContent=`${name} · ${reduced.checked?t.reducedMs:t.totalMs} ms`;
 if(reduced.checked){cover.style.transition=`opacity ${t.reducedMs}ms`;cover.style.transform='none';cover.style.opacity=.86;await wait(t.reducedMs/2);cover.style.opacity=0;return}
 const ms=t.totalMs;cover.style.opacity=1;cover.style.transition=`transform ${Math.min(220,ms*.28)}ms ease-out`;cover.style.transform='translateX(0)';
 if(name!=='retry'&&name!=='checkpoint_respawn'){setTimeout(()=>{stamp.style.transition='all 170ms ease-out';stamp.style.opacity=1;stamp.style.transform='translate(-50%,-50%) rotate(-4deg) scale(1)'},110)}
 setTimeout(()=>{tape.style.transition='transform 180ms ease-out';tape.style.transform='translateX(0)'},Math.min(180,ms*.3));
 setTimeout(()=>{cover.style.transition='transform 260ms ease-in';cover.style.transform='translateX(105%)';tape.style.transform='translateX(110%)';stamp.style.opacity=0},Math.max(160,ms-300));}
play('level_in');
