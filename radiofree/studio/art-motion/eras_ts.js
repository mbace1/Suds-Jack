// Art tests for approval (2026-10-13): twelve styles, one story, masked figures.
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js'];
window.ERAS = [
  { id: 'ts_hopper', dur: 4 },
  { id: 'ts_lino', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_poster', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_grain', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_ukiyoe', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_deco', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_riso', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_comic', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_glass', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_hours', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_paper', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'ts_munch', dur: 4, transition: { type: 'cut', dur: 0.02 } },
];
