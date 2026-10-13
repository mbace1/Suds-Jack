// "You Looked At It" — 15 s portrait, Constructivist poster × Helsinki autumn.
// Five shots, hard cuts ON the beat grid: 112 BPM, a beat is 0.5357 s; four shots of
// six beats and an ending of four, so every cut lands on a beat (15.0 s).
const B6 = 6 * 60 / 112, B4 = 4 * 60 / 112;
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js'];
window.ERAS = [
  { id: 'rfa_square', dur: B6 },
  { id: 'rfa_lens', dur: B6, transition: { type: 'cut', dur: 0.02 } },
  { id: 'rfa_receipt', dur: B6, transition: { type: 'cut', dur: 0.02 } },
  { id: 'rfa_queue', dur: B6, transition: { type: 'cut', dur: 0.02 } },
  { id: 'rfa_pocket', dur: B4, transition: { type: 'cut', dur: 0.02 } },
];
