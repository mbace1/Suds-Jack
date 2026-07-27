// Audio — all synth, no assets. Three continuous voices whose gains are driven
// by the race every frame (turbine, wind, snow hiss) plus a handful of one
// shots. Everything routes through one master gain so a single toggle silences
// the game and anything added later inherits it.
export class AudioKit {
  constructor() { this.ctx = null; this.on = true; this._loops = null; }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.34 : 0;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setOn(v) {
    this.on = v;
    if (this.master) this.master.gain.value = v ? 0.34 : 0;
  }

  _noiseSrc() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true; s.start();
    return s;
  }

  /** Start the continuous voices. Safe to call twice. */
  startLoops() {
    this.ensure();
    if (!this.ctx || this._loops) return;
    const c = this.ctx;

    // turbine: two detuned saws through a lowpass
    const tg = c.createGain(); tg.gain.value = 0;
    const tlp = c.createBiquadFilter(); tlp.type = 'lowpass'; tlp.frequency.value = 900;
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 70;
    const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 70 * 1.008;
    o1.connect(tlp); o2.connect(tlp); tlp.connect(tg); tg.connect(this.master);
    o1.start(); o2.start();

    // wind: broad noise, opens up with speed
    const wg = c.createGain(); wg.gain.value = 0;
    const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.6;
    this._noiseSrc().connect(wf).connect(wg).connect(this.master);

    // snow hiss: tight band, rides the carve
    const sg = c.createGain(); sg.gain.value = 0;
    const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2600; sf.Q.value = 1.1;
    this._noiseSrc().connect(sf).connect(sg).connect(this.master);

    this._loops = { tg, tlp, o1, o2, wg, wf, sg, sf };
  }

  stopLoops() {
    if (!this._loops) return;
    const l = this._loops;
    l.tg.gain.value = 0; l.wg.gain.value = 0; l.sg.gain.value = 0;
  }

  /**
   * Drive the continuous voices from the race state.
   * @param {number} speed01  0..1 of top speed
   * @param {number} carve01  0..1 edge load
   * @param {number} snow01   0..1 how much snow is being moved
   * @param {boolean} boost
   */
  drive(speed01, carve01, snow01, boost) {
    if (!this._loops || !this.ctx) return;
    const l = this._loops, t = this.ctx.currentTime, k = 0.09;
    const f = 62 + speed01 * 120 + (boost ? 40 : 0);
    l.o1.frequency.setTargetAtTime(f, t, k);
    l.o2.frequency.setTargetAtTime(f * 1.008, t, k);
    l.tlp.frequency.setTargetAtTime(700 + speed01 * 2200 + (boost ? 900 : 0), t, k);
    l.tg.gain.setTargetAtTime(0.05 + speed01 * 0.10 + (boost ? 0.07 : 0), t, k);
    l.wg.gain.setTargetAtTime(speed01 * speed01 * 0.14, t, k);
    l.wf.frequency.setTargetAtTime(360 + speed01 * 700, t, k);
    l.sg.gain.setTargetAtTime(snow01 * 0.16, t, 0.05);
    l.sf.frequency.setTargetAtTime(1800 + carve01 * 2600 + speed01 * 900, t, 0.05);
  }

  _tone(type, f0, f1, dur, peak) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur);
  }

  _burst(dur, freq, q, peak, type = 'bandpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + dur);
  }

  launch()  { this._burst(0.30, 900, 0.8, 0.16); this._tone('triangle', 200, 460, 0.28, 0.10); }
  land(hard){ this._burst(0.42, hard ? 420 : 900, 0.7, hard ? 0.26 : 0.16); }
  crash()   { this._burst(0.7, 260, 0.5, 0.34, 'lowpass'); this._tone('square', 150, 42, 0.5, 0.14); }
  boost()   { this._burst(0.5, 1500, 0.7, 0.20); this._tone('sawtooth', 180, 700, 0.4, 0.10); }
  gate()    { this._tone('square', 660, 660, 0.09, 0.16); setTimeout(() => this._tone('square', 990, 990, 0.16, 0.16), 100); }
  trick()   { this._tone('triangle', 700, 1400, 0.18, 0.14); }
  bump()    { this._burst(0.16, 520, 0.9, 0.18, 'lowpass'); }
  over()    { this._tone('sawtooth', 300, 60, 1.1, 0.16); }
}
