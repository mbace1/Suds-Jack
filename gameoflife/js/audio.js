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

// ── the sound garden ───────────────────────────────────────────────
// The hub has an ambient bed that GROWS: one new voice for every nature
// invitation the player actually accepted. Nothing you do on the screen earns
// these — only going outside does. Kept near-inaudible on purpose.
const GARDEN_MAX = 5;
const PENT = [440, 523.25, 587.33, 659.25, 783.99];   // A minor pentatonic
let garden = null;    // { voices, nodes[], timer }

function drone(freq, gain, detune = 0) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  o.detune.value = detune;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 3.5);        // fades in, never startles
  o.connect(g).connect(ctx.destination);
  o.start(t);
  return { o, g };
}

export function gardenStart(voices) {
  if (!ctx) return;                                     // no gesture yet; hub retries
  const n = Math.max(0, Math.min(GARDEN_MAX, voices | 0));
  if (garden && garden.voices === n) return;            // already singing this
  gardenStop();
  if (n <= 0) return;
  const nodes = [];
  nodes.push(drone(110, 0.020));                        // 1 — the ground note
  if (n >= 2) nodes.push(drone(164.81, 0.014, 4));      // 2 — a fifth above it
  if (n >= 4) nodes.push(drone(220, 0.011, -5));        // 4 — the octave pad
  // 3 — sparse chimes; 5 — an occasional two-note bird figure
  const timer = setInterval(() => {
    if (!ctx || !garden) return;
    if (n >= 3 && Math.random() < 0.16) {
      tone(PENT[Math.floor(Math.random() * PENT.length)], 2.4, 'sine', 0.030);
    }
    if (n >= 5 && Math.random() < 0.05) {
      const i = Math.floor(Math.random() * 3) + 2;
      tone(PENT[i] * 2, 0.16, 'triangle', 0.022);
      tone(PENT[i + 1 > 4 ? 4 : i + 1] * 2, 0.20, 'triangle', 0.018, 0.14);
    }
  }, 900);
  garden = { voices: n, nodes, timer };
}

export function gardenStop() {
  if (!garden) return;
  clearInterval(garden.timer);
  const t = ctx ? ctx.currentTime : 0;
  for (const { o, g } of garden.nodes) {
    try {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.6);       // fade out, no click
      o.stop(t + 0.7);
    } catch { /* already stopped */ }
  }
  garden = null;
}

export const gardenMax = () => GARDEN_MAX;

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
