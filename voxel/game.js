'use strict';
// ─── SUDS JACK — VOXEL PROTOTYPE ─────────────────────────────────────────────
// Hyper Dagger tech · 4px voxel grid · half-pipe tunnel · Bomb Jack + Tempest
// Suda 51 aesthetic: black/red/white/cyan, scanlines, graphic type

const LW = 320, LH = 180;
const off = document.createElement('canvas');
off.width = LW; off.height = LH;
const g = off.getContext('2d');
g.imageSmoothingEnabled = false;

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  const s = Math.min(window.innerWidth / LW, window.innerHeight / LH);
  canvas.width  = Math.floor(LW * s);
  canvas.height = Math.floor(LH * s);
  ctx.imageSmoothingEnabled = false;
}
resize();
window.addEventListener('resize', resize);

const C = {
  BG:   '#000000', SKY:  '#00000a',
  TA:   '#06000e', TB:   '#0e001c',
  FA:   '#04040e', FB:   '#0a0a1c', FG: '#120026',
  RIM:  '#00d4ff', RDIM: '#002233',
  PL:   '#ff0000', PLH:  '#ff5555', PLD: '#660000',
  BLT:  '#ffee00',
  E1:   '#ffffff', E2:   '#00ffff', E3: '#ff44ff',
  BUMP: '#ffaa00',
  HW:   '#ffffff', HR:   '#ff0000', HC: '#00ffff', HY: '#ffff00',
  DIM:  '#222222',
};

const ND=22, VPX=LW/2, VPY=36, NY=LH*0.82, NW=LW*0.45, WHF=0.50, NC=8, NR=4;

function lerp(a,b,t){return a+(b-a)*t}
function ss(t){return t*t*(3-2*t)}

function sliceAt(d){
  const t=ss(Math.max(0,d)/ND);
  return{y:lerp(NY,VPY,t),hw:lerp(NW,0,t),wh:lerp((NY-VPY)*WHF,0,t)};
}

function w2s(wx,wy,wz){
  const d=wz*ND,sl=sliceAt(d);
  return{x:Math.round(VPX+camX+wx*sl.hw),y:Math.round(sl.y-wy*sl.wh/NR),sc:sl.hw/NW};
}

let state='title',score=0,hi=0,lives=3,frame=0,scroll=0,camX=0,camT=0;

const PL={x:0,y:0,vx:0,vy:0,onGround:true,boosts:0,inv:0,zapCD:0};
const GRAV=0.28,J_VEL=-5.8,BOOST_V=-3.0,P_SPD=0.045,P_FRIC=0.80,P_CEIL=NR,FIRE_INT=130;
let fireCD=0;

const bullets=[],enemies=[],particles=[],bumps=[];

const keys={};
window.addEventListener('keydown',e=>{
  if(!keys[e.code]){keys[e.code]=true;handleKey(e.code);}
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});

function handleKey(code){
  if((state==='title'||state==='gameover')&&code==='Enter')startGame();
  if(state==='playing'){
    if(code==='Space'||code==='ArrowUp'||code==='KeyW')tryJump();
    if(code==='KeyZ')tryZap();
  }
}

const T={left:false,right:false,jump:false};
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  if(state!=='playing'){startGame();return;}
  for(const t of e.changedTouches){
    const x=t.clientX/window.innerWidth,y=t.clientY/window.innerHeight;
    if(y>0.55){if(x<0.35)T.left=true;else if(x>0.65)T.right=true;else tryZap();}
    else{T.jump=true;tryJump();}
  }
},{passive:false});
canvas.addEventListener('touchend',e=>{
  e.preventDefault();
  T.left=T.right=T.jump=false;
  for(const t of e.touches){
    const x=t.clientX/window.innerWidth,y=t.clientY/window.innerHeight;
    if(y>0.55){if(x<0.35)T.left=true;else if(x>0.65)T.right=true;}
  }
},{passive:false});

function tryJump(){
  if(PL.onGround){PL.vy=J_VEL;PL.onGround=false;PL.boosts=2;}
  else if(PL.boosts>0){PL.vy=Math.min(PL.vy,BOOST_V);PL.boosts--;}
}

function tryZap(){
  if(PL.zapCD>0)return;
  PL.zapCD=8000;
  enemies.forEach(e=>burst(e,14));
  score+=enemies.length*150;
  enemies.length=0;
}

function startGame(){
  score=0;lives=3;frame=0;scroll=0;camT=0;
  enemies.length=0;bullets.length=0;particles.length=0;bumps.length=0;
  Object.assign(PL,{x:0,y:0,vx:0,vy:0,onGround:true,boosts:0,inv:0,zapCD:0});
  fireCD=0;spawnBumps();state='playing';
}

const ETYPES=[
  {col:C.E1,speed:0.009,hp:1,pts:100},
  {col:C.E2,speed:0.007,hp:1,pts:150},
  {col:C.E3,speed:0.005,hp:2,pts:350},
];

function spawnWave(){
  const lvl=Math.floor(frame/1800),count=2+Math.min(lvl,5);
  for(let i=0;i<count;i++){
    const ti=Math.min(Math.floor(Math.random()*(1.5+lvl*0.4)),2);
    const et=ETYPES[ti];
    enemies.push({x:(Math.random()*2-1)*0.78,y:Math.random()<0.7?0:Math.random()*1.5,
      z:0.88+Math.random()*0.12,speed:et.speed*(1+Math.random()*0.3+lvl*0.12),
      col:et.col,hp:et.hp,pts:et.pts});
  }
}

function spawnBumps(){
  for(let i=0;i<6;i++)bumps.push({x:(Math.random()*2-1)*0.7,z:0.15+i*0.14});
}

function burst(e,n){
  const p=w2s(e.x,e.y,e.z);
  for(let i=0;i<n;i++){
    const a=(i/n)*Math.PI*2,sp=0.8+Math.random()*2;
    particles.push({x:p.x,y:p.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,life:18+Math.random()*16,col:e.col});
  }
}

let lastTS=0;

function update(dt){
  if(state!=='playing')return;
  frame++;
  camT+=dt*0.00065;
  camX=Math.sin(camT)*7+Math.sin(camT*2.3)*2.5;
  scroll=(scroll+dt*0.006)%1;

  const mx=(keys['ArrowLeft']||keys['KeyA']||T.left?-1:0)+(keys['ArrowRight']||keys['KeyD']||T.right?1:0);
  PL.vx+=mx*P_SPD*(dt/16);
  PL.vx*=Math.pow(P_FRIC,dt/16);
  PL.vx=Math.max(-0.14,Math.min(0.14,PL.vx));

  if(!PL.onGround){
    PL.vy+=GRAV*(dt/16);
    const hj=keys['Space']||keys['ArrowUp']||keys['KeyW']||T.jump;
    if(hj&&PL.vy>0.5)PL.vy*=0.93;
  }

  PL.x+=PL.vx*(dt/16);
  PL.y-=PL.vy*(dt/16);
  PL.x=Math.max(-0.85,Math.min(0.85,PL.x));
  if(PL.y>P_CEIL){PL.y=P_CEIL;PL.vy=0;}

  if(PL.y<=0){
    if(PL.vy>4&&Math.abs(PL.vx)>0.04){
      PL.vy=-(PL.vy*0.45+Math.abs(PL.vx)*18);PL.boosts=3;PL.onGround=false;
    }else{PL.y=0;PL.vy=0;PL.onGround=true;PL.boosts=2;}
  }

  for(const b of bumps){
    if(PL.onGround&&PL.y<=0.1&&Math.abs(PL.x-b.x)<0.12&&Math.abs(PL.vx)>0.06){
      PL.vy=J_VEL*1.1;PL.onGround=false;PL.boosts=3;
    }
  }

  if(PL.inv>0)PL.inv-=dt;
  if(PL.zapCD>0)PL.zapCD-=dt;
  if(fireCD>0)fireCD-=dt;

  if(fireCD<=0){bullets.push({x:PL.x,y:PL.y+0.5,z:0.01});fireCD=FIRE_INT;}

  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.z+=0.055*(dt/16);
    if(b.z>=1){bullets.splice(i,1);continue;}
    let hit=false;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];
      if(Math.abs(e.z-b.z)<0.055&&Math.abs(e.x-b.x)<0.22){
        e.hp--;if(e.hp<=0){burst(e,12);score+=e.pts;enemies.splice(j,1);}
        bullets.splice(i,1);hit=true;break;
      }
    }
    if(hit)continue;
  }

  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    e.z-=e.speed*(dt/16);
    if(e.z<=0.02){
      if(Math.abs(e.x-PL.x)<0.28&&PL.inv<=0){
        lives--;PL.inv=2200;
        if(lives<=0){hi=Math.max(hi,score);state='gameover';}
      }
      enemies.splice(i,1);
    }
  }

  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.life--;
    if(p.life<=0)particles.splice(i,1);
  }

  const wInt=Math.max(100,220-Math.floor(frame/1800)*18);
  if(frame%wInt===0)spawnWave();

  for(let i=bumps.length-1;i>=0;i--){
    if(bumps[i].z<=0)bumps[i]={x:(Math.random()*2-1)*0.7,z:0.95};
    bumps[i].z-=0.007*(dt/16);
  }
}

function drawTunnel(){
  g.fillStyle=C.SKY;
  const top=sliceAt(ND);
  g.fillRect(0,0,LW,Math.round(top.y));

  for(let d=ND;d>=1;d--){
    const cur=sliceAt(d),near=sliceAt(d-1);
    if(cur.hw<1)continue;
    const lx=Math.round(VPX+camX-cur.hw),rx=Math.round(VPX+camX+cur.hw);
    const sw=Math.max(2,rx-lx),sy=Math.round(cur.y),ny=Math.round(near.y);
    const fh=Math.max(1,ny-sy),tw=Math.max(1,Math.round(sw/NC));

    for(let c=0;c<NC;c++){
      const fx=lx+Math.round(c*sw/NC);
      const fw=Math.round((c+1)*sw/NC)-Math.round(c*sw/NC);
      const check=(c+Math.floor((ND-d+scroll*NC)*0.75))%2;
      g.fillStyle=check?C.FA:C.FB;
      g.fillRect(fx,sy,fw,fh);
      if(c>0){g.fillStyle=C.FG;g.fillRect(fx,sy,1,fh);}
    }

    for(let r=0;r<NR;r++){
      const wy=Math.round(sy-(r+1)*cur.wh/NR);
      const rh=Math.max(1,Math.round(cur.wh/NR));
      const isTop=r===NR-1;
      g.fillStyle=isTop?C.TB:C.TA;
      g.fillRect(lx,wy,tw,rh);g.fillRect(rx-tw,wy,tw,rh);
      if(isTop){
        g.fillStyle=C.RIM;
        g.fillRect(lx,wy,tw,1);g.fillRect(rx-tw,wy,tw,1);
      }
    }

    const ey=Math.round(sy-cur.wh),eh=Math.round(cur.wh+fh);
    g.fillStyle=(d%5===0)?C.RIM:C.RDIM;
    g.fillRect(lx,ey,1,eh);g.fillRect(rx-1,ey,1,eh);
  }

  const n0=sliceAt(0);
  g.fillStyle=C.FA;
  g.fillRect(0,Math.round(n0.y),LW,LH-Math.round(n0.y));

  const n1=sliceAt(1);
  const ml=Math.round(VPX+camX-n1.hw),mr=Math.round(VPX+camX+n1.hw);
  const mt=Math.round(n1.y-n1.wh),mb=Math.round(n1.y);
  g.fillStyle=C.RIM;
  g.fillRect(ml,mt,mr-ml,1);
  g.fillRect(ml,mt,1,mb-mt);
  g.fillRect(mr,mt,1,mb-mt);
}

function drawBumps(){
  for(const b of bumps){
    const p=w2s(b.x,0,b.z);
    if(p.sc<0.05)continue;
    const bw=Math.max(2,Math.round(10*p.sc)),bh=Math.max(1,Math.round(4*p.sc));
    g.fillStyle=C.BUMP;
    g.fillRect(p.x-bw/2,p.y-bh,bw,bh);
    g.fillStyle='#ffcc44';
    g.fillRect(p.x-bw/2,p.y-bh,bw,1);
  }
}

function drawPlayer(){
  if(PL.inv>0&&Math.floor(PL.inv/80)%2===0)return;
  const px=Math.round(VPX+camX+PL.x*NW);
  const py=Math.round(NY-PL.y*(NY-VPY)*WHF/NR);
  const pw=12,ph=16;
  g.fillStyle='rgba(0,0,0,0.5)';
  g.fillRect(px-pw/2+2,py-2,pw,3);
  g.fillStyle=C.PL;
  g.fillRect(px-pw/2,py-ph,pw,ph);
  g.fillStyle=C.PLH;
  g.fillRect(px-pw/2,py-ph,pw,4);
  g.fillStyle=C.PLD;
  g.fillRect(px+pw/2-3,py-ph+4,3,ph-4);
  g.fillStyle='#ffffff';
  g.fillRect(px-4,py-ph+6,2,3);
  g.fillRect(px+2,py-ph+6,2,3);
  if(!PL.onGround){
    for(let i=1;i<=3;i++){
      g.fillStyle=`rgba(255,0,0,${(4-i)/8})`;
      g.fillRect(px-pw/2,py+i*4-ph,pw,ph);
    }
  }
}

function drawEnemies(){
  enemies.slice().sort((a,b)=>b.z-a.z).forEach(e=>{
    const p=w2s(e.x,e.y,e.z);
    const ew=Math.max(2,Math.round(14*p.sc)),eh=Math.max(2,Math.round(14*p.sc));
    g.fillStyle=e.col;
    g.fillRect(p.x-ew/2,p.y-eh,ew,eh);
    g.fillStyle='#ffffff';
    g.fillRect(p.x-ew/2,p.y-eh,ew,1);
    g.fillStyle='rgba(0,0,0,0.4)';
    g.fillRect(p.x+ew/2-2,p.y-eh+1,2,eh-1);
    if(e.hp>1){g.fillStyle=C.HY;g.fillRect(p.x-1,p.y-eh-3,2,2);}
  });
}

function drawBullets(){
  for(const b of bullets){
    const cur=w2s(b.x,b.y,b.z),prev=w2s(b.x,b.y,Math.max(0,b.z-0.06));
    const bs=Math.max(1,Math.round(3*cur.sc));
    g.fillStyle='rgba(255,238,0,0.3)';
    g.fillRect(prev.x-1,prev.y-1,2,2);
    g.fillStyle=C.BLT;
    g.fillRect(cur.x-bs/2,cur.y-bs,bs,bs);
  }
}

function drawParticles(){
  for(const p of particles){
    const sz=Math.max(1,Math.round(3*(p.life/34)));
    g.fillStyle=p.col;
    g.globalAlpha=Math.min(1,p.life/18);
    g.fillRect(Math.round(p.x)-sz/2,Math.round(p.y)-sz/2,sz,sz);
  }
  g.globalAlpha=1;
}

function drawHUD(){
  g.font='bold 7px monospace';g.textBaseline='top';
  g.fillStyle='rgba(0,0,0,0.7)';g.fillRect(3,3,52,18);
  g.fillStyle=C.HC;g.textAlign='left';g.fillText('SCORE',6,5);
  g.fillStyle=C.HW;g.font='bold 9px monospace';
  g.fillText(String(score).padStart(6,'0'),6,13);
  g.fillStyle='rgba(0,0,0,0.7)';g.fillRect(LW-48,3,45,18);
  g.font='bold 7px monospace';g.fillStyle=C.HR;g.textAlign='right';
  g.fillText('LIVES',LW-6,5);
  for(let i=0;i<Math.max(0,lives);i++){
    g.fillStyle=C.HR;g.fillRect(LW-12-i*12,12,8,8);
    g.fillStyle=C.PLH;g.fillRect(LW-12-i*12,12,8,2);
  }
  const lvl=Math.floor(frame/1800)+1;
  g.fillStyle='rgba(0,0,0,0.7)';g.fillRect(LW/2-22,3,44,10);
  g.fillStyle=C.HY;g.textAlign='center';g.font='bold 7px monospace';
  g.fillText(`LVL  ${lvl}`,LW/2,5);
  const zapReady=PL.zapCD<=0;
  g.fillStyle='rgba(0,0,0,0.6)';g.fillRect(3,LH-14,72,11);
  g.fillStyle=zapReady?C.HY:C.DIM;g.textAlign='left';g.font='bold 7px monospace';
  g.fillText('Z:ZAP '+(zapReady?'[RDY]':`[${Math.ceil(PL.zapCD/1000)}s]`),6,LH-12);
  if('ontouchstart' in window){
    g.fillStyle='rgba(0,0,0,0.5)';g.fillRect(0,LH-30,LW,30);
    g.fillStyle=C.DIM;g.textAlign='center';g.font='bold 6px monospace';
    g.fillText('← MOVE →     TAP UPPER = JUMP     CENTER = ZAP',LW/2,LH-8);
  }
  g.textBaseline='alphabetic';
}

function drawTitle(){
  drawTunnel();
  g.fillStyle='rgba(0,0,0,0.68)';g.fillRect(0,0,LW,LH);
  g.fillStyle=C.PL;
  g.fillRect(0,LH/2-46,LW,1);g.fillRect(0,LH/2+32,LW,1);
  g.textAlign='center';g.textBaseline='top';
  g.font='bold 26px monospace';
  g.fillStyle='#440000';g.fillText('SUDS JACK',LW/2+2,LH/2-40+2);
  g.fillStyle='#ffffff';g.fillText('SUDS JACK',LW/2,LH/2-40);
  g.font='bold 7px monospace';
  g.fillStyle=C.HC;g.fillText('VOXEL PROTOTYPE',LW/2,LH/2-10);
  g.fillStyle=C.DIM;g.fillText('HYPER DAGGER TECH  ·  4X VOXELS',LW/2,LH/2);
  if(Math.floor(Date.now()/550)%2===0){g.fillStyle=C.HW;g.fillText('— PRESS ENTER  OR  TAP —',LW/2,LH/2+16);}
  g.fillStyle='#444444';g.fillText('A/D:MOVE   SPACE/W:JUMP+FLOAT   Z:SUPERZAP',LW/2,LH/2+36);
  if(hi>0){g.fillStyle=C.HY;g.fillText(`HI  ${hi}`,LW/2,LH/2-24);}
  g.textBaseline='alphabetic';
}

function drawGameOver(){
  drawTunnel();
  g.fillStyle='rgba(0,0,0,0.72)';g.fillRect(0,0,LW,LH);
  g.fillStyle=C.PL;
  g.fillRect(0,LH/2-36,LW,1);g.fillRect(0,LH/2+28,LW,1);
  g.textAlign='center';g.textBaseline='top';
  g.font='bold 22px monospace';
  g.fillStyle='#440000';g.fillText('GAME OVER',LW/2+2,LH/2-32+2);
  g.fillStyle='#ffffff';g.fillText('GAME OVER',LW/2,LH/2-32);
  g.font='bold 8px monospace';
  g.fillStyle=C.HC;g.fillText(`SCORE  ${score}`,LW/2,LH/2-6);
  g.fillStyle=C.HY;g.fillText(`HI  ${hi}`,LW/2,LH/2+6);
  if(Math.floor(Date.now()/550)%2===0){g.fillStyle=C.HW;g.fillText('— ENTER TO RETRY —',LW/2,LH/2+18);}
  g.textBaseline='alphabetic';
}

function render(){
  g.fillStyle=C.BG;g.fillRect(0,0,LW,LH);
  if(state==='title')drawTitle();
  else if(state==='gameover')drawGameOver();
  else{drawTunnel();drawBumps();drawBullets();drawEnemies();drawPlayer();drawParticles();drawHUD();}
  g.fillStyle='rgba(0,0,0,0.12)';
  for(let y=0;y<LH;y+=2)g.fillRect(0,y,LW,1);
  g.fillStyle='rgba(0,100,255,0.04)';
  g.fillRect(0,0,LW,6);g.fillRect(0,LH-6,LW,6);
  ctx.drawImage(off,0,0,canvas.width,canvas.height);
}

function loop(ts){
  const dt=Math.min(ts-lastTS,50);
  lastTS=ts;update(dt);render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(ts=>{lastTS=ts;requestAnimationFrame(loop);});