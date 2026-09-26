// The studio's film: an episode's shots laid end to end, with the camera, the
// caption card, the paper wipe between shots, and a synthesised soundtrack.
//
//   frameAt(ctx, ep, t)   draws the frame at t — a pure function of t
//   renderAudio(ep)       the whole soundtrack, offline, as an AudioBuffer
//   wav(buffer)           16-bit PCM WAV bytes, for the muxer
//
// A shot builds its set and nothing else; captions, cuts and camera are the
// film's job, so every episode gets them the same way.

import { W, H, PAL, TAU, beginFrame, sheet, round, wrap, clamp, eob, eout, ease, rng, tiltShift } from './paper.js';

export const WIPE = 0.5;          // seconds a paper wipe spends crossing a cut
export const BPM = 112;

export function timeline(ep) {
  let at = 0;
  const shots = ep.shots.map((s, i) => { const o = { ...s, i, start: at }; at += s.dur; return o; });
  return { shots, total: at };
}

function shotAt(tl, t) {
  for (const s of tl.shots) if (t < s.start + s.dur) return s;
  return tl.shots[tl.shots.length - 1];
}

// ── the caption card ─────────────────────────────────────────────────────
// Words arrive one at a time and pop; *emphasised* words get a highlighter
// swipe behind them, drawn in after the word lands.
function parseCap(cap) {
  const words = [];
  let em = false;
  for (const raw of cap.split(/\s+/)) {
    let w = raw, on = em;
    if (w.startsWith('*')) { on = true; w = w.slice(1); }
    let closes = false;
    if (w.endsWith('*')) { closes = true; w = w.slice(0, -1); } else {
      const m = w.match(/\*([.,!?”"]+)$/); if (m) { closes = true; w = w.replace('*', ''); }
    }
    words.push({ text: w, em: on });
    em = on && !closes;
  }
  return words;
}
function caption(ctx, shot, lt, desk) {
  if (!shot.cap) return;
  const words = parseCap(shot.cap);
  ctx.save();
  ctx.font = '74px "Archivo Black"';
  const lines = wrap(ctx, words, 880);
  const lh = 90, padT = 110, padB = 50, h = padT + lines.length * lh + padB;
  const top = shot.capAt === 'top' ? 90 : H - h - 110;
  const inK = eob(lt / 0.45), outK = ease((lt - (shot.dur - 0.25)) / 0.25);
  const drop = (1 - inK) * (shot.capAt === 'top' ? -h - 120 : h + 140);
  sheet(ctx, (g) => {
    g.save(); g.translate(0, drop); g.rotate(shot.capAt === 'top' ? 0.012 : -0.015);
    g.fillStyle = PAL.card; round(g, 50, top, 980, h, 22); g.fill();
    g.fillStyle = PAL.toko; g.beginPath(); g.moveTo(50 + 22, top); g.lineTo(1030 - 22, top); g.arcTo(1030, top, 1030, top + 64, 22);
    g.lineTo(1030, top + 64); g.lineTo(50, top + 64); g.lineTo(50, top + 22); g.arcTo(50, top, 72, top, 22); g.fill();
    g.fillStyle = PAL.card; g.font = '32px "Space Grotesk"'; g.textBaseline = 'middle';
    g.fillText('RADIO FREE HELSINKI · ' + desk, 84, top + 34);
    g.restore();
  }, { lift: 22 });
  // the words, on the card
  let n = 0;
  ctx.translate(0, drop); ctx.rotate(shot.capAt === 'top' ? 0.012 : -0.015);
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, li) => {
    let x = 90;
    const y = top + padT + li * lh + 44;
    for (const w of line) {
      const at = 0.25 + n * 0.075, k = eob((lt - at) / 0.28), ww = ctx.measureText(w.text).width;
      n++;
      if (k > 0) {
        if (w.em) {
          const hk = eout((lt - at - 0.15) / 0.3);
          ctx.fillStyle = PAL.sun; ctx.fillRect(x - 8, y - 62, (ww + 16) * hk, 76);
        }
        ctx.save(); ctx.translate(x + ww / 2, y - 26); ctx.scale(k, k); ctx.translate(-ww / 2, 26);
        ctx.fillStyle = w.em ? PAL.toko : PAL.ink; ctx.globalAlpha = clamp(k * 2) * (1 - outK * 0);
        ctx.fillText(w.text, 0, 0); ctx.restore();
      }
      x += ww + ctx.measureText(' ').width;
    }
  });
  ctx.restore();
}

// ── the paper wipe ───────────────────────────────────────────────────────
const WIPE_COLOURS = [PAL.toko, PAL.sun, PAL.mint, PAL.violet, PAL.coral, PAL.sky];
function wipe(ctx, k, i) {
  // k: 0 → sheet enters from the right, 0.5 → covers the frame, 1 → gone left
  const x = (1 - k * 2) * (W + 220);
  sheet(ctx, (g) => {
    g.fillStyle = WIPE_COLOURS[i % WIPE_COLOURS.length];
    g.beginPath();
    const r = rng(i + 3);
    g.moveTo(x - W / 2 - 80, 0);
    for (let y = 0; y <= H; y += 60) g.lineTo(x - W / 2 - 80 + (r() - 0.5) * 50, y);       // torn left edge
    g.lineTo(x + W / 2 + 80, H);
    for (let y = H; y >= 0; y -= 60) g.lineTo(x + W / 2 + 80 + (r() - 0.5) * 50, y);       // torn right edge
    g.closePath(); g.fill();
  }, { lift: 30, tex: 0.6 });
}

// ── a frame ──────────────────────────────────────────────────────────────
export function frameAt(ctx, ep, t, tl = timeline(ep)) {
  beginFrame();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  // near a cut, the frame belongs to whichever side of it the wipe is hiding
  const shot = shotAt(tl, t), lt = t - shot.start;
  // camera: a slow push, and the shot's own shake
  const push = 1 + 0.045 * ease(lt / shot.dur);
  const sh = shot.shake ? shot.shake(lt) * 22 : 0, sr = rng(Math.floor(t * 30));
  ctx.translate(W / 2 + (sr() - 0.5) * sh, H / 2 + (sr() - 0.5) * sh);
  ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  shot.draw(ctx, lt, shot.dur);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!shot.end) tiltShift(ctx, 1000, 560, 0.85);
  caption(ctx, shot, lt, ep.meta.desk);
  // the wipe straddles each cut: its second half opens this shot, its first
  // half closes the one before
  const next = tl.shots[shot.i + 1];
  if (lt < WIPE / 2 && shot.i > 0) wipe(ctx, 0.5 + lt / WIPE, shot.i);
  else if (next && shot.dur - lt < WIPE / 2) wipe(ctx, 0.5 - (shot.dur - lt) / WIPE, next.i);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUND — all synthesised, offline, at 48 kHz. A bright 112 BPM bed (kick,
// clap, marimba, bass) under the whole film except the end card, and a cue
// for everything that happens on screen.
// ═══════════════════════════════════════════════════════════════════════════
export async function renderAudio(ep) {
  const tl = timeline(ep), SR = 48000, len = tl.total + 1.5;
  const ac = new OfflineAudioContext(2, Math.ceil(len * SR), SR);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.15;
  const master = ac.createGain(); master.gain.value = 0.8;
  master.connect(comp); comp.connect(ac.destination);
  const music = ac.createGain(); music.gain.value = 0.55; music.connect(master);
  const sfx = ac.createGain(); sfx.gain.value = 0.9; sfx.connect(master);

  const ar = rng(5);            // every run of the mix is the same mix
  const noise = ac.createBuffer(1, SR * 2, SR);
  { const d = noise.getChannelData(0), r = rng(77); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  const env = (g, t, a, peak, d, sus = 0) => {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d);
  };
  const osc = (type, f, t, dur, peak, dest, a = 0.004) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05); return o;
  };
  const hiss = (t, dur, peak, dest, { type = 'bandpass', f = 1500, q = 1, f2 = null } = {}) => {
    const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain(); env(g, t, Math.min(0.02, dur / 4), peak, dur);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, ar() * 1.5); s.stop(t + dur + 0.1);
  };

  // the bed
  const beat = 60 / BPM, musicEnd = tl.shots[tl.shots.length - 1].start;
  const C = [[48, 52, 55, 60], [45, 48, 52, 57], [41, 45, 48, 53], [43, 47, 50, 55]]; // C Am F G
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const bassLP = ac.createBiquadFilter(); bassLP.type = 'lowpass'; bassLP.frequency.value = 900; bassLP.connect(music);
  for (let b = 0; b * beat < musicEnd - 0.05; b++) {
    const t = b * beat, bar = Math.floor(b / 4), ch = C[bar % 4], inBar = b % 4;
    // kick on every beat, shaped as a falling sine
    const k = ac.createOscillator(), kg = ac.createGain(); k.frequency.setValueAtTime(150, t); k.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    env(kg, t, 0.002, 0.9, 0.26); k.connect(kg); kg.connect(music); k.start(t); k.stop(t + 0.3);
    if (inBar % 2 === 1) hiss(t, 0.14, 0.35, music, { f: 1400, q: 0.9 });                // clap
    hiss(t + beat / 2, 0.05, 0.12, music, { type: 'highpass', f: 7000 });               // hat
    // bass: root on 1 and 3, fifth pickup
    if (inBar === 0 || inBar === 2) osc('triangle', hz(ch[0] - 12), t, beat * 0.9, 0.5, bassLP);
    if (inBar === 3) osc('triangle', hz(ch[2] - 12), t + beat / 2, beat * 0.4, 0.35, bassLP);
    // marimba 8ths, arpeggiating the chord
    for (let e = 0; e < 2; e++) {
      const n = ch[(inBar * 2 + e) % 4] + 12, tt = t + e * beat / 2;
      osc('sine', hz(n), tt, 0.28, 0.22, music); osc('sine', hz(n) * 4, tt, 0.06, 0.05, music);
    }
  }

  // the cues
  const CUE = {
    ding: (t) => { osc('sine', 1318, t, 1.1, 0.35, sfx); osc('sine', 1760, t + 0.07, 1.2, 0.3, sfx); hiss(t, 0.04, 0.3, sfx, { type: 'highpass', f: 5000 }); },
    pop: (t) => { const o = osc('sine', 300, t, 0.12, 0.6, sfx); o.frequency.exponentialRampToValueAtTime(900, t + 0.08); },
    whoosh: (t) => hiss(t - 0.15, 0.5, 0.45, sfx, { f: 400, f2: 3500, q: 1.4 }),
    stamp: (t) => { const o = osc('sine', 130, t, 0.3, 1, sfx); o.frequency.exponentialRampToValueAtTime(38, t + 0.25); hiss(t, 0.18, 0.8, sfx, { type: 'lowpass', f: 900 }); },
    creak: (t) => {
      const o = ac.createOscillator(), g = ac.createGain(), bp = ac.createBiquadFilter();
      o.type = 'sawtooth'; bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 6;
      for (let i = 0; i < 12; i++) o.frequency.setValueAtTime(140 + Math.sin(i * 1.7) * 40 + i * 6, t + i * 0.08);
      env(g, t, 0.05, 0.35, 1.0); o.connect(bp); bp.connect(g); g.connect(sfx); o.start(t); o.stop(t + 1.1);
    },
    wind: (t) => hiss(t, 2.4, 0.3, sfx, { f: 500, f2: 900, q: 0.7 }),
    sip: (t) => hiss(t, 0.35, 0.18, sfx, { f: 2500, f2: 1200, q: 3 }),
    clink: (t) => { osc('sine', 2400 + ar() * 800, t, 0.18, 0.22, sfx); osc('sine', 3900, t, 0.08, 0.1, sfx); },
    inflate: (t) => {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(); o.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 1400;
      o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(620, t + 3.4);
      g.gain.setValueAtTime(0, t); for (let i = 0; i < 24; i++) g.gain.setValueAtTime(i % 2 ? 0.02 : 0.1, t + i * 0.143);
      g.gain.setValueAtTime(0, t + 3.5); o.connect(lp); lp.connect(g); g.connect(sfx); o.start(t); o.stop(t + 3.6);
    },
    chain: (t) => { for (let i = 0; i < 14; i++) { osc('sine', 1800 + (i % 3) * 500, t + i * 0.11, 0.1, 0.12, sfx); hiss(t + i * 0.11, 0.03, 0.12, sfx, { type: 'highpass', f: 4000 }); } },
    click: (t) => { hiss(t, 0.03, 0.9, sfx, { type: 'highpass', f: 2500 }); osc('sine', 2100, t, 0.08, 0.4, sfx); const o = osc('sine', 110, t, 0.2, 0.7, sfx); o.frequency.exponentialRampToValueAtTime(50, t + 0.18); },
    sting: (t) => {
      [60, 64, 67, 71, 72].forEach((m, i) => { osc('sine', hz(m), t + i * 0.06, 2.4, 0.18, sfx); osc('triangle', hz(m + 12), t + i * 0.06, 0.8, 0.06, sfx); });
      osc('sine', hz(36), t, 1.8, 0.5, sfx);
    },
  };
  for (const s of tl.shots) for (const [at, name] of (s.sfx || [])) CUE[name](Math.max(0, s.start + at));
  const buf = await ac.startRendering();
  // normalise to a -1 dBFS peak; the muxer sets loudness
  let peak = 0; for (let c = 0; c < 2; c++) for (const v of buf.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
  const gain = peak ? 0.89 / peak : 1;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= gain; }
  return buf;
}

export function wav(buf) {
  const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, sr, true);
  out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { out.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 32767, true); o += 2; }
  return new Uint8Array(out.buffer);
}
