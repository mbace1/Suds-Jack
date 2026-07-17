// Drop Cabal — WebAudio bleep kit (all-synth, no assets), same spirit as paperboy/audio.js.

export class AudioKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._noiseBuf = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _tone(type, f0, f1, dur, vol, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, f0), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, vol, cutoff, when = 0) {
    if (!this.ctx) return;
    if (!this._noiseBuf) {
      const len = this.ctx.sampleRate;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  fire()   { this._tone('square', 780 + Math.random() * 200, 220, 0.05, 0.07); }
  thock()  { this._tone('triangle', 330, 90, 0.07, 0.2); }
  splat()  { this._noise(0.16, 0.26, 900); this._tone('sine', 210, 55, 0.16, 0.24); }
  pew()    { this._tone('sawtooth', 420, 760, 0.11, 0.07); }
  pop()    { this._tone('square', 700, 1300, 0.06, 0.13); }
  crumble(){ this._noise(0.2, 0.2, 500); this._tone('triangle', 150, 60, 0.16, 0.16); }
  boom()   { this._noise(0.5, 0.5, 380); this._tone('sine', 120, 32, 0.5, 0.42); }
  lob()    { this._tone('sine', 240, 480, 0.2, 0.1); }
  roll()   { this._noise(0.13, 0.12, 1600); }
  phit()   { this._tone('sawtooth', 320, 55, 0.4, 0.36); this._noise(0.32, 0.3, 650); }
  pickup() { this._tone('square', 520, 520, 0.07, 0.18); this._tone('square', 780, 780, 0.07, 0.18, 0.08); }

  fanfare() {
    const n = [392, 523, 659, 784];
    n.forEach((f, i) => this._tone('square', f, f, 0.14, 0.2, i * 0.11));
  }

  over() {
    const n = [330, 262, 196, 131];
    n.forEach((f, i) => this._tone('triangle', f, f * 0.94, 0.3, 0.24, i * 0.22));
  }
}
