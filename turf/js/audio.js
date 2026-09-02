// TURF's sound: a small synthesised kit, no audio files.
//
// House convention across this repo (toko-drop, hyperdagger, dropcabal,
// paperboy, flashprince, gameoflife all ship one of these): every voice is
// built from oscillators and envelopes at runtime, and EVERY voice routes
// through one master gain rather than connecting to ctx.destination itself.
// That single rule is what makes a mute switch actually mute — including any
// sound added later, which inherits it for free.
//
// Register: this is a grim, rain-lit Nordic tactics game, not an arcade
// cabinet. Sounds are short, dry, low and unmusical — a click, a thud, a
// scrape. Nothing sparkles, nothing announces a combo. The loudest thing in
// the mix is a body hitting the ground.
//
// A browser will not let audio start before a gesture, so ctx is created
// lazily on the first play() and everything before that is a silent no-op
// rather than an error.

let ctx = null, master = null, muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;              // no WebAudio: every call below no-ops
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ctx.destination);
  return ctx;
}

// A tone with an envelope. `type` picks the oscillator; f0->f1 sweeps pitch,
// which is most of what separates these voices from each other.
function tone({ type = 'sine', f0 = 220, f1 = f0, dur = 0.12, gain = 0.2, delay = 0, curve = 'exp' }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) {
    if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    else osc.frequency.linearRampToValueAtTime(f1, t + dur);
  }
  // A tiny attack rather than an instant one: a hard gate on a low sine is a
  // click, and with several voices a turn it becomes a rattle.
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Filtered noise — the body of every impact here. Built from one short buffer
// of white noise, shaped by a bandpass whose frequency IS the character of
// the sound: high and tight reads as a shell casing, low and open as a thud.
function noise({ dur = 0.14, gain = 0.2, freq = 900, q = 1.1, delay = 0, sweepTo = null }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(freq, t);
  bp.Q.value = q;
  if (sweepTo) bp.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const audio = {
  // Called from a real click, which is what unlocks the context.
  unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  },
  setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.9;
  },
  isMuted: () => muted,

  // ── UI ───────────────────────────────────────────────────────────────
  select() { tone({ type: 'triangle', f0: 420, f1: 560, dur: 0.06, gain: 0.10 }); },
  cancel() { tone({ type: 'triangle', f0: 380, f1: 260, dur: 0.07, gain: 0.09 }); },

  // ── movement ─────────────────────────────────────────────────────────
  // Two scuffs a beat apart: one footfall is a tap, two is a step taken.
  move() {
    noise({ dur: 0.09, gain: 0.10, freq: 1500, sweepTo: 500, q: 0.8 });
    noise({ dur: 0.10, gain: 0.08, freq: 1200, sweepTo: 420, q: 0.8, delay: 0.085 });
  },

  // ── combat ───────────────────────────────────────────────────────────
  // Melee: a short scrape into a dull knock. No ring — nothing here is a sword.
  melee() {
    noise({ dur: 0.07, gain: 0.16, freq: 2600, sweepTo: 900, q: 1.4 });
    tone({ type: 'square', f0: 150, f1: 70, dur: 0.10, gain: 0.13, delay: 0.03 });
  },
  // Ranged: a flat crack, more air than tone, with a low thump under it.
  ranged() {
    noise({ dur: 0.055, gain: 0.26, freq: 3200, sweepTo: 700, q: 0.7 });
    tone({ type: 'square', f0: 190, f1: 60, dur: 0.11, gain: 0.14 });
  },
  // A landed blow on a body: low, damped, no pitch to speak of.
  hit() {
    noise({ dur: 0.12, gain: 0.20, freq: 420, sweepTo: 160, q: 0.9 });
    tone({ type: 'sine', f0: 120, f1: 55, dur: 0.13, gain: 0.16 });
  },
  // A miss is a real event and needs its own sound, or a whiffed shot is
  // indistinguishable from an input that did not register.
  miss() { noise({ dur: 0.10, gain: 0.09, freq: 2200, sweepTo: 2600, q: 0.6 }); },
  // Knockback: the scrape of something shoved across concrete.
  knock() { noise({ dur: 0.17, gain: 0.15, freq: 700, sweepTo: 240, q: 0.5 }); },
  // A unit going down. The heaviest thing in the mix, on purpose.
  down() {
    tone({ type: 'sine', f0: 100, f1: 38, dur: 0.34, gain: 0.24 });
    noise({ dur: 0.28, gain: 0.17, freq: 300, sweepTo: 90, q: 0.7, delay: 0.03 });
  },

  // ── turn structure ───────────────────────────────────────────────────
  // Two dry notes, falling for the enemy's turn and rising for yours, so the
  // handover is audible without looking at the turn label.
  enemyTurn() {
    tone({ type: 'triangle', f0: 300, f1: 300, dur: 0.10, gain: 0.10 });
    tone({ type: 'triangle', f0: 225, f1: 225, dur: 0.16, gain: 0.10, delay: 0.10 });
  },
  playerTurn() {
    tone({ type: 'triangle', f0: 260, f1: 260, dur: 0.09, gain: 0.10 });
    tone({ type: 'triangle', f0: 350, f1: 350, dur: 0.15, gain: 0.10, delay: 0.09 });
  },

  // ── outcomes ─────────────────────────────────────────────────────────
  win() {
    [0, 0.11, 0.22].forEach((d, i) =>
      tone({ type: 'triangle', f0: [294, 370, 440][i], dur: 0.26, gain: 0.13, delay: d }));
  },
  lose() {
    [0, 0.14, 0.30].forEach((d, i) =>
      tone({ type: 'sine', f0: [240, 190, 130][i], dur: 0.42, gain: 0.15, delay: d }));
  },
  // A weapon left on the ground being picked up: small, bright, brief.
  pickup() {
    tone({ type: 'square', f0: 520, f1: 780, dur: 0.07, gain: 0.09 });
    tone({ type: 'square', f0: 780, f1: 940, dur: 0.06, gain: 0.07, delay: 0.06 });
  },
};
