// "Unexpectedly, a Deer" — Toko thinker #1 (papercut), ~37.5 s portrait, the house procedure:
// six shots of twelve beats at 112 BPM, the ending ten, half-second dissolves.
const B12 = 12 * 60 / 112, B10 = 10 * 60 / 112, XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/bdf_kit.js', 'scenes/dr_kit.js'];
window.ERAS = [
  { id: 'dr_flat', dur: B12 },
  { id: 'dr_walk', dur: B12, transition: XF },
  { id: 'dr_phone', dur: B12, transition: XF },
  { id: 'dr_look', dur: B12, transition: XF },
  { id: 'dr_antlers', dur: B12, transition: XF },
  { id: 'dr_card', dur: B10, transition: XF },
];
