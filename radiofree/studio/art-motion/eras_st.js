// More styles for the personas (scenes/st_kit.js): sumi-e, JRPG, linocut, risograph, kamishibai. 4 s each.
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/st_kit.js'];
window.ERAS = [
  { id: 'st_sumie', dur: 4 },
  { id: 'st_jrpg', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'st_lino', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'st_riso', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'st_kamishibai', dur: 4, transition: { type: 'cut', dur: 0.02 } },
];
