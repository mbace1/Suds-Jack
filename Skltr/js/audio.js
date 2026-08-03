// Tiny WebAudio bleep kit — same approach as the other Suds-Jack demos.
class AudioSystem {
  constructor() { this._ctx = null; this._last = 0; }
  _ensure() {
    if (!this._ctx) this._ctx = new AudioContext();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }
  _tone(freq, dur, type = 'sine', vol = 0.2, freqEnd = null) {
    try {
      const ctx = this._ensure(), osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch (_) {}
  }
  _noise(vol, dur, hp = false) {
    try {
      const ctx = this._ensure(), n = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(), gain = ctx.createGain();
      src.buffer = buf; src.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.start();
    } catch (_) {}
  }
  shoot() { const n = performance.now(); if (n - this._last < 40) return; this._last = n; this._tone(720, 0.06, 'square', 0.06, 480); }
  secondary() { this._tone(300, 0.18, 'sawtooth', 0.18, 120); }
  dash()  { this._tone(520, 0.18, 'sine', 0.14, 1100); }
  special(){ this._tone(180, 0.4, 'sawtooth', 0.25, 700); this._noise(0.12, 0.2); }
  kill()  { this._tone(440, 0.07, 'triangle', 0.12, 660); }
  jump()  { this._tone(300, 0.14, 'sine', 0.14, 720); }
  objective(done) { done ? [523, 659, 880, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.16, 'triangle', 0.2), i * 80)) : this._tone(660, 0.12, 'sine', 0.18, 990); }
  gold()  { this._tone(880, 0.06, 'sine', 0.10, 1320); }
  chest() { [659, 880, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.12, 'triangle', 0.18), i * 60)); }
  hurt()  { this._tone(200, 0.18, 'sawtooth', 0.22, 90); this._noise(0.14, 0.12); }
  teleport(){ [392, 523, 659, 880].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'sine', 0.2), i * 80)); }
  bossSpawn(){ this._tone(90, 0.6, 'sawtooth', 0.3, 60); this._noise(0.2, 0.4); }
  stageClear(){ [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.2, 'triangle', 0.22), i * 90)); }
  start() { [392, 523, 659].forEach((f, i) => setTimeout(() => this._tone(f, 0.14, 'square', 0.14), i * 70)); }
  gameover(){ this._tone(160, 0.8, 'sawtooth', 0.4, 50); this._noise(0.3, 0.6); }
  adrenaline(t){ this._tone(520 + t * 90, 0.12, 'square', 0.16, 1000 + t * 120); }
}
export const audio = new AudioSystem();
