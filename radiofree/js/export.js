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

const VENDOR = './vendor/mediabunny-1.58.1.min.js';
export const W = 1080, H = 1920;

const VOID = '#04070a', GREEN = '#7dffb2', GREEN_LO = '#1c4a38', AMBER = '#ffb43a';
const TEXT = '#b7e8cd', DIM = '#5f8a74';
const MONO = '"IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace';

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

// Which canvas the package is showing right now. The three registers keep
// their own buffers; the export blits whichever one the cut is on.
export function shotCanvas(pkg) {
  if (!pkg) return null;
  if (pkg.shot === 'anchor' && pkg.drawn && pkg.drawn.anchor) return pkg.drawn.anchor.cv;
  if (pkg.shot === 'graphic' && pkg.drawn && pkg.drawn.graphic) return pkg.drawn.graphic.cv;
  return pkg.photo && pkg.photo.scr ? pkg.photo.scr.canvas : null;
}

// Word wrap that also works for Japanese: a "word" wider than the column is
// broken by character, which is the right thing for a script with no spaces
// and a survivable thing for an English word that is simply too long.
export function wrap(ctx, text, maxWidth) {
  const out = [];
  let line = '';
  const push = () => { if (line) out.push(line); line = ''; };
  for (const word of String(text).split(' ')) {
    if (ctx.measureText(word).width > maxWidth) {
      push();
      let run = '';
      for (const ch of word) {
        if (ctx.measureText(run + ch).width > maxWidth) { out.push(run); run = ch; }
        else run += ch;
      }
      line = run;
      continue;
    }
    const trial = line ? line + ' ' + word : word;
    if (ctx.measureText(trial).width > maxWidth) { push(); line = word; }
    else line = trial;
  }
  push();
  return out;
}

// A line's runs, in the shape the caption shows them: broadcast text, and —
// decoded — the plain reading printed under it in amber.
function runsOf(parseLine, line) {
  const runs = parseLine(line);
  return {
    broadcast: runs.map(r => r.text).join(''),
    plain: runs.filter(r => r.plain !== null).map(r => `${r.text} → ${r.plain}`),
  };
}

// The lower third is MEASURED BEFORE IT IS PLACED. A fixed start line worked
// for a two-line headline and one paragraph; a decoded post with two paragraphs
// and four plain readings ran off the bottom of the frame and through the
// fiction footer. So the block is laid out first, at full size, and if it does
// not fit above the footer it is laid out again at the scale that does — the
// copy is never cut, because a bulletin with its last sentence missing is the
// one thing this station must not put out.
function layoutCaption(ctx, f, k, maxW) {
  const rows = [];
  let y = 0;
  const px = n => Math.round(n * k);
  const add = (font, color, text, x, lh) => { rows.push({ font, color, text, x, y }); y += lh; };

  ctx.font = `bold ${px(64)}px ${MONO}`;
  for (const l of wrap(ctx, f.head, maxW)) add(ctx.font, GREEN, l, 0, px(74));
  y += px(14);

  for (const line of f.lines) {
    ctx.font = `${px(36)}px ${MONO}`;
    const body = wrap(ctx, line.broadcast, maxW - px(48));
    rows.push({ font: ctx.font, color: GREEN_LO, text: '>', x: 0, y });
    for (const r of body) add(ctx.font, TEXT, r, px(48), px(48));
    if (f.decoded && line.plain.length) {
      ctx.font = `${px(32)}px ${MONO}`;
      for (const pl of line.plain) {
        for (const r of wrap(ctx, pl, maxW - px(48))) add(ctx.font, AMBER, r, px(48), px(42));
      }
    }
    y += px(18);
  }
  return { rows, height: y };
}

export function paintFrame(ctx, f) {
  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, W, H);

  // ── the picture, contained in the top two thirds, pixels kept hard ──
  const cv = f.canvas;
  if (cv && cv.width && cv.height) {
    const band = H * 0.66;
    const s = Math.min(W / cv.width, band / cv.height);
    const dw = Math.round(cv.width * s), dh = Math.round(cv.height * s);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, Math.round((W - dw) / 2), Math.round((band - dh) / 2), dw, dh);
  }

  const x = 54, maxW = W - 108;
  const footerY = H - 96;
  const tagH = 54;
  const top = H * 0.50;                        // the highest the copy may start
  const room = footerY - 28 - top - tagH;      // and the most height it may take
  ctx.textBaseline = 'top';

  let k = 1, lay = layoutCaption(ctx, f, k, maxW);
  if (lay.height > room) {
    k = Math.max(0.55, room / lay.height);
    lay = layoutCaption(ctx, f, k, maxW);
  }
  const y0 = Math.max(top, footerY - 28 - lay.height) ;

  // ── the scrim, sized to the copy rather than to a guess ──
  const scrimTop = y0 - tagH - 120;
  const g = ctx.createLinearGradient(0, scrimTop, 0, H);
  g.addColorStop(0, 'rgba(3,10,8,0)');
  g.addColorStop(0.28, 'rgba(3,10,8,.88)');
  g.addColorStop(1, 'rgba(3,10,8,.97)');
  ctx.fillStyle = g;
  ctx.fillRect(0, scrimTop, W, H - scrimTop);

  // ── the tag line ──
  ctx.font = `30px ${MONO}`;
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('● ' + f.onAir, x, y0 - tagH);
  const onW = ctx.measureText('● ' + f.onAir + '  ').width;
  ctx.fillStyle = f.accent || GREEN;
  ctx.fillText(`${f.index}/${f.total} · ${f.slug} · ${f.date}`, x + onW, y0 - tagH);

  // ── the copy ──
  for (const r of lay.rows) {
    ctx.font = r.font;
    ctx.fillStyle = r.color;
    ctx.fillText(r.text, x + r.x, y0 + r.y);
  }

  ctx.font = `26px ${MONO}`;
  ctx.fillStyle = DIM;
  ctx.fillText(f.fiction, x, footerY);
}

/**
 * Render one post to a video file.
 *   entry    — the feed's own record: { story, copy, post (a Package), decoded }
 *   opts.t   — the app's translator, for the furniture strings
 *   opts.parseLine — wire.js's parser, so the copy is split exactly as the caption splits it
 *   opts.seconds / opts.fps — length and rate; the default is one full beat cycle
 *   opts.onProgress(k) — 0..1
 * Resolves { blob, codec, ext, frames, ms }. Throws if nothing here can encode.
 */
export async function exportPost(entry, opts = {}) {
  const { t, parseLine } = opts;
  const fps = opts.fps || 30;
  const seconds = opts.seconds || 15;
  const n = Math.max(1, Math.round(seconds * fps));

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

  const copy = entry.copy;
  const lines = (copy.lines || []).map(l => runsOf(parseLine, l));
  const frame = {
    onAir: t('tag.onair'), fiction: t('fiction'),
    index: String(opts.index || 1).padStart(2, '0'), total: opts.total || 1,
    slug: copy.slug, head: copy.head, lines, date: opts.date || '',
    decoded: !!entry.decoded, accent: opts.accent, canvas: null,
  };

  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    // step the package's own clock, so the cut runs in the file exactly as it
    // runs on screen — the caller has paused the live loop for the duration
    entry.post.update(1 / fps, 0);
    entry.post.draw();
    frame.canvas = shotCanvas(entry.post);
    paintFrame(ctx, frame);
    await src.add(i / fps, 1 / fps);
    if (opts.onProgress && (i % 15 === 0)) opts.onProgress(i / n);
  }
  await output.finalize();
  if (opts.onProgress) opts.onProgress(1);

  return {
    blob: new Blob([output.target.buffer], { type: pick.format.mimeType }),
    codec: pick.codec, ext: pick.ext, frames: n,
    ms: Math.round(performance.now() - t0),
  };
}
