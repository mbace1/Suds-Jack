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
  // Toko Drop (Godot): the same gels, but the cover is the ROOM. The Godot
  // port's signature read is the wide neon grid seen down its own perspective
  // with the swarm small inside it — where the browser cabinet's cover is a
  // face, this one is a place. Two cabinets for one game need to be tellable
  // apart at a glance, and the marquee is what does it.
  gelgrid(g, a) {
    g.p(0, 0, W, H, '#05060f');
    // The floor, as a trapezoid of scanlines: narrow at the top (far edge),
    // wide at the bottom. One row per source line is the whole 2600 trick.
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const half = 10 + t * 52;
      const y = 22 + i * 1.85;
      g.p(64 - half, y, half * 2, 1, i % 4 === 0 ? '#123a4a' : '#0b2430');
    }
    // Verticals converging on the vanishing point.
    for (let k = -5; k <= 5; k++) {
      const topX = 64 + k * 2.0;
      const botX = 64 + k * 10.4;
      for (let i = 0; i < 26; i++) {
        const t = i / 25;
        g.p(topX + (botX - topX) * t, 22 + i * 1.85, 1, 1, '#10333f');
      }
    }
    // The rail: the boundary you are actually clamped against.
    g.p(54, 21, 20, 1, '#8f86e8');
    g.p(6, 68, 116, 1, '#8f86e8');
    // The swarm, small in a big room, and the hero lit against it.
    g.disc(44, 44, 5, '#2f7f66');
    g.disc(86, 38, 4, '#7a3a8f');
    g.p(96, 52, 6, 6, '#c8a83a');
    g.disc(64, 50, 4, a);
    g.p(62, 48, 2, 2, '#0b1a16');
    g.p(66, 48, 2, 2, '#0b1a16');
    g.p(61, 45, 3, 1, '#dff6ff');
  },

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
  // Toko Trip: the nook at golden hour, looking down its own inlet. The chair
  // is the subject and it is EMPTY — the invitation is the game. Palm cropped
  // by the right frame (cropping is what makes a foreground), rimmed in two
  // colours so it is never a black cutout; the sky is flat bars with hard
  // seams, 2600-style; the cave's magenta is one distant wink, not a theme.
  cove(g, a) {
    const SKY = ['#4a3a6a', '#6a4a72', '#96527a', '#c4647a', '#e0806a', '#e8a05c'];
    const HOR = 30;
    SKY.forEach((c, i) => g.p(0, i * 5, W, 5, c));

    // the sun, low over the sea, with one hard halo band — no gradients
    g.disc(58, 24, 7, '#f8d8a0');
    g.disc(58, 24, 5, '#ffeecb');

    // the sea: the game's own teal walking toward the horizon light
    for (let y = HOR; y < 54; y++) {
      const t = (y - HOR) / 24;
      g.p(0, y, W, 1, mix(mix(a, '#1d5a56', t * 0.75), '#e8a05c', Math.max(0, 0.3 - t)));
    }
    // sun glitter: a broken column, brightest at the horizon
    for (let y = HOR; y < 50; y += 2) {
      const w2 = Math.max(1, 7 - (y - HOR) * 0.28);
      if ((y >> 1) % 3 !== 0) g.p(58 - w2 / 2 + ((y * 7) % 3) - 1, y, w2, 1, mix('#ffe2a8', a, (y - HOR) / 30));
    }
    // the cave, far up the coast: one magenta arch, lit, tiny
    g.p(10, 26, 8, 4, '#241a20');
    g.line(11, 29, 13, 26, '#ff4fd8'); g.line(13, 26, 15, 26, '#ff4fd8'); g.line(15, 26, 17, 29, '#ff4fd8');
    g.p(12, 31, 5, 1, mix('#ff4fd8', a, 0.6));

    // the beach, sunset-warmed, and the inlet cutting into it toward the nook
    for (let y = 54; y < H; y++) {
      const t = (y - 54) / (H - 54);
      g.p(0, y, W, 1, mix('#d8b988', '#e9dcb0', t));
    }
    for (let y = 42; y < 66; y++) {
      // the channel: sea colour reaching down-left, widening seaward
      const t = (y - 42) / 24;
      const cx = 74 - t * 26, w2 = 30 - t * 21;
      if (y >= 54) {
        g.p(cx - w2 / 2 - 2, y, w2 + 4, 1, '#b99c72');          // wet rim
        g.p(cx - w2 / 2, y, w2, 1, mix(a, '#1d5a56', 0.25 + t * 0.3));
        if (y % 3 === 0) g.p(cx - w2 / 2, y, 2, 1, '#f2e9d8');   // foam flecks
      }
    }

    // the deck and the empty chair, bottom-left, cropped by the frame
    for (let y = 62; y < H; y += 3) g.p(0, y, 34, 2, y % 2 ? '#8a705a' : '#967a62');
    g.p(0, 60, 34, 2, '#6a5544');
    g.p(8, 42, 3, 22, '#4a3a30');                                 // chair back leg
    g.p(8, 40, 14, 4, '#5a4638');                                 // seat
    g.p(9, 41, 12, 2, mix(a, '#1d5a56', 0.2));                    // the cushion
    g.p(6, 24, 4, 18, '#4a3a30');                                 // backrest
    g.p(10, 24, 1, 18, '#e8a05c');                                // sunset rim
    g.p(6, 23, 5, 1, '#f0b060');
    // the lantern beside it, already on
    g.p(26, 34, 2, 26, '#3a2e26');
    g.disc(27, 32, 3, '#ffbf7a');
    g.disc(27, 32, 1, '#ffeecb');

    // the palm, in from the right frame, lit side toward the sun
    const trunk = [[126, 71], [120, 56], [113, 42], [107, 29], [103, 17], [101, 6]];
    for (let i = 0; i < trunk.length - 1; i++) {
      const [x0, y0] = trunk[i], [x1, y1] = trunk[i + 1];
      for (let d = -2; d <= 2; d++) g.line(x0 + d, y0, x1 + d, y1, d < 1 ? '#4a3a2c' : '#7a5c40');
      g.line(x0 + 3, y0, x1 + 3, y1, '#c98a52');                  // sun rim
    }
    for (const [dx, dy, c] of [[-26, 2, '#1d2a18'], [-18, -8, '#243420'], [-6, -12, '#2c4026'],
      [8, -10, '#243420'], [18, -2, '#1d2a18'], [-12, 6, '#182414']]) {
      g.line(101, 6, 101 + dx, 6 + dy, c);
      g.line(101, 7, 101 + dx, 7 + dy, mix(c, '#e8a05c', 0.35));  // each frond lit above
    }
    g.disc(101, 8, 2, '#4a3a2c');
  },
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

  // Powder: white sand under a purple sky, the rift, a bridge, two sleds
  powder(g, a) {
    g.bands(['#1c1440', '#4a2f7a', '#8b5fa8', '#d9a4cc']);
    g.p(0, 34, W, H - 34, '#e6e2de');            // the sand, white with grey in it
    g.disc(100, 20, 15, '#a07898');              // the ringed body
    g.disc(90, 15, 6, '#e6c8e0');
    for (let i = -22; i <= 22; i++) g.p(100 + i, 20 + (i * i) / 60 - 4, 1, 1, '#e6c8e0');
    g.disc(28, 9, 4, '#fff3dc');                 // the sun
    g.disc(28, 9, 7, 'rgba(255,220,200,0.35)');  // and its bloom
    for (let y = 40; y < H; y++) {               // the rift
      const w = 12 + (y - 40) * 2.2, cx = 58 + (y - 40) * 0.3;
      g.p(cx - w / 2 - 5, y, 5, 1, '#8a5c56');
      g.p(cx - w / 2, y, w, 1, y % 3 ? '#f6f4f0' : '#d8d4d2');
      g.p(cx + w / 2, y, 5, 1, '#5a4a8e');
    }
    g.p(30, 44, 62, 3, '#9c94a8');               // the bridge deck
    g.p(30, 43, 62, 1, '#6a6272');
    for (const px of [44, 58, 72]) g.p(px, 47, 2, 12, '#6a6272');
    g.p(10, 28, 4, 22, '#5c5478');               // monoliths on the rim
    g.p(18, 24, 3, 26, '#9088b4');
    g.p(112, 34, 6, 3, '#80708c');               // a rock that hangs
    // the aft-rocket sled, behind: flame trailing from the tail
    g.p(28, 50, 16, 3, '#e8dfc6');
    g.p(36, 50, 4, 3, '#25493f');
    g.p(24, 51, 4, 2, a);
    // the nose-rocket sled, leading, carving: spindrift off its outside runner
    for (let i = 0; i < 9; i++) g.p(48 + i * 3, 60 - i, 2, 2, i % 2 ? '#ffffff' : '#dfe4f0');
    g.p(56, 55, 24, 4, '#e8dfc6');               // fuselage
    g.p(52, 56, 5, 2, '#e8dfc6');
    g.p(66, 55, 5, 4, '#6b3550');                // accent band
    g.p(59, 53, 6, 2, '#2b3340');                // canopy
    g.p(48, 53, 6, 3, '#c4c8d2');                // the rockets, on the NOSE
    g.p(48, 58, 6, 3, '#c4c8d2');
    g.p(45, 53, 3, 3, a);                        // their flame
    g.p(45, 58, 3, 3, a);
    g.p(44, 54, 2, 1, '#ffffff');
    g.p(44, 59, 2, 1, '#ffffff');
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

  // Tiny 2D: the lit lip of the hill, and the fat bird riding it
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
    // The rider is a fat bird, and at nine pixels tall the only things that say
    // so are the beak and the tail — so those get a pixel each and the body
    // gets everything else.
    const sx = 44, sy = hill(44) - 8;
    g.p(sx - 5, sy + 8, 11, 2, '#dff6ff');              // board
    g.p(sx - 2, sy + 6, 3, 2, '#f5d13f');               // feet
    g.p(sx - 3, sy + 2, 7, 5, '#e0483f');               // the mass
    g.p(sx + 1, sy + 3, 3, 4, '#ffcf9e');               // cream belly, in front
    g.p(sx - 6, sy + 2, 3, 2, '#a8322c');               // tail, out the back
    g.p(sx - 1, sy - 2, 5, 4, '#e0483f');               // head
    g.p(sx + 4, sy - 1, 2, 2, '#f5d13f');               // beak
    g.p(sx + 1, sy - 1, 1, 1, '#f7f3ea');               // eye
    g.p(sx, sy - 4, 2, 2, '#a8322c');                   // tuft
  },

  // Kindling: a small thing keeping a fire, seen from behind it.
  //
  // Two passes were thrown away to get here, and both failed the same way: they
  // put the creature in the middle of the room facing us, which is a picture of a
  // character. This game is not about a character, it is about how much of a room
  // one small light can hold — so the composition is the FIRE, at full brightness,
  // with the creature between us and it, cropped by the bottom of the frame.
  //
  // That crop is what makes it foreground rather than a sprite standing in a
  // scene (the lesson Neon Ronin's gate and Hyper Dagger's jaws both paid for),
  // and being between us and the light is what lets it be dark without being a
  // hole in the picture: it is rimmed in ember down the fire side and in cold
  // window-light down the other, which is the two-colour rim rule.
  //
  // The idiom is the house one. The wall is flat horizontal bars with hard seams
  // (a 2600 changes colour once per scanline, so firelight on plaster is banding,
  // never a gradient) and the light on the floor is four stepped tones fanning
  // out of the hearth — a wedge, because a full-width band reads as furniture.
  hearth(g, a) {
    // THE BONFIRE CAMP. Redrawn for the art pass (2026-08-17): the cabinet used
    // to advertise a cozy interior — a mantel, a stone hearth, a window — and
    // the game has not been that since the pivot. A marquee for a room the game
    // does not have is worse than no marquee, because it is a promise.
    //
    // Staged off the approved scene sheets, same as the game: tree cropped
    // left, ruined arch as the framing device, fire left of centre, the
    // companion cropped by the bottom edge, castle on the horizon.
    //
    // The house rules the other covers were built on all still apply. The sky
    // is flat horizontal bars with hard seams, because a 2600 changes colour
    // once per scanline and a night sky is banding, never a gradient. The arch
    // is LIGHTER than the sky behind it — a framing device darker than its
    // background is an outline floating in the void, which is the mistake this
    // rack has made before. And the companion is cropped by the frame, which is
    // what makes a foreground figure read as foreground rather than as a small
    // thing standing in the middle distance.
    const SKY = ['#0d1730', '#111c39', '#152242', '#1a284c', '#203055', '#26375e'];
    SKY.forEach((c, i) => g.p(0, i * 7, W, 7, c));
    g.p(0, 42, W, 3, '#2a3a5c');

    // the moon, and the one bright thing that is not the fire
    g.disc(105, 11, 6, '#dfe8f2');
    g.disc(103, 9, 2, '#bcc9dc');
    for (let i = 0; i < 9; i++) g.p(70 + ((i * 17) % 56), 3 + ((i * 11) % 26), 1, 1, '#cfe4ea');

    // the castle on its hill: a silhouette with two windows lit, a long way off
    g.p(86, 30, 22, 15, '#22304c');
    g.p(100, 24, 6, 12, '#22304c');
    g.p(105, 24, 1, 12, '#33415f');
    for (let i = 0; i < 4; i++) g.p(88 + i * 4, 28, 2, 2, '#22304c');
    g.p(102, 28, 1, 2, a);
    g.p(91, 35, 1, 2, '#b2481c');

    // the treeline, closing the horizon
    for (let x = 60; x < W + 6; x += 5) {
      const h = 9 + (x % 3) * 4;
      for (let i = 0; i < h; i++) {
        const half = Math.max(1, Math.round((i / h) * h * 0.42));
        g.p(x - half, 45 - h + i, half * 2 + 1, 1, '#0b1220');
      }
    }
    // the ground. Its top edge is RAGGED: a straight line all the way across
    // read as the lip of a shelf with the camp standing on it.
    for (let x = 0; x < W; x++) {
      const y0 = 45 + Math.round(Math.sin(x * 0.21) + Math.sin(x * 0.07) * 1.5);
      g.p(x, y0, 1, H - y0, '#141b18');
    }

    // THE ARCH — the framing device, and the fire is seen through it
    const acx = 52, spring = 30, rOut = 17, rIn = 12;
    for (let y = spring - rOut; y < 52; y++) {
      let out, inn;
      if (y < spring) {
        const dy = spring - y;
        out = Math.sqrt(Math.max(0, rOut * rOut - dy * dy));
        inn = dy <= rIn ? Math.sqrt(Math.max(0, rIn * rIn - dy * dy)) : 0;
        if (out <= 0.5) continue;
      } else { out = rOut; inn = rIn; }
      for (const side of [-1, 1]) {
        for (let d = Math.round(inn); d < Math.round(out); d++) {
          const px = acx + side * d;
          if ((((px * 37) ^ (y * 91)) >>> 3) % 100 > 93) continue;      // a stone gone
          // blocks, 4x3, courses offset — texture is a value step, never a line
          const by = Math.floor(y / 3), bx = Math.floor((px + (by % 2) * 2) / 4);
          const k = (((bx * 7369) ^ (by * 3121)) >>> 0) % 3;
          const joint = ((px + (by % 2) * 2) % 4 === 3) || (y % 3 === 2);
          const ramp = ['#39445a', '#4a5668', '#5c6878'];
          g.p(px, y, 1, 1, joint ? '#2a3346' : ramp[k]);
        }
      }
    }
    for (let ang = -0.95; ang <= 0.95; ang += 0.05) {   // moss on the top only
      const px = Math.round(acx + Math.sin(ang) * (rOut - 1));
      const py = Math.round(spring - Math.cos(ang) * (rOut - 1));
      if (((px * 9176) ^ py) % 3 === 0) continue;
      g.p(px, py, 1, 2, '#3f5936');
    }

    // the big tree, cropped by the top-left corner, with the banner on it
    for (let y = 0; y < H; y++) {
      const wd = 11 + Math.round((y / H) ** 3 * 8);
      for (let x = 0; x < wd; x++) g.p(x, y, 1, 1, ((x * 5) ^ (y >> 3)) % 4 > 1 ? '#33251b' : '#472f1e');
    }
    for (const [cx2, cy2, cr] of [[4, 2, 15], [20, 0, 12], [10, 14, 10]]) g.disc(cx2, cy2, cr, '#16241a');
    g.p(11, 14, 12, 2, '#5a3f26');                      // the beam
    for (let i = 0; i < 18; i++) {
      const tear = i > 13 ? (i - 13) * 2 : 0;
      g.p(15, 16 + i, 8 - tear, 1, i % 6 === 5 ? '#3f1c26' : '#6e2c3a');
    }
    g.p(17, 22, 4, 1, '#c08b3e'); g.p(18, 20, 2, 6, '#c08b3e');   // the sigil

    // the ground light: a wedge out of the fire, four stepped tones, because a
    // full-width band reads as furniture rather than as firelight
    const POOL = ['#6b5330', '#4c3a1f', '#332714', '#20190e'];
    for (let y = 45; y < H; y++) {
      const k = (y - 45) / (H - 45);
      const w2 = Math.round(64 - k * 22), x0 = Math.round(18 - k * 14);
      g.p(x0, y, w2, 1, POOL[Math.min(3, Math.floor(k * 4.4))]);
    }

    // THE FIRE — the brightest thing on the cabinet by a wide margin
    const fx = 46, base = 52;
    for (let i = 0; i < 5; i++) {
      g.disc(fx - 8 + i * 4, base + 2, 3, '#333f50');
      g.p(fx - 9 + i * 4, base - 1, 3, 1, '#6b5330');
    }
    // THREE tongues, not one. A single tapered stack is a shape, and fire is
    // not a shape — it is several arguing. One cone with a smooth taper is the
    // shape a traffic cone has, which is what the first cut of this drew.
    const tongue = (x, h, wide, phase) => {
      for (let i = 0; i < h; i++) {
        const k = i / h;
        const sway = Math.sin(phase + k * 5) * (0.8 + k * 3.4);
        const bw = Math.max(1, Math.round(wide * (1 - k * k * 0.95) * (1 - k * 0.35)));
        const col = k < 0.16 ? '#fff2cf' : k < 0.44 ? '#ffc768' : k < 0.76 ? a : '#b2481c';
        g.p(x - bw / 2 + sway * k, base - 1 - i, bw, 1, col);
      }
    };
    // Narrow and TALL. At 128px across, a 12px-wide flame is fatter than it is
    // hot: the white core sits at the base, so a wide core is a white brick with
    // a taper on it. Flame is a vertical.
    tongue(fx, 25, 8, 0);
    tongue(fx + 4, 15, 5, 2.1);
    tongue(fx - 5, 12, 4, 4.3);
    for (let i = 0; i < 5; i++) g.p(fx + 5 + i * 2, 30 - i * 4, 1, 1, '#ffe6a8');   // sparks

    // EMBER, cropped by the bottom of the frame and turned toward the fire.
    // It is a dark body in a dark picture, so it gets the two-colour rim the
    // rack learned on Neon Ronin: ember down the fire side, cold moonlight down
    // the other. Without both it is a hole where the hero should be.
    const cx = 88, DARK = '#1c2333', MID = '#2f3950';
    const bodyW = y => Math.round(9 + (y - 54) * 0.7);
    for (let y = 54; y < H; y++) {
      const w2 = bodyW(y), in_ = y < 57 ? (57 - y) * 2 : 0;
      g.p(cx - w2 + in_, y, (w2 - in_) * 2, 1, DARK);
    }
    g.disc(cx, 47, 10, DARK);                           // the big head
    for (const side of [-1, 1]) {                       // the horns
      for (let i = 0; i < 14; i++) {
        const k = i / 13;
        const hx = Math.round(cx + side * Math.sin(k * 1.35) * 8);
        const hy = Math.round(38 - k * 11);
        const wd = Math.max(1, Math.round(3 - k * 2.2));
        g.p(hx - (side < 0 ? wd - 1 : 0), hy, wd, 2, k < 0.45 ? '#8f7c5c' : '#c7b189');
      }
    }
    g.p(cx - 12, 53, 24, 3, '#7e2a2a');                 // the scarf
    g.p(cx - 12, 53, 12, 1, '#a8402f');
    for (const dx of [-6, 2]) {                         // the eyes
      g.p(cx + dx, 45, 4, 4, '#e8eef4');
      g.p(cx + dx, 46, 3, 3, '#12141c');
      g.p(cx + dx, 45, 1, 1, '#ffffff');
    }
    for (let y = 37; y < H; y++) {                      // the two rims
      let lit = -1, dark = -1;
      for (let x = 66; x < 116; x++) {
        const dxh = x - cx, dyh = y - 47;
        const ink = (dxh * dxh + dyh * dyh <= 100) || (y >= 54 && Math.abs(x - cx) <= bodyW(y) - (y < 57 ? (57 - y) * 2 : 0));
        if (ink && lit < 0) lit = x;
        if (ink) dark = x;
      }
      if (lit < 0) continue;
      g.p(lit, y, 1, 1, a);
      g.p(lit + 1, y, 1, 1, '#8f5a2e');
      g.p(dark, y, 1, 1, '#4a5f6b');
    }

    // brambles cropping the bottom-right corner, in silhouette
    for (let i = 0; i < 7; i++) {
      const bx = 112 + i * 4, h = 8 + (i % 3) * 6;
      for (let k = 0; k < h; k++) g.p(bx + Math.round(Math.sin(k * 0.5 + i) * 2), H - k, 2, 1, '#05070b');
    }
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

  // Eeri: the worksite as a stage set. The scaffold is the frame and it is a
  // solid mass, not an outline; the machine is cropped at the right edge so
  // it reads as foreground; its bucket hangs over the kid, who is lit —
  // hard hat and vest — against the dug ground. Master System register:
  // flat fills inside a hard black line.
  // Eeri (Godot): the browser cabinet's cover is a wide SITE; this one is the
  // DIORAMA BOX, because what the port added is LIGHT. The browser build
  // renders unlit — three.js MeshBasicMaterial has nothing to light — and
  // bakes its depth haze into the paintings. The port lights the actors for
  // real and lets them throw contact shadows into a painted set, which is
  // ART_BRIEF's 80% reference asking by name for "soft friendly light".
  // A lit figure in a built set is exactly what the other cabinet cannot show.
  diorama(g, a) {
    const INK = '#1a1410', CARD = '#c9a678', CARD_DK = '#9d7c53';
    const WALL = '#e7d9bd', WALL_SH = '#bda88a';

    g.p(0, 0, W, H, '#12161d');                                 // the dark around the box

    // THE BOX: a shallow stage, walls cropped by the frame so it reads as a
    // set you are looking INTO rather than a picture hung flat.
    g.p(6, 4, 116, 56, WALL);                                   // back wall
    g.p(6, 4, 10, 56, WALL_SH);                                 // left wall, in shade
    g.p(112, 4, 10, 56, mix(WALL, '#ffffff', 0.18));            // right wall, lit
    g.p(6, 52, 116, 16, CARD);                                  // the floor boards
    for (let x = 10; x < 122; x += 9) g.p(x, 52, 1, 16, CARD_DK);
    g.p(6, 52, 116, 1, CARD_DK);                                // the floor line

    // THE KEY, from upper-left: a warm wash down the back wall, and the
    // corner it does not reach left cool. One light, stated.
    for (let i = 0; i < 7; i++) {
      g.p(16, 4 + i * 4, 60 - i * 6, 4, mix('#fff0cf', WALL, 0.35 + i * 0.09));
    }
    g.p(96, 4, 16, 34, mix(WALL, '#6f7f96', 0.30));             // the cool corner

    // Set dressing, kept to two pieces so the figure stays the subject.
    g.p(24, 34, 16, 18, mix(a, INK, 0.28));                     // a hoarding panel
    g.p(24, 34, 16, 2, mix(a, '#ffffff', 0.35));                // its lit top edge
    g.p(88, 40, 18, 12, '#8fa0ae');                             // a stack of pipe
    for (let i = 0; i < 3; i++) g.disc(92 + i * 7, 46, 3, '#6f8092');

    // THE SHADOW: long, hard-edged and thrown to the lower-right, away from
    // the key. It is the whole point of the cover, so it is drawn before the
    // figure and given more room than the figure itself.
    g.p(62, 56, 26, 4, mix(CARD, INK, 0.42));
    g.p(60, 54, 12, 3, mix(CARD, INK, 0.34));

    // EERI, small in the box and lit from the left: olive cap with its
    // spikes, navy tee, machine-yellow wellies. Cropped by nothing — he is
    // the subject, and the room is what he is standing in.
    g.p(56, 30, 10, 12, '#2e3a5c');                             // tee
    g.p(56, 30, 4, 12, mix('#2e3a5c', '#ffffff', 0.22));        // lit side
    g.p(58, 42, 3, 6, '#3c4358'); g.p(62, 42, 3, 6, '#3c4358'); // legs
    g.p(57, 48, 5, 3, '#ffb01f'); g.p(61, 48, 5, 3, '#ffb01f'); // wellies
    // The cap must not eat the face. Drawn first cut, its disc covered all
    // but three pixels of the head and he read as a green lump — so the cap
    // sits HIGHER and SMALLER than the skull, which is how a cap actually
    // sits, and leaves a face to put an eye in.
    g.disc(61, 27, 6, '#f0c9a4');                               // head
    g.disc(61, 21, 5, '#8a9a4e');                               // cap crown
    g.p(56, 21, 10, 3, '#8a9a4e');                              // its band
    g.p(65, 22, 6, 2, '#6f7d3f');                               // the peak, forward
    for (let i = 0; i < 3; i++) g.disc(58 + i * 3, 16, 2, '#6f7d3f');  // spikes
    g.p(63, 27, 2, 2, INK);                                     // eye
    g.p(63, 31, 3, 1, mix('#f0c9a4', INK, 0.45));               // the line mouth
  },

  worksite(g, a) {
    const INK = '#1a1410', DK = mix(a, INK, 0.34), STEEL = '#7a8a9a', STEEL2 = '#5f7080';
    const HOR = 50;

    // sky: flat bands, brightest at the horizon
    for (let i = 0; i < 6; i++) g.p(0, i * 9, W, 9, mix('#3f9ee4', '#a9dcf3', i / 5));
    g.disc(102, 13, 6, '#f4faff');
    g.p(16, 11, 15, 3, '#f4faff'); g.p(20, 8, 8, 3, '#f4faff');   // flat clouds
    g.p(60, 21, 12, 3, '#e8f5ff');

    // skyline, pushed toward the sky — the diorama's air
    const far = '#9dc0d6', far2 = '#b0cfe2';
    [[24, 30], [34, 22], [44, 34], [58, 26], [70, 38], [82, 30], [96, 24], [108, 33]]
      .forEach(([x, h], i) => {
        g.p(x, HOR - h, 11, h, i % 2 ? far : far2);
        g.p(x, HOR - h, 4, h, mix(far2, '#ffffff', 0.25));         // lit left face
      });
    g.p(88, 6, 2, 44, far);                                        // tower crane mast
    g.p(64, 6, 44, 2, far);                                        // its jib
    g.p(76, 8, 1, 7, far); g.p(75, 15, 3, 3, far);                 // hoist + hook

    // the ground: dug earth with the green lip that means "you can stand here"
    g.p(0, HOR, W, H - HOR, '#8a6242');
    g.p(0, HOR, W, 2, '#3cc85a');
    g.p(0, 60, W, 12, '#6e4c32');

    // THE FRAME: a scaffold bay, solid, cropped by the left edge
    g.p(0, 0, 7, 62, STEEL2); g.p(13, 0, 6, 62, STEEL2);
    g.p(0, 17, 19, 4, '#a87c52'); g.p(0, 37, 19, 4, '#a87c52');    // planks
    g.p(0, 21, 19, 1, INK); g.p(0, 41, 19, 1, INK);
    for (let y = 6; y < 58; y += 12) { g.p(4, y, 2, 2, INK); g.p(16, y, 2, 2, INK); }
    g.p(19, 24, 10, 3, mix(a, INK, 0.1));                          // a hoarding panel

    // THE MACHINE: cropped at the right edge, bucket swung over the kid
    g.p(74, 56, 54, 12, INK);                                      // tracks
    g.p(76, 58, 50, 8, '#26221c');
    for (let x = 80; x < 124; x += 10) g.disc(x, 62, 3, STEEL);
    g.p(78, 52, 48, 5, STEEL2);                                    // deck
    g.p(82, 36, 46, 17, INK);                                      // house, outlined
    g.p(84, 38, 42, 14, a);
    g.p(84, 38, 42, 4, mix(a, '#ffffff', 0.22));                   // lit top face
    g.p(112, 30, 14, 8, DK);                                       // counterweight
    g.p(90, 28, 3, 8, '#26221c');                                  // exhaust
    for (let x = 88; x < 118; x += 9) g.p(x, 46, 2, 2, INK);       // the bolt motif

    // boom → stick → bucket, sweeping left and down over the kid
    const arm = (x0, y0, x1, y1, w, c) => {
      for (let k = -w; k <= w; k++) g.line(x0, y0 + k, x1, y1 + k, c);
    };
    arm(86, 40, 62, 20, 3, INK); arm(86, 40, 62, 20, 2, a);
    arm(62, 20, 56, 30, 3, INK); arm(62, 20, 56, 30, 2, a);
    // the bucket: open at the top, tapered, teeth down — a bucket has to be
    // a bucket at this size or it reads as a box hanging off a stick
    g.p(50, 30, 13, 2, INK);
    g.p(51, 31, 11, 1, '#26221c');                                 // the open mouth
    g.p(50, 32, 13, 5, INK); g.p(51, 33, 11, 3, STEEL);
    g.p(52, 37, 9, 2, INK); g.p(53, 38, 7, 1, STEEL2);             // taper
    g.p(53, 39, 2, 2, STEEL2); g.p(56, 39, 2, 2, STEEL2); g.p(59, 39, 2, 2, STEEL2);
    g.p(52, 53, 10, 2, mix('#8a6242', INK, 0.3));                  // its shadow, on the dirt

    // THE KID: small, lit, with somewhere to be — hat and vest carry him
    const kx = 32;
    g.p(kx, 44, 4, 6, '#3a4a5c'); g.p(kx + 5, 44, 4, 6, '#3a4a5c'); // legs
    g.p(kx - 1, 48, 5, 2, INK); g.p(kx + 5, 48, 5, 2, INK);         // boots
    g.p(kx - 1, 36, 11, 9, INK);                                    // body outline
    g.p(kx, 37, 9, 7, '#ff7a1a');                                   // hi-vis vest
    g.p(kx, 40, 9, 2, '#f4faff');                                   // its band
    g.p(kx + 1, 30, 7, 7, '#f2c9a0');                               // head
    g.p(kx + 1, 30, 7, 1, INK);
    g.p(kx + 5, 33, 2, 2, INK);                                     // one eye
    g.p(kx + 1, 26, 7, 4, a);                                       // the hard hat
    g.p(kx - 1, 29, 11, 2, DK);                                     // its brim
    g.p(kx + 3, 52, 5, 2, mix('#8a6242', INK, 0.3));                // his shadow
  },
  // ── the flow twins ─────────────────────────────────────────────────────
  // One city drawn twice — Piritori by night, Toko Move by day — so the two
  // cabinets say on the shelf what the code says underneath: same geometry,
  // opposite weather. The diagram is the subject AND the framing device: fat
  // route lines crop at the frame (foreground), stops sit lighter than the
  // paper behind them, and the one thing happening differs per cover.
  padmap(g, a) {
    // the room, not the map: dark, and lit only by the screen
    for (let y = 0; y < H; y++) g.p(0, y, W, 1, mix('#0a0c10', '#05070a', y / H));
    // the glow the tube throws on the wall, FIRST and symmetric — drawn as
    // rings growing outward from the set so it never steps off one corner.
    // The first cut walked the rectangle's origin and left a grey wedge in the
    // top-left that read as a rendering fault rather than light.
    for (let i = 10; i > 0; i--) {
      const t = i / 10;
      g.p(12 - i * 2, 6 - i * 1.6, 104 + i * 4, 50 + i * 3.2, mix('#0a0c10', '#131a24', 1 - t));
    }
    // the set, standing on the floor — a fat bezel with the picture inside it,
    // and it is LIGHTER than the wall so the frame reads as a frame rather
    // than an outline floating in the void
    g.p(12, 6, 104, 50, '#2a2f38');
    g.p(14, 8, 100, 46, '#131820');
    // the SAME Kallio geometry as the pair above, squeezed into the picture
    const M = (x, y) => [16 + x * 0.75, 10 + y * 0.58];
    const fat = (pts, c) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = M(...pts[i]), [bx, by] = M(...pts[i + 1]);
        for (let o = 0; o < 2; o++) g.line(ax, ay + o, bx, by + o, c);
      }
    };
    fat([[18, 4], [18, 30], [52, 64], [88, 64]], '#146a70');
    fat([[4, 66], [46, 66], [96, 16], [124, 16]], '#e2dccd');
    fat([[70, 4], [96, 30]], '#2c5a3a');
    for (const [x, y] of [[18, 30], [46, 66], [124, 16]]) {
      const [cx, cy] = M(x, y); g.disc(cx, cy, 2, '#8c8778'); g.disc(cx, cy, 1, '#0b0e13');
    }
    const [px, py] = M(96, 16);
    g.disc(px, py, 3, '#e2dccd'); g.disc(px, py, 1, '#0b0e13');
    for (let i = 0; i < 14; i++) {
      const t = i / 14 * Math.PI * 2;
      g.p(px + Math.cos(t) * 7 * 1.3, py + Math.sin(t) * 7, 1, 1, '#ff7a1a');
    }
    // scanlines, so the picture is a PICTURE and not a second map
    for (let y = 9; y < 54; y += 3) g.p(14, y, 100, 1, '#0d1219');
    // the pad, cropped by the bottom edge — cropping is what makes it read as
    // foreground rather than a diagram of a controller
    g.p(38, 60, 52, 12, '#1e242c');
    g.p(34, 62, 60, 8, '#1e242c');
    g.disc(48, 65, 4, '#11161d'); g.disc(48, 65, 2, a);
    g.disc(80, 65, 4, '#11161d'); g.disc(80, 65, 2, a);
    // the d-pad, four ticks, and the two face buttons in the accent
    g.p(38, 64, 6, 2, '#3a424d'); g.p(40, 62, 2, 6, '#3a424d');
    g.p(88, 62, 2, 2, '#e2dccd'); g.p(92, 65, 2, 2, '#e2dccd');
  },

  nightmap(g, a) {
    // charcoal paper with the water pulling cold at the bottom-left
    for (let y = 0; y < H; y++) g.p(0, y, W, 1, mix('#12161c', '#0b0e13', y / H));
    for (let y = 56; y < H; y++) g.p(0, y, 40 - (y - 56) * 1.4, 1, '#17242f');
    // corridors nobody has built on: faint dashes
    for (let x = 8; x < W; x += 8) g.p(x, 14, 3, 1, '#1d242e');
    for (let x = 4; x < W; x += 8) g.p(x, 50, 3, 1, '#1d242e');
    // the arterial, bottom-left to top-right, 45° bend — fat, bone white
    const art_ = [[4, 66], [46, 66], [96, 16], [124, 16]];
    const fat = (pts, c) => { for (let i = 0; i < pts.length - 1; i++) for (let o = 0; o < 2; o++) g.line(pts[i][0], pts[i][1] + o, pts[i + 1][0], pts[i + 1][1] + o, c); };
    fat([[18, 4], [18, 30], [52, 64], [88, 64]], '#146a70');    // a cold cross line
    fat(art_, '#e2dccd');
    fat([[70, 4], [96, 30]], '#2c5a3a');                        // a spur
    // stops: discs LIGHTER than the paper, dark cores — bends and ends
    for (const [x, y] of [[18, 30], [46, 66], [70, 4], [124, 16]]) { g.disc(x, y, 3, '#8c8778'); g.disc(x, y, 1, '#0b0e13'); }
    // Piritori itself, where the arterial breaks upward: ringed by a patrol
    const px = 96, py = 16;
    g.disc(px, py, 4, '#e2dccd'); g.disc(px, py, 2, '#0b0e13');
    for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; g.p(px + Math.cos(t) * 9 * 1.3, py + Math.sin(t) * 9, 1, 1, '#ff7a1a'); }
    // the queue: a fan of tiny marks waiting beside the square
    for (let i = 0; i < 7; i++) g.p(px - 16 - (i % 3) * 4, py + 6 + ((i * 5) % 11), 1, 2, '#b9b2a0');
    // one thing happening: the consignment, magenta, halfway up the climb —
    // somewhere to be, and a trail saying which way it is going
    g.p(66, 45, 3, 3, '#F0027F');
    g.p(61, 51, 2, 2, '#7a1a4a'); g.p(57, 55, 1, 1, '#4a1230');
  },
  // Toko Move: the sheet on the table, and a train crossing the water
  metro(g, a) {
    // The table first, and it is DARKER than the paper. The sheet is the
    // framing device, and a frame only reads as one when it is a step away in
    // value from what is behind it — this cover has exactly one step of depth
    // and that is the whole trick.
    for (let y = 0; y < H; y++) g.p(0, y, W, 1, mix('#c9c2b0', '#a89f8d', y / H));

    // the sheet, running off the right and the bottom: cropped, so it sits in
    // FRONT rather than floating in the middle of the table
    const SX = 8, SY = 6;
    g.p(SX - 2, SY - 2, W, H, '#857f6d');
    for (let y = SY; y < H; y++) g.p(SX, y, W - SX, 1, mix('#f7f4eb', '#e7e2d2', (y - SY) / (H - SY)));

    // the river: one flat colour per scanline with a hard edge either side,
    // which is the Atari constraint and also just how a printed map does water
    for (let y = SY; y < H; y++) {
      const t = (y - SY) / (H - SY);
      const cx = (70 + Math.sin(t * 2.4 + 0.5) * 7) | 0;
      g.p(cx, y, 15, 1, '#c3dbe8');
      g.p(cx - 1, y, 1, 1, '#a9cadd');
      g.p(cx + 15, y, 1, 1, '#a9cadd');
    }

    // ONE line carries the cover and a second feeds into it. Neither of them
    // stops in mid-air: the accent runs off both edges and the red runs off the
    // bottom, because a route that simply ends in open paper reads as unfinished
    // art rather than as a terminus.
    const fat = (pts, c, w) => {
      for (let i = 0; i < pts.length - 1; i++) {
        for (let o = -w; o <= w; o++) {
          g.line(pts[i][0], pts[i][1] + o, pts[i + 1][0], pts[i + 1][1] + o, c);
          g.line(pts[i][0] + o, pts[i][1], pts[i + 1][0] + o, pts[i + 1][1], c);
        }
      }
    };
    fat([[26, 74], [26, 58], [40, 44], [52, 44]], '#d8452f', 1);
    fat([[4, 26], [36, 26], [52, 42], [126, 42]], a, 2);

    // the stops, in the game's own alphabet: paper inside a hard dark line, and
    // big enough that a triangle is a triangle rather than a dark smudge. Every
    // one of them sits ON a line — a shape floating beside the track was what
    // made the first cut unreadable.
    const INK = '#1d242b', PAPER = '#fbfaf6';
    const ring = (x, y) => { g.disc(x, y, 6, INK); g.disc(x, y, 3, PAPER); };
    const box = (x, y) => { g.p(x - 6, y - 6, 13, 13, INK); g.p(x - 3, y - 3, 7, 7, PAPER); };
    const tri = (x, y) => {
      for (let r = 0; r <= 11; r++) { const w = 1 + ((r * 1.15) | 0); g.p(x - (w >> 1), y - 6 + r, w, 1, INK); }
      for (let r = 0; r <= 5; r++) { const w = 1 + ((r * 1.15) | 0); g.p(x - (w >> 1), y - 1 + r, w, 1, PAPER); }
    };
    ring(20, 26); tri(52, 43); box(112, 42);

    // one thing happening: the train is out over the water, drawn the way the
    // game draws it — a paper casing, then a THIN dark edge around the line's
    // own colour. A fat dark edge round a pale middle just makes another stop.
    g.p(72, 36, 19, 13, '#f7f4eb');
    g.p(73, 37, 17, 11, INK);
    g.p(74, 38, 15, 9, a);

    // and the reason it is wanted: a queue standing at the interchange
    for (let i = 0; i < 4; i++) {
      const x = 44 + i * 10, y = 60;
      if (i % 2) { g.p(x - 3, y - 3, 7, 7, INK); g.p(x - 1, y - 1, 3, 3, PAPER); }
      else { g.disc(x, y, 3, INK); g.p(x - 1, y - 1, 3, 3, PAPER); }
    }
  },

  // Slay Kallio: a cover, not an icon. A plank bridge at the wrong end of the
  // night, seen along the deck. The framing device is the BRIDGE — lighter
  // than the water and the trees behind it, so it reads as a thing rather
  // than a hole — a bum cropped by the bottom edge in the foreground (cropping
  // is what makes a figure read as near), a rat facing him down the boards,
  // and everything else falling away out of focus.
  bench(g, a) {
    const HZ = 30;
    // an overcast sky, warming down toward the treeline, in flat bars
    for (let i = 0; i < HZ; i++) g.p(0, i, W, 1, mix('#6f7f88', '#b9a48a', (i / HZ) ** 1.3));

    // the far bank: a dark mass of canopy, hazed and low in contrast, with
    // one block of flats behind it
    g.p(74, HZ - 17, 15, 17, '#4a4a52'); g.p(90, HZ - 12, 12, 12, '#43434b');
    for (let i = 0; i < 5; i++) g.p(77 + (i % 3) * 5, HZ - 14 + Math.floor(i / 3) * 5, 2, 2, '#c8a86a');
    for (let x = -4; x < W + 8; x += 11) {
      g.disc(x, HZ - 4 - ((x * 7) % 5), 8 + ((x * 3) % 4), '#2b3a26');
      g.disc(x + 4, HZ - 8 - ((x * 5) % 4), 5, '#3f5230');
    }
    g.p(0, HZ, W, 3, '#41482f');

    // the canal: dark, with the treeline smeared down into it
    g.p(0, HZ + 3, W, 12, '#3a4448');
    for (let i = 0; i < 16; i++) g.p((i * 17) % W, HZ + 4 + (i % 8), 5 + (i % 9), 1, '#33403e');
    for (let i = 0; i < 6; i++) g.p((i * 23) % W, HZ + 6 + (i % 7), 9, 1, '#5f7176');

    // THE BRIDGE. Boards running across, a gap of shadow between each, and the
    // beams and piles carrying the eye down into the water — the structure is
    // underneath, which is the whole reason this is a bridge and not a bench.
    g.p(0, HZ + 15, W, 2, '#6a563e');                       // the far edge
    for (let x = 0; x < W; x += 5) {
      g.p(x, HZ + 17, 4, 13, x % 10 ? '#8a7053' : '#7d6549');
      g.p(x + 4, HZ + 17, 1, 13, '#3a2e20');                // the gap
    }
    g.p(0, HZ + 24, W, 2, '#9c8161');                       // worn strip
    g.p(0, HZ + 30, W, 3, '#4a3c2c');                       // the near edge, in shadow
    for (const x of [16, 62, 106]) {                        // piles into the water
      g.p(x, HZ + 33, 4, 24, '#5a4834'); g.p(x, HZ + 40, 4, 2, '#6a4a32');
    }
    g.p(0, HZ + 33, W, 3, '#463726');                       // the stringer

    // the rat, mid-deck, facing the near figure down the boards
    g.p(78, HZ + 20, 12, 6, '#5a4a3e'); g.disc(90, HZ + 21, 4, '#6a5648');
    g.p(93, HZ + 21, 4, 1, '#c08878'); g.p(70, HZ + 20, 8, 1, '#c08878');
    g.p(80, HZ + 26, 2, 3, '#443830'); g.p(86, HZ + 26, 2, 3, '#443830');
    g.p(88, HZ + 19, 2, 1, '#c04040');

    // the bum, cropped by the bottom of the frame and lit down his front edge:
    // a dark shape on a dark scene disappears, whatever rim you give it
    g.p(20, 22, 18, 50, '#4a4438');                          // the long coat
    g.p(20, 22, 5, 50, '#332f28');                           // its shadow side
    g.p(35, 22, 3, 50, a);                                   // the lit edge
    g.p(22, 44, 16, 3, '#3b3830');                           // a fold
    g.disc(29, 16, 8, '#c89878');                            // head
    g.p(35, 13, 3, 9, mix('#c89878', a, 0.5));
    g.p(33, 16, 3, 2, '#17120e');                            // eye
    g.p(23, 6, 15, 7, '#4a3a2a');                            // hair
    g.p(24, 60, 3, 12, '#2e2a24'); g.p(31, 60, 4, 12, '#332f28');   // legs
    g.p(21, 68, 20, 4, '#8e9198');                           // and a tin base

    // the bottle in his hand, held out over the boards
    g.p(40, 34, 5, 12, '#3d5c40'); g.p(41, 30, 3, 5, '#3d5c40'); g.p(40, 38, 5, 3, a);
    g.p(37, 33, 4, 5, '#c89878');

    // the miniature look this game is built on: focus falling away top and
    // bottom, and the whole frame graded down toward the shadows
    for (let i = 0; i < 12; i++) g.p(0, i, W, 1, `rgba(198,206,206,${(12 - i) * 0.020})`);
    for (let i = 0; i < 12; i++) g.p(0, H - 1 - i, W, 1, `rgba(12,14,16,${(12 - i) * 0.028})`);
    for (let i = 0; i < 5; i++) { g.p(0, i, W, 1, 'rgba(0,0,0,0.10)'); g.p(0, H - 1 - i, W, 1, 'rgba(0,0,0,0.10)'); }
  },

  // TURF: the backlot at dusk. A standoff, not an icon — an operator cropped
  // by the near edge of the frame (rim-lit in the accent, since a dark
  // silhouette against a dark scene disappears), a rival held at the far
  // edge of the lot, sodium-lit windows for depth, and two ruled lines
  // ghosting the tactics grid underfoot.
  backlot(g, a) {
    const HZ = 34;
    for (let i = 0; i < HZ; i++) g.p(0, i, W, 1, mix('#05060a', '#241a12', (i / HZ) ** 2));

    // rain, faint and diagonal
    for (let i = 0; i < 9; i++) { const x = (i * 41) % W; g.line(x, 3 + (i * 7) % 22, x - 3, 13 + (i * 7) % 22, 'rgba(140,160,180,0.16)'); }

    // the block: lit-window silhouettes along the horizon, lighter than the
    // sky behind them or they read as a hole, not a building
    g.p(0, HZ - 14, 22, 14, '#181c24'); g.p(18, HZ - 20, 20, 20, '#1c2028');
    g.p(34, HZ - 10, 16, 10, '#151920'); g.p(70, HZ - 24, 24, 24, '#1c2028');
    g.p(90, HZ - 14, 20, 14, '#181c24'); g.p(108, HZ - 18, 20, 18, '#1c2028');
    for (const [x, y] of [[4, HZ - 10], [9, HZ - 6], [22, HZ - 14], [28, HZ - 8], [76, HZ - 18], [82, HZ - 10], [112, HZ - 12]]) g.p(x, y, 2, 3, '#e8a34a');

    // the lot: wet asphalt, two reflection bands, two grid lines ghosting
    // the board this cover is a marquee for
    g.p(0, HZ, W, H - HZ, '#22262d');
    g.p(0, HZ + 6, W, 2, '#2a2f37'); g.p(0, HZ + 17, W, 2, '#262b32');
    g.line(28, HZ + 3, 6, H, 'rgba(111,168,201,0.22)');
    g.line(74, HZ + 3, 100, H, 'rgba(111,168,201,0.22)');

    // full cover, cropped by the left edge — a dumpster, not a prop shelf
    g.p(-4, H - 22, 26, 22, '#181b21'); g.p(-4, H - 27, 26, 6, '#20242b');

    // the rival: midground, small, warm and backlit by the block behind it
    g.p(83, HZ + 2, 6, 11, '#5a3324'); g.disc(86, HZ - 2, 3, '#7a4530');

    // the operator: foreground, cropped by the bottom of the frame — cropping
    // is what reads as "standing closer to you than the rival is"
    g.p(40, H - 20, 12, 24, '#12141a');
    g.p(41, H - 19, 3, 22, a);
    g.disc(46, H - 23, 5, '#12141a');
    g.disc(45, H - 24, 4, a);
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
