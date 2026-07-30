// SUDS JACK — the noise. All synth, no assets, same rule as every game here.
//
// Everything routes through one master gain, so a mute is a mute and anything
// added later inherits it. Nothing connects to ctx.destination directly.
//
// The bed is a slow two-note drift rather than a drone: this game has long
// quiet stretches while you wait for a riser, and a flat drone in a quiet
// stretch is just tinnitus.

export class AudioKit {
  constructor() { this.ctx = null; this.on = true; this._bed = null; }

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

  _blip(freq, dur, type = 'sine', peak = 0.3, slide = 0) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, freq, q, peak) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // a bubble taken: a short rising pip, pitched UP by the chain so a long
  // chain literally climbs — the score in the corner is the number, this is
  // the feedback
  pop(chain = 1) {
    const step = Math.min(chain - 1, 12);
    this._blip(520 * Math.pow(1.0595, step * 2), 0.1, 'sine', 0.26, 2.1);
    this._noise(0.06, 2600, 2, 0.05);
  }

  // the lit one: the same pip with a fifth under it, so it is the same event
  // and unmistakably a bigger one
  lit(chain = 1) {
    const step = Math.min(chain - 1, 12);
    const f = 620 * Math.pow(1.0595, step * 2);
    this._blip(f, 0.16, 'triangle', 0.3, 2.4);
    this._blip(f * 0.667, 0.2, 'sine', 0.18, 1.6);
  }

  miss() { this._blip(200, 0.22, 'sine', 0.16, 0.55); }

  dive() { this._noise(0.2, 900, 1.2, 0.12); this._blip(300, 0.18, 'sine', 0.1, 0.5); }

  // up, not down: the jump is the dive's opposite and has to sound like it
  jump() { this._blip(340, 0.22, 'triangle', 0.16, 2.2); this._noise(0.1, 1500, 1.6, 0.05); }

  hit() {
    this._noise(0.36, 420, 0.8, 0.34);
    this._blip(120, 0.4, 'sawtooth', 0.24, 0.4);
  }

  level() {
    if (!this.ensure()) return;
    [0, 4, 7, 12].forEach((s, i) => setTimeout(() => this._blip(440 * Math.pow(1.0595, s), 0.22, 'triangle', 0.2, 1.5), i * 90));
  }

  over() {
    if (!this.ensure()) return;
    [0, -3, -7, -12].forEach((s, i) => setTimeout(() => this._blip(330 * Math.pow(1.0595, s), 0.34, 'sine', 0.2, 0.7), i * 150));
  }

  bedStart() {
    if (!this.ensure() || this._bed) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.value = 0.055;
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    lfo.frequency.value = 0.06;          // one slow breath every sixteen seconds
    lfoG.gain.value = 6;
    const a = this.ctx.createOscillator();
    const b = this.ctx.createOscillator();
    a.type = 'sine'; b.type = 'sine';
    a.frequency.value = 55; b.frequency.value = 82.5;
    lfo.connect(lfoG).connect(b.frequency);
    a.connect(g); b.connect(g); g.connect(this.master);
    a.start(t); b.start(t); lfo.start(t);
    this._bed = { a, b, lfo, g };
  }

  bedStop() {
    if (!this._bed) return;
    const { a, b, lfo, g } = this._bed;
    const t = this.ctx.currentTime;
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    setTimeout(() => { try { a.stop(); b.stop(); lfo.stop(); } catch { /* already stopped */ } }, 400);
    this._bed = null;
  }
}
