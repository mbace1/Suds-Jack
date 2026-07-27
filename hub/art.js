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

// Blend two hex colours. Box-art skies are ramps, not bands, and a neon edge is
// a colour walking toward its accent — both want this rather than a palette.
const mix = (c1, c2, t) => {
  const k = Math.max(0, Math.min(1, t));
  const ch = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const v = i => Math.round(ch(c1, i) + (ch(c2, i) - ch(c1, i)) * k).toString(16).padStart(2, '0');
  return `#${v(0)}${v(1)}${v(2)}`;
};

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

  // Hyper Dagger: the shot HYPERDEMON puts on its own front — a huge skull
  // hanging over the disc in the void, seen from behind the hand that is
  // feeding daggers into it, with the whole sky burning behind its head.
  //
  // Drawn in the Atari idiom rather than the modern one. HYPERDEMON's searing
  // backlight is a hundred blown-out gradients and a 2600 could not do one of
  // them — what it COULD do was change the colour once per scanline, so a sky
  // is a stack of flat horizontal bars with hard edges between them. That one
  // constraint carries the whole picture, and it suits the game's own rule:
  // black and bone, with dark red the only colour allowed in.
  skull(g, a) {
    const INK = '#08070a', BONE = '#e6dfd0', DIM = '#8e857a', GREY = '#5f574e';
    g.p(0, 0, W, H, INK);

    // the burn behind the head, a bar at a time, bleeding off both edges
    for (let y = 0; y < 58; y++) {
      const dy = y - 30;
      if (Math.abs(dy) > 31) continue;
      const dx = Math.floor(Math.sqrt(31 * 31 - dy * dy) * 1.9);
      const k = (dy + 31) / 62;
      const c = k < 0.55 ? mix('#1c0503', a, (k / 0.55) * 0.9)
        : mix(a, '#f9dfc8', ((k - 0.55) / 0.45) * 0.8);
      g.p(64 - dx, y, dx * 2 + 1, 1, c);
    }
    // the bars STOP, they do not blend — that seam is the whole tell
    for (let y = 3; y < 58; y += 6) g.p(0, y, W, 1, 'rgba(8,7,10,0.34)');

    // The arena, and it has to read as a DISC with an edge — the whole game is
    // that there is nowhere else to stand. So the grid is clipped to a wedge
    // that opens toward the viewer rather than run out to the frame, which is
    // what made an earlier pass look like shelving.
    const VX = 64, VY = 53;
    const reach = y => Math.min(66, (y - VY) * 7.5);
    for (const y of [57, 60, 64, 71]) {
      const r = reach(y);
      g.p(VX - r, y, r * 2, 1, mix(GREY, '#cbc2b6', (y - 57) / 14));
    }
    for (let i = -5; i <= 5; i++) {
      g.line(VX + i * 1.6, VY + 2, VX + i * (reach(H) / 5.2), H, i === 0 ? '#8e857a' : GREY);
    }

    // The head. A Master System sprite is a flat fill inside a hard black line
    // — so the shape has to be in the SILHOUETTE, because there is no shading
    // to put it in. Cranium tapers to temples, cheeks pull in, jaw hangs.
    const half = y => {
      if (y < 12) return 13 + (y - 6) * 1.2;          // crown
      if (y < 30) return 20;                          // temples, widest
      if (y < 36) return 20 - (y - 30) * 0.9;         // cheeks pulling in
      return 14 - (y - 36) * 0.25;                    // and the jaw tapering off
    };
    for (let y = 6; y <= 50; y++) {
      const w = Math.round(half(y));
      g.p(64 - w - 1, y, w * 2 + 3, 1, INK);          // the hard line
      g.p(64 - w, y, w * 2 + 1, 1, y < 36 ? BONE : DIM);
    }
    g.p(64 - 13, 6, 27, 3, '#f7f2e8');                // one lit plane, flat
    g.p(64 - 20, 36, 41, 1, INK);                     // where the jaw hangs off
    for (let i = 0; i < 5; i++) {                     // teeth
      g.p(51 + i * 6, 44, 5, 9, INK);
      g.p(52 + i * 6, 44, 3, 8, BONE);
    }

    g.p(48, 17, 13, 13, INK);                         // sockets, cut clean
    g.p(67, 17, 13, 13, INK);
    g.p(51, 20, 7, 7, a);                             // and what looks out
    g.p(70, 20, 7, 7, a);
    g.p(52, 21, 3, 3, '#ffd9cf');
    g.p(71, 21, 3, 3, '#ffd9cf');
    g.p(59, 30, 10, 7, INK);                          // nose
    g.p(46, 15, 36, 2, mix(BONE, INK, 0.45));         // brow

    // two more of them, further out and further back
    for (const [cx, cy] of [[13, 26], [111, 34]]) {
      for (let i = 0; i < 11; i++) {                  // same taper, one tenth up
        const w = i < 2 ? 4 : i < 8 ? 5 : 3;
        g.p(cx - w - 1, cy + i, w * 2 + 3, 1, INK);
        g.p(cx - w, cy + i, w * 2 + 1, 1, DIM);
      }
      g.p(cx - 4, cy + 3, 3, 4, INK); g.p(cx + 2, cy + 3, 3, 4, INK);
      g.p(cx - 4, cy + 4, 2, 2, a); g.p(cx + 2, cy + 4, 2, 2, a);
      for (let i = 0; i < 3; i++) g.p(cx - 4 + i * 3, cy + 11, 2, 3, DIM);
    }

    // The daggers, entering from the corner nearest the player. There was a
    // first-person gauntlet down here for a while and it was wrong: at 128x72
    // a hand is four white bricks, and it took the frame away from the head —
    // which on the real cover is the whole picture. The stream says the same
    // thing (someone is throwing these) in a tenth of the pixels.
    for (let i = 0; i < 6; i++) {
      const t = i / 6, x = 116 - t * 46, y = 69 - t * 24;
      g.p(x - 1, y - 1, 9, 4, INK);
      g.p(x, y, 7, 2, '#ffffff');
      g.p(x + 7, y, 4, 1, a);                         // the tail
    }
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

  // Neon Ronin: the box-art shot. A gate framing a stair that climbs away in
  // one-point perspective to whoever is waiting at the top, the ronin at the
  // foot of it with his back to us, a planet sitting low behind the whole
  // thing — Phantasy Star III's composition, lit in neon instead of oils.
  slash(g, a) {
    const VX = 64, VY = 21;                       // the vanishing point
    const yAt = t => VY + 3 + 46 * Math.pow(t, 1.45);
    const halfAt = t => 6 + 36 * Math.pow(t, 1.25);

    // sky: violet overhead ramping to hot magenta down at the horizon
    for (let y = 0; y < H; y++) g.p(0, y, W, 1, mix('#120726', '#5e1150', Math.pow(y / H, 1.4)));
    for (let i = 0; i < 34; i++) {                // stars, and one thing falling
      g.p((i * 47) % W, (i * 29) % 40, 1, 1, i % 5 ? '#6a4a86' : '#e8d9f2');
    }
    g.line(103, 5, 116, 15, '#c9a8e8');
    g.p(116, 15, 2, 2, '#f2e4ff');

    // the planet, huge and low, most of it out of frame
    g.disc(12, 46, 25, '#341856');
    for (let dy = -25; dy <= 25; dy++) {          // one lit limb, facing the glow
      g.p(12 + Math.floor(Math.sqrt(625 - dy * dy)) - 2, 46 + dy, 2, 1, '#a84c96');
    }

    // the glow at the head of the stair — wide and shallow, so it sits on the
    // horizon rather than reading as a moon behind the figure
    for (let r = 20; r > 0; r--) {
      const c = mix('#5e1150', a, 0.05 + (20 - r) * 0.021);
      for (let dy = -r; dy <= r; dy++) {
        const dx = Math.floor(Math.sqrt(r * r - dy * dy) * 1.5);
        g.p(VX - dx, VY + dy * 0.8, dx * 2 + 1, 1, c);
      }
    }

    // the stair as one solid mass, then every riser lit along its front edge
    for (let y = VY + 3; y < H; y++) {
      const hw = halfAt(Math.pow((y - VY - 3) / 46, 1 / 1.45));
      g.p(VX - hw, y, hw * 2, 1, '#150a26');
    }
    for (let i = 1; i <= 12; i++) {
      const t = i / 12, y = yAt(t), hw = halfAt(t);
      g.p(VX - hw, y, hw * 2, 1, mix('#3a1440', a, 0.22 + t * 0.62));
      if (t > 0.4) g.p(VX - hw, y + 1, hw * 2, 1, '#280e2e');
    }
    // two thin beams down the rails. The box art fans light down the stair;
    // at this size anything thicker than a pixel stops being light and starts
    // being a second staircase.
    for (const s of [-1, 1]) {
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, y = yAt(t), x = VX + s * halfAt(t);
        g.p(x, y, 1, 1, mix('#2ae8e0', '#0e4a52', t));
      }
      g.p(VX + s * halfAt(0.5), yAt(0.5), 2, 2, '#bffff8');
    }

    // whoever is waiting up there, and the ring of orbs hanging over them
    g.p(VX - 2, VY - 7, 4, 9, '#bff6f0');
    g.p(VX - 5, VY - 5, 3, 1, '#7ff2ea');
    g.p(VX + 4, VY - 5, 3, 1, '#7ff2ea');
    g.p(VX - 1, VY - 10, 2, 3, '#eafffd');
    for (let i = 0; i < 5; i++) g.p(VX - 8 + i * 4, VY - 15 - (i % 2 ? 2 : 0), 3, 3, i % 2 ? a : '#ff8fd8');

    // The ronin, back to us, at the foot of the stair. The temptation is to
    // make him a black silhouette, and that is exactly what does not work: the
    // stair behind him is already dark, so he disappears into it. The box art
    // gets round this by LIGHTING the cloak — a pale mass against dark steps —
    // so this does the same in violet, with his own colour down one edge and
    // the gate's cyan down the other.
    // He is cropped by the bottom of the frame, and that crop is doing real
    // work: a figure standing fully inside a converging staircase just reads as
    // a runner laid down the middle of it. Cut off at the shoulders' height he
    // is unmistakably in front of the scene, the stair stays whole behind him,
    // and the shape left to read is only head-notch-shoulders — which is the
    // part a person recognises anyway.
    const cx = 58, RIM = mix('#553492', a, 0.95), COLD = '#8ff0f6';
    for (let i = 0; i < 14; i++) {                             // the cloak
      const y = 58 + i, w = 26 + i * 1.1, x0 = cx - w / 2;
      g.p(x0, y, w, 1, mix('#4d2f85', '#2b1a4e', i / 13));     // falling into shadow

      g.p(x0 + w * 0.28, y, 1, 1, '#33205c');                  // two folds hanging
      g.p(x0 + w * 0.7, y, 1, 1, '#33205c');
      g.p(x0, y, 2, 1, RIM);
      g.p(x0 + w - 2, y, 2, 1, '#5fd4de');
    }
    g.p(cx - 12, 54, 24, 4, '#4d2f85');                        // shoulders, narrower
    g.p(cx - 11, 53, 22, 1, RIM);                              // the step that reads
    g.p(cx - 12, 54, 2, 4, RIM);
    g.p(cx + 10, 54, 2, 4, '#5fd4de');
    g.p(cx - 3, 52, 6, 2, '#160c2c');                          // neck
    g.p(cx - 4, 44, 8, 8, '#160c2c');                          // head
    g.p(cx - 3, 43, 6, 1, '#160c2c');                           // crown, rounded off
    g.p(cx - 3, 42, 6, 1, RIM);
    g.p(cx - 4, 43, 1, 1, RIM);
    g.p(cx + 3, 43, 1, 1, COLD);
    g.p(cx - 5, 44, 1, 8, RIM);
    g.p(cx + 4, 44, 1, 8, COLD);
    g.p(cx - 1, 40, 3, 3, '#160c2c');                          // the knot
    g.p(cx - 1, 39, 3, 1, RIM);
    g.line(cx + 10, 55, cx + 19, 48, '#3b2368');               // the sword arm
    g.line(cx + 10, 54, cx + 19, 47, COLD);
    g.p(cx + 19, 46, 3, 3, '#eafffd');                         // the hand on it
    g.line(cx + 21, 47, 106, 13, '#1a8f96');                   // the raised blade
    g.line(cx + 21, 46, 106, 12, '#eafffd');
    g.p(105, 10, 3, 3, '#ffffff');

    // the gate, last, so it frames everything: two piers and the span, with the
    // neon on the inside edge where the light would actually spill from
    for (let y = 0; y < H; y++) {
      // stone, and it has to be lighter than the sky or the gate is just a
      // cyan outline floating in the dark
      const stone = y % 8 === 0 ? '#3d2452' : (y % 8 === 7 ? '#150b22' : '#26153a');
      g.p(0, y, 13, 1, stone);
      g.p(115, y, 13, 1, stone);
      g.p(6, y, 1, 1, y % 16 < 8 ? '#150b22' : '#26153a');     // a course, offset
      g.p(121, y, 1, 1, y % 16 < 8 ? '#26153a' : '#150b22');
      g.p(13, y, 1, 1, '#2ae8e0');
      g.p(114, y, 1, 1, '#2ae8e0');
      g.p(14, y, 1, 1, '#0d3038');
      g.p(113, y, 1, 1, '#0d3038');
    }
    for (let x = 13; x < 115; x++) {
      const ay = 4 + 16 * Math.pow((x - 64) / 51, 2);
      for (let y = 0; y < ay; y++) {
        g.p(x, y, 1, 1, (x + Math.round(ay)) % 9 === 0 ? '#3d2452' : '#26153a');
      }
      g.p(x, ay, 1, 1, '#2ae8e0');
      g.p(x, ay + 1, 1, 1, '#0d3038');
    }
  },

  // The Game of Life: its own treeline, under its own sun
  // Radio Free Helsinki: half a codec screen. Toko's gel on the left reading
  // the wire, the feed itself on the right, and ONE amber line where a
  // bulletin has been decoded — amber is the only warm colour on the dial, and
  // it never shows up until the listener asks what the wording was doing.
  codec(g, a) {
    g.p(0, 0, W, H, '#04070a');
    g.p(4, 5, 120, 62, '#081218');

    // the portrait frame, with codec corner brackets
    g.p(8, 9, 38, 54, '#0a1a1e');
    for (const [x, y, w, h] of [[8, 9, 38, 1], [8, 62, 38, 1], [8, 9, 1, 54], [45, 9, 1, 54]])
      g.p(x, y, w, h, '#1c4a38');
    for (const [x, y] of [[8, 9], [42, 9], [8, 59], [42, 59]]) {
      g.p(x, y, 4, 1, '#7dffb2'); g.p(x === 8 ? x : x + 3, y, 1, 4, '#7dffb2');
    }

    // Toko's gel — the teal blob from toko-drop, sat in the frame
    g.disc(27, 34, 13, '#00806b');
    g.disc(27, 33, 12, '#00ccaa');
    g.p(22, 30, 3, 5, '#08110f');
    g.p(30, 30, 3, 5, '#08110f');
    g.p(23, 28, 2, 2, '#7ff0dd');
    g.p(20, 44, 15, 15, '#00806b');           // shoulders, joined to the head

    // the feed: one line a bulletin, scrolling past
    const runs = [30, 22, 34, 26, 31, 19];
    runs.forEach((w, i) => {
      const y = 11 + i * 8;
      const decoded = i === 2;
      g.p(51, y, 2, 4, decoded ? '#ffb43a' : '#3f9a6e');
      g.p(55, y, w, 2, decoded ? '#ffb43a' : '#7dffb2');
      g.p(55, y + 3, Math.round(w * 0.6), 1, '#1c4a38');
    });

    // the band, in the cabinet's own colour
    let py = 61;
    for (let x = 52; x < 121; x += 2) {
      const y = 61 + Math.round(Math.sin(x * 0.5) * Math.sin(x * 0.13) * 4);
      g.line(x - 2, py, x, y, a);
      py = y;
    }

    // the glass
    for (let y = 5; y < 67; y += 2) g.p(4, y, 120, 1, 'rgba(4,7,10,0.34)');
  },

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
