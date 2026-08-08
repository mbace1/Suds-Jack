const KEYS={left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],up:['ArrowUp','KeyW'],down:['ArrowDown','KeyS'],jump:['Space','ArrowUp','KeyW'],fire:['KeyX','KeyJ','Enter'],gun:['KeyE','ShiftLeft','ShiftRight'],pause:['Escape','KeyP']};
const BUFFER_FRAMES={jump:8,fire:6,gun:6};
export class Input{
  constructor(scr){
    this.scr=scr;this.held=new Set();this.dir=0;this.dirHeld=0;this.up=false;this.down=false;this.jump=false;this.fire=false;this.gun=false;this.jumpPress=false;this.firePress=false;this.gunPress=false;this.pausePress=false;this.anyPress=false;this.buffer={jump:0,fire:0,gun:0};this.padPrev=[];
    addEventListener('keydown',e=>{if(e.repeat)return;const ks=this.names(e.code);if(!ks.length)return;e.preventDefault();for(const k of ks){this.held.add(k);this.edge(k)}});
    addEventListener('keyup',e=>{const ks=this.names(e.code);if(!ks.length)return;e.preventDefault();for(const k of ks)this.held.delete(k)});
    addEventListener('blur',()=>this.held.clear());
    document.querySelectorAll('[data-game-key]').forEach(b=>{
      const k=b.dataset.gameKey;
      const on=e=>{e.preventDefault();if(!this.held.has(k)){this.held.add(k);this.edge(k)}b.classList.add('on')};
      const off=e=>{e.preventDefault();this.held.delete(k);b.classList.remove('on')};
      b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',e=>{if(e.buttons===0)off(e)});
    });
  }
  names(code){const out=[];for(const k in KEYS)if(KEYS[k].includes(code))out.push(k);return out}
  remember(k){if(BUFFER_FRAMES[k])this.buffer[k]=BUFFER_FRAMES[k]}
  edge(k){if(k==='jump'){this.jumpPress=true;this.remember('jump')}if(k==='fire'){this.firePress=true;this.remember('fire')}if(k==='gun'){this.gunPress=true;this.remember('gun')}if(k==='pause')this.pausePress=true;this.anyPress=true}
  consume(k){if(!(k in this.buffer))return;this.buffer[k]=0;if(k==='jump')this.jumpPress=false;if(k==='fire')this.firePress=false;if(k==='gun')this.gunPress=false}
  setZones(){}
  poll(){
    const wasJump=this.jump,wasFire=this.fire,wasGun=this.gun;
    let L=this.held.has('left'),R=this.held.has('right'),U=this.held.has('up'),D=this.held.has('down');
    let J=this.held.has('jump')||U,F=this.held.has('fire'),G=this.held.has('gun');
    const pads=navigator.getGamepads?navigator.getGamepads():[];
    for(const p of pads){if(!p)continue;const ax=p.axes[0]??0,ay=p.axes[1]??0;L=L||ax<-.4||p.buttons[14]?.pressed;R=R||ax>.4||p.buttons[15]?.pressed;U=U||ay<-.5||p.buttons[12]?.pressed;D=D||ay>.5||p.buttons[13]?.pressed;J=J||p.buttons[0]?.pressed;F=F||p.buttons[2]?.pressed||p.buttons[7]?.pressed||p.buttons[5]?.pressed;G=G||p.buttons[3]?.pressed||p.buttons[1]?.pressed;if(p.buttons[9]?.pressed&&!this.padPrev[9])this.pausePress=true;this.padPrev=p.buttons.map(b=>b.pressed);break}
    const dir=R&&!L?1:L&&!R?-1:0;this.dirHeld=dir&&dir===this.dir?this.dirHeld+1:0;this.dir=dir;this.up=U;this.down=D;
    if(J&&!wasJump){this.jumpPress=true;this.remember('jump')}if(F&&!wasFire){this.firePress=true;this.remember('fire')}if(G&&!wasGun){this.gunPress=true;this.remember('gun')}if((J&&!wasJump)||(F&&!wasFire)||(G&&!wasGun))this.anyPress=true;
    this.jump=J;this.fire=F;this.gun=G;this.jumpPress=this.jumpPress||this.buffer.jump>0;this.firePress=this.firePress||this.buffer.fire>0;this.gunPress=this.gunPress||this.buffer.gun>0;
  }
  flush(){this.jumpPress=this.firePress=this.gunPress=false;this.pausePress=false;this.anyPress=false;for(const k of Object.keys(this.buffer))if(this.buffer[k]>0)this.buffer[k]--}
}
