// The figure — a rotoscoped man reduced to filled polygons.
// Every animation pose is authored; the run deliberately uses uneven held frames
// instead of a four-key interpolated rig so contacts read like Flashback-era
// cinematic animation rather than a modern procedural jog.

const D = Math.PI / 180;
export const P = (...v) => v;

export const POSE = {
  //           hipN kneeN hipF kneeF  shN  elN  shF  elF lean head  py  px rot
  stand:    P(  -4,   4,    6,   5,    8,  16,   -5,  12,   4,  -2,   0,  0,  0),
  breathe:  P(  -4,   3,    6,   4,    7,  14,   -4,  11,   3,  -1,  -1,  0,  0),
  alert:    P( -10,   6,   12,   8,   14,  30,  -12,  26,   9,  -4,   1,  0,  0),

  step1:    P(  22,   6,  -18,  24,  -16,  22,   18,  20,   6,  -2,   1,  0,  0),
  step2:    P(   6,  20,   -4,  10,   -6,  20,    8,  18,   6,  -2,   2,  0,  0),
  step3:    P( -16,  10,   20,  10,   14,  20,  -14,  18,   5,  -2,   1,  0,  0),

  // Twelve individually authored run silhouettes: contact → compression →
  // passing → flight, then mirrored through the opposite foot. The sampler
  // below holds these exactly; it does not blend the run between keys.
  run1:     P(  42,   2,  -38,  52,  -52,  58,   46,  42,  18,  -5,   0, -1,  0),
  run2:     P(  34,  10,  -30,  60,  -46,  64,   42,  48,  19,  -5,  -2,  0,  0),
  run3:     P(  24,  22,  -20,  68,  -36,  70,   34,  54,  20,  -5,  -4,  1,  0),
  run4:     P(  10,  42,   -6,  40,  -22,  72,   22,  62,  19,  -4,  -5,  2,  0),
  run5:     P(  -8,  58,   14,  18,   -4,  60,    6,  68,  18,  -4,  -4,  2,  0),
  run6:     P( -28,  54,   34,   6,   26,  48,  -28,  62,  18,  -4,  -2,  1,  0),
  run7:     P( -38,  52,   42,   2,   46,  42,  -52,  58,  18,  -5,   0, -1,  0),
  run8:     P( -30,  60,   34,  10,   42,  48,  -46,  64,  19,  -5,  -2,  0,  0),
  run9:     P( -20,  68,   24,  22,   34,  54,  -36,  70,  20,  -5,  -4,  1,  0),
  run10:    P(  -6,  40,   10,  42,   22,  62,  -22,  72,  19,  -4,  -5,  2,  0),
  run11:    P(  14,  18,   -8,  58,    6,  68,   -4,  60,  18,  -4,  -4,  2,  0),
  run12:    P(  34,   6,  -28,  54,  -28,  62,   26,  48,  18,  -4,  -2,  1,  0),
  skid:     P(  30,  14,  -16,  28,  -30,  30,  -34,  26,  -8,   4,   4,  0,  0),

  turnA:    P(   8,  16,   -8,  16,   16,  30,  -14,  26,   2,   6,   3,  0,  0),
  turnB:    P(   2,  26,   -2,  26,   24,  40,  -20,  36,  -2,  10,   6,  0,  0),
  crouch:   P(  56,  86,   48,  92,   26,  62,   18,  58,  26,  -6,  11,  1,  0),
  crouchLo: P(  62,  96,   54, 100,   32,  70,   24,  64,  30,  -8,  13,  1,  0),
  tuck:     P(  96, 108,   92, 112,   72,  96,   68,  92,  52,   0,  10,  0,  0),
  gather:   P(  46,  70,   40,  74,  -30,  34,  -34,  30,  24,  -4,   8,  0,  0),
  launch:   P(  10,  14,   34,  46,   64,  30,   40,  40,  20,  -8,  -3,  0,  0),
  rise:     P(  26,  46,  -14,  30,   58,  46,   14,  50,  16,  -6,  -1,  0,  0),
  apex:     P(  34,  62,   -8,  40,   38,  60,   -6,  54,  10,  -4,   0,  0,  0),
  descend:  P(  20,  30,  -20,  22,  -14,  40,  -28,  34,   6,   0,   0,  0,  0),
  land:     P(  38,  62,   30,  66,   16,  56,   10,  52,  20,  -4,   8,  0,  0),
  sprawl:   P(  70, 100,   58,  94,  -40,  70,  -48,  64,  38,  10,  12,  0,  0),
  hang:     P(  10,  26,   -6,  16,  164,  14,  158,  18,  -4,   4,   0,  0,  0),
  hangSwing:P(  30,  38,   14,  22,  164,  10,  160,  14,  -8,   6,   1,  0,  0),
  pullUp:   P(  46,  66,   30,  50,  150,  62,  146,  58,  12,   2,   4,  1,  0),
  mantle:   P(  76,  92,   40,  70,  100,  84,   96,  80,  34,  -2,   6,  3,  0),
  standUp:  P(  36,  58,   22,  44,   40,  50,   34,  46,  18,  -4,   5,  2,  0),
  draw1:    P(  -6,   6,    8,   6,   30,  76,   -6,  12,   4,  -2,   0,  0,  0),
  draw2:    P(  -8,   8,   10,   8,   62,  52,  -10,  16,   2,  -4,   0,  0,  0),
  aim:      P( -10,   8,   14,   8,   86,   4,  -14,  18,   0,  -6,   0,  0,  0),
  aimLow:   P(  58,  88,   50,  94,   84,   6,   20,  40,  24,  -8,  11,  1,  0),
  recoil:   P( -12,  10,   16,  10,   72,  16,  -16,  20,  -4,  -8,  -1, -1,  0),
  hurt:     P( -16,  16,   22,  20,  -34,  40,  -42,  34, -12,  12,   2, -2,  0),
  deadA:    P(  40,  70,   30,  60,  -60,  40,  -66,  36, -30,  20,   6, -2, 26),
  deadB:    P(  84, 104,   78, 100,  -84,  30,  -88,  26, -70,  30,  14, -4, 78),
};

const RUN12 = [
  [POSE.run1,3],[POSE.run2,2],[POSE.run3,2],[POSE.run4,1],[POSE.run5,2],[POSE.run6,2],
  [POSE.run7,3],[POSE.run8,2],[POSE.run9,2],[POSE.run10,1],[POSE.run11,2],[POSE.run12,2],
];

export function blend(a, b, t) {
  const o = new Array(13);
  for (let i = 0; i < 13; i++) o[i] = a[i] + (b[i] - a[i]) * t;
  return o;
}

function held(clip, f, loop) {
  let total = 0;
  for (const k of clip) total += k[1];
  let t = loop ? ((f % total) + total) % total : Math.min(f, total - 0.001);
  for (let i = 0; i < clip.length; i++) {
    if (t < clip[i][1]) return clip[i][0];
    t -= clip[i][1];
  }
  return clip[clip.length - 1][0];
}

export function sample(clip, f, loop = false) {
  // Hero.run still describes the old four-key clip for compatibility with old
  // builds. Detect it and route to the new authored cycle. No interpolation:
  // the visible holds are part of the animation.
  if (loop && clip.length === 4 && clip[0][0] === POSE.run1 && clip[1][0] === POSE.run2 && clip[2][0] === POSE.run3 && clip[3][0] === POSE.run4) {
    return held(RUN12, f, true);
  }
  let total = 0;
  for (const k of clip) total += k[1];
  if (total <= 0) return clip[0][0];
  let t = loop ? ((f % total) + total) % total : Math.min(f, total - 0.001);
  for (let i = 0; i < clip.length; i++) {
    const [pose, hold] = clip[i];
    if (t < hold) {
      const next = clip[i + 1] ? clip[i + 1][0] : (loop ? clip[0][0] : pose);
      return blend(pose, next, hold ? t / hold : 0);
    }
    t -= hold;
  }
  return clip[clip.length - 1][0];
}

const THIGH = 8, SHIN = 8, SPINE = 10, UPPER = 7.5, FORE = 7, HIP_Y = -16;

export function drawFigure(scr, x, y, face, pose, col, opt = {}) {
  const [hipN, kneeN, hipF, kneeF, shN, elN, shF, elF, lean, head, py, px, rot] = pose;
  const s = opt.scale ?? 1;
  const pel = { x: x + face * px * s, y: y + (HIP_Y + py) * s };
  const rr = rot * D * face;
  const cs = Math.cos(rr), sn = Math.sin(rr);
  const R = p => rot ? { x: pel.x + (p.x - pel.x) * cs - (p.y - pel.y) * sn, y: pel.y + (p.x - pel.x) * sn + (p.y - pel.y) * cs } : p;
  const down = (from, a, len) => ({ x: from.x + Math.sin(a * D) * face * len * s, y: from.y + Math.cos(a * D) * len * s });
  const up = (from, a, len) => ({ x: from.x + Math.sin(a * D) * face * len * s, y: from.y - Math.cos(a * D) * len * s });
  const leg = (hip, knee) => { const k = down(pel, hip + lean * 0.15, THIGH); const a = down(k, hip + knee, SHIN); return [R(k), R(a)]; };
  const [kneeNp, ankNp] = leg(hipN, kneeN), [kneeFp, ankFp] = leg(hipF, kneeF);
  const sho = R(up(pel, lean, SPINE));
  const shoRaw = up(pel, lean, SPINE);
  const arm = (sh, el) => { const e = down(shoRaw, sh + lean * 0.2, UPPER); const h = down(e, sh + el, FORE); return [R(e), R(h)]; };
  const [elbNp, handNp] = arm(shN, elN), [elbFp, handFp] = arm(shF, elF);
  const neck = R(up(shoRaw, lean, 2)), hd = R(up(shoRaw, lean + head, 5.6)), pelR = R(pel);
  const W = w => w * s;
  const foot = (ank, knee) => {
    const dx = ank.x - knee.x, dy = ank.y - knee.y, L = Math.hypot(dx, dy) || 1;
    const fx = face * 0.82 + (dx / L) * 0.3, fy = Math.max(-0.35, (dy / L) * 0.25), n = Math.hypot(fx, fy) || 1;
    return [ank.x-fx/n*W(1.6),ank.y-fy/n*W(1.6)-W(1.4), ank.x+fx/n*W(5.4),ank.y+fy/n*W(5.4)-W(.6), ank.x+fx/n*W(5),ank.y+fy/n*W(5)+W(1.5), ank.x-fx/n*W(2),ank.y-fy/n*W(2)+W(1.5)];
  };
  scr.limb(shoRaw.x,shoRaw.y,elbFp.x,elbFp.y,W(2.2),W(1.9),col.far);
  scr.limb(elbFp.x,elbFp.y,handFp.x,handFp.y,W(1.9),W(1.5),col.far); scr.disc(handFp.x,handFp.y,W(1.6),col.far);
  scr.limb(pelR.x,pelR.y,kneeFp.x,kneeFp.y,W(3),W(2.4),col.far); scr.limb(kneeFp.x,kneeFp.y,ankFp.x,ankFp.y,W(2.3),W(1.7),col.far); scr.poly(foot(ankFp,kneeFp),col.far);
  const perp=(a,w)=>({x:Math.cos(a*D)*face*w*s,y:-Math.sin(a*D)*w*s}), ph=perp(lean,3.2), ps=perp(lean,3.8);
  scr.poly([pelR.x-ph.x,pelR.y-ph.y,pelR.x+ph.x,pelR.y+ph.y,sho.x+ps.x,sho.y+ps.y,sho.x-ps.x,sho.y-ps.y],col.body);
  scr.limb(pelR.x,pelR.y,sho.x,sho.y,W(3.4),W(4),col.body); scr.limb(sho.x,sho.y,neck.x,neck.y,W(1.8),W(1.6),col.skin);
  const hx=face, ang=(lean+head)*D*face, hc=Math.cos(ang), hs=Math.sin(ang);
  const hp=(fx,fy)=>[hd.x+(fx*hx*hc-fy*hs)*s,hd.y+(fx*hx*hs+fy*hc)*s];
  scr.poly([...hp(-3.2,-3.6),...hp(2,-3.8),...hp(3.6,-1),...hp(3.5,1.6),...hp(1.8,3.7),...hp(-2.4,3.6),...hp(-3.6,1)],col.skin);
  scr.poly([...hp(-3.6,-3.4),...hp(2.2,-4),...hp(3.2,-2),...hp(1,-2.4),...hp(-2,-.8),...hp(-3.9,2.2)],col.hair);
  if(col.eye!=null&&s>=1) scr.rect(hp(1.4,-.6)[0]-.5,hp(1.4,-.6)[1]-.5,1.6,1.4,col.eye);
  scr.limb(pelR.x,pelR.y,kneeNp.x,kneeNp.y,W(3.1),W(2.5),col.legs); scr.limb(kneeNp.x,kneeNp.y,ankNp.x,ankNp.y,W(2.4),W(1.8),col.legs); scr.poly(foot(ankNp,kneeNp),col.legs);
  scr.limb(shoRaw.x,shoRaw.y,elbNp.x,elbNp.y,W(2.3),W(2),col.arms); scr.limb(elbNp.x,elbNp.y,handNp.x,handNp.y,W(2),W(1.6),col.skin); scr.disc(handNp.x,handNp.y,W(1.7),col.skin);
  if(opt.gun){const dx=handNp.x-elbNp.x,dy=handNp.y-elbNp.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,nx=-uy,ny=ux;const g=(a,b)=>[handNp.x+ux*a*s+nx*b*s,handNp.y+uy*a*s+ny*b*s];scr.poly([...g(-1,-1.6),...g(6.5,-1.4),...g(6.5,.2),...g(-1,.8)],col.gun??col.hair);scr.poly([...g(.4,.6),...g(2.4,.6),...g(1.8,3.4),...g(-.2,3.2)],col.gun??col.hair);}
  return { head: hd, hand: handNp, pelvis: pelR, shoulder: sho };
}
