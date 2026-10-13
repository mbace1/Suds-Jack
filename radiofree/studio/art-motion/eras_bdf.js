// "The Biodiversity Fund" — v5, ~37 s portrait (owner, 2026-10-13: "still too fast transitions ...
// hard to read"). Each shot now runs ten beats: the action plays out in its first three seconds as
// before, then the picture HOLDS so the captions can be read; shots dissolve into each other over
// half a second instead of cutting. 112 BPM, five shots of ten beats and an ending of eight.
const B10 = 12 * 60 / 112, B8 = 10 * 60 / 112,   // v5 (owner: "give more time to read"): twelve beats a shot, the ending ten
      XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/bdf_kit.js'];
window.ERAS = [
  { id: 'bdf_council', dur: B10 },
  { id: 'bdf_cheque', dur: B10, transition: XF },
  { id: 'bdf_felling', dur: B10, transition: XF },
  { id: 'bdf_pile', dur: B10, transition: XF },
  { id: 'bdf_stamp', dur: B10, transition: XF },
  { id: 'bdf_protest', dur: B8, transition: XF },
];
