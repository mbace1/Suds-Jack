// Shot 4 · The judge. The poster under its sticker. A gavel is brought in from the right and cocked; on "struck the
// law down" it swings and whacks the sticker clean off the poster, down and away; on "more speech" paper speech bubbles land around the poster — answers,
// not a ban; on "ban" the candidate's voice is back on and the bubbles jump.
SCENES['tv_judge'] = (() => {
  const { box } = RFP, D = TV, ID = 'tv_judge', { clamp, lerp } = U;
  const BUB = [[200, 760, 0], [880, 820, 1], [220, 1420, 1], [860, 1450, 0]];
  return {
    draw(c, lt) {
      const tG = D.at(ID, 'gavel', 1.2), tS = D.at(ID, 'speech', 2.0), tB = D.at(ID, 'ban', 2.4), dur = D.dur(ID);
      const off = clamp((lt - tG - 0.02) / 0.6, 0, 1);
      const talk = lt < tB ? 0.35 : 1, jump = lt > tB ? Math.sin((lt - tB) * 16) * Math.exp(-(lt - tB) * 5) : 0;
      const z = D.punch(lt, [tG, tB], { kick: 0.06 }) * lerp(1.0, 0.94, D.ease.io(lt / dur));
      c.save(); c.translate(540, 1060); c.scale(z, z); c.translate(-540, -1060);
      D.table(c, Math.sin(lt * 0.3) * 6);
      D.poster(c, 540, 1080, lt, talk, { sc: 1.0, rot: 0.03 });
      D.sticker(c, 540, 1000, 1, off, { sc: 0.92, rot: -0.07 });
      BUB.forEach(([x, y, i], j) => D.bubble(c, i, x, y, clamp((lt - tS - j * 0.1) / 0.3, 0, 1), jump));
      D.gavelSwing(c, lt, tG, 630, 985);
      c.restore();
      CW.tag(c, D.ui('tagJudge', 'US FEDERAL COURT · AUG 2025'), lt, dur);
      box(c);
    },
  };
})();
