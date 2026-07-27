// Cabinet marquees — one tiny pixel drawing per game, painted in code.
// 128×72 canvases upscaled with image-rendering: pixelated, same trick the
// games themselves use. No image assets anywhere on this site.

const W = 128, H = 72;

function pen(ctx) {
  const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); };
  const disc = (cx, cy, r, c) => {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      p(cx - dx, cy + dy, dx * 2 + 1, 1, c);
    }
  };
  // a straight line of pixels, for the vector-art marquees
  const line = (x0, y0, x1, y1, c) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1, c);
  };
  const bands = (cols) => cols.forEach((c, i) => p(0, i * H / cols.length, W, Math.ceil(H / cols.length), c));
  return { p, disc, line, bands };
}

export const ART = {
  // Suds Jack: the well, in vectors, seen straight down
  tube(g, a) {
    g.p(0, 0, W, H, '#05060c');
    const cx = 64, cy = 36;
    for (const r of [34, 22, 13, 7]) {
      for (let i = 0; i < 16; i++) {
        const t = i / 16 * Math.PI * 2, t2 = (i + 1) / 16 * Math.PI * 2;
        g.line(cx + Math.cos(t) * r * 1.6, cy + Math.sin(t) * r,
          cx + Math.cos(t2) * r * 1.6, cy + Math.sin(t2) * r, r > 20 ? a : '#146a70');
      }
    }
    for (let i = 0; i < 16; i += 2) {
      const t = i / 16 * Math.PI * 2;
      g.line(cx + Math.cos(t) * 11, cy + Math.sin(t) * 7, cx + Math.cos(t) * 54, cy + Math.sin(t) * 34, '#0e3f52');
    }
    g.p(cx - 5, cy + 26, 4, 3, '#ff46d0');
    g.p(cx + 14, cy + 22, 4, 3, '#ff46d0');
  },

  // Toko Drop: a gel and the ring it just exhaled
  gel(g, a) {
    g.p(0, 0, W, H, '#07120f');
    for (let i = 0; i < 12; i++) {
      const t = i / 12 * Math.PI * 2;
      g.p(64 + Math.cos(t) * 40, 36 + Math.sin(t) * 26, 3, 3, '#e8e05a');
    }
    g.disc(64, 38, 17, '#2f7f66');
    g.disc(64, 36, 15, a);
    g.p(56, 30, 4, 4, '#0b1a16');
    g.p(68, 30, 4, 4, '#0b1a16');
    g.p(56, 45, 16, 2, '#0b1a16');
    g.p(52, 22, 6, 3, '#c9fbe8');           // gel highlight
  },

  // Hyper Dagger: voxel skull, red eyes, one white dagger incoming
  skull(g, a) {
    g.p(0, 0, W, H, '#08070a');
    for (let i = 0; i < 9; i++) g.p(8 + i * 15, 4, 1, H - 8, '#1b1a20');
    g.p(46, 16, 36, 32, '#d8d3c8');
    g.p(46, 16, 36, 3, '#f2eee6');
    g.p(50, 48, 28, 8, '#c2bcb0');
    g.p(53, 26, 9, 9, '#12070a');
    g.p(67, 26, 9, 9, '#12070a');
    g.p(55, 28, 5, 5, a);
    g.p(69, 28, 5, 5, a);
    g.p(60, 40, 8, 5, '#12070a');
    for (let i = 0; i < 4; i++) g.p(52 + i * 8, 48, 3, 10, '#c2bcb0');
    g.line(8, 62, 40, 40, '#ffffff');       // the dagger
    g.line(9, 63, 41, 41, '#8fb8ff');
    g.p(38, 38, 5, 5, '#ffffff');
  },

  // Drop Cabal: sunset rows, sandbags, one little commando
  cabal(g, a) {
    g.bands(['#2a1a3a', '#5a2a4a', '#8a3a44', a]);
    g.disc(96, 30, 11, '#f7d98a');
    g.p(0, 40, W, 2, '#3a2436');
    for (let x = 0; x < W; x += 12) { g.p(x, 44, 10, 6, '#6b5a44'); g.p(x + 2, 42, 6, 3, '#7d6a52'); }
    g.p(0, 56, W, 16, '#2c3a2c');
    g.p(58, 50, 8, 12, '#3ad0b0');          // the gel commando
    g.p(60, 46, 5, 5, '#4ae8c8');
    g.p(66, 52, 10, 2, '#d8d3c8');          // rifle
    for (const [x, y] of [[20, 30], [110, 34], [78, 26]]) { g.p(x, y, 5, 5, '#e85a4a'); }
  },

  // Paper Route: the road runs off at an angle, which is what says isometric
  route(g, a) {
    g.p(0, 0, W, H, a);                     // sky
    g.p(0, 20, W, H - 20, '#7ec86a');       // lawns
    const roadX = y => -34 + (y - 20) * 1.55;
    for (let y = 20; y < H; y++) {
      g.p(roadX(y) - 3, y, 3, 1, '#b8b2a2');    // kerb
      g.p(roadX(y), y, 46, 1, '#8a8a8a');
      g.p(roadX(y) + 46, y, 3, 1, '#b8b2a2');
    }
    for (let y = 22; y < H; y += 9) g.p(roadX(y) + 21, y, 2, 4, '#f2f2e8');   // lane
    const house = (x, y, body) => {         // teal = subscriber, coral = not
      for (let i = 0; i < 10; i++) g.p(x - 2 + i * 1.5, y - i, 30 - i * 3, 1, '#c74a3a');
      g.p(x, y, 26, 18, body);
      g.p(x + 9, y + 9, 8, 9, '#2a4a46');
    };
    house(78, 16, '#4ad0b8');
    house(30, 6, '#e8846a');
    g.p(46, 44, 7, 11, '#f2d24a');          // the rider
    g.p(47, 39, 5, 5, '#f2f2e8');
    g.p(45, 55, 9, 3, '#2a2a2a');
    for (let i = 0; i < 5; i++) g.p(58 + i * 8, 40 - i * (4 - i * 0.7), 3, 3, '#f2f2e8');   // the throw
  },

  // Powder: the racer, its plume, and the blown-out sun the plates always have
  powder(g, a) {
    g.bands(['#8d9aad', '#b0b4b0', '#e6ddc6']);
    g.p(0, 30, W, H - 30, '#efe7d2');            // the field
    g.disc(100, 12, 8, '#fffdf4');               // sun, no colour left in it
    for (let i = 0; i < 8; i++) {
      const t = i / 8 * Math.PI * 2;
      g.line(100 + Math.cos(t) * 10, 12 + Math.sin(t) * 10,
        100 + Math.cos(t) * 15, 12 + Math.sin(t) * 15, a);
    }
    for (let y = 30; y < H; y++) {               // the packed line, running away
      g.p(20 - (y - 30) * 0.9, y, 6 + (y - 30) * 2.2, 1, '#d8cba8');
    }
    g.p(18, 33, 5, 2, '#4a4753');                // boulders out on the field
    g.p(104, 42, 6, 3, '#4a4753');
    g.p(6, 50, 4, 2, '#4a4753');
    for (let i = 0; i < 7; i++) {                // plume off the inside edge
      g.disc(74 + i * 7, 44 - i * 2, Math.max(2, 6 - i), i & 1 ? '#f6f0e0' : '#d5c9ae');
    }
    g.disc(50, 60, 12, '#cfc6ae');               // hard blob shadow, close under
    g.p(34, 51, 30, 5, '#e8dfc6');               // cream fuselage
    g.p(27, 52, 8, 3, '#e8dfc6');
    g.p(22, 53, 5, 1, '#b9bec7');                // needle probe
    g.p(48, 51, 6, 5, '#6b3550');                // the one accent panel
    g.p(39, 48, 9, 3, '#2b3340');                // canopy
    g.p(56, 48, 12, 4, '#b9bec7');               // chrome cans
    g.p(56, 55, 12, 4, '#b9bec7');
    g.p(67, 48, 2, 4, '#14141a');                // black intake mouths
    g.p(67, 55, 2, 4, '#14141a');
    g.p(60, 44, 3, 5, '#e8dfc6');                // fin
  },

  // SKLTR: green bones in the dark
  bones(g, a) {
    g.p(0, 0, W, H, '#04070a');
    for (let i = 0; i < 40; i++) g.p((i * 53) % W, (i * 31) % H, 1, 1, '#0e2a18');
    g.p(50, 14, 28, 24, a);
    g.p(54, 20, 7, 8, '#04070a');
    g.p(67, 20, 7, 8, '#04070a');
    g.p(58, 32, 12, 3, '#04070a');
    g.p(56, 38, 16, 6, a);
    for (let i = 0; i < 3; i++) g.p(48, 46 + i * 6, 32, 3, '#1f9e3a');
    g.p(30, 44, 14, 3, a); g.p(84, 50, 14, 3, a);
    g.p(28, 40, 4, 8, a); g.p(96, 46, 4, 8, a);
  },

  // Neon Ronin: the arc of a cut
  slash(g, a) {
    g.p(0, 0, W, H, '#0a0616');
    for (let x = 0; x < W; x += 6) g.p(x, 48 + (x % 12 ? 0 : -4), 4, H - 48, '#1b1030');
    for (let i = 0; i < 26; i++) {
      const t = -0.5 + i / 26 * 2.2;
      g.p(64 + Math.cos(t) * 46, 34 + Math.sin(t) * 30, 3, 3, i % 3 ? a : '#ffd6f2');
    }
    g.p(52, 22, 6, 26, '#2ae8e0');          // the ronin
    g.p(53, 16, 5, 5, '#f2f2e8');
    g.line(58, 26, 88, 12, '#ffffff');
    for (const [x, y] of [[100, 20], [18, 30], [104, 52]]) g.p(x, y, 6, 6, '#e8e05a');
  },

  // The Game of Life: its own treeline, under its own sun
  treeline(g, a) {
    g.bands(['#7fb2d9', '#93bfdd', '#cfe3ea', '#cfe3ea']);
    g.disc(96, 18, 9, '#f2d98c');
    for (let x = 0; x < W; x += 8) {
      const h = 16 + ((x * 7) % 12);
      g.p(x, H - h, 8, h, '#3d5232');
      g.p(x + 3, H - h - 5, 2, 5, '#3d5232');
    }
    g.p(0, H - 10, W, 10, '#2a3423');
    g.p(58, H - 26, 3, 14, '#6b4f3a');      // one tree apart from the rest
    g.disc(59, H - 30, 8, a);
  },

  // Tiny Hawk: the prism skater on a lit rail, in the near-black park
  prism(g, a) {
    g.p(0, 0, W, H, '#03060c');
    g.p(0, 40, W, 32, '#0e1a28');                       // the flat, barely there
    for (let i = 0; i < 26; i++) {                      // pinpoint lights
      const x = (i * 37) % W, y = (i * 13) % 34;
      g.p(x, y, 1, 1, i % 4 ? '#7fd8ea' : '#e8d9b0');
    }
    g.line(4, 46, 124, 38, a);                          // the rail, glowing
    g.line(4, 47, 124, 39, '#2b6d7a');
    g.line(0, 60, W, 56, '#1b4a5a');                    // a ground marking
    const cx = 60, cy = 34;                             // faceted body
    g.p(cx - 4, cy + 6, 14, 2, '#dff6ff');              // board
    g.p(cx - 2, cy - 2, 5, 8, '#4fd0e0');
    g.p(cx + 3, cy - 4, 5, 9, '#b06ce0');
    g.p(cx + 1, cy - 9, 5, 5, '#e0e06c');
    g.p(cx + 5, cy + 2, 4, 6, '#6ce09a');
    g.p(cx - 1, cy + 3, 4, 5, '#e06c8a');
  },

  // Tiny 2D: the lit lip of the hill, and the one skater on it
  lip(g, a) {
    g.bands(['#03060c', '#071522', '#0a2030', '#0a2030']);
    g.disc(102, 16, 7, '#9fd8e8');                      // moon
    const hill = (x) => 42 + Math.sin(x / 26) * 13 + Math.sin(x / 9) * 3;
    for (let x = 0; x < W; x++) {
      const y = hill(x);
      g.p(x, y, 1, H - y, '#061019');                   // the dark mass
      g.p(x, y, 1, 2, a);                               // the glowing lip
      g.p(x, y + 2, 1, 1, '#2b6d7a');
    }
    const sx = 44, sy = hill(44) - 6;
    g.p(sx - 4, sy + 5, 9, 2, '#dff6ff');               // board
    g.p(sx - 1, sy, 4, 6, '#e0483f');                   // rider
    g.p(sx, sy - 4, 3, 4, '#f5d13f');
  },

  // 20/20: the chart, getting away from you
  optotype(g, a) {
    g.p(0, 0, W, H, '#f2efe6');
    g.p(0, 0, W, 6, '#dcd6c8');
    const E = (x, y, s, c) => {
      g.p(x, y, s * 5, s, c);
      g.p(x, y, s, s * 5, c);
      g.p(x, y + s * 2, s * 4, s, c);
      g.p(x, y + s * 4, s * 5, s, c);
    };
    E(10, 16, 6, '#1a1a1a');
    E(52, 20, 4, '#1a1a1a');
    E(78, 24, 3, '#3a3a3a');
    E(96, 26, 2, '#5a5a5a');
    E(110, 28, 1, '#7a7a7a');
    g.p(8, 58, 112, 2, '#c8c2b4');
    g.p(8, 62, 40, 4, a);
  },
};

// ── the glass ──────────────────────────────────────────────────────
// Every marquee is seen through the same curved screen the experiences in
// gameoflife use — barrel distortion, one scanline per source row, a corner
// vignette. That one runs in WebGL because it presents a moving picture; a
// marquee never changes, so this is a single pixel remap done once at load and
// never touched again. Nine cabinets cost nine 256×144 passes, total, forever.
const CURVE = 0.075;
const NORM = 1 / (1 + CURVE);          // overscan, so the art still fills the frame
const SCALE = 2;

function throughGlass(src, dst) {
  const dw = W * SCALE, dh = H * SCALE;
  dst.width = dw; dst.height = dh;
  const sctx = src.getContext('2d');
  const dctx = dst.getContext('2d');
  const s = sctx.getImageData(0, 0, W, H).data;
  const out = dctx.createImageData(dw, dh);
  const o = out.data;

  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const cx = (x + 0.5) / dw * 2 - 1, cy = (y + 0.5) / dh * 2 - 1;
      const k = (1 + CURVE * (cx * cx + cy * cy)) * NORM;
      const u = (cx * k) * 0.5 + 0.5, v = (cy * k) * 0.5 + 0.5;
      const d = (y * dw + x) * 4;
      o[d + 3] = 255;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;      // past the glass: black
      const si = ((Math.min(H - 1, v * H) | 0) * W + (Math.min(W - 1, u * W) | 0)) * 4;
      // one dark line per source row, and the corners falling away
      const scan = 1 - 0.1 * (0.5 + 0.5 * Math.cos(v * H * Math.PI * 2));
      const r2 = cx * cx + cy * cy;
      const f = scan * (1 - 0.24 * r2 * r2);
      o[d] = s[si] * f;
      o[d + 1] = s[si + 1] * f;
      o[d + 2] = s[si + 2] * f;
    }
  }
  dctx.putImageData(out, 0, 0);
}

// paint one marquee into a canvas element, through the glass
export function drawMarquee(canvas, key, accent) {
  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const ctx = src.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  (ART[key] ?? ART.gel)(pen(ctx), accent);
  throughGlass(src, canvas);
}
