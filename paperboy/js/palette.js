// ── Palette ────────────────────────────────────────────────────────────────
// Same gel/neon ART as toko-drop, but a brand-new WARM-DAWN colour scheme.
// toko-drop = navy + violet + electric blue.  Paper Route = teal dusk + coral
// houses + gold paper + mint deliveries.  Everything reads off this file so the
// scheme can be re-tinted in one place.
export const COL = {
  // World
  sky:          0x0c2420,   // dark teal dusk backdrop / fog
  road:         0x10342b,   // wet teal asphalt
  roadLine:     0x46c08f,   // mint lane markings
  sidewalk:     0x1c4a3c,   // raised mint-grey kerb
  grid:         0x2f6b55,   // faint mint grid

  // Paperboy
  rider:        0xffe7ad,   // warm cream gel body
  riderGlow:    0x3a2a00,   // gold inner emissive
  bike:         0xff7a4a,   // coral frame
  wheel:        0x123028,   // dark rims

  // Houses
  subscriber:   0x55ffcc,   // mint — wants a paper
  subWindow:    0xbfffe9,   // lit windows
  nonSub:       0xff6b5a,   // coral — not a customer
  nonSubWindow: 0x3a1410,   // dark windows
  delivered:    0x9affd6,   // flash on successful delivery
  smash:        0xffd24a,   // flash on window smash

  // Items
  paper:        0xffd24a,   // gold newspaper
  bundle:       0x33ddff,   // cyan paper-bundle pickup

  // Hazards
  car:          0xff3366,   // hot magenta cars
  hydrant:      0xff9e2c,   // amber hydrant
  cone:         0xffc24a,   // gold cone
  dog:          0xc78bff,   // lilac dog

  // FX / HUD
  spark:        0xffffff,
  hudWarm:      0xffb14a,
  hudMint:      0x2bffb0,
  hudDanger:    0xff3366,
};
