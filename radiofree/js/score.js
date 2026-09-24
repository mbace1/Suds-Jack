// Radio Free Helsinki — the film's soundtrack, synthesised from its plan.
//
// A clip without sound is a gif. Every other code-made film of the week has a
// score and a voice; this is ours, and it is built the way the picture is:
// nothing sampled, nothing downloaded, every sound a function of the PLAN
// (`js/film.js`), so a cut the picture makes is a cut the ear hears on the
// same frame, and a clip rendered twice is the same clip.
//
// Three buses into one master:
//   MUSIC — a lo-fi bed on a beat grid (96 BPM, A minor, i–VI–III–VII) that
//           follows the film's sections: sparse on the cold open, the groove
//           under the reads (ducked while Toko speaks), OUT for the breath
//           with a riser into the reveal, heavier through the hold, a tape-
//           stop into the card, and the station's three-note ident.
//   VOICE — Toko. Not text-to-speech — the station is trilingual and a voice
//           that speaks one language well and two badly is worse than none
//           (the kokoro trial is held for exactly that). He BABBLES: a
//           syllable on the same clock and the same amplitudes as the mouth
//           in `actAt`, each one a buzz through two vowel formants, and the
//           whole voice through a radio band, because he is on the radio.
//   SFX   — every event on screen: cut whooshes, the V-hold roll, word-run
//           pops, the DECODE hit and stamp, the strike scratch, a key click
//           per typed character, the counter's ticks and landing bell, the
//           take's boing, the tube dying.
//
// The mix is normalised to −16 LUFS integrated (ITU-R BS.1770 K-weighting,
// 400 ms blocks, absolute and relative gates) — the level the best of the
// week's films were delivered at — with a soft ceiling at −1 dBFS.

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const SCORE = {
  bpm: 96,
  // A minor: Am – F – C – G, one chord a bar, as MIDI roots and triads
  bars: [
    { root: 45, chord: [57, 60, 64] },
    { root: 41, chord: [53, 57, 60] },
    { root: 48, chord: [55, 60, 64] },
    { root: 43, chord: [55, 59, 62] },
  ],
  arp: [0, 2, 1, 2, 0, 1, 2, 1],        // chord-tone order for the eighths
  target: -16,                          // LUFS
  ceiling: 0.84,                        // −1.5 dBFS, headroom for the codec's overshoot
  duck: 0.45,                           // the bed under Toko's voice
  voice: { f0: 148, spread: 0.22, len: 0.13 },
};

// vowel formants (F1, F2) — Toko's syllables pick one each
const VOWELS = [[800, 1200], [400, 2000], [300, 2300], [450, 800], [340, 700]];

/**
 * Render the plan's soundtrack. Resolves an AudioBuffer (stereo, `sampleRate`)
 * of exactly `seconds`, already normalised. `lufs` on the result says where it
 * landed before normalisation, for the manifest.
 */
export async function renderSoundtrack(plan, opts = {}) {
  const sr = opts.sampleRate || 48000;
  const S = opts.seconds || plan.S;
  const len = Math.max(1, Math.ceil(S * sr));
  const ctx = new OfflineAudioContext(2, len, sr);
  const T = opts.timing;                           // film.js TIMING, passed in to avoid a cycle
  const noise = makeNoise(ctx);

  const master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.12;
  master.connect(comp).connect(ctx.destination);

  const music = ctx.createGain(); music.connect(master);
  const sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
  // the voice rides a radio: band-limited, a touch of drive
  const vHP = ctx.createBiquadFilter(); vHP.type = 'highpass'; vHP.frequency.value = 280;
  const vLP = ctx.createBiquadFilter(); vLP.type = 'lowpass'; vLP.frequency.value = 3400;
  const vDrive = ctx.createWaveShaper(); vDrive.curve = driveCurve(2.2);
  const voice = ctx.createGain(); voice.gain.value = 0.9;
  vHP.connect(vLP).connect(vDrive).connect(voice).connect(master);

  const reveal = plan.reveal, holdEnd = plan.holdEnd, breath0 = reveal - T.breath;
  const beat = 60 / SCORE.bpm, bar = beat * 4;

  // ── MUSIC: the sections, as gain automation on the bus ──
  const g = music.gain;
  g.setValueAtTime(0.55, 0);
  g.linearRampToValueAtTime(0.9, T.open);
  // ducking under every read caption, back up in the gaps
  for (const c of plan.captions.filter(c => c.kind === 'read')) {
    g.setTargetAtTime(0.9 * SCORE.duck, c.t0, 0.04);
    g.setTargetAtTime(0.9, c.t1, 0.12);
  }
  g.setTargetAtTime(0.0, breath0, 0.05);          // the breath: the bed drops out
  g.setValueAtTime(0.0, reveal - 0.001);
  g.setValueAtTime(1.0, reveal);                  // and slams back on the reveal
  g.setTargetAtTime(0.0, holdEnd - 0.02, 0.03);   // the tube dies, the bed with it

  // bed filter: closed on the cold open, open for the reads, brightest in the hold
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
  lp.frequency.setValueAtTime(500, 0);
  lp.frequency.exponentialRampToValueAtTime(2600, T.open);
  lp.frequency.setValueAtTime(2600, reveal - 0.001);
  lp.frequency.setValueAtTime(5200, reveal);
  lp.connect(music);

  const nBeats = Math.ceil(holdEnd / beat);
  for (let i = 0; i < nBeats; i++) {
    const t = i * beat;
    if (t >= holdEnd) break;
    if (t >= breath0 && t < reveal) continue;      // silence in the breath
    const b = SCORE.bars[Math.floor(t / bar) % SCORE.bars.length];
    const hold = t >= reveal;
    const open = t < T.open;
    const bi = i % 4;
    // drums: sparse on the open, four on the floor after, half-time heavy in the hold
    if (!open) {
      if (!hold || bi === 0 || bi === 2) kick(ctx, lp, t, hold ? 0.95 : 0.85);
      if (bi === 1 || bi === 3) clap(ctx, lp, noise, t, hold ? 0.5 : 0.38);
    }
    hat(ctx, lp, noise, t + beat / 2, open ? 0.07 : 0.12);
    if (!open) hat(ctx, lp, noise, t, 0.05);
    // bass on the beat, an octave down in the hold
    if (!open) bass(ctx, lp, t, midi(b.root - (hold ? 12 : 0)), beat * 0.9, hold ? 0.24 : 0.22);
    // pad, a bar long, on each bar line
    if (bi === 0) pad(ctx, lp, t, b.chord.map(midi), Math.min(bar, holdEnd - t), open ? 0.09 : 0.07);
    // arp in eighths, from the reads on
    if (!open) for (let e = 0; e < 2; e++) {
      const step = SCORE.arp[(i * 2 + e) % SCORE.arp.length];
      pluck(ctx, lp, t + e * beat / 2, midi(b.chord[step] + 12 + (hold ? 7 : 0)), hold ? 0.075 : 0.055);
    }
  }
  // the riser across the breath
  riser(ctx, sfx, noise, breath0, reveal);

  // the card: a chord that rings, and the ident — three notes, A E A'
  const card = holdEnd;
  pad(ctx, music, card, [57, 64, 71, 76].map(midi), Math.max(0.3, S - card), 0.09, true);
  [69, 76, 81].forEach((m, i) => bell(ctx, sfx, card + 0.12 + i * 0.16, midi(m), 0.22));

  // ── VOICE: Toko's syllables, on actAt's clock ──
  for (const c of plan.captions.filter(c => c.kind === 'read')) {
    const n0 = Math.ceil(c.t0 * T.syl), n1 = Math.floor(c.t1 * T.syl);
    for (let n = n0; n <= n1; n++) {
      const t = n / T.syl;
      const u = (t - c.t0) / (c.t1 - c.t0);
      if (u >= 0.88 || u < 0) continue;
      const amp = 0.45 + hash(n) * 0.55;
      // intonation: a lift at the start of the sentence, a fall at its end
      const tune = 1 + 0.12 * Math.sin(u * Math.PI * 0.9) - 0.16 * clamp((u - 0.7) / 0.18);
      syllable(ctx, vHP, noise, t, SCORE.voice.f0 * tune * (1 + (hash(n * 3.1) - 0.5) * SCORE.voice.spread),
        VOWELS[Math.floor(hash(n * 7.7) * VOWELS.length)], amp);
    }
  }

  // ── SFX: every event on screen ──
  const shots = plan.shots;
  for (let i = 1; i < shots.length; i++) {
    const s = shots[i], prev = shots[i - 1], t = s.t0;
    if (t === reveal || s.shot === 'card') continue;
    if (!s.decoded && s.shot !== 'anchor' && prev.shot !== 'anchor') roll(ctx, sfx, t);
    else whoosh(ctx, sfx, noise, t, 0.22);
    if (s.take) boing(ctx, sfx, t + 0.12);
  }
  // word-run pops
  for (const r of plan.runs) {
    const words = String(r.text).split(/\s+/).filter(Boolean).slice(0, 10);
    words.forEach((w, wi) => blip(ctx, sfx, r.t + wi * T.wordStagger, 700 + wi * 55, 0.05));
  }
  // the reveal: the hit, then the stamp
  impact(ctx, sfx, noise, reveal);
  stamp(ctx, sfx, noise, reveal + T.flash + 0.05);
  // plain readings: the strike scratches, the keys click
  for (const c of plan.captions.filter(c => c.kind === 'pair')) {
    scratch(ctx, sfx, noise, c.t0 + 0.08, T.strike);
    const t0 = c.t0 + 0.08 + T.strike * 0.6;
    const chars = String(c.plain || '');
    for (let i = 0; i < chars.length; i++) {
      const t = t0 + i * T.typeChar;
      if (t >= c.t1) break;
      if (chars[i] !== ' ') click(ctx, sfx, noise, t, 0.05 + hash(i) * 0.03);
    }
  }
  // the counter rolls and lands
  if (plan.counter) {
    const c0 = plan.counter.t0;
    for (let k = 0; k < 14; k++) blip(ctx, sfx, c0 + k * (T.counter / 14), 500 + k * 40, 0.035);
    bell(ctx, sfx, c0 + T.counter, midi(88), 0.18);
  }
  // the tube switching off
  bwoop(ctx, sfx, noise, holdEnd - T.collapse);
  // pirate air: a bed of static with the odd crackle under everything
  staticBed(ctx, master, noise, S);

  const buf = await ctx.startRendering();
  const lufs = loudness(buf);
  normalise(buf, Number.isFinite(lufs) ? Math.pow(10, (SCORE.target - lufs) / 20) : 1, SCORE.ceiling);
  return { buffer: buf, lufs, after: loudness(buf) };
}

// ── instruments ──────────────────────────────────────────────────────────

function makeNoise(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
  return b;
}
function noiseSrc(ctx, noise, t, dur) {
  const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true;
  n.start(t, (t * 7.3) % 1.5); n.stop(t + dur + 0.05);
  return n;
}
function env(ctx, t, a, h, r, peak) {
  const g = ctx.createGain(); const p = g.gain;
  p.setValueAtTime(0, Math.max(0, t));
  p.linearRampToValueAtTime(peak, t + a);
  p.setValueAtTime(peak, t + a + h);
  p.exponentialRampToValueAtTime(0.0001, t + a + h + r);
  return g;
}
function driveCurve(k) {
  const c = new Float32Array(1024);
  for (let i = 0; i < c.length; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
  return c;
}
function kick(ctx, out, t, v) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  const g = env(ctx, t, 0.002, 0.02, 0.28, 0.9 * v);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.4);
}
function clap(ctx, out, noise, t, v) {
  const n = noiseSrc(ctx, noise, t, 0.25);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 1.2;
  const g = env(ctx, t, 0.002, 0.01, 0.16, v);
  n.connect(f).connect(g).connect(out);
}
function hat(ctx, out, noise, t, v) {
  const n = noiseSrc(ctx, noise, t, 0.08);
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = env(ctx, t, 0.001, 0.005, 0.045, v);
  n.connect(f).connect(g).connect(out);
}
function bass(ctx, out, t, f0, dur, v) {
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f0;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 5;
  f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + dur);
  const g = env(ctx, t, 0.005, dur * 0.5, dur * 0.5, v);
  o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.1);
}
function pad(ctx, out, t, freqs, dur, v, ring = false) {
  for (const f0 of freqs) for (const det of [-7, 7]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f0; o.detune.value = det;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = ring ? 2400 : 1100;
    const rel = ring ? Math.max(0.2, dur - 0.1) : 0.35;
    const g = env(ctx, t, ring ? 0.02 : 0.25, Math.max(0.01, dur - (ring ? 0.02 : 0.25) - (ring ? rel : 0.1)), rel, v / freqs.length);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur + rel + 0.1);
  }
}
function pluck(ctx, out, t, f0, v) {
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f0;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.18);
  const g = env(ctx, t, 0.003, 0.02, 0.18, v);
  o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.25);
}
function bell(ctx, out, t, f0, v) {
  for (const [ratio, amp, dec] of [[1, 1, 1.2], [2.76, 0.4, 0.5], [5.4, 0.2, 0.25]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * ratio;
    const g = env(ctx, t, 0.002, 0.01, dec, v * amp);
    o.connect(g).connect(out); o.start(t); o.stop(t + dec + 0.1);
  }
}
function syllable(ctx, out, noise, t, f0, [f1, f2], amp) {
  const L = SCORE.voice.len;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0 * 1.04, t); o.frequency.linearRampToValueAtTime(f0 * 0.97, t + L);
  const mix = ctx.createGain(); mix.gain.value = 1;
  for (const [fr, q, lv] of [[f1, 6, 1], [f2, 9, 0.6]]) {
    const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr; b.Q.value = q;
    const lg = ctx.createGain(); lg.gain.value = lv;
    o.connect(b).connect(lg).connect(mix);
  }
  const g = env(ctx, t, 0.012, L * 0.45, L * 0.5, 0.9 * amp);
  mix.connect(g).connect(out);
  o.start(t); o.stop(t + L + 0.05);
  // a breath of consonant on the front of some syllables
  if (hash(t * 91) < 0.45) {
    const n = noiseSrc(ctx, noise, t, 0.04);
    const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 2500;
    const ng = env(ctx, t, 0.002, 0.005, 0.025, 0.25 * amp);
    n.connect(hf).connect(ng).connect(out);
  }
}
function whoosh(ctx, out, noise, t, v) {
  const n = noiseSrc(ctx, noise, t - 0.08, 0.3);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(600, Math.max(0, t - 0.08)); f.frequency.exponentialRampToValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.15);
  const g = env(ctx, Math.max(0, t - 0.08), 0.07, 0.02, 0.12, v);
  n.connect(f).connect(g).connect(out);
}
function roll(ctx, out, t) {
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.22);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 30;
  const lg = ctx.createGain(); lg.gain.value = 40; lfo.connect(lg).connect(o.frequency);
  const g = env(ctx, t, 0.005, 0.1, 0.12, 0.22);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.3); lfo.start(t); lfo.stop(t + 0.3);
}
function blip(ctx, out, t, f0, v) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + 0.04);
  const g = env(ctx, t, 0.002, 0.01, 0.05, v);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.1);
}
function riser(ctx, out, noise, t0, t1) {
  const d = t1 - t0;
  const n = noiseSrc(ctx, noise, t0, d);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
  f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(6000, t1);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.45, t1 - 0.01); g.gain.setValueAtTime(0, t1);
  n.connect(f).connect(g).connect(out);
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1);
  const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 2000;
  const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.12, t1 - 0.01); og.gain.setValueAtTime(0, t1);
  o.connect(of).connect(og).connect(out); o.start(t0); o.stop(t1);
}
function impact(ctx, out, noise, t) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
  const g = env(ctx, t, 0.003, 0.05, 0.9, 1.0);
  o.connect(g).connect(out); o.start(t); o.stop(t + 1.1);
  const n = noiseSrc(ctx, noise, t, 1.4);
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
  const ng = env(ctx, t, 0.002, 0.03, 1.2, 0.45);
  n.connect(f).connect(ng).connect(out);
}
function stamp(ctx, out, noise, t) {
  kick(ctx, out, t, 1.0);
  const n = noiseSrc(ctx, noise, t, 0.2);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
  const d = ctx.createWaveShaper(); d.curve = driveCurve(6);
  const g = env(ctx, t, 0.001, 0.03, 0.14, 0.5);
  n.connect(f).connect(d).connect(g).connect(out);
}
function scratch(ctx, out, noise, t, d) {
  const n = noiseSrc(ctx, noise, t, d);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 4;
  f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(4800, t + d);
  const g = env(ctx, t, 0.01, d * 0.6, d * 0.4, 0.3);
  n.connect(f).connect(g).connect(out);
}
function click(ctx, out, noise, t, v) {
  const n = noiseSrc(ctx, noise, t, 0.02);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 2;
  const g = env(ctx, t, 0.0005, 0.002, 0.012, v);
  n.connect(f).connect(g).connect(out);
}
function boing(ctx, out, t) {
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(660, t + 0.12);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 14;
  const lg = ctx.createGain(); lg.gain.setValueAtTime(60, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.5);
  lfo.connect(lg).connect(o.frequency);
  const g = env(ctx, t, 0.005, 0.1, 0.4, 0.35);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.6); lfo.start(t); lfo.stop(t + 0.6);
}
function bwoop(ctx, out, noise, t) {
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.32);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
  const g = env(ctx, t, 0.003, 0.2, 0.15, 0.3);
  o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.45);
  const n = noiseSrc(ctx, noise, t + 0.25, 0.2);
  const ng = env(ctx, t + 0.25, 0.002, 0.03, 0.12, 0.2);
  n.connect(ng).connect(out);
}
function staticBed(ctx, out, noise, S) {
  const n = noiseSrc(ctx, noise, 0, S);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.5;
  const g = ctx.createGain(); g.gain.value = 0.018;
  n.connect(f).connect(g).connect(out);
  for (let i = 0; i < S * 1.4; i++) {
    const t = hash(i * 13.7) * S;
    const c = noiseSrc(ctx, noise, t, 0.01);
    const cg = env(ctx, t, 0.0005, 0.001, 0.006, 0.05 + hash(i) * 0.08);
    c.connect(cg).connect(out);
  }
}

// ── loudness: ITU-R BS.1770 integrated, K-weighted, gated ─────────────────
function biquad(x, b, a) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function kCoeffs(fs) {
  // the pre-filter shelf and the RLB high-pass, bilinear from the spec's analog
  // prototypes so any sample rate works, not just 48 kHz
  let f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
  let K = Math.tan(Math.PI * f0 / fs), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Q + K * K;
  const shelf = {
    b: [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0],
    a: [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0],
  };
  f0 = 38.13547087602444; Q = 0.5003270373238773;
  K = Math.tan(Math.PI * f0 / fs);
  a0 = 1 + K / Q + K * K;
  const hp = { b: [1, -2, 1], a: [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0] };
  return [shelf, hp];
}
export function loudness(buf) {
  const fs = buf.sampleRate, [sh, hp] = kCoeffs(fs);
  const chans = [];
  for (let c = 0; c < buf.numberOfChannels; c++) chans.push(biquad(biquad(buf.getChannelData(c), sh.b, sh.a), hp.b, hp.a));
  const block = Math.round(0.4 * fs), step = Math.round(0.1 * fs);
  const z = [];
  for (let s = 0; s + block <= chans[0].length; s += step) {
    let sum = 0;
    for (const ch of chans) { let e = 0; for (let i = s; i < s + block; i++) e += ch[i] * ch[i]; sum += e / block; }
    z.push(sum);
  }
  const L = (v) => -0.691 + 10 * Math.log10(v);
  const abs = z.filter(v => L(v) > -70);
  if (!abs.length) return -Infinity;
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter(v => L(v) > rel);
  return L(gated.reduce((a, b) => a + b, 0) / gated.length);
}
function normalise(buf, gain, ceil) {
  const knee = ceil * 0.8, room = ceil - knee;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const v = d[i] * gain, a = Math.abs(v);
      d[i] = a <= knee ? v : Math.sign(v) * (knee + room * Math.tanh((a - knee) / room));
    }
  }
}
