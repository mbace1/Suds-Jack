// Toko Move — SOUND (v2.67, the ship bar's S6: a game in a store makes a noise
// when you do something, and lets you make it stop).
//
// It is the house kit: SYNTHESISED, never sampled, and every voice goes
// through ONE master gain, so the mute button really mutes and a sound added
// later inherits it (gameoflife's audio.js, turf's, eeri's). Nothing is
// fetched, so the store build stays one zip with nothing outside it.
//
// It RECORDS BY WATCHING, the way juice.js and shiftlog.js do: nothing in the
// rules knows it exists. Each frame it compares what the game says now with
// what it said a frame ago — the courier's status, the score, the results, the
// chain, the event card, the miss list — and a difference is a sound. So it
// cannot ring for something that did not happen.
//
// The card journey (v3.2) calls `play` itself at each moment it stages — a
// card dealt, a tram ringing in, a hop, a stamp — since there every moment IS
// an event and nothing needs inferring; and it lays a quiet weather `bed`
// under the stop. Both go through the same master gain and the same kept mute.
//
// A browser will not start audio before a person touches the page, so the
// context is made on the first pointer or key press (START is one) and not a
// moment before. `log` records every cue whether or not a speaker exists,
// which is what lets test/sound.cjs hear the game in a headless browser.
const KEY = 'tokoMoveSound';
const store = () => { try { return globalThis.localStorage; } catch { return null; } };
const readOn = () => { try { return store()?.getItem(KEY) !== 'off'; } catch { return true; } };

export function mountAudio(tm, { button = 'sound', clock = null } = {}) {
  if (tm.audio) return tm.audio;
  let ctx = null, master = null, on = readOn(), prev = null, want = null, bedNow = null, noiseBuf = null;
  const log = [];
  const LEVEL = 0.5;
  function ensure() {
    if (ctx) return ctx;
    try { const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = on ? LEVEL : 0; master.connect(ctx.destination);
    } catch { ctx = null; }
    return ctx;
  }
  const wake = () => { ensure(); try { ctx?.resume?.(); } catch {} if (want && !bedNow) applyBed(); };
  addEventListener('pointerdown', wake, { capture: true, passive: true });
  addEventListener('keydown', wake, { capture: true });
  // a game in a background tab makes no noise: the beds would otherwise hiss
  // on under somebody else's page
  document.addEventListener('visibilitychange', () => { try { if (document.hidden) ctx?.suspend?.(); else if (on) ctx?.resume?.(); } catch {} });

  // one note: an attack, a hold and a release, optionally sliding in pitch
  function tone(freq, at, dur, { type = 'triangle', gain = 0.22, to = null } = {}) {
    if (!ctx || !master) return;
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  // a burst of filtered noise: paper, a thud, a rail joint, a footstep
  function noise(at, dur, { gain = 0.12, type = 'bandpass', freq = 1200, q = 0.8 } = {}) {
    if (!ctx || !master) return;
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  }
  // a struck bell: a fundamental and two inharmonic partials, long decay
  const strike = (f, at, dec = 0.7, gain = 0.14) => { tone(f, at, dec, { type: 'sine', gain }); tone(f * 2.76, at, dec * 0.5, { type: 'sine', gain: gain * 0.35 }); tone(f * 5.4, at, dec * 0.25, { type: 'sine', gain: gain * 0.15 }); };
  // The voices. Up is good, down is bad, and the delivery is the biggest thing.
  const CUES = {
    catch:   () => { tone(523, 0, 0.09); tone(784, 0.07, 0.13); },
    getoff:  () => { tone(988, 0, 0.2, { type: 'sine', gain: 0.18 }); },
    deliver: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.065, 0.16)); },
    late:    () => { tone(233, 0, 0.32, { type: 'sawtooth', gain: 0.09, to: 165 }); },
    drop:    () => { tone(880, 0, 0.08); tone(1175, 0.06, 0.11); },
    chain:   () => { tone(1319, 0, 0.1, { type: 'square', gain: 0.06 }); tone(1568, 0.08, 0.12, { type: 'square', gain: 0.06 }); },
    event:   () => { tone(660, 0, 0.07, { type: 'sine', gain: 0.16 }); tone(660, 0.13, 0.07, { type: 'sine', gain: 0.16 }); },
    miss:    () => { tone(392, 0, 0.22, { type: 'sine', gain: 0.12, to: 262 }); },
    end:     () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, { gain: 0.18 })); },
    // the journey's (v3.2)
    deal:    () => { noise(0, 0.07, { type: 'highpass', freq: 2600, gain: 0.08 }); noise(0.04, 0.05, { type: 'highpass', freq: 3800, gain: 0.04 }); },
    tap:     () => { tone(1250, 0, 0.04, { type: 'sine', gain: 0.07 }); },
    bell:    () => { strike(1480, 0, 0.6); strike(1480, 0.2, 0.8); },                       // ding-ding: the tram is here
    museum:  () => { strike(880, 0, 1.1, 0.17); strike(880, 0.26, 1.1, 0.17); strike(880, 0.52, 1.5, 0.17); },
    ride:    () => { for (let i = 0; i < 4; i++) { noise(i * 0.26, 0.07, { type: 'lowpass', freq: 260, gain: 0.16 }); noise(i * 0.26 + 0.08, 0.06, { type: 'lowpass', freq: 220, gain: 0.11 }); } },
    walk:    () => { for (let i = 0; i < 4; i++) noise(i * 0.24, 0.06, { type: 'lowpass', freq: 420, gain: 0.09 }); },
    stamp:   () => { tone(120, 0, 0.14, { type: 'sine', gain: 0.3, to: 55 }); noise(0, 0.08, { type: 'lowpass', freq: 900, gain: 0.12 }); },
    coin:    () => { tone(1319, 0, 0.08, { type: 'square', gain: 0.05 }); tone(1976, 0.07, 0.22, { type: 'square', gain: 0.05 }); noise(0.07, 0.18, { type: 'highpass', freq: 6000, gain: 0.03 }); },
    win:     () => { tone(659, 0, 0.1); tone(988, 0.08, 0.18); },
    lose:    () => { tone(330, 0, 0.16, { type: 'sine', gain: 0.13, to: 247 }); tone(247, 0.14, 0.24, { type: 'sine', gain: 0.11, to: 185 }); },
    forecast:() => { tone(784, 0, 0.3, { type: 'sine', gain: 0.1 }); tone(1175, 0.12, 0.4, { type: 'sine', gain: 0.07 }); },
    act:     () => { [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.1, 0.3, { gain: 0.16 })); strike(1568, 0.75, 1.4, 0.1); },
  };

  // A BED is a quiet loop under a scene — rain on the shelter, wind through
  // the snow, fog, the night's low hum. One at a time; a new one crossfades.
  const BEDS = {
    rain:  { noise: { type: 'bandpass', freq: 1900, q: 0.5 }, gain: 0.05 },
    snow:  { noise: { type: 'lowpass', freq: 520, q: 0.7 }, gain: 0.05, lfo: 0.13 },
    fog:   { noise: { type: 'lowpass', freq: 300, q: 0.7 }, gain: 0.035, lfo: 0.07 },
    night: { noise: { type: 'lowpass', freq: 200, q: 0.7 }, gain: 0.02, drone: [55, 82.5] },
  };
  function applyBed() {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    if (bedNow) { const old = bedNow; bedNow = null; try { old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0, t + 0.5); } catch {} setTimeout(() => old.stop.forEach(n => { try { n.stop(); } catch {} }), 700); }
    const b = BEDS[want]; if (!b || !on) return;
    if (!noiseBuf) noise(0, 0.01, { gain: 0.0001 });
    const g = ctx.createGain(), stop = []; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(b.gain, t + 1.2); g.connect(master);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(); src.buffer = noiseBuf; src.loop = true;
    f.type = b.noise.type; f.frequency.value = b.noise.freq; f.Q.value = b.noise.q; src.connect(f); f.connect(g); src.start(t); stop.push(src);
    if (b.lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = b.lfo; lg.gain.value = b.gain * 0.6; l.connect(lg); lg.connect(g.gain); l.start(t); stop.push(l); }
    for (const fq of b.drone || []) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = fq; og.gain.value = 0.5; o.connect(og); og.connect(g); o.start(t); stop.push(o); }
    bedNow = { g, stop, name: want };
  }
  function bed(name) {
    name = BEDS[name] ? name : null;
    if (name === want) return;
    want = name; log.push({ name: `bed:${name || 'none'}`, at: clock ? clock() : 0, on }); if (log.length > 400) log.shift();
    if (on) { ensure(); applyBed(); }
  }
  function play(name) { log.push({ name, at: clock ? clock() : (tm.flow?.clock?.tick ?? 0), on }); if (log.length > 400) log.shift(); if (on) { ensure(); try { CUES[name]?.(); } catch {} } }

  function poll() {
    const ch = tm.challenge; if (!ch) return;
    const st = tm.mobility?.status?.(), misses = tm.catchMisses || [], lastMiss = misses[misses.length - 1];
    const cur = { kind: st?.kind || '', score: ch.score || 0, n: (ch.results || []).length, mult: ch.streakMult?.() || 1,
      event: !!tm.events?.pending, miss: lastMiss ? `${lastMiss.line}@${lastMiss.tick}` : '', end: !document.getElementById('end')?.hidden };
    if (!prev) { prev = cur; return; }
    if (cur.kind === 'riding' && prev.kind === 'waiting') play('catch');
    if (cur.kind === 'getoff' && prev.kind !== 'getoff') play('getoff');
    if (cur.score > prev.score) {
      const main = cur.n > prev.n;
      play(main ? (ch.results[cur.n - 1] === 'late' ? 'late' : 'deliver') : 'drop');
    }
    if (cur.mult > prev.mult) play('chain');
    if (cur.event && !prev.event) play('event');
    if (cur.miss && cur.miss !== prev.miss) play('miss');
    if (cur.end && !prev.end) play('end');
    prev = cur;
  }

  function setOn(v) {
    on = !!v; try { store()?.setItem(KEY, on ? 'on' : 'off'); } catch {}
    // .value, not an automation event: a scheduled change lands on the audio
    // thread a render quantum later, and a mute has to be a mute now
    if (master && ctx) { try { master.gain.cancelScheduledValues(ctx.currentTime); } catch {} master.gain.value = on ? LEVEL : 0; }
    if (on && want && !bedNow) { ensure(); applyBed(); }
    if (!on && bedNow) applyBed();
    paint();
  }
  function paint() {
    const b = document.getElementById(button); if (!b) return;
    b.textContent = '♪'; b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'sound on' : 'sound off'); b.title = on ? 'sound on' : 'sound off';
    b.classList.toggle('off', !on);
  }
  const b = document.getElementById(button); if (b) b.onclick = () => setOn(!on);
  paint();
  return (tm.audio = { poll, play, bed, bedNow: () => bedNow?.name || null, setOn, isOn: () => on, log, context: () => ctx, level: () => (master ? master.gain.value : null) });
}
