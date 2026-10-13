// "On Hold" — Doodle #2, ~37.5 s portrait, the house procedure (README "The standard
// procedure"): six shots of twelve beats at 112 BPM, the ending ten, half-second dissolves.
const B12 = 12 * 60 / 112, B10 = 10 * 60 / 112, XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/bdf_kit.js', 'scenes/doh_kit.js'];
window.ERAS = [
  { id: 'doh_gate', dur: B12 },
  { id: 'doh_meter', dur: B12, transition: XF },
  { id: 'doh_support', dur: B12, transition: XF },
  { id: 'doh_calendar', dur: B12, transition: XF },
  { id: 'doh_open', dur: B12, transition: XF },
  { id: 'doh_rehang', dur: B10, transition: XF },
];
