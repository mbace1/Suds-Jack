// music.js — the music (v58): TUNING.music's songs, played on any audio
// context — the live one, or an OfflineAudioContext that renders a song to a
// file with no speaker (renderMusicWav, scripts/music-render.mjs). Every note
// is laid down in context time a little ahead of the clock (`lookahead`),
// never on a timer, so a slow frame cannot make it stumble, and a tab that
// was hidden comes back where the song would have been, not in a burst.
//
// What plays is the game's to say, through `want` (main.js musicFrame): the
// song; the LEVEL, 0..4, which the HEAT multiplier lifts a layer at a time; a
// lull (an empty floor: the drums rest); a boss (the song's boss section); a
// room's last seconds (the hats double); the pause (ducked and muffled). A
// level rises at the next half bar and falls at a bar line after `hold`
// bars, so it never flickers; a hit drops it at the next bar line. Its cues
// are information, as 1.x's world beds were: a sweep or an updraft coming
// swells a riser into the hit, THE VOID's dark closes the music's filter with
// it, THE RIVER's current carries the arpeggio across the speakers, and a hit
// makes the whole song flinch.
//
// Every voice goes through the music's own bus into the sound's master, so
// mute really mutes and OPTIONS' MUSIC scales the music alone. Nothing here
// reads Math.random(): a song at a level plays the same notes every time.
import { TUNING } from './tuning.js?v=68';
import { wavBytes } from './intro/sfx.js?v=68';
import { mult as heatMult, lull as heatLull } from './sim/heat.js?v=68';

const M = TUNING.music;

// ── what a run asks of the music ────────────────────────────────────────────
// A world's song: an arcade world's own, a campaign room's by its world's rule
// (a room may name its own rule), SURVIVAL the grid's.
export function songFor(w) {
  if (w.room) {
    const rule = w.room.level && 'rule' in w.room.level ? w.room.level.rule : TUNING.campaign.worlds[w.room.world]?.rule;
    return M.byRule[rule ?? 'none'] ?? M.byWorld[0];
  }
  return TUNING.worlds.modes.includes(w.mode) ? M.byWorld[(w.world || 1) - 1] ?? M.byWorld[0] : M.byWorld[0];
}
// The music's say from the run as it stands (main.js each frame, and the
// renders that replay a bot's run): the level from the HEAT multiplier — no
// heat and nothing on the floor is 0 — a boss's fight at 3 at least, its
// section while it lives, the room's last seconds, THE VOID's dark, THE
// RIVER's current, and silence while the floor swallows the droplet.
export function worldWant(w) {
  const H = M.heat, m = heatMult(w), lull = heatLull(w), boss = w.gels.some((g) => g.alive && g.isBoss);
  let level = m >= H[3] ? 4 : m >= H[2] ? 3 : m >= H[1] ? 2 : lull ? 0 : 1;
  if (boss) level = Math.max(level, 3);
  const S = w.rule, d = w.room ? w.dir : null;
  return {
    song: w.trans && !w.trans.landed ? null : songFor(w), fade: w.trans ? M.fade.world : null,
    level, lull, boss, urgent: !!(d && d.duration > 0 && d.duration - d.t <= M.urgent && !w.over),
    dark: S?.kind === 'dark' ? S.dark : 0, pan: S?.kind === 'current' ? Math.cos(S.angle) * M.pan : 0,
  };
}

// The run's events the music answers (main.js onEvent): a rule's warning and
// its hit, a gauntlet's or THE CORE's rule turning, a hit taken, and the stings
export function cueFor(e) {
  switch (e.type) {
    case 'ruleWarn': return ['warn', { t: e.t }];
    case 'ruleFire': return ['fire'];
    case 'ruleTurn': return ['turn'];
    case 'hurt': return ['hurt'];
    case 'over': return ['over'];
    case 'won': return ['won'];
    case 'bossDown': return ['boss'];
    // a room through past F rings like a boss down; a room lost another way than dying (that is `over`'s) falls
    case 'roomEnd': return e.outcome === 'clear' && e.grade !== 'F' ? ['boss'] : e.outcome === 'dead' ? null : ['lost'];
  }
  return null;
}

// ── the notation (tuning/music.js) ─────────────────────────────────────────
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const acc = (a) => (a === '#' ? 1 : a === 'b' ? -1 : 0);
export function midiOf(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  return m ? 12 * (Number(m[3]) + 1) + PC[m[1]] + acc(m[2]) : null;
}
const pcOf = (name) => { const m = /^([A-G])([#b]?)$/.exec(name ?? ''); return m ? (PC[m[1]] + acc(m[2]) + 12) % 12 : null; };
export const hz = (n) => 440 * 2 ** ((n - 69) / 12);

const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], sus2: [0, 2, 7], dim: [0, 3, 6], 5: [0, 7], add9: [0, 4, 7, 14] };
export function parseChord(s) {
  const [main, over] = s.split('/'), m = /^([A-G][#b]?)(.*)$/.exec(main);
  const root = m ? pcOf(m[1]) : null, iv = m ? QUALITY[m[2]] : null, bass = over === undefined ? root : pcOf(over);
  if (root == null || !iv || bass == null) throw new Error(`music: no chord "${s}"`);
  const third = iv.find((x) => x === 3 || x === 4) ?? iv[1], fifth = iv.find((x) => x >= 6 && x <= 8) ?? 7, seventh = iv.find((x) => x === 10 || x === 11) ?? 10;
  return { name: s, root, iv, bass, third, fifth, seventh, pcs: iv.map((x) => (root + x) % 12) };
}

// "A4:4 C5:2 r:2 | …" → a bar each: its notes { at, dur, midi } (midi null is a rest) and how many steps they fill
export function parseBars(src) {
  return src.split('|').map((b) => {
    let at = 0;
    const notes = b.trim().split(/\s+/).filter(Boolean).map((tok) => {
      const [n, d] = tok.split(':'), dur = Number(d), midi = n === 'r' ? null : midiOf(n);
      if (!(dur > 0) || (n !== 'r' && midi == null)) throw new Error(`music: no note "${tok}"`);
      const note = { at, dur, midi };
      at += dur;
      return note;
    });
    return { notes, steps: at };
  });
}
// a sting's "SEMITONES:STEPS …"
const parseSteps = (src) => { let at = 0; return src.trim().split(/\s+/).map((tok) => { const [n, d] = tok.split(':').map(Number); const o = { at, dur: d, semi: n }; at += d; return o; }); };

// a song, read once
const compiled = new Map();
export function compile(id) {
  if (compiled.has(id)) return compiled.get(id);
  const S = M.songs[id];
  if (!S) throw new Error(`music: no song "${id}"`);
  const bad = (what) => { throw new Error(`music: ${id} ${what}`); };
  const pattern = (p, what) => { if (p && p.length !== S.bar) bad(`${what} is ${p.length} steps, not ${S.bar}`); return p || ''; };
  const section = (k) => {
    const X = S[k];
    if (!X) return null;
    const chords = X.chords.trim().split(/\s+/).map(parseChord), lead = parseBars(X.lead);
    if (lead.length !== chords.length) bad(`.${k} has ${chords.length} chords and ${lead.length} bars of lead`);
    lead.forEach((b, i) => { if (b.steps !== S.bar) bad(`.${k} bar ${i + 1} is ${b.steps} steps, not ${S.bar}`); });
    const drums = {};
    for (const [d, p] of Object.entries({ ...S.drums, ...(X.drums ?? {}) })) drums[d] = pattern(p, `.${k} ${d}`);
    return { chords, lead, drums, bars: chords.length };
  };
  for (const p of ['bass', 'stab', 'drip', 'metal']) pattern(S[p]?.pattern, p);
  const a = section('a');
  if (!a) bad('has no section a');
  const C = { id, S, a, b: section('b'), boss: section('boss') ?? a, step: 60 / S.bpm / S.beat, tonic: a.chords[0].root };
  C.form = S.form ?? ['a', 'b'].filter((k) => S[k]);
  compiled.set(id, C);
  return C;
}

// ── what plays on a step ────────────────────────────────────────────────────
// the note of pitch class `pc` at or above `lo`
const above = (pc, lo) => lo + ((((pc - lo) % 12) + 12) % 12);
const BASS = 43;   // G2: the bass's lowest root (a phone's speaker hears its octave)
const DRUMS = new Set(['kick', 'snare', 'hat', 'ride', 'metal']);
const VEL = { x: 1, X: 1.35, o: 0.45, O: 1 };
// a cheap fixed hash of a step, for the drips: texture, never chance
const mixHash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function bassNote(ch, c) {
  const R = above(ch.bass, BASS), r = above(ch.root, R);
  return c === 'R' ? R : c === 'O' ? R + 12 : c === '3' ? r + ch.third : c === '5' ? r + ch.fifth : c === '7' ? r + ch.seventh : c === 'L' ? r + ch.fifth - 12 : null;
}
const tonesIn = (ch, oct) => { const r = above(ch.root, 12 * (oct + 1)); return ch.iv.map((x) => r + x); };
function arpSeq(ch, oct, pattern) {
  const r = above(ch.root, 12 * (oct + 1)), up = [...ch.iv.filter((x) => x < 12).map((x) => r + x), r + 12];
  if (pattern === 'updown') return [...up, ...up.slice(1, -1).reverse()];
  if (pattern === 'broken') return [0, 2, 1, 3].map((i) => up[i % up.length]);
  return up;
}

// Everything that sounds on step `s` of bar `b` of section `sec` (`st`:
// { level, lull, urgent }). Pure: the scheduler's and the tests' one answer.
export function notesAt(C, sec, b, s, st) {
  const S = C.S, X = C[sec] ?? C.a, ch = X.chords[b % X.bars], out = [], L = M.levels;
  const on = (part) => st.level >= (L[part] ?? 0) && !(st.lull && DRUMS.has(part));
  const lastBeat = b % X.bars === X.bars - 1 && s >= S.bar - S.beat && sec !== 'boss' && !!X.drums.snare;   // a song with a snare fills into its next eight bars
  if (S.pad && on('pad') && s === 0) out.push({ part: 'pad', notes: tonesIn(ch, S.pad.oct), dur: S.bar });
  if (S.bass && on('bass')) {
    const p = S.bass.pattern, c = p[s];
    // an empty floor and no heat: the bass keeps only its downbeat
    if (st.level > 0 ? 'RO357L'.includes(c) : s === 0) {
      let dur = 1;
      if (st.level > 0) while (s + dur < S.bar && p[s + dur] === '-') dur++; else dur = S.beat * 2;
      out.push({ part: 'bass', midi: bassNote(ch, st.level > 0 ? c : 'R'), dur });
    }
  }
  for (const d of ['kick', 'snare', 'hat', 'ride']) {
    if (!on(d)) continue;
    if (d === 'snare' && lastBeat) {             // a fill into the next eight bars: the last beat all snare, rising
      const k = (s - (S.bar - S.beat)) / Math.max(1, S.beat - 1);
      out.push({ part: 'snare', vel: 0.45 + 0.6 * k });
      continue;
    }
    if (d === 'hat' && st.urgent) { out.push({ part: 'hat', vel: s % S.beat === 0 ? 1 : 0.55 }); continue; }   // a room's last seconds
    const c = X.drums[d]?.[s];
    if (c && VEL[c]) out.push({ part: d, vel: VEL[c], open: c === 'O' });
  }
  if (S.metal && on('metal') && S.metal.pattern[s] === 'x') out.push({ part: 'metal', vel: 1 });
  if (S.arp && on('arp') && s % S.arp.rate === 0) {
    const q = arpSeq(ch, S.arp.oct, S.arp.pattern);
    out.push({ part: 'arp', midi: q[(s / S.arp.rate) % q.length], dur: S.arp.rate });
  }
  if (S.stab && on('stab') && S.stab.pattern[s] === 'x') out.push({ part: 'stab', notes: tonesIn(ch, S.stab.oct).slice(0, 3), dur: S.stab.len });
  if (S.drip && on('drip') && S.drip.pattern[s] === 'x') {
    const pick = [...ch.pcs, (ch.root + 2) % 12], pc = pick[Math.floor(mixHash(b, s) * pick.length)];
    out.push({ part: 'drip', midi: above(pc, 12 * (S.drip.oct + 1)), dur: 1 });
  }
  if (S.ping && on('ping') && s === 0 && b % S.ping.every === 0) out.push({ part: 'ping', midi: midiOf(S.ping.note), dur: S.beat * 2 });
  if (on('lead')) for (const n of X.lead[b % X.bars].notes) if (n.at === s && n.midi != null) {
    out.push({ part: 'lead', midi: n.midi, dur: n.dur, vel: st.level < 2 ? M.leadSoft : 1 });
    if (on('double')) out.push({ part: 'double', midi: n.midi + 12, dur: n.dur });
  }
  return out;
}

// ── the voices ───────────────────────────────────────────────────────────────
const ctxCache = new WeakMap();
function kit(ctx) {
  let k = ctxCache.get(ctx);
  if (k) return k;
  const pulse = (duty) => {
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return ctx.createPeriodicWave(re, im, { disableNormalization: false });
  };
  const n = Math.floor(ctx.sampleRate), noise = ctx.createBuffer(1, n, ctx.sampleRate), d = noise.getChannelData(0);
  let s = 0x2545f491;   // a fixed LCG: the same noise every time
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; d[i] = s / 2 ** 31 - 1; }
  k = { p12: pulse(0.125), p25: pulse(0.25), p50: pulse(0.5), noise };
  ctxCache.set(ctx, k);
  return k;
}

// One song playing: its own mix, low-pass, duck, fade and echo, into the music's bus.
class Player {
  constructor(m, id, at, fadeIn) {
    const ctx = m.ctx, C = compile(id), S = C.S;
    Object.assign(this, { m, ctx, id, C, at, k: kit(ctx), stopAt: Infinity, goneAt: Infinity });
    this.mix = ctx.createGain();
    this.tone = ctx.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = M.cut.open; this.tone.Q.value = 0.7;
    this.duck = ctx.createGain();
    this.fade = ctx.createGain(); this.fade.gain.setValueAtTime(0, at); this.fade.gain.linearRampToValueAtTime(1, at + fadeIn);
    this.mix.connect(this.tone); this.tone.connect(this.duck); this.duck.connect(this.fade); this.fade.connect(m.bus);
    // the echo: a fed-back delay through a low-pass, `echo` steps long, back into the mix
    this.send = ctx.createGain();
    const dly = ctx.createDelay(2), lp = ctx.createBiquadFilter(), fb = ctx.createGain(), wet = ctx.createGain();
    dly.delayTime.value = Math.min(1.9, C.step * S.echo); lp.type = 'lowpass'; lp.frequency.value = M.echo.cut; fb.gain.value = M.echo.feedback; wet.gain.value = M.echo.wet;
    this.send.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(wet); wet.connect(this.mix);
    // a bus per part: its level, its own low-pass where it has one, its share of the echo, the arpeggio's pan
    this.parts = {};
    for (const p of ['lead', 'double', 'arp', 'bass', 'pad', 'stab', 'drip', 'ping']) {
      const spec = p === 'double' ? S.lead : S[p];
      if (!spec) continue;
      let head = ctx.createGain(), tail = head;
      if (spec.cut) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = spec.cut; f.Q.value = 0.6; tail.connect(f); tail = f; }
      if (p === 'arp' && spec.pan && ctx.createStereoPanner) { this.pan = ctx.createStereoPanner(); tail.connect(this.pan); tail = this.pan; }
      tail.connect(this.mix);
      if (spec.echo) { const e = ctx.createGain(); e.gain.value = spec.echo; tail.connect(e); e.connect(this.send); }
      this.parts[p] = head;
    }
    // the drums' filters, shared by every hit
    const filt = (type, f, q) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; x.connect(this.mix); return x; };
    const K = M.kit;
    this.drum = { snare: filt('bandpass', K.snare.f, K.snare.q), hat: filt('highpass', K.hat.f, 0.7), ride: filt('bandpass', K.ride.f, 1.4),
      crash: filt('highpass', K.crash.f, 0.7), metal: filt('bandpass', K.metal.f, K.metal.q), click: filt('highpass', 3000, 0.7) };
    // the song's clock: the next step's time, the step in its bar, the section and the bar in it
    this.next = at; this.s = 0; this.sec = C.form[0]; this.secBar = -1; this.fi = 0;
    this.level = 0; this.low = 0; this.cutNow = M.cut.open; this.duckNow = 1; this.panNow = 0;
  }

  // the game's say, once a frame: the filter, the duck, the pan, then the notes ahead
  frame(now, w) {
    const O = M.cut.open, dark = O * (M.cut.dark / O) ** Math.max(0, Math.min(1, w.dark || 0));
    const u = Math.max(0, Math.min(1, (now - this.m.hurtAt) / M.cut.back)), hurt = M.cut.hurt * (O / M.cut.hurt) ** u;
    const cut = Math.min(dark, hurt, w.duck ? M.duck.cut : O);
    // the game asks every frame; a change is written only when it is one
    if (Math.abs(Math.log(cut / this.cutNow)) > 0.03) { this.tone.frequency.setTargetAtTime(cut, now, 0.035); this.cutNow = cut; }
    const g = w.duck ? M.duck.pause : 1;
    if (g !== this.duckNow) { this.duck.gain.setTargetAtTime(g, now, 0.08); this.duckNow = g; }
    if (this.pan && Math.abs((w.pan || 0) - this.panNow) > 0.04) { this.panNow = w.pan || 0; this.pan.pan.setTargetAtTime(this.panNow, now, 0.2); }
    if (now < this.stopAt) this.tick(now, now + M.lookahead, w);
  }

  // lay the steps down to `until`; fallen too far behind, walk the clock on unheard
  tick(now, until, w) {
    if (this.next < now - M.resync) while (this.next < now) this.advance(w, false);
    const play = !(w.silent || this.m.volume <= 0);   // MUSIC off or the sound off: the clock walks on, nothing is made
    while (this.next < until && this.next < this.stopAt) this.advance(w, play);
  }

  advance(w, play) {
    const C = this.C, S = C.S;
    if (this.s === 0) this.barLine(w);
    else if (this.s === S.bar / 2 && (w.level ?? 0) > this.level) this.level = w.level;   // up at the half bar
    if (play) {
      const t = this.next + (this.s % 2 ? S.swing * C.step : 0);
      for (const ev of notesAt(C, this.sec, this.secBar, this.s, { level: this.level, lull: !!w.lull, urgent: !!w.urgent })) this.voice(ev, t);
    }
    this.next += C.step;
    if (++this.s >= S.bar) this.s = 0;
  }

  // a bar line: into the boss section while a boss lives, back to the song's top once it is gone, else on
  barLine(w) {
    const C = this.C;
    if (w.boss && this.sec !== 'boss') { this.sec = 'boss'; this.secBar = 0; }
    else if (!w.boss && this.sec === 'boss') { this.fi = 0; this.sec = C.form[0]; this.secBar = 0; }
    else if (++this.secBar >= C[this.sec].bars) { this.secBar = 0; if (this.sec !== 'boss') { this.fi = (this.fi + 1) % C.form.length; this.sec = C.form[this.fi]; } }
    const want = w.level ?? 0;
    if (want >= this.level || this.m.drop) { this.level = want; this.low = 0; this.m.drop = false; }
    else if (++this.low > M.hold) { this.level = want; this.low = 0; }
  }

  // one event of notesAt, at context time t
  voice(ev, t) {
    const S = this.C.S, step = this.C.step, K = M.kit, E = M.env;
    switch (ev.part) {
      case 'kick': {
        const o = this.osc('sine', K.kick.f0, t), g = this.ctx.createGain();
        o.frequency.exponentialRampToValueAtTime(K.kick.f1, t + K.kick.dur * 0.45);
        this.env(g, t, K.kick.vol * ev.vel, 0.002, K.kick.dur, K.kick.dur * 0.8);
        o.connect(g); g.connect(this.mix); o.start(t); o.stop(t + K.kick.dur + 0.02);
        this.hit('click', t, 0.012, K.kick.click * ev.vel);
        break;
      }
      case 'snare': {
        this.hit('snare', t, K.snare.dur, K.snare.vol * ev.vel);
        const o = this.osc('triangle', K.snare.tone, t), g = this.ctx.createGain();
        this.env(g, t, K.snare.toneVol * ev.vel, 0.002, 0.08, 0.08);
        o.connect(g); g.connect(this.mix); o.start(t); o.stop(t + 0.1);
        break;
      }
      case 'hat': this.hit('hat', t, ev.open ? K.hat.open : K.hat.dur, K.hat.vol * ev.vel); break;
      case 'ride': this.hit('ride', t, K.ride.dur, K.ride.vol * ev.vel); break;
      case 'metal': this.hit('metal', t, K.metal.dur, K.metal.vol * ev.vel); break;
      case 'pad': for (const n of ev.notes) this.note(S.pad, n, t, ev.dur * step, this.parts.pad, E.pad, S.pad.vol); break;
      case 'stab': for (const n of ev.notes) this.note(S.stab, n, t, ev.dur * step, this.parts.stab, E.stab, S.stab.vol); break;
      case 'double': this.note({ wave: 'p12' }, ev.midi, t, ev.dur * step, this.parts.double, E.lead, S.lead.vol * M.doubleVol); break;
      default: { const spec = S[ev.part]; this.note(spec, ev.midi, t, ev.dur * step, this.parts[ev.part], E[ev.part], spec.vol * (ev.vel ?? 1)); }
    }
  }

  osc(type, f, t) {
    const o = this.ctx.createOscillator();
    if (this.k[type]) o.setPeriodicWave(this.k[type]); else o.type = type === 'tri' ? 'triangle' : type === 'saw' ? 'sawtooth' : type;
    o.frequency.setValueAtTime(f, t);
    this.m.made++;
    return o;
  }
  // [attack, decay, sustain, release]: up in `a`, down to `sus` over `d`, let go at the note's end over `r`
  env(g, t, vol, a, dur, d = dur * 0.4, sus = 0, r = 0.04) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setTargetAtTime(vol * sus, t + a, Math.max(0.005, d / 3));
    g.gain.setTargetAtTime(0, t + Math.max(a, dur), Math.max(0.005, r / 3));
  }
  // a pitched note on `spec`'s wave (fm: a carrier and a modulator), into `dest`
  note(spec, midi, t, dur, dest, env, vol) {
    if (!dest || midi == null) return;
    const [a, d, sus, r] = env, f = hz(midi), g = this.ctx.createGain(), end = t + dur + r * 2 + 0.05;   // stopped once the release has died away
    const o = this.osc(spec.wave === 'fm' ? 'sine' : spec.wave, f, t);
    if (spec.wave === 'fm') {
      const mo = this.osc('sine', f * spec.ratio, t), mg = this.ctx.createGain();
      mg.gain.setValueAtTime(f * spec.index, t);
      if (spec.decay) mg.gain.setTargetAtTime(f * spec.index * 0.15, t, spec.decay);
      mo.connect(mg); mg.connect(o.frequency); mo.start(t); mo.stop(end);
    }
    // a held lead note sings: the vibrato comes in after the note has spoken
    const V = M.vib;
    if (spec.vib && dur >= V.min) {
      const lfo = this.osc('sine', V.rate, t), lg = this.ctx.createGain();
      lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + V.delay); lg.gain.linearRampToValueAtTime(f * spec.vib, t + V.delay + 0.15);
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(end);
    }
    this.env(g, t, vol, a, dur, d, sus, r);
    o.connect(g); g.connect(dest); o.start(t); o.stop(end);
  }
  // a drum's noise through its shared filter
  hit(kind, t, dur, vol) {
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = this.k.noise; src.loop = true;
    g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t + 0.002, Math.max(0.004, dur / 4));
    src.connect(g); g.connect(this.drum[kind]);
    src.start(t, mixHash(Math.round(t * 997), Math.round(dur * 1000)) * 0.9); src.stop(t + dur * 1.5 + 0.05);
    this.m.made++;
  }

  // a sweep's or an updraft's warning: a riser of noise and a pulse climbing an octave, into the hit
  riser(t, len) {
    const ctx = this.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), R = M.riser;
    src.buffer = this.k.noise; src.loop = true; f.type = 'bandpass'; f.Q.value = R.q;
    f.frequency.setValueAtTime(R.f0, t); f.frequency.exponentialRampToValueAtTime(R.f1, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(R.vol, t + len);
    g.gain.setTargetAtTime(0, t + len, 0.03);
    src.connect(f); f.connect(g); g.connect(this.mix); src.start(t); src.stop(t + len + 0.2); this.m.made++;
    const n = above(this.C.tonic, 60), o = this.osc('p12', hz(n), t), og = ctx.createGain();
    o.frequency.exponentialRampToValueAtTime(hz(n + 12), t + len);
    og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(R.tone, t + len); og.gain.setTargetAtTime(0, t + len, 0.03);
    o.connect(og); og.connect(this.mix); og.connect(this.send); o.start(t); o.stop(t + len + 0.2);
  }
  crash(t, vol = 1) { this.hit('crash', t, M.kit.crash.dur, M.kit.crash.vol * vol); }
  boom(t) { this.voice({ part: 'kick', vel: 1.4 }, t); this.crash(t); }

  // going: fade out, lay nothing more down; done once its echo has died away
  stop(at, secs) {
    this.stopAt = at;
    this.fade.gain.cancelScheduledValues(at);
    this.fade.gain.setValueAtTime(this.fade.gain.value, at);
    this.fade.gain.linearRampToValueAtTime(0, at + secs);
    this.goneAt = at + secs + 3;
  }
  done(now) { if (now < this.goneAt) return false; try { this.fade.disconnect(); } catch { /* gone */ } return true; }
}

// ── the music ───────────────────────────────────────────────────────────────
export class Music {
  constructor() {
    this.ctx = null; this.bus = null; this.volume = 1;
    this.cur = null; this.old = []; this.made = 0; this.hurtAt = -1e9; this.drop = false; this.lastTonic = 0; this.broken = new Set();
    this.want = { song: null, level: 0, boss: false, lull: true, urgent: false, duck: false, dark: 0, pan: 0, silent: false, fade: null };
  }
  get level() { return M.level * this.volume; }

  // on the sound's context, into its master (so its volume and mute reach the music too)
  attach(ctx, out) {
    if (this.ctx) return;
    this.ctx = ctx; this.bus = ctx.createGain(); this.bus.gain.value = this.level; this.bus.connect(out);
  }
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.bus) this.bus.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.03);
  }
  set(want) { Object.assign(this.want, want); }

  frame() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, w = this.want, song = w.song && !this.broken.has(w.song) ? w.song : null;
    if ((this.cur?.id ?? null) !== song) this.play(song, now, w.fade);
    if (this.cur) this.cur.frame(now, w);
    for (const p of this.old) p.frame(now, w);
    this.old = this.old.filter((p) => !p.done(now));
  }

  // the song changes: the one playing fades out and the next fades in (a world's fall is longer)
  play(id, now = this.ctx.currentTime, fade = null) {
    if (this.cur) { this.cur.stop(now, fade ?? M.fade.out); this.old.push(this.cur); this.cur = null; }
    if (!id) return;
    // a song that will not read is said once and left out, never the reason the game stops
    try { this.cur = new Player(this, id, now + 0.05, fade ?? M.fade.in); } catch (e) { this.broken.add(id); console.error(e); return; }
    this.lastTonic = this.cur.C.tonic;
  }

  // the game's moments (main.js onEvent)
  cue(kind, e = {}) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + 0.02, p = this.cur;
    if (kind === 'warn') p?.riser(now, Math.max(0.2, e.t ?? 1));
    else if (kind === 'fire') p?.boom(now);
    else if (kind === 'turn') p?.crash(now, 0.8);
    else if (kind === 'hurt') { this.hurtAt = now; this.drop = true; }
    else if (M.stings[kind]) this.sting(kind, now);
  }

  // a sting, on the music's bus itself, so a song fading out under it does not take it with it
  sting(name, t) {
    const G = M.stings[name], ctx = this.ctx, step = 60 / M.stings.bpm / 4, tonic = above(this.cur?.C.tonic ?? this.lastTonic, 60), k = kit(ctx);
    const out = ctx.createGain(); out.gain.value = 1; out.connect(this.bus);
    let end = t;
    for (const n of parseSteps(G.notes)) {
      const at = t + n.at * step, dur = n.dur * step, o = ctx.createOscillator(), g = ctx.createGain(), [a, d, sus, r] = M.env.sting;
      o.setPeriodicWave(k[G.wave]); o.frequency.setValueAtTime(hz(tonic + n.semi), at);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(G.vol, at + a); g.gain.setTargetAtTime(G.vol * sus, at + a, d / 3); g.gain.setTargetAtTime(0, at + dur, r / 3);
      o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + r + 0.05); this.made++;
      end = Math.max(end, at + dur + r);
    }
    if (G.bass) {
      const o = ctx.createOscillator(), g = ctx.createGain(), dur = G.bass * step;
      o.type = 'triangle'; o.frequency.setValueAtTime(hz(tonic - 24), t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(M.stings.bassVol, t + 0.005); g.gain.setTargetAtTime(0, t + dur, 0.08);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.4); this.made++;
    }
    if (G.crash) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), C = M.kit.crash;
      src.buffer = k.noise; src.loop = true; f.type = 'highpass'; f.frequency.value = C.f;
      g.gain.setValueAtTime(C.vol, t); g.gain.setTargetAtTime(0, t + 0.002, C.dur / 4);
      src.connect(f); f.connect(g); g.connect(out); src.start(t); src.stop(t + C.dur + 0.1); this.made++;
    }
    return end;
  }

  // for the smoke and the readout: what is playing, and how
  state() {
    const p = this.cur;
    return { on: !!this.ctx, song: p?.id ?? null, level: p?.level ?? 0, section: p?.sec ?? null, bar: p?.secBar ?? 0, volume: this.volume, made: this.made, fading: this.old.length };
  }
}

// A song rendered with no speaker, as 16-bit stereo WAV bytes. `script` is a
// list of { at: seconds, ...want } applied as the song reaches each one (the
// level going up a layer at a time, a boss…); `seconds` long, at `rate`.
export async function renderMusicWav(id, { seconds = 30, script = [{ at: 0, level: 3 }], rate = 44100, gain = TUNING.audio.master } = {}) {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const out = ctx.createGain(); out.gain.value = gain; out.connect(ctx.destination);
  const m = new Music();
  m.attach(ctx, out);
  m.set({ song: id, lull: false });
  m.play(id, 0, 0.01);
  const marks = [...script].sort((a, b) => a.at - b.at);
  for (let i = 0; i < marks.length; i++) {
    const { at, ...want } = marks[i], to = i + 1 < marks.length ? marks[i + 1].at : seconds;
    m.set(want);
    if (want.sting) m.sting(want.sting, at);
    m.cur.tick(at, to, m.want);
  }
  return wavBytes(await ctx.startRendering());
}
