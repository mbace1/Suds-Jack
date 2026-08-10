// ── Audio ──────────────────────────────────────────────────────────────────
// All-synth, no assets. Every voice routes through one master gain — nothing
// connects to ctx.destination directly — so the mute toggle silences the whole
// app and anything added later inherits it.

export class Audio {
  constructor() {
    this.ctx = null;
    this.on = true;
    try { this.on = localStorage.getItem('tinyHawkSound') !== '0'; } catch (e) { /* private mode */ }
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? 0.5 : 0;
    this.master.connect(this.ctx.destination);
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setMuted(muted) {
    this.on = !muted;
    try { localStorage.setItem('tinyHawkSound', this.on ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.value = this.on ? 0.5 : 0;
  }

  tone(freq, dur, type = 'square', vol = 0.2, slide = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
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
    f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  // The pop of the tail hitting concrete — a click, not a boing.
  pop(power) { this.noise(0.07, 1400 + power * 900, 0.3); this.tone(180, 0.06, 'square', 0.12, 90); }
  trick()    { this.tone(720, 0.05, 'triangle', 0.14, 280); }
  land(clean) {
    this.noise(clean ? 0.09 : 0.18, clean ? 420 : 200, clean ? 0.24 : 0.4);
    if (clean) this.tone(560, 0.09, 'triangle', 0.14, 160);
  }
  bail() { this.noise(0.45, 240, 0.5); this.tone(150, 0.4, 'sawtooth', 0.18, -90); }
}
