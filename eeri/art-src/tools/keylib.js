// The chroma key, shared by every tool that consumes a magenta-backed piece.
// Injected into the page as text (page.evaluate cannot see imports), so this
// file is plain browser JS with no exports.
//
// Three lessons are baked in, each of which shipped as a visible bug:
//
// 1. KEY ON HUE RATIO, NOT ON LEVELS. The first cut tested `r > 140 && b > 140
//    && g < 110`, which is a test for BRIGHT magenta. The backing is lit, so
//    the model casts a SHADOW on it — dark magenta around (90, 15, 90), which
//    passes none of those thresholds and shipped as a solid purple block
//    beside a tower. Magenta is the only thing in this palette where g sits
//    below BOTH r and b, and that is true at every brightness.
//
// 2. DESPILL BY PULLING r AND b DOWN TO g, not by capping them at a constant.
//    `cap = g * 1.35 + 24` does nothing on a bright surface, which is why the
//    white slabs and the grey paper tubes kept a pink cast while the dark
//    pieces were cleaned. Kraft, ochre, orange, blue-grey and green all have
//    g above min(r, b), so none of them is touched.
//
// 3. BLEED THE COLOUR OUTWARD BEFORE ANYTHING SCALES IT. A keyed pixel still
//    carries its ORIGINAL rgb behind alpha 0, and canvas downscaling averages
//    rgb across the alpha edge — so a piece composited at half size grows a
//    magenta fringe out of pixels that are supposedly invisible. Dilating the
//    opaque colour a few pixels into the transparent region removes it. This
//    is the real cause of the "pink on the clouds" family of bugs, and no
//    amount of threshold tuning fixes it.

function keyMagenta (canvas, { bleed = 4 } = {}) {
  const g = canvas.getContext('2d');
  const d = g.getImageData(0, 0, canvas.width, canvas.height), px = d.data;
  const W = canvas.width, H = canvas.height;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], gg = px[i + 1], b = px[i + 2];
    const mn = Math.min(r, b);
    // (1) the backing, at any brightness — but a RATIO alone over-keys. JPEG
    // chroma noise in a dark passage swings g below both r and b by a couple
    // of levels and passed the ratio test, which punched black speckle
    // through the middle of the lift core and the dark scaffold. The backing
    // is a lit sheet: even its own cast shadow stays bright and strongly
    // chromatic, so demand both an absolute floor and a real separation.
    if (gg < mn * 0.80 && mn > 45 && mn - gg > 25) { px[i + 3] = 0; continue; }
    // (2) despill: anything with a magenta lean at all
    if (gg < mn) {
      const k = (mn - gg) * 0.9;
      px[i] = r - k;
      px[i + 2] = b - k;
    }
  }

  // (3) alpha bleed — dilate opaque rgb outward so scaling never samples the
  // backing colour through a transparent pixel
  const alpha = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) alpha[p] = px[p * 4 + 3] ? 1 : 0;
  let cur = alpha;
  for (let pass = 0; pass < bleed; pass++) {
    const next = Uint8Array.from(cur);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (cur[p]) continue;
        let r = 0, gg = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const qx = x + dx, qy = y + dy;
            if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
            const q = qy * W + qx;
            if (!cur[q]) continue;
            r += px[q * 4]; gg += px[q * 4 + 1]; b += px[q * 4 + 2]; n++;
          }
        }
        if (!n) continue;
        px[p * 4] = r / n; px[p * 4 + 1] = gg / n; px[p * 4 + 2] = b / n;
        next[p] = 1;                      // colour only — alpha stays 0
      }
    }
    cur = next;
  }

  g.putImageData(d, 0, 0);
  return canvas;
}

// Crop to the ink. A piece frame is mostly backing, and placing an uncropped
// frame places mostly nothing.
function cropToInk (canvas) {
  const g = canvas.getContext('2d');
  const d = g.getImageData(0, 0, canvas.width, canvas.height), px = d.data;
  let x0 = canvas.width, y0 = canvas.height, x1 = -1, y1 = -1;
  for (let p = 0; p < canvas.width * canvas.height; p++) {
    if (px[p * 4 + 3] < 8) continue;
    const x = p % canvas.width, y = (p / canvas.width) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const c = document.createElement('canvas');
  c.width = x1 - x0 + 1; c.height = y1 - y0 + 1;
  c.getContext('2d').drawImage(canvas, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

function keyImage (img, opts) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return cropToInk(keyMagenta(c, opts));
}
