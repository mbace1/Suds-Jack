// ── Palette ────────────────────────────────────────────────────────────────
// Paperboy-style art direction: bright sunny suburban morning, flat opaque
// surfaces, isometric read. Distinct "dawn" tint rather than a 1:1 arcade copy.
// Everything reads off this file so the scheme re-tints in one place.
export const COL = {
  // World
  sky:          0x9bd7ff,   // bright morning sky (scene background)
  haze:         0xc8e9ff,   // far distance haze
  road:         0x9aa0a8,   // grey asphalt
  roadLine:     0xfff0a8,   // warm yellow lane markings
  sidewalk:     0xe8e3d4,   // pale concrete kerb
  lawn:         0x7cc24a,   // suburban grass

  // Paperboy + BMX
  rider:        0xff5a3c,   // red jersey
  skin:         0xffcf9e,   // face/hands
  helmet:       0xffe14a,   // yellow cap/helmet
  bike:         0x2b6cff,   // blue BMX frame
  wheel:        0x2a2a2a,   // tyres

  // Houses
  subscriber:   0x37c8e0,   // cyan — wants a paper
  subRoof:      0x1f7e95,
  subWindow:    0xfff7d6,   // lit windows
  nonSub:       0xe5533a,   // terracotta — not a customer
  nonSubRoof:   0x9c3527,
  nonSubWindow: 0x35506a,   // dark windows
  delivered:    0x7cffb0,   // flash on successful delivery
  smash:        0xfff2a0,   // flash on window smash

  // Items
  paper:        0xf4f1e8,   // newsprint
  paperBand:    0x2b6cff,   // blue wrap
  bundle:       0x3a7bd5,   // stacked paper bundle pickup

  // Hazards
  car:          0x3b6fe2,   // a passing car
  hydrant:      0xe03a2a,   // red hydrant
  cone:         0xff8a1e,   // orange cone
  dog:          0x9a6b3f,   // brown dog

  // FX / HUD
  spark:        0xffffff,
  hudInk:       0x14324a,   // dark HUD ink (reads on the bright sky)
  hudGood:      0x108a52,
  hudDanger:    0xc7321f,
};
