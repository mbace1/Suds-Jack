// audio.js — synthesised, never sampled. Every voice goes through one master
// gain, so mute really mutes and a sound added later inherits it. Browsers
// keep audio asleep until a gesture; unlock() is called from the first one.
import { TUNING } from './tuning.js?v=4';

const A = TUNING.audio;

export class Sound {
  constructor() { this.ctx = null; this.master = null; this.on = true; this._shot = 0; this._noise = null; }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? A.master : 0;
    this.master.connect(this.ctx.destination);
    const n = this.ctx.sampleRate;
    this._noise = this.ctx.createBuffer(1, n, n);
    const d = this._noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }

  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? A.master : 0, this.ctx.currentTime, 0.02); }

  _tone(type, f0, f1, dur, vol, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  _hiss(dur, vol, f0, f1, q = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this._noise; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // one call per sim event
  event(e) {
    switch (e.type) {
      case 'shot': if ((this._shot++ & 1) === 0) this._tone('square', 1500, 900, 0.035, 0.035); break;
      case 'gelShot': this._tone('triangle', 520, 300, 0.09, 0.06); break;
      case 'hit': this._tone('sine', 300, 160, 0.06, 0.08); break;
      case 'kill': this._hiss(0.22, 0.22, 1400, 200, 1.2); this._tone('sine', 260, 70, 0.22, 0.16); break;
      case 'hurt': this._tone('sawtooth', 160, 45, 0.4, 0.2); this._hiss(0.3, 0.2, 600, 120); break;
      case 'dash': this._hiss(0.16, 0.12, 400, 2600, 0.8); break;
      case 'shove': this._tone('sine', 180, 90, 0.08, 0.12); break;
      case 'graze': this._tone('sine', 2400, 2600, 0.03, 0.04); break;
      case 'spawn': this._hiss(0.25, 0.05, 900, 500, 3); break;
      case 'land': this._tone('sine', 140, 70, 0.1, 0.1); break;
      case 'wall': this._tone('sine', 120, 80, 0.06, 0.05 * e.hard); break;
      case 'extend': [0, 0.08, 0.16].forEach((w, i) => this._tone('square', 660 * [1, 1.25, 1.5][i], 660 * [1, 1.25, 1.5][i], 0.12, 0.06, w)); break;
      case 'dawn': [0, 0.12, 0.24, 0.36].forEach((w, i) => this._tone('triangle', 440 * [1, 1.25, 1.5, 2][i], 440 * [1, 1.25, 1.5, 2][i], 0.5, 0.08, w)); break;
      case 'over': this._tone('sawtooth', 220, 40, 1.2, 0.18); break;
    }
  }
}
