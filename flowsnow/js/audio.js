// Wind, the hiss of an edge, a chime when something lands. All synthesised,
// every voice through one master gain so mute is mute, and nothing runs until
// the first real gesture.
const KEY = 'flowsnow.mute';

export class Audio {
  constructor() {
    this.ctx = null; this.master = null;
    this.muted = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
    this.windGain = null; this.windFilter = null; this.hissGain = null; this.hissFilter = null; this.padGain = null;
    this.chimeAt = 0;
  }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(c.destination);
    // a long noise buffer, shared
    const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {           // pinkish
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
    }
    const noise = () => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    // wind: lowpassed noise whose cutoff and level ride the speed
    this.windFilter = c.createBiquadFilter(); this.windFilter.type = 'lowpass'; this.windFilter.frequency.value = 220; this.windFilter.Q.value = 0.7;
    this.windGain = c.createGain(); this.windGain.gain.value = 0;
    noise().connect(this.windFilter).connect(this.windGain).connect(this.master);
    // the edge: a band of noise up high, gated by the spray
    this.hissFilter = c.createBiquadFilter(); this.hissFilter.type = 'bandpass'; this.hissFilter.frequency.value = 2600; this.hissFilter.Q.value = 0.9;
    this.hissGain = c.createGain(); this.hissGain.gain.value = 0;
    noise().connect(this.hissFilter).connect(this.hissGain).connect(this.master);
    // a bed: two detuned sines, very low
    this.padGain = c.createGain(); this.padGain.gain.value = 0.0;
    for (const f of [110, 110.7, 165]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = c.createGain(); g.gain.value = f > 150 ? 0.35 : 0.5;
      o.connect(g).connect(this.padGain); o.start();
    }
    this.padGain.connect(this.master);
  }
  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* private mode */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }
  // per frame
  update(speed, spray, flow, airborne, dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const sp = Math.min(1, speed / 28);
    this.windFilter.frequency.setTargetAtTime(180 + sp * 900 + (airborne ? 300 : 0), t, 0.1);
    this.windGain.gain.setTargetAtTime(sp * sp * 0.9 + (airborne ? 0.15 : 0), t, 0.12);
    this.hissGain.gain.setTargetAtTime(Math.min(1.2, spray) * 0.35, t, 0.05);
    this.hissFilter.frequency.setTargetAtTime(1800 + sp * 1800, t, 0.1);
    this.padGain.gain.setTargetAtTime(0.03 + flow * 0.09, t, 0.5);
  }
  _tone(freq, dur, gain = 0.25, type = 'sine') {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  pop() { this._tone(330, 0.18, 0.08, 'triangle'); }
  land(impact, air, spins) {
    // a pentatonic chime, higher for a bigger trick
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const n = Math.min(scale.length - 1, Math.floor(air * 2 + spins / 180));
    this._tone(scale[n], 0.8, 0.16);
    if (spins >= 360) setTimeout(() => this._tone(scale[Math.min(5, n + 2)], 0.8, 0.12), 110);
    this._tone(90, 0.25, Math.min(0.3, impact * 0.03), 'sine');
  }
  tumble() { this._tone(70, 0.5, 0.35, 'sine'); this._tone(140, 0.2, 0.15, 'sawtooth'); }
  flowUp() { this._tone(1318.5, 1.2, 0.08); }
  done() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => this._tone(f, 1.4, 0.14), i * 160)); }
}
