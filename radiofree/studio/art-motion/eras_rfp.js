// "You Looked At It" — the papercut cut (owner approved test 11, 2026-10-13).
// 15 s portrait, five shots, hard cuts ON the beat grid: 112 BPM, a beat is 0.5357 s;
// four shots of six beats and an ending of four (15.0 s).
const B6 = 6 * 60 / 112, B4 = 4 * 60 / 112;
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js'];
window.ERAS = [
  { id: 'rfp_square', dur: B6 },
  { id: 'rfp_lens', dur: B6, transition: { type: 'cut', dur: 0.02 } },
  { id: 'rfp_receipt', dur: B6, transition: { type: 'cut', dur: 0.02 } },
  { id: 'rfp_queue', dur: B6, transition: { type: 'cut', dur: 0.02 } },
  { id: 'rfp_pocket', dur: B4, transition: { type: 'cut', dur: 0.02 } },
];
