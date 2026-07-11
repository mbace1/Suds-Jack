// Intensity-driven arpeggio music. A1 minor pentatonic; a 16-step bar loops,
// and voices layer in as intensity (swarm density + run progress) climbs:
// bass at all times, arp above ~0.25, a hi-hat tick above ~0.5, a lead
// counter-melody above ~0.75. Everything is scheduled a beat ahead so it
// stays rock-steady regardless of frame rate.
const MUSIC_ROOT = 55;                 // A1
const MUSIC_SCALE = [0, 3, 5, 7, 10];  // minor pentatonic semitone offsets
const STEP_S = 60 / 138 / 4;           // 16th note at 138 BPM
const BASS_STEPS = { 0: 0, 4: 7, 8: 3, 12: 5 }; // A E C D across the bar
const LEAD_STEPS = { 0: 0, 6: 7, 10: 10 };

/** WebAudio synth kit — no assets. Everything built from oscillators + noise. */
export class AudioKit {
  constructor() {
    this.ctx = null;
    this._lastFire = 0;
    this._drone = null;
    this._music = null;
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
    if (now - this._lastFire < 0.075) return;
    this._lastFire = now;
    this._noise(0.05, 'bandpass', 1600 + Math.random() * 600, 2, 0.08);
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

  shotgun() {
    if (!this.ctx) return;
    this._noise(0.28, 'lowpass', 900, 0.8, 0.55);
    this._tone('square', 130, 40, 0.22, 0.4);
  }

  gem() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone('sine', 880, 880, 0.08, 0.14, t);
    this._tone('sine', 1320, 1320, 0.1, 0.1, t + 0.05);
  }

  levelup() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone('square', 440, 440, 0.12, 0.16, t);
    this._tone('square', 660, 660, 0.14, 0.16, t + 0.11);
    this._tone('square', 880, 880, 0.25, 0.16, t + 0.22);
    this._noise(0.4, 'highpass', 4000, 1, 0.08, t + 0.22);
  }

  dash() {
    if (!this.ctx) return;
    this._noise(0.22, 'bandpass', 700, 1.5, 0.3);
  }

  roar() {
    if (!this.ctx) return;
    this._tone('sawtooth', 70, 180, 0.7, 0.3);
    this._noise(0.7, 'lowpass', 300, 0.7, 0.35);
  }

  /** Milestone stinger: a low two-note dread hit for first encounters. */
  stinger() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone('sawtooth', 110, 108, 0.5, 0.22, t);
    this._tone('sawtooth', 55, 54, 0.9, 0.26, t + 0.18);
    this._noise(0.7, 'lowpass', 250, 0.7, 0.16, t + 0.18);
  }

  pull() {
    if (!this.ctx) return;
    this._tone('sawtooth', 40, 130, 1.4, 0.28);
    this._noise(1.4, 'lowpass', 220, 0.7, 0.2);
  }

  orb() {
    if (!this.ctx) return;
    this._tone('sine', 520, 180, 0.18, 0.14);
  }

  warn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone('square', 1100, 1100, 0.05, 0.09, t);
    this._tone('square', 1100, 1100, 0.05, 0.09, t + 0.11);
  }

  ring() {
    if (!this.ctx) return;
    this._noise(0.4, 'bandpass', 500, 1.2, 0.22);
    this._tone('sine', 220, 90, 0.35, 0.16);
  }

  blink() {
    if (!this.ctx) return;
    this._tone('square', 900, 200, 0.12, 0.15);
  }

  clink() {
    if (!this.ctx) return;
    this._tone('triangle', 1600, 1200, 0.06, 0.15);
    this._noise(0.05, 'highpass', 3000, 1, 0.1);
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

  // -------------------------------------------------------------- music
  musicStart() {
    if (!this.ctx || this._music) return;
    const bus = this.ctx.createGain();
    bus.gain.value = 0;
    bus.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1.5);
    bus.connect(this.master);
    this._music = { bus, next: this.ctx.currentTime + 0.12, step: 0, intensity: 0 };
  }

  musicPlaying() { return !!this._music; }

  musicStop() {
    if (!this._music) return;
    const { bus } = this._music;
    this._music = null;
    const t = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(0, t + 0.4);
    setTimeout(() => bus.disconnect(), 600);
  }

  /** Schedule any notes due in the next ~0.15 s. Called each frame with the
   *  current run intensity (0..1). No-op when music isn't running. */
  musicUpdate(intensity) {
    const m = this._music;
    if (!m) return;
    const now = this.ctx.currentTime;
    m.intensity += (intensity - m.intensity) * 0.05; // smooth
    const I = m.intensity;
    // if we fell behind (tab throttled / paused), resync instead of bursting
    if (m.next < now - 0.25) m.next = now + 0.02;
    while (m.next < now + 0.15) {
      this._musicStep(m.step, m.next, I);
      m.step = (m.step + 1) % 16;
      m.next += STEP_S;
    }
  }

  _semi(base, semi) { return base * Math.pow(2, semi / 12); }

  _voice(type, freq, dur, peak, t0, dest, glideTo) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  _musicStep(step, t, I) {
    const bus = this._music.bus;

    // bass — always present, pulsing the harmonic frame
    if (step in BASS_STEPS) {
      const f = this._semi(MUSIC_ROOT, BASS_STEPS[step]);
      this._voice('sawtooth', f, STEP_S * 3.6, 0.11, t, bus);
      this._voice('sine', f, STEP_S * 3.6, 0.09, t, bus); // sub reinforcement
    }

    // arp — 16th-note run through the scale once the swarm builds
    if (I > 0.25 && step % 2 === 0) {
      const deg = MUSIC_SCALE[(step / 2) % MUSIC_SCALE.length];
      const oct = ((step / 2) >= MUSIC_SCALE.length) ? 24 : 12;
      const f = this._semi(MUSIC_ROOT, deg + oct);
      this._voice('square', f, STEP_S * 1.4, 0.05 + I * 0.03, t, bus);
    }

    // hi-hat tick on the offbeats when things get hot
    if (I > 0.5 && step % 4 === 2) {
      this._noise(0.03, 'highpass', 6000, 1, 0.05 + I * 0.04, t);
    }

    // lead counter-melody up top at high intensity
    if (I > 0.75 && step in LEAD_STEPS) {
      const f = this._semi(MUSIC_ROOT, LEAD_STEPS[step] + 24);
      this._voice('sawtooth', f, STEP_S * 3, 0.05, t, bus, f * 1.003);
    }
  }
}
