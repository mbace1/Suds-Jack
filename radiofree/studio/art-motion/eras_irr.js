// "Irreversible" — Radio Free Helsinki · Doodle #3, v2, 33.2 s portrait papercut: four shots of twelve
// beats at 112 BPM, the ending fourteen, half-second dissolves. Its own look: Brussels daylight (EU blue,
// star gold, white marble); Doodle's four colours only on what is Doodle's.
const B12 = 12 * 60 / 112, B10 = 10 * 60 / 112, XF = { type: 'crossfade', dur: 0.5 };
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/rfp_kit.js', 'scenes/irr_kit.js'];
window.ERAS = [   // v2 (owner: "great but needs clarity and directness"): open on the cabinet, no scale, a longer ending
  { id: 'irr_cabinet', dur: B12 },
  { id: 'irr_order', dur: B12, transition: XF },
  { id: 'irr_court', dur: B12, transition: XF },
  { id: 'irr_law', dur: B12, transition: XF },
  { id: 'irr_lock', dur: 14 * 60 / 112, transition: XF },
];
