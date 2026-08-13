// EERI — the noise. All synth, no assets, same rule as every game here.
//
// Everything routes through one master gain, so a mute is a mute and
// anything added later inherits it. Nothing connects to ctx.destination
// directly.
//
// The bed is a worksite: a low diesel idle that RISES when you are driving,
// because the machine is the loudest thing in the game and silence while it
// moves reads as broken.

export class AudioKit {
  constructor() {
    this.ctx = null; this.on = true;
    this._idle = null; this._idleGain = null; this._idleOsc = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  setOn(v) {
    this.on = v;
    if (this.master) this.master.gain.value = v ? 0.3 : 0;
  }

  _blip(freq, dur, type = 'square', peak = 0.25, slide = 0) {
    if (!this.on || !this.ensure()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, peak = 0.2, freq = 900, q = 1) {
    if (!this.on || !this.ensure()) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur);
  }

  // ---- the events ---------------------------------------------------------
  jump()    { this._blip(340, 0.16, 'square', 0.16, 2.0); }
  land()    { this._noise(0.1, 0.16, 420, 1.2); }
  bolt(n)   { this._blip(660 * Math.pow(1.06, Math.min(n, 12)), 0.1, 'triangle', 0.2, 1.5); }
  mount()   { this._blip(180, 0.2, 'sawtooth', 0.2, 2.2); this._noise(0.18, 0.12, 700); }
  dismount(){ this._blip(300, 0.16, 'square', 0.15, 0.6); }
  boom()    { this._noise(0.14, 0.09, 260, 3); }          // hydraulics working
  clank()   { this._noise(0.12, 0.2, 1500, 4); this._blip(210, 0.12, 'square', 0.12, 0.8); }  // chains take the load
  thunk()   { this._noise(0.26, 0.3, 150, 1); this._blip(70, 0.34, 'sine', 0.24, 0.6); }      // the span seats
  // the hazard telegraph: a warning, distinct from everything friendly
  warn()    { this._blip(520, 0.09, 'square', 0.2); setTimeout(() => this._blip(520, 0.09, 'square', 0.2), 130); }
  splat()   { this._noise(0.3, 0.26, 220, 0.8); this._blip(120, 0.3, 'sawtooth', 0.16, 0.5); }

  // ---- the diesel bed -----------------------------------------------------
  idleStart() {
    if (!this.on || !this.ensure() || this._idle) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = 42;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 180;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.6);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t);
    this._idle = o; this._idleGain = g; this._idleOsc = o;
  }

  // load 0…1 — the engine works harder when the machine is moving
  idleLoad(load) {
    if (!this._idle) return;
    const t = this.ctx.currentTime;
    this._idleOsc.frequency.setTargetAtTime(42 + load * 26, t, 0.15);
    this._idleGain.gain.setTargetAtTime(0.1 + load * 0.06, t, 0.2);
  }

  idleStop() {
    if (!this._idle) return;
    const t = this.ctx.currentTime;
    this._idleGain.gain.setTargetAtTime(0, t, 0.2);
    this._idle.stop(t + 1);
    this._idle = null;
  }
}
