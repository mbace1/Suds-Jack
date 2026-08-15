// EERI dev FX layer. It deliberately consumes the existing window.__eeri
// debug seam instead of owning gameplay. This makes the layer removable and
// lets Claude port approved effects into main.js/audio.js later without
// changing level logic during look/feel iteration.

const TAU = Math.PI * 2;

class DevSFX {
  constructor() { this.ctx = null; this.master = null; this.on = true; this.noise = null; }
  ensure() {
    if (!this.on) return false;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.35);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }
  setOn(v) { this.on = !!v; if (this.master) this.master.gain.value = this.on ? 0.22 : 0; }
  tone(freq, dur, type='triangle', gain=.16, end=1) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * end), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  }
  burst(dur=.1, gain=.18, freq=500, q=1) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur);
  }
  ui() { this.tone(520,.06,'square',.08,1.15); }
  pickup() { this.tone(720,.07,'triangle',.12,1.35); setTimeout(()=>this.tone(980,.08,'triangle',.09,1.2),45); }
  golden() { this.tone(520,.12,'sine',.12,1.8); setTimeout(()=>this.tone(1040,.18,'triangle',.12,1.25),65); }
  stomp() { this.burst(.08,.22,270,1.8); this.tone(190,.12,'square',.12,1.7); }
  dig() { this.burst(.18,.23,220,.8); this.burst(.08,.11,950,2.4); }
  wall() { this.burst(.2,.28,150,.7); this.tone(80,.2,'sine',.14,.7); }
  mount() { this.tone(170,.12,'sawtooth',.09,1.8); this.tone(340,.1,'triangle',.08,1.25); }
  heavy() { this.burst(.16,.25,190,1); this.tone(95,.28,'sine',.13,.65); }
  clear() {
    [0,90,180,280].forEach((ms,i)=>setTimeout(()=>this.tone([440,554,660,880][i],.22,'triangle',.11,1.04),ms));
  }
}

export class RuntimeFX {
  constructor({ canvas, frame, getGame }) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.frame = frame; this.getGame = getGame;
    this.enabled = true; this.hitboxes = false; this.extraSfx = true; this.particles = [];
    this.prev = null; this.sfx = new DevSFX(); this._last = performance.now();
    this.resize = this.resize.bind(this); this.tick = this.tick.bind(this);
    addEventListener('resize', this.resize); this.resize(); requestAnimationFrame(this.tick);
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(innerWidth * dpr); this.canvas.height = Math.round(innerHeight * dpr);
    this.canvas.style.width = innerWidth + 'px'; this.canvas.style.height = innerHeight + 'px';
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  setEnabled(v) { this.enabled = !!v; }
  setHitboxes(v) { this.hitboxes = !!v; }
  setSfx(v) { this.extraSfx = !!v; this.sfx.setOn(v); }
  unlockAudioFromGame() {
    try {
      const doc = this.frame?.contentDocument;
      if (!doc || doc.__eeriFxUnlockBound) return;
      doc.__eeriFxUnlockBound = true;
      const unlock = () => this.sfx.ensure();
      doc.addEventListener('pointerdown', unlock, { once: true, capture: true });
      doc.addEventListener('keydown', unlock, { once: true, capture: true });
    } catch (_) {}
  }
  project(x,y) {
    const g = this.getGame(); if (!g?.debug?.camera) return null;
    const cam = g.debug.camera();
    const rect = this.frame ? this.frame.getBoundingClientRect() : { left:0, top:0, width:innerWidth, height:innerHeight };
    const fov = 24 * Math.PI / 180, halfH = cam.z * Math.tan(fov/2), halfW = halfH * (rect.width/rect.height);
    return {
      x: rect.left + rect.width * (.5 + (x - cam.x) / (2*halfW)),
      y: rect.top + rect.height * (.5 - (y - (cam.y - .4)) / (2*halfH)),
    };
  }
  emitWorld(x,y,kind='dust',count=10) { const p=this.project(x,y); if (p) this.emit(p.x,p.y,kind,count); }
  emit(x,y,kind='dust',count=10) {
    if (!this.enabled) return;
    const specs = {
      dust:  { life:.55, speed:70, grav:90, size:[4,10], tones:['#9b744c','#c49a6c','#705239'] },
      spark: { life:.42, speed:95, grav:40, size:[2,6], tones:['#fff4bd','#ffc63f','#ffffff'] },
      metal: { life:.48, speed:110,grav:150,size:[3,7], tones:['#d9e2e8','#89959e','#ffc63f'] },
      brick: { life:.62, speed:125,grav:170,size:[5,10],tones:['#b85d45','#8f4738','#d08a66'] },
      confetti:{life:1.1,speed:150,grav:70,size:[4,9], tones:['#ffc63f','#62b6e7','#7ccf87','#ffffff','#e47b67']},
    };
    const s = specs[kind] || specs.dust;
    for (let i=0;i<count;i++) {
      const a = Math.random()*TAU, sp=s.speed*(.35+Math.random()*.75);
      this.particles.push({ x,y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - sp*.35, age:0, life:s.life*(.75+Math.random()*.5),
        grav:s.grav, size:s.size[0]+Math.random()*(s.size[1]-s.size[0]), color:s.tones[(Math.random()*s.tones.length)|0], rot:Math.random()*TAU, vr:(Math.random()-.5)*10 });
    }
  }
  sample(g) {
    const d=g?.debug; if (!d) return null;
    return {
      site: g.site?.(), mode:g.mode?.(), bolts:g.collected?.(), counts:d.counts?.(), stomps:d.stomps?.(),
      bank:d.bank?.(), wall:d.wall?.(), girder:d.girder?.(), cleared:d.cleared?.(),
      grounded:!!g.player?.grounded, px:g.player?.x, py:g.player?.y,
    };
  }
  detect(g,cur) {
    const p=this.prev; if (!p) return;
    const playerPos=()=>({x:cur.px||0,y:(cur.py||0)+.8});
    if (cur.site !== p.site) { this.particles.length=0; return; }
    if ((cur.bolts||0) > (p.bolts||0)) { const q=playerPos(); this.emitWorld(q.x,q.y,'spark',9); if(this.extraSfx)this.sfx.pickup(); }
    if ((cur.counts?.golden||0) > (p.counts?.golden||0)) { const q=playerPos(); this.emitWorld(q.x,q.y,'confetti',18); if(this.extraSfx)this.sfx.golden(); }
    if ((cur.stomps||0) > (p.stomps||0)) { const q=playerPos(); this.emitWorld(q.x,q.y-.55,'metal',12); if(this.extraSfx)this.sfx.stomp(); }
    if (!p.grounded && cur.grounded) { const q=playerPos(); this.emitWorld(q.x,q.y-.75,'dust',5); }
    if (p.mode !== cur.mode && cur.mode === 'mounting') { const e=g.debug.excPos?.(); if(e)this.emitWorld(e.x,e.y+1.2,'spark',12); if(this.extraSfx)this.sfx.mount(); }
    if (p.bank?.remaining != null && cur.bank?.remaining != null && cur.bank.remaining < p.bank.remaining) {
      const e=g.debug.excPos?.(); if(e)this.emitWorld(e.x + (g.exc?.face||1)*2.1,e.y+1,'dust',22); if(this.extraSfx)this.sfx.dig();
    }
    if (p.wall?.hits != null && cur.wall?.hits != null && cur.wall.hits > p.wall.hits) {
      const e=g.debug.excPos?.(); if(e)this.emitWorld(e.x + (g.exc?.face||1)*3.1,e.y+1.2,'brick',26); if(this.extraSfx)this.sfx.wall();
    }
    if (p.girder?.state != null && cur.girder?.state != null && cur.girder.state !== p.girder.state) {
      const e=g.debug.excPos?.(); if(e)this.emitWorld(e.x,e.y+1,'metal',18); if(this.extraSfx)this.sfx.heavy();
    }
    if (!p.cleared && cur.cleared) { this.emit(innerWidth*.5,innerHeight*.42,'confetti',60); if(this.extraSfx)this.sfx.clear(); }
  }
  drawHitboxes(g) {
    if (!this.hitboxes || !g?.player) return;
    const ctx=this.ctx;
    const drawBox=(x,y,hw,h,label,color)=>{
      const a=this.project(x-hw,y), b=this.project(x+hw,y+h); if(!a||!b)return;
      const left=Math.min(a.x,b.x), top=Math.min(a.y,b.y), w=Math.abs(b.x-a.x), hh=Math.abs(b.y-a.y);
      ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.strokeRect(left,top,w,hh); ctx.fillStyle=color; ctx.font='10px ui-monospace, monospace'; ctx.fillText(label,left+2,top-3); ctx.restore();
    };
    drawBox(g.player.x,g.player.y,g.player.hw,g.player.h,'PLAYER','#80e39b');
    const e=g.exc; if(e) drawBox(e.x,e.y,e.hw||1.7,e.h||2.8,'MACHINE','#ffc63f');
    for (const r of g.debug.robots?.()||[]) drawBox(r.x,r.y,.45,r.h||.8,r.kind||'BOT','#ff8b75');
  }
  tick(now) {
    const dt=Math.min(.05,(now-this._last)/1000||.016); this._last=now;
    this.unlockAudioFromGame();
    const g=this.getGame(); const cur=g?this.sample(g):null;
    if (cur) { this.detect(g,cur); this.prev=cur; }
    const ctx=this.ctx; ctx.clearRect(0,0,innerWidth,innerHeight);
    for (let i=this.particles.length-1;i>=0;i--) {
      const p=this.particles[i]; p.age+=dt; if(p.age>=p.life){this.particles.splice(i,1);continue;}
      p.vy+=p.grav*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.vr*dt;
      const a=1-p.age/p.life; ctx.save(); ctx.globalAlpha=a; ctx.fillStyle=p.color; ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); ctx.restore();
    }
    if (g) this.drawHitboxes(g);
    requestAnimationFrame(this.tick);
  }
}
