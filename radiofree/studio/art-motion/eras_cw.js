// "Committee of the Whole" — Coxon #2, ~37.5 s portrait, the house procedure: six shots of
// twelve beats at 112 BPM, the ending ten, half-second dissolves.
const B12 = 12 * 60 / 112, B10 = 10 * 60 / 112, XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/bdf_kit.js', 'scenes/cw_kit.js'];
window.ERAS = [
  { id: 'cw_hall', dur: B12 },
  { id: 'cw_letters', dur: B12, transition: XF },
  { id: 'cw_mic', dur: B12, transition: XF },
  { id: 'cw_odds', dur: B12, transition: XF },
  { id: 'cw_gavel', dur: B12, transition: XF },
  { id: 'cw_chair', dur: B10, transition: XF },
];
