// Radio Free Helsinki — reusable broadcast-direction overlays.
// Tiny fixed-grid interventions: human foreground life and transmission cuts.

import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';

const W = 128, H = 152;

// Six genuinely distinct contacts/passing poses. The old cycle repeated the
// extreme poses and only moved arms vertically; this one changes stride width,
// knee position, foot contact and opposing arm swing on every frame.
const WALK = [
  { bob:0, hip:0, armF:-2, armB: 2, handF:-1, handB: 1, kneeF:-2, kneeB: 1, footF:-2, footB: 2 },
  { bob:1, hip:0, armF:-1, armB: 1, handF:-1, handB: 1, kneeF:-1, kneeB: 0, footF:-1, footB: 1 },
  { bob:1, hip:1, armF: 0, armB: 0, handF: 0, handB: 0, kneeF: 0, kneeB:-1, footF: 0, footB:-1 },
  { bob:0, hip:0, armF: 2, armB:-2, handF: 1, handB:-1, kneeF: 1, kneeB:-2, footF: 2, footB:-2 },
  { bob:1, hip:0, armF: 1, armB:-1, handF: 1, handB:-1, kneeF: 0, kneeB:-1, footF: 1, footB:-1 },
  { bob:1, hip:-1,armF: 0, armB: 0, handF: 0, handB: 0, kneeF:-1, kneeB: 0, footF:-1, footB: 0 },
];

export function drawWalker(scr, x, y, phase, d, scale = 1, facing = 1, alpha = .94) {
  const c = shade(mix('#071015', '#211508', d), alpha);
  const f = WALK[((phase % WALK.length) + WALK.length) % WALK.length];
  const dir = facing >= 0 ? 1 : -1;
  const yy = y + f.bob * scale;
  const cx = x + f.hip * dir * scale;

  // Head / neck / torso: stable silhouette with one-pixel body lean.
  scr.px(cx + scale, yy, 2 * scale, 3 * scale, c);
  scr.px(cx + scale, yy + 3 * scale, 2 * scale, scale, c);
  scr.px(cx, yy + 4 * scale, 4 * scale, 5 * scale, c);

  // Front/back arms swing horizontally as well as vertically. Direction mirrors
  // the pose instead of swapping anatomy, so left- and right-moving people read alike.
  const frontSide = dir > 0 ? 3 : 0;
  const backSide = dir > 0 ? 0 : 3;
  const armFx = cx + (frontSide + f.armF * dir) * scale;
  const armBx = cx + (backSide + f.armB * dir) * scale;
  scr.px(armFx, yy + 4 * scale, scale, 3 * scale, c);
  scr.px(armFx + f.handF * dir * scale, yy + 7 * scale, scale, 2 * scale, c);
  scr.px(armBx, yy + 4 * scale, scale, 3 * scale, c);
  scr.px(armBx + f.handB * dir * scale, yy + 7 * scale, scale, 2 * scale, c);

  // Legs use separate knee and foot offsets, giving six readable gait phases.
  const hipF = cx + (dir > 0 ? 2 : 1) * scale;
  const hipB = cx + (dir > 0 ? 1 : 2) * scale;
  const kneeFx = hipF + f.kneeF * dir * scale;
  const kneeBx = hipB + f.kneeB * dir * scale;
  scr.line(hipF, yy + 9 * scale, kneeFx, yy + 12 * scale, c);
  scr.line(hipB, yy + 9 * scale, kneeBx, yy + 12 * scale, c);
  const footFx = kneeFx + f.footF * dir * scale;
  const footBx = kneeBx + f.footB * dir * scale;
  scr.line(kneeFx, yy + 12 * scale, footFx, yy + 14 * scale, c);
  scr.line(kneeBx, yy + 12 * scale, footBx, yy + 14 * scale, c);
  scr.px(footFx + (dir < 0 ? -scale : 0), yy + 14 * scale, 2 * scale, scale, c);
  scr.px(footBx + (dir < 0 ? -scale : 0), yy + 14 * scale, 2 * scale, scale, c);
}

export function drawPassersby(scr, t, d, laneY = 113) {
  const phase1 = Math.floor(t * 7);
  const x1 = Math.floor(W + 18 - ((t * 7) % (W + 42)));
  drawWalker(scr, x1, laneY, phase1, d, 1, -1);

  if ((Math.floor(t / 8) & 1) === 0) {
    const phase2 = Math.floor(t * 6 + 2);
    const x2 = Math.floor(-24 + ((t * 4.5) % (W + 55)));
    drawWalker(scr, x2, laneY + 6, phase2, d, 1, 1, .88);
  }
}

export function drawDecodeAnalysis(scr, t, decode) {
  if (decode < 0.08) return;
  const c = mix(PAL.AMBER_DIM, PAL.AMBER_HOT, decode);
  const a = 0.22 + decode * 0.55;
  const scan = Math.floor((t * 19) % H);
  scr.px(0, scan, W, 1, shade(c, a * 0.45));
  const x = 12 + Math.floor((t * 7) % 67);
  const y = 24 + Math.floor((t * 3) % 43);
  const bw = 26, bh = 20, k = 5;
  scr.px(x, y, k, 1, shade(c, a)); scr.px(x, y, 1, k, shade(c, a));
  scr.px(x + bw - k, y, k, 1, shade(c, a)); scr.px(x + bw - 1, y, 1, k, shade(c, a));
  scr.px(x, y + bh - 1, k, 1, shade(c, a)); scr.px(x, y + bh - k, 1, k, shade(c, a));
  scr.px(x + bw - k, y + bh - 1, k, 1, shade(c, a)); scr.px(x + bw - 1, y + bh - k, 1, k, shade(c, a));
}

export function drawTransmissionCut(scr, t) {
  const p = t % 5;
  if (p > 0.18) return;
  const y = 18 + Math.floor((p / 0.18) * 105);
  scr.px(0, y, W, 2, shade(PAL.GREEN_DIM, 0.42));
  scr.px(9, y + 3, W - 22, 1, shade(PAL.INK, 0.34));
}

export function drawBroadcastFX(scr, t, decode = 0) {
  drawTransmissionCut(scr, t);
  drawDecodeAnalysis(scr, t, decode);
}
