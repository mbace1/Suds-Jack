// ── Audio ──────────────────────────────────────────────────────────────────
// All-synth, no assets. Every voice routes through one master gain — nothing
// connects to ctx.destination directly — so the mute toggle silences the whole
// app and anything added later inherits it (house rule from gameoflife).

export class Audio {
  constructor() {
    this.ctx = null;
    this.on = true;
    try { this.on = localStorage.getItem('tiny2dSound') !== '0'; } catch (e) { /* private mode */ }
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? 0.5 : 0;
    this.master.connect(this.ctx.destination);

    // Speed wind: one noise buffer through a lowpass, gain driven by velocity.
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.wind = this.ctx.createBufferSource();
    this.wind.buffer = buf;
    this.wind.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 500;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.wind.connect(this.windFilter).connect(this.windGain).connect(this.master);
    this.wind.start();
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setMuted(muted) {
    this.on = !muted;
    try { localStorage.setItem('tiny2dSound', this.on ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.value = this.on ? 0.5 : 0;
  }

  // Wind rises with speed — the cheapest possible "you are going fast" cue.
  speed(v) {
    if (!this.ctx) return;
    const k = Math.min(Math.max((v - 12) / 50, 0), 1);
    this.windGain.gain.setTargetAtTime(k * 0.22, this.ctx.currentTime, 0.15);
    this.windFilter.frequency.setTargetAtTime(400 + k * 1600, this.ctx.currentTime, 0.2);
  }

  tone(freq, dur, type = 'square', vol = 0.22, slide = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, freq, vol = 0.3) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  pop(power)      { this.tone(300 + power * 320, 0.1, 'square', 0.2, 240); }
  launch()        { this.noise(0.18, 900, 0.16); }
  trick()         { this.tone(660, 0.07, 'triangle', 0.18, 300); }
  landSoft()      { this.noise(0.1, 260, 0.2); }
  landHard()      { this.noise(0.24, 150, 0.42); }
  perfect(n)      { this.tone(520 * Math.pow(1.09, Math.min(n, 12)), 0.16, 'triangle', 0.24, 180); }
  bail()          { this.noise(0.4, 220, 0.5); this.tone(150, 0.35, 'sawtooth', 0.2, -90); }
  checkpoint()    { this.tone(700, 0.1, 'square', 0.2); setTimeout(() => this.tone(940, 0.16, 'square', 0.2), 90); }
  gameOver()      { [520, 400, 300, 210].forEach((f, i) => setTimeout(() => this.tone(f, 0.24, 'sawtooth', 0.2), i * 130)); }
}
