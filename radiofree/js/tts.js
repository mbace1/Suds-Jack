// Radio Free Helsinki — a voice for Toko. HELD. Behind a flag. Not shipped.
//
// `?tts=kokoro` and nothing else turns this on. Without the flag this module is
// never imported, its model is never fetched, and the feed is exactly what it
// was. It is in the precache list only because the gate insists every module in
// js/ is; the thing that costs anything — the model — is not.
//
// WHY IT IS HELD, so the next person does not un-hold it by accident:
//
//   1. It is ENGLISH-FIRST. Kokoro's voices are American and British English
//      with a few others; there is no Finnish voice and no Japanese one worth
//      putting on air. This is a trilingual station whose Finnish is the point.
//      A prototype that reads one language out of three is not a feature, it
//      is a demo.
//   2. It is an 82M-parameter model, ~80-300 MB depending on quantisation,
//      fetched from a CDN on first use. The app's promise is offline-first with
//      no assets: everything drawn in code, the shell precached, the feed
//      readable on a metro. A third of a gigabyte pulled from a third party the
//      first time somebody presses play breaks both halves of that promise, and
//      the service worker would then either cache it (and fill a phone) or not
//      (and re-fetch it). Neither is a decision to make by default.
//
// WHAT IT DOES, when asked: lazy-loads kokoro-js as an ES module from the CDN,
// synthesises the English broadcast text of the live post, plays it through the
// app's own master gain (so mute is still total), and exposes a mouth amplitude
// off an AnalyserNode so Toko's lip-sync — which has been idle since the
// typewriter was switched off — has something to move to again.
//
// EVERY FAILURE IS SILENT AND HARMLESS. No network, no WebGPU, a CDN that
// 403s, a model that will not load: `speak()` resolves false and the feed
// carries on reading in text, which is what it was doing anyway.

import * as audio from './audio.js?v=66';

const CDN = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE = { en: 'af_heart' };          // English only — see the header

const PARAMS = new URLSearchParams(location.search);
export const enabled = PARAMS.get('tts') === 'kokoro';

let tts = null;        // the loaded synthesiser
let loading = null;
let ctx = null, out = null, analyser = null, buf = null;
let playing = null;    // the current AudioBufferSourceNode
let status = enabled ? 'idle' : 'off';

export function state() { return { enabled, status, loaded: !!tts }; }

async function load() {
  if (tts) return tts;
  if (!loading) {
    status = 'loading';
    loading = (async () => {
      const mod = await import(/* @vite-ignore */ CDN);
      const K = mod.KokoroTTS || (mod.default && mod.default.KokoroTTS);
      if (!K) throw new Error('kokoro-js exported no KokoroTTS');
      // q8 on wasm is the smallest thing that still sounds like a person;
      // webgpu is tried first and falls back on its own
      const device = ('gpu' in navigator) ? 'webgpu' : 'wasm';
      tts = await K.from_pretrained(MODEL, { dtype: 'q8', device });
      status = 'ready';
      return tts;
    })().catch(err => { status = 'failed: ' + (err && err.message || err); loading = null; throw err; });
  }
  return loading;
}

function ensureGraph() {
  audio.init();
  ctx = audio.__ambientContext();
  out = audio.__ambientOut();
  if (!ctx || !out) return false;
  if (!analyser) {
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    analyser.connect(out);
    buf = new Float32Array(analyser.fftSize);
  }
  return true;
}

// 0..1, the RMS of what is playing right now — the number the anchor's mouth
// wants. Zero when nothing is playing, so the face rests.
export function mouth() {
  if (!analyser || !playing) return 0;
  analyser.getFloatTimeDomainData(buf);
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.min(1, Math.sqrt(s / buf.length) * 6);
}

export function stop() {
  if (playing) { try { playing.stop(); } catch { /* already ended */ } }
  playing = null;
}

/**
 * Read `text` aloud. Resolves true when audio actually started, false for any
 * reason it did not — and never throws, because a voice is a nicety and the
 * bulletin is the channel.
 */
export async function speak(text, lang = 'en') {
  if (!enabled || !text) return false;
  const voice = VOICE[lang];
  if (!voice) { status = `no voice for ${lang}`; return false; }
  try {
    const k = await load();
    if (!ensureGraph()) return false;
    stop();
    const audioOut = await k.generate(text, { voice });
    // kokoro hands back { audio: Float32Array, sampling_rate }
    const rate = audioOut.sampling_rate || 24000;
    const data = audioOut.audio;
    const abuf = ctx.createBuffer(1, data.length, rate);
    abuf.copyToChannel(data, 0);
    const src = ctx.createBufferSource();
    src.buffer = abuf;
    src.connect(analyser);
    src.onended = () => { if (playing === src) playing = null; };
    playing = src;
    src.start();
    status = 'speaking';
    return true;
  } catch (err) {
    status = 'failed: ' + (err && err.message || err);
    return false;
  }
}
