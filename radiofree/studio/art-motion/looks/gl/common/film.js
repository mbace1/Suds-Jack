// The one thing the three looks share: a low-resolution frame buffer (the console's screen) upscaled to 1080×1920 with
// nearest-neighbour sampling, so every source pixel is a hard square, and the window.__film contract render.mjs reads.
export const OUT_W = 1080, OUT_H = 1920, FPS = 30;

export function makeScreen(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false;
  return { c, g, w, h };
}

/** register the film: draw(t, screen) paints one frame into the low-res screen (or returns a canvas to upscale) */
export function register({ w, h, seconds, events, draw, post }) {
  const scr = makeScreen(w, h), out = makeScreen(OUT_W, OUT_H);
  document.body.appendChild(out.c); out.c.style.width = '270px';
  const frameAt = (t) => {
    const src = draw(t, scr) || scr.c;
    out.g.imageSmoothingEnabled = false; out.g.fillStyle = '#000'; out.g.fillRect(0, 0, OUT_W, OUT_H);
    out.g.drawImage(src, 0, 0, OUT_W, OUT_H);
    if (post) post(out.g, t);
    return out.c;
  };
  window.__film = { fps: FPS, frames: Math.round(seconds * FPS), events: { end: seconds, ...events }, report: { look: document.title },
    frame(i) { return frameAt(i / FPS).toDataURL('image/jpeg', 0.92); },
    still(t) { return frameAt(t).toDataURL('image/png'); } };
  window.__ready = true;
}

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
/** a step function: the value only changes every `n` seconds, the way sprite animation ran off frame counters */
export const stepT = (t, fps) => Math.floor(t * fps) / fps;
