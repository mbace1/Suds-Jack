// "A Handful of People" — Coxon #1, ~37.5 s portrait, the house procedure: six shots of twelve
// beats at 112 BPM, the ending ten, half-second dissolves.
const B12 = 12 * 60 / 112, B10 = 10 * 60 / 112, XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/bdf_kit.js', 'scenes/hp_kit.js'];
window.ERAS = [
  { id: 'hp_post', dur: B12 },
  { id: 'hp_desk', dur: B12, transition: XF },
  { id: 'hp_hands', dur: B12, transition: XF },
  { id: 'hp_capitol', dur: B12, transition: XF },
  { id: 'hp_speaker', dur: B12, transition: XF },
  { id: 'hp_ballot', dur: B10, transition: XF },
];
