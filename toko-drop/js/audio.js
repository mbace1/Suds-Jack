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

  shoot()     { this._tone(920, 0.07, 'square', 0.11); }
  enemyHit()  { this._tone(500, 0.07, 'square', 0.20); }
  enemyDieType(cat) {
    if      (cat === 'blob')  { this._tone(420, 0.22, 'sine',     0.22, 75); }
    else if (cat === 'toro')  { this._tone(95,  0.45, 'sawtooth', 0.36, 38); this._noise(0.14, 0.22); }
    else if (cat === 'bambu') { this._tone(480, 0.30, 'triangle', 0.26, 190); }
    else if (cat === 'pyra')  { this._tone(1300,0.16, 'sine',     0.20, 550); }
    else                       { this._tone(380, 0.18, 'square',   0.22, 55); this._noise(0.09, 0.13); }
  }
  playerHit() { this._tone(100, 0.32, 'sawtooth', 0.38); this._noise(0.22, 0.18); }
  playerDie() { this._tone(65,  0.70, 'sawtooth', 0.50); this._noise(0.42, 0.60); }
  pickup() {
    [392, 523, 659].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.13, 'sine', 0.18), i * 60));
  }
  waveClear() {
    [261, 329, 392, 523].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.22, 'sine', 0.20), i * 90));
  }
}

export const audio = new AudioSystem();
