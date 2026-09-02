import { GAMES } from './games.js?v=55';
import { ART } from './art.js?v=20';
if (!GAMES.some(g => g.id === 'tokolive')) GAMES.unshift({id:'tokolive',status:'active',note:'v36 — semantic reactions + clean opinion memory',title:'Toko Live',tagline:'Talk to Toko face to face. The approved Toko face is the only Toko image used.',lineage:'Sierra conversation × virtual character × local small-brain',tags:['conversation','canvas','local-ai'],controls:'type and press Enter · tap suggested topics · Esc / HOME returns',path:'toko-live/',inRepo:true,accent:'#f0027f',art:'tokolive'});
ART.tokolive ||= (g,a)=>{
  g.p(0,0,128,72,'#f0027f');
  const cx=64, cy=33;
  const line=(x0,y0,x1,y1)=>g.line(x0,y0,x1,y1,'#fff');
  const arc=(cx0,cy0,r,a0,a1,steps=18)=>{let px=cx0+Math.cos(a0)*r,py=cy0+Math.sin(a0)*r;for(let i=1;i<=steps;i++){const t=a0+(a1-a0)*i/steps,nx=cx0+Math.cos(t)*r,ny=cy0+Math.sin(t)*r;line(px,py,nx,ny);px=nx;py=ny;}};
  for(const side of [-1,1]){
    const ex=cx+side*21;
    arc(ex,cy-12,13,Math.PI,Math.PI*2,12);
    line(ex-13,cy-12,ex-13,cy-5);
    line(ex+13,cy-12,ex+13,cy-5);
  }
  arc(cx,cy+7,34,0.07,Math.PI-0.07,22);
  arc(cx,cy+7,13,0.18,Math.PI-0.18,14);
};
