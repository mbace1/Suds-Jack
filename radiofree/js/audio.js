// Radio Free Helsinki — all-synth codec kit, no assets.
// Every voice goes through ONE master gain, so the mute button is total rather
// than a list of sounds somebody remembered to silence. Nothing may connect
// straight to ctx.destination.

let ctx = null;
let master = null;
let isMuted = false;
let hissNode = null;      // the carrier hiss under the whole broadcast
let cityNode = null;      // low city rumble / distant tram bed

export function init() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (!master) {
    master = ctx.createGain();
    master.gain.value = isMuted ? 0 : 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function out() { return master || (ctx && ctx.destination); }

export function ready() { return !!ctx; }
export function muted() { return isMuted; }

export function setMuted(b) {
  isMuted = !!b;
  if (!master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(isMuted ? 0 : 1, t + 0.1);
}

function tone(freq, dur, type = 'square', gain = 0.05, when = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out());
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noise(dur, f0, f1, gain = 0.06, q = 1.0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(f0, t);
  f.frequency.linearRampToValueAtTime(f1, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out());
  src.start(t);
}

export function blip(seed = 0) {
  tone(660 + (seed % 7) * 34, 0.045, 'square', 0.026);
}

export function connect() {
  tone(523.25, 0.08, 'square', 0.05);
  tone(784, 0.16, 'square', 0.045, 0.09);
}

export function ring() {
  for (let i = 0; i < 3; i++) {
    tone(880, 0.07, 'square', 0.045, i * 0.42);
    tone(1174.66, 0.09, 'square', 0.035, i * 0.42 + 0.08);
  }
}

export function tune(landed = true) {
  noise(0.26, 2200, 500, 0.05, 0.8);
  if (landed) tone(392, 0.1, 'square', 0.04, 0.2);
}

export function page() { tone(330, 0.06, 'square', 0.035); tone(494, 0.09, 'square', 0.03, 0.05); }

export function decode() {
  noise(0.42, 3000, 300, 0.07, 0.7);
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(720, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.5);
  g.gain.setValueAtTime(0.04, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g).connect(out());
  o.start(t);
  o.stop(t + 0.6);
}

export function recode() { tone(300, 0.07, 'square', 0.03); tone(220, 0.12, 'square', 0.025, 0.06); }

export function carrierStart() {
  if (!ctx || hissNode) return;
  const len = 2.0;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1400;
  f.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 1.2);
  src.connect(f).connect(g).connect(out());
  src.start();
  hissNode = { src, g };
  cityStart();
}

export function carrierStop() {
  cityStop();
  if (!hissNode) return;
  const { src, g } = hissNode;
  hissNode = null;
  try {
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    src.stop(t + 0.4);
  } catch { /* already gone */ }
}

export function carrierDuck(down) {
  if (!hissNode) return;
  const t = ctx.currentTime;
  hissNode.g.gain.cancelScheduledValues(t);
  hissNode.g.gain.setValueAtTime(hissNode.g.gain.value, t);
  hissNode.g.gain.linearRampToValueAtTime(down ? 0.006 : 0.012, t + 0.25);
  if (cityNode) {
    cityNode.g.gain.cancelScheduledValues(t);
    cityNode.g.gain.setValueAtTime(cityNode.g.gain.value, t);
    cityNode.g.gain.linearRampToValueAtTime(down ? 0.003 : 0.008, t + 0.25);
  }
}

// Quiet low city bed: distant rumble + soft filtered noise. Sits under the
// carrier so the station still feels like a receiver in a city, not a void.
function cityStart() {
  if (!ctx || cityNode) return;
  const len = 3.0;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    // brown-ish noise: integrate white for low rumble character
    d[i] = (i === 0 ? 0 : d[i - 1] * 0.98) + (Math.random() * 2 - 1) * 0.02;
  }
  // normalize roughly
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < d.length; i++) d[i] /= peak;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 280;
  lp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.008, ctx.currentTime + 1.8);
  src.connect(lp).connect(g).connect(out());
  src.start();
  cityNode = { src, g };
}

function cityStop() {
  if (!cityNode) return;
  const { src, g } = cityNode;
  cityNode = null;
  try {
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    src.stop(t + 0.4);
  } catch { /* already gone */ }
}
