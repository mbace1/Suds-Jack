// Audio — all synth, no assets. The turbine is the instrument: N1 drives a
// stack of a low rumble, a mid saw and a compressor whine an octave and a
// fifth above it, so spooling up sweeps the whole stack and you can HEAR the
// lag the physics is modelling. Wind and surface roar sit under it. Every
// voice goes through one master gain, so a single toggle silences the game.
export class AudioKit {
  constructor() { this.ctx = null; this.on = true; this._loops = null; }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.32 : 0;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.32 : 0; }

  _noise() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true; s.start();
    return s;
  }

  startLoops() {
    this.ensure();
    if (!this.ctx || this._loops) return;
    const c = this.ctx;
    const L = {};

    // core: two detuned saws through a lowpass — the mass of the thing
    L.coreG = c.createGain(); L.coreG.gain.value = 0;
    L.coreF = c.createBiquadFilter(); L.coreF.type = 'lowpass'; L.coreF.frequency.value = 700;
    L.o1 = c.createOscillator(); L.o1.type = 'sawtooth';
    L.o2 = c.createOscillator(); L.o2.type = 'sawtooth';
    L.o1.connect(L.coreF); L.o2.connect(L.coreF);
    L.coreF.connect(L.coreG).connect(this.master);
    L.o1.start(); L.o2.start();

    // compressor whine: a narrow band riding well above the core
    L.whineG = c.createGain(); L.whineG.gain.value = 0;
    L.whine = c.createOscillator(); L.whine.type = 'triangle';
    L.whine.connect(L.whineG).connect(this.master);
    L.whine.start();

    // wind over the hull
    L.windG = c.createGain(); L.windG.gain.value = 0;
    L.windF = c.createBiquadFilter(); L.windF.type = 'bandpass';
    L.windF.frequency.value = 520; L.windF.Q.value = 0.55;
    this._noise().connect(L.windF).connect(L.windG).connect(this.master);

    // surface roar under the skirts
    L.grG = c.createGain(); L.grG.gain.value = 0;
    L.grF = c.createBiquadFilter(); L.grF.type = 'bandpass';
    L.grF.frequency.value = 900; L.grF.Q.value = 0.9;
    this._noise().connect(L.grF).connect(L.grG).connect(this.master);

    this._loops = L;
  }

  stopLoops() {
    const L = this._loops;
    if (!L) return;
    L.coreG.gain.value = 0; L.whineG.gain.value = 0;
    L.windG.gain.value = 0; L.grG.gain.value = 0;
  }

  /**
   * @param {number} n1     turbine spool 0..1 — the instrument
   * @param {number} v01    airspeed as a fraction of top
   * @param {number} gnd    0..1 how much ground contact there is
   * @param {number} slip   |lateral slip| in m/s
   * @param {boolean} od    overdrive lit
   */
  drive(n1, v01, gnd, slip, od) {
    const L = this._loops;
    if (!L || !this.ctx) return;
    const t = this.ctx.currentTime, k = 0.07;
    const f = 44 + n1 * 96 + (od ? 26 : 0);
    L.o1.frequency.setTargetAtTime(f, t, k);
    L.o2.frequency.setTargetAtTime(f * 1.011, t, k);
    L.coreF.frequency.setTargetAtTime(450 + n1 * 2400 + (od ? 900 : 0), t, k);
    L.coreG.gain.setTargetAtTime(0.05 + n1 * 0.13 + (od ? 0.06 : 0), t, k);
    L.whine.frequency.setTargetAtTime(f * 11 + 220, t, k);
    L.whineG.gain.setTargetAtTime(0.006 + n1 * 0.028, t, k);
    L.windG.gain.setTargetAtTime(v01 * v01 * 0.15, t, k);
    L.windF.frequency.setTargetAtTime(330 + v01 * 900, t, k);
    L.grG.gain.setTargetAtTime(gnd * (0.02 + v01 * 0.09 + Math.min(1, slip / 9) * 0.10), t, 0.05);
    L.grF.frequency.setTargetAtTime(600 + v01 * 900 + Math.min(1, slip / 9) * 1400, t, 0.05);
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

  impact(sev) {
    const s = Math.min(1, sev / 22);
    this._burst(0.30 + s * 0.5, 220 - s * 90, 0.5, 0.16 + s * 0.26, 'lowpass');
    this._tone('square', 150, 44, 0.34 + s * 0.3, 0.06 + s * 0.10);
  }
  land(sev)  { this._burst(0.34, 380, 0.7, 0.10 + Math.min(0.2, sev * 0.02), 'lowpass'); }
  gate()     { this._tone('square', 760, 760, 0.07, 0.13); setTimeout(() => this._tone('square', 1140, 1140, 0.14, 0.13), 90); }
  overheat() { this._tone('sawtooth', 420, 180, 0.5, 0.14); }
  over()     { this._tone('sawtooth', 300, 55, 1.2, 0.15); }
}
