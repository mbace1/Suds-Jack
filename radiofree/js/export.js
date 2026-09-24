// Radio Free Helsinki — a bulletin, rendered to a file.
//
// The feed is already vertical, already drawn into canvases, and already cut
// on a beat clock. So an MP4 of a post is not a screen recording — it is the
// same package stepped frame by frame into a 1080×1920 canvas and handed to an
// encoder. Nothing here re-implements the app: the picture is whatever shot the
// Package is on (`pkg.draw()` paints it), and the copy is the same text the
// caption shows, laid out with the same hierarchy.
//
// THE ONLY DEPENDENCY THIS APP HAS is loaded here, and lazily: mediabunny
// (MPL-2.0, vendored under `vendor/`, one IIFE that assigns `window.Mediabunny`)
// arrives by <script> tag the first time somebody presses export and not one
// byte sooner. It is deliberately NOT in the service worker's precache — 683 KB
// for a button most listeners never press would double the offline shell for
// nothing, and the shell's promise is that the *feed* works with no signal, not
// that the export does.
//
// CODECS ARE NEGOTIATED, NOT ASSUMED. Encoding goes through WebCodecs, so what
// comes out depends on the browser: a desktop Chrome has H.264 and writes an MP4
// anything can play; the headless Chromium the gate runs on has no H.264 at all
// and encodes AV1 into the same container; a browser with neither gets VP9 in
// WebM. `pickCodec` walks that ladder and the caller is told which rung it
// landed on, because "MP4" that turns out to be AV1 is a fact the person
// uploading it needs.

import { planFilm, paintFilm, shotAt, W, H } from './film.js?v=65';

const VENDOR = './vendor/mediabunny-1.58.1.min.js';
export { W, H };

let loading = null;
export function loadMediabunny() {
  if (window.Mediabunny) return Promise.resolve(window.Mediabunny);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = VENDOR;
      s.onload = () => (window.Mediabunny ? resolve(window.Mediabunny)
                                         : reject(new Error('mediabunny loaded but defined nothing')));
      s.onerror = () => reject(new Error('mediabunny failed to load'));
      document.head.appendChild(s);
    });
  }
  return loading;
}

// The container is chosen by the codec, not the other way round: MP4 holds
// H.264 and AV1 (and VP9, in Chrome), and only if none of those can be encoded
// here does it fall to WebM.
export async function pickCodec(M) {
  const size = { width: W, height: H };
  const mp4 = new M.Mp4OutputFormat();
  const inMp4 = mp4.getSupportedVideoCodecs();
  const codec = await M.getFirstEncodableVideoCodec(
    ['avc', 'av1', 'vp9'].filter(c => inMp4.includes(c)), size);
  if (codec) return { codec, format: mp4, ext: 'mp4' };
  const webm = new M.WebMOutputFormat();
  const inWebm = webm.getSupportedVideoCodecs();
  const c2 = await M.getFirstEncodableVideoCodec(
    ['vp9', 'av1', 'vp8'].filter(c => inWebm.includes(c)), size);
  return c2 ? { codec: c2, format: webm, ext: 'webm' } : null;
}

// The canvases a shot can show. The graphic's PANEL, not its card: the card is
// composed for a phone box and the film composes its own, at an integer scale
// that makes the 128 px panel the size of the frame rather than a stamp in it.
function shotCanvases(pkg) {
  const ph = pkg.photo && pkg.photo.scr ? pkg.photo.scr.canvas : null;
  return {
    broll: ph,
    anchor: pkg.drawn && pkg.drawn.anchor ? pkg.drawn.anchor.cv : ph,
    graphic: pkg.drawn && pkg.drawn.graphic ? pkg.drawn.graphic.panel.canvas : ph,
  };
}

/**
 * Render one post to a video file — as the film `js/film.js` plans from its
 * copy, not as a still of the feed's lower third.
 *   entry    — the feed's own record: { story, copy, post (a Package), decoded }
 *   opts.t   — the app's translator, for the furniture strings
 *   opts.fps — frame rate (30)
 *   opts.seconds — a TARGET length the reading budgets compress toward
 *   opts.freq — the channel frequency, for the sign-off card
 *   opts.onProgress(k) — 0..1
 * Resolves { blob, codec, ext, frames, seconds, revealed, ms }.
 */
export async function exportPost(entry, opts = {}) {
  const { t } = opts;
  const fps = opts.fps || 30;
  // The film's length comes from the copy — a reading budget per caption — and
  // opts.seconds is a TARGET the budgets compress toward, never a cut-off.
  const plan = planFilm(entry, {
    fps, seconds: opts.seconds, index: opts.index, total: opts.total, date: opts.date,
    accent: opts.accent, freq: opts.freq, onAir: t('tag.onair'), fiction: t('fiction'),
  });
  const n = Math.max(1, Math.round(plan.S * fps));

  const M = await loadMediabunny();
  const pick = await pickCodec(M);
  if (!pick) throw new Error('this browser cannot encode video');

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const output = new M.Output({ format: pick.format, target: new M.BufferTarget() });
  const src = new M.CanvasSource(canvas, { codec: pick.codec, bitrate: M.QUALITY_HIGH });
  output.addVideoTrack(src, { frameRate: fps });
  await output.start();

  // The live feed is a shared object and the caller is standing on it, so the
  // package's DECODE state is put back afterwards whatever the film did to it.
  const pkg = entry.post;
  const wasDecoded = pkg.decoded;
  let revealed = -1;
  const t0 = performance.now();
  try {
    for (let i = 0; i < n; i++) {
      const tt = i / fps;
      const sh = shotAt(plan, tt);
      const wantDecoded = !!sh.decoded;
      if (wantDecoded !== !!pkg.decoded) { pkg.decoded = wantDecoded; if (wantDecoded) revealed = i; }
      // the film owns the cut: hold the package's own beat clock at zero so it
      // never cuts on its own, then put it on the shot the plan names
      pkg.clock = 0;
      pkg.update(1 / fps, 0);
      if (sh.shot !== 'card' && sh.shot !== pkg.shot) pkg.cutTo(sh.shot);
      pkg.draw();
      paintFilm(ctx, plan, tt, shotCanvases(pkg));
      await src.add(tt, 1 / fps);
      if (opts.onProgress && (i % 15 === 0)) opts.onProgress(i / n);
    }
  } finally {
    if (pkg.decoded !== wasDecoded) pkg.decoded = wasDecoded;
  }
  await output.finalize();
  if (opts.onProgress) opts.onProgress(1);

  return {
    blob: new Blob([output.target.buffer], { type: pick.format.mimeType }),
    codec: pick.codec, ext: pick.ext, frames: n, seconds: plan.S, scale: plan.scale,
    // the frame DECODE fired on, or -1: a fact about the file the manifest
    // wants, and the one that told us a reveal had not happened at all
    revealed,
    ms: Math.round(performance.now() - t0),
  };
}
