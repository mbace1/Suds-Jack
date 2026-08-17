// Kindling — the small thing that lives by the fire.
//
// It is drawn, never sprited: five growth stages out of one set of numbers, so
// growing is a change to `r` and a couple of flags rather than five sheets of
// art that can drift apart.
//
// v9 adds the lineage layer directly to the renderer. Horns, ears, ember colour,
// markings, temperament and combat tendency now change the actual creature by
// the bonfire rather than existing only as roster metadata.

import { PAL, mix } from './palette.js?v=5';

const BUILD = {
  spark:  { r: 4, ears: false, tail: false, moss: false },
  wisp:   { r: 5, ears: true,  tail: false, moss: false },
  tender: { r: 6, ears: true,  tail: true,  moss: false },
  keeper: { r: 6, ears: true,  tail: true,  moss: false, lamp: true },
  elder:  { r: 7, ears: true,  tail: true,  moss: true,  lamp: true },
};

const EMBER = {
  orange: PAL.EMBER,
  green: '#91c96b',
  blue: '#78bfe4',
  white: '#e6e7df',
};

function activeVisual() {
  try { return globalThis.__bettermentBreeding?.active?.() || null; }
  catch { return null; }
}

function crescent(scr, cx, cy, r, dir, inner, rim) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    if (dx < 1) continue;
    const edge = cx + dir * dx;
    scr.px(edge, cy + dy, 1, 1, rim);
    scr.px(edge - dir, cy + dy, 1, 1, inner);
  }
}

function drawEars(scr, hx, hy, r, style, fur, furLit) {
  for (const side of [-1, 1]) {
    const ex = hx + side * (r - 1);
    const c = side < 0 ? furLit : fur;
    if (style === 'leaf') {
      scr.px(ex - 1, hy - r - 3, 2, 4, c);
      scr.px(ex + side, hy - r - 2, 2, 2, c);
      scr.px(ex - 1, hy - r - 4, 1, 1, PAL.INK);
    } else if (style === 'point') {
      scr.px(ex - 1, hy - r - 4, 2, 4, c);
      scr.px(ex, hy - r - 5, 1, 1, PAL.INK);
    } else if (style === 'droop') {
      scr.px(ex - 1, hy - r - 1, 3, 2, c);
      scr.px(ex + side, hy - r, 2, 2, c);
      scr.px(ex + side * 2, hy - r + 1, 1, 1, PAL.INK);
    } else {
      scr.px(ex - 1, hy - r - 2, 2, 3, c);
      scr.px(ex - 1, hy - r - 3, 2, 1, PAL.INK);
    }
  }
}

function drawHorns(scr, hx, hy, r, style, accent) {
  if (!style || style === 'none') return;
  const baseY = hy - r - 2;
  for (const side of [-1, 1]) {
    const x = hx + side * Math.max(2, r - 2);
    if (style === 'branch') {
      scr.px(x, baseY - 3, 1, 4, accent);
      scr.px(x, baseY - 3, side, 1, accent);
      scr.px(x + side, baseY - 4, 1, 2, PAL.INK);
    } else if (style === 'curl') {
      scr.px(x, baseY - 2, 1, 3, accent);
      scr.px(x + side, baseY - 3, 2, 1, accent);
      scr.px(x + side * 2, baseY - 2, 1, 2, PAL.INK);
    } else {
      scr.px(x, baseY - 2, 1, 3, accent);
      scr.px(x, baseY - 3, 1, 1, PAL.INK);
    }
  }
}

function drawMarking(scr, bx, by, bodyR, marking, fur, accent, t) {
  const dark = mix(PAL.INK, fur, 0.4);
  if (marking === 'moss') {
    scr.px(bx + 1, by - bodyR + 2, 4, 2, PAL.MOSS);
    scr.px(bx + 3, by - bodyR + 1, 2, 1, mix(PAL.MOSS, accent, 0.25));
  } else if (marking === 'stripe') {
    for (let i = -2; i <= 2; i += 2) scr.px(bx + i, by - 2, 1, bodyR + 1, dark);
  } else if (marking === 'speckle') {
    const dots = [[-3,-2],[2,-4],[4,1],[-2,3]];
    for (let i = 0; i < dots.length; i++) {
      const [dx, dy] = dots[i];
      scr.px(bx + dx, by + dy, 1, 1, i % 2 ? accent : dark);
    }
  } else {
    scr.px(bx + 2, by - bodyR + 3, 2, 1, dark);
    if (Math.sin(t * 0.7) > 0.2) scr.px(bx + 3, by - bodyR + 4, 1, 1, dark);
  }
}

function stageForVisual(fallback, visual) {
  return visual?.visualStage && BUILD[visual.visualStage] ? visual.visualStage : fallback;
}

// pose: 'sit' | 'doze' | 'hop' | 'walk' | 'peer' | 'stretch' | 'perk'
export function drawPet(scr, x, floorY, opts = {}) {
  const visual = opts.visual || activeVisual();
  const traits = visual?.traits || {};
  const temperament = visual?.temperament || 'curious';
  const combatStyle = visual?.combatStyle || 'quick striker';
  const stage = stageForVisual(opts.stage || 'spark', visual);
  const {
    t = 0, pose = 'sit', hop = 0, lit = 1, still = false,
    face = -1, look = 0,
  } = opts;
  const b = BUILD[stage] ?? BUILD.spark;
  const r = b.r;
  const accent = EMBER[traits.ember] || PAL.EMBER;

  let furBase = PAL.FUR;
  if (traits.ember === 'green') furBase = mix(PAL.FUR, PAL.MOSS, 0.35);
  if (traits.ember === 'blue') furBase = mix(PAL.FUR_DARK, PAL.GLASS, 0.34);
  if (traits.ember === 'white') furBase = mix(PAL.FUR, PAL.BONE, 0.48);

  const fur = mix(PAL.FUR_DARK, furBase, 0.35 + lit * 0.65);
  const furLit = mix(fur, PAL.FUR_LIT, 0.25 + lit * 0.75);
  const rim = mix(PAL.COAL_HOT, accent, lit);
  const belly = mix(PAL.FUR_DARK, PAL.BELLY, 0.3 + lit * 0.7);

  const walking = pose === 'walk';
  const breathe = still ? 0
    : walking ? Math.abs(Math.sin(t * 9)) * 1.6
      : Math.sin(t * (pose === 'doze' ? 1.1 : 2.0)) * 0.5;
  const lift = pose === 'hop' ? hop : 0;
  const squash = pose === 'hop' ? (1 - hop / 6) * 0.6
    : pose === 'stretch' ? -1.6 : 0;

  // Combat tendencies subtly alter silhouette, not power: guard-heavy is stockier,
  // quick striker is narrower, and counterattacker carries more tail behind it.
  const styleBody = combatStyle === 'guard-heavy' ? 1 : combatStyle === 'quick striker' ? -1 : 0;
  const bodyR = Math.max(4, Math.round(r * 1.15) + styleBody);
  const bx = Math.round(x);
  const by = Math.round(floorY - bodyR - lift + breathe * 0.6);
  const hx = Math.round(bx - (pose === 'doze' ? 1 : 0) + face * look * 1.5);
  const hy = Math.round(by - r - bodyR * 0.55 - lift * 0.4
    + (pose === 'doze' ? r * 0.7 : 0) + breathe + squash - look * 2);

  if (b.tail) {
    const tailN = combatStyle === 'counterattacker' ? 7 : combatStyle === 'quick striker' ? 6 : 5;
    for (let i = 0; i < tailN; i++) {
      const a = 0.6 + i * 0.42;
      scr.px(bx - face * (bodyR - 1 + Math.cos(a) * (i + 2) * 0.9),
        by + 1 + Math.sin(-a) * (i + 1) * 0.7, 2, 2, i > tailN - 3 ? furLit : fur);
    }
  }

  scr.disc(bx, by, bodyR, fur, PAL.INK);
  crescent(scr, bx, by, bodyR, -1, furLit, rim);
  drawMarking(scr, bx, by, bodyR, traits.marking || 'ash', fur, accent, t);

  for (let dy = -bodyR + 2; dy <= bodyR - 2; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, (bodyR - 2) * (bodyR - 2) - dy * dy)));
    const half = Math.min(dx, 3);
    scr.px(bx - half - 1, by + dy + 1, half * 2 + 1, 1, belly);
  }
  if (b.moss) {
    for (let i = 0; i < 3; i++) scr.px(bx + 1 + i * 2, by - bodyR + i, 2, 2, PAL.MOSS);
  }

  if (walking) {
    const step = Math.sin(t * 9) * 2.5;
    scr.px(bx - 3 + step, floorY - 1, 2, 1, PAL.INK);
    scr.px(bx + 1 - step, floorY - 1, 2, 1, PAL.INK);
  } else {
    scr.px(bx - 3, floorY - 1, 2, 1, PAL.INK);
    scr.px(bx + 1, floorY - 1, 2, 1, PAL.INK);
  }

  if (b.ears) {
    drawEars(scr, hx, hy, r, traits.ears || 'round', fur, furLit);
    drawHorns(scr, hx, hy, r, traits.horns || 'stub', accent);
  }
  scr.disc(hx, hy, r, fur, PAL.INK);
  crescent(scr, hx, hy, r, -1, furLit, rim);

  const closed = pose === 'doze' || temperament === 'sleepy' || (!still && blinking(t));
  const ey = hy - 1 - (pose === 'stretch' ? 1 : 0);
  for (const dx of [-2, 1]) {
    const ex = hx + face * dx - 1;
    if (closed) scr.px(ex, ey, 3, 1, PAL.INK);
    else {
      const eyeH = temperament === 'cautious' ? 2 : 3;
      scr.px(ex, ey - 1, 2, eyeH, PAL.EYE);
      scr.px(ex, ey - 1, 1, 1, PAL.EYE_LIGHT);
      if (temperament === 'bold') scr.px(ex, ey - 2, 2, 1, PAL.INK);
    }
  }
  scr.px(hx + face * 4 - (face > 0 ? 0 : 4), ey + 2, 2, 1,
    mix(PAL.NOSE, accent, lit * 0.5));

  if (b.lamp) {
    const ly = by - 1;
    scr.px(bx - bodyR - 2, ly, 2, 3, mix(PAL.WOOD, accent, 0.35 + lit * 0.5));
    scr.px(bx - bodyR - 2, ly + 1, 1, 1, mix(PAL.FLAME_CORE, accent, 0.25));
  }

  if (pose === 'doze' && !still) {
    const p = (t * 0.5) % 1;
    scr.px(hx + r + 2 + p * 3, hy - r - 2 - p * 6, 1, 1, mix(PAL.SMOKE, PAL.PAPER_DIM, 1 - p));
  }
}

function blinking(t) {
  const cycle = t % 4.7;
  return cycle > 4.4 || (cycle > 2.05 && cycle < 2.14);
}

export { BUILD };
