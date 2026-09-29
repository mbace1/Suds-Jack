// Every sound in the pit is synthesised, and every voice goes through ONE
// master gain — so mute really mutes, and anything added later inherits it.
// Nothing is sampled; there is no audio file in this game.

let ctx = null, master = null, bus = null, room = null;
let muted = false;
const last = {};           // rate limits per voice, so a stream of coins is a rain and not a roar

function ok() { return ctx && ctx.state === 'running' && !muted; }

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
  roomTone();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05);
}
export function isMuted() { return muted; }

function limit(key, gap) {
  const t = performance.now();
  if (last[key] && t - last[key] < gap) return false;
  last[key] = t; return true;
}

function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function tone(freq, { type = 'sine', dur = 0.12, vol = 0.2, at = 0, slide = 0, attack = 0.004, pan = 0 } = {}) {
  if (!ok()) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  env(g, t, attack, vol, dur);
  let out = g;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
  o.connect(g); out.connect(bus);
  o.start(t); o.stop(t + attack + dur + 0.05);
}

function noise(dur, { vol = 0.2, at = 0, f = 2000, q = 1, type = 'bandpass', attack = 0.002 } = {}) {
  if (!ok()) return;
  const t = ctx.currentTime + at;
  const len = Math.ceil(ctx.sampleRate * (dur + attack + 0.02));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ctx.createGain(); env(g, t, attack, vol, dur);
  src.connect(fl); fl.connect(g); g.connect(bus);
  src.start(t); src.stop(t + dur + attack + 0.03);
}

// a low bed: the room's hum and the bulb's mains buzz, so silence is never empty
function roomTone() {
  room = ctx.createGain(); room.gain.value = 0.05; room.connect(bus);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140;
  o.connect(f); f.connect(room); o.start();
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 38.5;
  const g2 = ctx.createGain(); g2.gain.value = 0.6; o2.connect(g2); g2.connect(room); o2.start();
}

// THE ROLL: a coin running round the chrome rail is one held voice, not a
// string of ticks — a loop of filtered noise whose loudness and pitch follow
// the coin's speed, silent the moment it leaves the rail. `roll(0)` is off.
let rollGain = null, rollFilter = null;
export function roll(speed = 0) {
  if (!ctx) return;
  if (!rollGain) {
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    // brown-ish noise: a rumble rather than a hiss
    let v = 0; for (let i = 0; i < len; i++) { v = (v + (Math.random() * 2 - 1) * 0.12) * 0.985; d[i] = v * 3; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    rollFilter = ctx.createBiquadFilter(); rollFilter.type = 'bandpass'; rollFilter.Q.value = 1.4; rollFilter.frequency.value = 500;
    rollGain = ctx.createGain(); rollGain.gain.value = 0;
    src.connect(rollFilter); rollFilter.connect(rollGain); rollGain.connect(bus); src.start();
  }
  const k = Math.max(0, Math.min(1, speed / 120));
  const t = ctx.currentTime;
  rollGain.gain.setTargetAtTime(muted ? 0 : k * 0.22, t, k > 0 ? 0.03 : 0.06);
  rollFilter.frequency.setTargetAtTime(300 + k * 1500, t, 0.05);
}

// ── the machine ──────────────────────────────────────────────────────────
export const sfx = {
  launch() { if (!limit('launch', 60)) return; noise(0.05, { f: 900, q: 0.8, vol: 0.12 }); tone(180, { type: 'triangle', dur: 0.09, vol: 0.12, slide: 2.4 }); },
  // a coin on a brass nail: a small bright ping, never the same pitch twice
  tick(v = 10, x = 0) {
    if (!limit('tick', 28)) return;
    const f = 2600 + Math.random() * 1800;
    tone(f, { type: 'sine', dur: 0.05 + Math.min(0.06, v / 400), vol: Math.min(0.09, 0.02 + v / 700), pan: Math.max(-0.8, Math.min(0.8, x / 30)) });
  },
  windmill() { if (!limit('wm', 80)) return; tone(1400, { type: 'square', dur: 0.03, vol: 0.03 }); },
  pocket(kind) {
    const base = { start: 880, tulip: 660, pocket: 990, attacker: 520 }[kind] ?? 700;
    [0, 0.06, 0.12].forEach((at, i) => tone(base * [1, 1.25, 1.5][i], { type: 'square', dur: 0.08, vol: 0.07, at }));
  },
  tulip(open) { tone(open ? 700 : 500, { type: 'triangle', dur: 0.1, vol: 0.08, slide: open ? 1.5 : 0.7 }); },
  warp() { tone(300, { type: 'sine', dur: 0.4, vol: 0.1, slide: 4 }); },
  foul() { tone(220, { type: 'triangle', dur: 0.15, vol: 0.08, slide: 0.6 }); },
  rattle() { noise(0.25, { f: 400, q: 0.5, vol: 0.2 }); tone(90, { type: 'square', dur: 0.12, vol: 0.08 }); },
  // coins meeting coins on the bed, and the slab's motor
  clink() { if (!limit('clink', 45)) return; tone(3800 + Math.random() * 1500, { dur: 0.04, vol: 0.035 }); noise(0.03, { f: 6000, q: 2, vol: 0.03 }); },
  stroke() { noise(0.5, { f: 120, q: 0.7, vol: 0.05, type: 'lowpass', attack: 0.15 }); },
  // off the lip and into the tray: the sound this whole game is for
  spill(value = 1) {
    if (!limit('spill', 35)) return;
    const n = value >= 25 ? 3 : value >= 5 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      tone(2400 + Math.random() * 2600, { dur: 0.07, vol: 0.06, at: 0.12 + i * 0.03 });
      noise(0.05, { f: 5000, q: 1.5, vol: 0.05, at: 0.12 + i * 0.03 });
    }
    if (value >= 5) tone(value >= 25 ? 1320 : 990, { type: 'triangle', dur: 0.2, vol: 0.06, at: 0.15 });
  },
  // a coin hitting the chrome edge of a window: a dull clack, not a ping
  clack(v = 10) {
    if (!limit('clack', 40)) return;
    noise(0.04, { f: 1800 + Math.random() * 600, q: 3, vol: Math.min(0.14, 0.04 + v / 300) });
    tone(620 + Math.random() * 120, { type: 'triangle', dur: 0.05, vol: Math.min(0.08, 0.02 + v / 500) });
  },
  // one coin landing in the tray: every one of them, so a jackpot is a rain
  tray(small = false) {
    if (!limit('tray', 22)) return;
    tone((small ? 4200 : 3000) + Math.random() * 1600, { dur: 0.06, vol: 0.05 });
    noise(0.05, { f: 5200, q: 1.5, vol: 0.045 });
  },
  gutter() { tone(160, { type: 'sine', dur: 0.3, vol: 0.06, slide: 0.4 }); },
  hopper() { if (!limit('hopper', 40)) return; tone(1800 + Math.random() * 800, { dur: 0.05, vol: 0.05 }); },
  // the reels
  reelTick() { if (!limit('reel', 55)) return; tone(1100, { type: 'square', dur: 0.015, vol: 0.025 }); },
  reelStop() { tone(420, { type: 'square', dur: 0.05, vol: 0.08 }); noise(0.04, { f: 1500, vol: 0.06 }); },
  reach() { for (let i = 0; i < 6; i++) tone(440 * Math.pow(1.12, i), { type: 'sawtooth', dur: 0.12, vol: 0.06, at: i * 0.1 }); },
  win(symbol) {
    const notes = { cherry: [784, 988], bell: [659, 784, 988], coin: [523, 659, 784, 1046], clover: [587, 740, 880, 1175] }[symbol] ?? [660, 880];
    notes.forEach((f, i) => tone(f, { type: 'square', dur: 0.14, vol: 0.08, at: i * 0.09 }));
  },
  miss() { tone(300, { type: 'triangle', dur: 0.12, vol: 0.04 }); },
  fever() {
    const seq = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
    seq.forEach((f, i) => { tone(f, { type: 'square', dur: 0.12, vol: 0.09, at: i * 0.08 }); tone(f / 2, { type: 'triangle', dur: 0.12, vol: 0.07, at: i * 0.08 }); });
  },
  feverEnd() { [1046, 784, 523].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.2, vol: 0.07, at: i * 0.12 })); },
  // the raccoon
  bandit(trapped) {
    noise(0.8, { f: 180, q: 0.6, vol: 0.25, type: 'lowpass', attack: 0.05 });
    tone(70, { type: 'sawtooth', dur: 0.7, vol: 0.12, slide: 1.4 });
    if (trapped) { tone(1200, { type: 'square', dur: 0.05, vol: 0.12, at: 0.7 }); noise(0.1, { f: 3000, vol: 0.2, at: 0.7 }); }
    else noise(0.3, { f: 2500, q: 0.8, vol: 0.12, at: 0.6 });
  },
  // the room
  lever() { noise(0.2, { f: 300, q: 0.6, vol: 0.15 }); tone(90, { type: 'square', dur: 0.2, vol: 0.1, at: 0.15 }); tone(60, { type: 'sine', dur: 0.8, vol: 0.12, at: 0.3, slide: 1.8 }); },
  powerDown() { tone(180, { type: 'sawtooth', dur: 0.7, vol: 0.08, slide: 0.3 }); },
  deposit() { [0, 0.05, 0.1].forEach(at => tone(3000 + Math.random() * 800, { dur: 0.05, vol: 0.05, at })); tone(880, { type: 'square', dur: 0.06, vol: 0.05, at: 0.18 }); tone(1320, { type: 'square', dur: 0.08, vol: 0.05, at: 0.25 }); },
  beep() { tone(1320, { type: 'square', dur: 0.05, vol: 0.05 }); },
  buy() { noise(0.25, { f: 250, q: 0.7, vol: 0.2 }); tone(160, { type: 'square', dur: 0.1, vol: 0.1, at: 0.25 }); tone(990, { type: 'triangle', dur: 0.15, vol: 0.06, at: 0.4 }); },
  deny() { tone(150, { type: 'square', dur: 0.12, vol: 0.08 }); tone(120, { type: 'square', dur: 0.14, vol: 0.08, at: 0.13 }); },
  ring() { for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) { tone(440, { dur: 0.03, vol: 0.05, at: r * 0.5 + i * 0.035 }); tone(480, { dur: 0.03, vol: 0.05, at: r * 0.5 + i * 0.035 }); } },
  voice() { if (!limit('voice', 70)) return; tone(160 + Math.random() * 90, { type: 'sawtooth', dur: 0.05, vol: 0.03 }); },
  lock() { tone(1800, { type: 'square', dur: 0.03, vol: 0.08 }); tone(2400, { type: 'square', dur: 0.03, vol: 0.08, at: 0.04 }); noise(0.15, { f: 2500, vol: 0.12, at: 0.5 }); tone(700, { dur: 0.3, vol: 0.06, at: 0.5 }); },
  fall() { noise(1.8, { f: 600, q: 0.4, vol: 0.2, type: 'lowpass', attack: 0.4 }); tone(140, { type: 'sawtooth', dur: 1.6, vol: 0.1, slide: 0.2 }); },
  door() { noise(1.2, { f: 200, q: 0.5, vol: 0.2, type: 'lowpass', attack: 0.3 }); [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.4, vol: 0.07, at: 0.6 + i * 0.15 })); },
};
