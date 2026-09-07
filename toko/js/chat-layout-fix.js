// TOKO MIDORI GAMES — counter layout guard v1
// The base counter was built for a larger authored menu. The newer contextual
// 4+Leave rack must never steal the transcript viewport or visually cover text.

const STYLE_ID='toko-chat-layout-guard';
const CSS=`
.toko-chat .tc-body{
  display:grid !important;
  grid-template-rows:minmax(150px,1fr) auto auto auto auto;
  min-width:0;min-height:0;overflow:hidden;
}
.toko-chat .tc-log{
  min-height:150px !important;
  max-height:none !important;
  overflow-y:auto;
  overscroll-behavior:contain;
}
.toko-chat .tc-note-row,.toko-chat .tc-say-row,.toko-chat .tc-foot{min-height:0;}
.toko-chat .tc-menu{
  min-height:0;
  max-height:126px;
  overflow-y:auto;
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:2px 8px;
  padding:8px 10px 10px;
  background:var(--tc-bg);
  position:relative;
  z-index:0;
}
.toko-chat .tc-menu button{
  min-width:0;
  min-height:38px;
  padding:5px 7px;
  line-height:1.25;
  white-space:normal;
}
.toko-chat .tc-menu button:last-child:nth-child(odd){grid-column:1/-1;min-height:34px;}
.toko-chat.tc-menu-compact .tc-menu{max-height:92px;}
.toko-chat.tc-menu-compact .tc-menu button{min-height:34px;font-size:11px;}
@media(max-width:560px){
  .toko-chat.is-open .tc-panel{max-height:min(620px,calc(100dvh - 20px));}
  .toko-chat .tc-panel{grid-template-rows:auto minmax(0,1fr);}
  .toko-chat .tc-body{grid-template-rows:minmax(160px,1fr) auto auto auto auto;}
  .toko-chat .tc-log{min-height:160px !important;padding:12px 14px;}
  .toko-chat .tc-menu{max-height:118px;grid-template-columns:repeat(2,minmax(0,1fr)) !important;padding:6px 8px 8px;}
  .toko-chat .tc-menu button{min-height:36px;font-size:11px;letter-spacing:.02em;padding:4px 6px;}
  .toko-chat .tc-portrait{padding:6px 12px;gap:8px;}
  .toko-chat .tc-portrait canvas{width:54px !important;height:71px !important;}
  .toko-chat .tc-foot{padding:4px 8px;gap:6px;}
  .toko-chat .tc-foot button{min-height:36px;padding:0 8px;}
}
`;
function install(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=CSS;document.head.appendChild(s);
}
function audit(root){
  const log=root.querySelector('.tc-log'),menu=root.querySelector('.tc-menu');
  if(!log||!menu||menu.hidden)return true;
  const a=log.getBoundingClientRect(),b=menu.getBoundingClientRect();
  const overlaps=b.top<a.bottom-1;
  const tooSmall=a.height<135;
  root.classList.toggle('tc-menu-compact',overlaps||tooSmall);
  root.dataset.layoutOk=String(!overlaps&&a.height>=120);
  return !overlaps&&a.height>=120;
}
export function guardCounter(root=document){
  install();
  const chats=[...root.querySelectorAll('.toko-chat')];
  const observers=[];
  for(const chat of chats){
    const check=()=>requestAnimationFrame(()=>audit(chat));
    const ro=new ResizeObserver(check);ro.observe(chat);
    const mo=new MutationObserver(check);mo.observe(chat,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
    check();observers.push({ro,mo});
  }
  return {audit:()=>chats.map(c=>audit(c)),destroy(){observers.forEach(x=>{x.ro.disconnect();x.mo.disconnect()})}};
}
const boot=()=>{const run=()=>{if(document.querySelector('.toko-chat'))globalThis.TokoChatLayout=guardCounter(document);else requestAnimationFrame(run)};run()};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
