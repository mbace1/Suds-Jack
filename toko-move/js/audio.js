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
// A browser will not start audio before a person touches the page, so the
// context is made on the first pointer or key press (START is one) and not a
// moment before. `log` records every cue whether or not a speaker exists,
// which is what lets test/sound.cjs hear the game in a headless browser.
const KEY = 'tokoMoveSound';
const store = () => { try { return globalThis.localStorage; } catch { return null; } };
const readOn = () => { try { return store()?.getItem(KEY) !== 'off'; } catch { return true; } };

export function mountAudio(tm, { button = 'sound' } = {}) {
  if (tm.audio) return tm.audio;
  let ctx = null, master = null, on = readOn(), prev = null;
  const log = [];
  const LEVEL = 0.5;
  function ensure() {
    if (ctx) return ctx;
    try { const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = on ? LEVEL : 0; master.connect(ctx.destination);
    } catch { ctx = null; }
    return ctx;
  }
  const wake = () => { ensure(); try { ctx?.resume?.(); } catch {} };
  addEventListener('pointerdown', wake, { capture: true, passive: true });
  addEventListener('keydown', wake, { capture: true });

  // one note: an attack, a hold and a release, optionally sliding in pitch
  function tone(freq, at, dur, { type = 'triangle', gain = 0.22, to = null } = {}) {
    if (!ctx || !master) return;
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
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
  };
  function play(name) { log.push({ name, at: tm.flow?.clock?.tick ?? 0, on }); if (log.length > 400) log.shift(); if (on) { ensure(); try { CUES[name]?.(); } catch {} } }

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
    if (master && ctx) master.gain.setValueAtTime(on ? LEVEL : 0, ctx.currentTime);
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
  return (tm.audio = { poll, play, setOn, isOn: () => on, log, context: () => ctx, level: () => (master ? master.gain.value : null) });
}
