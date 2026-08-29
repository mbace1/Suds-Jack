import { FILL_MAT, LINE_MAT, EYE_MAT, C } from './shared.js?v=12';

// SKLTR v36 — first arena-to-arena transformation system.
// Gameplay/collision stay untouched. Representation changes hard between arena families.
const THEMES={
  wire:{bg:'#000000',fill:0x000000,line:0xffffff,shot:0xa9ecff,enemy:0xffffff,hazard:0xff5533,filter:'none'},
  paper:{bg:'#d7c9aa',fill:0xd7c9aa,line:0x241f1a,shot:0x1b6fb8,enemy:0x241f1a,hazard:0xb94325,filter:'contrast(1.06) saturate(.82)'},
  signal:{bg:'#030013',fill:0x09051e,line:0x82fff0,shot:0xfff08b,enemy:0xff66dd,hazard:0xff445f,filter:'contrast(1.18) saturate(1.35)'},
  physical:{bg:'#23262a',fill:0x454a50,line:0xf2f2ec,shot:0xbfe8ff,enemy:0xf2f2ec,hazard:0xff704c,filter:'contrast(1.12) saturate(.72) brightness(.94)'},
  kill:{bg:'#080000',fill:0x080000,line:0xffe8df,shot:0xffffff,enemy:0xff9a8e,hazard:0xff2b2b,filter:'contrast(1.25) saturate(1.15)'}
};
let current='wire';
function choose(name=''){
  if(name.includes('TORTOISE'))return 'paper';
  if(name.includes('WASP'))return 'signal';
  if(name.includes('MACHINE'))return 'physical';
  if(name.includes('KILL FLOOR')||name.includes('LAST STAND'))return 'kill';
  return 'wire';
}
function apply(key){
  if(!THEMES[key]||key===current)return;
  current=key;const t=THEMES[key];
  FILL_MAT.color.setHex(t.fill);LINE_MAT.color.setHex(t.line);EYE_MAT.color.setHex(t.line);
  C.fill=t.fill;C.line=t.line;C.shot=t.shot;C.enemy=t.enemy;C.hazard=t.hazard;
  document.body.style.background=t.bg;
  const c=document.getElementById('canvas-game');if(c){c.style.transition='filter .32s ease, opacity .18s ease';c.style.filter=t.filter;c.style.opacity='.76';requestAnimationFrame(()=>requestAnimationFrame(()=>c.style.opacity='1'));}
  document.documentElement.dataset.skltrTheme=key;
  window.dispatchEvent(new CustomEvent('skltr-theme',{detail:{theme:key}}));
}
addEventListener('skltr-arena',e=>apply(choose(e.detail?.arena||'')));
apply('wire');
