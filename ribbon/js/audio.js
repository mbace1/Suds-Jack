// Tiny WebAudio bleep kit for RIBBON — same approach as the toko-drop / paper-route sets.
// Hits climb in pitch with the combo so a clean run reads as a rising melody.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // pentatonic-ish steps up

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
      const osc = ctx.createOscillator();
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
      const n = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      src.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.start();
    } catch (_) {}
  }

  // A cleared obstacle: note rises with the combo count.
  clear(combo) {
    const step = SCALE[Math.min(combo, SCALE.length - 1)];
    const f = 440 * Math.pow(2, step / 12);
    this._tone(f, 0.12, 'triangle', 0.22);
    this._tone(f * 2, 0.08, 'sine', 0.08);
  }
  miss()     { this._tone(150, 0.28, 'sawtooth', 0.30, 70); this._noise(0.18, 0.16); }
  perkOpen() { [523, 784].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'sine', 0.20), i * 70)); }
  perkPick() { [523, 659, 880, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.16, 'triangle', 0.22), i * 70)); }
  start()    { [392, 523, 659].forEach((f, i) => setTimeout(() => this._tone(f, 0.14, 'square', 0.16), i * 70)); }
  gameover() { this._tone(180, 0.7, 'sawtooth', 0.45, 55); this._noise(0.32, 0.5); }
}

export const audio = new AudioSystem();
