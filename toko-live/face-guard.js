import { drawFace } from '../toko/js/face.js';

const stage=document.querySelector('.stage');
const main=document.querySelector('#toko-stage');
if(stage&&main){
  let guard=document.querySelector('#toko-approved-face');
  if(!guard){
    guard=document.createElement('canvas');
    guard.id='toko-approved-face';
    guard.width=720;guard.height=720;
    guard.setAttribute('aria-label','Toko Midori approved face');
    Object.assign(guard.style,{position:'absolute',inset:'50% auto auto 50%',transform:'translate(-50%,-50%)',width:'min(76vh,82vw)',height:'min(76vh,82vw)',maxWidth:'720px',maxHeight:'720px',pointerEvents:'none',zIndex:'1'});
    stage.appendChild(guard);
  }
  const ctx=guard.getContext('2d');
  const paint=()=>{ctx.clearRect(0,0,720,720);ctx.fillStyle='#050507';ctx.beginPath();ctx.arc(360,300,176,0,Math.PI*2);ctx.fill();drawFace(ctx,205,145,310,{color:'#fff',open:0});};
  const mainHasInk=()=>{try{const c=main.getContext('2d',{willReadFrequently:true});const d=c.getImageData(0,0,main.width,main.height).data;for(let i=3;i<d.length;i+=64)if(d[i]&&d[i-3]+d[i-2]+d[i-1]>18)return true}catch{}return false};
  paint();
  setTimeout(()=>{guard.style.display=mainHasInk()?'none':'block'},900);
  addEventListener('resize',()=>{if(guard.style.display!=='none')paint()},{passive:true});
}
