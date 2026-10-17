// Toko in Japan — style tests for the Japanese personas (scenes/jp_kit.js): woodblock, manga, city pop. 4 s each.
window.FILM_SIZE = [1080, 1920];
window.BPM = 112;
window.PUNCH = 0;
window.SCENE_LIBS = ['scenes/rfa_kit.js', 'scenes/toko_master.js', 'scenes/rfm_kit.js', 'scenes/jp_kit.js'];
window.ERAS = [
  { id: 'jp_kyoto_hanga', dur: 5 },
  { id: 'jp_tokyo_manga', dur: 5.2, transition: { type: 'cut', dur: 0.02 } },
  { id: 'jp_tokyo_citypop', dur: 5, transition: { type: 'cut', dur: 0.02 } },
];
