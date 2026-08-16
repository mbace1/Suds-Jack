// EERI — audio feedback (the FX pack's other half).
//
// **Peripheral, like `fx.js`.** Nothing in the game imports it; the dev menu
// drives it, and a voice is ported into `js/audio.js` as an explicit call
// once the owner has heard it and approved it.
//
// CLAUDE_HANDOFF.md: *"no binary audio assets unless the project's audio
// direction changes intentionally."* So every voice here is **synthesised** —
// oscillators and noise through envelopes, the same kit `js/audio.js`
// already uses and the same one every other game in this repo ships. That
// is not a limitation to work around: a procedural hit can be re-tuned in a
// slider while you listen, which is exactly what this pack is for.
//
// THE SPLIT, same as `fx.js`: the **spec is plain data** and the WebAudio
// binding is built only when `start()` is called with a context. So
// `test/fx-smoke.mjs` can assert the whole voice table in bare node — no
// audio device, no browser, no user gesture.
//
// And the one rule inherited from every other audio kit here: **everything
// routes through one master gain.** Nothing connects to `ctx.destination`
// directly, so a mute is a real mute and any voice added later inherits it.

// ---- the voice table -----------------------------------------------------
//
// One entry per event, matching `FX_SPEC`'s keys so a look and a sound are
// tuned as one thing. Frequencies in Hz, times in seconds.
//
// `type`: 'tone' (an oscillator sweep) or 'noise' (filtered white noise).
// A rule of thumb this table follows and is worth keeping: **things that
// are made of material are noise; things that are abstract are tone.** A
// bolt is a reward, so it sings; dirt is dirt, so it hisses.

export const SFX_SPEC = {
  // small, bright, upward — the same shape as the pickup particles
  pickup: {
    type: 'tone', wave: 'triangle', f0: 880, f1: 1320, dur: 0.11,
    gain: 0.16, attack: 0.004, curve: 'exp',
  },
  // …and the golden one is the same voice a fifth up, held longer, so it is
  // recognisably the same EVENT rather than a different sound entirely
  golden: {
    type: 'tone', wave: 'triangle', f0: 1320, f1: 1980, dur: 0.26,
    gain: 0.19, attack: 0.004, curve: 'exp',
  },
  // a stomp is downward force: pitch falls, and there is body under it
  stomp: {
    type: 'tone', wave: 'square', f0: 420, f1: 120, dur: 0.14,
    gain: 0.2, attack: 0.002, curve: 'exp',
  },
  // dirt: low, short, unpitched. Bandpassed low so it reads as earth rather
  // than as static.
  dirt: {
    type: 'noise', f: 420, q: 0.9, dur: 0.22, gain: 0.16, attack: 0.003,
  },
  // brick: the same idea harder and brighter, because a wall is not soil
  brick: {
    type: 'noise', f: 1500, q: 1.6, dur: 0.18, gain: 0.2, attack: 0.001,
  },
  // heavy: a girder landing. Long, low, and it must not be loud — weight is
  // carried by DURATION, and a loud one just startles a six-year-old.
  heavy: {
    type: 'tone', wave: 'sine', f0: 150, f1: 55, dur: 0.5,
    gain: 0.22, attack: 0.006, curve: 'exp',
  },
  // the only voice with more than one note in it, because it happens once
  clear: {
    type: 'arp', wave: 'triangle', notes: [523, 659, 784, 1047],
    step: 0.09, dur: 0.2, gain: 0.17, attack: 0.005,
  },
};

/** Every event name the kit can play — the contract the dev menu lists. */
export const VOICES = Object.keys(SFX_SPEC);

/**
 * Pure check, so the test can hold the table honest without an audio device.
 * Returns a list of complaints; empty means the table is playable.
 */
export function validateSpec(spec = SFX_SPEC) {
  const bad = [];
  for (const [name, v] of Object.entries(spec)) {
    if (!['tone', 'noise', 'arp'].includes(v.type)) bad.push(`${name}: unknown type "${v.type}"`);
    if (!(v.gain > 0 && v.gain <= 0.4)) bad.push(`${name}: gain ${v.gain} outside 0…0.4`);
    if (!(v.dur > 0 && v.dur <= 2)) bad.push(`${name}: dur ${v.dur} outside 0…2s`);
    if (v.type === 'tone' && !(v.f0 > 0 && v.f1 > 0)) bad.push(`${name}: tone needs f0 and f1`);
    if (v.type === 'noise' && !(v.f > 0)) bad.push(`${name}: noise needs a centre frequency`);
    if (v.type === 'arp' && !(Array.isArray(v.notes) && v.notes.length)) bad.push(`${name}: arp needs notes`);
    // a six-year-old with a phone at arm's length: nothing may be shrill
    if (v.f1 > 4000 || v.f0 > 4000 || (v.notes || []).some((n) => n > 4000)) {
      bad.push(`${name}: above 4kHz — shrill on a phone speaker`);
    }
  }
  return bad;
}

// ---- the WebAudio binding ------------------------------------------------

export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.8;
    this.played = [];        // names, newest last — the dev menu reads this
  }

  /**
   * Build the graph. Must be called from a gesture on iOS, which is why it
   * is separate from the constructor and why the dev menu calls it on the
   * first click rather than at load.
   */
  start(Ctx = globalThis.AudioContext || globalThis.webkitAudioContext) {
    if (this.ctx || !Ctx) return this.ctx;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);   // the ONLY connection to it
    return this.ctx;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  setEnabled(on) { this.enabled = !!on; }

  /** Play one voice. Silent and harmless with no context — never throws. */
  play(name, when = 0) {
    this.played.push(name);
    if (this.played.length > 64) this.played.shift();
    const v = SFX_SPEC[name];
    if (!v || !this.enabled || !this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    const t0 = this.ctx.currentTime + when;
    if (v.type === 'arp') {
      v.notes.forEach((f, i) => this._tone({ ...v, f0: f, f1: f }, t0 + i * v.step));
    } else if (v.type === 'noise') {
      this._noise(v, t0);
    } else {
      this._tone(v, t0);
    }
    return true;
  }

  _env(gain, v, t0) {
    const a = v.attack ?? 0.004;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(v.gain, t0 + a);
    // exponential release: a linear one reads as a click at the tail
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur);
  }

  _tone(v, t0) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = v.wave || 'triangle';
    o.frequency.setValueAtTime(v.f0, t0);
    if (v.f1 !== v.f0) {
      const to = Math.max(1, v.f1);
      if (v.curve === 'exp') o.frequency.exponentialRampToValueAtTime(to, t0 + v.dur);
      else o.frequency.linearRampToValueAtTime(to, t0 + v.dur);
    }
    this._env(g, v, t0);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + v.dur + 0.02);
  }

  _noise(v, t0) {
    const n = Math.ceil(this.ctx.sampleRate * v.dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = v.f; bp.Q.value = v.q ?? 1;
    const g = this.ctx.createGain();
    this._env(g, v, t0);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + v.dur + 0.02);
  }

  /** For the dev menu's "did anything actually fire?" readout. */
  recent(n = 6) { return this.played.slice(-n); }

  dispose() { try { this.ctx?.close(); } catch { /* already gone */ } this.ctx = null; }
}
