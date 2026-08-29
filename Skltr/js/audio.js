// Tiny WebAudio bleep kit — v20 sharpens impact hierarchy without adding assets.
class AudioSystem {
  constructor(){this._ctx=null;this._last=0;}
  _ensure(){if(!this._ctx)this._ctx=new AudioContext();if(this._ctx.state==='suspended')this._ctx.resume();return this._ctx;}
  _tone(freq,dur,type='sine',vol=.2,freqEnd=null){try{const ctx=this._ensure(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type=type;osc.frequency.setValueAtTime(freq,ctx.currentTime);if(freqEnd)osc.frequency.exponentialRampToValueAtTime(freqEnd,ctx.currentTime+dur);gain.gain.setValueAtTime(vol,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);osc.start();osc.stop(ctx.currentTime+dur);}catch(_){} }
  _noise(vol,dur){try{const ctx=this._ensure(),n=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buf;src.connect(gain);gain.connect(ctx.destination);gain.gain.setValueAtTime(vol,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);src.start();}catch(_){} }
  shoot(){const n=performance.now();if(n-this._last<40)return;this._last=n;this._tone(760,.045,'square',.045,520);}
  secondary(){this._tone(300,.18,'sawtooth',.18,120);} dash(){this._tone(460,.16,'sine',.13,1250);this._noise(.025,.07);} special(){this._tone(180,.4,'sawtooth',.25,700);this._noise(.12,.2);}
  kill(){this._tone(520,.055,'triangle',.13,920);this._tone(180,.09,'square',.055,90);this._noise(.045,.045);}
  jump(){this._tone(300,.14,'sine',.14,720);} objective(done){done?[523,659,880,1047].forEach((f,i)=>setTimeout(()=>this._tone(f,.16,'triangle',.2),i*80)):this._tone(660,.12,'sine',.18,990);} gold(){this._tone(880,.06,'sine',.1,1320);} chest(){[659,880,1047].forEach((f,i)=>setTimeout(()=>this._tone(f,.12,'triangle',.18),i*60));}
  hurt(){this._tone(155,.14,'sawtooth',.28,65);this._tone(54,.11,'square',.12,42);this._noise(.22,.09);}
  teleport(){[392,523,659,880].forEach((f,i)=>setTimeout(()=>this._tone(f,.18,'sine',.2),i*80));} bossSpawn(){this._tone(90,.6,'sawtooth',.3,60);this._noise(.2,.4);} stageClear(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>this._tone(f,.2,'triangle',.22),i*90));} start(){[392,523,659].forEach((f,i)=>setTimeout(()=>this._tone(f,.14,'square',.14),i*70));} gameover(){this._tone(160,.8,'sawtooth',.4,50);this._noise(.3,.6);} adrenaline(t){this._tone(520+t*90,.12,'square',.16,1000+t*120);this._tone(1040+t*60,.06,'sine',.06,1320+t*60);}
}
export const audio=new AudioSystem();
