// bed.js — v267 THE WORLD BED. A continuous, fully synthesised ambience for
// each arcade world. Toko Drop had no music at all through v266: every sound
// was a one-shot tone or noise burst. A world is now heard as well as seen.
//
// Every bed is built on ANY BaseAudioContext and schedules its own events in
// CONTEXT time, never on a timer — so the same code runs live and renders in
// an OfflineAudioContext, which is how a bed is measured (and listened to)
// without a speaker: see VERSIONS.md v267.
//
// A bed is also INFORMATION, not decoration. Each one answers to its world's
// rule through pulse(): THE VOID's noise breathes with the fog, THE VEIN's
// heart quickens when a sweep is coming, THE KILN swells before the updraft
// and thumps when it lands. tension() raises a layer while a boss lives.
//
// Nothing here reads Math.random() for anything that must repeat, and nothing
// is sampled: no audio files, no network. The only randomness is the FOAM's
// bubble timing, which is texture.

export const BED_NAMES = ['surface', 'well', 'vein', 'void', 'foam', 'kiln'];

// the root each world is built on, and its tension layer's pitch
const ROOT = [55, 49, 55, 36, 110, 41.2];

const _noiseByCtx = new WeakMap();
function noiseBuffer(ctx) {
  let b = _noiseByCtx.get(ctx);
  if (!b) {
    const n = Math.floor(ctx.sampleRate * 2);
    b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 1234567;   // a fixed LCG: the same hiss every time, and no Math.random
    for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1; }
    _noiseByCtx.set(ctx, b);
  }
  return b;
}

// Build world `w`'s bed into `out`, silent; call fadeIn(). Returns the handle.
export function buildBed(ctx, out, w) {
  const nodes = [];                       // everything that must be stopped
  const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(out);
  const osc = (type, freq, gain, dest = bus) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    o.connect(g); g.connect(dest); o.start(); nodes.push(o);
    return { o, g };
  };
  const noise = (dest) => {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx); src.loop = true;
    src.connect(dest); src.start(); nodes.push(src); return src;
  };
  const filter = (type, freq, q, dest = bus) => {
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    f.connect(dest); return f;
  };
  const lfo = (rate, depth, param) => {      // a sine that moves `param` by ±depth
    const o = ctx.createOscillator(); o.frequency.value = rate;
    const g = ctx.createGain(); g.gain.value = depth;
    o.connect(g); g.connect(param); o.start(); nodes.push(o);
  };
  // a one-shot that stops itself: a pitched blip or thump at context time t
  const shot = (t, type, f0, f1, dur, vol, dest = bus) => {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  };

  let level = 0.07;           // the bed's own ceiling, under every sound effect
  let scheduledTo = 0;        // context time the periodic events are laid down to
  let schedule = () => {};    // (from, to) — lays down this world's periodic events
  const state = { warnUntil: -1 };
  let onPulse = () => {};

  // ── the six worlds ────────────────────────────────────────────────────────
  if (w === 0) {                                  // THE SURFACE — calm, alive
    level = 0.13;
    const grp = ctx.createGain(); grp.gain.value = 0.75; grp.connect(bus);
    osc('sine', 55, 0.35, grp); osc('sine', 82.41, 0.18, grp);
    lfo(0.18, 0.22, grp.gain);
    schedule = (from, to) => {                    // a soft tick every 2 s
      for (let t = Math.ceil(from / 2) * 2; t < to; t += 2) shot(t, 'sine', 220, 218, 0.6, 0.09);
    };
  } else if (w === 1) {                           // THE WELL — water, swelling
    level = 0.11;
    const sw = ctx.createGain(); sw.gain.value = 0.5; sw.connect(bus);
    noise(filter('bandpass', 420, 0.9, sw));
    lfo(0.12, 0.45, sw.gain);                     // the current's swell
    osc('sine', 49, 0.35); osc('sine', 196, 0.06); osc('sine', 199.5, 0.06);   // beating = water
  } else if (w === 2) {                           // THE VEIN — a heart under the floor
    level = 0.15;
    osc('triangle', 55, 0.25); osc('triangle', 65.41, 0.18);                   // the minor drone
    const lp = filter('lowpass', 200, 0.7);
    schedule = (from, to) => {
      // a beat every 0.9 s — twice as fast while a sweep is coming
      let t = Math.max(from, state.nextBeat ?? from);
      while (t < to) {
        (state.beats ??= []).push(t); if (state.beats.length > 64) state.beats.shift();   // for measurement
        shot(t, 'sine', 70, 38, 0.14, 0.9, lp);
        shot(t + 0.24, 'sine', 64, 36, 0.12, 0.6, lp);
        t += t < state.warnUntil ? 0.45 : 0.9;
      }
      state.nextBeat = t;
    };
    onPulse = (kind, v, at) => {
      if (kind !== 'warn') return;
      state.warnUntil = at + (v ?? 1.1);
      // the beat after a warning must come NOW, not at the slow spacing: the
      // next one was already committed 0.9 s out, so the first quick beat
      // landed a second after the warning — about when the sweep itself did.
      // Only an uncommitted beat can move (anything inside the lookahead is laid).
      if ((state.nextBeat ?? 0) > at + 0.15) state.nextBeat = Math.max(at + 0.15, scheduledTo);
    };
  } else if (w === 3) {                           // THE VOID — it breathes with the dark
    level = 0.12;
    osc('sine', 36, 0.28);   // under the breath, not over it
    const g = ctx.createGain(); g.gain.value = 0.08; g.connect(bus);
    const lp = filter('lowpass', 160, 0.8, g);
    noise(lp);
    onPulse = (kind, v, at) => {                  // v = how dark it is, 0..1
      if (kind !== 'breath') return;
      const k = Math.max(0, Math.min(1, v));
      // the game sends this every frame; an automation event per frame per
      // param piles up in the timeline, so only a real change is written
      if (Math.abs(k - (state.lastK ?? -1)) < 0.03 && at - (state.lastAt ?? -9) < 0.3) return;
      state.lastK = k; state.lastAt = at;
      g.gain.setTargetAtTime(0.06 + 1.1 * k, at, 0.15);
      lp.frequency.setTargetAtTime(160 + 520 * k, at, 0.15);
    };
  } else if (w === 4) {                           // THE FOAM — shimmer and bubbles
    level = 0.2;
    for (const [f, r] of [[880, 0.07], [1318.5, 0.11], [1760, 0.13]]) {
      const { o } = osc('sine', f, 0.09); lfo(r, f * 0.004, o.frequency);
    }
    noise(filter('highpass', 3200, 0.7, (() => { const g = ctx.createGain(); g.gain.value = 0.05; g.connect(bus); return g; })()));
    schedule = (from, to) => {
      let t = Math.max(from, state.nextBubble ?? from);
      while (t < to) { shot(t, 'sine', 600, 1400, 0.07, 0.22); t += 0.25 + Math.random() * 0.85; }
      state.nextBubble = t;
    };
  } else {                                        // THE KILN — rumble, and the bellows
    level = 0.13;
    const lp = filter('lowpass', 170, 1.2);
    osc('sawtooth', 41.2, 0.5, lp);
    noise(filter('lowpass', 110, 0.7, (() => { const g = ctx.createGain(); g.gain.value = 0.4; g.connect(bus); return g; })()));
    onPulse = (kind, v, at) => {
      if (kind === 'swell') {                     // the updraft is coming: open the furnace
        const d = v ?? 0.8;
        lp.frequency.cancelScheduledValues(at);
        lp.frequency.setValueAtTime(170, at);
        lp.frequency.exponentialRampToValueAtTime(950, at + d);
        lp.frequency.exponentialRampToValueAtTime(170, at + d + 0.6);
      } else if (kind === 'push') {
        shot(at, 'sine', 55, 30, 0.3, 1.0);
      }
    };
  }

  // the boss layer: a buzzing saw two octaves up, off until a boss lives
  const tens = ctx.createGain(); tens.gain.value = 0; tens.connect(bus);
  const tbp = filter('bandpass', 900, 2, tens);
  osc('sawtooth', ROOT[w] * 4, 0.9, tbp);
  lfo(5, 0.35, tens.gain);

  const handle = {
    world: w, bus,
    fadeIn(at, secs) {
      bus.gain.cancelScheduledValues(at);
      bus.gain.setValueAtTime(bus.gain.value, at);
      bus.gain.linearRampToValueAtTime(level, at + secs);
    },
    // lay the periodic events down to context time `until`
    tick(until) { if (until > scheduledTo) { schedule(Math.max(scheduledTo, ctx.currentTime), until); scheduledTo = until; } },
    pulse(kind, v, at = ctx.currentTime) { onPulse(kind, v, at); },
    tension(on, at = ctx.currentTime) {
      if ((handle._tension ?? false) === on) return;
      handle._tension = on;
      tens.gain.setTargetAtTime(on ? 0.9 : 0, at, on ? 0.6 : 0.4);
    },
    // fade out and stop everything; a one-shot already scheduled past this stops on its own
    stop(at, secs) {
      bus.gain.cancelScheduledValues(at);
      bus.gain.setValueAtTime(bus.gain.value, at);
      bus.gain.linearRampToValueAtTime(0, at + secs);
      for (const n of nodes) { try { n.stop(at + secs + 0.05); } catch (_) {} }
      scheduledTo = Infinity;      // no more events once it is going
    },
    nodeCount: () => nodes.length,
    beatsIn: (a, b) => (state.beats ?? []).filter(t => t >= a && t < b).length,   // THE VEIN's heart, as scheduled
  };
  return handle;
}
