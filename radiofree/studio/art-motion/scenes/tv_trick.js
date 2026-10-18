// Shot 1 · The question. Looking straight down on a satirist's cutting mat: a phone lying on it, a paper chancellor
// on its screen whose jaw is a separate cut-out piece, dropped open by a strip of AI voice — the trick. On "in a
// leader's mouth?" the camera pulls back: the same trick is laid out twice, the phone (Berlin) and a campaign poster
// (California). On "two answers" a question-mark tag drops beside each.
SCENES['tv_trick'] = (() => {
  const { box } = RFP, D = TV, ID = 'tv_trick', { clamp, lerp } = U, PH = [300, 1040], PO = [790, 1060];
  return {
    draw(c, lt) {
      const tS = D.at(ID, 'strip', 0.4), tP = D.at(ID, 'pull', 1.6), tT = D.at(ID, 'two', 2.4), dur = D.dur(ID);
      const talk = clamp((lt - tS) / 0.3, 0, 1), kp = D.ease.io(clamp((lt - tP) / 0.9, 0, 1));
      const z = lerp(1.75, 1, kp) * D.punch(lt, [tT], { open: 0 }) * lerp(1, 1.03, D.ease.io(lt / dur)), fx = lerp(PH[0], 545, kp), fy = lerp(PH[1] - 40, 1060, kp);
      c.save(); c.translate(540, 1060); c.scale(z, z); c.translate(-fx, -fy);
      D.table(c, Math.sin(lt * 0.3) * 6);
      D.phone(c, PH[0], PH[1], lt, talk, { sc: 0.82, rot: -0.06 });
      D.poster(c, PO[0], PO[1], lt, talk * clamp((lt - tP) / 0.4, 0, 1), { sc: 0.78, rot: 0.05 });
      D.qtag(c, PH[0] - 30, PH[1] - 440, clamp((lt - tT) / 0.22, 0, 1), -0.12);
      D.qtag(c, PO[0] + 20, PO[1] - 440, clamp((lt - tT - 0.12) / 0.22, 0, 1), 0.14);
      c.restore();
      box(c);
    },
  };
})();
