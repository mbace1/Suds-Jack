// "On the Same Voluntary Terms" (film 2, Coxon series #4, papercut, 37.5 s portrait): the UK's AI Security Institute
// tests new AI before release only when invited; a White House request to two US labs held new models back from it for
// 17 days, and access came back on the same voluntary terms. Six shots of twelve beats at 112 BPM, the last ten,
// half-second dissolves. Its own look: a London morning (scenes/vt_kit.js).
const B12 = 12 * 60 / 112, B10 = 10 * 60 / 112, XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/vt_kit.js'];
window.ERAS = [
  { id: 'vt_street', dur: B12 },
  { id: 'vt_invite', dur: B12, transition: XF },
  { id: 'vt_call', dur: B12, transition: XF },
  { id: 'vt_hold', dur: B12, transition: XF },
  { id: 'vt_back', dur: B12, transition: XF },
  { id: 'vt_shut', dur: B10, transition: XF },
];
