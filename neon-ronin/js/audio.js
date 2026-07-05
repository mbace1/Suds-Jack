// ── WebAudio bleep kit (same spirit as paperboy/js/audio.js) ──────────────────
// Tiny synth: oscillator envelopes + filtered noise. Context is created on
// first user gesture (init() from the start-screen click).

class AudioKit {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(this.ctx.destination);
  }

  _tone(freq, dur, { type = 'square', vol = 0.5, slide = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, freq, vol = 0.35, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 0.9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  slash()   { this._noise(0.12, 2800, 0.3); }
  heavy()   { this._noise(0.2, 1200, 0.4); this._tone(90, 0.18, { type: 'sine', vol: 0.4, slide: -50 }); }
  hit()     { this._tone(240, 0.07, { vol: 0.35, slide: -140 }); this._noise(0.05, 4000, 0.2); }
  kill()    { this._tone(320, 0.08, { vol: 0.3 }); this._tone(480, 0.09, { vol: 0.3, delay: 0.06 }); this._tone(720, 0.12, { vol: 0.3, delay: 0.12 }); }
  hurt()    { this._tone(160, 0.22, { type: 'sawtooth', vol: 0.4, slide: -100 }); }
  dash()    { this._tone(300, 0.12, { type: 'sine', vol: 0.3, slide: 500 }); }
  jump()    { this._tone(380, 0.1, { type: 'sine', vol: 0.28, slide: 260 }); }
  swap()    { this._tone(440, 0.14, { type: 'triangle', vol: 0.35 }); this._tone(660, 0.14, { type: 'triangle', vol: 0.3, delay: 0.03 }); }
  shot()    { this._tone(700, 0.06, { vol: 0.22, slide: -350 }); }
  slam()    { this._tone(55, 0.45, { type: 'sine', vol: 0.6, slide: -25 }); this._noise(0.3, 400, 0.4); }
  deflect() { this._tone(900, 0.06, { type: 'triangle', vol: 0.3, slide: 300 }); }
  upgrade() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.12, { type: 'triangle', vol: 0.3, delay: i * 0.08 })); }
  clear()   { [392, 523, 659].forEach((f, i) => this._tone(f, 0.14, { type: 'square', vol: 0.25, delay: i * 0.09 })); }
  over()    { [330, 262, 196, 131].forEach((f, i) => this._tone(f, 0.3, { type: 'sawtooth', vol: 0.3, delay: i * 0.18 })); }
}

export const audio = new AudioKit();
