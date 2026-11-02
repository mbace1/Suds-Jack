// GAMEPLAY LABORATORY · 8-bit (a cartridge-era bumper). The screen is 135×240 and upscaled ×8, so one source pixel is
// an 8×8 square. Held to the era's rules, not its art:
//   · colours only from a fixed console-style palette, ~3 per sprite plus transparent;
//   · tiles on an 8-pixel grid, motion in whole pixels, animation stepped at sprite-counter rates (never smooth);
//   · fades done the cartridge way, by stepping every colour down its own darker chain, not by blending to black;
//   · the flash on the lever pull is a palette swap (everything bright for two frames), not a glow.
// Original art throughout: a lab-coated scientist, a lever, a flask. No game character, logo or font is copied.
import { register, clamp } from '../common/film.js';
import { drawText, textWidth } from '../common/font.js';

const W = 135, H = 240, SECONDS = 5.6;

// the palette: console-style values; each colour names the darker colour it steps to in a fade
const PAL = {
  k: '#000000', dg: '#545454', g: '#7C7C7C', lg: '#BCBCBC', w: '#FCFCFC',
  nb: '#0000BC', b: '#0058F8', lb: '#3CBCFC', pb: '#A4E4FC',
  dgr: '#005800', g1: '#00A800', g2: '#58D854', g3: '#B8F8B8',
  br: '#503000', tan: '#AC7C00', y: '#F8B800', r: '#F83800', dr: '#A81000',
  skin: '#FCD8A8', mag: '#D800CC', dp: '#4428BC', pink: '#F878F8',
};
const DOWN = { w: 'lg', lg: 'g', g: 'dg', dg: 'k', pb: 'lb', lb: 'b', b: 'nb', nb: 'k', g3: 'g2', g2: 'g1', g1: 'dgr', dgr: 'k',
  y: 'tan', tan: 'br', br: 'k', r: 'dr', dr: 'k', skin: 'tan', pink: 'mag', mag: 'dp', dp: 'k', k: 'k' };
let FADE = 0, FLASH = false;
const col = (key) => { if (FLASH && key !== 'k') return PAL.w; let k = key; for (let i = 0; i < FADE; i++) k = DOWN[k] || 'k'; return PAL[k]; };

// the timeline, in seconds (also the score's cue sheet, via events)
const T = { fadeIn: 0.0, walk0: 0.55, walk1: 1.55, reach: 1.62, pull: 1.82, flash: 1.95, pulse0: 2.0, pulse1: 2.45, fill: 2.45,
  title0: 2.5, letterGap: 0.075, fall: 0.2, week: 4.05, jump: 4.35, land: 4.85, music: 0.55 };
const TITLE = [['GAMEPLAY', 30], ['LABORATORY', 52]];
const LETTERS = TITLE.flatMap(([word, y], wi) => [...word].map((ch, i) => ({ ch, wi, i, y, x: Math.round((W - textWidth(word, 2)) / 2) + i * 12 })));
LETTERS.forEach((L, n) => { L.t = T.title0 + n * T.letterGap; L.land = L.t + T.fall; });
const STEP_EVERY = 4 / 30;   // the walk cycle advances every 4 frames
const steps = []; for (let t = T.walk0; t < T.walk1; t += STEP_EVERY * 2) steps.push(+t.toFixed(3));

let g;
const px = (x, y, w, h, key) => { g.fillStyle = col(key); g.fillRect(Math.round(x), Math.round(y), w, h); };

// ------------------------------------------------------------------ the room (background tiles)
function room(t, on) {
  px(0, 0, W, H, 'k');
  // the wall: 16×16 panels, dark blue with lighter seams and a rivet per corner
  for (let ty = 16; ty < 176; ty += 16) for (let tx = 0; tx < W; tx += 16) {
    px(tx, ty, 16, 16, 'nb'); px(tx, ty, 16, 1, 'b'); px(tx, ty, 1, 16, 'b'); px(tx + 2, ty + 2, 1, 1, 'lb'); px(tx + 13, ty + 2, 1, 1, 'lb');
  }
  // a shelf of jars, left, under the title
  px(4, 112, 58, 2, 'lg'); px(4, 114, 58, 1, 'dg');
  [[8, 'g2'], [18, 'mag'], [28, 'y'], [38, 'lb'], [48, 'r']].forEach(([x, c], i) => { px(x, 103 + (i % 2), 7, 9 - (i % 2), 'lg'); px(x + 1, 106 + (i % 2), 5, 6 - (i % 2), c); px(x + 2, 101 + (i % 2), 3, 2, 'g'); });
  // the floor: a two-tone checker on an 8-pixel grid
  for (let ty = 176; ty < 208; ty += 8) for (let tx = 0; tx < W; tx += 8) px(tx, ty, 8, 8, ((tx + ty) / 8) % 2 ? 'g' : 'dg');
  px(0, 176, W, 1, 'lg');
  // the bench: a tan top, brown front, two legs
  px(4, 150, 70, 3, 'tan'); px(4, 153, 70, 2, 'br'); px(8, 155, 3, 21, 'br'); px(66, 155, 3, 21, 'br');
  // a little beaker and a rack of three tubes
  px(10, 140, 7, 10, 'lg'); px(11, 144, 5, 6, 'g2');
  px(20, 146, 14, 2, 'br'); [[22, 'mag'], [26, 'y'], [30, 'lb']].forEach(([x, c]) => { px(x, 136, 3, 10, 'lg'); px(x, 140, 3, 6, c); });
  // the big flask: a cone, its liquid rising once the pipe delivers
  const lvl = Math.round(clamp((t - T.fill) / 0.9) * 13);
  const cyc = ['g2', 'mag', 'y', 'lb'][Math.floor(Math.max(0, t - T.fill) / 0.13) % 4];   // palette cycling: the liquid's colour steps
  for (let r = 0; r < 26; r++) { const y = 149 - r, half = r < 18 ? 10 - Math.floor(r * 0.42) : 2; px(46 - half, y, half * 2 + 1, 1, 'lg');
    if (r > 0 && r < 17 && half > 1) px(46 - half + 1, y, half * 2 - 1, 1, r <= 3 + lvl ? (t > T.fill ? cyc : 'g1') : 'nb'); }
  px(44, 123, 5, 1, 'w');
  // the pipe: from the machine across and down into the flask; a pulse of liquid runs it after the pull
  px(48, 108, 46, 3, 'lg'); px(48, 108, 46, 1, 'w'); px(44, 108, 4, 16, 'lg'); px(44, 108, 1, 16, 'w');
  const pk = clamp((t - T.pulse0) / (T.pulse1 - T.pulse0));
  if (pk > 0 && pk < 1) { const run = 46 + 14, d = Math.floor(pk * run); for (let i = 0; i < 6; i++) { const s = d - i * 2; if (s < 0) continue;
      if (s < 46) px(93 - s, 109, 2, 1, 'g2'); else if (s - 46 < 14) px(45, 110 + (s - 46), 2, 2, 'g2'); } }
  // the machine: a grey cabinet, a screen of scrolling lines, three lamps, and the lever slot
  px(94, 92, 38, 84, 'g'); px(94, 92, 38, 1, 'lg'); px(94, 92, 1, 84, 'lg'); px(131, 92, 1, 84, 'dg');
  px(99, 98, 28, 18, 'k');
  for (let i = 0; i < 4; i++) { const ln = (Math.floor(t * 8) + i) % 4; px(101, 100 + i * 4, 6 + ((ln * 7) % 18), 2, on ? 'g2' : 'lb'); }
  [['r', 102], ['y', 110], ['g2', 118]].forEach(([c, x], i) => px(x, 122, 4, 4, on || Math.floor(t * 4 + i) % 3 === 0 ? c : 'dg'));
  px(100, 150, 6, 24, 'k');   // the slot
  px(110, 134, 18, 34, 'dg'); for (let i = 0; i < 4; i++) px(112, 137 + i * 8, 14, 2, 'g');   // a vent
}

/** the lever: a stick and a red knob; up until it is pulled */
function lever(t) {
  const k = clamp((t - T.pull) / 0.13), y = 150 + Math.round(k * 2) * 7;   // two steps, not a slide
  px(102, y + 4, 2, 170 - y - 4, 'lg'); px(100, y, 6, 5, 'r'); px(101, y, 2, 1, 'w');
  return y;
}

// ------------------------------------------------------------------ the scientist: a 3-colour sprite (black, white, skin)
/** feet at (x0, y0); pose: stand | walkA | walkB | reach | pull | jump */
function scientist(x0, y0, pose, knobY) {
  const K = 'k', Wt = 'w', S = 'skin';
  // legs and shoes
  const legs = { stand: [-3, 1], walkA: [-5, 3], walkB: [-2, 0], reach: [-3, 1], pull: [-4, 2], jump: [-4, 2] }[pose];
  const legH = pose === 'jump' ? 4 : 7;
  for (const lx of legs) { px(x0 + lx, y0 - legH, 2, legH, K); px(x0 + lx, y0 - 1, 3, 1, K); }
  // coat: white with a black rim, the hem flared
  px(x0 - 5, y0 - 17, 11, 10, K); px(x0 - 4, y0 - 16, 9, 8, Wt); px(x0 - 6, y0 - 9, 13, 2, K); px(x0 - 5, y0 - 9, 11, 1, Wt);
  px(x0, y0 - 16, 1, 7, K);   // the coat's opening
  // head: skin, black hair over the back and top, one eye, goggles pushed up as a white band
  px(x0 - 3, y0 - 24, 8, 7, K); px(x0 - 2, y0 - 22, 7, 5, S); px(x0 - 3, y0 - 24, 8, 2, K); px(x0 - 3, y0 - 22, 2, 4, K);
  px(x0 - 1, y0 - 23, 6, 1, Wt); px(x0 + 3, y0 - 20, 1, 1, K); px(x0 + 4, y0 - 18, 1, 1, K);
  // arms: sleeves white, hands skin
  if (pose === 'reach' || pose === 'pull') {
    const hy = Math.min(knobY + 2, y0 - 12), hx = 100 - 1;   // the hand on the knob
    for (let i = 0; i <= 6; i++) { const ax = Math.round(x0 + 4 + (hx - x0 - 4) * i / 6), ay = Math.round(y0 - 15 + (hy - (y0 - 15)) * i / 6); px(ax, ay, 2, 2, Wt); }
    px(hx, hy, 2, 2, S);
    px(x0 - 6, y0 - 15, 2, 6, Wt); px(x0 - 6, y0 - 9, 2, 1, S);
  } else if (pose === 'jump') {
    px(x0 - 7, y0 - 24, 2, 7, Wt); px(x0 + 6, y0 - 24, 2, 7, Wt); px(x0 - 7, y0 - 25, 2, 1, S); px(x0 + 6, y0 - 25, 2, 1, S);
  } else {
    const sw = pose === 'walkA' ? 1 : pose === 'walkB' ? -1 : 0;
    px(x0 - 6 - sw, y0 - 15, 2, 6, Wt); px(x0 - 6 - sw, y0 - 9, 2, 1, S); px(x0 + 5 + sw, y0 - 15, 2, 6, Wt); px(x0 + 5 + sw, y0 - 9, 2, 1, S);
  }
}

/** bubbles from the flask: 2-colour sprites, a handful at once (the era's sprite budget) */
function bubbles(t) {
  if (t < T.fill + 0.1) return;
  for (let i = 0; i < 4; i++) { const born = T.fill + 0.1 + i * 0.27, life = ((t - born) % 1.08 + 1.08) % 1.08; if (t < born) continue;
    const y = 120 - Math.floor(life * 26), x = 44 + ((i * 5) % 7) - 3 + (Math.floor(life * 6) % 2);
    if (life < 0.9) { px(x, y, 3, 3, 'g3'); px(x + 1, y + 1, 1, 1, 'w'); } else px(x - 1, y - 1, 1, 1, 'w'); }
}

// ------------------------------------------------------------------ the title, the HUD
function title(t) {
  let landed = 0;
  for (const L of LETTERS) { if (t < L.t) continue;
    const k = clamp((t - L.t) / T.fall), fallY = -16 + (L.y + 16) * k * k;
    const bounce = t > L.land && t < L.land + 2 / 30 ? -2 : 0;   // a two-frame hop on landing
    const y = Math.round(k < 1 ? fallY : L.y + bounce);
    drawText(g, L.ch, L.x, y, { px: 2, fill: col(L.wi ? 'g2' : 'w'), outline: col('k') });
    if (t >= L.land) landed++; }
  if (t > T.week) { const blink = t < T.week + 0.9 ? Math.floor((t - T.week) / 0.15) % 2 === 0 : true;
    if (blink) drawText(g, 'WEEK 45', Math.round((W - textWidth('WEEK 45', 1, true)) / 2), 76, { fill: col('y'), outline: col('k'), bold: true }); }
  return landed;
}
function hud(score) {
  drawText(g, 'SCORE ' + String(score).padStart(6, '0'), 4, 5, { fill: col('w') });
  drawText(g, 'GL', W - 4 - textWidth('GL', 1, true), 5, { fill: col('mag'), bold: true });
  drawText(g, 'BEST PLAYS OF THE WEEK', Math.round((W - textWidth('BEST PLAYS OF THE WEEK')) / 2), 222, { fill: col('lb') });
}

// ------------------------------------------------------------------ one frame
function draw(t, scr) {
  g = scr.g;
  t = Math.floor(t * 30) / 30;
  FADE = t < 0.5 ? 3 - Math.min(3, Math.floor(t / 0.12)) : 0;   // four steps up from black
  FLASH = t >= T.flash && t < T.flash + 2 / 30;
  const on = t >= T.pull + 0.1;
  room(t, on);
  const knobY = lever(t);
  bubbles(t);
  const landed = title(t);
  // the scientist's path and poses
  let x0, pose, y0 = 184;
  if (t < T.walk0) { x0 = -12; pose = 'stand'; }
  else if (t < T.walk1) { x0 = -12 + Math.round((t - T.walk0) / (T.walk1 - T.walk0) * 98); pose = Math.floor((t - T.walk0) / STEP_EVERY) % 2 ? 'walkA' : 'walkB'; }
  else { x0 = 86; pose = t < T.reach ? 'stand' : t < T.pull + 0.25 ? (t < T.pull ? 'reach' : 'pull') : 'stand'; }
  if (t >= T.jump && t < T.land) { const k = (t - T.jump) / (T.land - T.jump); y0 -= Math.round(Math.sin(k * Math.PI) * 16); pose = 'jump'; }
  if (x0 > -8) scientist(x0, y0, pose, knobY);
  hud(landed * 100);
  return scr.c;
}

const events = { music: T.music, steps, pull: T.pull, flash: T.flash, pulse0: T.pulse0, fill: T.fill, letters: LETTERS.map((L) => +L.land.toFixed(3)),
  week: T.week, jump: T.jump, land: T.land };
register({ w: W, h: H, seconds: SECONDS, events, draw });
