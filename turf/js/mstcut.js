// THE MST CUT — a character plate re-cut in Metal Slug Tactics' TECHNIQUE.
//
// Owner, 2026-09-29: "let's aim to make a huge leap into the visuals, more
// Metal Slug Tactics look that was in the art bible." The bible is
// ART_REQUEST.md §2, and it names the technique in three measurable parts:
//
//   1. A HARD dark outline carrying the whole silhouette — the shape has to
//      read in outline alone at the size a unit is seen on this board.
//   2. FLAT fills with few shade steps — no gradients, no airbrushing, no
//      anti-aliased edges.
//   3. A real pixel grid: every pixel of the figure is one decision.
//
// The plates are illustrations (ART_REQUEST §2.3/§2.4: ~2500 colours in a
// 55px patch) drawn smoothly downscaled, so on the board they read as small
// soft paintings, which is the opposite of all three. This does the cut at
// load time, once per image, from art that already exists — no generation.
//
// §2.4 is the warning this file is written against: the first pixel cut of
// these plates (32x40, snapped to a fixed 32-colour palette) was rejected as
// "way too messy and low detail". Two differences, both deliberate: the
// palette is fitted PER SPRITE (a figure keeps its own jacket colours rather
// than being snapped to a shared set), and the height is a parameter chosen
// by looking at a contact sheet (render.js, MST_H) rather than fixed.
//
// PURE: plain arrays in, plain arrays out, no DOM, no canvas, no clock — so
// test/smoke.mjs asserts the three properties above on real numbers in bare
// node. render.js owns the canvas half.

export const OUTLINE = [16, 14, 20];

/**
 * @param {Uint8ClampedArray} src  RGBA, `sw` x `sh`
 * @param {{left,top,right,bottom}} ink  the plate's ink bounds (inclusive)
 * @param {object} opt
 *   height  native pixel height of the ink (the figure's own pixel grid)
 *   colours colours per sprite after flattening
 * @returns {{data: Uint8ClampedArray, w: number, h: number, pad: number}}
 *   The figure on its own grid with a 1px outline margin (`pad`) all round.
 */
export function mstCut(src, sw, sh, ink, { height = 44, colours = 12, sample = 'median', seed = 'maximin', punch = 0.6, cover = 0.5 } = {}) {
  const iw = ink.right - ink.left + 1, ih = ink.bottom - ink.top + 1;
  const nh = Math.max(4, Math.round(height));
  const nw = Math.max(2, Math.round(iw * nh / ih));
  const pad = 1;
  const W = nw + pad * 2, H = nh + pad * 2;

  // 1. AREA-AVERAGE onto the native grid, premultiplied, so a pixel that is
  //    half background does not come out half-dark. Each native pixel owns a
  //    box of source pixels; fractional edges are weighted by overlap.
  const sx = iw / nw, sy = ih / nh;
  const r = new Float32Array(nw * nh), g = new Float32Array(nw * nh);
  const b = new Float32Array(nw * nh), a = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const y0 = ink.top + y * sy, y1 = y0 + sy;
    for (let x = 0; x < nw; x++) {
      const x0 = ink.left + x * sx, x1 = x0 + sx;
      let R = 0, G = 0, B = 0, A = 0, area = 0;
      for (let py = Math.floor(y0); py < Math.ceil(y1); py++) {
        if (py < 0 || py >= sh) continue;
        const wy = Math.min(y1, py + 1) - Math.max(y0, py);
        for (let px = Math.floor(x0); px < Math.ceil(x1); px++) {
          if (px < 0 || px >= sw) continue;
          const wgt = wy * (Math.min(x1, px + 1) - Math.max(x0, px));
          if (wgt <= 0) continue;
          const i = (py * sw + px) * 4, al = src[i + 3] / 255;
          R += src[i] * al * wgt; G += src[i + 1] * al * wgt; B += src[i + 2] * al * wgt;
          A += al * wgt; area += wgt;
        }
      }
      const j = y * nw + x;
      a[j] = area ? A / area : 0;
      if (A > 0) { r[j] = R / A; g[j] = G / A; b[j] = B / A; }
      // MEDIAN: the block's own middle colour rather than its mean. The
      // plates carry their own dark line art, and a mean smears that line
      // into every fill it borders — which is what made the first cut mud.
      if (sample === 'median' && A > 0) {
        const rs = [], gs = [], bs = [];
        for (let py = Math.floor(y0); py < Math.ceil(y1); py++) {
          if (py < 0 || py >= sh) continue;
          for (let px = Math.floor(x0); px < Math.ceil(x1); px++) {
            if (px < 0 || px >= sw) continue;
            const i = (py * sw + px) * 4;
            if (src[i + 3] < 128) continue;
            rs.push(src[i]); gs.push(src[i + 1]); bs.push(src[i + 2]);
          }
        }
        if (rs.length) {
          const med = v => { v.sort((p, q) => p - q); return v[v.length >> 1]; };
          r[j] = med(rs); g[j] = med(gs); b[j] = med(bs);
        }
      }
    }
  }

  // 2. HARD ALPHA. Covered past `cover` is in, less is out: no soft edge
  //    survives, which is what lets the outline sit on a clean silhouette.
  //    Half is right for a body; a prop full of thin structure (a bicycle's
  //    frame and spokes) never reaches half a cut pixel anywhere and vanished
  //    into a smudge at 0.5, so render.js cuts props lower.
  const solid = new Uint8Array(nw * nh);
  const idx = [];
  for (let j = 0; j < nw * nh; j++) if (a[j] >= cover) { solid[j] = 1; idx.push(j); }

  // 3. FLATTEN. k-means in RGB over this sprite's own pixels, seeded from
  //    luminance quantiles so it is deterministic (same plate, same cut —
  //    a sprite that re-quantises differently on each load is a flicker).
  const K = Math.max(2, Math.min(colours, idx.length));
  const lum = j => 0.299 * r[j] + 0.587 * g[j] + 0.114 * b[j];
  const byLum = idx.slice().sort((p, q) => lum(p) - lum(q) || p - q);
  const cen = [];
  const dist = (j, c) => {
    const dr = r[j] - c[0], dg = g[j] - c[1], db = b[j] - c[2];
    return dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
  };
  if (seed === 'maximin') {
    // MAXIMIN: start from the darkest pixel, then keep adding whichever pixel
    // is furthest from every seed so far. Quantile seeds put almost every
    // centre in the big mid-tone mass and let the few bright pixels — the
    // sneakers, the trim, the eyes — get eaten; this seeds the extremes first.
    cen.push([r[byLum[0]], g[byLum[0]], b[byLum[0]]]);
    const near = new Float64Array(idx.length).fill(Infinity);
    while (cen.length < K) {
      const c = cen[cen.length - 1];
      let far = -1, fd = -1;
      for (let n = 0; n < idx.length; n++) {
        const d = dist(idx[n], c);
        if (d < near[n]) near[n] = d;
        if (near[n] > fd) { fd = near[n]; far = idx[n]; }
      }
      if (fd <= 0) break;
      cen.push([r[far], g[far], b[far]]);
    }
  } else {
    for (let k = 0; k < K; k++) {
      const j = byLum[Math.min(byLum.length - 1, Math.floor((k + 0.5) * byLum.length / K))];
      cen.push([r[j], g[j], b[j]]);
    }
  }
  const lab = new Int32Array(nw * nh).fill(-1);
  for (let it = 0; it < 10; it++) {
    const acc = cen.map(() => [0, 0, 0, 0]);
    for (const j of idx) {
      let best = 0, bd = Infinity;
      for (let k = 0; k < cen.length; k++) {
        const c = cen[k];
        // Luminance-weighted distance: the eye splits values before hues,
        // and a band boundary is a VALUE boundary.
        const dr = r[j] - c[0], dg = g[j] - c[1], db = b[j] - c[2];
        const d = dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
        if (d < bd) { bd = d; best = k; }
      }
      lab[j] = best;
      const s = acc[best]; s[0] += r[j]; s[1] += g[j]; s[2] += b[j]; s[3]++;
    }
    for (let k = 0; k < cen.length; k++) if (acc[k][3]) cen[k] = [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]];
  }

  // 3b. LEVELS. The median and the centroids both pull toward the middle, so
  //     a cut comes out duller than its plate — the whites go grey and the
  //     darks go brown. Stretch the BANDS' values (never their hue or
  //     saturation: TURF stays muted, ART_REQUEST §2) so the darkest band
  //     sits near the outline and the brightest reaches a clean highlight.
  //     `punch` 0 is off; 1 is a full stretch.
  if (punch > 0 && cen.length > 1) {
    const L = cen.map(c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);
    const lo = Math.min(...L), hi = Math.max(...L);
    const want = (v) => 26 + (v - lo) / Math.max(1, hi - lo) * (236 - 26);
    for (let k = 0; k < cen.length; k++) {
      const target = L[k] + (want(L[k]) - L[k]) * punch;
      const f = target / Math.max(1, L[k]);
      cen[k] = cen[k].map(v => Math.max(0, Math.min(255, v * f)));
    }
  }

  // 4. ISOLATED-PIXEL CLEANUP. A lone pixel whose four neighbours all agree
  //    on another band is noise from the source's painterly texture, and
  //    noise is exactly what §2.4 called "messy". One pass, 4-neighbour.
  const out = lab.slice();
  for (const j of idx) {
    const x = j % nw, y = (j / nw) | 0;
    if (x === 0 || y === 0 || x === nw - 1 || y === nh - 1) continue;
    const n = [lab[j - 1], lab[j + 1], lab[j - nw], lab[j + nw]];
    if (n[0] >= 0 && n.every(v => v === n[0]) && n[0] !== lab[j]) out[j] = n[0];
  }

  // 5. OUTLINE. Every empty pixel touching the figure (4-neighbour) becomes
  //    ink, on the padded grid so a figure touching its own box still gets a
  //    closed line.
  const data = new Uint8ClampedArray(W * H * 4);
  const at = (x, y) => (x >= 0 && y >= 0 && x < nw && y < nh ? solid[y * nw + x] : 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = x - pad, fy = y - pad, o = (y * W + x) * 4;
      if (at(fx, fy)) {
        const c = cen[out[fy * nw + fx]];
        data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
      } else if (at(fx - 1, fy) || at(fx + 1, fy) || at(fx, fy - 1) || at(fx, fy + 1)) {
        data[o] = OUTLINE[0]; data[o + 1] = OUTLINE[1]; data[o + 2] = OUTLINE[2]; data[o + 3] = 255;
      }
    }
  }
  return { data, w: W, h: H, pad };
}

/** How many distinct opaque colours a cut carries — what the gate reads. */
export function distinctColours(data) {
  const seen = new Set();
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
  return seen.size;
}

/**
 * THE PLATE'S CUT. A backdrop has no silhouette to outline and is already at
 * roughly the figures' pixel density (render.js MST_DENSITY), so what makes it
 * sit on the same grid is FLATTENING: every pixel snapped to one of a few
 * dozen bands fitted to this picture, plus a value lift (`lift`, 0..1) so a
 * night yard reads as a lit floor rather than as murk.
 *
 * Centroids are fitted on a strided SUBSAMPLE and only the final assignment
 * touches every pixel — a 1100x619 plate at 24 bands is ~16M distance tests
 * once, rather than ten k-means passes a phone would feel at boot.
 *
 * In place on `data` (RGBA); returns the band count actually used.
 */
export function flattenImage(data, w, h, { colours = 24, lift = 0.25, stride = 7, majority = true, denoise = true } = {}) {
  const n = w * h;
  // DENOISE FIRST. A photograph's grain is what the bands end up chasing — a
  // majority filter after the snap cannot clean a speckle in which no band
  // holds five of nine (the first try did nothing measurable). A 3x3 median
  // per channel removes grain and keeps edges, so the bands then describe
  // SURFACES: a paving slab, a kerb, a lit window.
  if (denoise) {
    const src = data.slice();
    const v = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const o = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          let k = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v[k++] = src[o + (dy * w + dx) * 4 + c];
          v.sort((a, b) => a - b);
          data[o + c] = v[4];
        }
      }
    }
  }
  const sample = [];
  for (let i = 0; i < n; i += stride) if (data[i * 4 + 3] > 8) sample.push(i);
  if (!sample.length) return 0;
  const d = (i, c) => {
    const o = i * 4, dr = data[o] - c[0], dg = data[o + 1] - c[1], db = data[o + 2] - c[2];
    return dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
  };
  // Maximin seeds from the darkest sampled pixel, as mstCut does: the few
  // lit windows and sodium lamps are exactly the pixels quantile seeding eats.
  const lum = i => 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  let dark = sample[0];
  for (const i of sample) if (lum(i) < lum(dark)) dark = i;
  const cen = [[data[dark * 4], data[dark * 4 + 1], data[dark * 4 + 2]]];
  const near = new Float64Array(sample.length).fill(Infinity);
  while (cen.length < colours) {
    const c = cen[cen.length - 1];
    let far = -1, fd = -1;
    for (let k = 0; k < sample.length; k++) {
      const v = d(sample[k], c);
      if (v < near[k]) near[k] = v;
      if (near[k] > fd) { fd = near[k]; far = sample[k]; }
    }
    if (fd <= 0) break;
    cen.push([data[far * 4], data[far * 4 + 1], data[far * 4 + 2]]);
  }
  for (let it = 0; it < 8; it++) {
    const acc = cen.map(() => [0, 0, 0, 0]);
    for (const i of sample) {
      let best = 0, bd = Infinity;
      for (let k = 0; k < cen.length; k++) { const v = d(i, cen[k]); if (v < bd) { bd = v; best = k; } }
      const s = acc[best], o = i * 4; s[0] += data[o]; s[1] += data[o + 1]; s[2] += data[o + 2]; s[3]++;
    }
    for (let k = 0; k < cen.length; k++) if (acc[k][3]) cen[k] = [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]];
  }
  // LIFT: a gamma on each band's value, hue untouched. A floor you cannot see
  // is a floor you cannot plan on; MST's boards are lit.
  const g = 1 / (1 + lift);
  const out = cen.map(c => {
    const L = Math.max(1, 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);
    const f = (255 * Math.pow(L / 255, g)) / L;
    return c.map(v => Math.max(0, Math.min(255, v * f)));
  });
  const band = new Int16Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] <= 8) continue;
    let best = 0, bd = Infinity;
    for (let k = 0; k < cen.length; k++) { const v = d(i, cen[k]); if (v < bd) { bd = v; best = k; } }
    band[i] = best;
  }
  // MAJORITY FILTER, 3x3, two passes. Snapped paving comes out as a speckle — bands
  // flipping at single-pixel frequency — which at the zoom a phone plays at
  // is noise, not texture (seen on the first cut, v45). A pixel takes its
  // window's commonest band when four or more of the nine agree AND it is
  // itself in a minority of two or fewer; along an edge each side holds at
  // least three, so an edge survives while flecks and single-pixel chatter
  // do not.
  let clean = band.slice();
  for (let pass = 0; majority && pass < 2; pass++) {
    const from = clean.slice();
    const count = new Int16Array(cen.length);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (from[i] < 0) continue;
        count.fill(0);
        let top = from[i], tc = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const b = from[i + dy * w + dx];
          if (b < 0) continue;
          if (++count[b] > tc) { tc = count[b]; top = b; }
        }
        if (tc >= 4 && count[from[i]] <= 2) clean[i] = top;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const b = clean[i];
    if (b < 0) continue;
    const o = i * 4;
    data[o] = out[b][0]; data[o + 1] = out[b][1]; data[o + 2] = out[b][2];
  }
  return cen.length;
}

/**
 * What is wrong with a sprite, against the art bible — [] when nothing is.
 * The ONE definition of "an MST sprite" in this repo: the gate holds the
 * automatic cut and every authored file in mstart.js to it, and
 * tools/mst-export.mjs --check runs it on a file before anyone lists it.
 *
 *   height   the figure's ink height in pixels (MST_H for a body); null = any
 *   colours  most distinct fill colours allowed, outline excluded
 */
export function mstProblems({ data, w, h }, { height = null, colours = 24 } = {}) {
  const out = [];
  let top = null, bottom = -1, soft = 0, open = 0, ink = 0;
  const fills = new Set();
  const empty = (x, y) => x < 0 || y < 0 || x >= w || y >= h || !data[(y * w + x) * 4 + 3];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, a = data[i + 3];
    if (a && a !== 255) soft++;
    if (!a) continue;
    if (top === null) top = y; bottom = y;
    const dark = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] < 40;
    if (dark) { ink++; continue; }
    fills.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) open++;
  }
  if (top === null) return ['the image is empty'];
  if (soft) out.push(`${soft} semi-transparent pixels: alpha must be 0 or 255 (no anti-aliased edge)`);
  if (open) out.push(`${open} fill pixels touch transparency: the silhouette needs a closed dark (luma < 40) outline`);
  if (fills.size > colours) out.push(`${fills.size} fill colours: at most ${colours} (flat bands, not shading)`);
  if (ink < 30) out.push(`only ${ink} dark pixels: there is no outline carrying the silhouette`);
  const ih = bottom - top + 1;
  if (height && Math.abs(ih - height) > 2) out.push(`ink is ${ih}px tall: the figure grid is ${height}px (±2 for the outline)`);
  return out;
}
