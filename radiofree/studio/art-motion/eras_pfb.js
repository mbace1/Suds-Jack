// "Paid For By" — Radio Free Helsinki · Coxon #3, papercut, 37.5 s portrait: six shots of twelve
// beats at 112 BPM, the last ten, half-second dissolves. Its own palette: a daytime American
// campaign ad in a living room (cream, navy, flag red, brass; magenta only for the money).
const B12 = 12 * 60 / 112, B10 = 10 * 60 / 112, XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/pfb_kit.js'];
window.ERAS = [
  { id: 'pfb_room', dur: B12 },
  { id: 'pfb_wall', dur: B12, transition: XF },
  { id: 'pfb_topics', dur: B12, transition: XF },
  { id: 'pfb_seven', dur: B12, transition: XF },
  { id: 'pfb_keys', dur: B12, transition: XF },
  { id: 'pfb_dot', dur: B10, transition: XF },
];
