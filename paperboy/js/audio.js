// Tiny WebAudio bleep kit — same approach as toko-drop, paper-route sound set.
class AudioSystem {
  constructor() { this._ctx = null; }

  _ensure() {
    if (!this._ctx) this._ctx = new AudioContext();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  _tone(freq, dur, type = 'sine', vol = 0.25, freqEnd = null) {
    try {
      const ctx = this._ensure();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch (_) {}
  }

  _noise(vol, dur) {
    try {
      const ctx = this._ensure();
      const n   = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src  = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      src.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.start();
    } catch (_) {}
  }

  throw_()    { this._tone(680, 0.10, 'square',   0.12, 420); this._noise(0.06, 0.05); }
  empty()     { this._tone(180, 0.06, 'square',   0.10); }
  deliver()   { [523, 659, 784].forEach((f,i)=>setTimeout(()=>this._tone(f,0.12,'sine',0.22),i*55)); }
  smash()     { this._noise(0.28, 0.18); this._tone(900, 0.08, 'square', 0.10, 300); }
  pickup()    { this._tone(740, 0.10, 'sine', 0.22, 1180); }
  crash()     { this._tone(110, 0.35, 'sawtooth', 0.40, 60); this._noise(0.34, 0.30); }
  gameover()  { this._tone(80,  0.80, 'sawtooth', 0.50, 50); this._noise(0.40, 0.6); }
  dayClear()  { [392, 523, 659, 880].forEach((f,i)=>setTimeout(()=>this._tone(f,0.20,'triangle',0.22),i*90)); }
}

export const audio = new AudioSystem();
