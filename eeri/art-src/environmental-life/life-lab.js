import {LIFE_ACTORS} from './life-spec.js';
const c=document.querySelector('#c'),x=c.getContext('2d'),buttons=document.querySelector('#buttons'),out=document.querySelector('#readout'),reduced=document.querySelector('#reduced');
let selected='tape_flutter',t0=performance.now();
for(const name of Object.keys(LIFE_ACTORS)){const b=document.createElement('button');b.textContent=name.replaceAll('_',' ');b.onclick=()=>{selected=name;t0=performance.now()};buttons.append(b)}
function base(){x.fillStyle='#b8d9e8';x.fillRect(0,0,c.width,c.height);x.fillStyle='#7d5a38';x.fillRect(0,260,c.width,100);x.fillStyle='#6e9f59';x.fillRect(0,252,c.width,16);x.fillStyle='#d5b06e';x.fillRect(620,120,150,140)}
function draw(now){requestAnimationFrame(draw);base();const a=LIFE_ACTORS[selected],q=(now-t0)/a.periodMs*Math.PI*2,freeze=reduced.checked&&a.reduce!=='pulse',s=freeze?0:Math.sin(q)*a.amp; x.save();x.translate(450,205);
  x.strokeStyle='#57473a';x.fillStyle='#f2c94c';x.lineWidth=7;
  if(selected.includes('tape')){x.rotate(s);x.fillRect(-12,-100,24,130)}
  else if(selected.includes('sign')){x.rotate(s);x.fillRect(-72,-42,144,84);x.strokeRect(-72,-42,144,84)}
  else if(selected==='paper_scrap'){x.translate(s*430,Math.sin(q*1.7)*30);x.rotate(q*.25);x.fillStyle='#f7f1dd';x.fillRect(-20,-13,40,26)}
  else if(selected==='beacon_sweep'){x.globalAlpha=.45+.45*Math.abs(Math.sin(q));x.fillStyle='#ff9c1a';x.beginPath();x.arc(0,-70,34,0,7);x.fill()}
  else if(selected==='felt_tuft'){x.scale(1,1+s);x.fillStyle='#6e9f59';x.fillRect(-40,-40,80,40)}
  else if(selected.includes('cable')||selected.includes('hook')){x.rotate(s);x.beginPath();x.moveTo(0,-130);x.lineTo(0,25);x.stroke();x.fillStyle='#444';x.beginPath();x.arc(0,42,18,0,7);x.fill()}
  else if(selected==='steam_puff'){if(!reduced.checked){x.globalAlpha=.35+.2*Math.sin(q);x.fillStyle='#f3f0e8';for(let i=0;i<4;i++){x.beginPath();x.arc(i*16-24,-30-i*18,20+i*3,0,7);x.fill()}}}
  else if(selected==='water_drip'){x.fillStyle='#58a6c6';x.beginPath();x.arc(0,-110+((q%(Math.PI*2))/(Math.PI*2))*150,8,0,7);x.fill()}
  else if(selected==='bird_perch'){x.translate(reduced.checked?0:Math.max(0,Math.sin(q))*18,-20);x.fillStyle='#4c4238';x.beginPath();x.arc(0,0,20,0,7);x.fill();x.beginPath();x.arc(17,-10,12,0,7);x.fill()}
  x.restore();out.textContent=`${selected} · ${a.anchor} · ${a.periodMs} ms · ${a.reduce} on reduced motion`}
requestAnimationFrame(draw);
