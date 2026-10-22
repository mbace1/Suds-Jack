// intro/sfx.js — the start intro's sound: one small cue per stage, in the
// 16-bit register (owner, 2026-10-22: "subtle sound FX for each stage,
// classic 16bit sounds").
//
// 16-bit here means what those machines could do, not a sample of them:
// pulse waves at 12.5 / 25 / 50 % duty, a triangle for weight, a short noise
// loop, and the SNES's one luxury, an echo (a fed-back delay through a
// low-pass). Everything is scheduled up front from the intro's own timeline
// (CUES), so the live game and the offline render of the review film play
// the same notes at the same times. Synthesised, never sampled, like the rest
// of 2.0's audio.

// The timeline the picture is cut to (intro.js reads the same table).
export const CUES = {
  logo: 0.55,        // the lockup lands
  blink: 2.05,       // Toko blinks
  midori: 2.6,       // MIDORI goes
  zoom: 3.05,        // the camera starts in
  letters: [3.4, 3.58, 3.76, 3.94],   // d, r, o, p
  collect: 4.95,     // the drop starts to gather under the p
  detach: 6.15,      // it lets go
  land: 6.93,        // it hits the floor
  grid: 7.0,         // the grid runs out of it
  eyes: 9.0,        // it opens its eyes
  hud: [9.9, 10.08, 10.26, 10.44],      // score, lives, clock, pause
  go: 10.85,         // the run starts
  end: 11.05,
};

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);   // MIDI note → Hz

function pulseWave(ctx, duty) {
  const N = 48, re = new Float32Array(N), im = new Float32Array(N);
  for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  return ctx.createPeriodicWave(re, im, { disableNormalization: false });
}

// Schedule every cue on `ctx`, into `dest`, with the intro's t = 0 at
// ctx time `t0`. Returns stop(), which silences whatever has not played yet.
export function scheduleIntroSfx(ctx, dest, t0) {
  // the cues are written at the game's own levels; LIFT sets them, as a group,
  // under the game's master (subtle: the loudest is a step below a kill)
  const LIFT = 2.5, bus = ctx.createGain(); bus.gain.value = LIFT;
  // the echo: 0.19 s, fed back at 0.3 through a low-pass, so it darkens as it repeats
  const dly = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
  dly.delayTime.value = 0.19; fb.gain.value = 0.3; lp.type = 'lowpass'; lp.frequency.value = 2600; wet.gain.value = 0.32;
  bus.connect(dest); bus.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(wet); wet.connect(dest);

  const waves = { p12: pulseWave(ctx, 0.125), p25: pulseWave(ctx, 0.25), p50: pulseWave(ctx, 0.5) };
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  { const d = noise.getChannelData(0); let s = 0x1234567; for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 2 ** 31) - 1; } }
  const nodes = [];

  // one note: a wave from f0 (sliding to f1), an attack, a hold and a release
  function tone(at, f0, dur, { wave = 'p25', f1 = f0, vol = 0.1, attack = 0.004, release = dur * 0.6, vib = 0, vibRate = 7, glide = 'exp' } = {}) {
    const t = t0 + at, o = ctx.createOscillator(), g = ctx.createGain();
    if (wave === 'tri' || wave === 'sine' || wave === 'square') o.type = wave === 'tri' ? 'triangle' : wave;
    else o.setPeriodicWave(waves[wave]);
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) {
      if (glide === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      else o.frequency.linearRampToValueAtTime(f1, t + dur);
    }
    if (vib) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = vibRate; lg.gain.value = f0 * vib;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05); nodes.push(lfo);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02); nodes.push(o);
  }
  // filtered noise: a whoosh, a splat
  function hiss(at, dur, { f0 = 800, f1 = f0, q = 1, vol = 0.05, type = 'bandpass', attack = 0.005 } = {}) {
    const t = t0 + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.loop = true; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02); nodes.push(s);
  }

  const C = CUES;
  // 1 · the lockup: a bright arpeggio on a 25% pulse over a soft triangle root
  [76, 83, 88, 95].forEach((n, i) => tone(C.logo + i * 0.055, NOTE(n), 0.42 - i * 0.05, { wave: 'p25', vol: 0.07 - i * 0.008, release: 0.3 }));
  tone(C.logo, NOTE(52), 0.9, { wave: 'tri', vol: 0.09, release: 0.7 });
  // the blink: the smallest tick there is
  tone(C.blink, NOTE(100), 0.03, { wave: 'p12', vol: 0.025 });
  // 2 · MIDORI goes: two soft falling notes
  tone(C.midori, NOTE(79), 0.16, { wave: 'tri', vol: 0.06 });
  tone(C.midori + 0.12, NOTE(74), 0.3, { wave: 'tri', vol: 0.05 });
  // 3 · the push-in: an air rush that opens up as the camera comes in
  hiss(C.zoom, 1.9, { f0: 300, f1: 2400, q: 0.8, vol: 0.035, attack: 0.9 });
  // the four letters: staccato blips, rising C E G C
  [84, 88, 91, 96].forEach((n, i) => tone(C.letters[i], NOTE(n), 0.07, { wave: 'p12', vol: 0.06 }));
  // 4 · the drop gathers: a slow rising bloop with a little wobble, then a plink as it necks
  tone(C.collect, 220, 1.12, { wave: 'tri', f1: 660, vol: 0.06, vib: 0.03, vibRate: 9, attack: 0.25, release: 0.2 });
  tone(C.collect + 0.05, 440, 1.07, { wave: 'p50', f1: 1320, vol: 0.018, vib: 0.03, vibRate: 9, attack: 0.3, release: 0.2 });
  tone(C.detach, NOTE(96), 0.06, { wave: 'p25', vol: 0.05 });
  // 5 · the fall: a slide whistle down
  tone(C.detach + 0.03, 1500, C.land - C.detach - 0.03, { wave: 'p12', f1: 260, vol: 0.04, release: 0.1 });
  // the landing: a thump, a wet splat, and a high plip
  tone(C.land, 170, 0.22, { wave: 'tri', f1: 55, vol: 0.14, release: 0.18 });
  hiss(C.land, 0.24, { f0: 2400, f1: 300, q: 0.7, vol: 0.07, type: 'lowpass' });
  tone(C.land + 0.02, 1900, 0.09, { wave: 'sine', f1: 1250, vol: 0.05 });
  // 6 · the grid runs out of the drop: a shimmering climb on a thin pulse
  [60, 64, 67, 71, 72, 76, 79, 83, 84, 88, 91, 95].forEach((n, i) =>
    tone(C.grid + 0.12 + i * 0.085, NOTE(n), 0.14, { wave: 'p12', vol: 0.035 + (i % 2) * 0.006, release: 0.1 }));
  tone(C.grid + 0.1, NOTE(48), 1.3, { wave: 'tri', vol: 0.05, attack: 0.3, release: 0.8 });
  // 7 · the eyes open: pi-ping
  tone(C.eyes, NOTE(83), 0.08, { wave: 'p50', vol: 0.06 });
  tone(C.eyes + 0.075, NOTE(88), 0.22, { wave: 'p50', vol: 0.065, release: 0.18 });
  // 8 · the HUD: one tick per element as it lands
  C.hud.forEach((at, i) => tone(at + 0.12, NOTE(93 + (i % 2) * 2), 0.03, { wave: 'p25', vol: 0.03 }));
  // GO: a short major stab
  [72, 76, 79, 84].forEach((n) => tone(C.go, NOTE(n), 0.28, { wave: 'p25', vol: 0.04, release: 0.22 }));
  tone(C.go, NOTE(48), 0.32, { wave: 'tri', vol: 0.08, release: 0.25 });

  return {
    stop() {
      const t = ctx.currentTime;
      bus.gain.cancelScheduledValues(t); bus.gain.setTargetAtTime(0, t, 0.03);
      wet.gain.setTargetAtTime(0, t, 0.08);
      for (const n of nodes) { try { n.stop(t + 0.3); } catch { /* already stopped */ } }
    },
  };
}

// The review film's soundtrack: the same cues rendered offline, as 16-bit WAV
// bytes (the capture harness muxes it under the frames).
export async function renderIntroSfxWav(seconds, gain = 0.5, rate = 48000) {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const g = ctx.createGain(); g.gain.value = gain; g.connect(ctx.destination);
  scheduleIntroSfx(ctx, g, 0.05);
  const buf = await ctx.startRendering();
  const n = buf.length, out = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, rate, true); out.setUint32(28, rate * 4, true);
  out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
  }
  return new Uint8Array(out.buffer);
}
