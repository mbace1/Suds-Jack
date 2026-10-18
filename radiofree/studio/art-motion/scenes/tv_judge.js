// Shot 4 · The judge. The poster under its sticker. On "struck the law down" a gavel comes down from above and
// knocks the sticker clean off the poster; on "more speech" paper speech bubbles land around the poster — answers,
// not a ban; on "ban" the candidate's voice is back on and the bubbles jump.
SCENES['tv_judge'] = (() => {
  const { box } = RFP, D = TV, ID = 'tv_judge', { clamp, lerp } = U;
  const BUB = [[200, 760, 0], [880, 820, 1], [220, 1420, 1], [860, 1450, 0]];
  return {
    draw(c, lt) {
      const tG = D.at(ID, 'gavel', 1.2), tS = D.at(ID, 'speech', 2.0), tB = D.at(ID, 'ban', 2.4), dur = D.dur(ID);
      const hg = lt < tG ? clamp(1 - Math.max(0, lt - (tG - 0.45)) / 0.45, 0, 1) ** 1.6 : Math.min(1, (lt - tG) / 0.5) * 0.9;   // raised, down on the word, away
      const gIn = clamp((lt - (tG - 0.9)) / 0.45, 0, 1), off = clamp((lt - tG) / 0.55, 0, 1);
      const talk = lt < tB ? 0.35 : 1, jump = lt > tB ? Math.sin((lt - tB) * 16) * Math.exp(-(lt - tB) * 5) : 0;
      const z = D.punch(lt, [tG, tB], { kick: 0.045 }) * lerp(1.0, 0.94, D.ease.io(lt / dur));
      c.save(); c.translate(540, 1060); c.scale(z, z); c.translate(-540, -1060);
      D.table(c, Math.sin(lt * 0.3) * 6);
      D.poster(c, 540, 1080, lt, talk, { sc: 1.0, rot: 0.03 });
      D.sticker(c, 540, 1000, 1, off, { sc: 0.92, rot: -0.07 });
      BUB.forEach(([x, y, i], j) => D.bubble(c, i, x, y, clamp((lt - tS - j * 0.1) / 0.3, 0, 1), jump));
      if (gIn > 0 && hg < 0.99 + (lt < tG ? 1 : 0)) D.gavel(c, lerp(1180, 560, D.ease.out(gIn)) + (lt > tG ? (lt - tG) * 500 : 0), lerp(-200, 1000, D.ease.out(gIn)) - (lt > tG ? (lt - tG) * 900 : 0), hg, 0.55);
      c.restore();
      CW.tag(c, D.ui('tagJudge', 'US FEDERAL COURT · AUG 2025'), lt, dur);
      box(c);
    },
  };
})();
