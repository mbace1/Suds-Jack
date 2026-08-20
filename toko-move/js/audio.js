// A small synthesised kit — no assets, and every voice routed through one
// master gain so the sound switch actually silences the game rather than
// silencing the four sounds somebody remembered to wire up.

export class Kit {
  constructor() { this.ctx = null; this.master = null; this.on = false; }

  enable(on) {
    this.on = on;
    if (on && !this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    this.ctx?.resume?.();
    if (this.master) this.master.gain.value = on ? 0.22 : 0;
  }

  blip(freq, dur, type = 'sine', gain = 1, slideTo = null) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // A delivery is the only sound that happens constantly, so it is the quietest
  // thing in the kit and it moves — a fixed pitch fifty times a minute is a
  // fire alarm.
  drop(n = 0) {
    const steps = [523.25, 587.33, 659.25, 783.99, 880];
    this.blip(steps[n % steps.length], 0.09, 'sine', 0.30);
  }
  line() { this.blip(196, 0.13, 'triangle', 0.5, 392); }
  fail() { this.blip(110, 0.16, 'sawtooth', 0.28, 82); }
  week() { this.blip(392, 0.1, 'triangle', 0.4); setTimeout(() => this.blip(587.33, 0.16, 'triangle', 0.4), 95); }
  over() { this.blip(220, 0.5, 'sawtooth', 0.34, 55); }
}
