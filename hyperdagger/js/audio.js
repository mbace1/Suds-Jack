/** WebAudio synth kit — no assets. Everything built from oscillators + noise. */
export class AudioKit {
  constructor() {
    this.ctx = null;
    this._lastFire = 0;
    this._drone = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  _noise(dur, filterType, freq, q, peak, t0 = this.ctx.currentTime) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur);
  }

  _tone(type, f0, f1, dur, peak, t0 = this.ctx.currentTime) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur);
  }

  fire() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this._lastFire < 0.05) return;
    this._lastFire = now;
    this._noise(0.06, 'bandpass', 1600 + Math.random() * 600, 2, 0.16);
  }

  hit() {
    if (!this.ctx) return;
    this._tone('square', 240, 90, 0.08, 0.18);
  }

  gib(big = false) {
    if (!this.ctx) return;
    this._noise(big ? 0.5 : 0.3, 'lowpass', big ? 500 : 800, 0.7, big ? 0.55 : 0.4);
    this._tone('sine', big ? 150 : 190, 35, big ? 0.45 : 0.3, 0.45);
  }

  spawn() {
    if (!this.ctx) return;
    this._tone('sawtooth', 90, 300, 0.35, 0.12);
  }

  jump() {
    if (!this.ctx) return;
    this._tone('sine', 180, 320, 0.12, 0.12);
  }

  death() {
    if (!this.ctx) return;
    this._tone('sawtooth', 280, 28, 0.9, 0.5);
    this._noise(0.8, 'lowpass', 400, 0.7, 0.5);
  }

  droneStart() {
    if (!this.ctx || this._drone) return;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.055, this.ctx.currentTime + 2);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 260;
    const oscs = [55, 55.7, 82.5].map(hz => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz;
      o.connect(f);
      o.start();
      return o;
    });
    f.connect(g).connect(this.master);
    this._drone = { g, oscs };
  }

  droneStop() {
    if (!this._drone) return;
    const { g, oscs } = this._drone;
    this._drone = null;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.5);
    oscs.forEach(o => o.stop(t + 0.6));
  }
}
