// "Satire Excepted" — Radio Free Helsinki · the Nordics, 37.5 s portrait papercut: six shots of twelve
// beats at 112 BPM, the ending ten, half-second dissolves. Its own look: Copenhagen and cosy — Danish
// red and white, candle amber, pale beech, a copper-green spire.
const B12 = 12 * 60 / 112, B10 = 10 * 60 / 112, XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/sat_kit.js'];
window.ERAS = [
  { id: 'sat_borg', dur: B12 },
  { id: 'sat_copy', dur: B12, transition: XF },
  { id: 'sat_bill', dur: B12, transition: XF },
  { id: 'sat_rail', dur: B12, transition: XF },
  { id: 'sat_scale', dur: B12, transition: XF },
  { id: 'sat_toko', dur: B10, transition: XF },
];
