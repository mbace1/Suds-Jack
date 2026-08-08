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

  // Hyper Dagger: a swarm coming out of the dark, and the only light in the
  // world is the one you are making.
  //
  // Devil Daggers rather than HYPERDEMON (owner's call, and Bone Dust sits on
  // the same side). The two look nothing alike and the difference is one
  // decision: where the light is. HYPERDEMON burns the whole sky behind the
  // swarm, so a skull reads as a SILHOUETTE punched out of a blaze. Devil
  // Daggers has no sky at all — pitch black, no horizon, no grid you can see —
  // and the only thing lighting anything is your own dagger stream coming up
  // from the bottom of the frame. So the light is UNDER the swarm, jaws are the
  // brightest thing on the picture, and every crown falls away into the void.
  // An earlier pass had the burning sky and it was the wrong game on the front.
  //
  // Still the Atari idiom: a 2600 changed colour once per scanline, so the
  // light on a face is a stack of flat steps with hard seams (TONE), never a
  // ramp — which suits the game's own rule of black and bone with dark red the
  // only colour allowed in. Depth is the ONLY other tool: further back is
  // smaller, and dimmer by a fixed number of steps down the same ladder, until
  // the last of them is barely out of the black.
  skull(g, a) {
    const VOID = '#050406';
    // one ladder of bone under one light. A skull nearer the daggers starts
    // further up it; a skull further back starts lower, and the far ones never
    // reach the top rungs at all. Nothing here is blended.
    const TONE = ['#0d0b0a', '#1d1917', '#332c26', '#564c41', '#8a7f70', '#c0b6a5', '#eae3d4'];
    g.p(0, 0, W, H, VOID);

    // There is no floor. Devil Daggers gives you an edge to fall off and
    // nothing whatever to look at, and two passes here proved it: a grid read
    // as shelving, and flat rows of warm brown across the bottom read as a
    // muddy streak. What is left is one barely-there seam at the very bottom
    // so the swarm is not floating in a plain rectangle.
    g.p(0, 69, W, 1, mix(VOID, '#2a1712', 0.5));

    // One skull, lit from below. `s` is half-width at the temples, `step` is
    // how far down the tone ladder distance has pushed it.
    //
    // The light is FOUR FLAT STEPS, not a ramp. A ramp was the first cut and
    // every face came out one muddy mid-grey, because almost all of a skull's
    // area is temple and cheek and a smooth ramp gives those nearly the same
    // value. Hard seams at fixed heights is both what a 2600 actually did and
    // the only thing that reads as a light source at this size.
    const rungOf = t => t < 0.28 ? 2 : t < 0.55 ? 4 : t < 0.76 ? 5 : 6;

    // A skull is a DOME AND A BLOCK, not a taper. The first cut described the
    // outline as one smooth profile narrowing from temples to chin, and every
    // head came out a mushroom — because a taper is exactly what a mushroom is.
    // What makes the shape read at 17 pixels is that the cranium is a circle
    // whose sides drop straight at the temples, and the jaw is a separate,
    // clearly narrower box hanging under it with a step between them.
    const head = (cx, cy, s, step) => {
      const rs = s, dome = rs * 2, h = Math.round(dome + s * 0.55);
      // The jaw is narrower than the cranium — but LESS so the smaller the
      // head, because a 10px dome on a 6px jaw is a mushroom, and the far ones
      // in the swarm all came out as ice-cream cones until this was scaled.
      const jw = s * Math.min(0.82, 0.56 + Math.max(0, 12 - s) * 0.026);
      const half = i => {
        if (i <= rs * 1.2) {                           // the cranium, a circle
          const dy = rs - i;
          return Math.max(s * 0.55, Math.sqrt(Math.max(0, rs * rs - dy * dy)));
        }
        if (i <= dome) return s * 0.95;                // temples, straight down
        return jw;                                     // and the jaw under it
      };
      for (let i = 0; i <= h; i++) {
        const w = Math.round(half(i));
        const c = TONE[Math.max(0, Math.min(6, rungOf(i / h) - step))];
        g.p(cx - w - 1, cy + i, w * 2 + 3, 1, VOID);   // the hard line
        g.p(cx - w, cy + i, w * 2 + 1, 1, c);
      }
      // Sockets are cut back to the void rather than filled — that is what
      // makes a skull read at this size, and it costs the same at any distance.
      const ew = Math.max(2, Math.round(s * 0.44)), eo = Math.round(s * 0.09);
      const ey = cy + Math.round(h * 0.42), eh = Math.max(2, Math.round(s * 0.46));
      g.p(cx - eo - ew, ey, ew, eh, VOID);
      g.p(cx + eo, ey, ew, eh, VOID);
      // What looks out is a POINT, not a pane. Filling the socket turned them
      // into lit windows and the head stopped being bone.
      if (s > 6) {
        const d = Math.max(1, Math.round(s * 0.20)), dy = ey + eh - d - 1;
        g.p(cx - eo - ew + 1, dy, d, d, a);
        g.p(cx + eo + ew - d - 1, dy, d, d, a);
      }
      if (s > 11) g.p(cx - 1, cy + Math.round(dome * 0.80), 3, Math.round(s * 0.24), VOID);
      // the step under the cranium — the shadow line that says the jaw is a
      // separate bone hanging off it, and the thing that stops the two blocks
      // reading as one lump. Worth its one pixel even on the far ones.
      g.p(cx - Math.round(jw) - 1, cy + Math.round(dome), Math.round(jw) * 2 + 3, 1, VOID);
      if (s > 8) {
        // teeth sit at the TOP of the jaw, not down the middle of it — centred
        // they turned the whole jaw into one bright slab with a stripe in it
        const ty = cy + Math.round(dome) + 2, tw = Math.max(1, Math.round(s * 0.12));
        for (let k = -2; k <= 2; k++) g.p(cx + k * tw * 2 - tw, ty, tw, Math.round(s * 0.26), VOID);
        // and the one rim the rules demand: a hero cannot be a shape in the
        // dark, so the underside of the jaw catches the ember it is lit by
        g.p(cx - Math.round(s * 0.5), cy + h + 1, Math.round(s), 1, mix(VOID, a, 0.7));
      }
    };

    // The swarm, back to front so nearer heads overlap the ones behind them —
    // at this size overlap sells depth harder than scale does.
    head(23, 16, 5, 4);
    head(108, 14, 6, 4);
    head(38, 30, 7, 3);
    head(100, 27, 8, 3);
    head(16, 42, 10, 2);
    head(112, 44, 9, 2);
    head(67, 8, 17, 0);         // the one in your face, on the top rungs

    // The daggers, entering from the corner nearest the player. They are the
    // light source, so they are the only pure white here, and they run along
    // the BOTTOM rather than up through the swarm — routed across the middle
    // they crossed the big skull's socket and read as stuck in its face.
    // The ember goes ON the stream rather than under the picture: it is the
    // light these things are throwing, so it has to sit where they are.
    for (let i = 0; i < 7; i++) {
      const t = i / 7, x = 2 + t * 34, y = 70 - t * 13;
      g.p(x - 5, y - 2, 17, 5, mix(VOID, a, 0.16));    // the glow it throws
      g.p(x - 1, y - 1, 9, 4, VOID);
      g.p(x, y, 7, 2, '#ffffff');
      g.p(x - 4, y, 4, 1, a);                          // the tail
    }
  },

  // The secret cabinet: the workshop's own mark, in the workshop's own two
  // colours. Not tinted from an accent like every other marquee here — magenta
  // and black IS the brand and a marquee that recoloured it would be the one
  // picture on this floor that lies about what it is showing.
  //
  // Redrawn in pixels rather than imported from toko/js/face.js. That module is
  // built for smooth canvas at 44px and up, where the mark is arcs; at 128x72
  // behind pixelated upscaling those arcs would be rasterised twice and the
  // eye slots — the most sensitive measurement in the brand — would close. The
  // slots are cut here as explicit gaps so they cannot.
  mask(g) {
    const INK = '#000000', MARK = '#F0027F';
    g.p(0, 0, W, H, INK);
    // a lit disc behind it, the badge carrier
    g.disc(64, 36, 30, '#12060c');
    g.disc(64, 36, 29, '#1a0810');

    // An arc of fat pixels, degrees from east. Y GROWS DOWNWARD on a canvas,
    // so 90 is the BOTTOM of the circle and an arc "opening up" is 0..180, not
    // 180..360. The first cut had the mouth the other way round and the mark
    // came out as one magenta blob — the mouth was arching over the eyes it is
    // supposed to sit under.
    const S = 3;
    const arc = (cx, cy, r, a0, a1, c) => {
      for (let d = a0; d <= a1; d += 1.5) {
        const t = d * Math.PI / 180;
        g.p(Math.round(cx + Math.cos(t) * r - S / 2), Math.round(cy + Math.sin(t) * r - S / 2), S, S, c);
      }
    };

    // The mouth: two nested arcs opening UP, both stopping short of a
    // semicircle so the tips stand up straight and leave air under the eyes.
    arc(64, 34, 17, 20, 160, MARK);
    arc(64, 34, 9, 26, 154, MARK);

    // Each eye: a crown opening DOWN with two straight legs, and a stem
    // dropped from the inside of the crown. The STEM is what cuts the two
    // slots, and the slots are what make an eye an eye rather than a blob —
    // which is why the stroke is the most sensitive number in this brand and
    // why the gaps are stated here as arithmetic instead of hoped for.
    for (const dx of [-14, 14]) {
      const cx = 64 + dx, cy = 24, r = 8, leg = 6;
      arc(cx, cy, r, 180, 360, MARK);
      g.p(cx - r - 1, cy, S, leg, MARK);            // left leg
      g.p(cx + r - 1, cy, S, leg, MARK);            // right leg
      g.p(cx - 1, cy - r + S, S, leg + r - S, MARK); // the stem, off the crown
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

  // Flash Prince: the cover shot, which is a man on the wrong side of a lip.
  //
  // Every one of these games has the same photograph on its box in some form —
  // a small figure with his back to you, dwarfed by somewhere he should not be
  // — so this is that, with the two things the game is doing said at once. The
  // sky blends ACROSS as well as down (jungle violet on the left, sandstone on
  // the right) because the world changing biome under you is the whole idea;
  // and the man is hanging off the front edge with the frame cutting him at the
  // knees, because a figure cropped by the frame is in front of the picture
  // rather than in it. He is lit — pale shirt against black rock. A silhouette
  // here would have vanished into the ledge he is hanging from, which is the
  // mistake Neon Ronin's first pass made.
  ledge(g, a) {
    const INK = '#05060a', BONE = '#c2cede', SUIT = '#2f3d5e', SKIN = '#c89878';
    const STONE = '#c89a58', DEEP = '#1a1008';

    const L = ['#181038', '#2c1442', '#4a1c4e', '#63264a', '#123043'];
    const R = ['#20182c', '#3c2230', '#6e4030', '#9a5a34', '#4a3626'];
    for (let i = 0; i < 5; i++) {
      for (let x = 0; x < W; x += 8) g.p(x, i * 8, 8, 8, mix(L[i], R[i], x / 120));
    }
    g.disc(46, 12, 6, '#d6ff78');                 // the two suns, low and close
    g.disc(60, 19, 3, '#d6ff78');

    // a ridge, and the ground the pylon is standing on
    for (let x = 0; x < W; x++) {
      const y = 38 - Math.round(Math.sin(x * 0.05) * 4 + Math.sin(x * 0.13) * 2);
      g.p(x, y, 1, 46 - y, mix('#0c3040', '#33241a', x / 120));
    }

    // The pylon. It has to be LIGHTER than the sky behind it or it is an
    // outline floating in the dark — the rule Neon Ronin's gate taught. And it
    // has to be TALL: the first pass sat it low and wide and it read as a shed.
    // Egyptian batter, so the wall leans in the whole way up.
    for (let y = 8; y < 47; y++) {
      const xl = 76 + Math.round((47 - y) * 0.2);
      g.p(xl, y, W - xl, 1, STONE);
      g.p(xl, y, 2, 1, mix(STONE, DEEP, 0.5));
      if (y % 8 === 0) g.p(xl + 2, y, W - xl - 2, 1, mix(STONE, DEEP, 0.3));
    }
    g.p(72, 3, W - 72, 6, mix(STONE, '#ffffff', 0.22));        // the lintel
    g.p(72, 9, W - 72, 1, mix(STONE, DEEP, 0.55));
    for (let i = 0; i < 6; i++) g.p(85 + i * 7, 13, 3, 5, mix(STONE, DEEP, 0.62));

    // the doorway, and the light coming out of it that is not firelight
    g.p(92, 21, 26, 26, DEEP);
    for (let y = 24; y < 47; y++) g.p(95, y, 20, 1, mix('#46f0ff', '#0a2c38', (y - 24) / 26));
    g.p(102, 24, 6, 23, '#d6f8ff');

    // the ledge he is over the front of. Not flat black — a couple of lit
    // faces far down in it, so the drop reads as a drop and not as a border.
    g.p(0, 46, W, 26, INK);
    g.p(0, 46, W, 2, mix('#7a5330', '#c89a58', 0.55));
    for (let x = 0; x < W; x += 9) g.p(x + (x % 18 ? 1 : 4), 48, 4, 1, '#2a1c12');
    g.p(8, 62, 20, 1, '#241a14');
    g.p(58, 68, 26, 1, '#241a14');
    g.p(96, 58, 14, 1, '#241a14');

    // And the man. Hands over the lip, arms straight and taking the weight,
    // legs going out of frame at the bottom — the crop is what says he is in
    // front of the picture rather than standing somewhere in it.
    const cx = 38;
    g.p(cx - 10, 43, 5, 5, SKIN);                // the two hands, over the lip
    g.p(cx + 5, 43, 5, 5, SKIN);
    g.p(cx - 9, 47, 4, 10, BONE);                // arms, straight, holding on
    g.p(cx + 5, 47, 4, 10, BONE);
    g.p(cx - 9, 47, 1, 10, mix(BONE, INK, 0.45));
    g.p(cx - 6, 55, 13, 12, BONE);               // the pale shirt: the one lit
    g.p(cx - 6, 55, 13, 2, mix(BONE, '#ffffff', 0.55));  // thing in this corner
    g.p(cx - 6, 55, 2, 12, mix(BONE, INK, 0.4));
    g.p(cx - 5, 66, 12, 6, SUIT);                // and the legs, going off frame
    g.p(cx - 5, 66, 4, 6, mix(SUIT, INK, 0.45));
    g.p(cx - 4, 46, 8, 9, SKIN);                 // head, tipped back to look up
    g.p(cx - 5, 44, 9, 4, '#0d0d14');
    g.p(cx - 5, 46, 2, 5, '#0d0d14');
    g.p(cx + 3, 50, 2, 2, mix(SKIN, INK, 0.35));

    // one frond in from the corner, solid, so the jungle is still in the shot
    g.p(0, 0, 8, 40, INK);
    for (let i = 0; i < 4; i++) {
      const a2 = 0.02 + i * 0.36;
      const len = 36 - i * 4;
      for (let k = 0; k <= 34; k++) {
        const t = k / 34, r = len * t;
        g.disc(3 + Math.cos(a2) * r, -1 + Math.sin(a2) * r + 14 * t * t,
          Math.max(1.3, 3.6 - t * 2.4), INK);
      }
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
