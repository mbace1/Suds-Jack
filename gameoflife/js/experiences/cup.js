// A Cup of Tea — the first kernel of wisdom. The classic Nan-in story told
// through the hands: you hold the pot down and keep pouring, the bowl overflows,
// and the point makes itself. Interactivity IS the teaching.
//
// v2 (owner's queue): press-and-HOLD to pour — the excess is something you have
// to keep choosing — and the bowl is rebuilt as a reference-grade Raku chawan
// with a dithered glaze (shared toolkit with `seam`, ideas/ref/kintsugi-overflow.png).
// The overflow already glowed luminescent cyan and broke the frame; it stays.

import { PixelScreen, shade, rampDither } from '../pixel.js?v=41';
import { PAL } from '../palette.js?v=41';

const FULL_AT = 1.0, OVERFLOW_AT = 1.9;   // keep pouring past full to learn
const PRESS = 0.16;                        // a press always counts this much
const RATE = 0.55;                         // and holding adds this per second

// the chawan, seen slightly from above (same construction as seam's bowl)
const CX = 96, RIM_CY = 80, RX = 25, RY = 7, H = 24;
const ell = (lx, rx) => Math.sqrt(Math.max(0, 1 - (lx / rx) ** 2));

// tonal ramps (dark → light), stippled between steps by rampDither
const GLAZE = ['#1c1610', '#33281d', '#4e3d2c', '#6f5942', '#94785a', '#b89a74', '#dcc6a0'];
const RIMR  = ['#5a3f26', '#8a6640', '#b8905c', '#e4cfa0'];
const TEA   = ['#7a3410', '#a8551a', '#cf7a26', '#ecab4c'];
const INNER = '#201711';

export const cup = {
  id: 'cup',
  kind: 'wisdom',

  start(host, ctx) {
    const { t, audio, onComplete } = ctx;
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'screen-wrap';
    host.appendChild(wrap);
    const textEl = document.createElement('div');
    textEl.className = 'exp-text';
    host.appendChild(textEl);
    const btnRow = document.createElement('div');
    btnRow.className = 'exp-buttons';
    host.appendChild(btnRow);

    const scr = new PixelScreen(wrap, 192, 128);
    let fill = 0;            // 0..OVERFLOW_AT; past 1 the tea spills
    let holding = false;     // the pot is tipped and staying tipped
    let streamT = 0;         // seconds of visible stream left after a release
    let tickT = 0;           // spaces out the pouring sound while held
    let phase = 'pour';      // pour → spill → empty → outro
    let brimmed = false;     // the "it brims" line only needs saying once
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
      return b;
    }

    textEl.textContent = t('cu.s1');

    // the pour control: hold it down and the tea keeps coming. A plain click
    // still counts as one press, so the gesture works on every input.
    const pourBtn = document.createElement('button');
    pourBtn.className = 'btn';
    pourBtn.textContent = t('cu.pour');
    pourBtn.addEventListener('pointerdown', () => {
      if (phase !== 'pour') return;
      holding = true;
      tickT = 0;
      addTea(PRESS);
    });
    const release = () => { holding = false; };
    pourBtn.addEventListener('pointerup', release);
    pourBtn.addEventListener('pointercancel', release);
    pourBtn.addEventListener('pointerleave', release);
    window.addEventListener('pointerup', release);
    btnRow.appendChild(pourBtn);

    // the bowl gives up: it cannot hold what you keep pouring in
    function overflow() {
      holding = false;
      phase = 'spill';
      audio.water();
      textEl.textContent = `${t('cu.full')}\n\n${t('cu.wisdom')}`;
      btnRow.innerHTML = '';
      button(t('cu.empty'), emptyCup);
    }

    function brims() {
      brimmed = true;
      textEl.textContent = t('cu.brims');
    }

    function addTea(amount) {
      if (phase !== 'pour') return;
      fill += amount;
      streamT = 0.35;
      audio.plink();
      if (fill >= OVERFLOW_AT) overflow();
      else if (fill >= FULL_AT && !brimmed) brims();
    }

    function emptyCup() {
      phase = 'empty';
      btnRow.innerHTML = '';
      audio.chime();
      setTimeout(() => {
        if (dead) return;
        phase = 'outro';
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('cu.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('cu.nature');
        textEl.append(a, b);
        button(t('ui.continue'), () => onComplete());
      }, 1400);
    }

    // ── rendering ────────────────────────────────────────────────
    // the dithered Raku glaze at a column/row: cream on the left, near-black on
    // the right, a glossy sheen band, base a touch darker (as in `seam`)
    function glaze(lx, y, top, bottom) {
      const uh = (lx + RX) / (2 * RX), v = (y - top) / (bottom - top + 0.01);
      let u = 1 - uh * 0.86;
      u += 0.13 * Math.sin(lx * 0.8 + 1);            // broad glaze runs
      if (lx > -13 && lx < -4) u += 0.17;            // the glossy sheen
      u -= v * 0.12;                                 // base darker
      u -= 0.09 * Math.max(0, Math.sin(lx * 2.3));   // fine streaks
      return rampDither(GLAZE, u, CX + lx, y);
    }

    // the outer wall + its warm front lip, offset (dx,dy) so it can be tipped
    function bowl(dx, dy) {
      for (let lx = -RX; lx <= RX; lx++) {
        const s = ell(lx, RX);
        const fl = RIM_CY + RY * s, bot = RIM_CY + H * s;
        for (let y = Math.round(fl); y <= Math.round(bot); y++) {
          scr.px(CX + lx + dx, y + dy, 1, 1, glaze(lx, y, fl, bot));
        }
        const lip = rampDither(RIMR, 1 - (lx + RX) / (2 * RX), CX + lx, fl);
        scr.px(CX + lx + dx, Math.round(fl) - 1 + dy, 1, 2, lip);
      }
    }

    // the opening: dark inner wall, then the tea surface rising with `fill`
    function interior() {
      for (let lx = -RX + 1; lx <= RX - 1; lx++) {
        const s = ell(lx, RX), bl = RIM_CY - RY * s, fl = RIM_CY + RY * s;
        for (let y = Math.round(bl); y <= Math.round(fl); y++) scr.px(CX + lx, y, 1, 1, INNER);
        scr.px(CX + lx, Math.round(bl), 1, 1,
          shade(rampDither(RIMR, 1 - (lx + RX) / (2 * RX), CX + lx, bl), 0.7));   // back lip
      }
      const k = Math.min(1, fill);
      if (k <= 0.02) return;
      // the tea is an ellipse concentric with the rim, widening as it fills
      const trx = 3 + k * (RX - 4), tryy = 1 + k * (RY - 1), tcy = RIM_CY + (1 - k) * 3;
      for (let lx = -trx + 1; lx <= trx - 1; lx++) {
        const s = ell(lx, trx), y0 = tcy - tryy * s, y1 = tcy + tryy * s;
        for (let y = Math.round(y0); y <= Math.round(y1); y++) {
          const vv = (y - y0) / (y1 - y0 + 0.01);
          const u = 0.3 + vv * 0.55 + 0.12 * Math.max(0, Math.sin(lx * 0.5));
          scr.px(CX + lx, y, 1, 1, rampDither(TEA, u, CX + lx, y));
        }
        if (Math.abs(lx) < trx * 0.6) scr.px(CX + lx, Math.round(y1) - 1, 1, 1, '#f0c060');  // specular
      }
    }

    function teapot(now) {
      const tip = streamT > 0 ? 3 : 0;
      const y0 = 34 + tip;
      // a rounded iron pot: body, lit shoulder, lid + knob, tapering spout, handle
      for (let dy = 0; dy < 14; dy++) {
        const t = dy / 13, wob = 1 - ((t - 0.45) * 2) ** 2 * 0.55;
        const half = 15 * wob;
        for (let dx = -half; dx <= half; dx++) {
          const u = 0.5 - (dx / 15) * 0.3 - t * 0.2;
          scr.px(CX - 3 + dx, y0 + dy, 1, 1, shade(PAL.MOSS_DEEP, 0.8 + u * 0.9));
        }
      }
      scr.px(CX - 11, y0 - 2, 16, 2, shade(PAL.MOSS_DEEP, 1.25));    // lid
      scr.px(CX - 4, y0 - 4, 3, 2, shade(PAL.MOSS_DEEP, 1.5));       // knob
      for (let i = 0; i < 7; i++) {                                   // spout, tapering out
        scr.px(CX + 11 + i, y0 + 4 + Math.round(i * 0.4), 2, 3 - Math.floor(i / 4),
          shade(PAL.MOSS_DEEP, 1.05));
      }
      for (let i = 0; i < 8; i++) {                                   // cane handle, arced
        const a = Math.PI * (i / 7);
        scr.px(CX - 18 - Math.round(Math.sin(a) * 4), y0 + 2 + i, 2, 1, shade(PAL.MOSS_DEEP, 0.7));
      }
      if (streamT > 0) {
        // the stream, falling from the spout into the bowl
        const sx = CX + 17;
        for (let y = 41 + tip; y < RIM_CY - 2; y++) {
          const wob = Math.round(Math.sin(y * 0.4 + now / 90) * 0.8);
          scr.px(sx + wob, y, 2, 1, rampDither(TEA, 0.55 + 0.3 * Math.sin(y * 0.3), sx, y));
        }
      }
    }

    // the excess coming OVER the front lip and running down the outer wall —
    // drawn after the bowl so it reads as overflowing, not leaking from beneath
    function cascade(now, spill) {
      const k = Math.min(1, spill / 0.9);
      const cols = [-14, -9, -4, 2, 7, 12];
      for (const lx of cols) {
        const s = ell(lx, RX);
        const fl = RIM_CY + RY * s, bot = RIM_CY + H * s;
        const reach = fl + (bot - fl) * Math.min(1, k * 1.4 + 0.25);
        for (let y = Math.round(fl) - 1; y <= Math.round(reach); y++) {
          const wob = Math.round(Math.sin(y * 0.5 + now / 110 + lx) * 0.6);
          scr.px(CX + lx + wob, y, 2, 1, PAL.CYAN_LUX);
          if ((y + Math.floor(now / 90)) % 3 === 0) scr.px(CX + lx + wob, y, 1, 1, '#c8fbf4');
        }
      }
      // a bright meniscus along the lip where it keeps spilling over
      for (let lx = -17; lx <= 15; lx++) {
        const s = ell(lx, RX);
        scr.px(CX + lx, Math.round(RIM_CY + RY * s) - 1, 1, 1, '#c8fbf4');
      }
    }

    function draw(now, dt) {
      if (holding && phase === 'pour') {
        fill += RATE * dt;
        streamT = 0.2;
        tickT -= dt;
        if (tickT <= 0) { tickT = 0.22; audio.plink(); }
        if (fill >= OVERFLOW_AT) overflow();
        else if (fill >= FULL_AT && !brimmed) brims();
      }
      if (streamT > 0) streamT = Math.max(0, streamT - dt);

      // a quiet room at dusk: paper wall, low table
      scr.bands(0, 0, scr.w, 70, ['#3a3448', '#4a4258', '#5a5068', '#6a6078']);
      scr.px(14, 8, 40, 52, '#7a7088');            // window
      scr.px(14, 8, 40, 2, PAL.INK_SOFT); scr.px(14, 58, 40, 2, PAL.INK_SOFT);
      scr.px(33, 8, 2, 52, PAL.INK_SOFT); scr.px(14, 32, 40, 2, PAL.INK_SOFT);
      scr.disc(44, 20, 5, PAL.SUN);                // moon in the pane
      scr.px(0, 70, scr.w, 58, PAL.BARK);          // table
      scr.px(0, 70, scr.w, 3, '#7a5d46');
      // the room breathes from the first frame: steam off the waiting tea, and
      // one slow curl of it crossing the moon
      for (let i = 0; i < 3; i++) {
        const sy = 62 - ((now / 90 + i * 12) % 26);
        scr.px(CX - 5 + i * 5 + Math.sin(now / 520 + i * 1.7) * 2, sy, 1, 3,
          i % 2 ? '#6a6078' : '#7a7088');
      }
      scr.px(30 + ((now / 260) % 40), 17, 9, 2, '#8a80a0');   // mist across the pane

      const spill = Math.max(0, fill - FULL_AT);
      if (spill > 0 && phase !== 'empty' && phase !== 'outro') {
        // the overflow glows luminescent cyan and runs past the table edge —
        // the excess breaks the frame (2026-07 visual standard)
        const r = Math.min(52, spill * 62);
        const base = RIM_CY + H + 2;
        scr.softDisc(CX, base + 2, 10 + r * 0.5, '#0d3a38', 14);
        scr.px(CX - r, base, r * 2, 3, PAL.CYAN_LUX);
        scr.px(CX - r * 0.7, base + 3, r * 1.4, 2, '#8af2e8');
        if (r > 24) for (let i = 0; i < 5; i++) {   // runnels dripping off the world
          const dx = CX - 34 + i * 16;
          scr.px(dx, base + 6 + ((now / 24 + i * 17) % (128 - base - 6)), 2, 4,
            i % 2 ? PAL.CYAN_LUX : '#8af2e8');
        }
      }

      if (phase === 'empty' || phase === 'outro') {
        // the bowl tipped over on the table, empty and light
        bowl(4, H - 6);
      } else {
        bowl(0, 0);
        interior();
        if (spill > 0) cascade(now, spill);
        teapot(now);
      }

      if (phase === 'spill') {
        // steam question-marks of excess
        for (let i = 0; i < 3; i++) {
          const sx = CX - 8 + i * 7 + Math.sin(now / 300 + i * 2) * 2;
          scr.px(sx, 66 - ((now / 60 + i * 9) % 18), 1, 3, PAL.PAPER_DIM);
        }
      }
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return {
      destroy() {
        dead = true;
        holding = false;
        window.removeEventListener('pointerup', release);
        cancelAnimationFrame(raf);
        scr.destroy();
        host.innerHTML = '';
      },
    };
  },
};
