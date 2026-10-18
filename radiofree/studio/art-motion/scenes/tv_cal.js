// Shot 3 · California, 2024. Down on the campaign poster: a paper candidate with a loudspeaker cone for a mouth, the
// AI voice pulsing out of it. On "voice" the voice swells; on "label" a yellow LABEL REQUIRED sticker slaps on, as
// big as the poster's biggest word, right over the joke.
SCENES['tv_cal'] = (() => {
  const { box } = RFP, D = TV, ID = 'tv_cal', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tV = D.at(ID, 'voice', 1.8), tL = D.at(ID, 'label', 2.4), dur = D.dur(ID);
      const talk = clamp(lt / 0.3, 0, 1) * (1 + 0.3 * Math.exp(-Math.max(0, lt - tV) * 3) * (lt > tV ? 1 : 0)) * (lt < tL ? 1 : 0.35);
      const z = D.punch(lt, [tL], { kick: 0.045 }) * lerp(1.0, 1.05, D.ease.io(lt / dur));
      c.save(); c.translate(540, 1060); c.scale(z, z); c.translate(-540, -1060);
      D.table(c, Math.sin(lt * 0.3) * 6);
      D.poster(c, 540, 1080, lt, Math.min(1, talk), { sc: 1.1, rot: 0.03 });
      D.sticker(c, 540, 1000, clamp((lt - tL + 0.12) / 0.22, 0, 1), 0, { rot: -0.07 });
      c.restore();
      CW.tag(c, D.ui('tagCalifornia', 'CALIFORNIA · 2024'), lt, dur);
      box(c);
    },
  };
})();
