// Radio Free Helsinki — cheap reusable state layers.
// Geometry remains scene-specific; weather/time/activity are separate overlays.
import { PAL } from './palette.js?v=37';
import { mix, shade, bayer } from './screen.js?v=37';
const W=128,H=152; const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d);
export function sceneState(seed=0){
  const hour=new Date().getHours();
  const night=hour<7||hour>=19;
  const modes=['dry','dry','rain','busy'];
  return {night,mode:modes[Math.abs(seed)%modes.length]};
}
export function drawSceneState(scr,t,d,state={}){
  if(state.night){scr.px(0,0,W,H,shade('#020509',.13)); for(let i=0;i<13;i++){const x=(i*37+11)%W,y=28+(i*19)%58; if((i+Math.floor(t*.35))%4) scr.px(x,y,2,2,shade(ink(d),.2));}}
  if(state.mode==='rain'){
    for(let i=0;i<30;i++){const x=(i*29+Math.floor(t*31))%W,y=(i*43+Math.floor(t*58))%H;if(bayer(i&3,(i>>2)&3)<.72)scr.px(x,y,1,3,shade(ink(d),.32));}
    const phase=Math.floor(t*7)%19; for(let x=-phase;x<W;x+=23)scr.px(x,143,10,1,shade(ink(d),.18));
  }
  if(state.mode==='busy'){
    for(let i=0;i<4;i++){const x=((t*(7+i*1.7)+i*31)%(W+18))-9,y=124+(i%2)*7; scr.px(x,y,2,3,shade(ink(d),.58)); scr.px(x-1,y+3,4,6,shade(ink(d),.5));}
  }
}