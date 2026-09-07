// A small synthesised kit — no samples, and every voice through one master
// gain so mute really mutes. Off until the first gesture, like every other
// game on the floor.

let ctx = null, master = null, muted = false;

function boot() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  return true;
}

export function unlock() { if (boot() && ctx.state === 'suspended') ctx.resume(); }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
export const isMuted = () => muted;

function tone({ f = 440, f2 = null, type = 'square', t = 0.12, g = 0.3, at = 0 }) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator(), a = ctx.createGain();
  const now = ctx.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + t);
  a.gain.setValueAtTime(0.0001, now); a.gain.exponentialRampToValueAtTime(g, now + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, now + t);
  o.connect(a); a.connect(master);
  o.start(now); o.stop(now + t + 0.02);
}

function noise({ t = 0.1, g = 0.2, at = 0, hp = 800 }) {
  if (!ctx || muted) return;
  const n = ctx.sampleRate * t, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const a = ctx.createGain(); a.gain.value = g;
  s.connect(f); f.connect(a); a.connect(master);
  s.start(ctx.currentTime + at);
}

export const sfx = {
  card: () => { noise({ t: 0.05, g: 0.12, hp: 2000 }); tone({ f: 660, f2: 880, type: 'triangle', t: 0.06, g: 0.12 }); },
  hit: (big = false) => { noise({ t: 0.08, g: big ? 0.35 : 0.22, hp: 400 }); tone({ f: big ? 160 : 220, f2: 60, type: 'square', t: big ? 0.18 : 0.1, g: 0.25 }); },
  block: () => { tone({ f: 330, f2: 440, type: 'triangle', t: 0.1, g: 0.2 }); tone({ f: 660, type: 'sine', t: 0.12, g: 0.1, at: 0.03 }); },
  mult: (k = 0) => tone({ f: 520 * (1 + k * 0.12), f2: 780 * (1 + k * 0.12), type: 'square', t: 0.08, g: 0.16 }),
  topple: () => { noise({ t: 0.25, g: 0.3, hp: 200 }); tone({ f: 120, f2: 40, type: 'sawtooth', t: 0.3, g: 0.25 }); tone({ f: 90, f2: 50, type: 'square', t: 0.15, g: 0.18, at: 0.32 }); },
  hurt: () => { tone({ f: 200, f2: 90, type: 'sawtooth', t: 0.22, g: 0.3 }); noise({ t: 0.12, g: 0.2, hp: 300 }); },
  status: () => tone({ f: 440, f2: 330, type: 'triangle', t: 0.14, g: 0.16 }),
  draw: () => noise({ t: 0.04, g: 0.08, hp: 3000 }),
  turn: () => { tone({ f: 392, type: 'triangle', t: 0.1, g: 0.14 }); tone({ f: 523, type: 'triangle', t: 0.14, g: 0.14, at: 0.08 }); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone({ f, type: 'triangle', t: 0.22, g: 0.2, at: i * 0.11 })),
  lose: () => [330, 294, 247, 196].forEach((f, i) => tone({ f, type: 'sawtooth', t: 0.3, g: 0.18, at: i * 0.16 })),
  pick: () => { tone({ f: 784, type: 'triangle', t: 0.08, g: 0.16 }); tone({ f: 1175, type: 'triangle', t: 0.12, g: 0.14, at: 0.06 }); },
};
