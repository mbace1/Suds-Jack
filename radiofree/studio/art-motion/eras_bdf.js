// "The Biodiversity Fund" — 15 s portrait, papercut (house style, one stop darker).
// Five shots, hard cuts ON the beat grid: 112 BPM, four shots of six beats and an ending of four.
const B6 = 6 * 60 / 112, B4 = 4 * 60 / 112;
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/bdf_kit.js'];
window.ERAS = [
  { id: 'bdf_cheque', dur: B6 },
  { id: 'bdf_felling', dur: B6, transition: { type: 'cut', dur: 0.02 } },
  { id: 'bdf_pile', dur: B6, transition: { type: 'cut', dur: 0.02 } },
  { id: 'bdf_stamp', dur: B6, transition: { type: 'cut', dur: 0.02 } },
  { id: 'bdf_seedling', dur: B4, transition: { type: 'cut', dur: 0.02 } },
];
