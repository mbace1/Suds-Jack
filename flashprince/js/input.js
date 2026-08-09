// Flash Prince input, aligned with the house dual-stick pattern used by Tinyhawk/Toko Drop.
const KEYS={left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],up:['ArrowUp','KeyW'],down:['ArrowDown','KeyS'],jump:['Space','ArrowUp','KeyW'],fire:['KeyX','KeyJ','Enter'],gun:['KeyE','ShiftLeft','ShiftRight'],pause:['Escape','KeyP']};
const BUFFER_FRAMES={jump:8,fire:6,gun:6},STICK_R=60,DZ=.18;
const clamp=(v)=>Math.max(-1,Math.min(1,v));
export class Input{
 constructor(scr){
  this.scr=scr;this.held=new Set();this.dir=0;this.dirHeld=0;this.up=false;this.down=false;this.jump=false;this.fire=false;this.gun=false;this.jumpPress=false;this.firePress=false;this.gunPress=false;this.pausePress=false;this.anyPress=false;this.buffer={jump:0,fire:0,gun:0};this.padPrev=[];
  this.left={active:false,id:null,ox:0,oy:0,dx:0,dy:0};this.right={active:false,id:null,ox:0,oy:0,dx:0,dy:0};
  this.scheme='sticks';try{const s=localStorage.getItem('flashPrinceControlsV2');if(s==='buttons'||s==='sticks')this.scheme=s}catch{}
  document.body.classList.toggle('buttons',this.scheme==='buttons');
  addEventListener('keydown',e=>{if(e.repeat)return;const ks=this.names(e.code);if(!ks.length)return;e.preventDefault();for(const k of ks){this.held.add(k);this.edge(k)}});
  addEventListener('keyup',e=>{const ks=this.names(e.code);if(!ks.length)return;e.preventDefault();for(const k of ks)this.held.delete(k)});addEventListener('blur',()=>this.clear());
  this.bindButtons();this.bindSticks();this.bindMenu();
 }
 clear(){this.held.clear();for(const s of [this.left,this.right]){s.active=false;s.id=null;s.dx=s.dy=0;this.paintStick(s)} }
 names(code){const out=[];for(const k in KEYS)if(KEYS[k].includes(code))out.push(k);return out}
 remember(k){if(BUFFER_FRAMES[k])this.buffer[k]=BUFFER_FRAMES[k]}
 edge(k){if(k==='jump'){this.jumpPress=true;this.remember('jump')}if(k==='fire'){this.firePress=true;this.remember('fire')}if(k==='gun'){this.gunPress=true;this.remember('gun')}if(k==='pause')this.pausePress=true;this.anyPress=true}
 consume(k){if(!(k in this.buffer))return;this.buffer[k]=0;if(k==='jump')this.jumpPress=false;if(k==='fire')this.firePress=false;if(k==='gun')this.gunPress=false}
 bindButtons(){document.querySelectorAll('[data-game-key]').forEach(b=>{const k=b.dataset.gameKey;const on=e=>{e.preventDefault();if(!this.held.has(k)){this.held.add(k);this.edge(k)}b.classList.add('on');b.setPointerCapture?.(e.pointerId)};const off=e=>{e.preventDefault();this.held.delete(k);b.classList.remove('on')};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off)})}
 bindMenu(){const gear=document.getElementById('gear'),menu=document.getElementById('control-menu');gear?.addEventListener('click',e=>{e.stopPropagation();menu?.classList.toggle('open')});document.querySelectorAll('[data-scheme]').forEach(b=>b.addEventListener('click',()=>{this.scheme=b.dataset.scheme;try{localStorage.setItem('flashPrinceControlsV2',this.scheme)}catch{}document.body.classList.toggle('buttons',this.scheme==='buttons');menu?.classList.remove('open');this.clear()}))}
 bindSticks(){
  if('ontouchstart'in window||matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
  document.querySelectorAll('[data-stick]').forEach(el=>{const side=el.dataset.stick,s=this[side];const position=e=>{const box=el.getBoundingClientRect();s.ox=box.left+box.width/2;s.oy=box.top+box.height/2;s.dx=e.clientX-s.ox;s.dy=e.clientY-s.oy;const m=Math.hypot(s.dx,s.dy);if(m>STICK_R){s.dx=s.dx/m*STICK_R;s.dy=s.dy/m*STICK_R}this.paintStick(s);return m};const down=e=>{if(this.scheme!=='sticks')return;e.preventDefault();document.body.classList.add('touch');s.active=true;s.id=e.pointerId;const m=position(e);if(side==='right'&&(m<STICK_R*.24||s.dy<-STICK_R*.2))this.edge('jump');el.setPointerCapture?.(e.pointerId)};const move=e=>{if(!s.active||s.id!==e.pointerId)return;e.preventDefault();position(e)};const up=e=>{if(s.id!==e.pointerId)return;e.preventDefault();s.active=false;s.id=null;s.dx=s.dy=0;this.paintStick(s)};el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)})
 }
 paintStick(s){const el=document.querySelector(`[data-stick="${s===this.left?'left':'right'}"]`);if(el){el.style.setProperty('--dx',`${s.dx}px`);el.style.setProperty('--dy',`${s.dy}px`)}}
 stick(s){if(!s.active)return{x:0,y:0};let x=clamp(s.dx/STICK_R),y=clamp(s.dy/STICK_R);const m=Math.hypot(x,y);if(m<DZ)return{x:0,y:0};if(m>1){x/=m;y/=m}return{x,y}}
 setZones(){}
 poll(){
  const wasJump=this.jump,wasFire=this.fire,wasGun=this.gun;let L=this.held.has('left'),R=this.held.has('right'),U=this.held.has('up'),D=this.held.has('down'),J=this.held.has('jump')||U,F=this.held.has('fire'),G=this.held.has('gun');
  if(this.scheme==='sticks'){
   const l=this.stick(this.left),r=this.stick(this.right);L=L||l.x<-.28;R=R||l.x>.28;U=U||l.y<-.34;D=D||l.y>.34;J=J||r.y<-.25;
   // right-stick down is the same physical downward commitment as crouch/drop.
   D=D||r.y>.45;
  }
  const pads=navigator.getGamepads?navigator.getGamepads():[];for(const p of pads){if(!p)continue;const ax=p.axes[0]??0,ay=p.axes[1]??0,ry=p.axes[3]??0;L=L||ax<-.4||p.buttons[14]?.pressed;R=R||ax>.4||p.buttons[15]?.pressed;U=U||ay<-.5||p.buttons[12]?.pressed;D=D||ay>.5||p.buttons[13]?.pressed;J=J||ry<-.35||p.buttons[0]?.pressed||p.buttons[11]?.pressed;F=F||p.buttons[2]?.pressed||p.buttons[7]?.pressed||p.buttons[5]?.pressed;G=G||p.buttons[3]?.pressed||p.buttons[1]?.pressed;if(p.buttons[9]?.pressed&&!this.padPrev[9])this.pausePress=true;this.padPrev=p.buttons.map(b=>b.pressed);break}
  const dir=R&&!L?1:L&&!R?-1:0;this.dirHeld=dir&&dir===this.dir?this.dirHeld+1:0;this.dir=dir;this.up=U;this.down=D;J=J||U;
  if(J&&!wasJump){this.jumpPress=true;this.remember('jump')}if(F&&!wasFire){this.firePress=true;this.remember('fire')}if(G&&!wasGun){this.gunPress=true;this.remember('gun')}if((J&&!wasJump)||(F&&!wasFire)||(G&&!wasGun))this.anyPress=true;this.jump=J;this.fire=F;this.gun=G;this.jumpPress=this.jumpPress||this.buffer.jump>0;this.firePress=this.firePress||this.buffer.fire>0;this.gunPress=this.gunPress||this.buffer.gun>0;
 }
 flush(){this.jumpPress=this.firePress=this.gunPress=false;this.pausePress=false;this.anyPress=false;for(const k of Object.keys(this.buffer))if(this.buffer[k]>0)this.buffer[k]--}
}
