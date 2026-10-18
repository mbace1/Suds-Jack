// Shot 2 · Berlin, 2024. Down on the phone: the paper chancellor talking. On "banned" a red BANNED stamp lands across
// the screen and the jaw stops dead; on "satire" a paper tab is pushed out from under the phone: NOT CLEARLY SATIRE.
SCENES['tv_berlin'] = (() => {
  const { box } = RFP, D = TV, ID = 'tv_berlin', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tB = D.at(ID, 'banned', 1.2), tS = D.at(ID, 'satire', 2.2), dur = D.dur(ID);
      const talk = lt < tB ? 1 : Math.max(0, 1 - (lt - tB) / 0.08);
      const z = D.punch(lt, [tB, tS]) * lerp(1.0, 1.05, D.ease.io(lt / dur));
      c.save(); c.translate(540, 1050); c.scale(z, z); c.translate(-540, -1050);
      D.table(c, Math.sin(lt * 0.3) * 6);
      D.tab(c, 'NOT CLEARLY SATIRE', 560, 1478, clamp((lt - tS) / 0.3, 0, 1), 0.04);
      D.phone(c, 540, 1010, lt, talk, { sc: 1.1, rot: -0.03 });
      D.stamp(c, 'BANNED', D.C.red, 540, 900, lt - tB, { w: 460, sc: 1.05, rot: -0.16 });
      c.restore();
      CW.tag(c, D.ui('tagBerlin', 'BERLIN REGIONAL COURT · 2024'), lt, dur);
      box(c);
    },
  };
})();
