// "The Newsreader Was Fake" — Radio Free Helsinki · Big Tech · film 3, 37.5 s portrait papercut:
// six shots of twelve beats at 112 BPM, the ending ten, half-second dissolves. Its own look: a TV
// news studio on a Finnish winter night (deep teal, studio cyan, crisp white, scam gold).
const B12 = 12 * 60 / 112, B10 = 10 * 60 / 112, XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/nrf_kit.js'];
window.ERAS = [
  { id: 'nrf_feed', dur: B12 },
  { id: 'nrf_studio', dur: B12, transition: XF },
  { id: 'nrf_auction', dur: B12, transition: XF },
  { id: 'nrf_ledger', dur: B12, transition: XF },
  { id: 'nrf_court', dur: B12, transition: XF },
  { id: 'nrf_flat', dur: B10, transition: XF },
];
