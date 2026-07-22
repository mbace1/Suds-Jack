// The Game of Life — gentle WebAudio kit, all-synth, no assets.
// Deliberately quiet and sparse: this project should sound like a music box
// left in a garden, not an arcade.

let ctx = null;

export function init() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, type = 'sine', gain = 0.12, when = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// stone turned in the puzzle
export function plink() { tone(520 + Math.random() * 60, 0.18, 'triangle', 0.10); }

// a choice made in a story
export function step() { tone(300, 0.12, 'sine', 0.08); }

// level / experience complete — small rising third
export function chime() {
  tone(523.25, 0.5, 'sine', 0.10);
  tone(659.25, 0.6, 'sine', 0.08, 0.12);
  tone(783.99, 0.8, 'sine', 0.06, 0.24);
}

// water reaching the fountain: short burst of filtered noise
export function water() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = 0.9;
  const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(900, t);
  f.frequency.linearRampToValueAtTime(2400, t + len);
  f.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.16, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}

// breathing pacer: soft swell up (inhale) or down (exhale)
export function breath(inhale) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(inhale ? 180 : 240, t);
  o.frequency.linearRampToValueAtTime(inhale ? 240 : 180, t + 3.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 1.8);
  g.gain.linearRampToValueAtTime(0.0001, t + 3.8);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 4);
}
