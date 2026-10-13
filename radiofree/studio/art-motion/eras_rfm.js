// Higher-level samples: masks (the traced Toko face in carrier colours), dusk, Helsinki.
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js'];
window.ERAS = [
  { id: 'rfm_shout', dur: 4 },
  { id: 'rfm_queue', dur: 4, transition: { type: 'cut', dur: 0.02 } },
  { id: 'rfm_square', dur: 4, transition: { type: 'cut', dur: 0.02 } },
];
