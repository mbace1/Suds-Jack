// All synth, no assets — and mixed the way a 1991 four-channel score was.
//
// Another World's sound is sparse to the point of severe: long stretches of one
// held drone, and then a single short hit exactly on the frame something
// happens. Nothing here loops a tune under the action. The drone tracks which
// biome you are in (its two detuned oscillators walk apart as the world gets
// stranger) and everything else is one envelope, one voice, one event.

let ctx = null, master = null, droneA = null, droneB = null, droneGain = null;
let on = true;

function boot() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
  return ctx;
}

export function resume() { boot(); if (ctx.state === 'suspended') ctx.resume(); }
export function setOn(v) { on = v; if (master) master.gain.value = v ? 0.6 : 0; }
export function isOn() { return on; }

function blip({ f = 440, f2 = f, type = 'square', a = 0.004, d = 0.12, g = 0.2, when = 0 }) {
  if (!ctx || !on) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), v = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
  v.gain.setValueAtTime(0, t);
  v.gain.linearRampToValueAtTime(g, t + a);
  v.gain.exponentialRampToValueAtTime(0.0008, t + d);
  o.connect(v); v.connect(master);
  o.start(t); o.stop(t + d + 0.02);
}

function noise({ d = 0.12, g = 0.18, hp = 300, lp = 4000, when = 0 }) {
  if (!ctx || !on) return;
  const t = ctx.currentTime + when;
  const n = Math.floor(ctx.sampleRate * d);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f1 = ctx.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp;
  const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
  const v = ctx.createGain(); v.gain.value = g;
  src.connect(f1); f1.connect(f2); f2.connect(v); v.connect(master);
  src.start(t);
}

export const sfx = {
  step: () => noise({ d: 0.05, g: 0.05, hp: 900, lp: 2600 }),
  land: () => { noise({ d: 0.13, g: 0.14, hp: 120, lp: 1300 }); blip({ f: 90, f2: 50, type: 'sine', d: 0.1, g: 0.16 }); },
  hard: () => { noise({ d: 0.3, g: 0.25, hp: 70, lp: 900 }); blip({ f: 70, f2: 34, type: 'sine', d: 0.28, g: 0.3 }); },
  jump: () => blip({ f: 190, f2: 340, type: 'square', d: 0.09, g: 0.1 }),
  grab: () => noise({ d: 0.09, g: 0.11, hp: 1400, lp: 5200 }),
  climb: () => { noise({ d: 0.16, g: 0.09, hp: 500, lp: 2200 }); blip({ f: 130, f2: 190, type: 'triangle', d: 0.16, g: 0.07 }); },
  fire: () => { blip({ f: 900, f2: 120, type: 'square', d: 0.1, g: 0.2 }); noise({ d: 0.07, g: 0.14, hp: 1800 }); },
  enemyFire: () => { blip({ f: 620, f2: 90, type: 'sawtooth', d: 0.12, g: 0.16 }); },
  orb: () => blip({ f: 260, f2: 400, type: 'sine', d: 0.24, g: 0.1 }),
  hit: () => { noise({ d: 0.16, g: 0.2, hp: 200, lp: 2000 }); blip({ f: 160, f2: 60, type: 'square', d: 0.14, g: 0.2 }); },
  kill: () => { noise({ d: 0.34, g: 0.26, hp: 90, lp: 2600 }); blip({ f: 300, f2: 40, type: 'sawtooth', d: 0.3, g: 0.18 }); },
  hurt: () => { blip({ f: 240, f2: 100, type: 'sawtooth', d: 0.22, g: 0.22 }); },
  die: () => {
    blip({ f: 320, f2: 40, type: 'sawtooth', d: 0.8, g: 0.28 });
    blip({ f: 160, f2: 26, type: 'square', d: 1.1, g: 0.2, when: 0.06 });
    noise({ d: 0.7, g: 0.14, hp: 60, lp: 800 });
  },
  pickup: () => { blip({ f: 520, type: 'triangle', d: 0.1, g: 0.16 }); blip({ f: 780, type: 'triangle', d: 0.14, g: 0.14, when: 0.07 }); },
  gate: () => { noise({ d: 0.4, g: 0.16, hp: 100, lp: 900 }); blip({ f: 84, f2: 130, type: 'square', d: 0.35, g: 0.14 }); },
  spike: () => { noise({ d: 0.1, g: 0.13, hp: 2200 }); blip({ f: 1300, f2: 700, type: 'square', d: 0.07, g: 0.09 }); },
  slab: () => { noise({ d: 0.36, g: 0.28, hp: 60, lp: 700 }); blip({ f: 64, f2: 30, type: 'sine', d: 0.4, g: 0.3 }); },
  crumble: () => noise({ d: 0.5, g: 0.13, hp: 200, lp: 1800 }),
  door: () => { blip({ f: 220, f2: 660, type: 'triangle', d: 0.5, g: 0.18 }); blip({ f: 330, f2: 990, type: 'sine', d: 0.7, g: 0.14, when: 0.12 }); },
  beat: () => blip({ f: 118, f2: 88, type: 'sine', d: 0.9, g: 0.16 }),
  alert: () => { blip({ f: 700, type: 'square', d: 0.06, g: 0.12 }); blip({ f: 940, type: 'square', d: 0.08, g: 0.12, when: 0.07 }); },
};

// The bed. One note, two oscillators, and the interval between them opening up
// as the world stops being a place anyone could have grown up in.
export function droneStart() {
  boot();
  if (droneA) return;
  droneGain = ctx.createGain(); droneGain.gain.value = 0;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 460;
  droneA = ctx.createOscillator(); droneA.type = 'sawtooth'; droneA.frequency.value = 55;
  droneB = ctx.createOscillator(); droneB.type = 'sawtooth'; droneB.frequency.value = 55.6;
  droneA.connect(f); droneB.connect(f); f.connect(droneGain); droneGain.connect(master);
  droneA.start(); droneB.start();
  droneGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 3);
}

export function droneTune(t) {
  if (!droneA || !ctx) return;
  const now = ctx.currentTime;
  const base = 55 - t * 3.4;
  droneA.frequency.linearRampToValueAtTime(base, now + 1.5);
  droneB.frequency.linearRampToValueAtTime(base * (1 + 0.011 + t * 0.006), now + 1.5);
}

export function droneStop() {
  if (!droneGain || !ctx) return;
  droneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
}
