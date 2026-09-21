import { svgFace } from './face.js';
const targets=['masthead','marks','lockups','heads','carriers','sheet','lab','rest','credit-badge'];
const face=()=>svgFace({color:'#fff',ground:'#f0027f',px:2,pad:8});
function apply(){for(const id of targets){const el=document.getElementById(id);if(!el)continue;el.innerHTML=face();const svg=el.querySelector('svg');if(svg){svg.style.width='100%';svg.style.height='100%';svg.style.maxWidth='320px';svg.style.display='block';svg.style.margin='0 auto'}}}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>requestAnimationFrame(apply),{once:true});else requestAnimationFrame(apply);
setTimeout(apply,250);
