// audio.js — synthesised, never sampled. Every voice goes through one master
// gain, so mute really mutes and a sound added later inherits it. Browsers
// keep audio asleep until a gesture; unlock() is called from the first one.
import { TUNING } from './tuning.js?v=65';

const A = TUNING.audio;

export class Sound {
  // `volume` 0..1 scales the master (1.x's VOLUME, v81); 0 is silence
  constructor() { this.ctx = null; this.master = null; this.on = true; this.volume = 1; this._shot = 0; this._noise = null; }
  get level() { return this.on ? A.master * this.volume : 0; }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.attach(new AC());
  }
  // the master on `ctx` (the live context, or an offline one for a render):
  // through a limiter (v58) that only a pile-up ever reaches
  attach(ctx) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.level;
    const L = A.limit, lim = ctx.createDynamicsCompressor();
    lim.threshold.value = L.threshold; lim.knee.value = 0; lim.ratio.value = L.ratio; lim.attack.value = L.attack; lim.release.value = L.release;
    this.master.connect(lim); lim.connect(ctx.destination);
    const n = ctx.sampleRate;
    this._noise = ctx.createBuffer(1, n, n);
    const d = this._noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  // many of one sound at once (a brood landing, a dash boom's kills): the
  // first few are heard and the rest would only pile up past full scale —
  // twenty-one arrivals' thuds in one instant clipped (v58, measured)
  _gate(type) {
    const max = A.gate[type];
    if (!max || !this.ctx) return true;
    const t = this.ctx.currentTime, g = (this._gates ??= {})[type] ??= { t: -1, n: 0 };
    if (t - g.t > A.gate.window) { g.t = t; g.n = 0; }
    return ++g.n <= max;
  }

  setOn(on) { this.on = on; this._apply(); }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); this.on = this.volume > 0; this._apply(); }
  _apply() { if (this.master) this.master.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.02); }

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
    if (!this._gate(e.type)) return;
    switch (e.type) {
      case 'shot': if ((this._shot++ & 1) === 0) this._tone('square', 1500, 900, 0.035, 0.035); break;
      // 1.x's gels fire silently; a quiet tick is 2.0's, and a WEEVA's spiral
      // (6-15 a second) would turn it into a drone, so those stay silent
      case 'gelShot': if (!e.spiral) this._tone('triangle', 520, 300, 0.09, 0.04); break;
      case 'hit': this._tone('sine', 300, 160, 0.06, 0.08); break;
      case 'shove': this._tone('sine', 180, 90, 0.08, 0.12); break;   // v4's body-check thump
      // 1.x's death voices by family (main.js:4476-4480, audio.js:243-249): a
      // blob, a cube's crunch, and a species' own where it has one (TORO, BAMBU)
      case 'kill': {
        // HEAT (v52): every kill's voice rides up with the multiplier it was made at
        const S = TUNING.species[e.kind], d = S?.deathSound, k = 1 + TUNING.heat.sound.pitch * ((e.m || 1) - 1);
        if (d) { this._tone(d.wave, d.f0 * k, d.f1 * k, d.dur, d.vol); if (d.noiseVol) this._hiss(d.noiseDur, d.noiseVol, 1400 * k, 200, 1.2); }
        else if (S?.family === 'cube') { this._tone('square', 380 * k, 55 * k, 0.18, 0.22); this._hiss(0.13, 0.09, 1400 * k, 200, 1.2); }
        else this._tone('sine', 420 * k, 75 * k, 0.22, 0.22);
        break;
      }
      // a heat level crossed: a chime a step up the scale each level; thrown away by a hit, a fall
      case 'heat':
        if (e.up) { const f = 440 * 2 ** ((e.mult - 2) * 2 / 12); this._tone('triangle', f, f * 1.5, 0.12, 0.08); }
        else if (e.hit) this._tone('triangle', 900, 180, 0.35, 0.1);
        break;
      case 'heal': [523, 659, 784, 1047].forEach((f, i) => this._tone('sine', f, f, 0.14, 0.1, i * 0.07)); break;
      case 'bank': [659, 880, 1175].forEach((f, i) => this._tone('triangle', f, f, 0.1, 0.12, i * 0.05)); break;
      case 'potLost': this._tone('sawtooth', 500, 90, 0.4, 0.1); break;
      case 'scream': {   // 1.x sirenScream (audio.js:258-263), from the species' own tuning
        const s = TUNING.species[e.kind]?.sound;
        for (const v of s?.scream ?? []) this._tone(v.wave, v.from, v.to, v.dur, v.vol);
        if (s?.noise) this._hiss(s.noise.dur, s.noise.vol, 800, 2400, 0.8);
        break;
      }
      case 'lobLand': this._tone('sine', 150, 55, 0.28, 0.2); this._hiss(0.16, 0.12, 900, 300); break;   // 1.x lobSplash
      // a campaign room's goal moving on (v46): a step made chimes, an orb gone out falls, the heart hurt thumps
      case 'chStep':
        if (e.what === 'orbLost') this._tone('triangle', 520, 180, 0.22, 0.12);
        else if (['gate', 'orb', 'hill', 'leg', 'order', 'hunt'].includes(e.what)) { this._tone('sine', 660, 990, 0.12, 0.12); if (e.n >= e.of) this._tone('sine', 990, 1320, 0.18, 0.12, 0.1); }
        break;
      case 'heart': this._tone('sine', 140, 70, 0.18, 0.2); break;
      // the worlds' own bosses (v45): their big moments have a voice; the
      // world gels that share these events stay as quiet as they were
      case 'hopLand': if (e.big) { this._tone('sine', 120, 38, 0.4, 0.32); this._hiss(0.25, 0.14, 700, 120); } break;
      case 'wormUp': if (e.big) { this._tone('sawtooth', 70, 160, 0.35, 0.18); this._hiss(0.35, 0.12, 400, 1400); } break;
      case 'vent': if (e.big) this._hiss(0.8, 0.16, 2400, 900, 0.7); break;
      case 'stall': this._tone('square', 300, 90, 0.3, 0.14); this._tone('square', 240, 70, 0.3, 0.12, 0.12); break;
      case 'charge': this._tone('sawtooth', 220, 520, 0.25, 0.14); this._hiss(0.3, 0.1, 600, 2600); break;
      case 'bite': if (e.big) this._tone('square', 520, 120, 0.16, 0.18); break;
      case 'skid': if (e.big) { this._tone('triangle', 900, 300, 0.12, 0.12); this._hiss(0.12, 0.1, 3000, 1500); } break;
      case 'bubble': if (e.big) this._tone('sine', 700, 1400, 0.12, 0.2); break;
      case 'dashBoom': this._hiss(0.25, 0.3, 2200, 200, 1); this._tone('square', 220, 60, 0.2, 0.2); break;
      // 1.x's tinks: a WARDEN's aura (shieldTink, audio.js:255), else a plate (plateTink, audio.js:266)
      case 'block': if (e.by === 'aura') this._tone('triangle', 1900, 1400, 0.05, 0.10); else this._tone('square', 720, 480, 0.06, 0.15); break;
      // a boss's act change or a twin's rage: 1.x phaseShift (audio.js:270-273), two rising saws 0.13 s apart
      case 'phase': this._tone('sawtooth', 160, 230, 0.22, 0.32); this._tone('sawtooth', 210, 320, 0.26, 0.30, 0.13); break;
      case 'weapon': [0, 0.08, 0.16].forEach((w, i) => this._tone('square', 660 * [1, 1.25, 1.5][i], 660 * [1, 1.25, 1.5][i], 0.12, 0.06, w)); break;
      case 'curtainWarn': this._tone('sawtooth', 300, 420, 0.25, 0.12); break;
      case 'clear': this._tone('triangle', 520, 780, 0.3, 0.1); break;
      // a world change (sim/worlds.js): the floor goes down the plughole —
      // a long falling gurgle — and the droplet lands in the next world with
      // a plop, and a rising three-note for the new place
      // SURVIVAL's floor (sim/reshape.js): three warning blips, then the slam
      case 'reshapeWarn': [0, 0.55, 1.1, 1.65].forEach((d, i) => this._tone('square', i === 3 ? 1320 : 880, i === 3 ? 1320 : 880, 0.07, 0.07, d)); break;
      case 'reshape': this._hiss(0.35, 0.3, 2400, 150, 1); this._tone('sine', 110, 38, 0.45, 0.3); break;
      case 'worldOut': this._hiss(2.4, 0.22, 1800, 90, 2); this._tone('sawtooth', 330, 38, 2.6, 0.1); this._tone('sine', 90, 30, 2.2, 0.16, 0.4); break;
      case 'worldLand':
        this._tone('sine', 640, 130, 0.2, 0.22); this._hiss(0.22, 0.14, 1400, 300);
        [392, 523, 659].forEach((f, i) => this._tone('triangle', f, f, 0.22, 0.09, 0.25 + i * 0.12)); break;
      case 'hurt': this._tone('sawtooth', 160, 45, 0.4, 0.2); this._hiss(0.3, 0.2, 600, 120); break;

      // the pickups' voices, as 1.x reused them (audio.js:242-292, 374-377):
      // pickup() on a take and a good gate, shieldTink() on a dud, milestone()
      // on a chain and a bounty paid, shooterPing() when a bounty is marked,
      // a moth's blob death; a DASH pod's level up rides the pod's own chime
      case 'pickup': case 'gateDash':
        if (e.dud) this._tone('triangle', 1900, 1400, 0.05, 0.10);
        else [392, 523, 659].forEach((f, i) => this._tone('sine', f, f, 0.13, 0.18, i * 0.06));
        break;
      case 'gateChain': case 'bountyPaid': [523, 659, 784].forEach((f, i) => this._tone('triangle', f, f, 0.14, 0.18, i * 0.07)); break;
      case 'bounty': this._tone('square', 1150, 1150, 0.06, 0.13); this._tone('square', 1550, 1550, 0.07, 0.11, 0.075); break;
      case 'mothShot': this._tone('sine', 420, 75, 0.22, 0.22); break;
      case 'dashLevel': if (e.up) [0, 0.08, 0.16].forEach((w, i) => this._tone('square', 660 * [1, 1.25, 1.5][i], 660 * [1, 1.25, 1.5][i], 0.12, 0.06, w)); break;
      case 'graze': this._tone('sine', 2400, 2600, 0.03, 0.04); break;
      case 'spawn': this._hiss(0.25, 0.05, 900, 500, 3); break;
      // an arrival's thud lands when its swell in has (TUNING.gel.swell), not
      // on top of the spawn hiss; a brood let out lands at once
      case 'land': this._tone('sine', 140, 70, 0.1, 0.1, e.arrive ? TUNING.gel.swell : 0); break;
      case 'wall': this._tone('sine', 120, 80, 0.06, 0.05 * e.hard); break;
      case 'over': this._tone('sawtooth', 220, 40, 1.2, 0.18); break;
    }
  }
}
