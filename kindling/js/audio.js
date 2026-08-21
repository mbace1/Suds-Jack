// Kindling — a very quiet synth kit. No assets, no music.
//
// Every voice goes through ONE master gain, and the master is at zero until the
// footer's sound switch is turned on, so anything added later inherits the mute
// for free (the same rule gameoflife's audio.js keeps). The bed is a filtered
// noise crackle — a fire, roughly — and it is deliberately near-inaudible: this
// is a room you might leave open in another tab.

let ctx = null, master = null, bed = null, on = false;

function boot() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

export function setOn(v) {
  on = !!v;
  if (!boot()) return;
  if (on && ctx.state === 'suspended') ctx.resume();
  master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.08);
  if (on) startBed(); else stopBed();
}

export function isOn() { return on; }

function tone(freq, dur, { type = 'sine', gain = 0.14, at = 0, slide = 0 } = {}) {
  if (!on || !boot()) return;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.04, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur, { freq = 900, q = 0.7, gain = 0.1, at = 0 } = {}) {
  if (!on || !boot()) return;
  const t0 = ctx.currentTime + at;
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// ── the bed ──
function startBed() {
  if (bed || !boot()) return;
  const n = Math.floor(ctx.sampleRate * 3);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // brownish noise: a fire is mostly low rumble with the occasional tick
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3 + (Math.random() < 0.00035 ? (Math.random() * 2 - 1) * 0.6 : 0);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 620;
  const g = ctx.createGain();
  g.gain.value = 0.16;
  src.connect(f).connect(g).connect(master);
  src.start();
  bed = { src, g };
}

function stopBed() {
  if (!bed) return;
  try { bed.src.stop(); } catch { /* already gone */ }
  bed = null;
}

// how high the fire stands, so the bed swells a little on a good day
export function setWarmth(w) {
  if (!bed || !ctx) return;
  bed.g.gain.setTargetAtTime(0.1 + w * 0.16, ctx.currentTime, 0.6);
}

// ── the events ──
// One small thing kept: a wooden click and the fire taking it.
export const kept = () => { noise(0.06, { freq: 420, q: 1.4, gain: 0.13 }); tone(196, 0.5, { type: 'triangle', gain: 0.08, slide: 60 }); };
export const unkept = () => tone(150, 0.16, { type: 'sine', gain: 0.05, slide: -30 });
export const mood = () => { tone(392, 0.5, { type: 'sine', gain: 0.08 }); tone(588, 0.6, { type: 'sine', gain: 0.05, at: 0.09 }); };
export const out = () => { noise(0.3, { freq: 240, q: 0.6, gain: 0.1 }); tone(220, 0.4, { type: 'triangle', gain: 0.06, slide: -60 }); };
export const home = () => { tone(392, 0.35, { type: 'triangle', gain: 0.09 }); tone(523, 0.5, { type: 'triangle', gain: 0.08, at: 0.14 }); };
export const grew = () => [0, 0.16, 0.34].forEach((at, i) => tone([392, 523, 659][i], 0.7, { type: 'sine', gain: 0.08, at }));
export const breathIn = () => noise(1.6, { freq: 520, q: 0.5, gain: 0.045 });
export const breathOut = () => noise(2.2, { freq: 300, q: 0.5, gain: 0.05 });
export const page = () => noise(0.05, { freq: 1400, q: 2, gain: 0.05 });
